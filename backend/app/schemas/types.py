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

_THREE = Decimal("0.001")

# Field types that both validate input and render output at a fixed precision, so a block of pricing
# data has one definition for requests and responses.
MoneyField = Annotated[
    Decimal, Field(ge=0, max_digits=14, decimal_places=2),
    PlainSerializer(lambda v: format(v.quantize(_TWO), "f"), return_type=str, when_used="json"),
]
RateField = Annotated[  # rates, fixed profit amounts, and values that are percentages stored as fractions
    Decimal, Field(ge=0, max_digits=14, decimal_places=4),
    PlainSerializer(lambda v: format(v.quantize(_FOUR), "f"), return_type=str, when_used="json"),
]
QuantityField = Annotated[
    Decimal, Field(gt=0, max_digits=14, decimal_places=4),
    PlainSerializer(lambda v: format(v.quantize(_FOUR), "f"), return_type=str, when_used="json"),
]
InchesField = Annotated[
    Decimal, Field(gt=0, max_digits=10, decimal_places=3),
    PlainSerializer(lambda v: format(v.quantize(_THREE), "f"), return_type=str, when_used="json"),
]
FractionField = Annotated[  # a share between 0 and 1 (0.18 = 18%), e.g. GST or a percentage discount
    Decimal, Field(ge=0, le=1, max_digits=5, decimal_places=4),
    PlainSerializer(lambda v: format(v.quantize(_FOUR), "f"), return_type=str, when_used="json"),
]
