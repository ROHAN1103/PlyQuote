from fastapi import APIRouter, Request, Response

from app.api.deps import AuthServiceDep, CurrentUser, SettingsDep, get_client_ip
from app.core.security import generate_csrf_token
from app.schemas.auth import CsrfOut, LoginRequest, MessageOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _cookie_kwargs(settings: SettingsDep) -> dict:
    return {"secure": settings.cookie_secure, "samesite": "lax", "path": "/"}


@router.get("/csrf", response_model=CsrfOut)
def get_csrf(response: Response, settings: SettingsDep) -> CsrfOut:
    """Issue a CSRF token. The SPA sends it back in the X-CSRF-Token header."""
    token = generate_csrf_token(settings.secret_key)
    response.set_cookie(
        settings.csrf_cookie_name, token, httponly=False,
        max_age=settings.session_ttl_hours * 3600, **_cookie_kwargs(settings),
    )
    return CsrfOut(csrf_token=token)


@router.post("/login", response_model=UserOut)
def login(
    payload: LoginRequest, request: Request, response: Response,
    auth: AuthServiceDep, settings: SettingsDep,
) -> UserOut:
    user, token = auth.login(
        payload.username, payload.password, get_client_ip(request), request.headers.get("user-agent")
    )
    response.set_cookie(
        settings.session_cookie_name, token, httponly=True,
        max_age=settings.session_ttl_hours * 3600, **_cookie_kwargs(settings),
    )
    return UserOut.model_validate(user)


@router.post("/logout", response_model=MessageOut)
def logout(request: Request, response: Response, auth: AuthServiceDep, settings: SettingsDep) -> MessageOut:
    auth.logout(request.cookies.get(settings.session_cookie_name))
    response.delete_cookie(settings.session_cookie_name, path="/")
    return MessageOut(message="Signed out.")


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)
