"""Import every model here so Base.metadata (and Alembic) sees them."""
from app.models.company import Company
from app.models.furniture_template import FurnitureTemplate
from app.models.item_material import ItemMaterial
from app.models.material import Material, MaterialCategory
from app.models.number_sequence import NumberSequence
from app.models.quotation import Quotation, QuotationStatus
from app.models.quotation_item import QuotationItem
from app.models.session import LoginAttempt, UserSession
from app.models.user import User

__all__ = [
    "Company", "FurnitureTemplate", "ItemMaterial", "Material", "MaterialCategory", "NumberSequence",
    "Quotation", "QuotationItem", "QuotationStatus", "User", "UserSession", "LoginAttempt",
]
