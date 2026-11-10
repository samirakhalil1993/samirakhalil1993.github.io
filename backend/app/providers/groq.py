"""The Groq provider: open models behind an OpenAI-compatible API."""

import asyncio
import json
from collections.abc import AsyncIterator

import httpx

from app.providers.base import ProviderError

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# Give up when Groq does not connect, or goes silent for this long.
_TIMEOUT = httpx.Timeout(20.0)
# A 429 that asks to wait at most this long is the per-minute limit: worth
# trying again. A longer wait, or none stated, is treated as the daily limit.
_SHORT_WAIT_SECONDS = 120.0


class GroqProvider:
    def __init__(
        self,
        api_key: str,
        model: str,
        client: httpx.AsyncClient | None = None,
        reasoning_effort: str | None = "low",
        deadline_seconds: float = 60.0,
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._client = client or httpx.AsyncClient(timeout=_TIMEOUT)
        # For models that "think" before answering (the gpt-oss family).
        # None for models that do not accept the setting.
        self._reasoning_effort = reasoning_effort
        # The whole answer must be finished within this time.
        self._deadline_seconds = deadline_seconds

    def _request(self, messages: list[dict[str, str]], max_tokens: int) -> dict:
        request: dict = {
            "model": self._model,
            "messages": messages,
            "stream": True,
            "max_completion_tokens": max_tokens,
            # A low temperature keeps the answers close to the given context.
            "temperature": 0.2,
        }
        if self._reasoning_effort:
            # Think briefly, and do not send the thinking: it would use up the
            # answer's tokens and must never be shown to a visitor.
            request["reasoning_effort"] = self._reasoning_effort
            request["include_reasoning"] = False
        return request

    async def stream(self, messages: list[dict[str, str]], max_tokens: int) -> AsyncIterator[str]:
        produced = False
        try:
            async with asyncio.timeout(self._deadline_seconds):
                async with self._client.stream(
                    "POST",
                    GROQ_URL,
                    json=self._request(messages, max_tokens),
                    headers={"Authorization": f"Bearer {self._api_key}"},
                ) as response:
                    if response.status_code == 429:
                        raise ProviderError(_kind_of_429(response))
                    if response.status_code != 200:
                        raise ProviderError("unavailable")

                    # The answer arrives as lines of the form `data: {json}`.
                    async for line in response.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        data = line[5:].strip()
                        if data == "[DONE]":
                            return
                        event = _parse(data)
                        if event is None:
                            continue
                        if "error" in event:
                            raise ProviderError("unavailable")
                        piece, finish = _read(event)
                        if piece:
                            produced = True
                            yield piece
                        if finish == "length" and not produced:
                            # The model used all its room for thinking and
                            # wrote no answer. An empty bubble helps nobody.
                            raise ProviderError("unavailable")
        except (httpx.HTTPError, TimeoutError):
            # Timeouts and connection problems. The original error is not passed
            # on, so nothing from the request can leak into a message or a log.
            raise ProviderError("unavailable") from None

        # The stream stopped without saying it was done: the answer is cut off.
        raise ProviderError("unavailable")


def _kind_of_429(response: httpx.Response) -> str:
    try:
        wait = float(response.headers.get("retry-after", ""))
    except ValueError:
        return "limit"
    return "unavailable" if wait <= _SHORT_WAIT_SECONDS else "limit"


def _parse(data: str) -> dict | None:
    try:
        event = json.loads(data)
    except ValueError:
        return None
    return event if isinstance(event, dict) else None


def _read(event: dict) -> tuple[str | None, str | None]:
    """The new answer text in one stream event, and why the answer ended, if it did."""
    try:
        choice = event["choices"][0]
        content = choice.get("delta", {}).get("content")
        finish = choice.get("finish_reason")
    except (LookupError, TypeError, AttributeError):
        return None, None
    piece = content if isinstance(content, str) and content else None
    return piece, finish if isinstance(finish, str) else None
