import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Configure settings to use SQLite before importing session or app
from app.core.config import settings
settings.DATABASE_URL = "sqlite+aiosqlite:///:memory:"

from app.db.session import init_engine, get_db, get_sessionmaker
init_engine()

from app.db.base import Base
from app.main import app
from app.db.models import User, Product, Customer, Order, Notification

@pytest_asyncio.fixture(scope="function")
async def setup_db():
    engine = get_sessionmaker().kw["bind"]
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.mark.asyncio
async def test_health_check(setup_db):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

@pytest.mark.asyncio
async def test_auth_and_user_flows(setup_db):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Register an admin
        reg_payload = {
            "full_name": "Test Admin User",
            "username": "testadmin",
            "email": "testadmin@example.com",
            "password": "securepassword",
            "confirm_password": "securepassword",
            "role": "ADMIN"
        }
        res = await ac.post("/auth/register", json=reg_payload)
        assert res.status_code == 201
        data = res.json()
        assert "access_token" in data
        assert data["user"]["username"] == "testadmin"
        assert data["user"]["role"] == "ADMIN"
        token = data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Login
        login_payload = {
            "identifier": "testadmin",
            "password": "securepassword"
        }
        res = await ac.post("/auth/login", json=login_payload)
        assert res.status_code == 200
        assert "access_token" in res.json()

        # Get profile (/auth/me)
        res = await ac.get("/auth/me", headers=headers)
        assert res.status_code == 200
        assert res.json()["username"] == "testadmin"

        # Try to delete themselves (should fail)
        admin_id = data["user"]["id"]
        res = await ac.delete(f"/users/{admin_id}", headers=headers)
        assert res.status_code == 400
        assert "Admins cannot delete their own account" in res.json()["detail"]

        # Try to demote themselves (since there is only 1 admin, it should fail)
        res = await ac.patch(f"/users/{admin_id}/role", json={"role": "STAFF"}, headers=headers)
        assert res.status_code == 400
        assert "Cannot demote the last administrator" in res.json()["detail"]

        # Register a second admin to check self-demotion is possible when another admin exists
        reg2_payload = {
            "full_name": "Second Admin",
            "username": "admin2",
            "email": "admin2@example.com",
            "password": "securepassword",
            "confirm_password": "securepassword",
            "role": "ADMIN"
        }
        res = await ac.post("/auth/register", json=reg2_payload)
        assert res.status_code == 201
        admin2_id = res.json()["user"]["id"]

        # Now testadmin can demote themselves because admin2 is there
        res = await ac.patch(f"/users/{admin_id}/role", json={"role": "STAFF"}, headers=headers)
        assert res.status_code == 200
        assert res.json()["role"] == "STAFF"

        # Demoting admin2 (who is the last admin) should fail
        # Let's log in as admin2 first to get the correct credentials/headers
        res = await ac.post("/auth/login", json={"identifier": "admin2", "password": "securepassword"})
        admin2_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

        res = await ac.patch(f"/users/{admin2_id}/role", json={"role": "CUSTOMER"}, headers=admin2_headers)
        assert res.status_code == 400
        assert "Cannot demote the last administrator" in res.json()["detail"]

@pytest.mark.asyncio
async def test_business_and_notification_flow(setup_db):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Register Admin
        res = await ac.post("/auth/register", json={
            "full_name": "Admin User", "username": "admin", "email": "admin@example.com", "password": "password", "confirm_password": "password", "role": "ADMIN"
        })
        admin_token = res.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Register Customer
        res = await ac.post("/auth/register", json={
            "full_name": "Customer User", "username": "cust", "email": "cust@example.com", "password": "password", "confirm_password": "password", "role": "CUSTOMER"
        })
        cust_token = res.json()["access_token"]
        cust_headers = {"Authorization": f"Bearer {cust_token}"}
        cust_id = res.json()["user"]["customer_id"]

        # Create Product (as admin)
        res = await ac.post("/products/", json={
            "name": "Widget A",
            "sku": "WID-A",
            "category": "Widgets",
            "price": "19.99",
            "quantity_in_stock": 5
        }, headers=admin_headers)
        assert res.status_code == 201
        prod_id = res.json()["id"]

        # Access products as Customer (should be allowed)
        res = await ac.get("/products/", headers=cust_headers)
        assert res.status_code == 200
        assert len(res.json()) == 1

        # Place Order as customer
        order_payload = {
            "items": [
                {"product_id": prod_id, "quantity": 2}
            ]
        }
        res = await ac.post("/orders/", json=order_payload, headers=cust_headers)
        assert res.status_code == 201
        order_data = res.json()
        assert order_data["total_amount"] == "39.98"
        assert order_data["status"] == "created"

        # Check product quantity was decremented
        res = await ac.get(f"/products/", headers=cust_headers)
        assert res.json()[0]["quantity_in_stock"] == 3

        # Update Order Status (as admin)
        res = await ac.patch(f"/orders/{order_data['id']}/status", json={"status": "completed"}, headers=admin_headers)
        assert res.status_code == 200
        assert res.json()["status"] == "completed"

        # Create order that drops stock to low warning level (stock was 3, ordering 2 will leave 1)
        # Low stock threshold is configured to fire alert when quantity_in_stock <= 2
        # Let's check if the alert notification is triggered
        res = await ac.post("/orders/", json={
            "items": [{"product_id": prod_id, "quantity": 2}]
        }, headers=cust_headers)
        assert res.status_code == 201

        # Verify low-stock warning notification was created
        res = await ac.get("/notifications/", headers=admin_headers)
        assert res.status_code == 200
        notifications = res.json()
        assert len(notifications) > 0
        assert any("low stock" in n["title"].lower() or "warning" in n["type"].lower() for n in notifications)

        # Clear notifications
        res = await ac.post("/notifications/clear-all", json={}, headers=admin_headers)
        assert res.status_code == 200
        res = await ac.get("/notifications/", headers=admin_headers)
        # All cleared/marked read
        assert len(res.json()) == 0 or all(n["is_read"] is True for n in res.json())
