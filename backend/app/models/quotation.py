import enum
import uuid
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, JSONType, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.quotation_item import QuotationItem


class QuotationStatus(str, enum.Enum):
    DRAFT = "draft"
    FINALIZED = "finalized"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    # "expired" is never stored: it is derived from valid_until when read.


STATUS_VALUES = "'draft','finalized','sent','accepted','rejected'"
ZERO_MONEY = "0"


class Quotation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """The editable working copy of a quotation. Finalized revisions are stored separately (Phase 6)."""

    __tablename__ = "quotations"
    __table_args__ = (
        UniqueConstraint("company_id", "quotation_number", name="uq_quotations_company_number"),
        CheckConstraint(f"status IN ({STATUS_VALUES})", name="status_valid"),
        CheckConstraint("valid_until >= quotation_date", name="validity_after_date"),
        Index("ix_quotations_company_status", "company_id", "status"),
        Index("ix_quotations_company_date", "company_id", "quotation_date"),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"))
    quotation_number: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(20), default=QuotationStatus.DRAFT.value, server_default="draft")
    currency: Mapped[str] = mapped_column(String(3), default="INR", server_default="INR")
    current_revision: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    # Optimistic locking: every save increments it; a save carrying an older value is refused.
    row_version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")

    project_name: Mapped[str] = mapped_column(String(200), default="", server_default="")
    project_location: Mapped[str] = mapped_column(String(300), default="", server_default="")
    # Client details live on the quotation (there is no client database). client_name is a denormalised
    # copy of client_details["name"] so the list can be searched and sorted with a plain index.
    client_name: Mapped[str] = mapped_column(String(200))
    client_details: Mapped[dict] = mapped_column(JSONType, default=dict)
    # Company details as they were when the quotation was created, so editing Settings later cannot
    # change an existing quotation.
    company_snapshot: Mapped[dict] = mapped_column(JSONType, default=dict)
    calculation_settings: Mapped[dict] = mapped_column(JSONType, default=dict)

    quotation_date: Mapped[date] = mapped_column(Date)
    valid_until: Mapped[date] = mapped_column(Date)
    notes: Mapped[str] = mapped_column(Text, default="", server_default="")
    payment_terms: Mapped[str] = mapped_column(Text, default="", server_default="")
    terms_and_conditions: Mapped[str] = mapped_column(Text, default="", server_default="")

    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, server_default=ZERO_MONEY)
    additional_charges: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, server_default=ZERO_MONEY)
    discount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, server_default=ZERO_MONEY)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, server_default=ZERO_MONEY)
    grand_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, server_default=ZERO_MONEY)

    items: Mapped[list["QuotationItem"]] = relationship(
        back_populates="quotation", cascade="all, delete-orphan", order_by="QuotationItem.position"
    )
