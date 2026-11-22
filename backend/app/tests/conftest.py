"""Test fixtures.

By default tests run on in-memory SQLite (fast). Set TEST_DATABASE_URL to a PostgreSQL URL to run
the same suite against real PostgreSQL: the schema is then built by the Alembic migrations (so they
are tested too) and tables are truncated between tests. Run both before releasing.
"""
import os
import subprocess
import sys
import tempfile
from pathlib import Path

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")

# Must be set before the app modules import their settings.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL or "sqlite://"
os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-at-least-32-characters-long")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("UPLOAD_DIR", tempfile.mkdtemp(prefix="pqb-uploads-"))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.database import Base, build_engine, get_db
from app.core.security import hash_password
from app.main import create_app
from app.models import Company, User

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "correct-horse-battery"


@pytest.fixture(scope="session")
def pg_engine():
    """Session-wide PostgreSQL engine with the schema built by Alembic (only when TEST_DATABASE_URL is set)."""
    if not TEST_DATABASE_URL:
        yield None
        return
    engine = build_engine(TEST_DATABASE_URL)
    with engine.begin() as conn:
        conn.exec_driver_sql("DROP SCHEMA public CASCADE")
        conn.exec_driver_sql("CREATE SCHEMA public")
    backend_dir = Path(__file__).resolve().parents[2]
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=backend_dir, env={**os.environ, "DATABASE_URL": TEST_DATABASE_URL}, check=True,
    )
    yield engine
    engine.dispose()


@pytest.fixture()
def db_session(pg_engine):
    if pg_engine is not None:
        Session = sessionmaker(bind=pg_engine, autoflush=False, expire_on_commit=False)
        session = Session()
        try:
            yield session
        finally:
            session.rollback()
            session.close()
            tables = ", ".join(f'"{t.name}"' for t in Base.metadata.sorted_tables)
            with pg_engine.begin() as conn:
                conn.exec_driver_sql(f"TRUNCATE {tables} RESTART IDENTITY CASCADE")
        return

    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
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


@pytest.fixture()
def auth(client, admin, csrf_headers):
    """Signed-in client; returns the CSRF headers to use for unsafe requests."""
    r = client.post("/api/v1/auth/login", json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}, headers=csrf_headers)
    assert r.status_code == 200
    return csrf_headers


@pytest.fixture()
def other_company(db_session):
    """A second company with its own user, to prove records never leak across companies."""
    company = Company(name="Other Interiors", settings={})
    db_session.add(company)
    db_session.flush()
    db_session.add(User(company_id=company.id, username="other", password_hash=hash_password("another-long-password")))
    db_session.commit()
    return company
