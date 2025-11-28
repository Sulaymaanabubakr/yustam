from fastapi import FastAPI
from .config import settings
from .middleware import setup_middleware
from .api.v1.auth import router as auth_router
# NOTE: Other router imports would go here

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None
    )

    setup_middleware(app)

    # Include API routers
    app.include_router(auth_router, prefix="/api/v1")
    # NOTE: All other routers (listings, vendors, chats, etc.) would be included here

    @app.get("/")
    def health_check():
        return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}

    return app

app = create_app()