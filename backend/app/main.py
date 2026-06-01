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

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
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
        await seed_demo_data()

    return app


app = create_app()
