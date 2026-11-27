"""Measurement and material pricing, profit, charges, discount, GST and rounding through the real API."""
import uuid
from datetime import date
from decimal import Decimal as D

import pytest
from sqlalchemy import func, select

from app.models import ItemMaterial, Material, Quotation, QuotationItem

URL = "/api/v1/quotations"
PREVIEW = "/api/v1/calculations/preview"
MATERIALS = "/api/v1/materials"


@pytest.fixture(autouse=True)
def _today(monkeypatch):
    monkeypatch.setattr("app.services.quotation_service.today_in", lambda tz: date(2026, 11, 18))


def header(**over):
    return {"project_name": "P", "client": {"name": "R. Sharma"}, "quotation_date": "2026-11-18", "valid_until": "2026-12-18", **over}


def manual(name="TV Unit", rate="25000", qty="1", **over):
    return {"item_name": name, "quantity": qty, "unit": "pc", "unit_rate": rate, **over}


def measured(name="Wardrobe", formula="front_area", rate="1200", qty="1", unit="", **m):
    return {"item_name": name, "pricing_method": "measurement", "quantity": qty, "unit": unit, "unit_rate": rate,
            "measurement": {"formula": formula, **m}}


def line(name, qty, rate, unit="sheet", **over):
    return {"name": name, "quantity": qty, "unit": unit, "rate": rate, **over}


KITCHEN_LINES = [line("18mm Plywood", "5", "2500"), line("Laminate", "5", "900"), line("Hinge", "8", "80", "pc"), line("Handle", "4", "150", "pc")]


def material(name="Kitchen", lines=None, **over):
    return {"item_name": name, "pricing_method": "material", "materials": KITCHEN_LINES if lines is None else lines, **over}


