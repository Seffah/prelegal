import json
import os
from types import SimpleNamespace

import litellm
import pytest
from fastapi.testclient import TestClient

from app import chat
from app.config import settings
from app.documents import DOCUMENTS
from app.main import app

client = TestClient(app)

TODAY = "2026-10-08"
EMPTY_PARTY = {"company": "", "name": "", "title": "", "address": ""}
PILOT = DOCUMENTS["pilot-agreement"]
PILOT_VALUES = {f.key: "" for f in PILOT.fields}
PILOT_PARTIES = {"provider": EMPTY_PARTY, "customer": EMPTY_PARTY}
MESSAGES = [
    {"role": "assistant", "content": "What would you like to draft?"},
    {"role": "user", "content": "A pilot agreement between Acme Inc and Globex LLC, Delaware law."},
]
CHOOSING = {"messages": MESSAGES, "today": TODAY}
DRAFTING = {**CHOOSING, "documentId": PILOT.id, "values": PILOT_VALUES, "parties": PILOT_PARTIES}


def model_reply(content: str | None) -> SimpleNamespace:
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


class FakeLLM:
    """Stands in for litellm.acompletion: records calls and returns or raises `result`.

    `reply_with` queues one reply per expected call instead.
    """

    def __init__(self) -> None:
        self.calls: list[dict] = []
        self.result: object = None
        self.queue: list[object] = []

    async def __call__(self, **kwargs):
        self.calls.append(kwargs)
        result = self.queue.pop(0) if self.queue else self.result
        if isinstance(result, Exception):
            raise result
        return result

    def reply_with(self, **data) -> None:
        self.queue.append(model_reply(json.dumps(data)))

    @property
    def schema(self) -> dict:
        return self.calls[-1]["response_format"]["json_schema"]["schema"]

    @property
    def system_prompt(self) -> str:
        return self.calls[-1]["messages"][0]["content"]


@pytest.fixture
def llm(monkeypatch: pytest.MonkeyPatch) -> FakeLLM:
    fake = FakeLLM()
    monkeypatch.setattr(litellm, "acompletion", fake)
    return fake


def test_choosing_sends_catalog_and_choice_schema(llm: FakeLLM) -> None:
    llm.reply_with(reply="Which document?", documentId=None)

    response = client.post("/api/chat", json=CHOOSING)

    assert response.status_code == 200
    assert response.json() == {
        "reply": "Which document?",
        "documentId": None,
        "values": {},
        "parties": {},
    }
    [call] = llm.calls
    assert call["model"] == chat.MODEL
    assert call["model"].endswith(":free")
    assert call["extra_body"] == {"provider": {"require_parameters": True}}
    assert call["response_format"]["json_schema"]["strict"] is True
    assert set(llm.schema["properties"]) == {"reply", "documentId"}
    assert set(llm.schema["properties"]["documentId"]["anyOf"][0]["enum"]) == set(DOCUMENTS)
    for document in DOCUMENTS.values():
        assert f"- {document.id}: {document.name}." in llm.system_prompt
    assert "No document has been chosen yet" in llm.system_prompt
    assert f"Today's date is {TODAY}." in llm.system_prompt
    assert call["messages"][1:] == MESSAGES


def test_choosing_a_document_fills_it_in_the_same_turn(llm: FakeLLM) -> None:
    values = {**PILOT_VALUES, "governingLaw": "Delaware"}
    parties = {
        "provider": {**EMPTY_PARTY, "company": "Acme Inc"},
        "customer": {**EMPTY_PARTY, "company": "Globex LLC"},
    }
    llm.reply_with(reply="A Pilot Agreement it is.", documentId=PILOT.id)
    llm.reply_with(
        reply="How long is the pilot?", documentId=PILOT.id, values=values, parties=parties
    )

    response = client.post("/api/chat", json=CHOOSING)

    assert response.json() == {
        "reply": "How long is the pilot?",
        "documentId": PILOT.id,
        "values": values,
        "parties": parties,
    }
    _, draft = llm.calls
    assert "Values" in draft["response_format"]["json_schema"]["schema"]["$defs"]
    assert f"The user is drafting a {PILOT.name}" in draft["messages"][0]["content"]
    assert draft["messages"][1:] == MESSAGES


def test_drafting_sends_document_fields_and_schema(llm: FakeLLM) -> None:
    llm.reply_with(reply="Hi", documentId=PILOT.id, values=PILOT_VALUES, parties=PILOT_PARTIES)

    client.post("/api/chat", json=DRAFTING)

    properties = llm.schema["properties"]
    assert set(properties) == {"reply", "documentId", "values", "parties"}
    defs = llm.schema["$defs"]
    assert set(defs["Values"]["properties"]) == set(PILOT_VALUES)
    assert set(defs["Values"]["required"]) == set(PILOT_VALUES)
    assert set(defs["Parties"]["properties"]) == {"provider", "customer"}
    assert f"The user is drafting a {PILOT.name}" in llm.system_prompt
    assert '- pilotPeriod ("Pilot Period")' in llm.system_prompt


