import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, DbDep
from app.schemas.furniture_template import TemplateIn, TemplateOut
from app.services.template_service import TemplateService

router = APIRouter(prefix="/furniture-templates", tags=["furniture templates"])


def get_service(db: DbDep) -> TemplateService:
    return TemplateService(db)


ServiceDep = Annotated[TemplateService, Depends(get_service)]


@router.get("", response_model=list[TemplateOut])
def list_templates(user: CurrentUser, service: ServiceDep, include_inactive: bool = False) -> list[TemplateOut]:
    return service.list(user.company_id, include_inactive=include_inactive)


@router.post("", response_model=TemplateOut, status_code=201)
def create_template(payload: TemplateIn, user: CurrentUser, service: ServiceDep) -> TemplateOut:
    return service.create(user.company_id, payload)


@router.put("/{template_id}", response_model=TemplateOut)
def update_template(template_id: uuid.UUID, payload: TemplateIn, user: CurrentUser, service: ServiceDep) -> TemplateOut:
    return service.update(user.company_id, template_id, payload)


@router.delete("/{template_id}", response_model=TemplateOut)
def delete_template(template_id: uuid.UUID, user: CurrentUser, service: ServiceDep) -> TemplateOut:
    """Soft delete: the template is deactivated and no longer offered."""
    return service.deactivate(user.company_id, template_id)
