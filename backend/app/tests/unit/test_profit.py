from decimal import Decimal as D

import pytest

from app.services.calculation_engine import CalculationError, ProfitSpec
from app.services.calculation_engine.profit import apply_profit


def profit(cost, kind, value="0"):
    return apply_profit(D(cost), ProfitSpec(type=kind, value=D(value)))


def test_markup_and_margin_are_different_things():
    """The textbook trap: 20% markup sells at 1200, 20% margin sells at 1250."""
    assert D("1000") + profit("1000", "markup", "0.20") == D("1200.00")
    assert D("1000") + profit("1000", "margin", "0.20") == D("1250.00")


def test_fixed_profit():
    assert profit("1000", "fixed", "500") == D("500.00")


def test_none_adds_nothing_whatever_the_value():
    assert profit("1000", "none", "0.5") == 0


@pytest.mark.parametrize("cost,kind,value,expected", [
    ("22990.50", "markup", "0.20", "4598.10"),
    ("22990.50", "margin", "0.20", "5747.63"),    # 22990.50 / 0.8 = 28738.125 -> 28738.13 (half-up); minus cost
    ("10.01", "markup", "0.125", "1.25"),         # 1.25125
    ("33.33", "margin", "0.15", "5.88"),          # 33.33 / 0.85 = 39.2117... -> 39.21
    ("0", "margin", "0.5", "0.00"),
    ("0", "markup", "0.5", "0.00"),
])
def test_exact_results(cost, kind, value, expected):
    assert profit(cost, kind, value) == D(expected)


def test_margin_has_no_division_by_zero_or_negative_prices():
    for bad in ("1", "1.0", "1.5"):
        with pytest.raises(CalculationError, match="below 100%") as exc:
            profit("1000", "margin", bad)
        assert exc.value.field == "profit_rule.value"
    assert profit("1000", "margin", "0.9999") == D("9999000.00")     # extreme but finite


@pytest.mark.parametrize("kind", ["markup", "margin", "fixed"])
def test_negative_profit_is_rejected(kind):
    with pytest.raises(CalculationError, match="negative"):
        profit("1000", kind, "-0.1")


def test_absurd_markup_is_rejected_as_a_typo_guard():
    with pytest.raises(CalculationError, match="1000%"):
        profit("1000", "markup", "11")
    assert profit("1000", "markup", "10") == D("10000.00")


def test_unknown_type_is_rejected():
    with pytest.raises(CalculationError, match="Unknown profit type"):
        profit("1000", "bonus", "1")
