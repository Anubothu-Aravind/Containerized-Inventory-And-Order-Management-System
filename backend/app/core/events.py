from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import ActivityLog, Notification


async def log_event(
    db: AsyncSession,
    event_type: str,
    details: str,
    create_notification: bool = False,
    notification_type: str = "info",
    notification_title: str | None = None,
) -> None:
    """
    Central event bus utility.
    1. Creates a persistent audit log in the activity_logs table.
    2. Optionally creates a persistent notification in the notifications table.
    """
    # 1. Audit Log entry
    activity = ActivityLog(event=event_type, details=details)
    db.add(activity)
    
    # 2. Notification entry
    if create_notification:
        title = notification_title or event_type
        notif = Notification(
            title=title,
            message=details,
            type=notification_type,
            is_read=False
        )
        db.add(notif)
    
    # We flush so that they get IDs/generated values but let the caller commit
    await db.flush()
