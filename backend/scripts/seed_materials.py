"""OPTIONAL: load a starter material catalogue so you don't start from a blank table.

Usage:  python -m scripts.seed_materials
Every starter material is created with a rate of 0: set real rates in Materials before quoting
(the catalogue flags zero-rate items). Safe to run more than once; existing entries are skipped.
"""
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.material import Material
from app.repositories.user_repository import UserRepository

STARTER: list[tuple[str, str, str, str]] = [  # (category, name, specification, unit)
    *[("plywood", "Plywood", f"{t}mm", "sheet") for t in (6, 9, 12, 16, 18)],
    ("laminate", "Matte Laminate", "0.8mm", "sheet"),
    ("laminate", "Matte Laminate", "1mm", "sheet"),
    ("laminate", "Glossy Laminate", "0.8mm", "sheet"),
    ("laminate", "Glossy Laminate", "1mm", "sheet"),
    ("hardware", "Hinge", "", "pc"),
    ("hardware", "Handle", "", "pc"),
    ("hardware", "Drawer Channel", "", "pair"),
    ("hardware", "Lock", "", "pc"),
    ("hardware", "Screws", "", "box"),
    ("hardware", "Connector", "", "pc"),
    ("other", "Edge Band", "", "r.ft"),
    ("other", "Adhesive", "", "kg"),
]


def seed(db: Session) -> tuple[int, int]:
    """Returns (created, skipped)."""
    company = UserRepository(db).get_first_company()
    if company is None:
        raise SystemExit("No company yet. Run scripts.create_admin first.")
    existing = {
        (m.category, m.name.lower(), m.brand.lower(), m.specification.lower())
        for m in db.scalars(select(Material).where(Material.company_id == company.id))
    }
    created = skipped = 0
    for category, name, spec, unit in STARTER:
        if (category, name.lower(), "", spec.lower()) in existing:
            skipped += 1
            continue
        db.add(Material(company_id=company.id, category=category, name=name, specification=spec,
                        unit=unit, cost_rate=Decimal("0")))
        created += 1
    db.commit()
    return created, skipped


if __name__ == "__main__":
    with SessionLocal() as session:
        made, skipped = seed(session)
    print(f"Created {made} materials, skipped {skipped} that already existed. Rates are 0: set them in Materials.")
