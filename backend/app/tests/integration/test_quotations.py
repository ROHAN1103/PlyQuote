import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import date

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models import Company, Quotation, QuotationItem
from app.schemas.quotation import QuotationIn
from app.services.quotation_service import QuotationService
from app.tests.conftest import TEST_DATABASE_URL

URL = "/api/v1/quotations"
PREVIEW = "/api/v1/calculations/preview"


def item(name="TV Unit", qty="1", rate="25000", unit="pc", **over):
    return {"item_name": name, "description": "", "quantity": qty, "unit": unit, "unit_rate": rate, **over}


def body(**over):
    base = {
        "project_name": "Sharma Residence", "project_location": "Adyar, Chennai",
        "client": {"name": "R. Sharma", "phone": "98765 43210", "email": "r@example.in", "address": "12 Lake View Road"},
        "quotation_date": "2026-11-18", "valid_until": "2026-12-18",
        "notes": "", "payment_terms": "50% advance", "terms_and_conditions": "T&C apply",
        "items": [item()],
    }
    return {**base, **over}


@pytest.fixture()
def today(monkeypatch):
    """Freeze 'today' (in the business time zone) so numbers and expiry are deterministic."""
    holder = {"d": date(2026, 11, 18)}
    monkeypatch.setattr("app.services.quotation_service.today_in", lambda tz: holder["d"])
    return holder


def create(http, headers, **over):
    r = http.post(URL, json=body(**over), headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def with_update(q, **over):
    """A PUT body built from a fetched quotation."""
    base = body(
        project_name=q["project_name"], project_location=q["project_location"], client=q["client"],
        quotation_date=q["quotation_date"], valid_until=q["valid_until"], notes=q["notes"],
        payment_terms=q["payment_terms"], terms_and_conditions=q["terms_and_conditions"],
        items=[{"id": i["id"], "item_name": i["item_name"], "description": i["description"],
                "quantity": i["quantity"], "unit": i["unit"], "unit_rate": i["unit_rate"]} for i in q["items"]],
    )
    return {**base, "row_version": q["row_version"], **over}


# ================= auth =================
def test_requires_auth_and_csrf(client, auth):
    assert client.post(URL, json=body()).status_code == 403
    client.cookies.clear()
    assert client.get(URL).status_code == 401
    assert client.get(f"{URL}/defaults").status_code == 401


# ================= defaults =================
def test_defaults_come_from_company_settings(client, auth, today, db_session, admin):
    admin.company.settings = {"quotation_validity_days": 15, "payment_terms": "30% advance", "terms_and_conditions": "Standard T&C"}
    db_session.commit()
    d = client.get(f"{URL}/defaults").json()
    assert d["quotation_date"] == "2026-11-18" and d["valid_until"] == "2026-12-03"
    assert d["payment_terms"] == "30% advance" and d["terms_and_conditions"] == "Standard T&C"
    assert d["settings"]["gst"] == {"enabled": False, "rate": None, "prices_include_tax": False}


# ================= create =================
def test_create_assigns_number_and_computes_totals(client, auth, today):
    q = create(client, auth, items=[item("TV Unit", "1", "25000"), item("Study Table", "2", "1500.50"), item("Shelf", "3", "33.3333")])
    assert q["quotation_number"] == "QT-2026-0001" and q["status"] == "draft" and q["effective_status"] == "draft"
    assert q["revision"] == 1 and q["row_version"] == 1 and q["currency"] == "INR"
    assert [i["total"] for i in q["items"]] == ["25000.00", "3001.00", "100.00"]
    assert [i["position"] for i in q["items"]] == [0, 1, 2]
    assert q["totals"] == {"subtotal": "28101.00", "additional_charges": "0.00", "discount": "0.00", "taxable_amount": "28101.00",
                           "tax_amount": "0.00", "rounding_adjustment": "0.00", "grand_total": "28101.00",
                           "material_cost": "0.00", "profit": "0.00"}
    assert q["items"][2]["unit_rate"] == "33.3333" and q["items"][2]["quantity"] == "3.0000"
    assert q["items"][0]["calculated_quantity"] == q["items"][0]["chargeable_quantity"] == "1.0000"


def test_a_draft_may_have_no_items_yet(client, auth, today):
    q = create(client, auth, items=[])
    assert q["items"] == [] and q["totals"]["grand_total"] == "0.00"


def test_client_supplied_totals_are_ignored(client, auth, today):
    r = client.post(URL, json=body(grand_total="1.00", totals={"grand_total": "1"},
                                   items=[item(total="1", amount="1")]), headers=auth)
    assert r.status_code == 201 and r.json()["totals"]["grand_total"] == "25000.00"


def test_numbers_increment_and_restart_each_year(client, auth, today):
    assert create(client, auth)["quotation_number"] == "QT-2026-0001"
    assert create(client, auth)["quotation_number"] == "QT-2026-0002"
    today["d"] = date(2027, 1, 2)
    assert create(client, auth, quotation_date="2027-01-02", valid_until="2027-02-01")["quotation_number"] == "QT-2027-0001"
    today["d"] = date(2026, 12, 31)
    assert create(client, auth)["quotation_number"] == "QT-2026-0003"


def test_the_year_comes_from_the_business_timezone_not_utc(client, auth, monkeypatch):
    # 31 Dec 2026, 23:30 UTC is already 1 Jan 2027 in India: numbering must follow India's calendar.
    from datetime import datetime, timezone
    import app.utils.dates as dates

    class FakeDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2026, 12, 31, 23, 30, tzinfo=timezone.utc).astimezone(tz)

    monkeypatch.setattr(dates, "datetime", FakeDatetime)
    q = create(client, auth, quotation_date="2027-01-01", valid_until="2027-01-31")
    assert q["quotation_number"].startswith("QT-2027-")


