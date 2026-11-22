from typing import Annotated

from pydantic import BaseModel, Field

from app.schemas.quotation_item import ItemIn, ItemResultOut
from app.schemas.types import Money


class Totals(BaseModel):
    subtotal: Money
    additional_charges: Money
    discount: Money
    tax_amount: Money
    grand_total: Money


class PreviewRequest(BaseModel):
    items: Annotated[list[ItemIn], Field(max_length=200)]


class PreviewResponse(BaseModel):
    items: list[ItemResultOut]
    totals: Totals
