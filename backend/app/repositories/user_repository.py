import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.user import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return self.db.get(User, user_id)

    def get_by_username(self, username: str) -> User | None:
        return self.db.scalar(select(User).where(User.username == username.strip().lower()))

    def get_first_company(self) -> Company | None:
        return self.db.scalar(select(Company).order_by(Company.created_at).limit(1))

    def add_company(self, company: Company) -> Company:
        self.db.add(company)
        self.db.flush()
        return company

    def add_user(self, user: User) -> User:
        self.db.add(user)
        self.db.flush()
        return user