def test_company_details_are_snapshotted(client, auth, today):
    q = create(client, auth)
    assert q["company"]["name"] == "Test Interiors"
    cur = client.get("/api/v1/settings/company").json()
    cur.pop("id"), cur.pop("has_logo"), cur.pop("logo_version")
    client.put("/api/v1/settings/company", json={**cur, "name": "Renamed Studio"}, headers=auth)
    assert client.get(f"{URL}/{q['id']}").json()["company"]["name"] == "Test Interiors"


def test_gst_settings_are_snapshotted_for_phase_4(client, auth, today, db_session):
    q = create(client, auth)
    row = db_session.get(Quotation, uuid.UUID(q["id"]))
    assert row.calculation_settings["gst"]["enabled"] is False


@pytest.mark.parametrize("over,field", [
    ({"client": {"name": " "}}, "client.name"),
    ({"client": {"name": "A", "email": "nope"}}, "client.email"),
    ({"client": {"name": "A", "phone": "call me"}}, "client.phone"),
    ({"valid_until": "2026-11-01"}, "valid_until"),
    ({"quotation_date": "18-11-2026"}, "quotation_date"),
    ({"items": [item(qty="0")]}, "items.0.quantity"),
    ({"items": [item(qty="-2")]}, "items.0.quantity"),
    ({"items": [item(rate="-1")]}, "items.0.unit_rate"),
    ({"items": [item(rate="1.23456")]}, "items.0.unit_rate"),
    ({"items": [item(name="  ")]}, "items.0.item_name"),
    ({"items": [item()] * 201}, "items"),
])
def test_invalid_input(client, auth, today, over, field):
    r = client.post(URL, json=body(**over), headers=auth)
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"
    assert any(f["field"].startswith(field) for f in r.json()["error"]["fields"]), r.json()


def test_an_incomplete_item_is_refused_naming_the_exact_input(client, auth, today):
    r = client.post(URL, json=body(items=[item(), item(pricing_method="measurement")]), headers=auth)
    assert r.status_code == 422 and r.json()["error"]["code"] == "calculation_error"
    f = r.json()["error"]["fields"][0]
    assert f["field"] == "items.1.measurement.formula" and "how this item is measured" in f["message"]


def test_a_manual_item_needs_a_unit(client, auth, today):
    r = client.post(URL, json=body(items=[item(unit="")]), headers=auth)
    assert r.status_code == 422 and r.json()["error"]["fields"][0]["field"] == "items.0.unit"


def test_a_failed_create_does_not_consume_a_number(client, auth, today):
    client.post(URL, json=body(items=[item(qty="0")]), headers=auth)
    assert create(client, auth)["quotation_number"] == "QT-2026-0001"


