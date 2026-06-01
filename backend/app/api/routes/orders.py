from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.schemas.order import OrderCreate, OrderRead, OrderSummary
from app.db.models import Order, OrderItem, Product, Customer, User
from app.db.session import get_db
from app.api.deps import get_current_user, require_roles, ROLE_CUSTOMER

router = APIRouter()

class OrderStatusUpdate(BaseModel):
    status: str


@router.post("/", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OrderRead:
    try:
        customer_id = payload.customer_id
        if current_user.role == ROLE_CUSTOMER:
            customer_result = await db.execute(select(Customer).where(Customer.user_id == current_user.id))
            linked_customer = customer_result.scalar_one_or_none()
            if not linked_customer:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Customer profile not found")
            customer_id = linked_customer.id

        res = await db.execute(select(Customer).where(Customer.id == customer_id))
        customer = res.scalar_one_or_none()
        if not customer:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Customer not found")

        # lock products
        product_ids = [item.product_id for item in payload.items]
        stmt = select(Product).where(Product.id.in_(product_ids)).with_for_update()
        res = await db.execute(stmt)
        products = {p.id: p for p in res.scalars().all()}

        items = []
        total_amount = 0
        for item in payload.items:
            product = products.get(item.product_id)
            if not product:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Product {item.product_id} not found")
            if product.quantity_in_stock < item.quantity:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Insufficient stock for product {product.id}")
            unit_price = product.price
            line_total = unit_price * item.quantity
            total_amount += line_total
            items.append({"product_id": product.id, "quantity": item.quantity, "unit_price": unit_price, "line_total": line_total, "product_obj": product})

        order = Order(customer_id=customer_id, total_amount=total_amount)
        db.add(order)
        await db.flush()

        # create order items and decrement stock
        for it in items:
            oi = OrderItem(order_id=order.id, product_id=it["product_id"], quantity=it["quantity"], unit_price=it["unit_price"], line_total=it["line_total"])
            db.add(oi)
            # decrement stock
            prod = it["product_obj"]
            prod.quantity_in_stock = prod.quantity_in_stock - it["quantity"]
            db.add(prod)

        await db.flush()
        from app.core.events import log_event
        await log_event(
            db,
            event_type="Order Created",
            details=f"Order #{order.id} placed by Customer ID: {customer_id} (Total: ₹{total_amount:.2f}).",
            create_notification=True,
            notification_type="success",
            notification_title="New Order Received"
        )
        
        # Check low stock thresholds
        for it in items:
            p = it["product_obj"]
            if p.quantity_in_stock <= 3:
                await log_event(
                    db,
                    event_type="Product Updated",
                    details=f"Product '{p.name}' (SKU: {p.sku}) stock critically low: {p.quantity_in_stock} remaining.",
                    create_notification=True,
                    notification_type="warning",
                    notification_title="Low Stock Alert"
                )

        await db.commit()
        res = await db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.id == order.id)
        )
        created_order = res.scalar_one()
        return created_order
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise


@router.get("/", response_model=list[OrderSummary])
async def list_orders(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[OrderSummary]:
    query = select(Order)
    if current_user.role == ROLE_CUSTOMER:
        customer_result = await db.execute(select(Customer).where(Customer.user_id == current_user.id))
        linked_customer = customer_result.scalar_one_or_none()
        if not linked_customer:
            return []
        query = query.where(Order.customer_id == linked_customer.id)
    res = await db.execute(query)
    return res.scalars().all()


@router.get("/my-orders", response_model=list[OrderSummary])
async def list_my_orders(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[OrderSummary]:
    customer_result = await db.execute(select(Customer).where(Customer.user_id == current_user.id))
    linked_customer = customer_result.scalar_one_or_none()
    if not linked_customer:
        return []
    res = await db.execute(select(Order).where(Order.customer_id == linked_customer.id))
    return res.scalars().all()


@router.get("/{order_id}", response_model=OrderRead)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)) -> OrderRead:
    res = await db.execute(select(Order).options(selectinload(Order.items)).where(Order.id == order_id))
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if current_user.role == ROLE_CUSTOMER:
        customer_result = await db.execute(select(Customer).where(Customer.user_id == current_user.id))
        linked_customer = customer_result.scalar_one_or_none()
        if not linked_customer or order.customer_id != linked_customer.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("ADMIN", "STAFF")),
) -> None:
    try:
        res = await db.execute(
            select(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.product))
            .where(Order.id == order_id)
        )
        order = res.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        for it in order.items:
            prod = it.product
            prod.quantity_in_stock = prod.quantity_in_stock + it.quantity
            db.add(prod)
        await db.delete(order)
        await db.flush()
        from app.core.events import log_event
        await log_event(
            db,
            event_type="Order Cancelled",
            details=f"Order #{order_id} was deleted/cancelled. Stock returned to inventory.",
            create_notification=True,
            notification_type="info",
            notification_title="Order Cancelled"
        )
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise

    return None


@router.patch("/{order_id}/status", response_model=OrderRead)
async def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles("ADMIN", "STAFF")),
) -> OrderRead:
    res = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    old_status = order.status
    order.status = payload.status
    db.add(order)
    await db.flush()
    from app.core.events import log_event
    await log_event(
        db,
        event_type="Order Updated",
        details=f"Order #{order_id} status changed from '{old_status}' to '{payload.status}'.",
        create_notification=True,
        notification_type="success" if payload.status == "completed" else "info",
        notification_title="Order Flow Update"
    )
    await db.commit()
    
    # Reload order to return fresh attributes
    res = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )
    order = res.scalar_one()
    return order
