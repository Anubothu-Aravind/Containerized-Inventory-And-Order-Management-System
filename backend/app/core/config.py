from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Inventory & Order Management API"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = ""
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://containerized-inventory-and-order-m.vercel.app",
        "https://stockflow-vercel.vercel.app",
    ]
    DATABASE_URL: str | None = None
    AUTH_SECRET_KEY: str = "dev-secret-key-change-me"
    AUTH_TOKEN_EXPIRE_MINUTES: int = 60 * 8

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def split_origins(cls, value):
        if isinstance(value, str):
            import json
            value_stripped = value.strip()
            if value_stripped.startswith("[") and value_stripped.endswith("]"):
                try:
                    return [item.strip() for item in json.loads(value_stripped) if item.strip()]
                except Exception:
                    pass
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


settings = Settings()
