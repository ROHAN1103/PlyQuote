"""Decimal rounding rules. Money is rounded half-up to 2 places, quantities and rates to 4 places.

Never use float for any amount: 0.1 + 0.2 != 0.3 in binary floating point.
"""
from decimal import ROUND_HALF_UP, Decimal

MONEY_PLACES = Decimal("0.01")
QUANTITY_PLACES = Decimal("0.0001")

ZERO = Decimal("0")


def money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_PLACES, rounding=ROUND_HALF_UP)


def quantity(value: Decimal) -> Decimal:
    return value.quantize(QUANTITY_PLACES, rounding=ROUND_HALF_UP)
