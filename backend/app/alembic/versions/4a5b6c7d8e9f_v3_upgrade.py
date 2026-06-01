"""V3 enterprise SaaS upgrade

Revision ID: 4a5b6c7d8e9f
Revises: 3c4d5e6f7a8b
Create Date: 2026-06-01 23:45:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "4a5b6c7d8e9f"
down_revision = "3c4d5e6f7a8b"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add category column to products table
    op.add_column(
        "products",
        sa.Column("category", sa.String(length=100), nullable=False, server_default="Uncategorized"),
    )

    # 2. Create activity_logs table
    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Integer(), primary_key=True, index=True, autoincrement=True),
        sa.Column("event", sa.String(length=255), nullable=False),
        sa.Column("details", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # 3. Create notifications table
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True, index=True, autoincrement=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.String(length=1000), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False, server_default="info"),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table("notifications")
    op.drop_table("activity_logs")
    op.drop_column("products", "category")
