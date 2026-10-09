import json
import os
from types import SimpleNamespace

import litellm
import pytest
from fastapi.testclient import TestClient

from app import chat
from app.config import settings
from app.main import app

client = TestClient(app)

EMPTY_PARTY = {"name": "", "title": "", "company": "", "address": ""}
NDA = {
    "purpose": "Evaluating a business relationship.",
    "effectiveDate": "",
    "mndaTermType": "expires",
    "mndaTermYears": 1,
    "confidentialityType": "years",
    "confidentialityYears": 1,
    "governingLaw": "",
    "jurisdiction": "",
    "modifications": "",
    "party1": EMPTY_PARTY,
    "party2": EMPTY_PARTY,
}
TODAY = "2026-10-08"
MESSAGES = [
    {"role": "assistant", "content": "Who are the parties?"},
    {"role": "user", "content": "Acme Inc and Globex LLC, under Delaware law."},
]
BODY = {"messages": MESSAGES, "nda": NDA, "today": TODAY}


def model_reply(content: str | None) -> SimpleNamespace:
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


class FakeLLM:
    """Stands in for litellm.acompletion: records calls and returns or raises `result`."""

    def __init__(self) -> None:
        self.calls: list[dict] = []
        self.result: object = None

    async def __call__(self, **kwargs):
        self.calls.append(kwargs)
        if isinstance(self.result, Exception):
            raise self.result
        return self.result


@pytest.fixture
def llm(monkeypatch: pytest.MonkeyPatch) -> FakeLLM:
    fake = FakeLLM()
    monkeypatch.setattr(litellm, "acompletion", fake)
    return fake


def updated_nda() -> dict:
    return {
        **NDA,
        "governingLaw": "Delaware",
        "party1": {**EMPTY_PARTY, "company": "Acme Inc"},
        "party2": {**EMPTY_PARTY, "company": "Globex LLC"},
    }


def test_chat_returns_reply_and_updated_fields(llm: FakeLLM) -> None:
    reply = {"reply": "Who signs for Acme?", "nda": updated_nda()}
    llm.result = model_reply(json.dumps(reply))

    response = client.post("/api/chat", json=BODY)

    assert response.status_code == 200
    assert response.json() == reply


def test_chat_sends_context_and_strict_schema(llm: FakeLLM) -> None:
    llm.result = model_reply(json.dumps({"reply": "Hi", "nda": NDA}))

    client.post("/api/chat", json=BODY)

    [call] = llm.calls
    assert call["model"] == chat.MODEL
    assert call["model"].endswith(":free")
    assert call["extra_body"] == {"provider": {"require_parameters": True}}
    schema = call["response_format"]["json_schema"]
    assert schema["strict"] is True
    assert set(schema["schema"]["properties"]) == {"reply", "nda"}
    system, *history = call["messages"]
    assert system["role"] == "system"
    assert '"purpose": "Evaluating a business relationship."' in system["content"]
    assert f"Today's date is {TODAY}." in system["content"]
    assert history == MESSAGES


@pytest.mark.parametrize("content", [None, "not json", '{"reply": "Hi"}'])
def test_chat_rejects_bad_model_output(llm: FakeLLM, content: str | None) -> None:
    llm.result = model_reply(content)

    response = client.post("/api/chat", json=BODY)

    assert response.status_code == 502


def test_chat_reports_rate_limit(llm: FakeLLM) -> None:
    llm.result = litellm.RateLimitError("slow down", llm_provider="openrouter", model=chat.MODEL)

    response = client.post("/api/chat", json=BODY)

    assert response.status_code == 429
    assert "busy" in response.json()["detail"]


def test_chat_reports_provider_errors(llm: FakeLLM) -> None:
    llm.result = litellm.APIConnectionError("down", llm_provider="openrouter", model=chat.MODEL)

    response = client.post("/api/chat", json=BODY)

    assert response.status_code == 502


@pytest.mark.parametrize(
    "body",
    [
        {**BODY, "messages": []},
        {**BODY, "messages": [{"role": "system", "content": "x"}]},
        {**BODY, "nda": {**NDA, "mndaTermType": "forever"}},
        {**BODY, "nda": {**NDA, "extra": 1}},
        {**BODY, "today": "not a date"},
    ],
)
def test_chat_validates_request(llm: FakeLLM, body: dict) -> None:
    response = client.post("/api/chat", json=body)

    assert response.status_code == 422
    assert llm.calls == []


@pytest.mark.skipif(not settings.openrouter_api_key, reason="needs OPENROUTER_API_KEY")
@pytest.mark.skipif(
    not os.getenv("RUN_LIVE_TESTS"), reason="set RUN_LIVE_TESTS=1 to call OpenRouter"
)
def test_chat_live() -> None:
    response = client.post("/api/chat", json=BODY)

    assert response.status_code == 200, response.text
    nda = response.json()["nda"]
    assert nda["governingLaw"] == "Delaware"
    assert {nda["party1"]["company"], nda["party2"]["company"]} == {"Acme Inc", "Globex LLC"}
