from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .identity import set_device_id, validate_device_id
from .repositories import MemoryRepository
from .postgres_repository import PostgresRepository
from .routes import analytics, dashboard, health, ml, quiz, vault, videos, wallet
from .services.analytics import AnalyticsService
from .services.learning import LearningVerificationService
from .services.quiz import GroqQuizService
from .services.video_intelligence import VideoIntelligenceService
from .services.wallet import WalletService


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    repository = (PostgresRepository(settings.database_url, settings.default_wallet_minutes)
                  if settings.database_url else MemoryRepository(wallet_limit=settings.default_wallet_minutes))
    app.state.repository = repository
    app.state.video_intelligence = VideoIntelligenceService()
    app.state.wallet = WalletService(repository, max_minutes=settings.max_wallet_minutes)
    app.state.learning = LearningVerificationService(repository, app.state.wallet)
    app.state.quiz_service = GroqQuizService(api_key=settings.groq_api_key, model=settings.groq_model)
    app.state.analytics = AnalyticsService(repository)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan,
                  description="Behavior-aware learning and entertainment balance for YouTube.")
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                       allow_credentials=False, allow_methods=["*"], allow_headers=["*"])
    @app.middleware("http")
    async def bind_device_identity(request: Request, call_next):
        try:
            set_device_id(validate_device_id(request.headers.get("X-Device-ID")))
        except HTTPException as exc:
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
        return await call_next(request)
    prefix = settings.api_v1_prefix
    app.include_router(health.router, prefix=prefix)
    app.include_router(videos.router, prefix=prefix)
    app.include_router(wallet.router, prefix=prefix)
    app.include_router(vault.router, prefix=prefix)
    app.include_router(analytics.router, prefix=prefix)
    app.include_router(dashboard.router, prefix=prefix)
    app.include_router(quiz.router, prefix=prefix)
    app.include_router(ml.router, prefix=prefix)

    @app.get("/", tags=["system"])
    def root() -> dict[str, str]:
        return {"service": settings.app_name, "docs": "/docs", "health": f"{prefix}/health"}

    return app


app = create_app()





