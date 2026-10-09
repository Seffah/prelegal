from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # The project-root .env holds shared secrets; backend/.env can override settings.
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    app_name: str = "prelegal API"
    cors_origins: list[str] = ["http://localhost:3000"]
    openrouter_api_key: str = ""
    # Recreated from scratch every time the app starts.
    database_path: Path = Path("data/prelegal.db")
    # Statically exported frontend; served at / when present (i.e. in the Docker image).
    static_dir: Path = Path("static")


settings = Settings()
