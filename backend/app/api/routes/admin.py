from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.seed import generate_large_demo_dataset
from app.api.deps import require_roles

router = APIRouter()


@router.post("/generate-demo-data", status_code=status.HTTP_200_OK)
async def seed_data(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles("ADMIN", "STAFF")),
) -> dict:
    """
    Administrative endpoint to seed a dense, realistic, 30-day corporate dataset (50 products, 20 customers, 100 orders).
    """
    result = await generate_large_demo_dataset(db)
    return result
