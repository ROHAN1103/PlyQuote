"""Application settings, loaded from environment variables (or a local .env file)."""
from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"  # development | test | production
    log_level: str = "INFO"
    enable_docs: bool = True

    database_url: str
    # Used to sign CSRF tokens. Generate with: python -c "import secrets; print(secrets.token_urlsafe(48))"
    secret_key: str = Field(min_length=32)

    # Cookies / sessions
    cookie_secure: bool = False  # MUST be true in production (HTTPS only)
    session_cookie_name: str = "pqb_session"
    csrf_cookie_name: str = "pqb_csrf"
    session_ttl_hours: int = Field(default=12, ge=1)
    session_touch_seconds: int = 60  # how often last_seen_at is refreshed

    # Login protection
    login_max_attempts: int = Field(default=5, ge=1)  # failures per username per window
    login_ip_multiplier: int = Field(default=4, ge=1)  # per-IP limit = attempts * multiplier
    login_window_minutes: int = Field(default=15, ge=1)

    # Password policy
    min_password_length: int = Field(default=12, ge=8)

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @model_validator(mode="after")
    def _production_guards(self) -> "Settings":
        if self.is_production and not self.cookie_secure:
            raise ValueError("COOKIE_SECURE must be true when ENVIRONMENT=production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
