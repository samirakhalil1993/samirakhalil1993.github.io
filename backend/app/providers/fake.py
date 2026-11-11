"""A stand-in provider with fixed answers, for tests and for running without a key."""

import asyncio
from collections.abc import AsyncIterator

from app.providers.base import ProviderError

DEFAULT_PIECES = ["This is a test answer ", "from the stand-in model. ", "No real AI was asked."]


class FakeProvider:
    def __init__(
        self,
        pieces: list[str] | None = None,
        error: ProviderError | None = None,
        fail_after: int | None = None,
        delay: float = 0.0,
    ) -> None:
        self.pieces = DEFAULT_PIECES if pieces is None else pieces
        self.error = error
        # With an error: how many pieces are yielded before it is raised (None = none).
        self.fail_after = fail_after
        # Seconds to wait before each piece, to imitate a model that writes slowly.
        self.delay = delay
        # The last request, so tests can look at what the model would have received.
        self.last_messages: list[dict[str, str]] | None = None
        self.last_max_tokens: int | None = None

    async def stream(self, messages: list[dict[str, str]], max_tokens: int) -> AsyncIterator[str]:
        self.last_messages = messages
        self.last_max_tokens = max_tokens
        for number, piece in enumerate(self.pieces):
            if self.error and number == (self.fail_after or 0):
                raise self.error
            if self.delay:
                await asyncio.sleep(self.delay)
            yield piece
        if self.error and (self.fail_after or 0) >= len(self.pieces):
            raise self.error
