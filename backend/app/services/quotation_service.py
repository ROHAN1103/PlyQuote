"""Quotation drafts: create, edit, list, delete.

Rules
- Totals are always computed by the calculation engine on the backend; clients never send them.
- Only drafts can be edited or deleted.
- Every save carries the row_version it was loaded with; a stale save is refused (two tabs cannot
  silently overwrite each other).
- Company details are copied onto the quotation when it is created.
- Material lines keep the name, unit and rate they were added with; the catalogue is only consulted to check
  that a referenced material exists, belongs to this company, and (for a newly added line) is still active.
- Quotation numbers (QT-YYYY-NNNN) are allocated under a row lock in the same transaction as the insert.
"""
import math
import uuid
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.models.item_material import ItemMaterial
from app.models.quotation import Quotation, QuotationStatus
from app.models.quotation_item import QuotationItem
from app.repositories.company_repository import CompanyRepository
from app.repositories.material_repository import MaterialRepository
from app.repositories.quotation_repository import SORT_COLUMNS, QuotationRepository
from app.schemas.calculation import PreviewResponse, Totals
from app.schemas.common import Page
from app.schemas.company import CompanyDefaults
from app.schemas.quotation import (
    ClientOut, CompanySnapshot, QuotationDefaults, QuotationIn, QuotationOut, QuotationSummaryOut, QuotationUpdate,
)
from app.schemas.quotation_item import (
    ExtraCostsData, ItemIn, ItemOut, ItemResultOut, MaterialLineIn, MaterialLineOut, MeasurementData, ProfitRuleData,
)
from app.schemas.quotation_settings import GstData, SettingsData
from app.services.calculation_engine import (
    CalculationError, Charges, DiscountSpec, ExtraCosts, ItemInput, MaterialLine, MeasurementInput, ProfitSpec,
    QuotationResult, QuotationSettings, TaxSpec, calculate_item, summarize,
)
from app.services.calculation_engine.summary import DEFAULT_RATE_INCLUDES_PROFIT
from app.utils.dates import today_in
from app.utils.numbering import format_quotation_number

MAX_PAGE_SIZE = 100
EXPIRABLE = (QuotationStatus.FINALIZED.value, QuotationStatus.SENT.value)


def effective_status(q: Quotation, today: date) -> str:
    """'expired' is derived: a finalized or sent quotation past its validity date."""
    if q.status in EXPIRABLE and q.valid_until < today:
        return "expired"
    return q.status


# ---------------------------------------------------------------- API schema -> engine

def to_engine_item(i: ItemIn) -> ItemInput:
    m = i.measurement
    return ItemInput(
        pricing_method=i.pricing_method, quantity=i.quantity, unit=i.unit, unit_rate=i.unit_rate,
        measurement=None if m is None else MeasurementInput(
            formula=m.formula, width=m.width, height=m.height, depth=m.depth, length=m.length,
            running_dimension=m.running_dimension, minimum_quantity=m.minimum_quantity, rounding_places=m.rounding_places,
        ),
        materials=tuple(MaterialLine(quantity=line.quantity, rate=line.rate) for line in i.materials),
        extra_costs=ExtraCosts(**i.extra_costs.model_dump()),
        profit=ProfitSpec(type=i.profit_rule.type, value=i.profit_rule.value),
        rate_includes_profit=i.rate_includes_profit,
    )


def to_engine_settings(s: SettingsData) -> QuotationSettings:
    return QuotationSettings(
        charges=Charges(**s.charges.model_dump()),
        discount=DiscountSpec(type=s.discount.type, value=s.discount.value),
        tax=TaxSpec(enabled=s.gst.enabled, rate=s.gst.rate, prices_include_tax=s.gst.prices_include_tax),
        round_to_rupee=s.round_to_rupee,
    )


def _calculation_error(exc: CalculationError, item_index: int | None) -> AppError:
    """Point the error at the exact input: items.2.measurement.width, settings.discount.value, ..."""
    field = exc.field or ""
    if item_index is None or field.startswith("settings."):
        path = field or "settings"
    else:
        path = f"items.{item_index}" + (f".{field}" if field else "")
    return AppError(str(exc), code="calculation_error", status_code=422, fields=[{"field": path, "message": str(exc)}])


