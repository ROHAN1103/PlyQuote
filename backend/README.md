# Backend

FastAPI + SQLAlchemy 2 + Alembic. Run `pytest` for tests, `alembic upgrade head` for migrations.
Routers (`app/api`) stay thin; rules live in `app/services`; DB access in `app/repositories`.
Every unsafe request under `/api/v1` requires a valid `X-CSRF-Token` (see `app/api/deps.py`).
Errors always use `{"error": {"code", "message", "fields": []}}`.
See the root README and `docs/DECISIONS.md`.
