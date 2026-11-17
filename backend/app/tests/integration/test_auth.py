from datetime import timedelta

from sqlalchemy import select

from app.core.database import utcnow
from app.models import LoginAttempt, UserSession
from app.tests.conftest import ADMIN_PASSWORD, ADMIN_USERNAME

LOGIN = "/api/v1/auth/login"
ME = "/api/v1/auth/me"
LOGOUT = "/api/v1/auth/logout"


def login(client, headers, username=ADMIN_USERNAME, password=ADMIN_PASSWORD):
    return client.post(LOGIN, json={"username": username, "password": password}, headers=headers)


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_me_requires_authentication(client):
    r = client.get(ME)
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "not_authenticated"


def test_login_success_sets_httponly_cookie_and_me_works(client, admin, csrf_headers, settings):
    r = login(client, csrf_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == ADMIN_USERNAME
    assert body["company"]["name"] == "Test Interiors"
    assert "password" not in str(body).lower()

    set_cookie = r.headers["set-cookie"].lower()
    assert settings.session_cookie_name in set_cookie
    assert "httponly" in set_cookie and "samesite=lax" in set_cookie

    me = client.get(ME)
    assert me.status_code == 200
    assert me.json()["username"] == ADMIN_USERNAME


def test_username_is_case_insensitive(client, admin, csrf_headers):
    assert login(client, csrf_headers, username="  ADMIN ").status_code == 200


def test_only_token_hash_is_stored(client, admin, csrf_headers, db_session, settings):
    login(client, csrf_headers)
    raw = client.cookies.get(settings.session_cookie_name)
    stored = db_session.scalars(select(UserSession)).one()
    assert raw and raw != stored.token_hash and len(stored.token_hash) == 64


def test_wrong_password_and_unknown_user_give_identical_errors(client, admin, csrf_headers):
    a = login(client, csrf_headers, password="nope-nope-nope")
    b = login(client, csrf_headers, username="ghost", password="nope-nope-nope")
    assert a.status_code == b.status_code == 401
    assert a.json() == b.json()
    assert a.json()["error"]["code"] == "invalid_credentials"


def test_inactive_user_cannot_login(client, admin, csrf_headers, db_session):
    admin.is_active = False
    db_session.commit()
    assert login(client, csrf_headers).status_code == 401


def test_rate_limit_locks_after_max_failures(client, admin, csrf_headers, settings):
    for _ in range(settings.login_max_attempts):
        assert login(client, csrf_headers, password="bad-bad-bad-bad").status_code == 401
    r = login(client, csrf_headers, password="bad-bad-bad-bad")
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "too_many_attempts"
    assert "retry-after" in r.headers
    # Even the correct password is refused while locked.
    assert login(client, csrf_headers).status_code == 429


def test_failures_outside_window_do_not_count(client, admin, csrf_headers, db_session, settings):
    old = utcnow() - timedelta(minutes=settings.login_window_minutes + 1)
    for _ in range(settings.login_max_attempts):
        db_session.add(LoginAttempt(username=ADMIN_USERNAME, ip_address="testclient", succeeded=False, attempted_at=old))
    db_session.commit()
    assert login(client, csrf_headers).status_code == 200


def test_success_clears_failure_count(client, admin, csrf_headers, settings):
    for _ in range(settings.login_max_attempts - 1):
        login(client, csrf_headers, password="bad-bad-bad-bad")
    assert login(client, csrf_headers).status_code == 200
    for _ in range(settings.login_max_attempts - 1):
        assert login(client, csrf_headers, password="bad-bad-bad-bad").status_code == 401


def test_logout_revokes_session_server_side(client, admin, csrf_headers, settings):
    login(client, csrf_headers)
    stolen = client.cookies.get(settings.session_cookie_name)
    assert client.post(LOGOUT, headers=csrf_headers).status_code == 200
    assert client.get(ME).status_code == 401
    # Replaying the old cookie must also fail: revocation is server-side.
    client.cookies.set(settings.session_cookie_name, stolen)
    assert client.get(ME).status_code == 401


def test_expired_session_is_rejected(client, admin, csrf_headers, db_session):
    login(client, csrf_headers)
    s = db_session.scalars(select(UserSession)).one()
    s.expires_at = utcnow() - timedelta(seconds=1)
    db_session.commit()
    r = client.get(ME)
    assert r.status_code == 401 and r.json()["error"]["code"] == "session_expired"


def test_deactivating_user_kills_existing_session(client, admin, csrf_headers, db_session):
    login(client, csrf_headers)
    admin.is_active = False
    db_session.commit()
    assert client.get(ME).status_code == 401


def test_state_changing_requests_need_csrf(client, admin):
    r = client.post(LOGIN, json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
    assert r.status_code == 403 and r.json()["error"]["code"] == "csrf_failed"


def test_csrf_header_must_match_cookie(client, admin, csrf_headers):
    other = {"X-CSRF-Token": "bogus.token"}
    assert login(client, other).status_code == 403


def test_validation_errors_use_structured_shape(client, csrf_headers):
    r = client.post(LOGIN, json={"username": ""}, headers=csrf_headers)
    assert r.status_code == 422
    err = r.json()["error"]
    assert err["code"] == "validation_error"
    assert {f["field"] for f in err["fields"]} == {"username", "password"}
