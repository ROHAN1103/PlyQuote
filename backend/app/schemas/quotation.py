import re
import uuid
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import (
    BaseModel, BeforeValidator, ConfigDict, EmailStr, Field, StringConstraints, ValidationInfo, field_validator,
)

from app.schemas.calculation import Totals
from app.schemas.company import SignatureSettings
from app.schemas.quotation_item import ItemIn, ItemOut
from app.schemas.types import Money

PHONE_RE = re.compile(r"^[0-9+()\-\s]{0,30}$")
Text = lambda n: Annotated[str, StringConstraints(strip_whitespace=True, max_length=n)]  # noqa: E731

Status = Literal["draft", "finalized", "sent", "accepted", "rejected"]
EffectiveStatus = Literal["draft", "finalized", "sent", "accepted", "rejected", "expired"]


def _blank_to_none(v):
    return None if isinstance(v, str) and not v.strip() else v


class ClientIn(BaseModel):
    """Client details are stored on the quotation. There is deliberately no client database."""

    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    phone: Text(30) = ""
    email: Annotated[EmailStr | None, BeforeValidator(_blank_to_none)] = None
    address: Text(1000) = ""

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        if not PHONE_RE.match(v):
            raise ValueError("Use digits, spaces, +, - and brackets only.")
        return v


class ClientOut(BaseModel):
    name: str
    phone: str = ""
    email: str | None = None
    address: str = ""


class QuotationIn(BaseModel):
    project_name: Text(200) = ""
    project_location: Text(300) = ""
    client: ClientIn
    quotation_date: date
    valid_until: date
    notes: Text(2000) = ""
    payment_terms: Text(2000) = ""
    terms_and_conditions: Text(10000) = ""
    items: Annotated[list[ItemIn], Field(max_length=200)] = []

    @field_validator("valid_until")
    @classmethod
    def _validity(cls, value: date, info: ValidationInfo) -> date:
        # A field validator (not a model one) so the error is reported against the valid_until field.
        start = info.data.get("quotation_date")
        if start is not None and value < start:
            raise ValueError("The validity date cannot be before the quotation date.")
        return value


class QuotationUpdate(QuotationIn):
    row_version: int = Field(ge=1)


class CompanySnapshot(BaseModel):
    name: str = ""
    address: str = ""
    phone: str = ""
    email: str | None = None
    gstin: str = ""
    document_footer: str = ""
    signature: SignatureSettings = Field(default_factory=SignatureSettings)


class QuotationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    quotation_number: str
    status: Status
    effective_status: EffectiveStatus
    currency: str
    revision: int
    row_version: int
    project_name: str
    project_location: str
    client: ClientOut
    quotation_date: date
    valid_until: date
    notes: str
    payment_terms: str
    terms_and_conditions: str
    company: CompanySnapshot
    items: list[ItemOut]
    totals: Totals
    created_at: datetime
    updated_at: datetime


class QuotationSummaryOut(BaseModel):
    id: uuid.UUID
    quotation_number: str
    status: Status
    effective_status: EffectiveStatus
    project_name: str
    client_name: str
    quotation_date: date
    valid_until: date
    grand_total: Money
    revision: int
    updated_at: datetime


class QuotationDefaults(BaseModel):
    """Prefilled values for a new quotation, taken from company settings."""

    quotation_date: date
    valid_until: date
    payment_terms: str
    terms_and_conditions: str
