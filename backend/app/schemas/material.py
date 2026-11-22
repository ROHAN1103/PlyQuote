import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_serializer, field_validator

from app.models.material import MaterialCategory

# Rates: up to 10 integer digits and 4 decimals, never negative. Decimal travels as a JSON string.
Rate = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=4)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Unit = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=30)]


class MaterialIn(BaseModel):
    """Full material payload, used for both create (POST) and replace (PUT)."""

    name: Name
    category: MaterialCategory
    brand: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] = ""
    description: Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)] = ""
    specification: Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)] = ""
    unit: Unit
    cost_rate: Rate
    selling_rate: Rate | None = None
    is_active: bool = True


class MaterialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    category: MaterialCategory
    brand: str
    description: str
    specification: str
    unit: str
    cost_rate: Decimal
    selling_rate: Decimal | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at")
    @classmethod
    def _assume_utc(cls, value: datetime) -> datetime:
        # SQLite (tests only) returns naive datetimes; PostgreSQL returns aware ones.
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)

    @field_serializer("cost_rate", "selling_rate")
    def _four_places(self, value: Decimal | None) -> str | None:
        """Rates always render with 4 decimals, whatever the entry or storage path."""
        return None if value is None else format(value.quantize(Decimal("0.0001")), "f")


class MaterialSnapshot(BaseModel):
    """What a quotation line copies from the catalogue. Immutable and independent of later price edits."""

    model_config = ConfigDict(frozen=True)

    material_id: uuid.UUID
    name: str
    unit: str
    cost_rate: Decimal
    selling_rate: Decimal | None
