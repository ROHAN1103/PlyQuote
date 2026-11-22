"""Quotation drafts: create, edit, list, delete.

Rules
- Totals are always computed by the calculation engine on the backend; clients never send them.
- Only drafts can be edited or deleted.
- Every save carries the row_version it was loaded with; a stale save is refused (two tabs cannot
  silently overwrite each other).
- Company details are copied onto the quotation when it is created.
- Quotation numbers (QT-YYYY-NNNN) are allocated under a row lock in the same transaction as the insert.
"""
import math
import uuid
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.models.quotation import Quotation, QuotationStatus
from app.models.quotation_item import QuotationItem
from app.repositories.company_repository import CompanyRepository
from app.repositories.quotation_repository import SORT_COLUMNS, QuotationRepository
from app.schemas.calculation import PreviewResponse, Totals
from app.schemas.common import Page
from app.schemas.company import CompanyDefaults
from app.schemas.quotation import (
    ClientOut, CompanySnapshot, QuotationDefaults, QuotationIn, QuotationOut, QuotationSummaryOut, QuotationUpdate,
)
from app.schemas.quotation_item import ItemIn, ItemOut, ItemResultOut
from app.services.calculation_engine import CalculationError, ItemInput, QuotationResult, calculate_item, summarize
from app.utils.dates import today_in
from app.utils.numbering import format_quotation_number

MAX_PAGE_SIZE = 100
EXPIRABLE = (QuotationStatus.FINALIZED.value, QuotationStatus.SENT.value)


def effective_status(q: Quotation, today: date) -> str:
    """'expired' is derived: a finalized or sent quotation past its validity date."""
    if q.status in EXPIRABLE and q.valid_until < today:
        return "expired"
    return q.status


def calculate(items: list[ItemIn]) -> QuotationResult:
    """Run the engine over entered items; failures name the offending item."""
    results = []
    for index, item in enumerate(items):
        try:
            results.append(calculate_item(ItemInput(
                pricing_method=item.pricing_method, quantity=item.quantity, unit=item.unit, unit_rate=item.unit_rate,
            )))
        except CalculationError as exc:
            raise AppError(
                str(exc), code="calculation_error", status_code=422,
                fields=[{"field": f"items.{index}", "message": str(exc)}],
            ) from exc
    return summarize(results)


def preview(items: list[ItemIn]) -> PreviewResponse:
    """Stateless calculation for the builder's live totals. Same engine as saving: no second implementation."""
    result = calculate(items)
    return PreviewResponse(
        items=[ItemResultOut.model_validate(r) for r in result.items],
        totals=Totals(
            subtotal=result.subtotal, additional_charges=result.additional_charges, discount=result.discount,
            tax_amount=result.tax_amount, grand_total=result.grand_total,
        ),
    )


