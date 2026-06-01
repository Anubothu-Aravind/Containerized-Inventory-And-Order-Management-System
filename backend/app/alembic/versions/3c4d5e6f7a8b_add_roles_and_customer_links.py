"""add roles and customer links

Revision ID: 3c4d5e6f7a8b
Revises: 2a1b2c3d4e5f
Create Date: 2026-06-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "3c4d5e6f7a8b"
down_revision = "2a1b2c3d4e5f"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("full_name", sa.String(length=200), nullable=False, server_default=""),
    )
    op.add_column(
        "users",
        sa.Column("role", sa.String(length=20), nullable=False, server_default="CUSTOMER"),
    )
    op.add_column("customers", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_unique_constraint("uq_customers_user_id", "customers", ["user_id"])
    op.create_foreign_key(
        "fk_customers_user_id_users",
        "customers",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade():
    op.drop_constraint("fk_customers_user_id_users", "customers", type_="foreignkey")
    op.drop_constraint("uq_customers_user_id", "customers", type_="unique")
    op.drop_column("customers", "user_id")
    op.drop_column("users", "role")
    op.drop_column("users", "full_name")