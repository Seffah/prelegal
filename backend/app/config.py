from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "prelegal API"
    cors_origins: list[str] = ["http://localhost:3000"]
    # Recreated from scratch every time the app starts.
    database_path: Path = Path("data/prelegal.db")
    # Statically exported frontend; served at / when present (i.e. in the Docker image).
    static_dir: Path = Path("static")


settings = Settings()
