"""Method C, material-based pricing:  cost = sum(material quantity x rate) + labour + transportation + installation + other.

Rates here are the *cost* rates snapshotted from the catalogue. Profit is added afterwards (profit.py), so the
item's selling price is cost + profit. There is no sheet-cutting or wastage optimisation in V1.
"""
from decimal import Decimal

from app.services.calculation_engine.base import CalculationError, ItemInput, ItemResult
from app.utils.rounding import ZERO, money

ONE = Decimal("1.0000")


class MaterialCalculator:
    def calculate(self, item: ItemInput) -> ItemResult:
        extra = item.extra_costs
        for name in ("labour", "transportation", "installation", "other"):
            if getattr(extra, name) < 0:
                raise CalculationError("Costs can't be negative.", field=f"extra_costs.{name}")

        amounts: list[Decimal] = []
        for index, line in enumerate(item.materials):
            if line.quantity <= 0:
                raise CalculationError("Quantity must be greater than zero.", field=f"materials.{index}.quantity")
            if line.rate < 0:
                raise CalculationError("Rate cannot be negative.", field=f"materials.{index}.rate")
            amounts.append(money(line.quantity * line.rate))

        material_cost = sum(amounts, start=ZERO)
        labour = money(extra.labour)
        additional = money(extra.transportation) + money(extra.installation) + money(extra.other)
        cost = material_cost + labour + additional
        if not amounts and cost == 0:
            raise CalculationError("Add at least one material or cost.", field="materials")

        return ItemResult(
            pricing_method="material", calculated_quantity=ONE, chargeable_quantity=ONE, unit="set",
            unit_rate=ZERO,  # filled in with the selling price once profit is known
            material_cost=material_cost, labour_cost=labour, additional_cost=additional, total=cost,
            line_amounts=tuple(amounts),
        )
