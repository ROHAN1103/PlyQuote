import uuid
from datetime import date

from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models.number_sequence import NumberSequence
from app.models.quotation import Quotation
from app.models.quotation_item import QuotationItem

SORT_COLUMNS = {
    "quotation_date": lambda: Quotation.quotation_date,
    "quotation_number": lambda: Quotation.quotation_number,
    "grand_total": lambda: Quotation.grand_total,
    "updated_at": lambda: Quotation.updated_at,
}


def _escape_like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class QuotationRepository:
    """Every query is scoped to a company."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, company_id: uuid.UUID, quotation_id: uuid.UUID, *, refresh: bool = False) -> Quotation | None:
        stmt = (
            select(Quotation)
            .where(Quotation.id == quotation_id, Quotation.company_id == company_id)
            .options(selectinload(Quotation.items).selectinload(QuotationItem.materials))
        )
        if refresh:
            stmt = stmt.execution_options(populate_existing=True)
        return self.db.scalar(stmt)

    def add(self, quotation: Quotation) -> Quotation:
        self.db.add(quotation)
        self.db.flush()
        return quotation

    def delete(self, quotation: Quotation) -> None:
        self.db.delete(quotation)

    def search(
        self, company_id: uuid.UUID, *, q: str | None, status: str | None, today: date,
        date_from: date | None, date_to: date | None, sort: str, descending: bool, offset: int, limit: int,
    ) -> tuple[list[Quotation], int]:
        stmt = select(Quotation).where(Quotation.company_id == company_id)

        if status == "expired":  # derived, never stored
            stmt = stmt.where(Quotation.status.in_(("finalized", "sent")), Quotation.valid_until < today)
        elif status in ("finalized", "sent"):
            stmt = stmt.where(Quotation.status == status, Quotation.valid_until >= today)
        elif status:
            stmt = stmt.where(Quotation.status == status)

        if date_from:
            stmt = stmt.where(Quotation.quotation_date >= date_from)
        if date_to:
            stmt = stmt.where(Quotation.quotation_date <= date_to)
        if q and q.strip():
            pattern = f"%{_escape_like(q.strip().lower())}%"
            stmt = stmt.where(or_(*(
                func.lower(col).like(pattern, escape="\\")
                for col in (Quotation.quotation_number, Quotation.project_name, Quotation.client_name)
            )))

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        order_col = SORT_COLUMNS[sort]()
        stmt = stmt.order_by(order_col.desc() if descending else order_col.asc(), Quotation.created_at.desc(), Quotation.id)
        return list(self.db.scalars(stmt.offset(offset).limit(limit))), total

    def next_sequence(self, company_id: uuid.UUID, year: int) -> int:
        """Next quotation sequence number for the year.

        One atomic `UPDATE ... SET last_value = last_value + 1 RETURNING last_value`. The database locks the
        row until the surrounding transaction ends, so concurrent creators queue up and each receives a
        distinct number; if the transaction rolls back the number is not consumed. Going through SQL (rather
        than an ORM object) means a cached session object can never hand out a stale value.
        """
        bump = (
            update(NumberSequence)
            .where(NumberSequence.company_id == company_id, NumberSequence.year == year)
            .values(last_value=NumberSequence.last_value + 1)
            .returning(NumberSequence.last_value)
        )
        value = self.db.execute(bump).scalar_one_or_none()
        if value is None:  # first quotation of the year: create the counter, tolerating a concurrent creator
            try:
                with self.db.begin_nested():  # savepoint: losing the insert race must not poison the transaction
                    self.db.add(NumberSequence(company_id=company_id, year=year, last_value=0))
                    self.db.flush()
            except IntegrityError:
                pass
            value = self.db.execute(bump).scalar_one()
        return value
