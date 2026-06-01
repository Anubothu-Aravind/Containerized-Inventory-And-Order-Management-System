from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import ActivityLog
from app.schemas.activity_log import ActivityLogRead
from app.api.deps import require_roles

router = APIRouter()


@router.get("/", response_model=list[ActivityLogRead])
async def list_activity_logs(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles("ADMIN", "STAFF")),
) -> list[ActivityLogRead]:
    """
    Get recent 100 system audit logs, sorted by timestamp descending.
    """
    stmt = select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(100)
    res = await db.execute(stmt)
    return res.scalars().all()
