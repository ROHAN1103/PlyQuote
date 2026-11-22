from io import BytesIO
from pathlib import Path

import pytest
from PIL import Image

from app.core.config import get_settings
from app.utils.storage import LogoStorage

URL = "/api/v1/settings/company"
LOGO = f"{URL}/logo"


def body(**over):
    base = {"name": "Acme Interiors", "address": "12 Mount Road\nChennai", "phone": "+91 98765 43210",
            "email": "hello@acme.in", "gstin": "33ABCDE1234F1Z5",
            "defaults": {"gst": {"enabled": True, "rate": "0.18", "prices_include_tax": False},
                         "quotation_validity_days": 15, "payment_terms": "50% advance",
                         "terms_and_conditions": "T&C text", "document_footer": "Thank you",
                         "signature": {"name": "A. Kumar", "designation": "Director"},
                         "show_material_breakdown_to_customer": False}}
    return {**base, **over}


def image_bytes(fmt="PNG", size=(200, 100), mode="RGB"):
    buf = BytesIO()
    Image.new(mode, size, "white" if mode == "RGB" else (255, 0, 0, 128)).save(buf, format=fmt)
    return buf.getvalue()


def upload(client, headers, data, name="logo.png", ctype="image/png"):
    return client.post(LOGO, files={"file": (name, data, ctype)}, headers=headers)


# ---------- profile & defaults ----------
def test_requires_authentication(client):
    assert client.get(URL).status_code == 401


def test_new_company_has_safe_defaults_and_no_builtin_tax_rate(client, auth):
    r = client.get(URL).json()
    d = r["defaults"]
    assert r["name"] == "Test Interiors" and r["has_logo"] is False and r["logo_version"] is None
    assert d["currency"] == "INR" and d["quotation_validity_days"] == 30
    assert d["gst"] == {"enabled": False, "rate": None, "prices_include_tax": False}
    assert d["show_material_breakdown_to_customer"] is False


def test_update_round_trip(client, auth):
    r = client.put(URL, json=body(), headers=auth)
    assert r.status_code == 200, r.text
    got = client.get(URL).json()
    assert got["name"] == "Acme Interiors" and got["gstin"] == "33ABCDE1234F1Z5"
    assert got["defaults"]["gst"]["rate"] == "0.1800"
    assert got["defaults"]["signature"]["name"] == "A. Kumar"
    assert got["defaults"]["quotation_validity_days"] == 15


def test_update_requires_csrf(client, auth):
    assert client.put(URL, json=body()).status_code == 403


def test_blank_optionals_are_accepted(client, auth):
    r = client.put(URL, json=body(address="", phone="", email="", gstin=""), headers=auth)
    assert r.status_code == 200
    assert r.json()["email"] is None and r.json()["gstin"] == ""


def test_gstin_is_normalised_to_uppercase(client, auth):
    assert client.put(URL, json=body(gstin="33abcde1234f1z5"), headers=auth).json()["gstin"] == "33ABCDE1234F1Z5"


@pytest.mark.parametrize("bad,field", [
    ({"gstin": "NOT-A-GSTIN"}, "gstin"),
    ({"email": "not-an-email"}, "email"),
    ({"phone": "call me maybe"}, "phone"),
    ({"name": "  "}, "name"),
])
def test_invalid_profile_fields(client, auth, bad, field):
    r = client.put(URL, json=body(**bad), headers=auth)
    assert r.status_code == 422
    assert field in r.json()["error"]["fields"][0]["field"]


def test_gst_enabled_requires_a_rate(client, auth):
    d = body()["defaults"]
    d["gst"] = {"enabled": True, "rate": None, "prices_include_tax": False}
    r = client.put(URL, json=body(defaults=d), headers=auth)
    assert r.status_code == 422 and "GST rate" in r.text


@pytest.mark.parametrize("rate", ["-0.1", "1.5", "0.12345"])
def test_gst_rate_bounds(client, auth, rate):
    d = body()["defaults"]
    d["gst"]["rate"] = rate
    assert client.put(URL, json=body(defaults=d), headers=auth).status_code == 422


def test_gst_disabled_keeps_rate_so_toggling_loses_nothing(client, auth):
    d = body()["defaults"]
    d["gst"] = {"enabled": False, "rate": "0.05", "prices_include_tax": True}
    out = client.put(URL, json=body(defaults=d), headers=auth).json()["defaults"]["gst"]
    assert out == {"enabled": False, "rate": "0.0500", "prices_include_tax": True}


@pytest.mark.parametrize("key,value", [("quotation_validity_days", 0), ("quotation_validity_days", 400),
                                        ("currency", "USD")])
