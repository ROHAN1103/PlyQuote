import os

# Must be set before the app modules import their settings.
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-at-least-32-characters-long")
os.environ.setdefault("ENVIRONMENT", "test")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import create_app
from app.models import Company, User

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "correct-horse-battery"


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def admin(db_session):
    company = Company(name="Test Interiors", settings={})
    db_session.add(company)
    db_session.flush()
    user = User(company_id=company.id, username=ADMIN_USERNAME, password_hash=hash_password(ADMIN_PASSWORD))
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture()
def client(db_session):
    app = create_app()

    def _get_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_db
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def csrf_headers(client):
    """Fetch a CSRF token (sets the cookie on the client) and return the header."""
    token = client.get("/api/v1/auth/csrf").json()["csrf_token"]
    return {"X-CSRF-Token": token}


@pytest.fixture()
def settings():
    return get_settings()
