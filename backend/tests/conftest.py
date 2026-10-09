from pathlib import Path

import pytest

from app.config import settings


@pytest.fixture(autouse=True)
def tmp_database(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "data" / "prelegal.db"
    monkeypatch.setattr(settings, "database_path", path)
    return path
