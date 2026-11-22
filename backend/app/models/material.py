import enum
import uuid
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, Numeric, String, Text, text, true
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class MaterialCategory(str, enum.Enum):
    PLYWOOD = "plywood"
    LAMINATE = "laminate"
    HARDWARE = "hardware"
    OTHER = "other"


class Material(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A reusable catalogue entry. Quotations never reference live prices: they copy a snapshot."""

    __tablename__ = "materials"
    __table_args__ = (
        CheckConstraint("cost_rate >= 0", name="cost_rate_non_negative"),
        CheckConstraint("selling_rate IS NULL OR selling_rate >= 0", name="selling_rate_non_negative"),
        CheckConstraint("category IN ('plywood','laminate','hardware','other')", name="category_valid"),
        # The same material cannot be entered twice (case-insensitive). brand and specification are
        # NOT NULL with '' meaning "none", so the index treats "not given" consistently.
        Index(
            "uq_materials_identity",
            "company_id", "category", text("lower(name)"), text("lower(brand)"), text("lower(specification)"),
            unique=True,
        ),
        Index("ix_materials_company_active", "company_id", "is_active"),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))
    name: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(20))
    brand: Mapped[str] = mapped_column(String(100), default="", server_default="")
    description: Mapped[str] = mapped_column(Text, default="", server_default="")
    specification: Mapped[str] = mapped_column(String(200), default="", server_default="")
    unit: Mapped[str] = mapped_column(String(30))
    cost_rate: Mapped[Decimal] = mapped_column(Numeric(14, 4))
    selling_rate: Mapped[Decimal | None] = mapped_column(Numeric(14, 4))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