# ================= read =================
def test_get_and_unknown_id(client, auth, today):
    q = create(client, auth)
    assert client.get(f"{URL}/{q['id']}").json() == q
    r = client.get(f"{URL}/{uuid.uuid4()}")
    assert r.status_code == 404 and r.json()["error"]["code"] == "quotation_not_found"


# ================= update =================
def test_update_recalculates_and_bumps_row_version(client, auth, today):
    q = create(client, auth)
    changed = with_update(q, project_name="New Name")
    changed["items"][0]["unit_rate"] = "27500"
    changed["items"][0]["quantity"] = "2"
    r = client.put(f"{URL}/{q['id']}", json=changed, headers=auth)
    assert r.status_code == 200
    u = r.json()
    assert u["project_name"] == "New Name" and u["row_version"] == 2
    assert u["items"][0]["total"] == "55000.00" and u["totals"]["grand_total"] == "55000.00"
    assert u["quotation_number"] == q["quotation_number"]


def test_items_keep_their_identity_when_reordered_edited_added_and_removed(client, auth, today, db_session):
    q = create(client, auth, items=[item("A", "1", "100"), item("B", "1", "200"), item("C", "1", "300")])
    a, b, c = (i["id"] for i in q["items"])

    reordered = with_update(q)
    reordered["items"] = [reordered["items"][2], reordered["items"][0], reordered["items"][1]]   # C, A, B
    u = client.put(f"{URL}/{q['id']}", json=reordered, headers=auth).json()
    assert [i["id"] for i in u["items"]] == [c, a, b]
    assert [i["position"] for i in u["items"]] == [0, 1, 2]

    nxt = with_update(u)
    nxt["items"] = [x for x in nxt["items"] if x["id"] != a]            # remove A
    nxt["items"][0]["item_name"] = "C edited"                            # edit C
    nxt["items"].append(item("D", "1", "400"))                           # add D (no id)
    u2 = client.put(f"{URL}/{q['id']}", json=nxt, headers=auth).json()
    assert [i["item_name"] for i in u2["items"]] == ["C edited", "B", "D"]
    assert u2["items"][0]["id"] == c and u2["items"][1]["id"] == b and u2["items"][2]["id"] not in (a, b, c)
    assert u2["totals"]["grand_total"] == "900.00"
    assert db_session.scalar(select(func.count()).select_from(QuotationItem)) == 3  # A really is gone


def test_unknown_or_foreign_item_ids_become_new_items(client, auth, today):
    q1, q2 = create(client, auth), create(client, auth)
    upd = with_update(q1)
    upd["items"].append({**item("Extra"), "id": q2["items"][0]["id"]})    # an item id belonging to another quotation
    upd["items"].append({**item("Ghost"), "id": str(uuid.uuid4())})
    u = client.put(f"{URL}/{q1['id']}", json=upd, headers=auth).json()
    ids = [i["id"] for i in u["items"]]
    assert q2["items"][0]["id"] not in ids and len(set(ids)) == 3
    assert client.get(f"{URL}/{q2['id']}").json()["items"][0]["item_name"] == "TV Unit"   # q2 untouched


def test_stale_save_is_refused_and_changes_nothing(client, auth, today):
    q = create(client, auth)
    client.put(f"{URL}/{q['id']}", json=with_update(q, project_name="Tab A"), headers=auth)
    r = client.put(f"{URL}/{q['id']}", json=with_update(q, project_name="Tab B"), headers=auth)   # still version 1
    assert r.status_code == 409 and r.json()["error"]["code"] == "stale_quotation"
    assert client.get(f"{URL}/{q['id']}").json()["project_name"] == "Tab A"


def test_only_drafts_can_be_edited_or_deleted(client, auth, today, db_session):
    q = create(client, auth)
    row = db_session.get(Quotation, uuid.UUID(q["id"]))
    row.status = "finalized"
    db_session.commit()
    r = client.put(f"{URL}/{q['id']}", json=with_update(q), headers=auth)
    assert r.status_code == 409 and r.json()["error"]["code"] == "quotation_not_editable"
    r = client.delete(f"{URL}/{q['id']}", headers=auth)
    assert r.status_code == 409 and r.json()["error"]["code"] == "quotation_not_deletable"
    assert client.get(f"{URL}/{q['id']}").status_code == 200


