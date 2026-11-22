"""Aggregates item results into the quotation totals.

Phase 3 totals are the sum of item totals only. Profit, extra charges, discount and tax are applied here
from Phase 4; the fields already exist so stored data and documents do not change shape.
"""
from collections.abc import Sequence
from decimal import Decimal

from app.services.calculation_engine.base import CalculationError, ItemInput, ItemResult, QuotationResult
from app.services.calculation_engine.manual import ManualCalculator
from app.utils.rounding import ZERO, money

CALCULATORS = {"manual": ManualCalculator()}


def calculate_item(item: ItemInput) -> ItemResult:
    calculator = CALCULATORS.get(item.pricing_method)
    if calculator is None:
        raise CalculationError(f"The '{item.pricing_method}' pricing method is not available yet.")
    return calculator.calculate(item)


def summarize(results: Sequence[ItemResult]) -> QuotationResult:
    subtotal = money(sum((r.total for r in results), start=ZERO))
    return QuotationResult(
        items=tuple(results),
        subtotal=subtotal,
        additional_charges=Decimal("0.00"),
        discount=Decimal("0.00"),
        tax_amount=Decimal("0.00"),
        grand_total=subtotal,
    )


def calculate_quotation(items: Sequence[ItemInput]) -> QuotationResult:
    """The single entry point used by saving, the live preview and (later) every export."""
    return summarize([calculate_item(i) for i in items])
