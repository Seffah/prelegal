import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.documents import DOCUMENTS
from app.main import app

client = TestClient(app)
CATALOG = json.loads((Path(__file__).parents[2] / "catalog.json").read_text())


def test_every_catalog_template_has_a_document() -> None:
    templates = {d.template for d in DOCUMENTS.values()}
    # The NDA's cover page is generated from the mutual-nda fields rather than its own template.
    expected = {
        Path(t["filename"]).name
        for t in CATALOG["templates"]
        if t["filename"] != "templates/Mutual-NDA-coverpage.md"
    }
    assert templates == expected


def test_definitions_are_consistent() -> None:
    for document in DOCUMENTS.values():
        keys = [f.key for f in document.fields] + [p.key for p in document.parties]
        assert len(keys) == len(set(keys)), document.id
        assert len(document.parties) == 2, document.id


def test_list_documents() -> None:
    response = client.get("/api/documents")

    assert response.status_code == 200
    assert [d["id"] for d in response.json()] == list(DOCUMENTS)
    assert set(response.json()[0]) == {"id", "name", "description"}


def test_get_document_includes_template() -> None:
    response = client.get("/api/documents/service-level-agreement")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Service Level Agreement"
    assert body["markdown"].startswith("# Service Level Agreement")
    assert body["fields"][0] == {
        "key": "agreement",
        "label": "Agreement",
        "description": "The cloud service agreement this SLA belongs to",
        "example": "Cloud Service Agreement dated October 8, 2026",
    }
    assert body["parties"] == [
        {"key": "provider", "label": "Provider"},
        {"key": "customer", "label": "Customer"},
    ]


def test_get_unknown_document() -> None:
    assert client.get("/api/documents/employment-contract").status_code == 404
