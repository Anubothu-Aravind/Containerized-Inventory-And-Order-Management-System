from datetime import datetime
from pydantic import BaseModel, ConfigDict


class NotificationBase(BaseModel):
    title: str
    message: str
    type: str = "info"
    is_read: bool = False


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(BaseModel):
    is_read: bool | None = None


class NotificationRead(NotificationBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
