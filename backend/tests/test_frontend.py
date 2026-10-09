import importlib
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app.main
from app.config import settings


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    static = tmp_path / "static"
    (static / "nda").mkdir(parents=True)
    (static / "index.html").write_text("home")
    (static / "nda" / "index.html").write_text("nda")
    (static / "404.html").write_text("not found")
    monkeypatch.setattr(settings, "static_dir", static)
    # The frontend is mounted at import time, so rebuild the app with the new setting.
    module = importlib.reload(app.main)
    yield TestClient(module.app)
    monkeypatch.undo()
    importlib.reload(app.main)


def test_serves_index(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.text == "home"


def test_serves_page_with_and_without_trailing_slash(client: TestClient) -> None:
    assert client.get("/nda/").text == "nda"
    assert client.get("/nda").text == "nda"


def test_api_takes_precedence(client: TestClient) -> None:
    assert client.get("/api/health").json() == {"status": "ok"}


def test_unknown_path_returns_404_page(client: TestClient) -> None:
    response = client.get("/missing")
    assert response.status_code == 404
    assert response.text == "not found"