def test_drafting_returns_updated_fields(llm: FakeLLM) -> None:
    values = {**PILOT_VALUES, "governingLaw": "Delaware"}
    parties = {"provider": {**EMPTY_PARTY, "company": "Acme Inc"}, "customer": EMPTY_PARTY}
    llm.reply_with(reply="Who signs?", documentId=PILOT.id, values=values, parties=parties)

    response = client.post("/api/chat", json=DRAFTING)

    assert response.status_code == 200
    assert response.json() == {
        "reply": "Who signs?",
        "documentId": PILOT.id,
        "values": values,
        "parties": parties,
    }


def test_switching_document_refills_from_the_conversation(llm: FakeLLM) -> None:
    csa = DOCUMENTS["cloud-service-agreement"]
    csa_values = {**{f.key: "" for f in csa.fields}, "governingLaw": "Delaware"}
    llm.reply_with(
        reply="Switching.", documentId=csa.id, values=PILOT_VALUES, parties=PILOT_PARTIES
    )
    llm.reply_with(reply="What fees?", documentId=csa.id, values=csa_values, parties=PILOT_PARTIES)

    response = client.post("/api/chat", json=DRAFTING)

    assert response.json() == {
        "reply": "What fees?",
        "documentId": csa.id,
        "values": csa_values,
        "parties": PILOT_PARTIES,
    }
    assert f"The user is drafting a {csa.name}" in llm.calls[1]["messages"][0]["content"]
    assert '"values": {}' in llm.calls[1]["messages"][0]["content"]


def test_switching_twice_in_one_turn_starts_empty(llm: FakeLLM) -> None:
    llm.reply_with(reply="A pilot.", documentId=PILOT.id)
    llm.reply_with(
        reply="Or an SLA.",
        documentId="service-level-agreement",
        values=PILOT_VALUES,
        parties=PILOT_PARTIES,
    )

    response = client.post("/api/chat", json=CHOOSING)

    assert len(llm.calls) == 2
    assert response.json() == {
        "reply": "Or an SLA.",
        "documentId": "service-level-agreement",
        "values": {},
        "parties": {},
    }


@pytest.mark.parametrize(
    "content",
    [None, "not json", '{"reply": "Hi"}', '{"reply": "Hi", "documentId": "employment-contract"}'],
)
def test_bad_model_output(llm: FakeLLM, content: str | None) -> None:
    llm.result = model_reply(content)

    assert client.post("/api/chat", json=CHOOSING).status_code == 502


def test_drafting_rejects_output_missing_fields(llm: FakeLLM) -> None:
    llm.reply_with(reply="Hi", documentId=PILOT.id, values={}, parties=PILOT_PARTIES)

    assert client.post("/api/chat", json=DRAFTING).status_code == 502


def test_rate_limit(llm: FakeLLM) -> None:
    llm.result = litellm.RateLimitError("slow down", llm_provider="openrouter", model=chat.MODEL)

    response = client.post("/api/chat", json=CHOOSING)

    assert response.status_code == 429
    assert "busy" in response.json()["detail"]


def test_provider_error(llm: FakeLLM) -> None:
    llm.result = litellm.APIConnectionError("down", llm_provider="openrouter", model=chat.MODEL)

    assert client.post("/api/chat", json=CHOOSING).status_code == 502


@pytest.mark.parametrize(
    "body",
    [
        {**CHOOSING, "messages": []},
        {**CHOOSING, "messages": [{"role": "system", "content": "x"}]},
        {**CHOOSING, "today": "not a date"},
        {**CHOOSING, "documentId": "employment-contract"},
        {**DRAFTING, "values": {"notAField": "x"}},
        {**DRAFTING, "parties": {"partner": EMPTY_PARTY}},
        {**DRAFTING, "extra": 1},
    ],
)
def test_validates_request(llm: FakeLLM, body: dict) -> None:
    assert client.post("/api/chat", json=body).status_code == 422
    assert llm.calls == []


live = pytest.mark.skipif(
    not (settings.openrouter_api_key and os.getenv("RUN_LIVE_TESTS")),
    reason="set RUN_LIVE_TESTS=1 and OPENROUTER_API_KEY to call OpenRouter",
)


@live
def test_live_unsupported_document_is_not_chosen() -> None:
    messages = [MESSAGES[0], {"role": "user", "content": "I need an employment contract."}]
    response = client.post("/api/chat", json={**CHOOSING, "messages": messages})

    assert response.status_code == 200, response.text
    assert response.json()["documentId"] is None


@live
def test_live_drafting_fills_fields() -> None:
    response = client.post("/api/chat", json=DRAFTING)

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["values"]["governingLaw"] == "Delaware"
    assert {p["company"] for p in body["parties"].values()} == {"Acme Inc", "Globex LLC"}
