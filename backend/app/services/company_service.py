"""Company profile, quotation defaults and logo.

Defaults live in companies.settings as validated JSON; missing keys fall back to model defaults,
so adding a setting later never needs a data migration.
"""
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import AppError, NotFoundError
from app.models.company import Company
from app.repositories.company_repository import CompanyRepository
from app.schemas.company import CompanyDefaults, CompanyOut, CompanyUpdate
from app.utils.images import InvalidImageError, sanitize_logo
from app.utils.storage import LogoStorage


class CompanyService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.db = db
        self.settings = settings
        self.repo = CompanyRepository(db)
        self.storage = LogoStorage(settings.upload_dir)

    def _get(self, company_id: uuid.UUID) -> Company:
        company = self.repo.get(company_id)
        if company is None:
            raise NotFoundError("Company not found.")
        return company

    def to_out(self, company: Company) -> CompanyOut:
        return CompanyOut(
            id=company.id, name=company.name, address=company.address or "", phone=company.phone or "",
            email=company.email, gstin=company.gstin or "",
            has_logo=bool(self.storage.resolve(company.logo_path)),
            logo_version=str(int(company.updated_at.timestamp())) if company.logo_path else None,
            defaults=CompanyDefaults.model_validate(company.settings or {}),
        )

    def get(self, company_id: uuid.UUID) -> CompanyOut:
        return self.to_out(self._get(company_id))

    def update(self, company_id: uuid.UUID, data: CompanyUpdate) -> CompanyOut:
        company = self._get(company_id)
        company.name = data.name
        company.address = data.address or None
        company.phone = data.phone or None
        company.email = data.email
        company.gstin = data.gstin or None
        company.settings = data.defaults.model_dump(mode="json")  # new dict: JSON column change is detected
        self.db.commit()
        self.db.refresh(company)
        return self.to_out(company)

    # ---- logo ----
    def set_logo(self, company_id: uuid.UUID, raw: bytes) -> CompanyOut:
        company = self._get(company_id)
        if len(raw) > self.settings.max_logo_bytes:
            mb = self.settings.max_logo_bytes // (1024 * 1024)
            raise AppError(f"The image is too large. The limit is {mb} MB.", code="file_too_large", status_code=413)
        try:
            png = sanitize_logo(raw)
        except InvalidImageError as exc:
            raise AppError(str(exc), code="invalid_image", status_code=422) from exc

        old = company.logo_path
        company.logo_path = self.storage.save(company.id, png)
        self.db.commit()
        self.db.refresh(company)
        self.storage.delete(old)
        return self.to_out(company)

    def clear_logo(self, company_id: uuid.UUID) -> CompanyOut:
        company = self._get(company_id)
        old = company.logo_path
        company.logo_path = None
        self.db.commit()
        self.db.refresh(company)
        self.storage.delete(old)
        return self.to_out(company)

    def logo_file(self, company_id: uuid.UUID) -> Path:
        path = self.storage.resolve(self._get(company_id).logo_path)
        if path is None:
            raise NotFoundError("No logo has been uploaded.", code="no_logo")
        return path
