import uuid

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, JSONType, TimestampMixin, UUIDPrimaryKeyMixin


class Company(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "companies"

    name: Mapped[str] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(254))
    logo_path: Mapped[str | None] = mapped_column(String(500))
    gstin: Mapped[str | None] = mapped_column(String(15))
    # Defaults for tax, validity, payment terms, T&C, footer, signature, currency.
    settings: Mapped[dict] = mapped_column(JSONType, default=dict)

    users: Mapped[list["User"]] = relationship(back_populates="company")  # noqa: F821
