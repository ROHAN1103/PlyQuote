"""Password hashing (Argon2id), session tokens and CSRF tokens."""
import hashlib
import hmac
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

# argon2-cffi's PasswordHasher defaults to Argon2id with RFC 9106 low-memory parameters.
_hasher = PasswordHasher()

# Verified against when a username does not exist, so response time does not reveal it.
_DUMMY_HASH = _hasher.hash("not-a-real-password")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerificationError, InvalidHashError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


# ---- Session tokens: only the SHA-256 digest is stored in the database ----

def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# ---- CSRF: signed double-submit cookie ----

def _sign(nonce: str, secret: str) -> str:
    return hmac.new(secret.encode(), nonce.encode(), hashlib.sha256).hexdigest()


def generate_csrf_token(secret: str) -> str:
    nonce = secrets.token_urlsafe(24)
    return f"{nonce}.{_sign(nonce, secret)}"


def validate_csrf(cookie_value: str | None, header_value: str | None, secret: str) -> bool:
    """Header must equal the cookie, and the token must carry a valid signature."""
    if not cookie_value or not header_value:
        return False
    if not hmac.compare_digest(cookie_value, header_value):
        return False
    nonce, _, signature = header_value.partition(".")
    return bool(nonce) and hmac.compare_digest(signature, _sign(nonce, secret))
