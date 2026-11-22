from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.schemas.calculation import PreviewRequest, PreviewResponse
from app.services.quotation_service import preview

router = APIRouter(prefix="/calculations", tags=["calculations"])


@router.post("/preview", response_model=PreviewResponse)
def preview_calculation(payload: PreviewRequest, _: CurrentUser) -> PreviewResponse:
    """Stateless: prices unsaved items with the same engine used when saving. Nothing is stored."""
    return preview(payload.items)
