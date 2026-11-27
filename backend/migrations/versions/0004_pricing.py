"""Pricing: taxable amount and rounding on quotations; description and position on material lines

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-23
"""
import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("quotations", sa.Column("taxable_amount", sa.Numeric(14, 2), nullable=False, server_default="0"))
    op.add_column("quotations", sa.Column("rounding_adjustment", sa.Numeric(14, 2), nullable=False, server_default="0"))
    # Phase 3 quotations had no tax, so everything they total was taxable.
    op.execute("UPDATE quotations SET taxable_amount = grand_total")
    op.add_column("item_materials", sa.Column("position", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("item_materials", sa.Column("description", sa.Text(), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("item_materials", "description")
    op.drop_column("item_materials", "position")
    op.drop_column("quotations", "rounding_adjustment")
    op.drop_column("quotations", "taxable_amount")
