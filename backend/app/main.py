from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers.admin import router as admin_router
from .routers.auth import router as auth_router
from .routers.catalog import router as catalog_router
from .routers.events import router as events_router
from .routers.feedback import router as feedback_router
from .routers.materials import router as materials_router
from .routers.registrations import router as registrations_router
from .routers.sponsors import router as sponsors_router


def create_app() -> FastAPI:
    """Build and configure the FastAPI application instance."""

    settings = get_settings()

    app = FastAPI(title=settings.app_name)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    def read_root():
        return {"message": "API is running"}

    @app.get("/health")
    def health():
        return {"status": "ok"}

    app.include_router(auth_router)
    app.include_router(catalog_router)
    app.include_router(events_router)
    app.include_router(feedback_router)
    app.include_router(materials_router)
    app.include_router(registrations_router)
    app.include_router(sponsors_router)
    app.include_router(admin_router)
    return app


app = create_app()
