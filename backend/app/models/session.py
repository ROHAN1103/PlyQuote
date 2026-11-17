"""Server-side sessions and login attempt log (for rate limiting)."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, UUIDPrimaryKeyMixin, utcnow


class UserSession(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)  # SHA-256 hex of the cookie token
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ip_address: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(String(300))


class LoginAttempt(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "login_attempts"

    username: Mapped[str] = mapped_column(String(64), index=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), index=True)
    succeeded: Mapped[bool] = mapped_column(Boolean)
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), index=True
    )
