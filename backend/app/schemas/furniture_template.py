import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.schemas.quotation_item import Unit
from app.schemas.types import Fixed4, QuantityIn, RateIn


class ManualTemplateConfig(BaseModel):
    """Starting values copied into a new manual-priced item."""

    unit: Unit = "pc"
    quantity: QuantityIn = Decimal("1")
    unit_rate: RateIn = Decimal("0")


class ManualTemplateConfigOut(BaseModel):
    unit: str
    quantity: Fixed4
    unit_rate: Fixed4


class TemplateIn(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    description: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] = ""
    default_pricing_method: Literal["manual"] = "manual"  # measurement/material presets arrive with Phase 4
    default_config: ManualTemplateConfig = Field(default_factory=ManualTemplateConfig)


class TemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str
    default_pricing_method: str
    default_config: ManualTemplateConfigOut
    is_active: bool
    created_at: datetime
    updated_at: datetime
