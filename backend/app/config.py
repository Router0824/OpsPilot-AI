from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    app_name: str = "OpsPilot AI"
    demo_mode: bool = True
    database_url: str = f"sqlite:///{ROOT / 'data' / 'opspilot.db'}"
    cors_origins: str = "http://localhost:3000"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    azure_openai_api_key: str = ""
    azure_openai_endpoint: str = ""
    azure_openai_deployment: str = ""
    azure_openai_api_version: str = "2024-10-21"

    model_config = SettingsConfigDict(env_file=(ROOT.parent / ".env", ROOT / ".env"), extra="ignore")

    @property
    def origins(self) -> List[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def provider(self) -> str:
        if self.azure_openai_api_key and self.azure_openai_endpoint:
            return "azure"
        if self.openai_api_key:
            return "openai"
        return "demo"

    @property
    def sqlalchemy_database_url(self) -> str:
        """Normalize provider URLs while preserving explicit SQLAlchemy drivers."""
        if self.database_url.startswith("postgres://"):
            return self.database_url.replace("postgres://", "postgresql+psycopg://", 1)
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
