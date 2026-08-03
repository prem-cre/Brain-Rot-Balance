from fastapi import APIRouter, Request

from ..models.schemas import DashboardResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(request: Request) -> DashboardResponse:
    repository = request.app.state.repository
    return DashboardResponse(
        wallet=repository.get_wallet(),
        analytics=repository.get_analytics(),
        current_session=repository.get_current_session(),
        vault=repository.list_vault(),
    )