def calculate(items: list[ItemIn], settings: SettingsData) -> QuotationResult:
    """Run the engine over entered items and settings; failures name the offending input."""
    results = []
    for index, item in enumerate(items):
        try:
            results.append(calculate_item(to_engine_item(item)))
        except CalculationError as exc:
            raise _calculation_error(exc, index) from exc
    try:
        return summarize(results, to_engine_settings(settings))
    except CalculationError as exc:
        raise _calculation_error(exc, None) from exc


def _totals(r: QuotationResult) -> Totals:
    return Totals(
        subtotal=r.subtotal, additional_charges=r.additional_charges, discount=r.discount, taxable_amount=r.taxable_amount,
        tax_amount=r.tax_amount, rounding_adjustment=r.rounding_adjustment, grand_total=r.grand_total,
        material_cost=r.material_cost, profit=r.profit,
    )


def preview(items: list[ItemIn], settings: SettingsData) -> PreviewResponse:
    """Stateless calculation for the builder's live totals. Same engine as saving: no second implementation."""
    result = calculate(items, settings)
    return PreviewResponse(items=[ItemResultOut.model_validate(r) for r in result.items], totals=_totals(result))


def _company_settings(company_settings: dict) -> SettingsData:
    gst = CompanyDefaults.model_validate(company_settings or {}).gst
    return SettingsData(gst=GstData(enabled=gst.enabled, rate=gst.rate, prices_include_tax=gst.prices_include_tax))


