# Confirmed design decisions and business rules

These were agreed before Phase 1 and are binding for later phases. Change them only by discussion.

1. **Furniture templates** are simple presets (name, default pricing method, default config). Low priority, built late in Phase 3.
2. **No double profit.** Each item has `rate_includes_profit`. Default `true` for manual and measurement items (the typed rate is a selling rate); default `false` for material-based items (cost is built up, then profit added).
3. **Calculation order** (identical everywhere): cost (materials + labour + transport + installation + other) -> profit (markup, margin or fixed) -> item selling price -> quotation discount -> taxable amount -> tax -> rounding adjustment -> grand total. In tax-inclusive mode, entered prices include tax and the engine back-calculates the taxable amount.
4. **Tax scope.** One GST rate per quotation (from company defaults, editable). Per-item `tax` stores the computed share. No hard-coded universal rate.
5. **Revisions.** `quotations` is the editable working copy. Finalizing writes an immutable row to `quotation_revisions` (JSONB snapshot + totals). "Revise" copies the latest snapshot back into a new draft revision. The number stays the same, with a display suffix (`QT-2026-0001-R2`).
6. **Statuses.** Sent / Accepted / Rejected apply to a finalized revision. **Expired** is computed on read from `valid_until` (no scheduler).
7. **Numbering.** `number_sequences` keyed by (company, year), incremented under `SELECT ... FOR UPDATE`. Deleted drafts leave gaps; that is expected.
8. **Auth.** Server-side sessions (`sessions` table, SHA-256 of the cookie token stored), HTTP-only SameSite=Lax cookie, signed double-submit CSRF token, DB-backed login rate limiting (plus an Nginx throttle). No Redis.
9. **One calculation engine.** Python only. The frontend gets live previews from a stateless `POST /calculations/preview`; TypeScript only parses feet/inches input for UX.
10. **One document source.** Preview, print and PDF share one Jinja2 HTML template rendered by the backend (Playwright -> PDF). DOCX and XLSX are built from the same `QuotationResult`.
11. **Customer view** shows item-level prices only. Material breakdown, cost and profit appear only in the internal view unless a setting enables them.
12. **Precision.** Money `NUMERIC(14,2)`, quantities/rates `NUMERIC(14,4)`, dimensions in inches `NUMERIC(10,3)`, percentages as decimal fractions. Half-up rounding at line level; tax computed on the summary.
13. **HTTPS.** Production uses Nginx with certificates you supply (e.g. Let's Encrypt). Development is plain HTTP with `COOKIE_SECURE=false`.
14. **Extra tables** beyond the original spec: `sessions`, `login_attempts` (Phase 1) and `number_sequences` (Phase 3).

## Phase 2 decisions (materials and settings)

15. **Categories are fixed** (Plywood, Laminates, Hardware, Other). Variety comes from free-text name, brand and specification (e.g. "18mm", "Matte"). Units are free text with suggestions.
16. **Identity and duplicates.** A material is identified by company + category + name + brand + specification, compared case-insensitively. Enforced by a unique index in PostgreSQL, and surfaced as a clear 409 message. Missing brand/specification are stored as empty strings so the rule is consistent.
17. **Rates.** `NUMERIC(14,4)`, never negative, zero allowed (the UI flags "Rate not set"). The API always returns rates as 4-decimal strings, never floats. Selling rate is optional.
18. **Delete means deactivate.** Inactive materials stay readable and stay on old quotations, but cannot be snapshotted into new ones (`material_inactive`).
19. **Snapshot contract (used from Phase 3).** `MaterialService.snapshot()` is the only way a quotation line reads catalogue prices. It returns a frozen copy of material id, name, unit, cost rate and selling rate. Material-based items use the **cost** rate as the line rate (profit is added afterwards, decision 2).
20. **Tax settings are opt-in.** GST is off until enabled and has no built-in rate. The rate is stored as an exact decimal fraction string (`"0.1800"`); the UI shows a percentage and converts by string arithmetic, never floats.
21. **Logo.** PNG/JPEG/WebP only (no SVG), max 2 MB. The image is decoded, validated, downscaled to 800 px and re-encoded as PNG, then stored under a server-generated name in `UPLOAD_DIR` (a Docker volume). Included in backups.
22. **Seed data is optional**: `python -m scripts.seed_materials` loads a starter list with rates of 0.
23. **Test strategy.** The backend suite runs on SQLite by default and on real PostgreSQL when `TEST_DATABASE_URL` is set (schema built by the Alembic migrations). Run both before a release.
