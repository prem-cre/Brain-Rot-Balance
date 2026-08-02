from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request

from ..models.schemas import (Heartbeat, SessionResponse, SessionStart, VideoClassificationResponse,
                              VideoInput)

router = APIRouter(prefix="/videos", tags=["video intelligence"])


@router.post("/classify", response_model=VideoClassificationResponse)
def classify(video: VideoInput, request: Request) -> VideoClassificationResponse:
    return request.app.state.video_intelligence.classify(video)


@router.post("/sessions/start", response_model=SessionResponse)
def start_session(payload: SessionStart, request: Request) -> SessionResponse:
    intelligence = request.app.state.video_intelligence
    result = intelligence.classify(payload.video)
    kind = payload.kind or ("learning" if result.classification.education_score >=
                            result.classification.entertainment_score else "entertainment")
    now = datetime.now(timezone.utc)
    from ..models.schemas import Session
    session = Session(id=str(uuid4()), video=payload.video, classification=result.classification,
                      kind=kind, started_at=now, last_heartbeat_at=now)
    saved = request.app.state.repository.save_session(session)
    return SessionResponse(session=saved, wallet_minutes=request.app.state.wallet.get_wallet().remaining_minutes,
                           focus_mode=request.app.state.wallet.get_wallet().focus_mode)


@router.post("/sessions/{session_id}/heartbeat", response_model=SessionResponse)
def heartbeat(session_id: str, payload: Heartbeat, request: Request) -> SessionResponse:
    session = request.app.state.repository.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    now = datetime.now(timezone.utc)
    session.last_heartbeat_at = now
    session.max_position_seconds = max(session.max_position_seconds, payload.position_seconds)
    session.watched_seconds += payload.active_seconds
    session.active_seconds += payload.active_seconds if payload.tab_focused else 0
    total = max(1, session.watched_seconds)
    session.tab_focus_ratio = min(1, session.active_seconds / total)
    session.playback_speed = payload.playback_speed
    saved = request.app.state.repository.save_session(session)
    wallet = request.app.state.wallet.reset_if_new_day()
    return SessionResponse(session=saved, wallet_minutes=wallet.remaining_minutes,
                           focus_mode=wallet.focus_mode)


@router.post("/sessions/{session_id}/complete", response_model=SessionResponse)
def complete(session_id: str, request: Request) -> SessionResponse:
    session = request.app.state.repository.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.completed:
        wallet = request.app.state.wallet.reset_if_new_day()
        return SessionResponse(session=session, wallet_minutes=wallet.remaining_minutes,
                               focus_mode=wallet.focus_mode)
    session.completed = True
    minutes = max(1, round(session.watched_seconds / 60))
    request.app.state.repository.save_session(session)
    wallet = request.app.state.wallet.spend_for_session(session, minutes)
    request.app.state.analytics.record_completion(session, minutes)
    return SessionResponse(session=session, wallet_minutes=wallet.remaining_minutes,
                           focus_mode=wallet.focus_mode)
