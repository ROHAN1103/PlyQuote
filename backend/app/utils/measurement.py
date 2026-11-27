"""Feet/inches helpers. Dimensions are stored and calculated in inches (NUMERIC(10,3)); these helpers
convert at the edges (documents, tests). All arithmetic is Decimal."""
from decimal import ROUND_HALF_UP, Decimal

INCHES_PER_FOOT = Decimal(12)
_THREE = Decimal("0.001")


def to_inches(feet: Decimal | int | str = 0, inches: Decimal | int | str = 0) -> Decimal:
    """5 ft 6.5 in -> 66.500 in. `feet` may be decimal (5.5 ft -> 66 in)."""
    total = Decimal(str(feet)) * INCHES_PER_FOOT + Decimal(str(inches))
    return total.quantize(_THREE, rounding=ROUND_HALF_UP)


def to_feet(inches: Decimal) -> Decimal:
    """66 in -> 5.5 ft (exact; not rounded)."""
    return inches / INCHES_PER_FOOT


def split_feet_inches(inches: Decimal) -> tuple[int, Decimal]:
    """66.5 in -> (5, 6.5). Whole feet and the remaining inches."""
    feet = int(inches // INCHES_PER_FOOT)
    return feet, (inches - feet * INCHES_PER_FOOT).quantize(_THREE, rounding=ROUND_HALF_UP)


def format_feet_inches(inches: Decimal) -> str:
    """66.5 in -> 5' 6.5\"   |   72 in -> 6'   |   9 in -> 9\"   (trailing zeros dropped)."""
    feet, rest = split_feet_inches(inches)
    rest_text = format(rest.normalize(), "f") if rest else ""
    parts = []
    if feet:
        parts.append(f"{feet}'")
    if rest or not feet:
        parts.append(f'{rest_text or "0"}"')
    return " ".join(parts)
