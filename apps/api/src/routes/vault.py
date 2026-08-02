from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Request

from ..models.schemas import VaultItem, VaultItemCreate

router = APIRouter(prefix="/vault", tags=["learning vault"])


@router.get("", response_model=list[VaultItem])
def list_vault(request: Request) -> list[VaultItem]:
    return request.app.state.repository.list_vault()


@router.post("", response_model=VaultItem, status_code=201)
def add_to_vault(payload: VaultItemCreate, request: Request) -> VaultItem:
    item = VaultItem(id=str(uuid4()), video=payload.video, priority=payload.priority,
                     goal=payload.goal, added_at=datetime.now(timezone.utc))
    return request.app.state.repository.save_vault_item(item)
