from fastapi import APIRouter, Depends

from ..config import Settings, get_settings
from ..models.schemas import HealthResponse

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse)
def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(status="ok", service=settings.app_name, environment=settings.environment,
                          version="0.1.0")
