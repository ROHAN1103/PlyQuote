"""Application errors and the single structured error response shape:

    {"error": {"code": "...", "message": "...", "fields": [{"field": "...", "message": "..."}]}}
"""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class AppError(Exception):
    status_code = 400
    code = "bad_request"

    def __init__(
        self,
        message: str,
        *,
        code: str | None = None,
        status_code: int | None = None,
        fields: list[dict] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code or self.code
        self.status_code = status_code or self.status_code
        self.fields = fields or []
        self.headers = headers


class AuthenticationError(AppError):
    status_code = 401
    code = "not_authenticated"


class ForbiddenError(AppError):
    status_code = 403
    code = "forbidden"


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


class RateLimitError(AppError):
    status_code = 429
    code = "rate_limited"


def _body(code: str, message: str, fields: list[dict] | None = None) -> dict:
    return {"error": {"code": code, "message": message, "fields": fields or []}}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_body(exc.code, exc.message, exc.fields),
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        fields = [
            {
                "field": ".".join(str(p) for p in err["loc"] if p != "body"),
                "message": err["msg"],
            }
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content=_body("validation_error", "Some fields are invalid.", fields),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = {404: "not_found", 405: "method_not_allowed"}.get(exc.status_code, "http_error")
        return JSONResponse(
            status_code=exc.status_code,
            content=_body(code, str(exc.detail)),
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(Exception)
    async def unhandled_handler(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content=_body("internal_error", "Something went wrong on our side."),
        )
