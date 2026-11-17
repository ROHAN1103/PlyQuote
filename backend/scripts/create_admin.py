"""Create the initial administrator (and the company, if none exists yet).

Usage (from the backend directory / container):
    python -m scripts.create_admin --username admin --company "Acme Interiors"
The password is read from the ADMIN_PASSWORD env var, or prompted for (hidden).
There is deliberately no public registration endpoint.
"""
import argparse
import getpass
import os
import re
import sys

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.company import Company
from app.models.user import User
from app.repositories.user_repository import UserRepository

USERNAME_RE = re.compile(r"^[a-z0-9._-]{3,64}$")


class AdminCreationError(Exception):
    pass


def create_admin(
    db: Session, username: str, password: str, company_name: str, min_password_length: int
) -> User:
    username = username.strip().lower()
    if not USERNAME_RE.match(username):
        raise AdminCreationError("Username must be 3-64 characters: letters, digits, '.', '_' or '-'.")
    if len(password) < min_password_length:
        raise AdminCreationError(f"Password must be at least {min_password_length} characters.")

    repo = UserRepository(db)
    if repo.get_by_username(username):
        raise AdminCreationError(f"User '{username}' already exists.")

    company = repo.get_first_company()
    if company is None:
        if not company_name.strip():
            raise AdminCreationError("A company name is required for the first administrator.")
        company = repo.add_company(Company(name=company_name.strip(), settings={}))

    user = repo.add_user(User(company_id=company.id, username=username, password_hash=hash_password(password)))
    db.commit()
    return user


def main() -> int:
    parser = argparse.ArgumentParser(description="Create the administrator account.")
    parser.add_argument("--username", required=True)
    parser.add_argument("--company", default=os.environ.get("ADMIN_COMPANY_NAME", ""))
    args = parser.parse_args()

    password = os.environ.get("ADMIN_PASSWORD") or getpass.getpass("Password: ")
    if not os.environ.get("ADMIN_PASSWORD") and getpass.getpass("Confirm password: ") != password:
        print("Passwords do not match.", file=sys.stderr)
        return 1

    settings = get_settings()
    with SessionLocal() as db:
        try:
            user = create_admin(db, args.username, password, args.company, settings.min_password_length)
        except AdminCreationError as exc:
            print(f"Error: {exc}", file=sys.stderr)
            return 1
    print(f"Created administrator '{user.username}'.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