class QuotationService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.db = db
        self.settings = settings
        self.repo = QuotationRepository(db)
        self.companies = CompanyRepository(db)
        self.materials = MaterialRepository(db)

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

    @staticmethod
    def _item_out(item: QuotationItem) -> ItemOut:
        cfg = item.pricing_config or {}
        method = item.pricing_method
        entered = cfg.get("quantity")
        measurement = None
        if method == "measurement" and cfg.get("measurement"):
            measurement = MeasurementData.model_validate({**cfg["measurement"], **(item.dimensions or {})})
        applied = cfg.get("rate_includes_profit")
        return ItemOut(
            id=item.id, position=item.position, pricing_method=method, item_name=item.item_name, description=item.description,
            quantity=None if method == "material" else Decimal(entered) if entered is not None else item.chargeable_quantity,
            unit=item.unit, unit_rate=item.unit_rate, calculated_quantity=item.calculated_quantity,
            chargeable_quantity=item.chargeable_quantity, material_cost=item.material_cost, labour_cost=item.labour_cost,
            additional_cost=item.additional_cost, profit=item.profit, discount=item.discount, tax=item.tax, total=item.total,
            measurement=measurement,
            materials=[
                MaterialLineOut(id=m.id, material_id=m.material_id, name=m.material_name_snapshot, description=m.description,
                                unit=m.unit_snapshot, quantity=m.quantity, rate=m.rate_snapshot, amount=m.amount)
                for m in item.materials
            ],
            extra_costs=ExtraCostsData.model_validate(cfg.get("extra_costs") or {}),
            profit_rule=ProfitRuleData.model_validate(cfg.get("profit_rule") or {}),
            rate_includes_profit=DEFAULT_RATE_INCLUDES_PROFIT[method] if applied is None else bool(applied),
        )

    def _to_out(self, q: Quotation) -> QuotationOut:
        items = [self._item_out(i) for i in q.items]
        return QuotationOut(
            id=q.id, quotation_number=q.quotation_number, status=q.status,
            effective_status=effective_status(q, self.today()), currency=q.currency, revision=q.current_revision,
            row_version=q.row_version, project_name=q.project_name, project_location=q.project_location,
            client=ClientOut.model_validate(q.client_details), quotation_date=q.quotation_date, valid_until=q.valid_until,
            notes=q.notes, payment_terms=q.payment_terms, terms_and_conditions=q.terms_and_conditions,
            company=CompanySnapshot.model_validate(q.company_snapshot),
            settings=SettingsData.model_validate(q.calculation_settings or {}),
            items=items,
            totals=Totals(
                subtotal=q.subtotal, additional_charges=q.additional_charges, discount=q.discount, taxable_amount=q.taxable_amount,
                tax_amount=q.tax_amount, rounding_adjustment=q.rounding_adjustment, grand_total=q.grand_total,
                material_cost=sum((i.material_cost for i in items), Decimal(0)), profit=sum((i.profit for i in items), Decimal(0)),
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
    def _apply_result(q: Quotation, settings: SettingsData, result: QuotationResult) -> None:
        q.calculation_settings = settings.model_dump(mode="json")
        q.subtotal, q.additional_charges, q.discount = result.subtotal, result.additional_charges, result.discount
        q.taxable_amount, q.tax_amount = result.taxable_amount, result.tax_amount
        q.rounding_adjustment, q.grand_total = result.rounding_adjustment, result.grand_total

    def _sync_materials(
        self, company_id: uuid.UUID, item: QuotationItem, lines: list[MaterialLineIn], amounts: tuple[Decimal, ...], item_index: int,
    ) -> None:
        existing = {m.id: m for m in item.materials}
        rows: list[ItemMaterial] = []
        for position, (line, amount) in enumerate(zip(lines, amounts)):
            row = existing.pop(line.id, None) if line.id else None
            if line.material_id:
                path = f"items.{item_index}.materials.{position}.material_id"
                material = self.materials.get(company_id, line.material_id)
                if material is None:
                    raise AppError("That material isn't in your catalogue.", code="unknown_material", status_code=422,
                                   fields=[{"field": path, "message": "That material isn't in your catalogue."}])
                if row is None and not material.is_active:  # only NEW lines: old quotations may keep using it
                    message = f"{material.name} is inactive. Reactivate it in Materials to use it in a quotation."
                    raise AppError(message, code="material_inactive", status_code=422, fields=[{"field": path, "message": message}])
            if row is None:
                row = ItemMaterial()
            row.position, row.material_id = position, line.material_id
            row.material_name_snapshot, row.description, row.unit_snapshot = line.name, line.description, line.unit
            row.quantity, row.rate_snapshot, row.amount = line.quantity, line.rate, amount
            rows.append(row)
        item.materials = rows  # delete-orphan removes lines that are no longer listed

    def _sync_items(self, company_id: uuid.UUID, q: Quotation, entered: list[ItemIn], result: QuotationResult) -> None:
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
            # What was entered, so the form can be rebuilt exactly (the columns above hold what was calculated).
            m = inp.measurement if inp.pricing_method == "measurement" else None
            item.dimensions = {} if m is None else m.model_dump(mode="json", include={"width", "height", "depth", "length"}, exclude_none=True)
            item.pricing_config = {
                "quantity": None if inp.quantity is None else format(inp.quantity, "f"),
                "measurement": None if m is None else m.model_dump(mode="json", exclude={"width", "height", "depth", "length"}),
                "extra_costs": inp.extra_costs.model_dump(mode="json") if inp.pricing_method == "material" else None,
                "profit_rule": inp.profit_rule.model_dump(mode="json"),
                "rate_includes_profit": inp.rate_includes_profit,
            }
            self._sync_materials(company_id, item, inp.materials if inp.pricing_method == "material" else [], res.line_amounts, position)
            synced.append(item)
        q.items = synced  # delete-orphan removes whatever was left in `existing`

    # ---- use cases ----
    def defaults(self, company_id: uuid.UUID) -> QuotationDefaults:
        company = self._company(company_id)
        d = CompanyDefaults.model_validate(company.settings or {})
        today = self.today()
        return QuotationDefaults(
            quotation_date=today, valid_until=today + timedelta(days=d.quotation_validity_days),
            payment_terms=d.payment_terms, terms_and_conditions=d.terms_and_conditions,
            settings=_company_settings(company.settings),
        )

    def create(self, company_id: uuid.UUID, data: QuotationIn) -> QuotationOut:
        company = self._company(company_id)
        defaults = CompanyDefaults.model_validate(company.settings or {})
        settings = data.settings or _company_settings(company.settings)
        result = calculate(data.items, settings)

        year = self.today().year
        number = format_quotation_number(year, self.repo.next_sequence(company_id, year))
        q = Quotation(
            company_id=company_id, quotation_number=number, status=QuotationStatus.DRAFT.value, currency=defaults.currency,
            company_snapshot=CompanySnapshot(
                name=company.name, address=company.address or "", phone=company.phone or "", email=company.email,
                gstin=company.gstin or "", document_footer=defaults.document_footer, signature=defaults.signature,
            ).model_dump(mode="json"),
        )
        self._apply_header(q, data)
        self._apply_result(q, settings, result)
        self._sync_items(company_id, q, data.items, result)
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
        settings = data.settings or SettingsData.model_validate(q.calculation_settings or {})
        result = calculate(data.items, settings)
        self._apply_header(q, data)
        self._apply_result(q, settings, result)
        self._sync_items(company_id, q, data.items, result)
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
