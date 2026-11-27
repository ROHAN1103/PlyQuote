"""GST. There is deliberately no default rate: it must be enabled and given.

  exclusive: entered prices exclude GST   tax = amount x rate            total = amount + tax
  inclusive: entered prices include GST   tax = amount x rate/(1+rate)   total = amount;  taxable = amount - tax
"""
from dataclasses import dataclass
from decimal import Decimal

from app.services.calculation_engine.base import CalculationError, TaxSpec
from app.utils.rounding import ZERO, money

ONE = Decimal(1)


@dataclass(frozen=True)
class TaxResult:
    taxable: Decimal
    tax: Decimal
    total: Decimal


def compute_tax(amount: Decimal, spec: TaxSpec) -> TaxResult:
    if not spec.enabled:
        return TaxResult(taxable=amount, tax=ZERO, total=amount)
    if spec.rate is None:
        raise CalculationError("Enter a GST rate, or turn GST off.", field="settings.gst.rate")
    if not (ZERO <= spec.rate <= ONE):
        raise CalculationError("The GST rate must be between 0% and 100%.", field="settings.gst.rate")

    if spec.prices_include_tax:
        tax = money(amount * spec.rate / (ONE + spec.rate))
        return TaxResult(taxable=amount - tax, tax=tax, total=amount)
    tax = money(amount * spec.rate)
    return TaxResult(taxable=amount, tax=tax, total=amount + tax)
