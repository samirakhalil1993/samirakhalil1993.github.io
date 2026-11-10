"""The HTTP endpoints of the backend."""

import hashlib
import json
import logging
import secrets
import time
from collections.abc import AsyncIterator

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse

from app.config import Settings
from app.prompts import Message, build_messages
from app.providers.base import ProviderError
from app.retrieval.index import Chunk

router = APIRouter(prefix="/api")
log = logging.getLogger("portfolio.chat")

# A request body larger than this is refused unread.
MAX_BODY_BYTES = 64_000
# How many chunks are looked up; the prompt's character budget cuts further.
SEARCH_LIMIT = 6

# Visitors appear in logs only as a short hash. The salt is new on every
# start, so a hash cannot be turned back into an address or followed over time.
_LOG_SALT = secrets.token_bytes(16)


@router.get("/health")
def health() -> dict[str, str]:
    """Lets the host and the frontend check that the backend is running."""
    return {"status": "ok"}


def _refuse(status: int, reason: str) -> JSONResponse:
    return JSONResponse({"reason": reason}, status_code=status)


def _event(data: dict) -> str:
    """One event of the answer stream."""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def _visitor(request: Request, settings: Settings) -> str:
    """The address the request came from. Used for the per-visitor limit only."""
    if settings.trust_proxy:
        forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if forwarded:
            return forwarded
    return request.client.host if request.client else "unknown"


def _parse(raw: bytes, settings: Settings) -> list[Message] | None:
    """The conversation in a request body, or None when the body is not acceptable."""
    try:
        body = json.loads(raw)
    except ValueError:
        return None
    if not isinstance(body, dict) or set(body) != {"messages"}:
        return None
    messages = body["messages"]
    if not isinstance(messages, list) or not 1 <= len(messages) <= settings.max_messages:
        return None

    for message in messages:
        if not isinstance(message, dict) or set(message) != {"role", "text"}:
            return None
        if message["role"] not in ("user", "assistant") or not isinstance(message["text"], str):
            return None
        if message["role"] == "user" and len(message["text"]) > settings.max_message_chars:
            return None

    last = messages[-1]
    if last["role"] != "user" or not last["text"].strip():
        return None
    return messages


def _sources(chunks: list[Chunk]) -> list[dict[str, str]]:
    """What the visitor is shown under the answer: each source once, best first."""
    sources: list[dict[str, str]] = []
    seen: set[str] = set()
    for chunk in chunks:
        if chunk.source_label in seen:
            continue
        seen.add(chunk.source_label)
        source = {"label": chunk.source_label}
        if chunk.url:
            source["url"] = chunk.url
        elif chunk.section_id:
            source["sectionId"] = chunk.section_id
        sources.append(source)
    return sources


@router.post("/chat")
async def chat(request: Request):
    """Answers the visitor's newest question from the approved content."""
    state = request.app.state
    settings: Settings = state.settings
    started = time.monotonic()
    visitor = _visitor(request, settings)
    visitor_tag = hashlib.sha256(_LOG_SALT + visitor.encode()).hexdigest()[:8]

    def record(status: str, chunks: int = 0) -> None:
        # Never the question, the answer or the address: only what happened.
        duration = int((time.monotonic() - started) * 1000)
        log.info("chat status=%s chunks=%d ms=%d visitor=%s", status, chunks, duration, visitor_tag)

    declared = request.headers.get("content-length", "0")
    if not declared.isdigit() or int(declared) > MAX_BODY_BYTES:
        record("invalid")
        return _refuse(413, "invalid")
    raw = await request.body()
    if len(raw) > MAX_BODY_BYTES:
        record("invalid")
        return _refuse(413, "invalid")

    messages = _parse(raw, settings)
    if messages is None:
        record("invalid")
        return _refuse(422, "invalid")

    if not state.limiter.allow(visitor):
        record("limit")
        return _refuse(429, "limit")

    async def answer() -> AsyncIterator[str]:
        chunks: list[Chunk] = []
        try:
            chunks = state.retriever.search(messages[-1]["text"], SEARCH_LIMIT)
            prompt = build_messages(messages, chunks, settings, state.subject_name)
            async for piece in state.provider.stream(prompt, settings.max_answer_tokens):
                yield _event({"type": "text", "text": piece})
        except ProviderError as error:
            record(error.kind, len(chunks))
            yield _event({"type": "error", "reason": error.kind})
            return
        except Exception:
            # Anything unforeseen still ends the stream properly for the visitor.
            log.exception("chat failed unexpectedly visitor=%s", visitor_tag)
            record("unavailable", len(chunks))
            yield _event({"type": "error", "reason": "unavailable"})
            return
        record("done", len(chunks))
        yield _event({"type": "done", "sources": _sources(chunks)})

    return StreamingResponse(
        answer(),
        media_type="text/event-stream",
        # Tell browsers and proxies to pass each piece on at once.
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