def test_invalid_update_leaves_the_quotation_unchanged(client, auth, today):
    q = create(client, auth)
    bad = with_update(q)
    bad["items"].append(item(pricing_method="measurement"))   # no measurement block: cannot be priced
    assert client.put(f"{URL}/{q['id']}", json=bad, headers=auth).status_code == 422
    after = client.get(f"{URL}/{q['id']}").json()
    assert after["row_version"] == 1 and len(after["items"]) == 1


# ================= delete =================
def test_delete_draft_removes_it_and_its_items_but_not_its_number(client, auth, today, db_session):
    q = create(client, auth)
    assert client.delete(f"{URL}/{q['id']}", headers=auth).status_code == 204
    assert client.get(f"{URL}/{q['id']}").status_code == 404
    assert db_session.scalar(select(func.count()).select_from(QuotationItem)) == 0
    assert create(client, auth)["quotation_number"] == "QT-2026-0002"    # numbers are never reused


# ================= list / search / filter =================
@pytest.fixture()
def book(client, auth, today, db_session):
    rows = [
        ("Sharma Residence", "R. Sharma", "2026-10-05", "1000"),
        ("Iyer Villa", "S. Iyer", "2026-10-20", "5000"),
        ("Office Fitout", "Brightline Pvt Ltd", "2026-11-10", "3000"),
        ("Kitchen 100%", "A. Khan", "2026-11-15", "2000"),
    ]
    made = []
    for project, who, d, rate in rows:
        made.append(create(client, auth, project_name=project, client={"name": who}, quotation_date=d,
                           valid_until="2026-12-31", items=[item("X", "1", rate)]))
    return made


def numbers(r):
    return [i["quotation_number"] for i in r.json()["items"]]


def test_list_defaults_to_newest_first_with_summary_fields(client, book):
    r = client.get(URL)
    assert r.json()["total"] == 4 and numbers(r) == ["QT-2026-0004", "QT-2026-0003", "QT-2026-0002", "QT-2026-0001"]
    first = r.json()["items"][0]
    assert set(first) == {"id", "quotation_number", "status", "effective_status", "project_name", "client_name",
                          "quotation_date", "valid_until", "grand_total", "revision", "updated_at"}
    assert first["grand_total"] == "2000.00"


@pytest.mark.parametrize("q,expected", [
    ("0002", ["QT-2026-0002"]), ("iyer", ["QT-2026-0002"]), ("BRIGHTLINE", ["QT-2026-0003"]),
    ("residence", ["QT-2026-0001"]), ("zzz", []), ("100%", ["QT-2026-0004"]), ("%", ["QT-2026-0004"]), ("_", []),
])
def test_search(client, book, q, expected):
    assert numbers(client.get(URL, params={"q": q})) == expected


def test_date_range_filter(client, book):
    r = client.get(URL, params={"date_from": "2026-10-20", "date_to": "2026-11-10"})
    assert sorted(numbers(r)) == ["QT-2026-0002", "QT-2026-0003"]


def test_status_filter_including_derived_expiry(client, book, today, db_session):
    rows = {r.quotation_number: r for r in db_session.scalars(select(Quotation))}
    rows["QT-2026-0001"].status, rows["QT-2026-0001"].valid_until = "sent", date(2026, 11, 1)        # past validity
    rows["QT-2026-0002"].status = "accepted"
    rows["QT-2026-0003"].status = "finalized"                                                         # still valid
    db_session.commit()
    assert numbers(client.get(URL, params={"status": "draft"})) == ["QT-2026-0004"]
    assert numbers(client.get(URL, params={"status": "expired"})) == ["QT-2026-0001"]
    assert numbers(client.get(URL, params={"status": "sent"})) == []          # the sent one is expired, not 'sent'
    assert numbers(client.get(URL, params={"status": "finalized"})) == ["QT-2026-0003"]
    assert numbers(client.get(URL, params={"status": "accepted"})) == ["QT-2026-0002"]
    got = client.get(f"{URL}/{[b for b in book if b['quotation_number'] == 'QT-2026-0001'][0]['id']}").json()
    assert got["status"] == "sent" and got["effective_status"] == "expired"


