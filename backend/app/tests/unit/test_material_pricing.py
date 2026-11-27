from decimal import Decimal as D

import pytest

from app.services.calculation_engine import CalculationError, ExtraCosts, ItemInput, MaterialLine, ProfitSpec, calculate_item

# The specification's example: 18mm ply, laminate, hinges, handles.
SPEC_LINES = ((D(5), D(2500)), (D(5), D(900)), (D(8), D(80)), (D(4), D(150)))


def mat(lines=SPEC_LINES, profit=ProfitSpec(), includes=None, **extra):
    return calculate_item(ItemInput(
        pricing_method="material", materials=tuple(MaterialLine(quantity=q, rate=r) for q, r in lines),
        extra_costs=ExtraCosts(**{k: D(v) for k, v in extra.items()}), profit=profit, rate_includes_profit=includes,
    ))


def test_spec_example_materials_total_18240():
    r = mat()
    assert r.line_amounts == (D("12500.00"), D("4500.00"), D("640.00"), D("600.00"))
    assert r.material_cost == D("18240.00") and r.total == D("18240.00") and r.profit == 0


def test_extra_costs_are_added_and_split_into_labour_and_other():
    r = mat(labour="3000", transportation="500", installation="1000", other="250.50")
    assert r.labour_cost == D("3000.00") and r.additional_cost == D("1750.50")
    assert r.material_cost == D("18240.00") and r.total == D("22990.50")


def test_material_items_default_to_adding_profit():
    markup = mat(labour="3000", transportation="500", installation="1000", other="250.50", profit=ProfitSpec("markup", D("0.20")))
    assert (markup.profit, markup.total) == (D("4598.10"), D("27588.60"))           # 22990.50 x 1.20
    margin = mat(labour="3000", transportation="500", installation="1000", other="250.50", profit=ProfitSpec("margin", D("0.20")))
    assert (margin.profit, margin.total) == (D("5747.63"), D("28738.13"))           # 22990.50 / 0.80
    fixed = mat(profit=ProfitSpec("fixed", D("5000")))
    assert (fixed.profit, fixed.total) == (D("5000.00"), D("23240.00"))


def test_profit_is_not_added_twice_when_the_rates_already_include_it():
    r = mat(profit=ProfitSpec("markup", D("0.20")), includes=True)
    assert r.profit == 0 and r.total == D("18240.00")


def test_a_material_item_is_one_set_priced_at_its_selling_total():
    r = mat(profit=ProfitSpec("markup", D("0.10")))
    assert (r.calculated_quantity, r.chargeable_quantity, r.unit) == (D("1.0000"), D("1.0000"), "set")
    assert r.unit_rate == D("20064.0000") and r.total == D("20064.00")


def test_each_line_is_rounded_to_the_paisa_before_summing():
    r = mat(lines=((D(3), D("33.3333")), (D(3), D("33.3333"))))       # 99.9999 -> 100.00 each
    assert r.line_amounts == (D("100.00"), D("100.00")) and r.material_cost == D("200.00")


def test_labour_only_is_a_valid_item():
    r = mat(lines=(), labour="1500")
    assert r.total == D("1500.00") and r.line_amounts == ()


def test_an_empty_item_is_refused():
    with pytest.raises(CalculationError, match="at least one material") as exc:
        mat(lines=())
    assert exc.value.field == "materials"


def test_validation_names_the_offending_line_or_cost():
    with pytest.raises(CalculationError) as exc:
        mat(lines=((D(1), D(10)), (D(0), D(10))))
    assert exc.value.field == "materials.1.quantity"
    with pytest.raises(CalculationError) as exc:
        mat(lines=((D(1), D(-1)),))
    assert exc.value.field == "materials.0.rate"
    with pytest.raises(CalculationError) as exc:
        mat(labour="-1")
    assert exc.value.field == "extra_costs.labour"


def test_zero_rate_lines_are_allowed():
    assert mat(lines=((D(2), D(0)),), labour="10").total == D("10.00")
