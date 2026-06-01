FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    VIRTUAL_ENV=/opt/venv \
    UV_VENV=/opt/venv

RUN pip install --no-cache-dir uv \
    && uv venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY app ./app

EXPOSE 8000

ENV PATH="/app/.venv/bin:/opt/venv/bin:$PATH"

CMD ["sh", "-c", "cd app && alembic upgrade head && cd .. && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"]
