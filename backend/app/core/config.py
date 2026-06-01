from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Inventory & Order Management API"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = ""
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    DATABASE_URL: str | None = None
    AUTH_SECRET_KEY: str = "dev-secret-key-change-me"
    AUTH_TOKEN_EXPIRE_MINUTES: int = 60 * 8

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def split_origins(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


settings = Settings()
