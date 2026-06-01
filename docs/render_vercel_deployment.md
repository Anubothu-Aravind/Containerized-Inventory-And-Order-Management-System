# Render & Vercel Production Deployment Guide

This guide details the step-by-step process for deploying the StockFlow V3 application using **Render** for the database/backend and **Vercel** for the frontend.

---

## 🐘 Step 1: Deploy PostgreSQL Database on Render

To store products, order records, and user authentication details:

1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **PostgreSQL**.
3. Configure the database parameters:
   - **Name**: `stockflow-postgres`
   - **Region**: Select a region close to your target users (e.g., `Oregon (US West)` or `Singapore`).
   - **Database Name**: `inventory`
   - **User**: `postgres`
4. Click **Create Database**.
5. Once active, copy the **Internal Database URL** (for backend communication if hosted on Render) or **External Database URL** (for remote schema upgrades).
   - *Example*: `postgresql://postgres:password@dpg-xxxxxx.oregon-postgres.render.com/inventory`

---

## 🐍 Step 2: Deploy Backend Service on Render

You can deploy the backend using the pre-configured **Dockerfile** (recommended for Docker consistency) or the native Python environment.

### Option A: Deploy via Docker (Recommended)
1. In Render, click **New +** and select **Web Service**.
2. Select your GitHub repository: `Anubothu-Aravind/Containerized-Inventory-And-Order-Management-System`.
3. Configure settings:
   - **Name**: `stockflow-backend`
   - **Root Directory**: `backend` (Critical: Tells Render where to find the Dockerfile)
   - **Runtime**: `Docker`
   - **Instance Type**: `Free`
4. Click **Advanced** and add the following **Environment Variables**:
   - `DATABASE_URL` = `<Paste Render PostgreSQL Connection URL, replacing 'postgresql://' with 'postgresql+asyncpg://'>`
     - *Example*: `postgresql+asyncpg://postgres:password@dpg-xxxxxx.render.com/inventory`
   - `AUTH_SECRET_KEY` = `9a2f6b8c5d3e1f0a8b7c6d5e4f3a2b1c` (Generate a secure hex key)
   - `CORS_ORIGINS` = `["https://your-frontend-vercel-url.vercel.app", "http://localhost:5173"]` (Update once frontend URL is ready)
   - `AUTH_TOKEN_EXPIRE_MINUTES` = `60`
5. Click **Create Web Service**. Render will automatically build the backend Docker container and expose a public URL (e.g., `https://stockflow-backend.onrender.com`).

### Option B: Deploy via Native Python Runtime
If you prefer not to build the Docker image:
1. Select **Web Service** in Render and specify the repository.
2. Root Directory: `backend`
3. Runtime: `Python 3`
4. Build Command: `pip install uv && uv pip install --system -r pyproject.toml`
5. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add the environment variables listed in Step 4 above.

---

## ⚙️ Step 3: Run Database Migrations on Render

Before using the application, build the database tables:

1. On your local machine, open your terminal.
2. Temporarily set your local environment `DATABASE_URL` to point to the **External Database URL** of your Render database.
3. Run Alembic head upgrade:
   ```bash
   cd backend
   # Set environment variable (Windows PowerShell)
   $env:DATABASE_URL="postgresql+asyncpg://postgres:password@dpg-xxxxxx-a.oregon-postgres.render.com/inventory"
   
   # Run migrations
   alembic upgrade head
   ```

---

## ⚛️ Step 4: Deploy Frontend Client on Vercel

Vercel is optimized for building and deploying React + Vite assets.

1. Go to your [Vercel Dashboard](https://vercel.com/) and click **Add New** -> **Project**.
2. Select your GitHub repository: `Anubothu-Aravind/Containerized-Inventory-And-Order-Management-System`.
3. Configure the Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select the `frontend` folder.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the following **Environment Variables**:
   - `VITE_API_BASE_URL` = `https://stockflow-backend.onrender.com` (Your deployed Render backend URL)
5. Click **Deploy**. Vercel will build the production bundle and assign a public hosting domain (e.g., `https://stockflow-vercel.vercel.app`).

### 🔀 Route Redirects Configuration
To prevent `404 Not Found` page errors when manually refreshing active browser views (e.g. `/admin/dashboard`), we have pre-configured a client redirect policy in `frontend/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 🔗 Step 5: Post-Deployment Whitelisting

Once your Vercel frontend URL is assigned:
1. Go back to your Render backend web service.
2. Under **Environment**, update the `CORS_ORIGINS` variable:
   ```env
   CORS_ORIGINS=["https://stockflow-vercel.vercel.app", "http://localhost:5173"]
   ```
3. Save changes. Render will automatically redeploy the service, allowing secure frontend-to-backend communication!
