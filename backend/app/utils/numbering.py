"""Quotation number format. Allocation of the sequence itself is in QuotationRepository (needs the database)."""
import re

NUMBER_RE = re.compile(r"^QT-(\d{4})-(\d{4,})$")


def format_quotation_number(year: int, sequence: int) -> str:
    """QT-2026-0001. Sequences beyond 9999 simply grow a digit (QT-2026-10000); they are never truncated."""
    if sequence < 1:
        raise ValueError("Sequence numbers start at 1.")
    return f"QT-{year}-{sequence:04d}"
