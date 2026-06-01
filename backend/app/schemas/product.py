from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    name: str = Field(..., max_length=200)
    sku: str = Field(..., max_length=64)
    category: str = Field(default="Uncategorized", max_length=100)
    price: Decimal = Field(..., ge=0)
    quantity_in_stock: int = Field(..., ge=0)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    sku: str | None = Field(default=None, max_length=64)
    category: str | None = Field(default=None, max_length=100)
    price: Decimal | None = Field(default=None, ge=0)
    quantity_in_stock: int | None = Field(default=None, ge=0)


class ProductRead(ProductBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
