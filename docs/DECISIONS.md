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

## Phase 3 decisions (quotation builder)

24. **Numbering.** `QT-YYYY-NNNN`, e.g. `QT-2026-0001`. The year is the year *in the business time zone* (`TIMEZONE`, default `Asia/Kolkata`), not the server's. Allocated by one atomic `UPDATE ... RETURNING` on `number_sequences` in the same transaction as the insert: concurrent saves queue and never share a number, and a failed save does not consume one. Deleted drafts leave gaps and numbers are never reused. Covered by a multi-threaded test on real PostgreSQL.
25. **Drafts are lenient.** Only the client name is required to save a draft; project, phone, address and even items can come later. Finalizing (Phase 6) will require a complete quotation.
26. **Saving replaces the whole quotation** (`PUT` with the full item list). An item that carries a known id is updated in place and keeps its identity; items without an id are created; items no longer listed are removed. List order is item order. Ids supplied for items that don't belong to the quotation are ignored.
27. **No silent overwrites.** Every save carries the `row_version` it was loaded with. A stale save is refused (`stale_quotation`), changes nothing, and the UI offers to load the latest version.
28. **Totals are never accepted from the client.** The backend engine computes item and quotation totals on every save. The builder's live figures come from the stateless `POST /calculations/preview`, which runs the same engine. The browser contains no pricing arithmetic.
29. **Company details are snapshotted** onto each quotation when it is created (name, address, phone, email, GSTIN, footer, signatory), so editing Settings never changes an existing quotation. The company's GST settings are snapshotted into `calculation_settings` for Phase 4.
30. **Only drafts are editable or deletable.** Other statuses return `quotation_not_editable` / `quotation_not_deletable`. "Expired" is derived (finalized or sent and past `valid_until`), never stored.
31. **Phase 3 prices manual items only.** The schema, tables and API already accept `measurement` and `material`; the engine refuses them with a clear message until Phase 4, and the UI shows them as "Coming soon".
32. **Furniture templates are presets, not links.** Adding one copies its values into the item; later edits or removal never affect quotations. Removal deactivates; names are unique per company (case-insensitive).
33. **Client details live on the quotation** (`client_details` JSON), with `client_name` copied into its own indexed column for searching and sorting. There is no client database.

## Phase 4 decisions (calculation engine)

34. **Amends decision 4.** Per-item `discount` and `tax` columns stay at zero. Discount and GST are applied once, at quotation level: a per-item share cannot reconcile once additional charges exist (they are taxable but are not items).
35. **The pipeline** (identical for saving, live preview and every export): item selling price (cost or quantity x rate, plus profit where it applies) -> subtotal -> + additional charges (labour, transportation, installation, miscellaneous) -> - discount (percent or fixed, on subtotal + charges) -> amount before tax -> GST -> optional round-off to the nearest rupee -> grand total.
36. **Dimensions** are stored and calculated in inches, up to 3 decimals. In the browser a length can be typed as `8'`, `6' 6"`, `66"`, `5ft 6in`, or a bare number, which means **decimal feet** (5.5 = 5' 6"). The UI echoes its interpretation under the field. Parsing is exact (scaled integers, no floating point).
37. **Measurement formulas:** front area (w x h), side area (h x d), top/bottom (w x d), square feet (l x w), all / 144; running feet (chosen length / 12); per piece; manual quantity. `quantity` multiplies identical pieces. calculated quantity (4 decimals, kept) -> raised to the minimum chargeable quantity (applied to the total after the piece count) -> rounded half-up to the chosen places (default 2) = chargeable quantity. Amount = chargeable quantity x rate. Both quantities are stored and shown.
38. **Profit.** Markup (`cost x (1 + m)`) and margin (`cost / (1 - m)`) are different: 20% markup on 1,000 sells at 1,200, 20% margin at 1,250. Margin must be below 100%; markup is capped at 1,000% as a typo guard; fixed is rupees. `rate_includes_profit` is the guard against counting profit twice: default **true** for manual and measurement items (the typed rate is a selling rate), **false** for material items (built from cost). When true, any profit rule is ignored.
39. **Material pricing.** Lines use *cost* rates; each line is rounded to the paisa before summing; labour, transportation, installation and other costs are added; profit goes on top. A material item is one "set" whose `unit_rate` is its selling price. A line keeps the name, unit and rate it was added with and is never refreshed from the catalogue. On save the catalogue is only consulted to check that a referenced material exists, belongs to this company, and (for a newly added line) is still active.
40. **GST.** Off unless enabled, and there is no default rate (it is stored as a fraction, e.g. `0.1800`). Exclusive: `tax = amount x rate`, total = amount + tax. Inclusive: `tax = amount x rate / (1 + rate)`, taxable = amount - tax, total = amount. Tax rounds half-up. The invariant `taxable + tax + rounding = grand total` holds for every quotation (tested over 1,500 random ones).
41. **Round-off** is optional per quotation, nearest rupee, half-up, applied after tax and shown as its own line.
42. **A quotation owns its settings.** Charges, discount, GST and round-off are saved with the quotation. Company defaults seed only *new* quotations; changing them later never changes a saved one. An update that omits settings leaves them unchanged.
43. **Errors name the input.** The engine reports problems as `items.2.measurement.height`, `items.0.materials.1.quantity`, `settings.gst.rate`, ...; the browser maps these onto the exact field and opens the item concerned.
44. **The live preview only prices complete items**, judged by the same validation the save uses. It reports how many items are left out, and never silently drops charges or GST that are filled in wrongly.
