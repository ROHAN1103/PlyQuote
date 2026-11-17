"""Shared FastAPI dependencies: settings, services, current user, CSRF."""
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.exceptions import ForbiddenError
from app.core.security import validate_csrf
from app.models.session import UserSession
from app.models.user import User
from app.services.auth_service import AuthService

SettingsDep = Annotated[Settings, Depends(get_settings)]
DbDep = Annotated[Session, Depends(get_db)]

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
CSRF_HEADER = "X-CSRF-Token"


def get_auth_service(db: DbDep, settings: SettingsDep) -> AuthService:
    return AuthService(db, settings)


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


def get_client_ip(request: Request) -> str | None:
    # uvicorn --proxy-headers rewrites request.client from X-Forwarded-For behind Nginx.
    return request.client.host if request.client else None


def verify_csrf(request: Request, settings: SettingsDep) -> None:
    """Applied to the whole v1 router: every state-changing request needs a valid CSRF token."""
    if request.method in SAFE_METHODS:
        return
    cookie = request.cookies.get(settings.csrf_cookie_name)
    header = request.headers.get(CSRF_HEADER)
    if not validate_csrf(cookie, header, settings.secret_key):
        raise ForbiddenError("Your request could not be verified. Refresh the page and try again.", code="csrf_failed")


def get_session_and_user(
    request: Request, settings: SettingsDep, auth: AuthServiceDep
) -> tuple[UserSession, User]:
    return auth.resolve_session(request.cookies.get(settings.session_cookie_name))


def get_current_user(ctx: Annotated[tuple[UserSession, User], Depends(get_session_and_user)]) -> User:
    return ctx[1]


CurrentUser = Annotated[User, Depends(get_current_user)]
