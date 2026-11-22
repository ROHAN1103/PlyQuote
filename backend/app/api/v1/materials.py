import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query

from app.api.deps import CurrentUser, DbDep
from app.models.material import MaterialCategory
from app.schemas.common import Page
from app.schemas.material import MaterialIn, MaterialOut
from app.services.material_service import MaterialService

router = APIRouter(prefix="/materials", tags=["materials"])


def get_material_service(db: DbDep) -> MaterialService:
    return MaterialService(db)


ServiceDep = Annotated[MaterialService, Depends(get_material_service)]


@router.get("", response_model=Page[MaterialOut])
def list_materials(
    user: CurrentUser, service: ServiceDep,
    q: str | None = Query(None, max_length=100, description="Search name, brand, specification, description"),
    category: MaterialCategory | None = None,
    is_active: bool | None = None,
    sort: Literal["name", "category", "cost_rate", "updated_at"] = "name",
    order: Literal["asc", "desc"] = "asc",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Page[MaterialOut]:
    return service.list(
        user.company_id, q=q, category=category.value if category else None, is_active=is_active,
        sort=sort, descending=order == "desc", page=page, page_size=page_size,
    )


@router.post("", response_model=MaterialOut, status_code=201)
def create_material(payload: MaterialIn, user: CurrentUser, service: ServiceDep) -> MaterialOut:
    return MaterialOut.model_validate(service.create(user.company_id, payload))


@router.get("/{material_id}", response_model=MaterialOut)
def get_material(material_id: uuid.UUID, user: CurrentUser, service: ServiceDep) -> MaterialOut:
    return MaterialOut.model_validate(service.get(user.company_id, material_id))


@router.put("/{material_id}", response_model=MaterialOut)
def update_material(material_id: uuid.UUID, payload: MaterialIn, user: CurrentUser, service: ServiceDep) -> MaterialOut:
    return MaterialOut.model_validate(service.update(user.company_id, material_id, payload))


@router.delete("/{material_id}", response_model=MaterialOut)
def deactivate_material(material_id: uuid.UUID, user: CurrentUser, service: ServiceDep) -> MaterialOut:
    """Soft delete: the material is deactivated, never removed, so old quotations stay intact."""
    return MaterialOut.model_validate(service.deactivate(user.company_id, material_id))
