from typing import Annotated

from pydantic import BaseModel, Field

from app.schemas.quotation_item import ItemIn, ItemResultOut
from app.schemas.quotation_settings import SettingsData
from app.schemas.types import Money


class Totals(BaseModel):
    subtotal: Money
    additional_charges: Money
    discount: Money
    taxable_amount: Money
    tax_amount: Money
    rounding_adjustment: Money
    grand_total: Money
    # Internal figures: never shown on customer-facing documents.
    material_cost: Money
    profit: Money


class PreviewRequest(BaseModel):
    items: Annotated[list[ItemIn], Field(max_length=200)]
    settings: SettingsData = Field(default_factory=SettingsData)


class PreviewResponse(BaseModel):
    items: list[ItemResultOut]
    totals: Totals
