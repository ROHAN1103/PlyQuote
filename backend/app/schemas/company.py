import re
import uuid
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import (
    BaseModel, BeforeValidator, ConfigDict, EmailStr, Field, StringConstraints,
    field_serializer, field_validator, model_validator,
)

GSTIN_RE = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")
PHONE_RE = re.compile(r"^[0-9+()\-\s]{0,30}$")


def _blank_to_none(value):
    return None if isinstance(value, str) and not value.strip() else value


Text = lambda n: Annotated[str, StringConstraints(strip_whitespace=True, max_length=n)]  # noqa: E731
# GST rate is a decimal fraction (0.18 = 18%), never a float.
TaxRate = Annotated[Decimal, Field(ge=0, le=1, max_digits=5, decimal_places=4)]


class GstSettings(BaseModel):
    """Tax is opt-in: there is deliberately no built-in default rate."""

    enabled: bool = False
    rate: TaxRate | None = None
    prices_include_tax: bool = False

    @model_validator(mode="after")
    def _rate_required_when_enabled(self) -> "GstSettings":
        if self.enabled and self.rate is None:
            raise ValueError("Enter a GST rate, or turn GST off.")
        return self

    @field_serializer("rate")
    def _rate_str(self, value: Decimal | None) -> str | None:
        return None if value is None else format(value.quantize(Decimal("0.0001")), "f")


class SignatureSettings(BaseModel):
    name: Text(100) = ""
    designation: Text(100) = ""


class CompanyDefaults(BaseModel):
    """Defaults copied into every new quotation. Stored in companies.settings (JSONB)."""

    currency: Literal["INR"] = "INR"
    gst: GstSettings = Field(default_factory=GstSettings)
    quotation_validity_days: int = Field(default=30, ge=1, le=365)
    payment_terms: Text(2000) = ""
    terms_and_conditions: Text(10000) = ""
    document_footer: Text(500) = ""
    signature: SignatureSettings = Field(default_factory=SignatureSettings)
    # Customer-facing documents hide material-level cost detail unless this is on.
    show_material_breakdown_to_customer: bool = False


class CompanyUpdate(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    address: Text(1000) = ""
    phone: Text(30) = ""
    email: Annotated[EmailStr | None, BeforeValidator(_blank_to_none)] = None
    gstin: Text(15) = ""
    defaults: CompanyDefaults = Field(default_factory=CompanyDefaults)

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        if not PHONE_RE.match(v):
            raise ValueError("Use digits, spaces, +, - and brackets only.")
        return v

    @field_validator("gstin")
    @classmethod
    def _gstin(cls, v: str) -> str:
        v = v.upper()
        if v and not GSTIN_RE.match(v):
            raise ValueError("Enter a valid 15-character GSTIN, e.g. 33ABCDE1234F1Z5.")
        return v


class CompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    address: str
    phone: str
    email: str | None
    gstin: str
    has_logo: bool
    logo_version: str | None  # changes whenever the logo does, for cache-busting
    defaults: CompanyDefaults
