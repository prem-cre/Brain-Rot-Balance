from ..models.schemas import DailyAnalytics, Session
from ..repositories import MemoryRepository


class AnalyticsService:
    def __init__(self, repository: MemoryRepository):
        self.repository = repository

    def record_completion(self, session: Session, minutes: int) -> DailyAnalytics:
        analytics = self.repository.get_analytics()
        if session.kind.value == "learning":
            analytics.learning_minutes += minutes
            analytics.learning_confidence = min(100, analytics.learning_confidence +
                                                session.classification.education_score // 10)
            analytics.topics = sorted(set(analytics.topics + session.classification.topics))[:12]
        else:
            analytics.entertainment_minutes += minutes
        analytics.videos_completed += 1
        analytics.streak_days = max(1, analytics.streak_days)
        return self.repository.save_analytics(analytics)
