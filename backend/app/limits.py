"""Usage limits: how many questions one visitor, and all visitors, may ask."""

from collections import deque
from collections.abc import Callable

_HOUR = 3600.0
_DAY = 86_400.0


class RateLimiter:
    """Counts accepted requests in memory.

    Two limits apply: each visitor gets `per_hour` requests in any 60
    minutes, and all visitors together get `per_day` requests per calendar
    day (UTC). The counts live in memory, so they start again when the
    server restarts; for one small server that is acceptable.
    """

    def __init__(self, per_hour: int, per_day: int, clock: Callable[[], float]) -> None:
        self._per_hour = per_hour
        self._per_day = per_day
        self._clock = clock
        self._recent: dict[str, deque[float]] = {}
        self._day = -1
        self._day_count = 0

    def allow(self, visitor: str) -> bool:
        """True, and counted, if this visitor may make a request now."""
        now = self._clock()
        self._forget_old(now)

        day = int(now // _DAY)
        if day != self._day:
            self._day, self._day_count = day, 0
        if self._day_count >= self._per_day:
            return False

        times = self._recent.setdefault(visitor, deque())
        if len(times) >= self._per_hour:
            return False

        times.append(now)
        self._day_count += 1
        return True

    def _forget_old(self, now: float) -> None:
        """Drops requests older than an hour, and visitors with none left."""
        for visitor in list(self._recent):
            times = self._recent[visitor]
            while times and now - times[0] > _HOUR:
                times.popleft()
            if not times:
                del self._recent[visitor]

    def tracked_visitors(self) -> int:
        return len(self._recent)
