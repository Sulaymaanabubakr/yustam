from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from .config import settings

def setup_middleware(app: FastAPI):
    # CORS setup based on ALLOWED_ORIGINS in config
    origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(',')] if settings.ALLOWED_ORIGINS else []
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # NOTE: Other custom middleware (e.g., plan checking) would go here