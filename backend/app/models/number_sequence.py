import uuid

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class NumberSequence(Base):
    """Last quotation number issued per company and year. Rows are locked (SELECT ... FOR UPDATE)
    while incrementing, so two people saving at once can never receive the same number."""

    __tablename__ = "number_sequences"

    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("companies.id"), primary_key=True)
    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    last_value: Mapped[int] = mapped_column(Integer, default=0)
