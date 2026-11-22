import uuid

from sqlalchemy.orm import Session

from app.models.company import Company


class CompanyRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, company_id: uuid.UUID) -> Company | None:
        return self.db.get(Company, company_id)
