from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
from app.db.models import Product
from app.db.session import get_db
from app.api.deps import require_roles

router = APIRouter()


@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_roles("ADMIN", "STAFF")),
) -> ProductRead:
    stmt = select(Product).where(Product.sku == payload.sku)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU already exists")
    product = Product(**payload.model_dump())
    db.add(product)
    await db.flush()
    from app.core.events import log_event
    await log_event(
        db,
        event_type="Product Created",
        details=f"Product '{product.name}' (SKU: {product.sku}) was added to catalog with {product.quantity_in_stock} units.",
        create_notification=True,
        notification_type="success",
        notification_title="Catalog Update"
    )
    await db.commit()
    await db.refresh(product)
    return product


@router.get("/", response_model=list[ProductRead])
async def list_products(db: AsyncSession = Depends(get_db)) -> list[ProductRead]:
    stmt = select(Product)
    res = await db.execute(stmt)
    items = res.scalars().all()
    return items


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)) -> ProductRead:
    stmt = select(Product).where(Product.id == product_id)
    res = await db.execute(stmt)
    product = res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("ADMIN", "STAFF")),
) -> ProductRead:
    stmt = select(Product).where(Product.id == product_id)
    res = await db.execute(stmt)
    product = res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    # check SKU uniqueness if changed
    if payload.sku and payload.sku != product.sku:
        stmt2 = select(Product).where(Product.sku == payload.sku)
        res2 = await db.execute(stmt2)
        if res2.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU already exists")
    old_qty = product.quantity_in_stock
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    db.add(product)
    await db.flush()
    from app.core.events import log_event
    log_details = f"Product '{product.name}' (SKU: {product.sku}) details were updated."
    create_notif = False
    notif_type = "info"
    
    if payload.quantity_in_stock is not None and payload.quantity_in_stock != old_qty:
        log_details = f"Product '{product.name}' (SKU: {product.sku}) stock updated from {old_qty} to {product.quantity_in_stock}."
        if product.quantity_in_stock <= 3:
            create_notif = True
            notif_type = "warning"
            log_details += " (🔴 Low Stock warning active)"
            
    await log_event(
        db,
        event_type="Product Updated",
        details=log_details,
        create_notification=create_notif,
        notification_type=notif_type,
        notification_title="Inventory Stock Alert" if create_notif else None
    )
    await db.commit()
    await db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("ADMIN")),
) -> None:
    stmt = select(Product).where(Product.id == product_id)
    res = await db.execute(stmt)
    product = res.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    prod_name = product.name
    prod_sku = product.sku
    await db.delete(product)
    from app.core.events import log_event
    await log_event(
        db,
        event_type="Product Deleted",
        details=f"Product '{prod_name}' (SKU: {prod_sku}) was permanently removed from Catalog.",
        create_notification=True,
        notification_type="info",
        notification_title="Catalog Update"
    )
    await db.commit()
    return None
