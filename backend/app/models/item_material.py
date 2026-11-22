import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, UUIDPrimaryKeyMixin


class ItemMaterial(Base, UUIDPrimaryKeyMixin):
    """A material line on a material-priced item (used from Phase 4). Name, unit and rate are copied
    from the catalogue (see MaterialService.snapshot), so later catalogue edits never change them."""

    __tablename__ = "item_materials"

    quotation_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("quotation_items.id", ondelete="CASCADE"), index=True)
    material_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("materials.id", ondelete="SET NULL"))
    material_name_snapshot: Mapped[str] = mapped_column(String(200))
    unit_snapshot: Mapped[str] = mapped_column(String(30))
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4))
    rate_snapshot: Mapped[Decimal] = mapped_column(Numeric(14, 4))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
