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