class QuotationService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.db = db
        self.settings = settings
        self.repo = QuotationRepository(db)
        self.companies = CompanyRepository(db)

    # ---- helpers ----
    def today(self) -> date:
        return today_in(self.settings.timezone)

    def _company(self, company_id: uuid.UUID):
        company = self.companies.get(company_id)
        if company is None:
            raise NotFoundError("Company not found.")
        return company

    def _owned(self, company_id: uuid.UUID, quotation_id: uuid.UUID, *, refresh: bool = False) -> Quotation:
        quotation = self.repo.get(company_id, quotation_id, refresh=refresh)
        if quotation is None:
            raise NotFoundError("Quotation not found.", code="quotation_not_found")
        return quotation

    def _to_out(self, q: Quotation) -> QuotationOut:
        return QuotationOut(
            id=q.id, quotation_number=q.quotation_number, status=q.status,
            effective_status=effective_status(q, self.today()), currency=q.currency, revision=q.current_revision,
            row_version=q.row_version, project_name=q.project_name, project_location=q.project_location,
            client=ClientOut.model_validate(q.client_details), quotation_date=q.quotation_date, valid_until=q.valid_until,
            notes=q.notes, payment_terms=q.payment_terms, terms_and_conditions=q.terms_and_conditions,
            company=CompanySnapshot.model_validate(q.company_snapshot),
            items=[ItemOut.model_validate(i) for i in q.items],
            totals=Totals(
                subtotal=q.subtotal, additional_charges=q.additional_charges, discount=q.discount,
                tax_amount=q.tax_amount, grand_total=q.grand_total,
            ),
            created_at=q.created_at, updated_at=q.updated_at,
        )

    @staticmethod
    def _apply_header(q: Quotation, data: QuotationIn) -> None:
        q.project_name, q.project_location = data.project_name, data.project_location
        q.client_name = data.client.name
        q.client_details = data.client.model_dump(mode="json")
        q.quotation_date, q.valid_until = data.quotation_date, data.valid_until
        q.notes, q.payment_terms, q.terms_and_conditions = data.notes, data.payment_terms, data.terms_and_conditions

    @staticmethod
    def _apply_result(q: Quotation, result: QuotationResult) -> None:
        q.subtotal, q.additional_charges, q.discount = result.subtotal, result.additional_charges, result.discount
        q.tax_amount, q.grand_total = result.tax_amount, result.grand_total

    @staticmethod
    def _sync_items(q: Quotation, entered: list[ItemIn], result: QuotationResult) -> None:
        """Update items in place where the client supplied a known id (keeping their identity), create the
        rest, and drop any that are no longer listed. List order becomes the item order."""
        existing = {i.id: i for i in q.items}
        synced: list[QuotationItem] = []
        for position, (inp, res) in enumerate(zip(entered, result.items)):
            item = existing.pop(inp.id, None) if inp.id else None
            if item is None:
                item = QuotationItem()
            item.position = position
            item.item_name, item.description = inp.item_name, inp.description
            item.pricing_method = res.pricing_method
            item.calculated_quantity, item.chargeable_quantity = res.calculated_quantity, res.chargeable_quantity
            item.unit, item.unit_rate = res.unit, res.unit_rate
            item.material_cost, item.labour_cost, item.additional_cost = res.material_cost, res.labour_cost, res.additional_cost
            item.profit, item.discount, item.tax, item.total = res.profit, res.discount, res.tax, res.total
            synced.append(item)
        q.items = synced  # delete-orphan removes whatever was left in `existing`

    # ---- use cases ----
    def defaults(self, company_id: uuid.UUID) -> QuotationDefaults:
        d = CompanyDefaults.model_validate(self._company(company_id).settings or {})
        today = self.today()
        return QuotationDefaults(
            quotation_date=today, valid_until=today + timedelta(days=d.quotation_validity_days),
            payment_terms=d.payment_terms, terms_and_conditions=d.terms_and_conditions,
        )

    def create(self, company_id: uuid.UUID, data: QuotationIn) -> QuotationOut:
        company = self._company(company_id)
        defaults = CompanyDefaults.model_validate(company.settings or {})
        result = calculate(data.items)

        year = self.today().year
        number = format_quotation_number(year, self.repo.next_sequence(company_id, year))
        q = Quotation(
            company_id=company_id, quotation_number=number, status=QuotationStatus.DRAFT.value, currency=defaults.currency,
            company_snapshot=CompanySnapshot(
                name=company.name, address=company.address or "", phone=company.phone or "", email=company.email,
                gstin=company.gstin or "", document_footer=defaults.document_footer, signature=defaults.signature,
            ).model_dump(mode="json"),
            calculation_settings={"gst": defaults.gst.model_dump(mode="json")},
        )
        self._apply_header(q, data)
        self._apply_result(q, result)
        self._sync_items(q, data.items, result)
        self.repo.add(q)
        self.db.commit()  # the number and the quotation succeed or fail together
        return self._to_out(self._owned(company_id, q.id, refresh=True))

    def get(self, company_id: uuid.UUID, quotation_id: uuid.UUID) -> QuotationOut:
        return self._to_out(self._owned(company_id, quotation_id))

    def update(self, company_id: uuid.UUID, quotation_id: uuid.UUID, data: QuotationUpdate) -> QuotationOut:
        q = self._owned(company_id, quotation_id)
        if q.status != QuotationStatus.DRAFT.value:
            raise ConflictError(
                "Only drafts can be edited. Create a revision to change a finalized quotation.", code="quotation_not_editable",
            )
        if data.row_version != q.row_version:
            raise ConflictError(
                "This quotation was changed somewhere else since you opened it. Reload it to see the latest version.",
                code="stale_quotation",
            )
        result = calculate(data.items)
        self._apply_header(q, data)
        self._apply_result(q, result)
        self._sync_items(q, data.items, result)
        q.row_version += 1
        self.db.commit()
        return self._to_out(self._owned(company_id, quotation_id, refresh=True))

    def delete(self, company_id: uuid.UUID, quotation_id: uuid.UUID) -> None:
        q = self._owned(company_id, quotation_id)
        if q.status != QuotationStatus.DRAFT.value:
            raise ConflictError("Only drafts can be deleted.", code="quotation_not_deletable")
        self.repo.delete(q)
        self.db.commit()

    def list(
        self, company_id: uuid.UUID, *, q: str | None, status: str | None, date_from: date | None, date_to: date | None,
        sort: str, descending: bool, page: int, page_size: int,
    ) -> Page[QuotationSummaryOut]:
        sort = sort if sort in SORT_COLUMNS else "quotation_date"
        page, page_size = max(page, 1), min(max(page_size, 1), MAX_PAGE_SIZE)
        today = self.today()
        rows, total = self.repo.search(
            company_id, q=q, status=status, today=today, date_from=date_from, date_to=date_to, sort=sort,
            descending=descending, offset=(page - 1) * page_size, limit=page_size,
        )
        return Page[QuotationSummaryOut](
            items=[
                QuotationSummaryOut(
                    id=r.id, quotation_number=r.quotation_number, status=r.status, effective_status=effective_status(r, today),
                    project_name=r.project_name, client_name=r.client_name, quotation_date=r.quotation_date,
                    valid_until=r.valid_until, grand_total=r.grand_total, revision=r.current_revision, updated_at=r.updated_at,
                )
                for r in rows
            ],
            total=total, page=page, page_size=page_size, pages=math.ceil(total / page_size) if total else 0,
        )
