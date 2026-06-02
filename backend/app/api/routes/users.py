from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_roles
from app.db.models import Customer, User
from app.db.session import get_db
from app.schemas.user import UserListRead, UserRoleUpdate

router = APIRouter()


async def _read_user(db: AsyncSession, user: User) -> UserListRead:
    customer_result = await db.execute(select(Customer).where(Customer.user_id == user.id))
    customer = customer_result.scalar_one_or_none()
    return UserListRead(
        id=user.id,
        full_name=user.full_name,
        username=user.username,
        email=user.email,
        role=user.role,
        customer_id=customer.id if customer else None,
        phone_number=customer.phone_number if customer else None,
    )


@router.get("/", response_model=list[UserListRead])
async def list_users(
    db: AsyncSession = Depends(get_db), _current_user: User = Depends(require_roles("ADMIN"))
) -> list[UserListRead]:
    result = await db.execute(select(User).order_by(User.id.asc()))
    users = result.scalars().all()
    return [await _read_user(db, user) for user in users]


@router.patch("/{user_id}/role", response_model=UserListRead)
async def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_roles("ADMIN")),
) -> UserListRead:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if user.role == "ADMIN" and payload.role != "ADMIN":
        admin_count = await db.scalar(select(func.count(User.id)).where(User.role == "ADMIN"))
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last administrator."
            )
            
    user.role = payload.role
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return await _read_user(db, user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(require_roles("ADMIN")),
) -> None:
    if user_id == _current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admins cannot delete their own account."
        )
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    if user.role == "ADMIN":
        admin_count = await db.scalar(select(func.count(User.id)).where(User.role == "ADMIN"))
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last administrator."
            )
            
    customer_result = await db.execute(select(Customer).where(Customer.user_id == user.id))
    customer = customer_result.scalar_one_or_none()
    if customer:
        await db.delete(customer)
    await db.delete(user)
    await db.commit()