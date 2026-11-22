"""Quotations, items, number sequences, item materials, furniture templates

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-18
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

JSONType = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def _ts():
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    ]


def _money(name, places=2, default="0"):
    return sa.Column(name, sa.Numeric(14, places), nullable=False, server_default=default)


def upgrade() -> None:
    op.create_table(
        "number_sequences",
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("last_value", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("company_id", "year", name="pk_number_sequences"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], name="fk_number_sequences_company_id_companies"),
    )

    op.create_table(
        "quotations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("quotation_number", sa.String(30), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("current_revision", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("row_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("project_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("project_location", sa.String(300), nullable=False, server_default=""),
        sa.Column("client_name", sa.String(200), nullable=False),
        sa.Column("client_details", JSONType, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("company_snapshot", JSONType, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("calculation_settings", JSONType, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("quotation_date", sa.Date(), nullable=False),
        sa.Column("valid_until", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("payment_terms", sa.Text(), nullable=False, server_default=""),
        sa.Column("terms_and_conditions", sa.Text(), nullable=False, server_default=""),
        _money("subtotal"), _money("additional_charges"), _money("discount"), _money("tax_amount"), _money("grand_total"),
        *_ts(),
        sa.PrimaryKeyConstraint("id", name="pk_quotations"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], name="fk_quotations_company_id_companies"),
        sa.UniqueConstraint("company_id", "quotation_number", name="uq_quotations_company_number"),
        sa.CheckConstraint("status IN ('draft','finalized','sent','accepted','rejected')", name="status_valid"),
        sa.CheckConstraint("valid_until >= quotation_date", name="validity_after_date"),
    )
    op.create_index("ix_quotations_company_status", "quotations", ["company_id", "status"])
    op.create_index("ix_quotations_company_date", "quotations", ["company_id", "quotation_date"])

    op.create_table(
        "quotation_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("quotation_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("item_name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("pricing_method", sa.String(20), nullable=False, server_default="manual"),
        sa.Column("dimensions", JSONType, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("pricing_config", JSONType, nullable=False, server_default=sa.text("'{}'")),
        _money("calculated_quantity", 4), _money("chargeable_quantity", 4),
        sa.Column("unit", sa.String(30), nullable=False),
        _money("unit_rate", 4),
        _money("material_cost"), _money("labour_cost"), _money("additional_cost"),
        _money("profit"), _money("discount"), _money("tax"), _money("total"),
        *_ts(),
        sa.PrimaryKeyConstraint("id", name="pk_quotation_items"),
        sa.ForeignKeyConstraint(["quotation_id"], ["quotations.id"], name="fk_quotation_items_quotation_id_quotations", ondelete="CASCADE"),
        sa.CheckConstraint("pricing_method IN ('manual','measurement','material')", name="method_valid"),
    )
    op.create_index("ix_quotation_items_quotation_position", "quotation_items", ["quotation_id", "position"])

    op.create_table(
        "item_materials",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("quotation_item_id", sa.Uuid(), nullable=False),
        sa.Column("material_id", sa.Uuid()),
        sa.Column("material_name_snapshot", sa.String(200), nullable=False),
        sa.Column("unit_snapshot", sa.String(30), nullable=False),
        sa.Column("quantity", sa.Numeric(14, 4), nullable=False),
        sa.Column("rate_snapshot", sa.Numeric(14, 4), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_item_materials"),
        sa.ForeignKeyConstraint(["quotation_item_id"], ["quotation_items.id"], name="fk_item_materials_quotation_item_id_quotation_items", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["material_id"], ["materials.id"], name="fk_item_materials_material_id_materials", ondelete="SET NULL"),
    )
    op.create_index("ix_item_materials_quotation_item_id", "item_materials", ["quotation_item_id"])

    op.create_table(
        "furniture_templates",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("default_pricing_method", sa.String(20), nullable=False, server_default="manual"),
        sa.Column("default_config", JSONType, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        *_ts(),
        sa.PrimaryKeyConstraint("id", name="pk_furniture_templates"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], name="fk_furniture_templates_company_id_companies"),
    )
    op.create_index("ix_furniture_templates_company_id", "furniture_templates", ["company_id"])
    op.create_index("uq_furniture_templates_name", "furniture_templates", ["company_id", sa.text("lower(name)")], unique=True)


def downgrade() -> None:
    op.drop_table("furniture_templates")
    op.drop_table("item_materials")
    op.drop_table("quotation_items")
    op.drop_table("quotations")
    op.drop_table("number_sequences")
