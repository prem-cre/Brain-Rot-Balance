from ..models.schemas import LearningVerification, Session, VerificationResult
from ..repositories import MemoryRepository
from .wallet import WalletService


class LearningVerificationService:
    def __init__(self, repository: MemoryRepository, wallet: WalletService):
        self.repository = repository
        self.wallet = wallet

    def verify(self, request: LearningVerification) -> VerificationResult:
        session = self.repository.get_session(request.session_id)
        if not session:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Learning session not found")
        if session.kind.value != "learning":
            from fastapi import HTTPException
            raise HTTPException(status_code=422, detail="Only learning sessions can unlock minutes")
        duration = session.video.duration_seconds or max(session.max_position_seconds, 1)
        completion = min(1.0, session.max_position_seconds / duration)
        speed_score = 1.0 if session.playback_speed <= 2.0 else 0.5
        confidence = round(100 * (completion * 0.35 + session.tab_focus_ratio * 0.25 +
                                  request.transcript_coverage * 0.2 + speed_score * 0.1 +
                                  (request.quiz_score or 0) * 0.1))
        verified = confidence >= 70 and completion >= 0.8
        reward = min(50, round((session.classification.education_score / 100) * 45)) if verified else 0
        reasons = [f"Completion: {round(completion * 100)}%",
                   f"Tab focus: {round(session.tab_focus_ratio * 100)}%"]
        if request.quiz_score is not None:
            reasons.append(f"Quiz signal: {round(request.quiz_score * 100)}%")
        if verified:
            reasons.append("Learning confidence cleared the unlock threshold.")
        else:
            reasons.append("Watch more of the lesson and keep the tab focused to unlock.")
        return VerificationResult(confidence_score=max(0, min(100, confidence)), verified=verified,
                                  reward_minutes=reward, reasons=reasons,
                                  wallet=self.wallet.reward_learning(reward) if verified else self.repository.get_wallet())
