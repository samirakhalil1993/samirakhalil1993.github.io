import json

import httpx
import pytest

from app.providers.base import ProviderError
from app.providers.fake import FakeProvider
from app.providers.groq import GROQ_URL, GroqProvider

MESSAGES = [{"role": "system", "content": "rules"}, {"role": "user", "content": "Hi"}]


def sse(*events: str) -> bytes:
    return "".join(f"data: {event}\n\n" for event in events).encode()


def delta(text: str | None = None, **extra) -> str:
    content = {} if text is None else {"content": text}
    return json.dumps({"choices": [{"delta": {**content, **extra}}]})


def provider(handler) -> GroqProvider:
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return GroqProvider("gsk_test_key", "some/model", client=client)


async def collect(p, max_tokens: int = 350) -> list[str]:
    return [piece async for piece in p.stream(MESSAGES, max_tokens)]


@pytest.mark.anyio
async def test_the_request_goes_to_groq_with_the_key_only_in_the_header():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers["authorization"]
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, content=sse(delta("Hi"), "[DONE]"))

    await collect(provider(handler))
    assert seen["url"] == GROQ_URL == "https://api.groq.com/openai/v1/chat/completions"
    assert seen["auth"] == "Bearer gsk_test_key"
    assert seen["body"] == {
        "model": "some/model",
        "messages": MESSAGES,
        "stream": True,
        "max_tokens": 350,
        "temperature": 0.2,
    }
    assert "gsk_test_key" not in json.dumps(seen["body"])


@pytest.mark.anyio
async def test_the_pieces_of_the_answer_are_yielded_in_order():
    body = sse(delta(role="assistant"), delta("Hello"), delta(" there"), delta(""), delta("!"), "[DONE]")
    assert await collect(provider(lambda r: httpx.Response(200, content=body))) == ["Hello", " there", "!"]


@pytest.mark.anyio
async def test_nothing_after_done_is_read():
    body = sse(delta("A"), "[DONE]", delta("B"))
    assert await collect(provider(lambda r: httpx.Response(200, content=body))) == ["A"]


@pytest.mark.anyio
async def test_a_broken_line_and_other_line_kinds_are_skipped():
    body = b": keep-alive\n\n" + sse(delta("A"), "{not json", json.dumps({"choices": []}), delta("B"), "[DONE]")
    assert await collect(provider(lambda r: httpx.Response(200, content=body))) == ["A", "B"]


@pytest.mark.anyio
@pytest.mark.parametrize(("status", "kind"), [(429, "limit"), (500, "unavailable"), (401, "unavailable"), (503, "unavailable")])
async def test_a_refusal_becomes_a_provider_error(status, kind):
    with pytest.raises(ProviderError) as error:
        await collect(provider(lambda r: httpx.Response(status, json={"error": {"message": "no"}})))
    assert error.value.kind == kind


@pytest.mark.anyio
async def test_a_connection_problem_becomes_unavailable():
    def handler(request):
        raise httpx.ConnectError("no route")

    with pytest.raises(ProviderError) as error:
        await collect(provider(handler))
    assert error.value.kind == "unavailable"


@pytest.mark.anyio
async def test_a_stream_that_ends_without_done_is_unavailable_after_its_pieces():
    pieces = []
    with pytest.raises(ProviderError) as error:
        async for piece in provider(lambda r: httpx.Response(200, content=sse(delta("A"), delta("B")))).stream(MESSAGES, 10):
            pieces.append(piece)
    assert pieces == ["A", "B"]
    assert error.value.kind == "unavailable"


@pytest.mark.anyio
async def test_an_error_message_never_contains_the_key():
    with pytest.raises(ProviderError) as error:
        await collect(provider(lambda r: httpx.Response(401, text="bad key gsk_test_key")))
    assert "gsk_test_key" not in str(error.value)


@pytest.mark.anyio
async def test_the_fake_provider_yields_its_pieces():
    assert await collect(FakeProvider(["One ", "two."])) == ["One ", "two."]


@pytest.mark.anyio
async def test_the_fake_provider_can_fail_at_the_start_or_part_way():
    with pytest.raises(ProviderError):
        await collect(FakeProvider(error=ProviderError("limit")))
    pieces = []
    with pytest.raises(ProviderError):
        async for piece in FakeProvider(["a", "b", "c"], error=ProviderError("unavailable"), fail_after=2).stream(MESSAGES, 10):
            pieces.append(piece)
    assert pieces == ["a", "b"]


@pytest.fixture
def anyio_backend():
    return "asyncio"
