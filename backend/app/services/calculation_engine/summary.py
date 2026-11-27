"""Item pricing entry point and quotation aggregation.

Pipeline (the same everywhere: saving, live preview and every export):

  item selling price  = cost (or quantity x rate) + profit          [profit only if the rate does not already include it]
  subtotal            = sum of item selling prices
  + additional charges (labour, transportation, installation, miscellaneous)
  - discount          (percent or fixed, on subtotal + charges)
  = amount before tax
  tax                 exclusive: on top.   inclusive: the amount already contains it.
  rounding adjustment (optional: round the total to the nearest rupee, half-up)
  = grand total
"""
from collections.abc import Sequence
from dataclasses import replace
from decimal import ROUND_HALF_UP, Decimal

from app.services.calculation_engine.base import (
    CalculationError, DiscountSpec, ItemInput, ItemResult, QuotationResult, QuotationSettings,
)
from app.services.calculation_engine.manual import ManualCalculator
from app.services.calculation_engine.material import MaterialCalculator
from app.services.calculation_engine.measurement import MeasurementCalculator
from app.services.calculation_engine.profit import apply_profit
from app.services.calculation_engine.tax import compute_tax
from app.utils.rounding import ZERO, money, quantity

CALCULATORS = {"manual": ManualCalculator(), "measurement": MeasurementCalculator(), "material": MaterialCalculator()}

# Decision 2: a typed rate for manual/measurement items is a selling rate; material items are built up from cost.
DEFAULT_RATE_INCLUDES_PROFIT = {"manual": True, "measurement": True, "material": False}


def calculate_item(item: ItemInput) -> ItemResult:
    calculator = CALCULATORS.get(item.pricing_method)
    if calculator is None:
        raise CalculationError(f"Unknown pricing method '{item.pricing_method}'.", field="pricing_method")
    base = calculator.calculate(item)

    includes = item.rate_includes_profit
    if includes is None:
        includes = DEFAULT_RATE_INCLUDES_PROFIT[item.pricing_method]
    profit = ZERO if includes else apply_profit(base.total, item.profit)

    result = replace(base, profit=profit, total=base.total + profit)
    if result.pricing_method == "material":
        result = replace(result, unit_rate=quantity(result.total))  # selling price of the one "set"
    return result


def _charges_total(settings: QuotationSettings) -> Decimal:
    total = ZERO
    for name in ("labour", "transportation", "installation", "miscellaneous"):
        value = getattr(settings.charges, name)
        if value < 0:
            raise CalculationError("Charges can't be negative.", field=f"settings.charges.{name}")
        total += money(value)
    return total


def _discount(base: Decimal, spec: DiscountSpec) -> Decimal:
    if spec.type == "none":
        return ZERO
    if spec.type not in ("percent", "fixed"):
        raise CalculationError(f"Unknown discount type '{spec.type}'.", field="settings.discount.type")
    if spec.value < 0:
        raise CalculationError("The discount can't be negative.", field="settings.discount.value")
    if spec.type == "percent":
        if spec.value > 1:
            raise CalculationError("The discount can't be more than 100%.", field="settings.discount.value")
        return money(base * spec.value)
    amount = money(spec.value)
    if amount > base:
        raise CalculationError("The discount can't be more than the subtotal.", field="settings.discount.value")
    return amount


def summarize(results: Sequence[ItemResult], settings: QuotationSettings | None = None) -> QuotationResult:
    settings = settings or QuotationSettings()
    subtotal = money(sum((r.total for r in results), start=ZERO))
    charges = _charges_total(settings)
    before_discount = subtotal + charges
    discount = _discount(before_discount, settings.discount)
    tax = compute_tax(before_discount - discount, settings.tax)

    grand = tax.total
    adjustment = ZERO
    if settings.round_to_rupee:
        rounded = grand.quantize(Decimal(1), rounding=ROUND_HALF_UP)
        adjustment, grand = money(rounded - grand), money(rounded)

    return QuotationResult(
        items=tuple(results), subtotal=subtotal, additional_charges=charges, discount=discount,
        taxable_amount=tax.taxable, tax_amount=tax.tax, rounding_adjustment=adjustment, grand_total=grand,
        material_cost=sum((r.material_cost for r in results), start=ZERO),
        profit=sum((r.profit for r in results), start=ZERO),
    )


def calculate_quotation(items: Sequence[ItemInput], settings: QuotationSettings | None = None) -> QuotationResult:
    """The single entry point used by saving, the live preview and (later) every export."""
    return summarize([calculate_item(i) for i in items], settings)
