"""Settings of the backend, read once from environment variables."""

import re
from collections.abc import Mapping
from dataclasses import dataclass, field

_PROVIDERS = ("groq", "fake")


def _number(env: Mapping[str, str], name: str, default: int) -> int:
    raw = env.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        value = int(raw)
    except ValueError:
        raise ValueError(f"{name} must be a whole number, got {raw!r}") from None
    if value < 1:
        raise ValueError(f"{name} must be at least 1, got {value}")
    return value


@dataclass(frozen=True)
class Settings:
    """Everything that can differ between a laptop and the live server."""

    # The key is left out of repr, so it cannot end up in a log line by accident.
    groq_api_key: str | None = field(default=None, repr=False)
    groq_model: str = "openai/gpt-oss-120b"
    # How much the model "thinks" before answering: low, medium or high. Thinking
    # uses up answer tokens, so low is enough here. None for models without it.
    groq_reasoning_effort: str | None = "low"
    # "fake" answers with fixed text and needs no key; used for local runs and tests.
    provider: str = "groq"
    # Only for the "fake" provider: a pause before each piece of its answer, in
    # milliseconds, so the answer arrives gradually like a real one.
    fake_piece_delay_ms: int = 0
    # Websites whose pages may call this API from the browser.
    allowed_origins: tuple[str, ...] = ("http://localhost:5173", "http://localhost:4173")

    # Usage limits. They keep the free plan of the model provider from running out.
    # The free plan allows about 8,000 tokens a minute and 200,000 a day, and
    # one question uses roughly 1,500 to 2,300.
    requests_per_minute: int = 4  # all visitors together
    requests_per_hour: int = 20  # per visitor
    requests_per_day: int = 100  # all visitors together
    max_message_chars: int = 500
    max_messages: int = 31

    # Token budget of one question (the provider allows 8,000 tokens a minute).
    max_context_chars: int = 4000
    max_history_messages: int = 6
    max_history_chars: int = 2000
    # Room for the model's short thinking plus the answer. The rules keep the
    # answer itself short.
    max_answer_tokens: int = 800

    # Turn on only behind a proxy that sets X-Forwarded-For itself.
    trust_proxy: bool = False
    # A header in which the host itself names the visitor's address, replacing
    # anything the visitor sent under that name. On Render: cf-connecting-ip.
    # When set, it is used instead of X-Forwarded-For.
    client_ip_header: str | None = None

    @classmethod
    def from_env(cls, env: Mapping[str, str]) -> "Settings":
        provider = env.get("PROVIDER", "groq").strip().lower() or "groq"
        if provider not in _PROVIDERS:
            raise ValueError(f"PROVIDER must be one of {_PROVIDERS}, got {provider!r}")

        origins = tuple(
            origin.strip()
            for origin in env.get("ALLOWED_ORIGINS", "").split(",")
            if origin.strip()
        )
        effort = env.get("GROQ_REASONING_EFFORT", "low").strip().lower() or "low"
        if effort not in ("low", "medium", "high", "none"):
            raise ValueError(f"GROQ_REASONING_EFFORT must be low, medium, high or none, got {effort!r}")

        header = env.get("CLIENT_IP_HEADER", "").strip().lower() or None
        if header is not None and not re.fullmatch(r"[a-z0-9-]+", header):
            raise ValueError(f"CLIENT_IP_HEADER must be a header name such as cf-connecting-ip, got {header!r}")

        delay = env.get("FAKE_PIECE_DELAY_MS", "").strip() or "0"
        if not delay.isdigit() or int(delay) > 5000:
            raise ValueError(f"FAKE_PIECE_DELAY_MS must be a whole number from 0 to 5000, got {delay!r}")

        return cls(
            client_ip_header=header,
            fake_piece_delay_ms=int(delay),
            groq_reasoning_effort=None if effort == "none" else effort,
            requests_per_minute=_number(env, "REQUESTS_PER_MINUTE", cls.requests_per_minute),
            groq_api_key=(env.get("GROQ_API_KEY") or "").strip() or None,
            groq_model=env.get("GROQ_MODEL", "").strip() or cls.groq_model,
            provider=provider,
            allowed_origins=origins or cls.allowed_origins,
            requests_per_hour=_number(env, "REQUESTS_PER_HOUR", cls.requests_per_hour),
            requests_per_day=_number(env, "REQUESTS_PER_DAY", cls.requests_per_day),
            max_message_chars=_number(env, "MAX_MESSAGE_CHARS", cls.max_message_chars),
            max_messages=_number(env, "MAX_MESSAGES", cls.max_messages),
            max_context_chars=_number(env, "MAX_CONTEXT_CHARS", cls.max_context_chars),
            max_history_messages=_number(env, "MAX_HISTORY_MESSAGES", cls.max_history_messages),
            max_history_chars=_number(env, "MAX_HISTORY_CHARS", cls.max_history_chars),
            max_answer_tokens=_number(env, "MAX_ANSWER_TOKENS", cls.max_answer_tokens),
            trust_proxy=env.get("TRUST_PROXY", "").strip().lower() in ("1", "true", "yes"),
        )
