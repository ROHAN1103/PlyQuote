import uuid

import pytest

URL = "/api/v1/furniture-templates"


def tpl(**over):
    base = {"name": "TV Unit", "description": "Wall-mounted TV unit", "default_pricing_method": "manual",
            "default_config": {"unit": "pc", "quantity": "1", "unit_rate": "25000"}}
    return {**base, **over}


def create(client, headers, **over):
    r = client.post(URL, json=tpl(**over), headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def test_requires_auth_and_csrf(client, auth):
    assert client.post(URL, json=tpl()).status_code == 403
    client.cookies.clear()
    assert client.get(URL).status_code == 401


def test_create_and_list_alphabetically_with_fixed_precision(client, auth):
    create(client, auth)
    create(client, auth, name="bed", default_config={"unit": "set", "quantity": "2", "unit_rate": "0.5"})
    items = client.get(URL).json()
    assert [t["name"] for t in items] == ["bed", "TV Unit"]
    assert items[1]["default_config"] == {"unit": "pc", "quantity": "1.0000", "unit_rate": "25000.0000"}
    assert items[0]["default_config"]["unit_rate"] == "0.5000" and items[0]["is_active"] is True


def test_defaults_when_config_omitted(client, auth):
    t = create(client, auth, default_config={})
    assert t["default_config"] == {"unit": "pc", "quantity": "1.0000", "unit_rate": "0.0000"}


def test_duplicate_names_are_refused_case_insensitively(client, auth):
    create(client, auth)
    r = client.post(URL, json=tpl(name="tv UNIT"), headers=auth)
    assert r.status_code == 409 and r.json()["error"]["code"] == "duplicate_template"


@pytest.mark.parametrize("over,field", [
    ({"name": " "}, "name"),
    ({"default_pricing_method": "measurement"}, "default_pricing_method"),
    ({"default_config": {"quantity": "0"}}, "default_config.quantity"),
    ({"default_config": {"unit_rate": "-1"}}, "default_config.unit_rate"),
    ({"default_config": {"unit": ""}}, "default_config.unit"),
])
def test_invalid_templates(client, auth, over, field):
    r = client.post(URL, json=tpl(**over), headers=auth)
    assert r.status_code == 422 and any(f["field"].startswith(field) for f in r.json()["error"]["fields"])


def test_update(client, auth):
    t = create(client, auth)
    r = client.put(f"{URL}/{t['id']}", json=tpl(name="TV Unit (large)", default_config={"unit": "pc", "quantity": "1", "unit_rate": "32000"}), headers=auth)
    assert r.status_code == 200 and r.json()["name"] == "TV Unit (large)" and r.json()["default_config"]["unit_rate"] == "32000.0000"


def test_update_to_a_duplicate_name_is_refused(client, auth):
    create(client, auth)
    other = create(client, auth, name="Bed")
    assert client.put(f"{URL}/{other['id']}", json=tpl(name="TV Unit"), headers=auth).status_code == 409


def test_delete_deactivates_and_hides(client, auth):
    t = create(client, auth)
    r = client.delete(f"{URL}/{t['id']}", headers=auth)
    assert r.status_code == 200 and r.json()["is_active"] is False
    assert client.get(URL).json() == []
    assert [x["id"] for x in client.get(URL, params={"include_inactive": "true"}).json()] == [t["id"]]


def test_unknown_id_404(client, auth):
    assert client.put(f"{URL}/{uuid.uuid4()}", json=tpl(), headers=auth).status_code == 404
    assert client.delete(f"{URL}/{uuid.uuid4()}", headers=auth).status_code == 404


def test_company_isolation(client, auth, db_session, other_company):
    from app.models import FurnitureTemplate
    theirs = FurnitureTemplate(company_id=other_company.id, name="Secret", default_config={})
    db_session.add(theirs)
    db_session.commit()
    assert client.get(URL).json() == []
    assert client.put(f"{URL}/{theirs.id}", json=tpl(), headers=auth).status_code == 404
    assert client.delete(f"{URL}/{theirs.id}", headers=auth).status_code == 404
    create(client, auth, name="Secret")   # the same name in another company is fine
