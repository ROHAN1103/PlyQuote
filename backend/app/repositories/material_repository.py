import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.material import Material

SORT_COLUMNS = {
    "name": lambda: func.lower(Material.name),
    "category": lambda: Material.category,
    "cost_rate": lambda: Material.cost_rate,
    "updated_at": lambda: Material.updated_at,
}


def _escape_like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class MaterialRepository:
    """Every query is scoped to a company, so one company can never see another's materials."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, company_id: uuid.UUID, material_id: uuid.UUID) -> Material | None:
        return self.db.scalar(
            select(Material).where(Material.id == material_id, Material.company_id == company_id)
        )

    def search(
        self, company_id: uuid.UUID, *, q: str | None, category: str | None, is_active: bool | None,
        sort: str, descending: bool, offset: int, limit: int,
    ) -> tuple[list[Material], int]:
        stmt = select(Material).where(Material.company_id == company_id)
        if category:
            stmt = stmt.where(Material.category == category)
        if is_active is not None:
            stmt = stmt.where(Material.is_active.is_(is_active))
        if q and q.strip():
            pattern = f"%{_escape_like(q.strip().lower())}%"
            stmt = stmt.where(
                or_(*(func.lower(col).like(pattern, escape="\\")
                      for col in (Material.name, Material.brand, Material.specification, Material.description)))
            )
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

        order_col = SORT_COLUMNS[sort]()
        # Tie-breakers keep same-named items in a stable, readable order (e.g. 0.8mm before 1mm).
        stmt = stmt.order_by(
            order_col.desc() if descending else order_col.asc(),
            func.lower(Material.name), func.lower(Material.specification), func.lower(Material.brand), Material.id,
        )
        rows = list(self.db.scalars(stmt.offset(offset).limit(limit)))
        return rows, total

    def add(self, material: Material) -> Material:
        self.db.add(material)
        self.db.flush()
        return material
