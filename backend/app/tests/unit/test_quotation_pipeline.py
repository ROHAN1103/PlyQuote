import random
from decimal import Decimal as D

import pytest

from app.services.calculation_engine import (
    CalculationError, Charges, DiscountSpec, ExtraCosts, ItemInput, MaterialLine, MeasurementInput, ProfitSpec,
    QuotationSettings, TaxSpec, calculate_quotation,
)


def manual(rate, qty="1", **kw):
    return ItemInput(pricing_method="manual", quantity=D(qty), unit="pc", unit_rate=D(rate), **kw)


def settings(charges=None, discount=("none", "0"), gst=None, round_off=False):
    return QuotationSettings(
        charges=Charges(**{k: D(v) for k, v in (charges or {}).items()}),
        discount=DiscountSpec(type=discount[0], value=D(discount[1])),
        tax=TaxSpec(enabled=gst is not None, rate=None if gst is None else D(gst[0]), prices_include_tax=bool(gst and gst[1])),
        round_to_rupee=round_off,
    )


def run(rate="100000", **kw):
    return calculate_quotation([manual(rate)], settings(**kw))


# ================= the full pipeline, worked by hand =================
def test_charges_then_discount_then_gst_exclusive():
    # 100,000 + (5,000 + 2,000) = 107,000 ; 5% off = 5,350 -> 101,650 ; GST 18% = 18,297.00 ; total 119,947.00
    r = run(charges=dict(labour="5000", transportation="2000"), discount=("percent", "0.05"), gst=("0.18", False))
    assert r.subtotal == D("100000.00") and r.additional_charges == D("7000.00") and r.discount == D("5350.00")
    assert r.taxable_amount == D("101650.00") and r.tax_amount == D("18297.00")
    assert r.rounding_adjustment == 0 and r.grand_total == D("119947.00")


def test_same_quotation_with_tax_inclusive_prices():
    # Prices include GST, so the total is the amount after discount (101,650); GST inside it = 101650 x 0.18 / 1.18 = 15,505.93
    r = run(charges=dict(labour="5000", transportation="2000"), discount=("percent", "0.05"), gst=("0.18", True))
    assert r.grand_total == D("101650.00") and r.tax_amount == D("15505.93") and r.taxable_amount == D("86144.07")


def test_no_gst_means_no_tax_line():
    r = run(gst=None)
    assert r.tax_amount == 0 and r.taxable_amount == r.grand_total == D("100000.00")


def test_all_four_charges():
    r = run(charges=dict(labour="1", transportation="2", installation="3", miscellaneous="4.50"))
    assert r.additional_charges == D("10.50") and r.grand_total == D("100010.50")


def test_fixed_discount_applies_to_subtotal_plus_charges():
    r = run(charges=dict(labour="5000"), discount=("fixed", "2500.50"))
    assert r.discount == D("2500.50") and r.grand_total == D("102499.50")


def test_discount_may_equal_but_not_exceed_the_subtotal():
    assert run(discount=("fixed", "100000")).grand_total == 0
    assert run(discount=("percent", "1")).grand_total == 0
    for bad, msg in [(("fixed", "100000.01"), "more than the subtotal"), (("percent", "1.01"), "more than 100%"),
                     (("fixed", "-1"), "negative"), (("percent", "-0.1"), "negative")]:
        with pytest.raises(CalculationError, match=msg) as exc:
            run(discount=bad)
        assert exc.value.field == "settings.discount.value"


def test_negative_charges_are_refused():
    with pytest.raises(CalculationError, match="Charges can't be negative") as exc:
        run(charges=dict(installation="-1"))
    assert exc.value.field == "settings.charges.installation"


def test_charges_alone_make_a_valid_quotation():
    r = calculate_quotation([], settings(charges=dict(labour="1500"), gst=("0.18", False)))
    assert (r.subtotal, r.additional_charges, r.tax_amount, r.grand_total) == (0, D("1500.00"), D("270.00"), D("1770.00"))


# ================= rounding to the rupee =================
@pytest.mark.parametrize("rate,adjustment,total", [
    ("11799.60", "0.40", "11800.00"), ("11799.49", "-0.49", "11799.00"), ("11799.50", "0.50", "11800.00"),   # half-up
    ("11800.00", "0.00", "11800.00"), ("0.40", "-0.40", "0.00"),
])
def test_round_to_the_nearest_rupee(rate, adjustment, total):
    r = run(rate=rate, round_off=True)
    assert (r.rounding_adjustment, r.grand_total) == (D(adjustment), D(total))


