from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import customers, health, orders, products, auth, users, admin, notifications, activity_logs
from app.core.config import settings
from app.db.seed import seed_demo_data


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Ensure production Vercel domains and local hosts are always allowed
    origins = list(settings.CORS_ORIGINS)
    for origin in [
        "https://containerized-inventory-and-order-m.vercel.app",
        "https://stockflow-vercel.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ]:
        if origin not in origins:
            origins.append(origin)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"https://containerized-inventory-and-order-m(-[a-zA-Z0-9-]+)?\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(products.router, prefix="/products", tags=["products"])
    app.include_router(customers.router, prefix="/customers", tags=["customers"])
    app.include_router(orders.router, prefix="/orders", tags=["orders"])
    app.include_router(auth.router, prefix="/auth", tags=["auth"])
    app.include_router(users.router, prefix="/users", tags=["users"])
    app.include_router(admin.router, prefix="/admin", tags=["admin"])
    app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
    app.include_router(activity_logs.router, prefix="/activity-logs", tags=["activity-logs"])

    @app.on_event("startup")
    async def _seed_demo_users() -> None:
        from sqlalchemy import select, func
        from app.db.models import Product
        from app.db.session import get_sessionmaker
        from app.db.seed import generate_large_demo_dataset
        
        # 1. Seed base users and sample widgets first
        await seed_demo_data()
        
        # 2. Check if product database is empty to trigger full V3 seeder automatically
        sessionmaker = get_sessionmaker()
        async with sessionmaker() as db:
            product_count = await db.scalar(select(func.count(Product.id)))
            # If database has no products (or only the single base sample-widget), run full generation
            if product_count is None or product_count <= 1:
                await generate_large_demo_dataset(db)

    return app


app = create_app()
