"""Foundation: companies, users, sessions, login_attempts

Revision ID: 0001
Revises:
Create Date: 2026-11-16
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

JSONType = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address", sa.Text()),
        sa.Column("phone", sa.String(50)),
        sa.Column("email", sa.String(254)),
        sa.Column("logo_path", sa.String(500)),
        sa.Column("gstin", sa.String(15)),
        sa.Column("settings", JSONType, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name="pk_companies"),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("username", sa.String(64), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], name="fk_users_company_id_companies"),
        sa.UniqueConstraint("username", name="uq_users_username"),
    )
    op.create_index("ix_users_company_id", "users", ["company_id"])
    op.create_table(
        "sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("ip_address", sa.String(64)),
        sa.Column("user_agent", sa.String(300)),
        sa.PrimaryKeyConstraint("id", name="pk_sessions"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_sessions_user_id_users", ondelete="CASCADE"),
        sa.UniqueConstraint("token_hash", name="uq_sessions_token_hash"),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])
    op.create_table(
        "login_attempts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("username", sa.String(64), nullable=False),
        sa.Column("ip_address", sa.String(64)),
        sa.Column("succeeded", sa.Boolean(), nullable=False),
        sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id", name="pk_login_attempts"),
    )
    op.create_index("ix_login_attempts_username", "login_attempts", ["username"])
    op.create_index("ix_login_attempts_ip_address", "login_attempts", ["ip_address"])
    op.create_index("ix_login_attempts_attempted_at", "login_attempts", ["attempted_at"])


def downgrade() -> None:
    op.drop_table("login_attempts")
    op.drop_table("sessions")
    op.drop_table("users")
    op.drop_table("companies")
