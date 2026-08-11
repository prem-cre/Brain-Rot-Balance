from fastapi import APIRouter, Request

from ..models.schemas import VerificationResult, Wallet, LearningVerification

router = APIRouter(tags=["wallet"])


@router.get("/wallet", response_model=Wallet)
def get_wallet(request: Request) -> Wallet:
    return request.app.state.wallet.reset_if_new_day()


@router.post("/learning/verify", response_model=VerificationResult)
def verify_learning(payload: LearningVerification, request: Request) -> VerificationResult:
    return request.app.state.learning.verify(payload)


@router.post("/wallet/boost", response_model=Wallet)
def boost_wallet(request: Request, minutes: int = 5) -> Wallet:
    return request.app.state.wallet.boost_wallet(minutes)
