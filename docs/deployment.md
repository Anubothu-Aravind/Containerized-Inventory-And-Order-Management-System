# StockFlow Deployment & Operations Guide

This guide describes how to configure, deploy, operate, and maintain the StockFlow Enterprise SaaS Operations Console.

## Local & Development Deployment

### Prerequisites
- **Docker**: Version 20.10.0 or higher.
- **Docker Compose**: Version 2.0.0 or higher.

### 1. Environment Configuration
Verify that a `.env` file exists at the root of the workspace containing:
```env
POSTGRES_DB=inventory
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/inventory
CORS_ORIGINS=["http://localhost:5173", "http://localhost"]
VITE_API_BASE_URL=http://localhost:8000
ENVIRONMENT=development
AUTH_SECRET_KEY=9a2f6b8c5d3e1f0a8b7c6d5e4f3a2b1c
AUTH_TOKEN_EXPIRE_MINUTES=60
```

### 2. Building and Starting Services
Launch the containerized stack:
```bash
docker compose up --build -d
```
This builds and starts:
- **db**: PostgreSQL 16 server.
- **backend**: FastAPI service running on port `8000`.
- **frontend**: React/Vite development/production server running on port `5173`.

### 3. Database Migration Operations
On startup, the backend automatically performs head database upgrades:
```bash
alembic upgrade head
```
To manually apply migrations or inspect history:
```bash
# View migration history
docker compose exec backend alembic history

# Revert database by one revision
docker compose exec backend alembic downgrade -1

# Generate a new migration script
docker compose exec backend alembic revision --autogenerate -m "description"
```

### 4. Seeding Demo Data
To populate the database for high-fidelity reviews:
- Open the dashboard at `http://localhost:5173`
- Login as `admin` (Password: `password`)
- Open the Command Palette using `Ctrl+K`
- Type `/reseed` and press enter, or trigger `POST /admin/generate-demo-data` via a tool like Swagger or Postman:
```bash
curl -X POST http://localhost:8000/admin/generate-demo-data \
  -H "Authorization: Bearer <your-access-token>"
```

---

## Production Docker Hub Registry Steps

To publish your official backend and frontend images to Docker Hub for remote deployments:

### 1. Build Production Images
```bash
# Tag backend
docker build -t anubothuaravind/stockflow-backend:latest ./backend

# Tag frontend
docker build -t anubothuaravind/stockflow-frontend:latest ./frontend
```

### 2. Push to Docker Hub
```bash
# Login to registry
docker login

# Upload images
docker push anubothuaravind/stockflow-backend:latest
docker push anubothuaravind/stockflow-frontend:latest
```


---

## Troubleshooting & Zero-Touch Resets

If you encounter persistent connection, schema mismatches, or stale seeding records:

### 1. Full Database Wipe
```bash
# Destroy volume data
docker compose down -v

# Relaunch from scratch
docker compose up --build -d
```

### 2. Service Log Inspection
```bash
# Check backend server logs
docker compose logs backend

# Check frontend client logs
docker compose logs frontend
```