def test_sort_and_pagination(client, book):
    r = client.get(URL, params={"sort": "grand_total", "order": "desc", "page_size": 3})
    assert [i["grand_total"] for i in r.json()["items"]] == ["5000.00", "3000.00", "2000.00"]
    assert (r.json()["pages"], r.json()["total"]) == (2, 4)
    assert len(client.get(URL, params={"page_size": 3, "page": 2}).json()["items"]) == 1


def test_bad_list_params(client, auth):
    assert client.get(URL, params={"sort": "company_snapshot"}).status_code == 422
    assert client.get(URL, params={"status": "bogus"}).status_code == 422
    assert client.get(URL, params={"page_size": 500}).status_code == 422


# ================= company isolation =================
def test_other_companies_quotations_are_invisible(client, auth, today, db_session, other_company):
    from decimal import Decimal
    theirs = Quotation(company_id=other_company.id, quotation_number="QT-2026-0001", client_name="Secret Client",
                       client_details={"name": "Secret Client"}, company_snapshot={}, quotation_date=date(2026, 11, 1),
                       valid_until=date(2026, 12, 1), grand_total=Decimal("1"))
    db_session.add(theirs)
    db_session.commit()
    mine = create(client, auth)
    assert numbers(client.get(URL)) == [mine["quotation_number"]]          # same number, different company: allowed
    assert client.get(f"{URL}/{theirs.id}").status_code == 404
    assert client.put(f"{URL}/{theirs.id}", json=with_update(mine), headers=auth).status_code == 404
    assert client.delete(f"{URL}/{theirs.id}", headers=auth).status_code == 404
    assert db_session.get(Quotation, theirs.id) is not None


def test_numbering_is_independent_per_company(client, auth, today, db_session, other_company):
    svc = QuotationService(db_session, get_settings())
    other = svc.create(other_company.id, QuotationIn.model_validate(body()))
    mine = create(client, auth)
    assert other.quotation_number == mine["quotation_number"] == "QT-2026-0001"


# ================= preview =================
def test_preview_matches_what_saving_stores(client, auth, today):
    items = [item("TV Unit", "1", "25000"), item("Shelf", "3", "33.3333")]
    p = client.post(PREVIEW, json={"items": items}, headers=auth)
    assert p.status_code == 200
    saved = create(client, auth, items=items)
    assert p.json()["totals"] == saved["totals"]
    assert [i["total"] for i in p.json()["items"]] == [i["total"] for i in saved["items"]]
    assert p.json()["items"][1]["chargeable_quantity"] == "3.0000"


def test_preview_with_no_items_and_with_bad_items(client, auth):
    assert client.post(PREVIEW, json={"items": []}, headers=auth).json()["totals"]["grand_total"] == "0.00"
    assert client.post(PREVIEW, json={"items": [item(qty="0")]}, headers=auth).status_code == 422
    assert client.post(PREVIEW, json={"items": [item(pricing_method="material")]}, headers=auth).status_code == 422   # no materials


def test_preview_stores_nothing_and_needs_auth_and_csrf(client, auth, db_session):
    client.post(PREVIEW, json={"items": [item()]}, headers=auth)
    assert db_session.scalar(select(func.count()).select_from(Quotation)) == 0
    assert client.post(PREVIEW, json={"items": []}).status_code == 403


# ================= concurrency (needs real row locking) =================
@pytest.mark.skipif(not TEST_DATABASE_URL, reason="row-level locking needs PostgreSQL (set TEST_DATABASE_URL)")
def test_concurrent_saves_never_receive_the_same_number(pg_engine, admin):
    """8 workers create 40 quotations at once, starting from an empty sequence (so they also race to
    create the sequence row). Every number must be unique and the run must have no gaps."""
    Session = sessionmaker(bind=pg_engine, autoflush=False, expire_on_commit=False)
    company_id = admin.company_id
    data = QuotationIn.model_validate(body())

    def worker(count: int) -> list[str]:
        out = []
        with Session() as s:
            svc = QuotationService(s, get_settings())
            for _ in range(count):
                out.append(svc.create(company_id, data).quotation_number)
        return out

    with ThreadPoolExecutor(max_workers=8) as pool:
        batches = list(pool.map(worker, [5] * 8))
    numbers_made = [n for batch in batches for n in batch]
    assert len(numbers_made) == len(set(numbers_made)) == 40
    assert sorted(int(n.rsplit("-", 1)[1]) for n in numbers_made) == list(range(1, 41))
