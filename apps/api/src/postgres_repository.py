from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session as DBSession, sessionmaker

from .models.database import DailyAnalytics as DBAnalytics, User, Wallet as DBWallet, WalletLedger, Video, VideoClassification, VaultItem as DBVaultItem, WatchSession
from .models.schemas import Classification, DailyAnalytics, Session, VaultItem, VideoInput, VideoCategory, Wallet


class PostgresRepository:
    """PostgreSQL repository with transactional wallet persistence."""

    def __init__(self, database_url: str, wallet_limit: int = 50):
        url = database_url.replace("+asyncpg", "+psycopg").replace("ssl=require", "sslmode=require")
        self.engine = create_engine(url, pool_pre_ping=True, pool_recycle=300,
                                    pool_size=5, max_overflow=5)
        self.session_factory = sessionmaker(self.engine, expire_on_commit=False)
        self.wallet_limit = wallet_limit
        self.device_id = "local-extension-device"

    def _user_and_wallet(self, db: DBSession) -> tuple[User, DBWallet]:
        user = db.scalar(select(User).where(User.device_id == self.device_id))
        if user is None:
            user = User(device_id=self.device_id)
            db.add(user)
            db.flush()
        wallet = db.get(DBWallet, user.id)
        if wallet is None:
            wallet = DBWallet(user_id=user.id, remaining_minutes=self.wallet_limit,
                              limit_minutes=self.wallet_limit)
            db.add(wallet)
            db.flush()
        return user, wallet

    def get_wallet(self) -> Wallet:
        with self.session_factory.begin() as db:
            user, wallet = self._user_and_wallet(db)
            today = datetime.now(timezone.utc).date().isoformat()
            entries = db.scalars(select(WalletLedger).where(WalletLedger.user_id == user.id)).all()
            earned = sum(max(0, entry.delta_minutes) for entry in entries)
            spent = sum(abs(min(0, entry.delta_minutes)) for entry in entries)
            return Wallet(date=today, remaining_minutes=wallet.remaining_minutes,
                          earned_minutes=earned, spent_minutes=spent,
                          limit_minutes=wallet.limit_minutes,
                          focus_mode=wallet.remaining_minutes <= 0)

    def save_wallet(self, value: Wallet) -> Wallet:
        with self.session_factory.begin() as db:
            user, wallet = self._user_and_wallet(db)
            delta = value.remaining_minutes - wallet.remaining_minutes
            if delta:
                db.add(WalletLedger(user_id=user.id, delta_minutes=delta,
                                    reason="wallet_update", idempotency_key=str(uuid4())))
            wallet.remaining_minutes = value.remaining_minutes
        return self.get_wallet()

    def save_session(self, value: Session) -> Session:
        with self.session_factory.begin() as db:
            user, _ = self._user_and_wallet(db)
            video = db.get(Video, value.video.video_id)
            if video is None:
                video = Video(id=value.video.video_id, title=value.video.title,
                              description=value.video.description, transcript=value.video.transcript,
                              channel_name=value.video.channel_name,
                              duration_seconds=value.video.duration_seconds)
                db.add(video)
            classification = db.get(VideoClassification, value.video.video_id)
            if classification is None:
                classification = VideoClassification(video_id=value.video.video_id)
                db.add(classification)
            classification.category = value.classification.category.value
            classification.education_score = value.classification.education_score
            classification.entertainment_score = value.classification.entertainment_score
            classification.confidence = round(value.classification.confidence * 100)
            classification.topics = value.classification.topics
            row = db.get(WatchSession, value.id)
            if row is None:
                row = WatchSession(id=value.id, user_id=user.id, video_id=value.video.video_id,
                                   kind=value.kind.value)
                db.add(row)
            row.watched_seconds = value.watched_seconds
            row.active_seconds = value.active_seconds
            row.max_position_seconds = value.max_position_seconds
            row.completed = value.completed
            row.started_at = value.started_at
            row.completed_at = datetime.now(timezone.utc) if value.completed else None
            row.last_heartbeat_at = value.last_heartbeat_at
            row.tab_focus_ratio = value.tab_focus_ratio
            row.playback_speed = value.playback_speed
        return value.model_copy(deep=True)

    def get_session(self, session_id: str) -> Session | None:
        with self.session_factory() as db:
            row = db.get(WatchSession, session_id)
            if row is None:
                return None
            video = db.get(Video, row.video_id)
            classification = db.get(VideoClassification, row.video_id)
            if video is None or classification is None:
                return None
            return self._to_session(row, video, classification)

    def _to_session(self, row: WatchSession, video: Video, classification: VideoClassification) -> Session:
        video_input = VideoInput(video_id=video.id, title=video.title, description=video.description,
                                 transcript=video.transcript, channel_name=video.channel_name,
                                 duration_seconds=video.duration_seconds)
        score = Classification(category=VideoCategory(classification.category),
                               education_score=classification.education_score,
                               entertainment_score=classification.entertainment_score,
                               confidence=classification.confidence / 100,
                               topics=classification.topics or [], explanation="Persisted classification")
        return Session(id=row.id, video=video_input, classification=score, kind=row.kind,
                       started_at=row.started_at, last_heartbeat_at=row.last_heartbeat_at or row.started_at,
                       watched_seconds=row.watched_seconds, active_seconds=row.active_seconds,
                       max_position_seconds=row.max_position_seconds, tab_focus_ratio=row.tab_focus_ratio,
                       playback_speed=row.playback_speed, completed=row.completed)

    def get_current_session(self) -> Session | None:
        with self.session_factory() as db:
            row = db.scalar(select(WatchSession).where(WatchSession.completed.is_(False)).order_by(WatchSession.started_at.desc()))
            return self.get_session(row.id) if row else None

    def save_vault_item(self, value: VaultItem) -> VaultItem:
        with self.session_factory.begin() as db:
            user, _ = self._user_and_wallet(db)
            video = db.get(Video, value.video.video_id)
            if video is None:
                db.add(Video(id=value.video.video_id, title=value.video.title,
                             description=value.video.description, transcript=value.video.transcript,
                             channel_name=value.video.channel_name, duration_seconds=value.video.duration_seconds))
            row = db.get(DBVaultItem, value.id)
            if row is None:
                row = DBVaultItem(id=value.id, user_id=user.id, video_id=value.video.video_id)
                db.add(row)
            row.goal, row.priority, row.status = value.goal, value.priority, value.status
        return value.model_copy(deep=True)

    def list_vault(self) -> list[VaultItem]:
        with self.session_factory() as db:
            user, _ = self._user_and_wallet(db)
            rows = db.scalars(select(DBVaultItem).where(DBVaultItem.user_id == user.id).order_by(DBVaultItem.priority.desc())).all()
            result = []
            for row in rows:
                video = db.get(Video, row.video_id)
                if video:
                    result.append(VaultItem(id=row.id, video=VideoInput(video_id=video.id, title=video.title,
                        description=video.description, transcript=video.transcript, channel_name=video.channel_name,
                        duration_seconds=video.duration_seconds), priority=row.priority, goal=row.goal,
                        status=row.status, added_at=row.created_at))
            return result

    def get_analytics(self) -> DailyAnalytics:
        with self.session_factory.begin() as db:
            user, _ = self._user_and_wallet(db)
            today = datetime.now(timezone.utc).date().isoformat()
            row = db.scalar(select(DBAnalytics).where(DBAnalytics.user_id == user.id, DBAnalytics.date == today))
            if row is None:
                return DailyAnalytics(date=today, learning_minutes=0, entertainment_minutes=0,
                                      videos_completed=0, learning_confidence=0, streak_days=0, topics=[])
            return DailyAnalytics(date=row.date, learning_minutes=row.learning_minutes,
                                  entertainment_minutes=row.entertainment_minutes,
                                  videos_completed=row.videos_completed, learning_confidence=row.learning_confidence,
                                  streak_days=row.streak_days, topics=row.topics or [])

    def save_analytics(self, value: DailyAnalytics) -> DailyAnalytics:
        with self.session_factory.begin() as db:
            user, _ = self._user_and_wallet(db)
            row = db.scalar(select(DBAnalytics).where(DBAnalytics.user_id == user.id, DBAnalytics.date == value.date))
            if row is None:
                row = DBAnalytics(user_id=user.id, date=value.date)
                db.add(row)
            row.learning_minutes = value.learning_minutes
            row.entertainment_minutes = value.entertainment_minutes
            row.videos_completed = value.videos_completed
            row.learning_confidence = value.learning_confidence
            row.streak_days = value.streak_days
            row.topics = value.topics
        return value.model_copy(deep=True)
