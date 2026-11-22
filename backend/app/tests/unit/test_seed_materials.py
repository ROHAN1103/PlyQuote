from sqlalchemy import func, select

from app.models import Material
from scripts.create_admin import create_admin
from scripts.seed_materials import STARTER, seed


def test_seed_creates_zero_rate_materials_and_is_idempotent(db_session):
    create_admin(db_session, "boss", "a-very-long-password", "Acme", 12)
    created, skipped = seed(db_session)
    assert (created, skipped) == (len(STARTER), 0)
    assert db_session.scalar(select(func.count()).select_from(Material).where(Material.cost_rate != 0)) == 0
    assert seed(db_session) == (0, len(STARTER))
    assert db_session.scalar(select(func.count()).select_from(Material)) == len(STARTER)
