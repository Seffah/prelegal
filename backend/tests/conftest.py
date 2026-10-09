from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app


@pytest.fixture(autouse=True)
def tmp_database(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "data" / "prelegal.db"
    monkeypatch.setattr(settings, "database_path", path)
    return path


@pytest.fixture
def client(tmp_database: Path) -> Iterator[TestClient]:
    """A client against a fresh database (the app's startup creates it)."""
    with TestClient(app) as client:
        yield client


def sign_up(client: TestClient, email: str = "jane@acme.com", name: str = "Jane Doe") -> dict:
    response = client.post(
        "/api/auth/signup", json={"name": name, "email": email, "password": "correct horse"}
    )
    assert response.status_code == 201, response.text
    return response.json()


def auth(session: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {session['token']}"}
