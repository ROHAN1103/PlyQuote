"""Method A, manual pricing:  amount = quantity x rate."""
from app.services.calculation_engine.base import CalculationError, ItemInput, ItemResult
from app.utils.rounding import money, quantity


class ManualCalculator:
    def calculate(self, item: ItemInput) -> ItemResult:
        if item.quantity is None or item.quantity <= 0:
            raise CalculationError("Quantity must be greater than zero.")
        if item.unit_rate is None or item.unit_rate < 0:
            raise CalculationError("Rate cannot be negative.")
        qty = quantity(item.quantity)
        return ItemResult(
            pricing_method="manual",
            calculated_quantity=qty,
            chargeable_quantity=qty,
            unit=item.unit,
            unit_rate=item.unit_rate,
            total=money(qty * item.unit_rate),
        )
