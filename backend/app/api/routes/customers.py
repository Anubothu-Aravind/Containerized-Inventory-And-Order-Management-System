from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.customer import CustomerCreate, CustomerRead, CustomerUpdate
from app.db.models import Customer
from app.db.session import get_db
from app.api.deps import require_roles

router = APIRouter()


@router.post("/", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
async def create_customer(
    payload: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("ADMIN", "STAFF")),
) -> CustomerRead:
    stmt = select(Customer).where(Customer.email == payload.email)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
    customer = Customer(**payload.model_dump())
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer


@router.get("/", response_model=list[CustomerRead])
async def list_customers(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("ADMIN", "STAFF")),
) -> list[CustomerRead]:
    stmt = select(Customer)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/{customer_id}", response_model=CustomerRead)
async def get_customer(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("ADMIN", "STAFF")),
) -> CustomerRead:
    stmt = select(Customer).where(Customer.id == customer_id)
    res = await db.execute(stmt)
    customer = res.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


@router.put("/{customer_id}", response_model=CustomerRead)
async def update_customer(
    customer_id: int,
    payload: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("ADMIN", "STAFF")),
) -> CustomerRead:
    stmt = select(Customer).where(Customer.id == customer_id)
    res = await db.execute(stmt)
    customer = res.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    stmt = select(Customer).where(Customer.email == payload.email, Customer.id != customer_id)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
    customer.full_name = payload.full_name
    customer.email = payload.email
    customer.phone_number = payload.phone_number
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("ADMIN")),
) -> None:
    stmt = select(Customer).where(Customer.id == customer_id)
    res = await db.execute(stmt)
    customer = res.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    await db.delete(customer)
    await db.commit()
    return None
