"""The legal documents prelegal can draft, and the fields each one needs."""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import TypeAdapter

from app.config import settings
from app.models import CamelModel


class Field(CamelModel):
    key: str
    label: str
    description: str
    example: str


class PartyRole(CamelModel):
    key: str
    label: str


class DocumentType(CamelModel):
    id: str
    name: str
    description: str
    template: str
    parties: list[PartyRole]
    fields: list[Field]


class DocumentSummary(CamelModel):
    id: str
    name: str
    description: str


class DocumentDetail(DocumentType):
    """A document type plus the markdown of its Standard Terms."""

    markdown: str


_definitions = Path(__file__).with_name("documents.json").read_bytes()
DOCUMENTS = {d.id: d for d in TypeAdapter(list[DocumentType]).validate_json(_definitions)}


def template_markdown(document: DocumentType) -> str:
    return (settings.templates_dir / document.template).read_text(encoding="utf-8")


router = APIRouter(prefix="/api/documents")


@router.get("")
def list_documents() -> list[DocumentSummary]:
    return [
        DocumentSummary(id=d.id, name=d.name, description=d.description) for d in DOCUMENTS.values()
    ]


@router.get("/{document_id}")
def get_document(document_id: str) -> DocumentDetail:
    document = DOCUMENTS.get(document_id)
    if document is None:
        raise HTTPException(404, "Unknown document type")
    return DocumentDetail(**document.model_dump(), markdown=template_markdown(document))
