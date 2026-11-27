"""Calculation engine contracts.

This package is pure Python. It must never import FastAPI, SQLAlchemy, Pydantic or any document library,
so it can be tested alone and reused by the API, the preview endpoint and every exporter.

All money is Decimal, rounded half-up to 2 places; quantities and rates carry up to 4 places.
Dimensions are in inches.
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Protocol

from app.utils.rounding import ZERO


class CalculationError(ValueError):
    """The inputs cannot be priced. Messages are written for end users. `field` names the offending input
    relative to the item (e.g. "measurement.width") so the UI can point at it."""

    def __init__(self, message: str, field: str | None = None) -> None:
        super().__init__(message)
        self.field = field


# ---------------------------------------------------------------- item inputs

@dataclass(frozen=True)
class ProfitSpec:
    """type: none | markup | margin | fixed.  markup/margin `value` is a fraction (0.20 = 20%); fixed is rupees."""

    type: str = "none"
    value: Decimal = ZERO


@dataclass(frozen=True)
class MeasurementInput:
    formula: str                       # front_area | side_area | top_bottom_area | square_feet | running_feet | piece | manual_quantity
    width: Decimal | None = None       # inches
    height: Decimal | None = None
    depth: Decimal | None = None
    length: Decimal | None = None
    running_dimension: str = "width"   # which dimension running_feet measures
    minimum_quantity: Decimal | None = None
    rounding_places: int = 2           # decimal places of the chargeable quantity


@dataclass(frozen=True)
class MaterialLine:
    quantity: Decimal
    rate: Decimal


@dataclass(frozen=True)
class ExtraCosts:
    labour: Decimal = ZERO
    transportation: Decimal = ZERO
    installation: Decimal = ZERO
    other: Decimal = ZERO


@dataclass(frozen=True)
class ItemInput:
    pricing_method: str                # manual | measurement | material
    quantity: Decimal | None = None    # manual: quantity. measurement: number of identical pieces (or the quantity itself).
    unit: str = ""
    unit_rate: Decimal | None = None
    measurement: MeasurementInput | None = None
    materials: tuple[MaterialLine, ...] = ()
    extra_costs: ExtraCosts = field(default_factory=ExtraCosts)
    profit: ProfitSpec = field(default_factory=ProfitSpec)
    # True: the typed rate already is a selling price, so no profit is added (never counted twice).
    # None: use the method's default (manual and measurement: True; material: False).
    rate_includes_profit: bool | None = None


@dataclass(frozen=True)
class ItemResult:
    """Everything the engine decides about one furniture item. Calculated and chargeable quantity are
    kept apart so a minimum charge can be shown honestly."""

    pricing_method: str
    calculated_quantity: Decimal
    chargeable_quantity: Decimal
    unit: str
    unit_rate: Decimal
    material_cost: Decimal = ZERO
    labour_cost: Decimal = ZERO
    additional_cost: Decimal = ZERO     # transportation + installation + other
    profit: Decimal = ZERO
    discount: Decimal = ZERO            # per-item discount/tax stay zero: both are applied once, at quotation level
    tax: Decimal = ZERO
    total: Decimal = ZERO               # the item's selling price (cost + profit)
    line_amounts: tuple[Decimal, ...] = ()   # material line amounts, in line order


# ---------------------------------------------------------------- quotation settings and result

@dataclass(frozen=True)
class Charges:
    labour: Decimal = ZERO
    transportation: Decimal = ZERO
    installation: Decimal = ZERO
    miscellaneous: Decimal = ZERO


@dataclass(frozen=True)
class DiscountSpec:
    type: str = "none"                  # none | percent | fixed
    value: Decimal = ZERO               # percent: fraction (0.05 = 5%); fixed: rupees


@dataclass(frozen=True)
class TaxSpec:
    enabled: bool = False
    rate: Decimal | None = None         # fraction (0.18 = 18%); there is no built-in default
    prices_include_tax: bool = False


@dataclass(frozen=True)
class QuotationSettings:
    charges: Charges = field(default_factory=Charges)
    discount: DiscountSpec = field(default_factory=DiscountSpec)
    tax: TaxSpec = field(default_factory=TaxSpec)
    round_to_rupee: bool = False


@dataclass(frozen=True)
class QuotationResult:
    items: tuple[ItemResult, ...]
    subtotal: Decimal                   # sum of item selling prices
    additional_charges: Decimal
    discount: Decimal
    taxable_amount: Decimal             # amount GST is charged on (net of GST when prices include it)
    tax_amount: Decimal
    rounding_adjustment: Decimal
    grand_total: Decimal
    material_cost: Decimal = ZERO       # internal: sum of material costs
    profit: Decimal = ZERO              # internal: sum of item profits


class ItemCalculator(Protocol):
    def calculate(self, item: ItemInput) -> ItemResult: ...
