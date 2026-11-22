import uuid

from sqlalchemy import Boolean, ForeignKey, Index, String, Text, text, true
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, JSONType, TimestampMixin, UUIDPrimaryKeyMixin


class FurnitureTemplate(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A reusable starting point for a furniture item (e.g. 'TV Unit'). Copied into a quotation, never linked."""

    __tablename__ = "furniture_templates"
    __table_args__ = (
        Index("uq_furniture_templates_name", "company_id", text("lower(name)"), unique=True),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="", server_default="")
    default_pricing_method: Mapped[str] = mapped_column(String(20), default="manual", server_default="manual")
    default_config: Mapped[dict] = mapped_column(JSONType, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
