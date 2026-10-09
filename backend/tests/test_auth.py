import sqlite3
from datetime import UTC, datetime, timedelta
from pathlib import Path

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from tests.conftest import auth, sign_up


def test_sign_up_returns_token_and_user(client: TestClient) -> None:
    session = sign_up(client)

    assert session["user"] == {"id": 1, "name": "Jane Doe", "email": "jane@acme.com"}
    assert client.get("/api/auth/me", headers=auth(session)).json() == session["user"]


def test_sign_up_rejects_duplicate_email_ignoring_case(client: TestClient) -> None:
    sign_up(client)

    response = client.post(
        "/api/auth/signup",
        json={"name": "Other", "email": "JANE@acme.com", "password": "another password"},
    )

    assert response.status_code == 409


@pytest.mark.parametrize(
    "body",
    [
        {"name": "Jane", "email": "not-an-email", "password": "correct horse"},
        {"name": "Jane", "email": "jane@acme.com", "password": "short"},
        {"name": "  ", "email": "jane@acme.com", "password": "correct horse"},
        {"email": "jane@acme.com", "password": "correct horse"},
    ],
)
def test_sign_up_validates(client: TestClient, body: dict) -> None:
    assert client.post("/api/auth/signup", json=body).status_code == 422


def test_password_is_hashed(client: TestClient, tmp_database: Path) -> None:
    sign_up(client)

    with sqlite3.connect(tmp_database) as conn:
        [stored] = conn.execute("SELECT password_hash FROM users").fetchone()
    assert stored.startswith("$argon2")
    assert "correct horse" not in stored


def test_sign_in(client: TestClient) -> None:
    sign_up(client)

    response = client.post(
        "/api/auth/signin", json={"email": "Jane@Acme.com", "password": "correct horse"}
    )

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "jane@acme.com"
    assert client.get("/api/auth/me", headers=auth(response.json())).status_code == 200


@pytest.mark.parametrize(
    ("email", "password"),
    [("jane@acme.com", "wrong password"), ("nobody@acme.com", "correct horse")],
)
def test_sign_in_rejects_bad_credentials(client: TestClient, email: str, password: str) -> None:
    sign_up(client)

    response = client.post("/api/auth/signin", json={"email": email, "password": password})

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password."


def token(
    sub: str | None = "1", expires_in: timedelta = timedelta(hours=1), key: str | None = None
) -> str:
    claims = {"exp": datetime.now(UTC) + expires_in}
    if sub is not None:
        claims["sub"] = sub
    return jwt.encode(claims, key or settings.jwt_secret, algorithm="HS256")


@pytest.mark.parametrize(
    "headers",
    [
        {},
        {"Authorization": "Bearer not-a-jwt"},
        {"Authorization": f"Bearer {token(expires_in=timedelta(seconds=-1))}"},
        {"Authorization": f"Bearer {token(key='someone-elses-secret-0123456789abcdef')}"},
        {"Authorization": f"Bearer {token(sub=None)}"},
        {"Authorization": f"Bearer {token(sub='999')}"},
    ],
    ids=["missing", "garbage", "expired", "forged", "no-subject", "unknown-user"],
)
def test_me_rejects_invalid_tokens(client: TestClient, headers: dict) -> None:
    sign_up(client)

    response = client.get("/api/auth/me", headers=headers)

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"
