import secrets
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # The project-root .env holds shared secrets; backend/.env can override settings.
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    app_name: str = "prelegal API"
    cors_origins: list[str] = ["http://localhost:3000"]
    openrouter_api_key: str = ""
    # Signs auth tokens. A new one each start matches the database, which is also recreated.
    jwt_secret: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    # Recreated from scratch every time the app starts.
    database_path: Path = Path("data/prelegal.db")
    # Common Paper templates (repo-root templates/ in development; copied into the Docker image).
    templates_dir: Path = Path("../templates")
    # Statically exported frontend; served at / when present (i.e. in the Docker image).
    static_dir: Path = Path("static")


settings = Settings()
