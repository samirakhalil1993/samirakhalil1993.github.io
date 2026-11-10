from app.limits import RateLimiter


class Clock:
    def __init__(self, now: float = 1_800_000_000.0) -> None:
        self.now = now

    def __call__(self) -> float:
        return self.now


def test_a_visitor_is_allowed_up_to_the_hourly_limit():
    limiter = RateLimiter(per_hour=3, per_day=100, clock=Clock())
    assert [limiter.allow("a") for _ in range(4)] == [True, True, True, False]


def test_visitors_are_counted_separately():
    limiter = RateLimiter(per_hour=1, per_day=100, clock=Clock())
    assert limiter.allow("a") and limiter.allow("b")
    assert not limiter.allow("a")


def test_the_hour_window_slides():
    clock = Clock()
    limiter = RateLimiter(per_hour=2, per_day=100, clock=clock)
    assert limiter.allow("a")
    clock.now += 1800
    assert limiter.allow("a")
    assert not limiter.allow("a")
    clock.now += 1801  # the first request is now more than an hour old
    assert limiter.allow("a")
    assert not limiter.allow("a")


def test_the_daily_total_covers_all_visitors():
    limiter = RateLimiter(per_hour=10, per_day=3, clock=Clock())
    assert [limiter.allow(v) for v in ("a", "b", "c", "d")] == [True, True, True, False]


def test_the_daily_total_starts_again_on_a_new_day():
    clock = Clock()
    limiter = RateLimiter(per_hour=10, per_day=1, clock=clock)
    assert limiter.allow("a")
    assert not limiter.allow("b")
    clock.now += 86_400
    assert limiter.allow("b")


def test_a_refused_request_is_not_counted():
    clock = Clock()
    limiter = RateLimiter(per_hour=1, per_day=100, clock=clock)
    assert limiter.allow("a")
    for _ in range(50):
        assert not limiter.allow("a")
    clock.now += 3601
    assert limiter.allow("a")


def test_old_visitors_are_forgotten():
    clock = Clock()
    limiter = RateLimiter(per_hour=5, per_day=10_000, clock=clock)
    for number in range(500):
        limiter.allow(f"visitor-{number}")
    clock.now += 3601
    limiter.allow("new")
    assert limiter.tracked_visitors() == 1
