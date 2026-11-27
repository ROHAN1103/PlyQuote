import uuid
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.schemas.types import Fixed4, InchesField, MoneyField, Money, QuantityField, QuantityIn, RateField, RateIn

PricingMethod = Literal["manual", "measurement", "material"]
Formula = Literal["front_area", "side_area", "top_bottom_area", "square_feet", "running_feet", "piece", "manual_quantity"]
Dimension = Literal["width", "height", "depth", "length"]

Unit = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=30)]   # required unit (templates)
OptionalUnit = Annotated[str, StringConstraints(strip_whitespace=True, max_length=30)]         # derived for some methods


class MeasurementData(BaseModel):
    """Dimensions are in INCHES (up to 3 decimals). The UI converts feet/inches before sending."""

    formula: Formula
    width: InchesField | None = None
    height: InchesField | None = None
    depth: InchesField | None = None
    length: InchesField | None = None
    running_dimension: Dimension = "width"
    minimum_quantity: Annotated[RateField, Field(ge=0)] | None = None
    rounding_places: int = Field(default=2, ge=0, le=4)


class ExtraCostsData(BaseModel):
    labour: MoneyField = Decimal(0)
    transportation: MoneyField = Decimal(0)
    installation: MoneyField = Decimal(0)
    other: MoneyField = Decimal(0)


class ProfitRuleData(BaseModel):
    """markup / margin: `value` is a fraction (0.20 = 20%).  fixed: `value` is rupees."""

    type: Literal["none", "markup", "margin", "fixed"] = "none"
    value: RateField = Decimal(0)


class MaterialLineIn(BaseModel):
    """A material on a material-priced item. Name, unit and rate are copied from the catalogue when the line
    is added (the browser sends them), and are never refreshed from the catalogue afterwards."""

    id: uuid.UUID | None = None
    material_id: uuid.UUID | None = None
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    description: Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)] = ""
    unit: Unit
    quantity: QuantityField
    rate: RateField


class MaterialLineOut(BaseModel):
    id: uuid.UUID
    material_id: uuid.UUID | None
    name: str
    description: str
    unit: str
    quantity: QuantityField
    rate: RateField
    amount: Money


class ItemIn(BaseModel):
    """One furniture item as entered. Totals are never accepted from the client: the backend computes them.

    manual:      quantity, unit, unit_rate
    measurement: measurement (formula + inches), quantity (how many pieces, default 1), unit_rate
    material:    materials[] and extra_costs; profit_rule adds the selling margin
    """

    id: uuid.UUID | None = None  # present when editing an existing item; unknown ids are ignored
    pricing_method: PricingMethod = "manual"
    item_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    description: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] = ""
    quantity: QuantityIn | None = None
    unit: OptionalUnit = ""
    unit_rate: RateIn | None = None
    measurement: MeasurementData | None = None
    materials: Annotated[list[MaterialLineIn], Field(max_length=100)] = []
    extra_costs: ExtraCostsData = Field(default_factory=ExtraCostsData)
    profit_rule: ProfitRuleData = Field(default_factory=ProfitRuleData)
    # None = the method's default (manual/measurement: the rate already is a selling rate; material: cost, add profit).
    rate_includes_profit: bool | None = None


class ItemResultOut(BaseModel):
    """Engine output for one item (used by the live preview)."""

    model_config = ConfigDict(from_attributes=True)

    pricing_method: str
    calculated_quantity: Fixed4
    chargeable_quantity: Fixed4
    unit: str
    unit_rate: Fixed4
    material_cost: Money
    labour_cost: Money
    additional_cost: Money
    profit: Money
    discount: Money
    tax: Money
    total: Money
    line_amounts: list[Money] = []


class ItemOut(ItemResultOut):
    id: uuid.UUID
    position: int
    item_name: str
    description: str
    quantity: Fixed4 | None      # as entered (None for material items)
    measurement: MeasurementData | None
    materials: list[MaterialLineOut]
    extra_costs: ExtraCostsData
    profit_rule: ProfitRuleData
    rate_includes_profit: bool   # the rule that was applied
