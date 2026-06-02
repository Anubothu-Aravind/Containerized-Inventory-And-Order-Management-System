# StockFlow — Setup Guide

Complete developer reference for running, configuring, and deploying the StockFlow inventory and order management platform.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Environment Variables](#environment-variables)
4. [Quick Start (Docker)](#quick-start-docker)
5. [Local Development (Without Docker)](#local-development-without-docker)
6. [Default Demo Accounts](#default-demo-accounts)
7. [Checkout Workflow](#checkout-workflow)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 24+ | Full-stack container orchestration |
| [Node.js](https://nodejs.org/) | 18+ | Frontend dev server |
| [Python](https://python.org/) | 3.12+ | Backend (FastAPI) |
| [uv](https://github.com/astral-sh/uv) | latest | Python package manager |
| [Git](https://git-scm.com/) | 2.40+ | Source control |

---

## Project Structure

```
├── backend/              # FastAPI + SQLAlchemy + PostgreSQL
│   ├── app/
│   │   ├── routers/      # API route handlers
│   │   ├── models.py     # SQLAlchemy ORM models
│   │   ├── schemas.py    # Pydantic request/response schemas
│   │   ├── database.py   # Async database connection
│   │   └── main.py       # FastAPI app entry point
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/             # React + Vite SPA
│   ├── src/
│   │   ├── AppSaaS.jsx   # Main application component (all views + cart)
│   │   ├── api/          # API client (fetch wrapper + auth helpers)
│   │   ├── components/   # Reusable UI components
│   │   └── styles/       # Global CSS design system
│   ├── Dockerfile
│   └── vite.config.js
├── docker-compose.yml    # Three-service orchestration (db, backend, frontend)
├── .env                  # Local environment variables (not committed)
├── .env.example          # Template — copy this to .env
└── SETUP.md              # This file
```

---

## Environment Variables

### 1. Copy the example file

```bash
cp .env.example .env
```

### 2. Fill in your values

```env
# PostgreSQL Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=inventory

# Backend connection string (uses Docker service name "db" as host)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/inventory

# Runtime mode
ENVIRONMENT=development
DEBUG=true

# CORS — add all frontend origins separated by commas inside the JSON array
CORS_ORIGINS=["https://your-app.vercel.app","https://your-preview.vercel.app","http://localhost:5173","http://localhost:3000"]

# Frontend API base URL (used at build time by Vite)
VITE_API_BASE_URL=http://localhost:8000
```

### Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_USER` | ✅ | PostgreSQL username |
| `POSTGRES_PASSWORD` | ✅ | PostgreSQL password |
| `POSTGRES_DB` | ✅ | Database name |
| `DATABASE_URL` | ✅ | Full async SQLAlchemy connection string |
| `ENVIRONMENT` | ✅ | `development` or `production` |
| `DEBUG` | ❌ | Set `true` for verbose backend logging |
| `CORS_ORIGINS` | ✅ | JSON array of allowed frontend origins |
| `VITE_API_BASE_URL` | ✅ | Backend API base URL used by the React frontend |

> **Important:** `CORS_ORIGINS` must be a valid JSON array string, e.g.:
> ```
> CORS_ORIGINS=["http://localhost:5173","https://myapp.vercel.app"]
> ```

> **Important:** `VITE_API_BASE_URL` is a **build-time** variable. For Docker builds, it is passed as a build argument and baked into the frontend bundle. Changing it after the build requires a rebuild.

---

## Quick Start (Docker)

The easiest way to run the full stack — PostgreSQL, FastAPI backend, and React frontend — with a single command.

### Step 1 — Configure environment

```bash
cp .env.example .env
# Edit .env with your values (see above)
```

### Step 2 — Build and start all services

```bash
docker compose up --build
```

This will:
- Start a **PostgreSQL 16** database on port `5432`
- Build and start the **FastAPI backend** on port `8000`
- Build and start the **React frontend** (served via Nginx) on port `5173`

### Step 3 — Access the app

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |

### Step 4 — Seed demo data (optional)

Log in as **admin** and use the Command Palette (`Ctrl+K`) → type `reseed` → run **"Reseed System Demo Data"**.

This generates:
- 50 products across categories
- 20 customer profiles
- 100 historical orders distributed over 30 days

### Stopping services

```bash
docker compose down          # Stop containers
docker compose down -v       # Stop containers and remove volumes (wipes DB)
```

---

## Local Development (Without Docker)

For faster iteration during development, run the backend and frontend directly on your machine.

### Backend

```bash
cd backend

# Install uv (if not installed)
pip install uv

# Create virtual environment and install dependencies
uv sync

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Set your DATABASE_URL to a local Postgres instance
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/inventory

# Run the development server
uvicorn app.main:app --reload --port 8000
```

> The backend requires a running PostgreSQL instance. You can start just the database via Docker:
> ```bash
> docker compose up db
> ```

### Frontend

```bash
cd frontend

# Install Node dependencies
npm install

# Start the Vite dev server
npm run dev
```

The frontend runs at **http://localhost:5173** and proxies API calls to `http://localhost:8000` (set via `VITE_API_BASE_URL` in `.env`).

---

## Default Demo Accounts

After the database is seeded, use these credentials on the login page:

| Role | Username | Password | Access |
|------|----------|----------|--------|
| **Admin** | `admin` | `password` | Full platform access — all modules, user management, reports |
| **Staff** | `staff` | `password` | Operations access — products, orders, customers |
| **Customer** | `customer` | `password` | Self-service — product catalog, cart, own orders |

---

## Checkout Workflow

The customer-facing checkout flow is a **4-step sliding drawer** accessible via the **Cart** button in the top navigation bar or the floating cart button (bottom-right).

### Flow Overview

```
[Catalog] → Add to Cart → [Cart Drawer Opens]
    │
    ▼
Step 1 · Cart Review
    Review items, adjust quantities, remove products
    │
    ▼
Step 2 · Assign Customer   ← Admin/Staff only (skipped for Customer role)
    Select which customer profile this order belongs to
    │
    ▼
Step 3 · Payment Details
    Enter simulated card info (no real transactions)
    Card number, expiry, CVV, cardholder name
    │
    ▼
Step 4 · Confirm & Place Order
    Review full order summary, confirm total, submit
    │
    ▼
Order Placed ✅
    View Order Details or Continue Shopping
```

### Role Behaviour

| Role | Steps | Customer Selection |
|------|-------|--------------------|
| `CUSTOMER` | Cart → Payment → Confirm | Automatic (self) |
| `STAFF` / `ADMIN` | Cart → Assign Customer → Payment → Confirm | Manual — choose from dropdown |

### Cart State

- Cart items **persist across navigation** — adding to cart on the Catalog page and then visiting Orders does not clear the cart.
- Cart is cleared automatically after a successful order is placed.
- The floating cart button (bottom-right) shows a live item count badge.
- The top-bar **Cart** button also shows the current count.

---

## Deployment

### Backend → Render

1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your GitHub repository.
3. Set **Root Directory** to `backend`.
4. Set **Build Command**: `pip install uv && uv sync`
5. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
6. Add these **Environment Variables** in the Render dashboard:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Render PostgreSQL connection string |
| `CORS_ORIGINS` | `["https://your-vercel-app.vercel.app","http://localhost:5173"]` |
| `ENVIRONMENT` | `production` |

### Frontend → Vercel

1. Import the repository on [Vercel](https://vercel.com).
2. Set **Framework Preset** to `Vite`.
3. Set **Root Directory** to `frontend`.
4. Add this **Environment Variable** in the Vercel dashboard:

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://your-render-backend.onrender.com` |

5. Add a `vercel.json` rewrite to handle SPA routing (already included in repo):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

### Docker Hub (Production Images)

Build and push production images manually:

```bash
# Backend
docker build -t yourdockerhub/stockflow-backend:latest ./backend
docker push yourdockerhub/stockflow-backend:latest

# Frontend (pass build arg)
docker build \
  --build-arg VITE_API_BASE_URL=https://your-backend.onrender.com \
  -t yourdockerhub/stockflow-frontend:latest ./frontend
docker push yourdockerhub/stockflow-frontend:latest
```

---

## Troubleshooting

### `CORS error` on login

Ensure your frontend origin is listed in `CORS_ORIGINS` **exactly** (including `https://` and no trailing slash):

```env
CORS_ORIGINS=["https://your-app.vercel.app","http://localhost:5173"]
```

Then restart the backend container:
```bash
docker compose restart backend
```

### `Connection refused` to backend

- Verify the backend is running: `docker compose ps`
- Check `VITE_API_BASE_URL` points to the correct host and port
- For local dev, confirm the backend is on port `8000`

### `Database not initialised` / migration errors

Run the database container alone first, then restart backend:
```bash
docker compose up db
# Wait for healthy, then:
docker compose up backend
```

### Frontend shows blank page

- Check browser DevTools Console for JS errors
- Verify `VITE_API_BASE_URL` is set correctly (must not include trailing `/`)
- For Vercel: confirm the `vercel.json` rewrites rule exists in `frontend/vercel.json`

### Port conflicts

Change the host-side ports in `docker-compose.yml`:
```yaml
ports:
  - "8001:8000"   # Backend on 8001 instead of 8000
```
Then update `VITE_API_BASE_URL=http://localhost:8001`.

---

## Live URLs

| Service | URL |
|---------|-----|
| Production Frontend | https://containerized-inventory-and-order-m.vercel.app |
| Production Backend API | https://stockflow-backend.onrender.com |
| Swagger Docs | https://stockflow-backend.onrender.com/docs |
