"""A signed-in user's saved documents: drafts stored when they download the PDF."""

import json
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException

from app.auth import CurrentUser, Db
from app.documents import DOCUMENTS, DocumentId, DraftState, Party
from app.models import CamelModel


class SavedDraft(DraftState):
    """A draft to save; unlike in the chat, its document must be chosen."""

    document_id: DocumentId


class SavedDocumentSummary(CamelModel):
    id: int
    document_id: DocumentId
    title: str
    created_at: datetime
    updated_at: datetime


class SavedDocument(SavedDocumentSummary):
    values: dict[str, str]
    parties: dict[str, Party]


def title(draft: SavedDraft) -> str:
    """e.g. "Pilot Agreement: Acme Inc & Globex LLC"."""
    name = DOCUMENTS[draft.document_id].name
    companies = [p.company.strip() for p in draft.parties.values() if p.company.strip()]
    return f"{name}: {' & '.join(companies)}" if companies else name


SUMMARY_COLUMNS = "id, document_type AS document_id, title, created_at, updated_at"

router = APIRouter(prefix="/api/my-documents")


@router.get("")
def list_saved(user: CurrentUser, db: Db) -> list[SavedDocumentSummary]:
    rows = db.execute(
        f"SELECT {SUMMARY_COLUMNS} FROM saved_documents WHERE user_id = ? "
        "ORDER BY updated_at DESC, id DESC",
        (user.id,),
    )
    return [SavedDocumentSummary(**row) for row in rows]


@router.get("/{saved_id}")
def get_saved(saved_id: int, user: CurrentUser, db: Db) -> SavedDocument:
    row = db.execute(
        f"SELECT {SUMMARY_COLUMNS}, data FROM saved_documents WHERE id = ? AND user_id = ?",
        (saved_id, user.id),
    ).fetchone()
    if row is None:
        raise HTTPException(404, "Document not found")
    saved = dict(row)
    draft = json.loads(saved.pop("data"))
    return SavedDocument(**saved, **draft)


def data(draft: SavedDraft) -> str:
    return draft.model_dump_json(include={"values", "parties"})


@router.post("", status_code=201)
def create_saved(draft: SavedDraft, user: CurrentUser, db: Db) -> SavedDocument:
    now = datetime.now(UTC).isoformat()
    cursor = db.execute(
        "INSERT INTO saved_documents (user_id, document_type, title, data, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (user.id, draft.document_id, title(draft), data(draft), now, now),
    )
    return get_saved(cursor.lastrowid, user, db)


@router.put("/{saved_id}")
def update_saved(saved_id: int, draft: SavedDraft, user: CurrentUser, db: Db) -> SavedDocument:
    cursor = db.execute(
        "UPDATE saved_documents SET document_type = ?, title = ?, data = ?, updated_at = ? "
        "WHERE id = ? AND user_id = ?",
        (
            draft.document_id,
            title(draft),
            data(draft),
            datetime.now(UTC).isoformat(),
            saved_id,
            user.id,
        ),
    )
    if cursor.rowcount == 0:
        raise HTTPException(404, "Document not found")
    return get_saved(saved_id, user, db)
