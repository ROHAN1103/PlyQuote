#!/bin/sh
set -e
# Apply database migrations, then start the API. Behind Nginx, trust X-Forwarded-* so the
# login rate limiter sees the real client IP.
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 \
  --proxy-headers --forwarded-allow-ips="*" --workers "${WEB_CONCURRENCY:-2}"
