from app.core.security import (
    generate_csrf_token, hash_password, hash_token, password_needs_rehash,
    validate_csrf, verify_password,
)

SECRET = "x" * 40


def test_password_hash_is_argon2id_and_verifies():
    h = hash_password("a-long-password")
    assert h.startswith("$argon2id$")
    assert verify_password(h, "a-long-password")
    assert not verify_password(h, "wrong")
    assert not password_needs_rehash(h)


def test_verify_with_missing_hash_is_always_false():
    assert not verify_password(None, "anything")
    assert not verify_password(None, "not-a-real-password")


def test_verify_garbage_hash_is_false():
    assert not verify_password("not-a-hash", "x")


def test_token_hash_is_deterministic_hex():
    assert hash_token("abc") == hash_token("abc")
    assert len(hash_token("abc")) == 64


def test_csrf_roundtrip():
    t = generate_csrf_token(SECRET)
    assert validate_csrf(t, t, SECRET)


def test_csrf_rejects_mismatch_missing_and_forged():
    t = generate_csrf_token(SECRET)
    other = generate_csrf_token(SECRET)
    assert not validate_csrf(t, other, SECRET)
    assert not validate_csrf(None, t, SECRET)
    assert not validate_csrf(t, None, SECRET)
    forged = "attacker-nonce.deadbeef"
    assert not validate_csrf(forged, forged, SECRET)
    assert not validate_csrf(t, t, "different-secret-" + "y" * 30)
