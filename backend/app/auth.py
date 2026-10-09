"""Sign up and sign in with email and password; requests authenticate with a JWT bearer token."""

import sqlite3
from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from pydantic import EmailStr, Field, StringConstraints

from app.config import settings
from app.db import get_db
from app.models import CamelModel

ALGORITHM = "HS256"
TOKEN_LIFETIME = timedelta(days=7)

password_hash = PasswordHash.recommended()


class User(CamelModel):
    id: int
    name: str
    email: str


class SignUp(CamelModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class SignIn(CamelModel):
    email: EmailStr
    password: str


class Session(CamelModel):
    token: str
    user: User


def create_token(user_id: int) -> str:
    claims = {"sub": str(user_id), "exp": datetime.now(UTC) + TOKEN_LIFETIME}
    return jwt.encode(claims, settings.jwt_secret, algorithm=ALGORITHM)


Db = Annotated[sqlite3.Connection, Depends(get_db)]
bearer = HTTPBearer(auto_error=False)


def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)], db: Db
) -> User:
    """FastAPI dependency: the signed-in user, or 401."""
    unauthorized = HTTPException(401, "Please sign in.", headers={"WWW-Authenticate": "Bearer"})
    if credentials is None:
        raise unauthorized
    try:
        claims = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=[ALGORITHM],
            options={"require": ["sub", "exp"]},
        )
    except jwt.InvalidTokenError as e:
        raise unauthorized from e
    row = db.execute("SELECT id, name, email FROM users WHERE id = ?", (claims["sub"],)).fetchone()
    if row is None:
        raise unauthorized
    return User(**row)


CurrentUser = Annotated[User, Depends(current_user)]

router = APIRouter(prefix="/api/auth")


@router.post("/signup", status_code=201)
def sign_up(body: SignUp, db: Db) -> Session:
    try:
        cursor = db.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (body.name, body.email, password_hash.hash(body.password)),
        )
    except sqlite3.IntegrityError as e:
        raise HTTPException(409, "An account with this email already exists.") from e
    user = User(id=cursor.lastrowid, name=body.name, email=body.email)
    return Session(token=create_token(user.id), user=user)


@router.post("/signin")
def sign_in(body: SignIn, db: Db) -> Session:
    row = db.execute(
        "SELECT id, name, email, password_hash FROM users WHERE email = ?", (body.email,)
    ).fetchone()
    if row is None or not password_hash.verify(body.password, row["password_hash"]):
        raise HTTPException(401, "Incorrect email or password.")
    user = User(id=row["id"], name=row["name"], email=row["email"])
    return Session(token=create_token(user.id), user=user)


@router.get("/me")
def me(user: CurrentUser) -> User:
    return user
