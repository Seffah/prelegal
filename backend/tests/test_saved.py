from fastapi.testclient import TestClient

from tests.conftest import auth, sign_up

EMPTY_PARTY = {"company": "", "name": "", "title": "", "address": ""}
DRAFT = {
    "documentId": "pilot-agreement",
    "values": {"governingLaw": "Delaware", "pilotPeriod": "60 days"},
    "parties": {
        "provider": {**EMPTY_PARTY, "company": "Acme Inc"},
        "customer": {**EMPTY_PARTY, "company": "Globex LLC"},
    },
}


def test_save_and_read_back(client: TestClient) -> None:
    headers = auth(sign_up(client))

    created = client.post("/api/my-documents", json=DRAFT, headers=headers)

    assert created.status_code == 201
    saved = created.json()
    assert saved["title"] == "Pilot Agreement: Acme Inc & Globex LLC"
    assert {k: saved[k] for k in DRAFT} == DRAFT
    assert saved["createdAt"] == saved["updatedAt"]
    assert client.get(f"/api/my-documents/{saved['id']}", headers=headers).json() == saved
    assert client.get("/api/my-documents", headers=headers).json() == [
        {k: saved[k] for k in ("id", "documentId", "title", "createdAt", "updatedAt")}
    ]


def test_title_without_companies(client: TestClient) -> None:
    headers = auth(sign_up(client))

    saved = client.post(
        "/api/my-documents", json={"documentId": "ai-addendum"}, headers=headers
    ).json()

    assert saved["title"] == "AI Addendum"


def test_update(client: TestClient) -> None:
    headers = auth(sign_up(client))
    saved = client.post("/api/my-documents", json=DRAFT, headers=headers).json()

    updated = client.put(
        f"/api/my-documents/{saved['id']}",
        json={**DRAFT, "values": {"governingLaw": "California"}},
        headers=headers,
    )

    assert updated.status_code == 200
    assert updated.json()["values"] == {"governingLaw": "California"}
    assert updated.json()["createdAt"] == saved["createdAt"]
    assert updated.json()["updatedAt"] > saved["updatedAt"]
    assert len(client.get("/api/my-documents", headers=headers).json()) == 1


def test_list_is_newest_first(client: TestClient) -> None:
    headers = auth(sign_up(client))
    first = client.post("/api/my-documents", json=DRAFT, headers=headers).json()
    second = client.post(
        "/api/my-documents", json={"documentId": "ai-addendum"}, headers=headers
    ).json()

    listed = client.get("/api/my-documents", headers=headers).json()
    assert [d["id"] for d in listed] == [second["id"], first["id"]]

    client.put(f"/api/my-documents/{first['id']}", json=DRAFT, headers=headers)
    listed = client.get("/api/my-documents", headers=headers).json()
    assert [d["id"] for d in listed] == [first["id"], second["id"]]


def test_users_only_see_their_own_documents(client: TestClient) -> None:
    jane = auth(sign_up(client))
    bob = auth(sign_up(client, email="bob@globex.com", name="Bob"))
    saved = client.post("/api/my-documents", json=DRAFT, headers=jane).json()

    assert client.get("/api/my-documents", headers=bob).json() == []
    assert client.get(f"/api/my-documents/{saved['id']}", headers=bob).status_code == 404
    assert (
        client.put(f"/api/my-documents/{saved['id']}", json=DRAFT, headers=bob).status_code == 404
    )
    assert (
        client.get(f"/api/my-documents/{saved['id']}", headers=jane).json()["values"]
        == (DRAFT["values"])
    )


def test_requires_sign_in(client: TestClient) -> None:
    assert client.get("/api/my-documents").status_code == 401
    assert client.get("/api/my-documents/1").status_code == 401
    assert client.post("/api/my-documents", json=DRAFT).status_code == 401
    assert client.put("/api/my-documents/1", json=DRAFT).status_code == 401


def test_validates_draft(client: TestClient) -> None:
    headers = auth(sign_up(client))

    for body in [
        {**DRAFT, "documentId": None},
        {**DRAFT, "documentId": "employment-contract"},
        {**DRAFT, "values": {"notAField": "x"}},
        {**DRAFT, "parties": {"partner": EMPTY_PARTY}},
    ]:
        assert client.post("/api/my-documents", json=body, headers=headers).status_code == 422


def test_unknown_document(client: TestClient) -> None:
    headers = auth(sign_up(client))

    assert client.get("/api/my-documents/42", headers=headers).status_code == 404
    assert client.put("/api/my-documents/42", json=DRAFT, headers=headers).status_code == 404
