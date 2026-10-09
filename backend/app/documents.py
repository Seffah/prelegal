"""The legal documents prelegal can draft, and the fields each one needs."""

from pathlib import Path
from typing import Literal, Self

from fastapi import APIRouter, HTTPException
from pydantic import Field, TypeAdapter, model_validator

from app.config import settings
from app.models import CamelModel


class FieldSpec(CamelModel):
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
    fields: list[FieldSpec]


class DocumentSummary(CamelModel):
    id: str
    name: str
    description: str


class DocumentDetail(DocumentType):
    """A document type plus the markdown of its Standard Terms."""

    markdown: str


_definitions = Path(__file__).with_name("documents.json").read_bytes()
DOCUMENTS = {d.id: d for d in TypeAdapter(list[DocumentType]).validate_json(_definitions)}


DocumentId = Literal[tuple(DOCUMENTS)]


class Party(CamelModel):
    company: str
    name: str = Field(description="Signatory's name")
    title: str = Field(description="Signatory's title")
    address: str = Field(description="Notice address (email or postal)")


class DraftState(CamelModel):
    """A document being drafted. Values and parties are keyed by field and party role."""

    document_id: DocumentId | None = None
    values: dict[str, str] = Field(default_factory=dict)
    parties: dict[str, Party] = Field(default_factory=dict)

    @model_validator(mode="after")
    def check_keys(self) -> Self:
        if self.document_id is None:
            return self
        document = DOCUMENTS[self.document_id]
        if not self.values.keys() <= {f.key for f in document.fields}:
            raise ValueError("Unknown field for this document")
        if not self.parties.keys() <= {p.key for p in document.parties}:
            raise ValueError("Unknown party for this document")
        return self


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
