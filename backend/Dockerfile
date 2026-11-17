FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /srv/backend

COPY requirements.txt .
RUN pip install -r requirements.txt

RUN useradd --system --uid 10001 --home /srv/backend appuser
COPY --chown=appuser:appuser . .
RUN chmod +x docker/entrypoint.sh
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=5 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2).status==200 else 1)"

ENTRYPOINT ["docker/entrypoint.sh"]
