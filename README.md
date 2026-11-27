# Plywood Furniture Quotation Builder

A quotation management and calculation system for interior-design companies that build plywood furniture.
Modular monolith: React + TypeScript frontend, FastAPI backend, PostgreSQL.

**Status: Phases 1-4 complete (foundation, materials and settings, quotation builder, calculation engine).** Roadmap: 5 Documents -> 6 History and revisions -> 7 Production readiness. See `docs/DECISIONS.md` for the agreed business rules.

## What works now
- **Three pricing methods in one quotation:** manual (quantity x rate), by measurement (feet and inches, six formulas, minimum charge, rounding) and by materials (catalogue lines, labour and other costs)
- **Profit** as markup, margin or a fixed amount, with a guard against counting it twice; **charges, discount, GST** (exclusive or inclusive) and optional round-off to the rupee
- **Quotation builder:** client and project details, multiple furniture items (add, duplicate, reorder, remove), manual pricing with live backend-calculated totals, draft saving, safe numbering (`QT-2026-0001`), unsaved-changes and two-tab protection
- **Quotations list:** search, status filter, pagination, delete drafts
- **Furniture templates:** reusable item presets, added to a quotation in one click
- **Materials:** add, edit, search, filter by category/status, deactivate/reactivate, paginate; exact decimal rates; duplicate protection
- **Settings:** company details, GSTIN, logo upload, GST (off by default), validity, payment terms, T&C, footer, signatory
- Secure sign-in/sign-out (Argon2id, server-side sessions, HTTP-only cookie, CSRF, rate limiting)
- Protected app shell with the five main sections (placeholders until their phases)
- PostgreSQL schema + Alembic migrations (`companies`, `users`, `sessions`, `login_attempts`)
- Docker Compose stack: Nginx edge proxy, frontend, backend, PostgreSQL (not exposed)
- Initial administrator script (no public registration)

## Quick start (Docker)
```sh
cp .env.example .env
#   set POSTGRES_PASSWORD (e.g. openssl rand -hex 24) and SECRET_KEY (python -c "import secrets; print(secrets.token_urlsafe(48))")
docker compose up --build -d            # migrations run automatically on backend start
docker compose exec -e ADMIN_PASSWORD='choose-a-12+-char-password' backend \
    python -m scripts.create_admin --username admin --company "Your Company"
# open http://localhost:8080

# optional: load a starter material list (rates are 0 - set real rates in Materials)
docker compose exec backend python -m scripts.seed_materials
```

## Local development (without Docker)
```sh
# backend  (needs a PostgreSQL database; copy backend/.env.example to backend/.env)
cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements-dev.txt
alembic upgrade head
python -m scripts.create_admin --username admin --company "Your Company"
uvicorn app.main:app --reload            # http://localhost:8000/api/v1/docs

# frontend (proxies /api to :8000, so cookies/CSRF behave as in production)
cd frontend && npm ci && npm run dev     # http://localhost:5173
```

## Tests
```sh
cd backend && pytest                                   # SQLite, fast
cd backend && TEST_DATABASE_URL=postgresql://user:pw@localhost:5432/pqb_test pytest   # real PostgreSQL (use a throwaway database: its schema is dropped)
cd frontend && npm test && npm run typecheck
```

## Production
1. Set `ENVIRONMENT=production`, `COOKIE_SECURE=true`, strong `POSTGRES_PASSWORD` and `SECRET_KEY` in `.env`.
2. Put `fullchain.pem` and `privkey.pem` in `./certs/`.
3. `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build` (Compose v2.24+).
4. Create the admin as above. PostgreSQL publishes no ports; only 80/443 are exposed.

Migrations run on every backend start (`alembic upgrade head`). The backend trusts `X-Forwarded-For` from the proxy only because it is reachable solely on the internal Docker network - do not publish its port.

### Backup and restore
```sh
./scripts/backup.sh                               # -> backups/pqb-<timestamp>.dump (keeps newest 30)
./scripts/restore.sh backups/pqb-<timestamp>.dump # destructive; asks for confirmation
```
Schedule `backup.sh` with cron and copy dumps off the server. `backup.sh` also archives the uploads volume (company logo); `restore.sh` accepts the uploads archive as an optional second argument.

## Layout
`backend/app/{api,core,models,schemas,repositories,services,utils,tests}` - thin routers, business rules in services.
`frontend/src/{app,components,features,store,lib}` - feature-based; API access is separate from UI.

## Known limitations
- The Docker images and Compose files were written and their Nginx configuration tested, but `docker compose up` itself has not been run in the authoring environment - run the Quick start and report anything that fails.
- Offline/PWA support is not implemented (the architecture leaves room for it).
- The JS bundle is a single chunk (~550 kB); route-level code splitting is planned for Phase 7.
- Material lines show the catalogue price they were added with; there is no "catalogue price has changed since" hint yet, and no sheet-cutting or wastage optimisation (by design for V1).
- Nothing can be finalised, sent or exported yet (Phases 5 and 6).
- A draft keeps the company details it was created with; there is no "refresh company details" action yet.
