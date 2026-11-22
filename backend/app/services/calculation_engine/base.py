"""Calculation engine contracts.

This package is pure Python. It must never import FastAPI, SQLAlchemy, Pydantic or any document library,
so it can be tested alone and reused by the API, the preview endpoint and every exporter.
"""
from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol

from app.utils.rounding import ZERO


class CalculationError(ValueError):
    """The inputs cannot be priced (e.g. zero quantity). Messages are written for end users."""


@dataclass(frozen=True)
class ItemInput:
    pricing_method: str
    quantity: Decimal | None = None
    unit: str = ""
    unit_rate: Decimal | None = None
    # Measurement and material inputs are added in Phase 4.


@dataclass(frozen=True)
class ItemResult:
    """Everything the engine decides about one furniture item. Calculated and chargeable quantity are
    kept apart so a minimum charge (Phase 4) can be shown honestly."""

    pricing_method: str
    calculated_quantity: Decimal
    chargeable_quantity: Decimal
    unit: str
    unit_rate: Decimal
    material_cost: Decimal = ZERO
    labour_cost: Decimal = ZERO
    additional_cost: Decimal = ZERO
    profit: Decimal = ZERO
    discount: Decimal = ZERO
    tax: Decimal = ZERO
    total: Decimal = ZERO


@dataclass(frozen=True)
class QuotationResult:
    items: tuple[ItemResult, ...]
    subtotal: Decimal
    additional_charges: Decimal
    discount: Decimal
    tax_amount: Decimal
    grand_total: Decimal


class ItemCalculator(Protocol):
    def calculate(self, item: ItemInput) -> ItemResult: ...
