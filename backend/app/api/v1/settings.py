from typing import Annotated

from fastapi import APIRouter, Depends, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import CurrentUser, DbDep, SettingsDep
from app.schemas.company import CompanyOut, CompanyUpdate
from app.services.company_service import CompanyService

router = APIRouter(prefix="/settings", tags=["settings"])


def get_company_service(db: DbDep, settings: SettingsDep) -> CompanyService:
    return CompanyService(db, settings)


ServiceDep = Annotated[CompanyService, Depends(get_company_service)]


@router.get("/company", response_model=CompanyOut)
def get_company(user: CurrentUser, service: ServiceDep) -> CompanyOut:
    return service.get(user.company_id)


@router.put("/company", response_model=CompanyOut)
def update_company(payload: CompanyUpdate, user: CurrentUser, service: ServiceDep) -> CompanyOut:
    return service.update(user.company_id, payload)


@router.post("/company/logo", response_model=CompanyOut)
def upload_logo(file: UploadFile, user: CurrentUser, service: ServiceDep, settings: SettingsDep) -> CompanyOut:
    # Read one byte past the limit so oversized uploads are detected without loading them fully.
    raw = file.file.read(settings.max_logo_bytes + 1)
    return service.set_logo(user.company_id, raw)


@router.get("/company/logo")
def get_logo(user: CurrentUser, service: ServiceDep) -> FileResponse:
    return FileResponse(service.logo_file(user.company_id), media_type="image/png",
                        headers={"Cache-Control": "private, no-cache"})


@router.delete("/company/logo", response_model=CompanyOut)
def delete_logo(user: CurrentUser, service: ServiceDep) -> CompanyOut:
    return service.clear_logo(user.company_id)
