"""initial

Revision ID: 1f15bd2ddf70
Revises: 
Create Date: 2026-06-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "1f15bd2ddf70"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("sku", sa.String(length=64), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("quantity_in_stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(op.f("ix_products_id"), "products", ["id"], unique=False)
    op.create_index(op.f("ix_products_sku"), "products", ["sku"], unique=False)
    op.create_unique_constraint("uq_products_sku", "products", ["sku"])

    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("phone_number", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(op.f("ix_customers_id"), "customers", ["id"], unique=False)
    op.create_index(op.f("ix_customers_email"), "customers", ["email"], unique=False)
    op.create_unique_constraint("uq_customers_email", "customers", ["email"])

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="created"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(op.f("ix_orders_id"), "orders", ["id"], unique=False)
    op.create_foreign_key("fk_orders_customer_id_customers", "orders", "customers", ["customer_id"], ["id"], ondelete="RESTRICT")

    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("line_total", sa.Numeric(10, 2), nullable=False),
    )
    op.create_index(op.f("ix_order_items_id"), "order_items", ["id"], unique=False)
    op.create_foreign_key("fk_order_items_order_id_orders", "order_items", "orders", ["order_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_order_items_product_id_products", "order_items", "products", ["product_id"], ["id"], ondelete="RESTRICT")


def downgrade():
    op.drop_constraint("fk_order_items_product_id_products", "order_items", type_="foreignkey")
    op.drop_constraint("fk_order_items_order_id_orders", "order_items", type_="foreignkey")
    op.drop_index(op.f("ix_order_items_id"), table_name="order_items")
    op.drop_table("order_items")

    op.drop_constraint("fk_orders_customer_id_customers", "orders", type_="foreignkey")
    op.drop_index(op.f("ix_orders_id"), table_name="orders")
    op.drop_table("orders")

    op.drop_constraint("uq_customers_email", "customers", type_="unique")
    op.drop_index(op.f("ix_customers_email"), table_name="customers")
    op.drop_index(op.f("ix_customers_id"), table_name="customers")
    op.drop_table("customers")

    op.drop_constraint("uq_products_sku", "products", type_="unique")
    op.drop_index(op.f("ix_products_sku"), table_name="products")
    op.drop_index(op.f("ix_products_id"), table_name="products")
    op.drop_table("products")
