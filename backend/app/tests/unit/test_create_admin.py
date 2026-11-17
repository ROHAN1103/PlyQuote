import pytest
from sqlalchemy import select

from app.models import Company, User
from scripts.create_admin import AdminCreationError, create_admin


def test_creates_company_and_admin(db_session):
    user = create_admin(db_session, "Boss", "a-very-long-password", "Acme Interiors", 12)
    assert user.username == "boss"
    assert user.password_hash.startswith("$argon2id$")
    assert db_session.scalars(select(Company)).one().name == "Acme Interiors"


def test_rejects_short_password_bad_username_duplicates(db_session):
    with pytest.raises(AdminCreationError):
        create_admin(db_session, "boss", "short", "Acme", 12)
    with pytest.raises(AdminCreationError):
        create_admin(db_session, "b o s s", "a-very-long-password", "Acme", 12)
    create_admin(db_session, "boss", "a-very-long-password", "Acme", 12)
    with pytest.raises(AdminCreationError):
        create_admin(db_session, "BOSS", "another-long-password", "Acme", 12)


def test_company_name_required_for_first_admin(db_session):
    with pytest.raises(AdminCreationError):
        create_admin(db_session, "boss", "a-very-long-password", "  ", 12)
    assert db_session.scalars(select(User)).first() is None
