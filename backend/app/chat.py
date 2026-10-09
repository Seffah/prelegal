"""AI chat that drafts a Mutual NDA by filling in its Cover Page fields."""

import json
import logging
from datetime import date
from typing import Literal

import litellm
import openai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.config import settings

# Free OpenRouter endpoint with JSON Schema support (see the openrouter-free skill).
MODEL = "openrouter/nvidia/nemotron-3-super-120b-a12b:free"

logger = logging.getLogger(__name__)


class CamelModel(BaseModel):
    """Uses the frontend's camelCase field names and forbids unknown fields."""

    model_config = ConfigDict(alias_generator=to_camel, validate_by_name=True, extra="forbid")


class Party(CamelModel):
    name: str
    title: str
    company: str
    address: str


class NdaFields(CamelModel):
    """Mirrors NdaData in frontend/app/nda/types.ts."""

    purpose: str
    effective_date: str = Field(description="ISO date (YYYY-MM-DD), or empty if unknown")
    mnda_term_type: Literal["expires", "continues"]
    mnda_term_years: int = Field(ge=1, le=99)
    confidentiality_type: Literal["years", "perpetual"]
    confidentiality_years: int = Field(ge=1, le=99)
    governing_law: str
    jurisdiction: str
    modifications: str
    party1: Party
    party2: Party


class ChatMessage(CamelModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(CamelModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=100)
    nda: NdaFields
    # The user's local date, so relative dates like "today" resolve in their timezone.
    today: date


class ChatResponse(CamelModel):
    reply: str = Field(description="Your next message to the user")
    nda: NdaFields = Field(description="All NDA fields, updated with what the user has told you")


SYSTEM_PROMPT = """\
You are a friendly legal drafting assistant helping the user complete a Common Paper \
Mutual Non-Disclosure Agreement (MNDA). The user sees a live preview of the agreement \
that updates from the fields you return.

The Cover Page fields are:
- purpose: how Confidential Information may be used
- effectiveDate: when the MNDA takes effect, as YYYY-MM-DD
- mndaTermType: "expires" (after mndaTermYears years) or "continues" (until terminated)
- confidentialityType: "years" (protected for confidentialityYears years) or "perpetual"
- governingLaw: the US state whose laws govern, e.g. "Delaware"
- jurisdiction: the courts with jurisdiction, e.g. "courts located in New Castle, DE"
- modifications: any changes to the Standard Terms, or empty for none
- party1 and party2: each party's company, signatory name, signatory title and notice \
address (email or postal)

How to behave:
- Work through the missing fields, asking about one or two at a time in plain language. \
Until every field is filled in, end each reply with a specific question about the next \
missing field. Briefly explain a term if the user seems unsure.
- Always return every field. Update any field the user gives information about, even one \
that already has a value (the purpose starts as a generic default). Keep the rest unchanged.
- Only record what the user actually told you; never invent names, companies or addresses. \
Leave unknown text fields empty.
- Resolve relative dates such as "today" or "next Monday" using today's date.
- When every field is filled in, summarise the key terms and tell the user they can download \
the PDF from the preview.
- Write short, conversational replies. Simple Markdown (bold, bullet lists) is fine. Call \
fields by everyday names (say "effective date", not "effectiveDate").
- Only help with this NDA. If asked for legal advice, suggest consulting a lawyer.

Today's date is {today}.

Current field values:
{nda}
"""


RESPONSE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "nda_chat_turn",
        "strict": True,
        "schema": ChatResponse.model_json_schema(),
    },
}


async def complete(messages: list[dict[str, str]]) -> ChatResponse:
    response = await litellm.acompletion(
        model=MODEL,
        messages=messages,
        api_key=settings.openrouter_api_key,
        response_format=RESPONSE_FORMAT,
        extra_body={"provider": {"require_parameters": True}},
    )
    content = response.choices[0].message.content
    if not content:
        raise ValueError("The model returned no content")
    return ChatResponse.model_validate_json(content)


router = APIRouter(prefix="/api")


@router.post("/chat")
async def chat(request: ChatRequest) -> ChatResponse:
    system = SYSTEM_PROMPT.format(
        today=request.today.isoformat(),
        nda=json.dumps(request.nda.model_dump(by_alias=True), indent=2),
    )
    messages = [{"role": "system", "content": system}]
    messages += [m.model_dump() for m in request.messages]
    try:
        return await complete(messages)
    except litellm.RateLimitError as e:
        logger.warning("OpenRouter rate limit: %s", e)
        raise HTTPException(429, "The AI is busy right now. Please try again shortly.") from e
    # ValueError includes Pydantic's ValidationError for malformed model output.
    except (openai.OpenAIError, ValueError) as e:
        logger.exception("AI chat failed")
        raise HTTPException(502, "The AI could not respond. Please try again.") from e
