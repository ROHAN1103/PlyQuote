"""Authentication: login with rate limiting, server-side sessions, logout.

Business rules
- Usernames are case-insensitive.
- After N failed logins (per username, or 4N per IP) within the window, further
  attempts are refused with 429 until the window passes. A success clears the
  username's failure count.
- Sessions live in the database; only the SHA-256 of the cookie token is stored,
  so logout/revocation takes effect immediately and a DB leak exposes no usable tokens.
"""
from datetime import timedelta

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.database import as_utc, utcnow
from app.core.exceptions import AuthenticationError, RateLimitError
from app.core.security import (
    generate_session_token,
    hash_password,
    hash_token,
    password_needs_rehash,
    verify_password,
)
from app.models.session import UserSession
from app.models.user import User
from app.repositories.auth_repository import AuthRepository
from app.repositories.user_repository import UserRepository


class AuthService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.db = db
        self.settings = settings
        self.users = UserRepository(db)
        self.auth = AuthRepository(db)

    # ---- login ----
    def login(
        self, username: str, password: str, ip: str | None, user_agent: str | None
    ) -> tuple[User, str]:
        """Returns (user, raw session token). The raw token is never stored."""
        uname = username.strip().lower()
        now = utcnow()
        self._enforce_rate_limit(uname, ip, now)

        user = self.users.get_by_username(uname)
        password_ok = verify_password(user.password_hash if user else None, password)

        if not (user and user.is_active and password_ok):
            self.auth.record_attempt(uname, ip, succeeded=False)
            self.db.commit()  # persist the failure before raising
            raise AuthenticationError("Incorrect username or password.", code="invalid_credentials")

        if password_needs_rehash(user.password_hash):
            user.password_hash = hash_password(password)

        self.auth.clear_failures_for_username(uname)
        self.auth.record_attempt(uname, ip, succeeded=True)
        self.auth.purge_attempts_before(now - timedelta(days=7))

        token = generate_session_token()
        self.auth.add_session(
            UserSession(
                user_id=user.id,
                token_hash=hash_token(token),
                expires_at=now + timedelta(hours=self.settings.session_ttl_hours),
                last_seen_at=now,
                ip_address=ip,
                user_agent=(user_agent or "")[:300] or None,
            )
        )
        self.db.commit()
        return user, token

    def _enforce_rate_limit(self, username: str, ip: str | None, now) -> None:
        window = timedelta(minutes=self.settings.login_window_minutes)
        since = now - window
        too_many_user = (
            self.auth.count_failures_by_username(username, since) >= self.settings.login_max_attempts
        )
        too_many_ip = bool(ip) and (
            self.auth.count_failures_by_ip(ip, since)
            >= self.settings.login_max_attempts * self.settings.login_ip_multiplier
        )
        if too_many_user or too_many_ip:
            retry_after = int(window.total_seconds())
            raise RateLimitError(
                f"Too many failed sign-in attempts. Try again in {self.settings.login_window_minutes} minutes.",
                code="too_many_attempts",
                headers={"Retry-After": str(retry_after)},
            )

    # ---- session resolution ----
    def resolve_session(self, token: str | None) -> tuple[UserSession, User]:
        if not token:
            raise AuthenticationError("Please sign in to continue.")
        session = self.auth.get_session_by_token_hash(hash_token(token))
        now = utcnow()
        if not session or session.revoked_at is not None or as_utc(session.expires_at) <= now:
            raise AuthenticationError("Your session has expired. Please sign in again.", code="session_expired")
        user = self.users.get_by_id(session.user_id)
        if not user or not user.is_active:
            raise AuthenticationError("Your session has expired. Please sign in again.", code="session_expired")

        if (now - as_utc(session.last_seen_at)).total_seconds() >= self.settings.session_touch_seconds:
            session.last_seen_at = now
            self.db.commit()
        return session, user

    # ---- logout ----
    def logout(self, token: str | None) -> None:
        if not token:
            return
        session = self.auth.get_session_by_token_hash(hash_token(token))
        if session and session.revoked_at is None:
            session.revoked_at = utcnow()
            self.db.commit()
