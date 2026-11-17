import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UUIDPrimaryKeyMixin, utcnow
from app.models.company import Company


class User(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "users"

    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), index=True)
    # Always stored lowercase; login is case-insensitive.
    username: Mapped[str] = mapped_column(String(64), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )

    company: Mapped[Company] = relationship(back_populates="users")
