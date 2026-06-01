from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ActivityLogBase(BaseModel):
    event: str
    details: str | None = None


class ActivityLogCreate(ActivityLogBase):
    pass


class ActivityLogRead(ActivityLogBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
