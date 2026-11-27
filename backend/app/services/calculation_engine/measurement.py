"""Method B, measurement-based pricing. Dimensions are in inches.

  front_area       width x height / 144      (sq.ft)
  side_area        height x depth / 144      (sq.ft)
  top_bottom_area  width x depth / 144       (sq.ft)
  square_feet      length x width / 144      (sq.ft)
  running_feet     chosen dimension / 12     (r.ft)
  piece            quantity                  (pc)
  manual_quantity  quantity as entered       (any unit)

`quantity` multiplies the per-piece figure (two identical wardrobes -> quantity 2).
calculated quantity -> raised to the minimum chargeable quantity (if any) -> rounded to `rounding_places`
= chargeable quantity;   amount = chargeable quantity x rate.
The calculated and chargeable quantities are both kept, so a minimum charge is visible, not hidden.
"""
from decimal import ROUND_HALF_UP, Decimal

from app.services.calculation_engine.base import CalculationError, ItemInput, ItemResult
from app.utils.rounding import ZERO, money, quantity

SQ_IN_PER_SQ_FT = Decimal(144)
IN_PER_FT = Decimal(12)

AREA_FORMULAS = {
    "front_area": ("width", "height"),
    "side_area": ("height", "depth"),
    "top_bottom_area": ("width", "depth"),
    "square_feet": ("length", "width"),
}
DIMENSIONS = ("width", "height", "depth", "length")
FORMULAS = (*AREA_FORMULAS, "running_feet", "piece", "manual_quantity")


def _dimension(m, name: str) -> Decimal | None:
    return getattr(m, name)


class MeasurementCalculator:
    def calculate(self, item: ItemInput) -> ItemResult:
        m = item.measurement
        if m is None or m.formula not in FORMULAS:
            raise CalculationError("Choose how this item is measured.", field="measurement.formula")
        if item.quantity is None or item.quantity <= 0:
            raise CalculationError("Quantity must be greater than zero.", field="quantity")
        if item.unit_rate is None:
            raise CalculationError("Enter a rate.", field="unit_rate")
        if item.unit_rate < 0:
            raise CalculationError("Rate cannot be negative.", field="unit_rate")
        if not 0 <= m.rounding_places <= 4:
            raise CalculationError("Rounding must be between 0 and 4 decimal places.", field="measurement.rounding_places")
        if m.minimum_quantity is not None and m.minimum_quantity < 0:
            raise CalculationError("The minimum quantity can't be negative.", field="measurement.minimum_quantity")

        count = item.quantity
        unit = item.unit
        if m.formula in AREA_FORMULAS:
            first, second = AREA_FORMULAS[m.formula]
            a, b = self._required(m, first, second)
            calculated = quantity(a * b * count / SQ_IN_PER_SQ_FT)
            unit = "sq.ft"
        elif m.formula == "running_feet":
            if m.running_dimension not in DIMENSIONS:
                raise CalculationError("Choose which dimension to measure.", field="measurement.running_dimension")
            (length,) = self._required(m, m.running_dimension)
            calculated = quantity(length * count / IN_PER_FT)
            unit = "r.ft"
        elif m.formula == "piece":
            calculated, unit = quantity(count), "pc"
        else:  # manual_quantity
            if not unit.strip():
                raise CalculationError("Enter a unit, e.g. sq.ft or set.", field="unit")
            calculated = quantity(count)

        minimum = m.minimum_quantity if m.minimum_quantity is not None else ZERO
        step = Decimal(1).scaleb(-m.rounding_places)
        chargeable = max(calculated, minimum).quantize(step, rounding=ROUND_HALF_UP)
        if chargeable <= 0:
            raise CalculationError("The chargeable quantity works out to zero. Check the measurements.", field="measurement")

        return ItemResult(
            pricing_method="measurement", calculated_quantity=calculated, chargeable_quantity=chargeable,
            unit=unit, unit_rate=item.unit_rate, total=money(chargeable * item.unit_rate),
        )

    @staticmethod
    def _required(m, *names: str) -> list[Decimal]:
        values = [_dimension(m, n) for n in names]
        missing = [n for n, v in zip(names, values) if v is None]
        if missing:
            joined = " and ".join(missing)
            raise CalculationError(f"Enter the {joined}.", field=f"measurement.{missing[0]}")
        for n, v in zip(names, values):
            if v <= 0:
                raise CalculationError(f"The {n} must be more than zero.", field=f"measurement.{n}")
        return values  # type: ignore[return-value]
