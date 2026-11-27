"""Profit rules, applied to an item's cost.

  markup:  selling = cost x (1 + markup)        profit = cost x markup
  margin:  selling = cost / (1 - margin)        profit = selling - cost       (margin is a share of the SELLING price)
  fixed:   selling = cost + amount

Markup and margin are different things: 20% markup on 1000 sells for 1200; 20% margin sells for 1250.
"""
from decimal import Decimal

from app.services.calculation_engine.base import CalculationError, ProfitSpec
from app.utils.rounding import ZERO, money

MAX_MARKUP = Decimal("10")  # 1000%: a typo guard, not a business rule
ONE = Decimal(1)
PROFIT_TYPES = ("none", "markup", "margin", "fixed")


def apply_profit(cost: Decimal, spec: ProfitSpec) -> Decimal:
    """Returns the profit amount to add to `cost` (money, half-up)."""
    if spec.type not in PROFIT_TYPES:
        raise CalculationError(f"Unknown profit type '{spec.type}'.", field="profit_rule.type")
    if spec.type == "none":
        return ZERO
    if spec.value < 0:
        raise CalculationError("Profit can't be negative.", field="profit_rule.value")

    if spec.type == "markup":
        if spec.value > MAX_MARKUP:
            raise CalculationError("Markup can't be more than 1000%.", field="profit_rule.value")
        return money(cost * spec.value)
    if spec.type == "margin":
        if spec.value >= ONE:
            raise CalculationError("Margin must be below 100%. A 100% margin would need an infinite selling price.",
                                   field="profit_rule.value")
        return money(cost / (ONE - spec.value)) - cost
    return money(spec.value)  # fixed
