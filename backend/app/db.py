import sqlite3
from collections.abc import Iterator
from contextlib import closing
from pathlib import Path

from app.config import settings

SCHEMA = """
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Documents a user downloaded, kept so they can come back to them.
CREATE TABLE saved_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    title TEXT NOT NULL,
    -- JSON of the draft's values and parties
    data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX saved_documents_user ON saved_documents (user_id, updated_at);
"""


def init_db(path: Path) -> None:
    """Create a fresh database, discarding any data from a previous run."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.unlink(missing_ok=True)
    with closing(sqlite3.connect(path)) as conn:
        conn.executescript(SCHEMA)


def get_db() -> Iterator[sqlite3.Connection]:
    """FastAPI dependency: a connection per request.

    Autocommit, so each write is saved before the endpoint returns; FastAPI may run a
    dependency's cleanup only after the response has been sent.
    """
    # FastAPI may run the dependency and the endpoint on different threadpool threads.
    conn = sqlite3.connect(settings.database_path, autocommit=True, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()