def test_invalid_defaults(client, auth, key, value):
    d = body()["defaults"]
    d[key] = value
    assert client.put(URL, json=body(defaults=d), headers=auth).status_code == 422


def test_settings_with_missing_keys_fall_back_to_defaults(client, auth, db_session, admin):
    admin.company.settings = {"quotation_validity_days": 45}  # an "older" stored shape
    db_session.commit()
    d = client.get(URL).json()["defaults"]
    assert d["quotation_validity_days"] == 45 and d["gst"]["enabled"] is False


# ---------- logo ----------
def test_upload_png_logo(client, auth):
    r = upload(client, auth, image_bytes())
    assert r.status_code == 200 and r.json()["has_logo"] is True and r.json()["logo_version"]
    served = client.get(LOGO)
    assert served.status_code == 200 and served.headers["content-type"] == "image/png"
    assert Image.open(BytesIO(served.content)).format == "PNG"


def test_jpeg_and_webp_are_accepted_and_converted_to_png(client, auth):
    for fmt, name in (("JPEG", "a.jpg"), ("WEBP", "a.webp")):
        assert upload(client, auth, image_bytes(fmt), name=name).status_code == 200
        assert Image.open(BytesIO(client.get(LOGO).content)).format == "PNG"


def test_large_images_are_downscaled_and_transparency_kept(client, auth):
    upload(client, auth, image_bytes(size=(3000, 1500), mode="RGBA"))
    img = Image.open(BytesIO(client.get(LOGO).content))
    assert max(img.size) == 800 and img.mode == "RGBA"


@pytest.mark.parametrize("name,data", [
    ("notes.txt", b"just some text"),
    ("evil.svg", b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
    ("fake.png", b"\x89PNG\r\n\x1a\n" + b"garbage" * 50),                       # right magic bytes, corrupt body
    ("page.png", b"<html><script>alert(1)</script></html>"),
    ("gif.gif", None),
])
def test_non_images_are_rejected(client, auth, name, data):
    if data is None:
        data = image_bytes("GIF")  # a real image, but not an allowed format
    r = upload(client, auth, data, name=name)
    assert r.status_code == 422 and r.json()["error"]["code"] == "invalid_image"
    assert client.get(URL).json()["has_logo"] is False


def test_oversized_upload_is_rejected(client, auth):
    r = upload(client, auth, b"\x00" * (get_settings().max_logo_bytes + 10))
    assert r.status_code == 413 and r.json()["error"]["code"] == "file_too_large"


def test_decompression_bomb_is_rejected(client, auth):
    bomb = image_bytes(size=(8000, 8000))  # 64 megapixels, but tiny on disk
    assert len(bomb) < get_settings().max_logo_bytes
    assert upload(client, auth, bomb).status_code == 422


def test_replacing_a_logo_deletes_the_old_file(client, auth, db_session, admin):
    upload(client, auth, image_bytes())
    db_session.refresh(admin.company)
    first = Path(get_settings().upload_dir) / admin.company.logo_path
    assert first.is_file()
    upload(client, auth, image_bytes(size=(50, 50)))
    db_session.refresh(admin.company)
    assert not first.exists()
    assert (Path(get_settings().upload_dir) / admin.company.logo_path).is_file()


def test_delete_logo(client, auth, db_session, admin):
    upload(client, auth, image_bytes())
    db_session.refresh(admin.company)
    stored = Path(get_settings().upload_dir) / admin.company.logo_path
    r = client.delete(LOGO, headers=auth)
    assert r.status_code == 200 and r.json()["has_logo"] is False
    assert not stored.exists()
    assert client.get(LOGO).status_code == 404


def test_logo_endpoints_require_auth_and_csrf(client, auth):
    assert client.post(LOGO, files={"file": ("a.png", image_bytes(), "image/png")}).status_code == 403
    client.cookies.clear()
    assert client.get(LOGO).status_code == 401


def test_stored_filename_is_server_generated(client, auth, db_session, admin):
    upload(client, auth, image_bytes(), name="../../etc/passwd.png")
    db_session.refresh(admin.company)
    assert admin.company.logo_path.startswith(f"logos/{admin.company.id}-") and ".." not in admin.company.logo_path


def test_storage_refuses_paths_outside_its_root(tmp_path):
    (tmp_path / "root").mkdir()
    (tmp_path / "secret.txt").write_text("x")
    storage = LogoStorage(str(tmp_path / "root"))
    assert storage.resolve("../secret.txt") is None
    assert storage.resolve("/etc/passwd") is None
    storage.delete("../secret.txt")
    assert (tmp_path / "secret.txt").exists()
