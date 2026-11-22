import uuid
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints, computed_field

from app.schemas.types import Fixed4, Money, QuantityIn, RateIn

PricingMethod = Literal["manual", "measurement", "material"]
Unit = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=30)]


class ItemIn(BaseModel):
    """One furniture item as entered. Totals are never accepted from the client: the backend computes them.

    Phase 3 prices manual items only; the other methods are accepted by the schema so the API contract
    does not change in Phase 4, but the engine refuses them with a clear message until then.
    """

    id: uuid.UUID | None = None  # present when editing an existing item; unknown ids are ignored
    pricing_method: PricingMethod = "manual"
    item_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    description: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] = ""
    quantity: QuantityIn
    unit: Unit
    unit_rate: RateIn


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


class ItemOut(ItemResultOut):
    id: uuid.UUID
    position: int
    item_name: str
    description: str

    @computed_field  # the quantity as entered, for round-tripping into the form
    @property
    def quantity(self) -> Fixed4:
        return self.chargeable_quantity
