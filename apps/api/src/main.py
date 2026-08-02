from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .repositories import MemoryRepository
from .routes import analytics, health, vault, videos, wallet
from .services.analytics import AnalyticsService
from .services.learning import LearningVerificationService
from .services.video_intelligence import VideoIntelligenceService
from .services.wallet import WalletService


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    repository = MemoryRepository(wallet_limit=settings.default_wallet_minutes)
    app.state.repository = repository
    app.state.video_intelligence = VideoIntelligenceService()
    app.state.wallet = WalletService(repository, max_minutes=settings.max_wallet_minutes)
    app.state.learning = LearningVerificationService(repository, app.state.wallet)
    app.state.analytics = AnalyticsService(repository)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan,
                  description="Behavior-aware learning and entertainment balance for YouTube.")
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                       allow_credentials=False, allow_methods=["*"], allow_headers=["*"])
    prefix = settings.api_v1_prefix
    app.include_router(health.router, prefix=prefix)
    app.include_router(videos.router, prefix=prefix)
    app.include_router(wallet.router, prefix=prefix)
    app.include_router(vault.router, prefix=prefix)
    app.include_router(analytics.router, prefix=prefix)

    @app.get("/", tags=["system"])
    def root() -> dict[str, str]:
        return {"service": settings.app_name, "docs": "/docs", "health": f"{prefix}/health"}

    return app


app = create_app()
