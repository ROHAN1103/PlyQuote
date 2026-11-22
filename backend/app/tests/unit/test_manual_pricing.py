from decimal import Decimal as D

import pytest

from app.services.calculation_engine import CalculationError, ItemInput, calculate_item, calculate_quotation


def manual(qty, rate, unit="pc"):
    return ItemInput(pricing_method="manual", quantity=D(qty), unit=unit, unit_rate=D(rate))


def test_spec_example_tv_unit():
    r = calculate_item(manual("1", "25000"))
    assert r.total == D("25000.00") and r.calculated_quantity == r.chargeable_quantity == D("1.0000")


def test_amount_is_quantity_times_rate():
    assert calculate_item(manual("12.5", "80")).total == D("1000.00")


def test_binary_float_trap_is_avoided():
    # 0.1 * 3 is 0.30000000000000004 as a float; with Decimal it is exact.
    assert calculate_item(manual("3", "0.1")).total == D("0.30")


def test_rounds_half_up_to_paise():
    assert calculate_item(manual("1", "0.005")).total == D("0.01")      # half-up, not banker's rounding
    assert calculate_item(manual("1", "0.015")).total == D("0.02")
    assert calculate_item(manual("3", "33.3333")).total == D("100.00")  # 99.9999


def test_rate_may_have_four_decimals_and_zero_rate_is_allowed():
    assert calculate_item(manual("1000", "0.0525")).total == D("52.50")
    assert calculate_item(manual("2", "0")).total == D("0.00")


@pytest.mark.parametrize("qty", ["0", "-1"])
def test_non_positive_quantity_is_rejected(qty):
    with pytest.raises(CalculationError, match="Quantity"):
        calculate_item(manual(qty, "10"))


def test_negative_rate_and_missing_values_are_rejected():
    with pytest.raises(CalculationError, match="Rate"):
        calculate_item(manual("1", "-5"))
    with pytest.raises(CalculationError):
        calculate_item(ItemInput(pricing_method="manual", quantity=None, unit_rate=D("1")))


def test_unknown_or_future_methods_are_refused_clearly():
    with pytest.raises(CalculationError, match="not available yet"):
        calculate_item(ItemInput(pricing_method="measurement", quantity=D("1"), unit_rate=D("1")))


def test_quotation_totals_are_the_sum_of_items():
    result = calculate_quotation([manual("1", "25000"), manual("2", "1500.50"), manual("3", "33.3333")])
    assert [i.total for i in result.items] == [D("25000.00"), D("3001.00"), D("100.00")]
    assert result.subtotal == D("28101.00") and result.grand_total == D("28101.00")
    assert result.tax_amount == result.discount == result.additional_charges == D("0.00")


def test_empty_quotation_totals_zero():
    result = calculate_quotation([])
    assert result.subtotal == result.grand_total == D("0.00") and result.items == ()


def test_totals_sum_rounded_items_not_raw_products():
    # Three lines of 0.005 each round to 0.01 individually (0.03 total), not 0.015 -> 0.02.
    result = calculate_quotation([manual("1", "0.005")] * 3)
    assert result.subtotal == D("0.03")
