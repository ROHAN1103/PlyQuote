from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.types import FractionField, MoneyField, RateField


class ChargesData(BaseModel):
    labour: MoneyField = Decimal(0)
    transportation: MoneyField = Decimal(0)
    installation: MoneyField = Decimal(0)
    miscellaneous: MoneyField = Decimal(0)


class DiscountData(BaseModel):
    """percent: `value` is a fraction (0.05 = 5%).  fixed: `value` is rupees."""

    type: Literal["none", "percent", "fixed"] = "none"
    value: RateField = Decimal(0)


class GstData(BaseModel):
    """No built-in rate. The engine reports an error if GST is enabled without one."""

    enabled: bool = False
    rate: FractionField | None = None
    prices_include_tax: bool = False


class SettingsData(BaseModel):
    """How a quotation's totals are worked out. Stored with the quotation (JSON) so a saved quotation always
    reproduces the same figures, whatever the company settings say later."""

    charges: ChargesData = Field(default_factory=ChargesData)
    discount: DiscountData = Field(default_factory=DiscountData)
    gst: GstData = Field(default_factory=GstData)
    round_to_rupee: bool = False
