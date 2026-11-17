import uuid
from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.session import LoginAttempt, UserSession


class AuthRepository:
    """Sessions and login-attempt bookkeeping."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # ---- sessions ----
    def add_session(self, session: UserSession) -> UserSession:
        self.db.add(session)
        self.db.flush()
        return session

    def get_session_by_token_hash(self, token_hash: str) -> UserSession | None:
        return self.db.scalar(select(UserSession).where(UserSession.token_hash == token_hash))

    def revoke_all_for_user(self, user_id: uuid.UUID, now: datetime) -> None:
        for s in self.db.scalars(
            select(UserSession).where(UserSession.user_id == user_id, UserSession.revoked_at.is_(None))
        ):
            s.revoked_at = now

    # ---- login attempts ----
    def record_attempt(self, username: str, ip: str | None, succeeded: bool) -> None:
        self.db.add(LoginAttempt(username=username, ip_address=ip, succeeded=succeeded))
        self.db.flush()

    def count_failures_by_username(self, username: str, since: datetime) -> int:
        return self.db.scalar(
            select(func.count()).select_from(LoginAttempt).where(
                LoginAttempt.username == username,
                LoginAttempt.succeeded.is_(False),
                LoginAttempt.attempted_at >= since,
            )
        ) or 0

    def count_failures_by_ip(self, ip: str, since: datetime) -> int:
        return self.db.scalar(
            select(func.count()).select_from(LoginAttempt).where(
                LoginAttempt.ip_address == ip,
                LoginAttempt.succeeded.is_(False),
                LoginAttempt.attempted_at >= since,
            )
        ) or 0

    def clear_failures_for_username(self, username: str) -> None:
        self.db.execute(
            delete(LoginAttempt).where(
                LoginAttempt.username == username, LoginAttempt.succeeded.is_(False)
            )
        )

    def purge_attempts_before(self, cutoff: datetime) -> None:
        self.db.execute(delete(LoginAttempt).where(LoginAttempt.attempted_at < cutoff))
