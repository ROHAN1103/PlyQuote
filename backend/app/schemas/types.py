"""Shared annotated types. Decimals travel as fixed-precision JSON strings, never floats."""
from decimal import Decimal
from typing import Annotated

from pydantic import Field, PlainSerializer

_TWO = Decimal("0.01")
_FOUR = Decimal("0.0001")

# Output: always rendered with the same number of places, however the value was entered or stored.
Money = Annotated[Decimal, PlainSerializer(lambda v: format(v.quantize(_TWO), "f"), return_type=str, when_used="json")]
Fixed4 = Annotated[Decimal, PlainSerializer(lambda v: format(v.quantize(_FOUR), "f"), return_type=str, when_used="json")]

# Input: quantities must be positive, rates cannot be negative; both allow up to 4 decimals.
QuantityIn = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=4)]
RateIn = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=4)]
