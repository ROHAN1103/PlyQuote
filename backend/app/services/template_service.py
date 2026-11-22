"""Furniture templates: reusable item presets. Copied into quotations, never referenced by them, so
changing or removing a template cannot affect any quotation. Deleting only deactivates."""
import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.furniture_template import FurnitureTemplate
from app.schemas.furniture_template import TemplateIn, TemplateOut


class TemplateService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _get(self, company_id: uuid.UUID, template_id: uuid.UUID) -> FurnitureTemplate:
        t = self.db.scalar(select(FurnitureTemplate).where(
            FurnitureTemplate.id == template_id, FurnitureTemplate.company_id == company_id))
        if t is None:
            raise NotFoundError("Template not found.")
        return t

    def list(self, company_id: uuid.UUID, *, include_inactive: bool = False) -> list[TemplateOut]:
        stmt = select(FurnitureTemplate).where(FurnitureTemplate.company_id == company_id)
        if not include_inactive:
            stmt = stmt.where(FurnitureTemplate.is_active.is_(True))
        rows = self.db.scalars(stmt.order_by(func.lower(FurnitureTemplate.name)))
        return [TemplateOut.model_validate(r) for r in rows]

    def _apply(self, t: FurnitureTemplate, data: TemplateIn) -> None:
        t.name, t.description = data.name, data.description
        t.default_pricing_method = data.default_pricing_method
        t.default_config = data.default_config.model_dump(mode="json")

    def _save(self, t: FurnitureTemplate) -> TemplateOut:
        try:
            self.db.add(t)
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError("A template with this name already exists.", code="duplicate_template") from exc
        self.db.refresh(t)
        return TemplateOut.model_validate(t)

    def create(self, company_id: uuid.UUID, data: TemplateIn) -> TemplateOut:
        t = FurnitureTemplate(company_id=company_id)
        self._apply(t, data)
        return self._save(t)

    def update(self, company_id: uuid.UUID, template_id: uuid.UUID, data: TemplateIn) -> TemplateOut:
        t = self._get(company_id, template_id)
        self._apply(t, data)
        return self._save(t)

    def deactivate(self, company_id: uuid.UUID, template_id: uuid.UUID) -> TemplateOut:
        t = self._get(company_id, template_id)
        t.is_active = False
        return self._save(t)
