import uuid
from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response

from app.api.deps import CurrentUser, DbDep, SettingsDep
from app.schemas.common import Page
from app.schemas.quotation import (
    QuotationDefaults, QuotationIn, QuotationOut, QuotationSummaryOut, QuotationUpdate,
)
from app.services.quotation_service import QuotationService

router = APIRouter(prefix="/quotations", tags=["quotations"])


def get_service(db: DbDep, settings: SettingsDep) -> QuotationService:
    return QuotationService(db, settings)


ServiceDep = Annotated[QuotationService, Depends(get_service)]
StatusFilter = Literal["draft", "finalized", "sent", "accepted", "rejected", "expired"]


@router.get("", response_model=Page[QuotationSummaryOut])
def list_quotations(
    user: CurrentUser, service: ServiceDep,
    q: str | None = Query(None, max_length=100, description="Search number, project or client name"),
    status: StatusFilter | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    sort: Literal["quotation_date", "quotation_number", "grand_total", "updated_at"] = "quotation_date",
    order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Page[QuotationSummaryOut]:
    return service.list(
        user.company_id, q=q, status=status, date_from=date_from, date_to=date_to,
        sort=sort, descending=order == "desc", page=page, page_size=page_size,
    )


@router.get("/defaults", response_model=QuotationDefaults)
def quotation_defaults(user: CurrentUser, service: ServiceDep) -> QuotationDefaults:
    """Prefill values for a new quotation (declared before /{id} so 'defaults' is not read as an id)."""
    return service.defaults(user.company_id)


@router.post("", response_model=QuotationOut, status_code=201)
def create_quotation(payload: QuotationIn, user: CurrentUser, service: ServiceDep) -> QuotationOut:
    return service.create(user.company_id, payload)


@router.get("/{quotation_id}", response_model=QuotationOut)
def get_quotation(quotation_id: uuid.UUID, user: CurrentUser, service: ServiceDep) -> QuotationOut:
    return service.get(user.company_id, quotation_id)


@router.put("/{quotation_id}", response_model=QuotationOut)
def update_quotation(quotation_id: uuid.UUID, payload: QuotationUpdate, user: CurrentUser, service: ServiceDep) -> QuotationOut:
    return service.update(user.company_id, quotation_id, payload)


@router.delete("/{quotation_id}", status_code=204)
def delete_quotation(quotation_id: uuid.UUID, user: CurrentUser, service: ServiceDep) -> Response:
    service.delete(user.company_id, quotation_id)
    return Response(status_code=204)
