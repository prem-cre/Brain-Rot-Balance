from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Brain-Rot Balance API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    allowed_origins: str = "chrome-extension://*"
    default_wallet_minutes: int = 50
    max_wallet_minutes: int = 180
    database_url: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


