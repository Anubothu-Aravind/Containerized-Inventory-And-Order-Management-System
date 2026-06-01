from pydantic import BaseModel, ConfigDict, Field


class CustomerBase(BaseModel):
    full_name: str = Field(..., max_length=200)
    email: str = Field(..., max_length=254)
    phone_number: str = Field(..., max_length=32)


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=200)
    email: str | None = Field(default=None, max_length=254)
    phone_number: str | None = Field(default=None, max_length=32)


class CustomerRead(CustomerBase):
    id: int
    user_id: int | None = None

    model_config = ConfigDict(from_attributes=True)
