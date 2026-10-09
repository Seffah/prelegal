"""AI chat that picks a legal document with the user and fills in its fields."""

import json
import logging
from datetime import date
from typing import Literal, Self

import litellm
import openai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, create_model, model_validator

from app.config import settings
from app.documents import DOCUMENTS, DocumentType
from app.models import CamelModel

# Free OpenRouter endpoint with JSON Schema support (see the openrouter-free skill).
MODEL = "openrouter/nvidia/nemotron-3-super-120b-a12b:free"

logger = logging.getLogger(__name__)

DocumentId = Literal[tuple(DOCUMENTS)]


class Party(CamelModel):
    company: str
    name: str = Field(description="Signatory's name")
    title: str = Field(description="Signatory's title")
    address: str = Field(description="Notice address (email or postal)")


class ChatMessage(CamelModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatState(CamelModel):
    """The document being drafted. Values and parties are keyed by field and party role."""

    document_id: DocumentId | None = None
    values: dict[str, str] = Field(default_factory=dict)
    parties: dict[str, Party] = Field(default_factory=dict)


class ChatRequest(ChatState):
    messages: list[ChatMessage] = Field(min_length=1, max_length=100)
    # The user's local date, so relative dates like "today" resolve in their timezone.
    today: date

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


class ChatResponse(ChatState):
    reply: str


class DocumentChoice(CamelModel):
    """What the model returns while no document has been chosen."""

    reply: str = Field(description="Your next message to the user")
    document_id: DocumentId | None = Field(
        description="The document the user wants to draft, or null until they have agreed on one"
    )


def draft_model(document: DocumentType) -> type[BaseModel]:
    """What the model returns while drafting `document`: its exact fields and parties."""
    values = create_model(
        "Values",
        __base__=CamelModel,
        **{f.key: (str, Field(description=f"{f.label}: {f.description}")) for f in document.fields},
    )
    parties = create_model(
        "Parties",
        __base__=CamelModel,
        **{p.key: (Party, Field(description=p.label)) for p in document.parties},
    )
    return create_model(
        "Draft",
        __base__=CamelModel,
        reply=(str, Field(description="Your next message to the user")),
        document_id=(
            DocumentId,
            Field(description=f'"{document.id}", or another document if the user asks to switch'),
        ),
        values=(values, Field(description="Every field, updated with what the user has told you")),
        parties=(
            parties,
            Field(description="Every party, updated with what the user has told you"),
        ),
    )


SYSTEM_PROMPT = """\
You are a friendly legal drafting assistant for prelegal. You help users create legal agreements \
from Common Paper's standard templates by chatting with them, and the user sees a live preview of \
the document that updates from what you return.

These are the only documents you can create:
{catalog}

How to behave:
- If the user wants a document that is not in this list, explain that you can't create it and \
suggest the closest document you can create, with a sentence on how it differs. Never pretend to \
create an unsupported document.
- Keep replies short and conversational. Simple Markdown (bold, bullet lists) is fine. Refer \
to documents by their names, never by their ids.
- Only help with drafting these documents. If asked for legal advice, suggest consulting a lawyer.
- Today's date is {today}. Resolve relative dates such as "today" or "next Monday" with it.

{task}"""

CHOOSE_TASK = """\
No document has been chosen yet. Find out what the user needs and recommend the right document. \
Set documentId only once the user has clearly said which document they want or agreed to your \
suggestion; otherwise leave it null. When you set it, just confirm the choice in a sentence; \
the document's fields are gathered next."""

DRAFT_TASK = """\
The user is drafting a {name}: {description}

Its Cover Page fields are:
{fields}

Its parties are {parties}. For each party you need the company name, and the name, title and \
notice address (email or postal) of the person signing.

Current values:
{state}

How to fill it in:
- The user sees every value in the preview, so don't list or repeat them: briefly acknowledge \
what you filled in, then work through the missing fields, asking about one or two at a time by \
their labels in plain language. Briefly explain a term if the user seems unsure. Until everything is filled in, end each reply \
with a specific question about the next missing detail.
- Always return every field and party. Fill in everything the user has told you anywhere in \
the conversation, including before this document was chosen, and keep the rest unchanged.
- Write values as they should appear on the Cover Page, e.g. dates as "October 8, 2026". Leave \
unknown values empty, and never invent names, companies or addresses. Never assume "None": \
leave a field empty until the user has answered it.
- When everything is filled in, summarise the key terms and tell the user they can download the \
PDF from the preview.
- If the user asks for a different document, set documentId to it."""


def system_prompt(request: ChatRequest) -> str:
    catalog = "\n".join(f"- {d.id}: {d.name}. {d.description}" for d in DOCUMENTS.values())
    if request.document_id is None:
        task = CHOOSE_TASK
    else:
        document = DOCUMENTS[request.document_id]
        task = DRAFT_TASK.format(
            name=document.name,
            description=document.description,
            fields="\n".join(
                f'- {f.key} ("{f.label}"): {f.description}. Example: {f.example}'
                for f in document.fields
            ),
            parties=" and ".join(f'{p.key} ("{p.label}")' for p in document.parties),
            state=json.dumps(
                request.model_dump(by_alias=True, include={"values", "parties"}), indent=2
            ),
        )
    return SYSTEM_PROMPT.format(catalog=catalog, today=request.today.isoformat(), task=task)


async def complete(messages: list[dict[str, str]], output: type[BaseModel]) -> BaseModel:
    response = await litellm.acompletion(
        model=MODEL,
        messages=messages,
        api_key=settings.openrouter_api_key,
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "chat_turn",
                "strict": True,
                "schema": output.model_json_schema(),
            },
        },
        extra_body={"provider": {"require_parameters": True}},
    )
    content = response.choices[0].message.content
    if not content:
        raise ValueError("The model returned no content")
    return output.model_validate_json(content)


router = APIRouter(prefix="/api")


async def turn(request: ChatRequest) -> BaseModel:
    """Asks the model for its next reply, in the shape that fits the request's document."""
    document = DOCUMENTS.get(request.document_id)
    output = draft_model(document) if document else DocumentChoice
    messages = [{"role": "system", "content": system_prompt(request)}]
    messages += [m.model_dump() for m in request.messages]
    return await complete(messages, output)


@router.post("/chat")
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        result = await turn(request)
        if result.document_id and result.document_id != request.document_id:
            # A document was just chosen or switched to. Ask again with its fields, so whatever
            # the user has already said fills the preview straight away.
            request = request.model_copy(
                update={"document_id": result.document_id, "values": {}, "parties": {}}
            )
            result = await turn(request)
    except litellm.RateLimitError as e:
        logger.warning("OpenRouter rate limit: %s", e)
        raise HTTPException(429, "The AI is busy right now. Please try again shortly.") from e
    # ValueError includes Pydantic's ValidationError for malformed model output.
    except (openai.OpenAIError, ValueError) as e:
        logger.exception("AI chat failed")
        raise HTTPException(502, "The AI could not respond. Please try again.") from e

    if request.document_id is None or result.document_id != request.document_id:
        # Still choosing, or switched again: the next turn gathers the new document's fields.
        return ChatResponse(reply=result.reply, document_id=result.document_id)
    data = result.model_dump()
    return ChatResponse(
        reply=result.reply,
        document_id=result.document_id,
        values=data["values"],
        parties=data["parties"],
    )
