from decimal import Decimal as D

import pytest

from app.services.calculation_engine import CalculationError, ItemInput, MeasurementInput, calculate_item


def m(formula, qty="1", rate="1200", unit="", **dims_and_opts):
    return calculate_item(ItemInput(
        pricing_method="measurement", quantity=D(qty), unit=unit, unit_rate=D(rate),
        measurement=MeasurementInput(formula=formula, **{k: (D(v) if k in ("width", "height", "depth", "length", "minimum_quantity") else v)
                                                         for k, v in dims_and_opts.items()}),
    ))


def fails(match, field, **kw):
    with pytest.raises(CalculationError, match=match) as exc:
        m(**kw)
    assert exc.value.field == field


# ---------------- the specification's own example ----------------
def test_spec_example_wardrobe_8ft_by_7ft_at_1200_per_sqft():
    r = m("front_area", width="96", height="84")          # 8 ft x 7 ft, in inches
    assert r.calculated_quantity == D("56.0000") and r.chargeable_quantity == D("56.00")
    assert r.unit == "sq.ft" and r.total == D("67200.00")


# ---------------- every formula ----------------
@pytest.mark.parametrize("formula,dims,expected_qty", [
    ("front_area",      dict(width="96", height="84"),   "56"),     # 96 x 84 / 144
    ("side_area",       dict(height="84", depth="24"),   "14"),     # 84 x 24 / 144
    ("top_bottom_area", dict(width="96", depth="24"),    "16"),     # 96 x 24 / 144
    ("square_feet",     dict(length="120", width="48"),  "40"),     # 120 x 48 / 144
])
def test_area_formulas(formula, dims, expected_qty):
    r = m(formula, **dims)
    assert r.chargeable_quantity == D(expected_qty) and r.unit == "sq.ft"
    assert r.total == D(expected_qty) * D(1200)


def test_unused_dimensions_are_ignored():
    assert m("front_area", width="96", height="84", depth="999", length="1").chargeable_quantity == D(56)


def test_running_feet_uses_the_chosen_dimension():
    assert m("running_feet", width="96").chargeable_quantity == D(8)                                            # default: width
    r = m("running_feet", height="84", running_dimension="height", rate="300")
    assert (r.chargeable_quantity, r.unit, r.total) == (D(7), "r.ft", D("2100.00"))


def test_piece_pricing():
    r = m("piece", qty="3", rate="500")
    assert (r.calculated_quantity, r.chargeable_quantity, r.unit, r.total) == (D("3.0000"), D("3.00"), "pc", D("1500.00"))


def test_manual_quantity_keeps_the_entered_unit():
    r = m("manual_quantity", qty="12.5", rate="80", unit="ft")
    assert (r.chargeable_quantity, r.unit, r.total) == (D("12.50"), "ft", D("1000.00"))


def test_quantity_multiplies_identical_pieces():
    assert m("front_area", qty="2", width="96", height="84").chargeable_quantity == D(112)
    assert m("running_feet", qty="4", width="96").chargeable_quantity == D(32)


def test_inches_only_input():
    r = m("front_area", width="30", height="40")           # 1200 sq in = 8.3333 sq ft
    assert r.calculated_quantity == D("8.3333") and r.chargeable_quantity == D("8.33") and r.total == D("9996.00")


# ---------------- calculated vs chargeable ----------------
def test_chargeable_is_rounded_to_the_chosen_precision_but_calculated_is_kept():
    for places, qty, total in [(0, "8", "9600.00"), (1, "8.3", "9960.00"), (2, "8.33", "9996.00"), (4, "8.3333", "9999.96")]:
        r = calculate_item(ItemInput(
            pricing_method="measurement", quantity=D(1), unit_rate=D(1200),
            measurement=MeasurementInput(formula="front_area", width=D(30), height=D(40), rounding_places=places)))
        assert r.calculated_quantity == D("8.3333")
        assert (r.chargeable_quantity, r.total) == (D(qty), D(total)), places


def test_rounding_is_half_up_not_bankers():
    r = m("running_feet", width="28.14")                    # 28.14 / 12 = 2.345 exactly
    assert r.calculated_quantity == D("2.3450") and r.chargeable_quantity == D("2.35")


def test_minimum_chargeable_quantity_raises_the_charge_but_not_the_calculated_figure():
    r = m("front_area", width="42", height="12", minimum_quantity="10")     # 504 / 144 = 3.5 sq ft
    assert r.calculated_quantity == D("3.5000")
    assert r.chargeable_quantity == D("10.00") and r.total == D("12000.00")


def test_minimum_does_nothing_when_the_item_is_bigger():
    r = m("front_area", width="96", height="84", minimum_quantity="10")
    assert r.chargeable_quantity == D(56) and r.total == D("67200.00")


def test_minimum_applies_to_the_total_after_the_piece_count():
    r = m("front_area", qty="2", width="42", height="12", minimum_quantity="10")   # 2 x 3.5 = 7 sq ft < 10
    assert r.calculated_quantity == D("7.0000") and r.chargeable_quantity == D("10.00")


# ---------------- validation ----------------
def test_missing_dimensions_are_named():
    fails("Enter the height", "measurement.height", formula="front_area", width="96")
    fails("Enter the width and height", "measurement.width", formula="front_area")
    fails("Enter the length", "measurement.length", formula="running_feet", running_dimension="length")
    fails("Enter the depth", "measurement.depth", formula="side_area", height="84")


@pytest.mark.parametrize("bad", ["0", "-5"])
def test_dimensions_must_be_positive(bad):
    fails("more than zero", "measurement.width", formula="front_area", width=bad, height="84")


def test_other_validation():
    fails("Quantity must be greater", "quantity", formula="piece", qty="0")
    fails("Rate cannot be negative", "unit_rate", formula="piece", rate="-1")
    fails("Enter a unit", "unit", formula="manual_quantity", unit="  ")
    fails("Choose which dimension", "measurement.running_dimension", formula="running_feet", width="96", running_dimension="diagonal")
    fails("minimum", "measurement.minimum_quantity", formula="piece", minimum_quantity="-1")
    fails("between 0 and 4", "measurement.rounding_places", formula="piece", rounding_places=5)
    fails("zero", "measurement", formula="front_area", width="0.001", height="0.001")   # works out to 0.0000 sq ft


def test_unknown_or_missing_measurement():
    with pytest.raises(CalculationError, match="how this item is measured"):
        calculate_item(ItemInput(pricing_method="measurement", quantity=D(1), unit_rate=D(1)))
    fails("how this item is measured", "measurement.formula", formula="volume")
