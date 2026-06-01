import random
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Customer, Order, OrderItem, Product, User, ActivityLog, Notification
from app.db.session import get_sessionmaker
from app.security import hash_password


async def seed_demo_data() -> None:
    sessionmaker = get_sessionmaker()
    async with sessionmaker() as session:
        demo_users = [
            {
                "full_name": "Admin User",
                "username": "admin",
                "email": "admin@example.com",
                "role": "ADMIN",
            },
            {
                "full_name": "Staff User",
                "username": "staff",
                "email": "staff@example.com",
                "role": "STAFF",
            },
            {
                "full_name": "Customer User",
                "username": "customer",
                "email": "customer@example.com",
                "role": "CUSTOMER",
            },
        ]

        users_by_username: dict[str, User] = {}
        for demo_user in demo_users:
            result = await session.execute(select(User).where(User.username == demo_user["username"]))
            user = result.scalar_one_or_none()
            if user is None:
                user = User(
                    full_name=demo_user["full_name"],
                    username=demo_user["username"],
                    email=demo_user["email"],
                    role=demo_user["role"],
                    password_hash=hash_password("password"),
                )
                session.add(user)
            else:
                user.full_name = demo_user["full_name"]
                user.email = demo_user["email"]
                user.role = demo_user["role"]
                user.password_hash = hash_password("password")
                session.add(user)
            users_by_username[demo_user["username"]] = user

        await session.flush()

        customer_user = users_by_username["customer"]
        customer_result = await session.execute(select(Customer).where(Customer.user_id == customer_user.id))
        customer = customer_result.scalar_one_or_none()
        if customer is None:
            customer = Customer(
                user_id=customer_user.id,
                full_name=customer_user.full_name,
                email=customer_user.email,
                phone_number="555-0100",
            )
            session.add(customer)
        else:
            customer.full_name = customer_user.full_name
            customer.email = customer_user.email
            customer.phone_number = "555-0100"
            session.add(customer)

        product_result = await session.execute(select(Product).where(Product.sku == "SAMPLE-WIDGET"))
        product = product_result.scalar_one_or_none()
        if product is None:
            product = Product(
                name="Sample Widget",
                sku="SAMPLE-WIDGET",
                category="Hardware",
                price=Decimal("19.99"),
                quantity_in_stock=10,
            )
            session.add(product)
        else:
            product.name = "Sample Widget"
            product.category = "Hardware"
            product.price = Decimal("19.99")
            if product.quantity_in_stock < 10:
                product.quantity_in_stock = 10
            session.add(product)

        await session.flush()

        order_result = await session.execute(select(Order).where(Order.customer_id == customer.id))
        order = order_result.scalars().first()
        if order is None:
            order = Order(customer_id=customer.id, total_amount=Decimal("19.99"), status="created")
            session.add(order)
            await session.flush()
            session.add(
                OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    quantity=1,
                    unit_price=product.price,
                    line_total=Decimal("19.99"),
                )
            )
            product.quantity_in_stock -= 1
        await session.commit()


