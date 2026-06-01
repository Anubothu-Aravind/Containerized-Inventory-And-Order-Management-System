from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

RoleName = Literal["ADMIN", "STAFF", "CUSTOMER"]


class UserRegister(BaseModel):
    full_name: str = Field(..., max_length=200)
    username: str = Field(..., max_length=100)
    email: EmailStr = Field(..., max_length=254)
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)
    role: RoleName = "CUSTOMER"

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Password confirmation does not match")
        return self


class UserLogin(BaseModel):
    identifier: str = Field(..., min_length=1, max_length=254)
    password: str = Field(..., min_length=1)


class PasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Password confirmation does not match")
        return self


class UserProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=200)
    email: EmailStr | None = Field(default=None, max_length=254)
    phone_number: str | None = Field(default=None, max_length=32)


class UserRoleUpdate(BaseModel):
    role: RoleName


class UserRead(BaseModel):
    id: int
    full_name: str
    username: str
    email: str
    role: RoleName

    model_config = ConfigDict(from_attributes=True)


class UserProfileRead(UserRead):
    customer_id: int | None = None
    phone_number: str | None = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileRead


class UserListRead(UserProfileRead):
    pass
