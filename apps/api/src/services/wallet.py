from datetime import datetime, timezone

from fastapi import HTTPException, status

from ..models.schemas import Session, Wallet
from ..repositories import MemoryRepository


class WalletService:
    def __init__(self, repository: MemoryRepository, max_minutes: int = 180):
        self.repository = repository
        self.max_minutes = max_minutes

    def get_wallet(self) -> Wallet:
        return self.reset_if_new_day()

    def spend_for_session(self, session: Session, minutes: int) -> Wallet:
        wallet = self.repository.get_wallet()
        if session.kind.value == "learning":
            return wallet
        spent = min(wallet.remaining_minutes, max(0, minutes))
        wallet.remaining_minutes -= spent
        wallet.spent_minutes += spent
        wallet.focus_mode = wallet.remaining_minutes <= 0
        return self.repository.save_wallet(wallet)

    def reward_learning(self, reward_minutes: int) -> Wallet:
        wallet = self.repository.get_wallet()
        wallet.remaining_minutes = min(self.max_minutes, wallet.remaining_minutes + max(0, reward_minutes))
        wallet.earned_minutes += max(0, reward_minutes)
        wallet.focus_mode = wallet.remaining_minutes <= 0
        return self.repository.save_wallet(wallet)

    def boost_wallet(self, boost_minutes: int = 5) -> Wallet:
        return self.reward_learning(boost_minutes)

    def reset_if_new_day(self) -> Wallet:
        wallet = self.repository.get_wallet()
        today = datetime.now(timezone.utc).date().isoformat()
        if wallet.date != today:
            wallet.date = today
            wallet.remaining_minutes = wallet.limit_minutes
            wallet.earned_minutes = wallet.spent_minutes = 0
            wallet.focus_mode = False
            self.repository.save_wallet(wallet)
        return wallet

