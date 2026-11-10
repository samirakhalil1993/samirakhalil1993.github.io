"""Builds the web application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router
from app.config import Settings


def create_app(settings: Settings) -> FastAPI:
    app = FastAPI(title="Portfolio assistant", docs_url=None, redoc_url=None, openapi_url=None)
    app.state.settings = settings

    # Browsers only let the listed websites read this API's answers.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_methods=["GET", "POST"],
        allow_headers=["content-type"],
    )
    app.include_router(router)
    return app
