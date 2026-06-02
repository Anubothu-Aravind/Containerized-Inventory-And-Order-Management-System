from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import Notification
from app.schemas.notification import NotificationRead, NotificationUpdate
from app.api.deps import require_roles

router = APIRouter()


@router.get("/", response_model=list[NotificationRead])
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles("ADMIN", "STAFF")),
) -> list[NotificationRead]:
    """
    Get recent 50 persistent system alerts, sorted by timestamp descending.
    """
    stmt = select(Notification).order_by(Notification.created_at.desc()).limit(50)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.patch("/{notif_id}/read", response_model=NotificationRead)
async def mark_as_read(
    notif_id: int,
    payload: NotificationUpdate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles("ADMIN", "STAFF")),
) -> NotificationRead:
    """
    Mark a specific notification as read.
    """
    stmt = select(Notification).where(Notification.id == notif_id)
    res = await db.execute(stmt)
    notif = res.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    
    if payload.is_read is not None:
        notif.is_read = payload.is_read
        db.add(notif)
        await db.commit()
        await db.refresh(notif)
    
    return notif


@router.post("/clear-all", status_code=status.HTTP_200_OK)
async def clear_all_notifications(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles("ADMIN", "STAFF")),
) -> dict:
    """
    Mark all persistent alerts as read.
    """
    stmt = update(Notification).where(Notification.is_read.is_(False)).values(is_read=True)
    await db.execute(stmt)
    await db.commit()
    return {"status": "success", "message": "All notifications marked as read"}
