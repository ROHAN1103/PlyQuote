from decimal import Decimal as D

import pytest

from app.utils.numbering import format_quotation_number
from app.utils.rounding import money, quantity


def test_number_format():
    assert format_quotation_number(2026, 1) == "QT-2026-0001"
    assert format_quotation_number(2026, 42) == "QT-2026-0042"
    assert format_quotation_number(2026, 9999) == "QT-2026-9999"
    assert format_quotation_number(2026, 10000) == "QT-2026-10000"  # grows, never truncates


def test_sequence_must_be_positive():
    with pytest.raises(ValueError):
        format_quotation_number(2026, 0)


@pytest.mark.parametrize("raw,expected", [("2.345", "2.35"), ("2.344", "2.34"), ("0.005", "0.01"), ("-0.005", "-0.01"), ("10", "10.00")])
def test_money_rounds_half_up(raw, expected):
    assert money(D(raw)) == D(expected)


def test_quantity_has_four_places():
    assert quantity(D("1.23455")) == D("1.2346")
