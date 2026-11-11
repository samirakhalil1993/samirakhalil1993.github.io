from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def client(**env: str) -> TestClient:
    return TestClient(create_app(Settings.from_env({"PROVIDER": "fake", **env})))


def test_health_says_ok():
    response = client().get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_an_allowed_site_may_call_the_api():
    response = client(ALLOWED_ORIGINS="https://site.example").options(
        "/api/chat",
        headers={
            "Origin": "https://site.example",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.headers["access-control-allow-origin"] == "https://site.example"


def test_another_site_may_not():
    response = client(ALLOWED_ORIGINS="https://site.example").options(
        "/api/chat",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in response.headers


def test_with_a_site_configured_a_page_on_this_computer_may_not_call_the_api():
    # On the live server only the real site is listed. The localhost
    # addresses are defaults for local work and must not be added to it.
    api = client(ALLOWED_ORIGINS="https://site.example")
    for origin in ("http://localhost:5173", "http://localhost:4173"):
        response = api.options(
            "/api/chat",
            headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
        )
        assert "access-control-allow-origin" not in response.headers


def test_an_allowed_site_can_read_the_health_answer():
    response = client(ALLOWED_ORIGINS="https://site.example").get(
        "/api/health", headers={"Origin": "https://site.example"}
    )
    assert response.headers["access-control-allow-origin"] == "https://site.example"
