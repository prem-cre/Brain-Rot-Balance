from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request

from ..models.schemas import VaultItem, VaultItemCreate, VideoCategory

router = APIRouter(prefix="/vault", tags=["learning vault"])


@router.get("", response_model=list[VaultItem])
def list_vault(request: Request) -> list[VaultItem]:
    return request.app.state.repository.list_vault()


@router.post("", response_model=VaultItem, status_code=201)
def add_to_vault(payload: VaultItemCreate, request: Request) -> VaultItem:
    intelligence = request.app.state.video_intelligence
    classification_res = intelligence.classify(payload.video)
    score = classification_res.classification

    if score.category == VideoCategory.ENTERTAINMENT or score.education_score < 50:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Cannot add to Learning Vault: Content is classified as Entertainment "
                f"(Entertainment score: {score.entertainment_score}%, Education score: {score.education_score}%). "
                f"Only educational videos are allowed in the Learning Vault."
            ),
        )

    item = VaultItem(id=str(uuid4()), video=payload.video, priority=payload.priority,
                     goal=payload.goal, added_at=datetime.now(timezone.utc))
    return request.app.state.repository.save_vault_item(item)
