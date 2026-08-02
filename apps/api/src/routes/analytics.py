from fastapi import APIRouter, Request

from ..models.schemas import DailyAnalytics

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=DailyAnalytics)
def summary(request: Request) -> DailyAnalytics:
    return request.app.state.repository.get_analytics()
