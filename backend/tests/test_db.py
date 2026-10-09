import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.db import init_db
from app.main import app


def columns(path: Path, table: str) -> list[str]:
    with sqlite3.connect(path) as conn:
        return [row[1] for row in conn.execute(f"PRAGMA table_info({table})")]


def test_init_db_creates_users_table(tmp_database: Path) -> None:
    init_db(tmp_database)
    assert columns(tmp_database, "users") == ["id", "name", "email", "password_hash", "created_at"]


def test_init_db_creates_saved_documents_table(tmp_database: Path) -> None:
    init_db(tmp_database)
    assert columns(tmp_database, "saved_documents") == [
        "id",
        "user_id",
        "document_type",
        "title",
        "data",
        "created_at",
        "updated_at",
    ]


def test_init_db_discards_previous_data(tmp_database: Path) -> None:
    init_db(tmp_database)
    with sqlite3.connect(tmp_database) as conn:
        conn.execute("INSERT INTO users (name, email, password_hash) VALUES ('A', 'a@b.com', 'x')")

    init_db(tmp_database)

    with sqlite3.connect(tmp_database) as conn:
        assert conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0


def test_email_is_unique_ignoring_case(tmp_database: Path) -> None:
    init_db(tmp_database)
    with sqlite3.connect(tmp_database) as conn:
        conn.execute("INSERT INTO users (name, email, password_hash) VALUES ('A', 'a@b.com', 'x')")
        with pytest.raises(sqlite3.IntegrityError):
            conn.execute(
                "INSERT INTO users (name, email, password_hash) VALUES ('B', 'A@B.com', 'y')"
            )


def test_startup_creates_database(tmp_database: Path) -> None:
    assert not tmp_database.exists()
    with TestClient(app):
        assert columns(tmp_database, "users")