def create(client, headers, items, settings=None, **over):
    payload = header(items=items, **over)
    if settings is not None:
        payload["settings"] = settings
    r = client.post(URL, json=payload, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def put(client, headers, q, **over):
    r = client.put(f"{URL}/{q['id']}", json={**as_payload(q), **over}, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def as_payload(q):
    """The PUT body for an unchanged quotation, rebuilt from its GET response (what the browser does)."""
    items = []
    for i in q["items"]:
        e = {"id": i["id"], "pricing_method": i["pricing_method"], "item_name": i["item_name"], "description": i["description"],
             "quantity": i["quantity"], "unit": i["unit"] if i["pricing_method"] != "material" else "",
             "unit_rate": None if i["pricing_method"] == "material" else i["unit_rate"], "measurement": i["measurement"],
             "materials": [{"id": m["id"], "material_id": m["material_id"], "name": m["name"], "description": m["description"],
                            "unit": m["unit"], "quantity": m["quantity"], "rate": m["rate"]} for m in i["materials"]],
             "extra_costs": i["extra_costs"], "profit_rule": i["profit_rule"], "rate_includes_profit": i["rate_includes_profit"]}
        items.append(e)
    return {"project_name": q["project_name"], "project_location": q["project_location"], "client": q["client"],
            "quotation_date": q["quotation_date"], "valid_until": q["valid_until"], "notes": q["notes"],
            "payment_terms": q["payment_terms"], "terms_and_conditions": q["terms_and_conditions"], "items": items,
            "settings": q["settings"], "row_version": q["row_version"]}


def error_field(r):
    return r.json()["error"]["fields"][0]["field"]


# ================= measurement =================
def test_wardrobe_from_the_specification(client, auth):
    q = create(client, auth, [measured(width="96", height="84")])          # 8 ft x 7 ft in inches
    i = q["items"][0]
    assert (i["total"], i["unit"], i["pricing_method"]) == ("67200.00", "sq.ft", "measurement")
    assert (i["calculated_quantity"], i["chargeable_quantity"], i["unit_rate"]) == ("56.0000", "56.0000", "1200.0000")
    assert q["totals"]["grand_total"] == "67200.00"


def test_measurements_round_trip_in_inches_with_the_entered_quantity(client, auth):
    q = create(client, auth, [measured(qty="2", width="30.125", height="40", rounding_places=3)])
    i = client.get(f"{URL}/{q['id']}").json()["items"][0]
    assert i["quantity"] == "2.0000"                         # pieces as entered, not the chargeable area
    assert i["measurement"] == {"formula": "front_area", "width": "30.125", "height": "40.000", "depth": None, "length": None,
                                "running_dimension": "width", "minimum_quantity": None, "rounding_places": 3}
    assert i["calculated_quantity"] == "16.7361"             # 2 x 30.125 x 40 / 144 = 16.73611...
    assert i["chargeable_quantity"] == "16.7360"             # rounded to the 3 places asked for (16.736)
    assert i["total"] == "20083.20"                          # 16.736 x 1200


def test_minimum_chargeable_quantity_is_visible_not_hidden(client, auth):
    i = create(client, auth, [measured(width="42", height="12", minimum_quantity="10")])["items"][0]
    assert (i["calculated_quantity"], i["chargeable_quantity"], i["total"]) == ("3.5000", "10.0000", "12000.00")


@pytest.mark.parametrize("formula,dims,qty_expected,unit", [
    ("side_area", dict(height="84", depth="24"), "14.0000", "sq.ft"),
    ("top_bottom_area", dict(width="96", depth="24"), "16.0000", "sq.ft"),
    ("square_feet", dict(length="120", width="48"), "40.0000", "sq.ft"),
    ("running_feet", dict(width="96"), "8.0000", "r.ft"),
    ("piece", {}, "1.0000", "pc"),
])
def test_other_formulas(client, auth, formula, dims, qty_expected, unit):
    i = create(client, auth, [measured(formula=formula, **dims)])["items"][0]
    assert (i["chargeable_quantity"], i["unit"]) == (qty_expected, unit)


def test_manual_quantity_formula_keeps_its_unit(client, auth):
    i = create(client, auth, [measured(formula="manual_quantity", qty="12.5", rate="80", unit="ft")])["items"][0]
    assert (i["unit"], i["total"]) == ("ft", "1000.00")


@pytest.mark.parametrize("m,field,text", [
    (dict(formula="front_area", width="96"), "items.0.measurement.height", "Enter the height"),
    (dict(formula="front_area"), "items.0.measurement.width", "Enter the width and height"),
    (dict(formula="running_feet", running_dimension="length"), "items.0.measurement.length", "Enter the length"),
])
def test_missing_measurements_are_named(client, auth, m, field, text):
    r = client.post(URL, json=header(items=[{"item_name": "X", "pricing_method": "measurement", "quantity": "1", "unit_rate": "1", "measurement": m}]), headers=auth)
    assert r.status_code == 422 and r.json()["error"]["code"] == "calculation_error"
    assert error_field(r) == field and text in r.json()["error"]["message"]


@pytest.mark.parametrize("dims", [dict(width="96.1234"), dict(width="-5"), dict(width="0"), dict(width="abc")])
def test_malformed_dimensions_fail_validation(client, auth, dims):
    r = client.post(URL, json=header(items=[measured(height="84", **dims)]), headers=auth)
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"
    assert error_field(r) == "items.0.measurement.width"


# ================= material pricing & the catalogue snapshot =================
def test_spec_example_kitchen_materials(client, auth):
    i = create(client, auth, [material()])["items"][0]
    assert [m["amount"] for m in i["materials"]] == ["12500.00", "4500.00", "640.00", "600.00"]
    assert (i["material_cost"], i["total"], i["profit"]) == ("18240.00", "18240.00", "0.00")
    assert (i["quantity"], i["chargeable_quantity"], i["unit"]) == (None, "1.0000", "set")


def test_extra_costs_and_markup(client, auth):
    q = create(client, auth, [material(extra_costs={"labour": "3000", "transportation": "500", "installation": "1000", "other": "250.50"},
                                        profit_rule={"type": "markup", "value": "0.20"})])
    i = q["items"][0]
    assert (i["labour_cost"], i["additional_cost"], i["profit"], i["total"]) == ("3000.00", "1750.50", "4598.10", "27588.60")
    assert i["unit_rate"] == "27588.6000" and i["rate_includes_profit"] is False
    assert q["totals"]["material_cost"] == "18240.00" and q["totals"]["profit"] == "4598.10"


def test_markup_and_margin_through_the_api(client, auth):
    r = client.post(PREVIEW, json={"items": [material(lines=[line("X", "1", "1000")], profit_rule={"type": "markup", "value": "0.20"}),
                                              material(lines=[line("X", "1", "1000")], profit_rule={"type": "margin", "value": "0.20"})]}, headers=auth)
    assert [i["total"] for i in r.json()["items"]] == ["1200.00", "1250.00"]


def test_profit_is_never_added_twice(client, auth):
    items = client.post(PREVIEW, json={"items": [
        material(lines=[line("X", "1", "1000")], profit_rule={"type": "markup", "value": "0.20"}, rate_includes_profit=True),   # rate already a selling rate
        manual(rate="1000", profit_rule={"type": "markup", "value": "0.20"}),                                                    # manual default: selling rate
        manual(rate="1000", profit_rule={"type": "markup", "value": "0.20"}, rate_includes_profit=False),                       # explicitly a cost rate
    ]}, headers=auth).json()["items"]
    assert [i["total"] for i in items] == ["1000.00", "1000.00", "1200.00"]


@pytest.fixture()
def ply(client, auth):
    r = client.post(MATERIALS, json={"name": "BWP Plywood", "category": "plywood", "specification": "18mm", "unit": "sheet", "cost_rate": "2500"}, headers=auth)
    return r.json()


def test_catalogue_edits_never_change_saved_quotations(client, auth, ply):
    """The critical business rule: a quotation keeps the name, unit and rate it was priced with."""
    q = create(client, auth, [material(lines=[line("BWP Plywood", "5", "2500", material_id=ply["id"])])])
    assert q["items"][0]["total"] == "12500.00"

    client.put(f"{MATERIALS}/{ply['id']}", json={"name": "Renamed Ply", "category": "plywood", "specification": "18mm", "unit": "pc", "cost_rate": "9999", "is_active": True}, headers=auth)

    now = client.get(f"{URL}/{q['id']}").json()
    assert now["items"][0]["total"] == "12500.00"
    assert now["items"][0]["materials"][0] | {} == q["items"][0]["materials"][0]            # name, unit, rate, amount all unchanged
    assert now["items"][0]["materials"][0]["name"] == "BWP Plywood" and now["items"][0]["materials"][0]["rate"] == "2500.0000"

    saved_again = put(client, auth, now, project_name="Edited")                                # re-saving does not re-read the catalogue
    assert saved_again["items"][0]["materials"][0]["rate"] == "2500.0000" and saved_again["totals"]["grand_total"] == "12500.00"


def test_the_material_link_is_kept_but_the_price_is_not_live(client, auth, ply):
    q = create(client, auth, [material(lines=[line("BWP Plywood", "1", "2500", material_id=ply["id"])])])
    assert q["items"][0]["materials"][0]["material_id"] == ply["id"]


def test_an_inactive_material_cannot_be_added_but_an_existing_line_keeps_working(client, auth, ply):
    q = create(client, auth, [material(lines=[line("BWP Plywood", "2", "2500", material_id=ply["id"])])])
    client.delete(f"{MATERIALS}/{ply['id']}", headers=auth)                                    # deactivate

    q = put(client, auth, q, project_name="still fine")                                       # existing line: allowed
    assert q["totals"]["grand_total"] == "5000.00"

    p = as_payload(q)
    p["items"][0]["materials"].append(line("BWP Plywood", "1", "2500", material_id=ply["id"]))      # NEW line: refused
    r = client.put(f"{URL}/{q['id']}", json=p, headers=auth)
    assert r.status_code == 422 and r.json()["error"]["code"] == "material_inactive"
    assert error_field(r) == "items.0.materials.1.material_id" and "Reactivate" in r.json()["error"]["message"]


def test_materials_from_another_company_or_unknown_ids_are_refused(client, auth, db_session, other_company):
    theirs = Material(company_id=other_company.id, name="Secret", category="other", unit="pc", cost_rate=D("1"))
    db_session.add(theirs)
    db_session.commit()
    for mid in (theirs.id, uuid.uuid4()):
        r = client.post(URL, json=header(items=[material(lines=[line("X", "1", "1", material_id=str(mid))])]), headers=auth)
        assert r.status_code == 422 and r.json()["error"]["code"] == "unknown_material"
        assert error_field(r) == "items.0.materials.0.material_id"


def test_custom_lines_need_no_catalogue_entry(client, auth):
    assert create(client, auth, [material(lines=[line("Special veneer", "2", "750.50")])])["items"][0]["total"] == "1501.00"


def test_lines_keep_identity_when_reordered_edited_and_removed(client, auth):
    q = create(client, auth, [material()])
    ids = [m["id"] for m in q["items"][0]["materials"]]
    p = as_payload(q)
    lines = p["items"][0]["materials"]
    p["items"][0]["materials"] = [lines[3], lines[0], {**lines[1], "quantity": "10"}]       # reorder, edit, drop the hinge
    u = client.put(f"{URL}/{q['id']}", json=p, headers=auth).json()["items"][0]["materials"]
    assert [m["id"] for m in u] == [ids[3], ids[0], ids[1]] and [m["amount"] for m in u] == ["600.00", "12500.00", "9000.00"]


def test_switching_an_item_from_material_to_manual_removes_its_lines(client, auth, db_session):
    q = create(client, auth, [material()])
    p = as_payload(q)
    p["items"][0] = {**manual("Kitchen", "50000"), "id": q["items"][0]["id"]}
    u = client.put(f"{URL}/{q['id']}", json=p, headers=auth).json()
    assert u["items"][0]["id"] == q["items"][0]["id"] and u["items"][0]["materials"] == [] and u["totals"]["grand_total"] == "50000.00"
    assert db_session.scalar(select(func.count()).select_from(ItemMaterial)) == 0


def test_material_item_errors_name_the_line(client, auth):
    r = client.post(URL, json=header(items=[material(lines=[])]), headers=auth)
    assert r.status_code == 422 and error_field(r) == "items.0.materials" and "at least one material" in r.json()["error"]["message"]
    r = client.post(URL, json=header(items=[material(lines=[line("A", "1", "1"), line("B", "0", "1")])]), headers=auth)
    assert r.status_code == 422                                                    # quantity must be > 0 (schema level)
    assert error_field(r) == "items.0.materials.1.quantity"


def test_at_most_100_lines_per_item(client, auth):
    r = client.post(URL, json=header(items=[material(lines=[line("A", "1", "1")] * 101)]), headers=auth)
    assert r.status_code == 422


# ================= quotation-level pipeline =================
MIXED = [measured(width="96", height="84"), material(extra_costs={"labour": "5000"}, profit_rule={"type": "markup", "value": "0.20"}), manual()]


def test_mixed_quotation_with_charges_discount_and_gst(client, auth):
    """67,200 + 27,888 + 25,000 = 120,088 ; + 2,000 transport = 122,088 ; 5% off = 6,104.40 -> 115,983.60 ;
    GST 18% = 20,877.05 ; total 136,860.65."""
    settings = {"charges": {"transportation": "2000"}, "discount": {"type": "percent", "value": "0.05"},
                "gst": {"enabled": True, "rate": "0.18", "prices_include_tax": False}}
    q = create(client, auth, MIXED, settings)
    assert [i["total"] for i in q["items"]] == ["67200.00", "27888.00", "25000.00"]
    assert q["totals"] == {"subtotal": "120088.00", "additional_charges": "2000.00", "discount": "6104.40", "taxable_amount": "115983.60",
                           "tax_amount": "20877.05", "rounding_adjustment": "0.00", "grand_total": "136860.65",
                           "material_cost": "18240.00", "profit": "4648.00"}
    assert q["settings"]["gst"] == {"enabled": True, "rate": "0.1800", "prices_include_tax": False}
    assert all(i["discount"] == "0.00" and i["tax"] == "0.00" for i in q["items"])      # discount and GST are quotation-level


def test_tax_inclusive_prices(client, auth):
    q = create(client, auth, [manual(rate="11800")], {"gst": {"enabled": True, "rate": "0.18", "prices_include_tax": True}})
    assert (q["totals"]["grand_total"], q["totals"]["tax_amount"], q["totals"]["taxable_amount"]) == ("11800.00", "1800.00", "10000.00")


def test_round_to_the_rupee(client, auth):
    s = {"discount": {"type": "percent", "value": "0.05"}, "round_to_rupee": True, "gst": {"enabled": True, "rate": "0.18"}, "charges": {"transportation": "2000"}}
    t = create(client, auth, MIXED, s)["totals"]
    assert (t["grand_total"], t["rounding_adjustment"]) == ("136861.00", "0.35")


def test_fixed_discount(client, auth):
    assert create(client, auth, [manual(rate="1000")], {"discount": {"type": "fixed", "value": "250.50"}})["totals"]["grand_total"] == "749.50"


def test_new_quotations_start_from_the_company_gst_settings(client, auth, db_session, admin):
    admin.company.settings = {"gst": {"enabled": True, "rate": "0.18", "prices_include_tax": False}}
    db_session.commit()
    assert client.get(f"{URL}/defaults").json()["settings"]["gst"]["rate"] == "0.1800"
    q = create(client, auth, [manual(rate="1000")])                                  # no settings sent
    assert (q["totals"]["tax_amount"], q["totals"]["grand_total"]) == ("180.00", "1180.00")


def test_a_saved_quotation_keeps_its_settings_when_company_settings_change(client, auth, db_session, admin):
    q = create(client, auth, [manual(rate="1000")], {"gst": {"enabled": True, "rate": "0.05"}})
    admin.company.settings = {"gst": {"enabled": True, "rate": "0.28"}}
    db_session.commit()
    again = put(client, auth, client.get(f"{URL}/{q['id']}").json(), notes="x")
    assert again["settings"]["gst"]["rate"] == "0.0500" and again["totals"]["tax_amount"] == "50.00"


def test_update_without_settings_leaves_them_alone(client, auth):
    q = create(client, auth, [manual(rate="1000")], {"charges": {"labour": "100"}})
    p = as_payload(q)
    del p["settings"]
    u = client.put(f"{URL}/{q['id']}", json=p, headers=auth).json()
    assert u["settings"]["charges"]["labour"] == "100.00" and u["totals"]["grand_total"] == "1100.00"


@pytest.mark.parametrize("settings,field,text", [
    ({"gst": {"enabled": True}}, "settings.gst.rate", "GST rate"),
    ({"discount": {"type": "fixed", "value": "999999"}}, "settings.discount.value", "more than the subtotal"),
    ({"discount": {"type": "percent", "value": "1.5"}}, "settings.discount.value", "more than 100%"),
    ({"discount": {"type": "percent", "value": "1"}}, None, None),                      # 100% is allowed
])
def test_settings_problems_are_reported_on_the_setting(client, auth, settings, field, text):
    r = client.post(URL, json=header(items=[manual(rate="1000")], settings=settings), headers=auth)
    if field is None:
        assert r.status_code == 201 and r.json()["totals"]["grand_total"] == "0.00"
    else:
        assert r.status_code == 422 and error_field(r) == field and text in r.json()["error"]["message"]


@pytest.mark.parametrize("settings", [{"gst": {"enabled": True, "rate": "18"}},
                                       {"charges": {"labour": "-1"}}, {"discount": {"type": "bogus"}}])
def test_malformed_settings_fail_validation(client, auth, settings):
    r = client.post(URL, json=header(items=[manual()], settings=settings), headers=auth)
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"


def test_margin_of_100_percent_is_refused_on_the_item(client, auth):
    r = client.post(URL, json=header(items=[material(profit_rule={"type": "margin", "value": "1"})]), headers=auth)
    assert r.status_code == 422 and error_field(r) == "items.0.profit_rule.value" and "below 100%" in r.json()["error"]["message"]


# ================= preview = save, always =================
def test_preview_and_save_agree_to_the_paisa(client, auth):
    settings = {"charges": {"labour": "333.33", "miscellaneous": "0.07"}, "discount": {"type": "percent", "value": "0.0725"},
                "gst": {"enabled": True, "rate": "0.18", "prices_include_tax": True}, "round_to_rupee": True}
    p = client.post(PREVIEW, json={"items": MIXED, "settings": settings}, headers=auth).json()
    q = create(client, auth, MIXED, settings)
    assert p["totals"] == q["totals"]
    assert [i["total"] for i in p["items"]] == [i["total"] for i in q["items"]]
    assert p["items"][1]["line_amounts"] == ["12500.00", "4500.00", "640.00", "600.00"]


def test_preview_reports_the_same_errors(client, auth):
    r = client.post(PREVIEW, json={"items": [measured(width="96")], "settings": {}}, headers=auth)
    assert r.status_code == 422 and error_field(r) == "items.0.measurement.height"
    r = client.post(PREVIEW, json={"items": [manual()], "settings": {"gst": {"enabled": True}}}, headers=auth)
    assert r.status_code == 422 and error_field(r) == "settings.gst.rate"


# ================= storage: reading old data, and exact figures =================
def test_phase_3_quotations_without_pricing_config_still_load(client, auth, db_session, admin):
    q = Quotation(company_id=admin.company_id, quotation_number="QT-2026-0001", client_name="Old", client_details={"name": "Old"},
                  company_snapshot={}, calculation_settings={"gst": {"enabled": False, "rate": None, "prices_include_tax": False}},
                  quotation_date=date(2026, 11, 1), valid_until=date(2026, 12, 1), subtotal=D("500"), taxable_amount=D("500"), grand_total=D("500"))
    q.items = [QuotationItem(position=0, item_name="Old item", pricing_method="manual", unit="pc", unit_rate=D("250"),
                             calculated_quantity=D("2"), chargeable_quantity=D("2"), total=D("500"), pricing_config={}, dimensions={})]
    db_session.add(q)
    db_session.commit()
    got = client.get(f"{URL}/{q.id}").json()
    i = got["items"][0]
    assert (i["quantity"], i["total"], i["rate_includes_profit"], i["profit_rule"]["type"], i["materials"]) == ("2.0000", "500.00", True, "none", [])
    assert got["settings"]["charges"]["labour"] == "0.00"
    assert put(client, auth, got, notes="edited")["totals"]["grand_total"] == "500.00"


def test_every_stored_money_value_is_exact_in_the_database(client, auth, db_session):
    q = create(client, auth, MIXED, {"discount": {"type": "percent", "value": "0.0725"}, "gst": {"enabled": True, "rate": "0.18"}})
    row = db_session.get(Quotation, uuid.UUID(q["id"]))
    db_session.refresh(row)
    for col in ("subtotal", "additional_charges", "discount", "taxable_amount", "tax_amount", "rounding_adjustment", "grand_total"):
        assert getattr(row, col) == D(q["totals"][{"additional_charges": "additional_charges"}.get(col, col)]), col
    assert row.taxable_amount + row.tax_amount + row.rounding_adjustment == row.grand_total
