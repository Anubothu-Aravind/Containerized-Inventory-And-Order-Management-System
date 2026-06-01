# Architecture

## Overview
The system is composed of three services orchestrated by Docker Compose:

- Frontend: React + Vite, served as static assets by Nginx.
- Backend: FastAPI application served by Uvicorn.
- Database: PostgreSQL with a named volume for persistence.

## Data Flow
1. Users interact with the React frontend.
2. The frontend calls the FastAPI backend over HTTP.
3. The backend reads and writes data in PostgreSQL.

## Runtime Services
- `frontend` container: Serves the production build on port 80 (mapped to 5173).
- `backend` container: API service on port 8000.
- `db` container: PostgreSQL on port 5432.

## Configuration
Environment variables are centralized in the root `.env` file (see `.env.example`).

Key variables:
- `DATABASE_URL`: Async SQLAlchemy connection string.
- `CORS_ORIGINS`: Comma-separated list of allowed frontend origins.
- `VITE_API_BASE_URL`: Backend URL baked into the frontend build.

## Repository Layout
```
backend/
  app/
    api/
    core/
    db/
    schemas/
frontend/
  src/
  Dockerfile
  nginx.conf
docs/
  architecture.md
  api-docs.md
  deployment.md
```

Note: Replace the ER diagram placeholder in `docs/er-diagram.png` with an updated model diagram once the schema is finalized.
