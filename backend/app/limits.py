"""Usage limits: how many questions one visitor, and all visitors, may ask."""

from collections import deque
from collections.abc import Callable
from typing import Literal

_MINUTE = 60.0
_HOUR = 3600.0
_DAY = 86_400.0

# "ok": go ahead. "busy": too many questions right now, try again in a moment.
# "limit": this visitor's hour, or everyone's day, is used up.
Verdict = Literal["ok", "busy", "limit"]


class RateLimiter:
    """Counts accepted requests in memory.

    Three limits apply. All visitors together get `per_minute` requests in
    any 60 seconds, which matches the model provider's per-minute allowance.
    Each visitor gets `per_hour` requests in any 60 minutes. All visitors
    together get `per_day` requests per calendar day (UTC).

    The counts live in this one process: they start again when the server
    restarts, and several worker processes would each count on their own.
    Run a single worker.
    """

    def __init__(self, per_minute: int, per_hour: int, per_day: int, clock: Callable[[], float]) -> None:
        self._per_minute = per_minute
        self._per_hour = per_hour
        self._per_day = per_day
        self._clock = clock
        self._last_minute: deque[float] = deque()
        self._recent: dict[str, deque[float]] = {}
        self._day = -1
        self._day_count = 0

    def check(self, visitor: str) -> Verdict:
        """Whether this visitor may ask now. An "ok" is counted; a refusal is not."""
        now = self._clock()
        self._forget_old(now)

        day = int(now // _DAY)
        if day != self._day:
            self._day, self._day_count = day, 0
        if self._day_count >= self._per_day:
            return "limit"

        times = self._recent.get(visitor)
        if times is not None and len(times) >= self._per_hour:
            return "limit"

        if len(self._last_minute) >= self._per_minute:
            return "busy"

        self._recent.setdefault(visitor, deque()).append(now)
        self._last_minute.append(now)
        self._day_count += 1
        return "ok"

    def allow(self, visitor: str) -> bool:
        return self.check(visitor) == "ok"

    def _forget_old(self, now: float) -> None:
        """Drops requests that no longer count, and visitors with none left."""
        while self._last_minute and now - self._last_minute[0] > _MINUTE:
            self._last_minute.popleft()
        for visitor in list(self._recent):
            times = self._recent[visitor]
            while times and now - times[0] > _HOUR:
                times.popleft()
            if not times:
                del self._recent[visitor]

    def tracked_visitors(self) -> int:
        return len(self._recent)
