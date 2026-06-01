from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

_engine = None
_sessionmaker = None


def init_engine() -> None:
    global _engine, _sessionmaker
    if _engine is None:
        if not settings.DATABASE_URL:
            raise RuntimeError("DATABASE_URL is not set")
        _engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
        _sessionmaker = async_sessionmaker(_engine, expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    if _sessionmaker is None:
        init_engine()
    async with _sessionmaker() as session:
        yield session


def get_sessionmaker():
    if _sessionmaker is None:
        init_engine()
    return _sessionmaker
