from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.models import Customer, User
from app.db.session import get_db
from app.schemas.user import (
    AuthResponse,
    PasswordChange,
    UserLogin,
    UserProfileRead,
    UserProfileUpdate,
    UserRegister,
)
from app.security import create_access_token, hash_password, verify_password

router = APIRouter()


async def _build_user_profile(user: User, db: AsyncSession) -> UserProfileRead:
    customer_result = await db.execute(select(Customer).where(Customer.user_id == user.id))
    customer = customer_result.scalar_one_or_none()
    return UserProfileRead(
        id=user.id,
        full_name=user.full_name,
        username=user.username,
        email=user.email,
        role=user.role,
        customer_id=customer.id if customer else None,
        phone_number=customer.phone_number if customer else None,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    stmt = select(User).where((User.username == payload.username) | (User.email == payload.email))
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        if existing.username == payload.username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")

    user = User(
        full_name=payload.full_name,
        username=payload.username,
        email=payload.email,
        role=payload.role,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    if user.role == "CUSTOMER":
        customer = Customer(user_id=user.id, full_name=user.full_name, email=user.email, phone_number="")
        db.add(customer)
        await db.commit()

    access_token = create_access_token(
        user_id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
    )
    return AuthResponse(access_token=access_token, user=await _build_user_profile(user, db))


@router.post("/login", response_model=AuthResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    stmt = select(User).where((User.username == credentials.identifier) | (User.email == credentials.identifier))
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username/email or password")
    access_token = create_access_token(
        user_id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
    )
    return AuthResponse(access_token=access_token, user=await _build_user_profile(user, db))


@router.get("/me", response_model=UserProfileRead)
async def read_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> UserProfileRead:
    return await _build_user_profile(current_user, db)


@router.patch("/me", response_model=UserProfileRead)
async def update_me(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserProfileRead:
    if payload.email and payload.email != current_user.email:
        existing = await db.execute(select(User).where(User.email == payload.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
        current_user.email = payload.email
    if payload.full_name:
        current_user.full_name = payload.full_name
    db.add(current_user)

    customer_result = await db.execute(select(Customer).where(Customer.user_id == current_user.id))
    customer = customer_result.scalar_one_or_none()
    if customer:
        if payload.full_name:
            customer.full_name = payload.full_name
        if payload.email:
            customer.email = payload.email
        if payload.phone_number is not None:
            customer.phone_number = payload.phone_number
        db.add(customer)

    await db.commit()
    await db.refresh(current_user)
    return await _build_user_profile(current_user, db)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current_user.password_hash = hash_password(payload.new_password)
    db.add(current_user)
    await db.commit()
