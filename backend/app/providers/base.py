"""What every model provider must offer, whoever it is."""

from collections.abc import AsyncIterator
from typing import Literal, Protocol

ErrorKind = Literal["limit", "unavailable"]


class ProviderError(Exception):
    """The provider could not give (all of) an answer.

    kind "limit": the provider's usage limit is reached; trying again soon will not help.
    kind "unavailable": anything else: an outage, a timeout, a refused request.
    """

    def __init__(self, kind: ErrorKind) -> None:
        super().__init__(f"The model provider failed: {kind}")
        self.kind: ErrorKind = kind


class ChatProvider(Protocol):
    """Something that turns a conversation into an answer, piece by piece."""

    def stream(self, messages: list[dict[str, str]], max_tokens: int) -> AsyncIterator[str]:
        """Yields the answer as it is written. Raises ProviderError when it cannot."""
        ...
