import uuid
from decimal import Decimal

import pytest

from app.models.material import Material
from app.services.material_service import MaterialService

URL = "/api/v1/materials"


def payload(**over):
    base = {"name": "BWP Plywood", "category": "plywood", "brand": "Greenply", "specification": "18mm",
            "unit": "sheet", "cost_rate": "2500.00", "selling_rate": None, "description": ""}
    return {**base, **over}


def create(client, headers, **over):
    r = client.post(URL, json=payload(**over), headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


# ---------- auth ----------
def test_requires_authentication(client):
    assert client.get(URL).status_code == 401


def test_create_requires_csrf(client, auth):
    assert client.post(URL, json=payload()).status_code == 403


# ---------- create / read ----------
def test_create_and_get(client, auth):
    m = create(client, auth)
    assert m["name"] == "BWP Plywood" and m["category"] == "plywood" and m["is_active"] is True
    assert m["selling_rate"] is None
    got = client.get(f"{URL}/{m['id']}").json()
    assert got == m


def test_rates_are_exact_decimal_strings_with_four_places(client, auth):
    m = create(client, auth, cost_rate="0.0525", selling_rate="1234567890.1234")
    assert Decimal(m["cost_rate"]) == Decimal("0.0525")
    assert Decimal(m["selling_rate"]) == Decimal("1234567890.1234")
    assert isinstance(m["cost_rate"], str)  # never a float
    assert m["cost_rate"] == "0.0525" and create(client, auth, name="B", cost_rate="2500")["cost_rate"] == "2500.0000"


@pytest.mark.parametrize("bad", [
    {"cost_rate": "-1"}, {"cost_rate": "1.23456"}, {"cost_rate": "abc"}, {"cost_rate": "100000000000"},
    {"selling_rate": "-0.01"}, {"name": "   "}, {"unit": ""}, {"category": "metal"},
])
def test_invalid_input_is_rejected_with_field_errors(client, auth, bad):
    r = client.post(URL, json=payload(**bad), headers=auth)
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "validation_error"
    assert r.json()["error"]["fields"][0]["field"] == next(iter(bad))


def test_whitespace_is_trimmed(client, auth):
    m = create(client, auth, name="  Hinge  ", unit=" pc ", category="hardware", brand="", specification="")
    assert m["name"] == "Hinge" and m["unit"] == "pc"


def test_zero_rate_is_allowed(client, auth):
    assert Decimal(create(client, auth, cost_rate="0")["cost_rate"]) == 0


def test_unknown_id_is_404(client, auth):
    r = client.get(f"{URL}/{uuid.uuid4()}")
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_found"


# ---------- duplicates ----------
def test_duplicate_is_rejected_case_insensitively(client, auth):
    create(client, auth)
    r = client.post(URL, json=payload(name="bwp PLYWOOD", brand="GREENPLY"), headers=auth)
    assert r.status_code == 409 and r.json()["error"]["code"] == "duplicate_material"


def test_same_name_with_different_specification_or_category_is_allowed(client, auth):
    create(client, auth)
    create(client, auth, specification="12mm")
    create(client, auth, category="other")


def test_update_to_a_duplicate_is_rejected_and_leaves_data_unchanged(client, auth):
    create(client, auth)
    other = create(client, auth, specification="12mm")
    r = client.put(f"{URL}/{other['id']}", json=payload(specification="18mm"), headers=auth)
    assert r.status_code == 409
    assert client.get(f"{URL}/{other['id']}").json()["specification"] == "12mm"


# ---------- update / deactivate ----------
def test_update_changes_price_and_bumps_updated_at(client, auth):
    m = create(client, auth)
    r = client.put(f"{URL}/{m['id']}", json=payload(cost_rate="2750.50", selling_rate="3100"), headers=auth)
    assert r.status_code == 200
    body = r.json()
    assert Decimal(body["cost_rate"]) == Decimal("2750.50") and Decimal(body["selling_rate"]) == 3100
    assert body["updated_at"] >= m["updated_at"]


def test_delete_deactivates_instead_of_removing(client, auth):
    m = create(client, auth)
    r = client.delete(f"{URL}/{m['id']}", headers=auth)
    assert r.status_code == 200 and r.json()["is_active"] is False
    assert client.get(f"{URL}/{m['id']}").json()["is_active"] is False  # still readable


def test_reactivate_via_update(client, auth):
    m = create(client, auth)
    client.delete(f"{URL}/{m['id']}", headers=auth)
    r = client.put(f"{URL}/{m['id']}", json=payload(is_active=True), headers=auth)
    assert r.json()["is_active"] is True


# ---------- search / filter / sort / pagination ----------
@pytest.fixture()
def catalogue(client, auth):
    items = [
        dict(name="BWP Plywood", category="plywood", specification="18mm", unit="sheet", cost_rate="2500", brand="Greenply"),
        dict(name="BWP Plywood", category="plywood", specification="12mm", unit="sheet", cost_rate="1800", brand="Greenply"),
        dict(name="Marine Plywood", category="plywood", specification="9mm", unit="sheet", cost_rate="2100", brand="Century"),
        dict(name="Matte Laminate", category="laminate", specification="1mm", unit="sheet", cost_rate="900", brand="Merino"),
        dict(name="Soft-close Hinge", category="hardware", specification="", unit="pc", cost_rate="80", brand="Hettich"),
        dict(name="Edge band 100%", category="other", specification="22mm", unit="r.ft", cost_rate="8", brand=""),
    ]
    for i in items:
        create(client, auth, **i)
    inactive = create(client, auth, name="Old Handle", category="hardware", unit="pc", cost_rate="50", specification="")
    client.delete(f"{URL}/{inactive['id']}", headers=auth)


def names(r):
    return [i["name"] for i in r.json()["items"]]


def test_default_list_shows_all_sorted_by_name(client, catalogue):
    r = client.get(URL)
    body = r.json()
    assert body["total"] == 7 and body["page"] == 1 and body["pages"] == 1
    assert names(r) == sorted(names(r), key=str.lower)


def test_filter_by_category(client, catalogue):
    assert set(names(client.get(URL, params={"category": "hardware"}))) == {"Soft-close Hinge", "Old Handle"}


def test_filter_by_active_status(client, catalogue):
    assert "Old Handle" not in names(client.get(URL, params={"is_active": "true"}))
    assert names(client.get(URL, params={"is_active": "false"})) == ["Old Handle"]


@pytest.mark.parametrize("q,expected", [
    ("marine", {"Marine Plywood"}),
    ("HETTICH", {"Soft-close Hinge"}),        # brand, case-insensitive
    ("18mm", {"BWP Plywood"}),                # specification
    ("laminate", {"Matte Laminate"}),
    ("zzz-nothing", set()),
])
def test_search(client, catalogue, q, expected):
    assert set(names(client.get(URL, params={"q": q}))) == expected


def test_search_treats_percent_and_underscore_literally(client, catalogue):
    assert names(client.get(URL, params={"q": "100%"})) == ["Edge band 100%"]
    assert names(client.get(URL, params={"q": "%"})) == ["Edge band 100%"]  # not a wildcard
    assert names(client.get(URL, params={"q": "_"})) == []


def test_search_and_filter_combine(client, catalogue):
    r = client.get(URL, params={"q": "bwp", "category": "plywood"})
    assert r.json()["total"] == 2


def test_sort_by_cost_rate_descending(client, catalogue):
    items = client.get(URL, params={"sort": "cost_rate", "order": "desc"}).json()["items"]
    rates = [Decimal(i["cost_rate"]) for i in items]
    assert rates == sorted(rates, reverse=True)


def test_pagination(client, catalogue):
    p1 = client.get(URL, params={"page_size": 3, "page": 1}).json()
    p3 = client.get(URL, params={"page_size": 3, "page": 3}).json()
    assert (p1["total"], p1["pages"], len(p1["items"])) == (7, 3, 3)
    assert len(p3["items"]) == 1
    assert client.get(URL, params={"page_size": 3, "page": 9}).json()["items"] == []


def test_page_size_is_capped(client, auth):
    assert client.get(URL, params={"page_size": 1000}).status_code == 422


def test_invalid_sort_is_rejected(client, auth):
    assert client.get(URL, params={"sort": "password_hash"}).status_code == 422


# ---------- company isolation ----------
def test_other_companies_materials_are_invisible(client, auth, db_session, other_company):
    theirs = Material(company_id=other_company.id, name="Secret Ply", category="plywood",
                      unit="sheet", cost_rate=Decimal("1"))
    db_session.add(theirs)
    db_session.commit()

    assert "Secret Ply" not in names(client.get(URL))
    assert client.get(f"{URL}/{theirs.id}").status_code == 404
    assert client.put(f"{URL}/{theirs.id}", json=payload(), headers=auth).status_code == 404
    assert client.delete(f"{URL}/{theirs.id}", headers=auth).status_code == 404
    db_session.refresh(theirs)
    assert theirs.is_active is True


def test_same_material_may_exist_in_two_companies(client, auth, db_session, other_company):
    db_session.add(Material(company_id=other_company.id, name="BWP Plywood", category="plywood",
                            brand="Greenply", specification="18mm", unit="sheet", cost_rate=Decimal("1")))
    db_session.commit()
    create(client, auth)  # same identity, different company: allowed


# ---------- price snapshot contract ----------
def test_snapshot_is_unaffected_by_later_price_changes(client, auth, db_session, admin):
    m = create(client, auth, cost_rate="2500", selling_rate="3000")
    service = MaterialService(db_session)
    snap = service.snapshot(admin.company_id, uuid.UUID(m["id"]))
    assert (snap.name, snap.unit, snap.cost_rate, snap.selling_rate) == ("BWP Plywood", "sheet", Decimal("2500"), Decimal("3000"))

    client.put(f"{URL}/{m['id']}", json=payload(name="Renamed", unit="pc", cost_rate="9999", selling_rate="9999"), headers=auth)

    assert (snap.name, snap.unit, snap.cost_rate, snap.selling_rate) == ("BWP Plywood", "sheet", Decimal("2500"), Decimal("3000"))
    fresh = service.snapshot(admin.company_id, uuid.UUID(m["id"]))
    assert fresh.cost_rate == Decimal("9999") and fresh.name == "Renamed"


def test_snapshot_is_immutable(client, auth, db_session, admin):
    m = create(client, auth)
    snap = MaterialService(db_session).snapshot(admin.company_id, uuid.UUID(m["id"]))
    with pytest.raises(Exception):
        snap.cost_rate = Decimal("1")  # frozen model


def test_inactive_material_cannot_be_snapshotted(client, auth, db_session, admin):
    from app.core.exceptions import ConflictError
    m = create(client, auth)
    client.delete(f"{URL}/{m['id']}", headers=auth)
    with pytest.raises(ConflictError) as exc:
        MaterialService(db_session).snapshot(admin.company_id, uuid.UUID(m["id"]))
    assert exc.value.code == "material_inactive"


def test_snapshot_of_another_companys_material_is_not_found(client, auth, db_session, admin, other_company):
    from app.core.exceptions import NotFoundError
    theirs = Material(company_id=other_company.id, name="X", category="other", unit="pc", cost_rate=Decimal("1"))
    db_session.add(theirs)
    db_session.commit()
    with pytest.raises(NotFoundError):
        MaterialService(db_session).snapshot(admin.company_id, theirs.id)
