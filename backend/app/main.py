import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import engine
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Plywood Furniture Quotation Builder API starting")
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title="Plywood Furniture Quotation Builder",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/api/v1/docs" if settings.enable_docs else None,
        redoc_url=None,
        openapi_url="/api/v1/openapi.json" if settings.enable_docs else None,
    )
    register_exception_handlers(app)
    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health", tags=["health"])
    def health() -> dict:
        """Liveness: the process is up."""
        return {"status": "ok"}

    @app.get("/health/ready", tags=["health"])
    def ready() -> dict:
        """Readiness: the database answers."""
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ready"}

    return app


app = create_app()
