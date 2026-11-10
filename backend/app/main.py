"""Builds the web application.

Run it locally with:

    uvicorn app.main:app --port 8000
"""

import logging
import os
import time
from collections.abc import Callable
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router
from app.config import Settings
from app.limits import RateLimiter
from app.providers.base import ChatProvider
from app.providers.fake import FakeProvider
from app.providers.groq import GroqProvider
from app.retrieval.bm25 import Bm25Retriever, Retriever
from app.retrieval.index import Chunk, load_index

INDEX_PATH = Path(__file__).resolve().parents[1] / "data" / "index.json"


def _provider(settings: Settings) -> ChatProvider:
    if settings.provider == "fake":
        return FakeProvider()
    if not settings.groq_api_key:
        raise RuntimeError(
            "GROQ_API_KEY is missing. Put the key in backend/.env, "
            "or set PROVIDER=fake to run with fixed test answers."
        )
    return GroqProvider(settings.groq_api_key, settings.groq_model)


def _subject_name(chunks: list[Chunk]) -> str:
    """The name of the person the site is about, taken from the profile chunk."""
    for chunk in chunks:
        if chunk.id == "profile":
            return chunk.title.removeprefix("About ")
    return "the site owner"


def create_app(
    settings: Settings,
    provider: ChatProvider | None = None,
    retriever: Retriever | None = None,
    clock: Callable[[], float] = time.time,
    chunks: list[Chunk] | None = None,
) -> FastAPI:
    """Puts the parts together. Tests pass their own provider, retriever and clock."""
    app = FastAPI(title="Portfolio assistant", docs_url=None, redoc_url=None, openapi_url=None)

    chunks = load_index(INDEX_PATH) if chunks is None else chunks
    name = _subject_name(chunks)

    app.state.settings = settings
    app.state.subject_name = name
    app.state.provider = provider or _provider(settings)
    # The person's name is in almost every question, so it is not a search word.
    app.state.retriever = retriever or Bm25Retriever(chunks, ignore=name.split())
    app.state.limiter = RateLimiter(settings.requests_per_hour, settings.requests_per_day, clock)

    # Browsers only let the listed websites read this API's answers.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_methods=["GET", "POST"],
        allow_headers=["content-type"],
    )
    app.include_router(router)
    return app


def _load_env_file(path: Path) -> dict[str, str]:
    """Reads KEY=value lines from backend/.env, if the file exists."""
    values: dict[str, str] = {}
    if path.is_file():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                values[key.strip()] = value.strip().strip("\"'")
    return values


def __getattr__(name: str):
    # `uvicorn app.main:app` asks for `app`. It is built only then, so that
    # importing this module (in tests, for example) needs no key and no index.
    if name == "app":
        # Show this app's own log lines (counts and timings, never message text).
        logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
        env = {**_load_env_file(Path(__file__).resolve().parents[1] / ".env"), **os.environ}
        return create_app(Settings.from_env(env))
    raise AttributeError(name)
