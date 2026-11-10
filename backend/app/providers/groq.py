"""The Groq provider: open models behind an OpenAI-compatible API."""

import json
from collections.abc import AsyncIterator

import httpx

from app.providers.base import ProviderError

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# Give up when Groq does not connect or goes silent for this long.
_TIMEOUT = httpx.Timeout(20.0)


class GroqProvider:
    def __init__(self, api_key: str, model: str, client: httpx.AsyncClient | None = None) -> None:
        self._api_key = api_key
        self._model = model
        self._client = client or httpx.AsyncClient(timeout=_TIMEOUT)

    async def stream(self, messages: list[dict[str, str]], max_tokens: int) -> AsyncIterator[str]:
        request = {
            "model": self._model,
            "messages": messages,
            "stream": True,
            "max_tokens": max_tokens,
            # A low temperature keeps the answers close to the given context.
            "temperature": 0.2,
        }
        try:
            async with self._client.stream(
                "POST",
                GROQ_URL,
                json=request,
                headers={"Authorization": f"Bearer {self._api_key}"},
            ) as response:
                if response.status_code == 429:
                    raise ProviderError("limit")
                if response.status_code != 200:
                    raise ProviderError("unavailable")

                # The answer arrives as lines of the form `data: {json}`.
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        return
                    piece = _piece(data)
                    if piece:
                        yield piece
        except httpx.HTTPError:
            # Timeouts and connection problems. The original error is not passed
            # on, so nothing from the request can leak into a message or a log.
            raise ProviderError("unavailable") from None

        # The stream stopped without saying it was done: the answer is cut off.
        raise ProviderError("unavailable")


def _piece(data: str) -> str | None:
    """The new text in one stream event, or None when it carries none."""
    try:
        content = json.loads(data)["choices"][0]["delta"].get("content")
    except (ValueError, LookupError, TypeError, AttributeError):
        return None
    return content if isinstance(content, str) and content else None
