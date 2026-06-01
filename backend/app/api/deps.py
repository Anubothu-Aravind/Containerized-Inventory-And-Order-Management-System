from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User
from app.db.session import get_db
from app.security import decode_access_token

security = HTTPBearer(auto_error=False)

ROLE_ADMIN = "ADMIN"
ROLE_STAFF = "STAFF"
ROLE_CUSTOMER = "CUSTOMER"


def _unauthorized() -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise _unauthorized()
    token_payload = decode_access_token(credentials.credentials)
    if not token_payload:
        raise _unauthorized()
    result = await db.execute(select(User).where(User.id == token_payload.user_id))
    user = result.scalar_one_or_none()
    if not user or user.role != token_payload.role:
        raise _unauthorized()
    return user


def require_roles(*roles: str):
    async def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return dependency