async def generate_large_demo_dataset(db: AsyncSession) -> dict:
    """
    Clears existing products, orders, activity_logs, and notifications (except base user accounts).
    Creates 50 high-fidelity products, 20 customers, and 100 historical orders spread over 30 days.
    """
    # 1. Clear existing dynamic tables
    await db.execute(delete(OrderItem))
    await db.execute(delete(Order))
    await db.execute(delete(Product))
    await db.execute(delete(ActivityLog))
    await db.execute(delete(Notification))
    # We delete customers that are NOT linked to our seeded 'customer' user account
    result = await db.execute(select(User).where(User.username == "customer"))
    customer_user = result.scalar_one_or_none()
    if customer_user:
        await db.execute(delete(Customer).where(Customer.user_id != customer_user.id))
    else:
        await db.execute(delete(Customer))

    await db.flush()

    # 2. Generate 50 Products
    categories = {
        "Electronics": [
            ("Quantum Pro Monitor", 349.99), ("Core Pro Headset", 89.99), ("HyperFlow Router X", 129.99),
            ("Zeta Soundbar 4K", 199.99), ("Aero Mech Keyboard", 119.99), ("Pro Charge Dock", 49.99),
            ("Swift Core SSD 1TB", 109.99), ("Neo Web Camera Pro", 79.99), ("Apex Wireless Mouse", 69.99),
            ("Pixel Glow Lightbar", 59.99), ("Pro Screen Cleaner Kit", 14.99), ("Aero Mic Stand", 34.99),
            ("Titan GPU Cooler", 44.99)
        ],
        "Accessories": [
            ("USB-C Hub Pro 8-in-1", 59.99), ("Wrist Rest Pad Ergo", 24.99), ("Ultra Large Mousepad", 29.99),
            ("MagSafe Power Stand", 39.99), ("Travel Tech Organizer", 34.99), ("Silicon Cable Ties (10x)", 9.99),
            ("Premium Desk Felt Pad", 45.00), ("Vertical Laptop Stand", 32.99), ("Universal Travel Plug", 27.99),
            ("Anti-Blue Light Glasses", 19.99), ("Flexi Tablet Arm Mount", 38.00), ("Premium Coiled Keyboard Cable", 28.50)
        ],
        "Office Supplies": [
            ("Premium Leather Portfolio", 49.99), ("LED Desk Lamp with Qi", 54.99), ("High-Back Mesh Chair Pro", 289.00),
            ("Under-Desk Drawer Mount", 39.99), ("Magnetic Whiteboard", 42.00), ("Matte Black Pen Set", 18.00),
            ("Eco Smart Notebook", 29.99), ("Adjustable Foot Rest", 35.00), ("Compact Paper Shredder", 65.00),
            ("Grip Binder Clips Box", 8.99), ("Desktop Sticky Note Dock", 12.50), ("A5 Dotted Refill Pads", 11.90)
        ],
        "Hardware": [
            ("Carbon Case Pro V3", 149.00), ("HeatSink IceBlock XT", 39.99), ("Silent Fan 120mm (3x)", 49.99),
            ("PSU Gold Modular 750W", 119.99), ("DDR5 Ram Heat Spreaders", 24.99), ("M.2 SSD Heat Dissipator", 15.99),
            ("Vertical GPU Riser Cable", 35.00), ("Acrylic Case Panel Kit", 29.99), ("Anti-Static Wrist Strap", 8.50),
            ("Magnetic Screw Tray", 11.99), ("Thermal Compound Paste", 7.99), ("Compact Tool Screwdriver Kit", 26.50),
            ("Braided PSU Cable Set", 39.00)
        ]
    }

    products = []
    prod_id_counter = 1
    for cat_name, items in categories.items():
        for item_name, base_price in items:
            sku_prefix = cat_name[:3].upper()
            sku_suffix = f"{random.randint(100, 999)}"
            sku = f"SF-{sku_prefix}-{sku_suffix}"
            qty = random.choice([0, 2, 3, 5, 8, 12, 18, 25, 45, 60, 80])
            prod = Product(
                name=item_name,
                sku=sku,
                category=cat_name,
                price=Decimal(f"{base_price:.2f}"),
                quantity_in_stock=qty
            )
            db.add(prod)
            products.append(prod)
            prod_id_counter += 1

    await db.flush()

    # 3. Generate 20 Customers
    names = [
        "Taylor Reed", "Morgan Vance", "Jordan Finch", "Alex Rivera", "Skyler Croft",
        "Casey Sinclair", "Riley Mercer", "Jamie Vance", "Robin Cole", "Reese Sterling",
        "Avery Prescott", "Dana Harris", "Chris Bennett", "Pat Campbell", "Terry Brooks",
        "Kelly Adams", "Shawn Parker", "Kim Evans", "Tracy Foster", "Shannon Clark"
    ]
    emails = [f"{n.lower().replace(' ', '.')}@example.com" for n in names]
    phones = [f"555-01{random.randint(10, 99)}" for _ in range(20)]
    
    customers = []
    # Seed a standard customer linked user profiles first
    for i in range(20):
        # We can create a basic customer row
        c = Customer(
            full_name=names[i],
            email=emails[i],
            phone_number=phones[i]
        )
        db.add(c)
        customers.append(c)

    await db.flush()

    # 4. Generate 100 Orders spread over 30 days
    statuses = ["completed", "shipped", "processing", "created"]
    status_weights = [0.70, 0.15, 0.10, 0.05]
    
    order_items_count = 0
    orders_created = 0
    
    # Let's seed back in time
    now_time = datetime.utcnow()
    for i in range(100):
        cust = random.choice(customers)
        status = random.choices(statuses, weights=status_weights)[0]
        days_ago = random.randint(0, 30)
        hours_ago = random.randint(0, 23)
        minutes_ago = random.randint(0, 59)
        order_date = now_time - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)
        
        # Pick 1-4 random products
        num_items = random.randint(1, 4)
        order_products = random.sample(products, num_items)
        
        items_payload = []
        total_amount = Decimal("0.00")
        for p in order_products:
            qty = random.randint(1, 3)
            # Subtract stock if completed or shipped
            if status in ["completed", "shipped"]:
                p.quantity_in_stock = max(0, p.quantity_in_stock - qty)
            
            line_total = p.price * qty
            total_amount += line_total
            items_payload.append({
                "product_id": p.id,
                "quantity": qty,
                "unit_price": p.price,
                "line_total": line_total
            })
            
        order = Order(
            customer_id=cust.id,
            total_amount=total_amount,
            status=status,
            created_at=order_date,
            updated_at=order_date
        )
        db.add(order)
        await db.flush()
        
        for item in items_payload:
            oi = OrderItem(
                order_id=order.id,
                product_id=item["product_id"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                line_total=item["line_total"]
            )
            db.add(oi)
            order_items_count += 1
            
        orders_created += 1

    # 5. Seed some initial high-quality notifications and activity logs
    logs = [
        ("System Initialization", "System database fully reseeded with V3 Enterprise demo dataset."),
        ("Security Audit", "Admin role checked and authorized backup processes."),
        ("Catalog Hydration", f"Hydrated {len(products)} products across 4 corporate categories."),
        ("Customer Onboarding", f"Enrolled {len(customers)} premium business customers."),
        ("Transactional Simulation", f"Simulated {orders_created} orders history over the last 30 days.")
    ]
    for log_event_type, details in logs:
        db.add(ActivityLog(event=log_event_type, details=details, created_at=now_time - timedelta(minutes=random.randint(1, 60))))
        
    # Seed critical low stock alerts in notifications table
    critical_products = [p for p in products if p.quantity_in_stock <= 3]
    for p in critical_products[:4]:
        db.add(Notification(
            title="Low Stock Alert",
            message=f"Product '{p.name}' (SKU: {p.sku}) is running extremely low. Current stock is {p.quantity_in_stock} units.",
            type="warning",
            created_at=now_time - timedelta(minutes=random.randint(5, 120))
        ))
        
    db.add(Notification(
        title="Database Seeding Successful",
        message="Demo data generator populated all tables successfully.",
        type="success",
        created_at=now_time
    ))
    
    await db.commit()
    
    return {
        "products": len(products),
        "customers": len(customers),
        "orders": orders_created,
        "items": order_items_count,
        "status": "success"
    }