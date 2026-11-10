"""The HTTP endpoints of the backend."""

from fastapi import APIRouter

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict[str, str]:
    """Lets the host and the frontend check that the backend is running."""
    return {"status": "ok"}
