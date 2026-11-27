import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, JSONType, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.item_material import ItemMaterial
    from app.models.quotation import Quotation


class QuotationItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "quotation_items"
    __table_args__ = (
        CheckConstraint("pricing_method IN ('manual','measurement','material')", name="method_valid"),
        Index("ix_quotation_items_quotation_position", "quotation_id", "position"),
    )

    quotation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("quotations.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    item_name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="", server_default="")
    pricing_method: Mapped[str] = mapped_column(String(20), default="manual", server_default="manual")
    dimensions: Mapped[dict] = mapped_column(JSONType, default=dict)       # measurement inputs, in inches (Phase 4)
    pricing_config: Mapped[dict] = mapped_column(JSONType, default=dict)   # formula, minimums, profit rule (Phase 4)

    calculated_quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=0, server_default="0")
    chargeable_quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=0, server_default="0")
    unit: Mapped[str] = mapped_column(String(30))
    unit_rate: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=0, server_default="0")

    material_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, server_default="0")
    labour_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, server_default="0")
    additional_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, server_default="0")
    profit: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, server_default="0")
    discount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, server_default="0")
    tax: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, server_default="0")
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0, server_default="0")

    quotation: Mapped["Quotation"] = relationship(back_populates="items")
    materials: Mapped[list["ItemMaterial"]] = relationship(
        back_populates="item", cascade="all, delete-orphan", order_by="ItemMaterial.position"
    )