def test_rounding_happens_after_tax():
    r = run(rate="10000.33", gst=("0.18", False), round_off=True)   # tax 1800.06 -> 11800.39 -> 11800
    assert (r.tax_amount, r.rounding_adjustment, r.grand_total) == (D("1800.06"), D("-0.39"), D("11800.00"))


def test_no_rounding_by_default():
    assert run(rate="11799.60").grand_total == D("11799.60") and run(rate="11799.60").rounding_adjustment == 0


# ================= mixed pricing in one quotation =================
def mixed_items():
    wardrobe = ItemInput(pricing_method="measurement", quantity=D(1), unit_rate=D(1200),
                         measurement=MeasurementInput(formula="front_area", width=D(96), height=D(84)))
    kitchen = ItemInput(pricing_method="material", materials=(MaterialLine(D(5), D(2500)), MaterialLine(D(5), D(900)),
                                                              MaterialLine(D(8), D(80)), MaterialLine(D(4), D(150))),
                        extra_costs=ExtraCosts(labour=D(5000)), profit=ProfitSpec("markup", D("0.20")))
    tv = manual("25000")
    return [wardrobe, kitchen, tv]


def test_each_item_calculates_independently_and_totals_aggregate():
    r = calculate_quotation(mixed_items(), settings(gst=("0.18", False)))
    wardrobe, kitchen, tv = r.items
    assert wardrobe.total == D("67200.00")                                  # 56 sq.ft x 1200
    assert kitchen.material_cost == D("18240.00") and kitchen.labour_cost == D("5000.00")
    assert kitchen.profit == D("4648.00") and kitchen.total == D("27888.00")   # (18240 + 5000) x 1.20
    assert tv.total == D("25000.00")
    assert r.subtotal == D("120088.00")
    assert r.material_cost == D("18240.00") and r.profit == D("4648.00")
    assert r.tax_amount == D("21615.84") and r.grand_total == D("141703.84")   # 120088 x 0.18


def test_item_level_discount_and_tax_stay_zero():
    r = calculate_quotation(mixed_items(), settings(discount=("percent", "0.1"), gst=("0.18", False)))
    assert all(i.discount == 0 and i.tax == 0 for i in r.items)


def test_one_bad_item_fails_the_quotation_with_a_clear_message():
    bad = ItemInput(pricing_method="measurement", quantity=D(1), unit_rate=D(1), measurement=MeasurementInput(formula="front_area", width=D(96)))
    with pytest.raises(CalculationError, match="Enter the height"):
        calculate_quotation([manual("1"), bad])


# ================= invariants over thousands of random quotations =================
def test_totals_always_reconcile_and_stay_in_whole_paise():
    rng = random.Random(4242)
    cents = lambda hi: D(rng.randint(0, hi)) / 100  # noqa: E731
    for _ in range(1500):
        items = [manual(str(cents(5_000_000)), qty=str(D(rng.randint(1, 5000)) / 100)) for _ in range(rng.randint(0, 6))]
        charges = dict(labour=str(cents(500_000)), transportation=str(cents(50_000)), installation=str(cents(50_000)), miscellaneous=str(cents(9_000)))
        base = sum((i.unit_rate * i.quantity for i in items), D(0))
        kind = rng.choice(["none", "percent", "fixed"])
        value = {"none": "0", "percent": str(D(rng.randint(0, 100)) / 100), "fixed": "0"}[kind]
        inclusive = rng.random() < 0.5
        gst = None if rng.random() < 0.2 else (rng.choice(["0", "0.05", "0.12", "0.18", "0.28"]), inclusive)
        r = calculate_quotation(items, settings(charges=charges, discount=(kind, value), gst=gst, round_off=rng.random() < 0.5))

        # 1. every figure is a whole number of paise
        for v in (r.subtotal, r.additional_charges, r.discount, r.taxable_amount, r.tax_amount, r.rounding_adjustment, r.grand_total):
            assert v == v.quantize(D("0.01"))
        # 2. the pipeline reconciles exactly
        before_tax = r.subtotal + r.additional_charges - r.discount
        assert before_tax >= 0 and r.discount <= r.subtotal + r.additional_charges
        assert r.taxable_amount + r.tax_amount + r.rounding_adjustment == r.grand_total
        if gst is not None and gst[1]:                 # tax-inclusive: tax is inside the amount
            assert r.taxable_amount + r.tax_amount == before_tax
        else:                                          # exclusive (or no GST): tax is on top
            assert r.taxable_amount == before_tax
        # 3. the grand total never goes negative, and rounding never moves it by half a rupee or more
        assert r.grand_total >= 0 and abs(r.rounding_adjustment) <= D("0.50")
        # 4. totals are the sums of their parts
        assert r.subtotal == sum((i.total for i in r.items), D(0))
