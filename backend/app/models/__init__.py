"""Import every model here so Base.metadata (and Alembic) sees them."""
from app.models.company import Company
from app.models.material import Material, MaterialCategory
from app.models.session import LoginAttempt, UserSession
from app.models.user import User

__all__ = ["Material", "MaterialCategory", "Company", "User", "UserSession", "LoginAttempt"]
