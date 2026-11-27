import random
from decimal import Decimal as D

import pytest

from app.services.calculation_engine import CalculationError, TaxSpec
from app.services.calculation_engine.tax import compute_tax


def tax(amount, enabled=True, rate="0.18", inclusive=False):
    return compute_tax(D(amount), TaxSpec(enabled=enabled, rate=None if rate is None else D(rate), prices_include_tax=inclusive))


def test_exclusive_adds_tax_on_top():
    r = tax("10000")
    assert (r.taxable, r.tax, r.total) == (D("10000"), D("1800.00"), D("11800.00"))


def test_inclusive_extracts_the_tax_already_inside():
    r = tax("11800", inclusive=True)
    assert (r.taxable, r.tax, r.total) == (D("10000.00"), D("1800.00"), D("11800"))


def test_inclusive_with_awkward_numbers_reconciles_to_the_paisa():
    r = tax("1000", inclusive=True)               # 1000 x 0.18 / 1.18 = 152.5423...
    assert r.tax == D("152.54") and r.taxable == D("847.46") and r.taxable + r.tax == D("1000")


def test_tax_rounds_half_up():
    assert tax("99.50", rate="0.05").tax == D("4.98")        # 4.975 -> 4.98
    assert tax("0.10", rate="0.05").tax == D("0.01")         # 0.005 -> 0.01


def test_disabled_gst_changes_nothing_and_needs_no_rate():
    r = tax("10000", enabled=False, rate=None)
    assert (r.taxable, r.tax, r.total) == (D("10000"), 0, D("10000"))


def test_enabled_gst_needs_a_rate_there_is_no_default():
    with pytest.raises(CalculationError, match="GST rate") as exc:
        tax("100", rate=None)
    assert exc.value.field == "settings.gst.rate"


@pytest.mark.parametrize("bad", ["-0.01", "1.01", "18"])
def test_rate_must_be_a_fraction_between_0_and_1(bad):
    with pytest.raises(CalculationError, match="between 0% and 100%"):
        tax("100", rate=bad)


def test_zero_rate_is_valid():
    assert tax("100", rate="0").tax == 0


def test_every_result_reconciles_exactly():
    rng = random.Random(20261122)
    for _ in range(2000):
        amount = D(rng.randint(0, 99_999_999)) / 100
        rate = rng.choice(["0", "0.05", "0.12", "0.18", "0.28", "0.0375"])
        ex, inc = tax(str(amount), rate=rate), tax(str(amount), rate=rate, inclusive=True)
        assert ex.total == ex.taxable + ex.tax and ex.taxable == amount
        assert inc.total == amount and inc.taxable + inc.tax == amount and inc.taxable >= 0
        assert all(v == v.quantize(D("0.01")) for v in (ex.tax, ex.total, inc.tax, inc.taxable))
