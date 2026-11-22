"""Material catalogue

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-17
"""
import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "materials",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("brand", sa.String(100), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("specification", sa.String(200), nullable=False, server_default=""),
        sa.Column("unit", sa.String(30), nullable=False),
        sa.Column("cost_rate", sa.Numeric(14, 4), nullable=False),
        sa.Column("selling_rate", sa.Numeric(14, 4)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name="pk_materials"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], name="fk_materials_company_id_companies"),
        sa.CheckConstraint("cost_rate >= 0", name="cost_rate_non_negative"),
        sa.CheckConstraint("selling_rate IS NULL OR selling_rate >= 0", name="selling_rate_non_negative"),
        sa.CheckConstraint("category IN ('plywood','laminate','hardware','other')", name="category_valid"),
    )
    op.create_index(
        "uq_materials_identity", "materials",
        ["company_id", "category", sa.text("lower(name)"), sa.text("lower(brand)"), sa.text("lower(specification)")],
        unique=True,
    )
    op.create_index("ix_materials_company_active", "materials", ["company_id", "is_active"])


def downgrade() -> None:
    op.drop_table("materials")
