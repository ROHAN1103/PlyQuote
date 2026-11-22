"""Material catalogue rules.

- Materials are scoped to a company; other companies' records look like "not found".
- The same material (category + name + brand + specification, case-insensitive) cannot exist twice.
- Deleting only deactivates; inactive materials stay on old quotations but cannot be added to new ones.
- `snapshot()` is the ONLY way quotation lines read catalogue prices. It returns a frozen copy, so later
  price edits can never alter a saved quotation.
"""
import math
import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.material import Material
from app.repositories.material_repository import SORT_COLUMNS, MaterialRepository
from app.schemas.common import Page
from app.schemas.material import MaterialIn, MaterialOut, MaterialSnapshot

DUPLICATE_MESSAGE = "A material with the same name, brand and specification already exists in this category."
MAX_PAGE_SIZE = 100


class MaterialService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = MaterialRepository(db)

    def list(
        self, company_id: uuid.UUID, *, q: str | None = None, category: str | None = None,
        is_active: bool | None = None, sort: str = "name", descending: bool = False,
        page: int = 1, page_size: int = 20,
    ) -> Page[MaterialOut]:
        if sort not in SORT_COLUMNS:
            sort = "name"
        page = max(page, 1)
        page_size = min(max(page_size, 1), MAX_PAGE_SIZE)
        rows, total = self.repo.search(
            company_id, q=q, category=category, is_active=is_active, sort=sort,
            descending=descending, offset=(page - 1) * page_size, limit=page_size,
        )
        return Page[MaterialOut](
            items=[MaterialOut.model_validate(r) for r in rows],
            total=total, page=page, page_size=page_size, pages=math.ceil(total / page_size) if total else 0,
        )

    def get(self, company_id: uuid.UUID, material_id: uuid.UUID) -> Material:
        material = self.repo.get(company_id, material_id)
        if material is None:
            raise NotFoundError("Material not found.")
        return material

    def create(self, company_id: uuid.UUID, data: MaterialIn) -> Material:
        material = Material(company_id=company_id, **data.model_dump())
        return self._save(lambda: self.repo.add(material))

    def update(self, company_id: uuid.UUID, material_id: uuid.UUID, data: MaterialIn) -> Material:
        material = self.get(company_id, material_id)
        for field, value in data.model_dump().items():
            setattr(material, field, value)
        return self._save(lambda: self.db.flush() or material)

    def deactivate(self, company_id: uuid.UUID, material_id: uuid.UUID) -> Material:
        material = self.get(company_id, material_id)
        material.is_active = False
        self.db.commit()
        self.db.refresh(material)
        return material

    def snapshot(self, company_id: uuid.UUID, material_id: uuid.UUID) -> MaterialSnapshot:
        """Frozen copy of name, unit and rates for a quotation line (used from Phase 3)."""
        material = self.get(company_id, material_id)
        if not material.is_active:
            raise ConflictError(
                "This material is inactive. Reactivate it in the catalogue to use it in new quotations.",
                code="material_inactive",
            )
        return MaterialSnapshot(
            material_id=material.id, name=material.name, unit=material.unit,
            cost_rate=material.cost_rate, selling_rate=material.selling_rate,
        )

    def _save(self, write):
        try:
            result = write()
            self.db.commit()
            self.db.refresh(result)  # return what the database actually stored
            return result
        except IntegrityError as exc:
            self.db.rollback()
            if "uq_materials_identity" in str(exc.orig) or "UNIQUE" in str(exc.orig).upper():
                raise ConflictError(DUPLICATE_MESSAGE, code="duplicate_material") from exc
            raise
