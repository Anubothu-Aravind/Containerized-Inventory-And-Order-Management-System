from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., ge=1)


class OrderCreate(BaseModel):
    customer_id: int | None = None
    items: list[OrderItemCreate] = Field(default_factory=list)


class OrderItemRead(BaseModel):
    product_id: int
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class OrderSummary(BaseModel):
    id: int
    customer_id: int
    total_amount: Decimal
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderRead(OrderSummary):
    items: list[OrderItemRead] = Field(default_factory=list)
