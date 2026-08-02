from datetime import date
from threading import RLock

from .models.schemas import DailyAnalytics, Session, VaultItem, Wallet


class MemoryRepository:
    """Thread-safe local repository used until the Neon repository is wired into routes."""

    def __init__(self, wallet_limit: int = 50):
        self._lock = RLock()
        self.wallet = Wallet(date=str(date.today()), remaining_minutes=wallet_limit,
                             earned_minutes=0, spent_minutes=0, limit_minutes=wallet_limit,
                             focus_mode=False)
        self.sessions: dict[str, Session] = {}
        self.vault: dict[str, VaultItem] = {}
        self.analytics = DailyAnalytics(date=str(date.today()), learning_minutes=0,
                                        entertainment_minutes=0, videos_completed=0,
                                        learning_confidence=0, streak_days=0, topics=[])

    def get_wallet(self) -> Wallet:
        with self._lock:
            return self.wallet.model_copy(deep=True)

    def save_wallet(self, wallet: Wallet) -> Wallet:
        with self._lock:
            self.wallet = wallet.model_copy(deep=True)
            return self.get_wallet()

    def save_session(self, session: Session) -> Session:
        with self._lock:
            self.sessions[session.id] = session.model_copy(deep=True)
            return session.model_copy(deep=True)

    def get_session(self, session_id: str) -> Session | None:
        with self._lock:
            session = self.sessions.get(session_id)
            return session.model_copy(deep=True) if session else None

    def get_current_session(self) -> Session | None:
        with self._lock:
            active = [session for session in self.sessions.values() if not session.completed]
            if not active:
                return None
            return max(active, key=lambda session: session.started_at).model_copy(deep=True)

    def save_vault_item(self, item: VaultItem) -> VaultItem:
        with self._lock:
            self.vault[item.id] = item.model_copy(deep=True)
            return item.model_copy(deep=True)

    def list_vault(self) -> list[VaultItem]:
        with self._lock:
            return sorted((item.model_copy(deep=True) for item in self.vault.values()),
                          key=lambda item: (item.status != "queued", -item.priority, item.added_at))

    def get_analytics(self) -> DailyAnalytics:
        with self._lock:
            return self.analytics.model_copy(deep=True)

    def save_analytics(self, analytics: DailyAnalytics) -> DailyAnalytics:
        with self._lock:
            self.analytics = analytics.model_copy(deep=True)
            return self.get_analytics()
