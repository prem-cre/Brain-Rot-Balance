import re
from datetime import datetime, timezone

from ..models.schemas import Classification, VideoCategory, VideoClassificationResponse, VideoInput


class VideoIntelligenceService:
    """Transparent baseline classifier; replace its provider, not the API contract."""

    EDUCATION_TERMS = {"tutorial", "course", "lecture", "explained", "learn", "how to",
                       "documentation", "algorithm", "programming", "react", "docker",
                       "python", "system design", "machine learning", "math", "science"}
    ENTERTAINMENT_TERMS = {"shorts", "funny", "meme", "prank", "celebrity", "gaming", "gameplay",
                           "reaction", "compilation", "viral", "challenge", "funniest"}
    TOPIC_TERMS = ("react", "javascript", "python", "docker", "machine learning", "system design",
                   "algorithms", "career", "fitness", "finance", "math", "science")

    def classify(self, video: VideoInput) -> VideoClassificationResponse:
        text = " ".join((video.title, video.description, video.transcript)).lower()
        education_hits = sum(1 for term in self.EDUCATION_TERMS if term in text)
        entertainment_hits = sum(1 for term in self.ENTERTAINMENT_TERMS if term in text)
        education = min(98, 18 + education_hits * 14)
        entertainment = min(99, 12 + entertainment_hits * 16)
        if education_hits and entertainment_hits:
            category = VideoCategory.MIXED
        elif education_hits:
            category = VideoCategory.EDUCATION
        elif entertainment_hits:
            category = VideoCategory.ENTERTAINMENT
        else:
            category = VideoCategory.MIXED
            education, entertainment = 45, 45
        if "news" in text or "breaking" in text:
            category = VideoCategory.NEWS
        if "music" in text or "official audio" in text:
            category = VideoCategory.MUSIC
        topics = [term for term in self.TOPIC_TERMS if term in text]
        confidence = min(0.98, 0.55 + (education_hits + entertainment_hits) * 0.08)
        explanation = self._explanation(category, education, entertainment)
        return VideoClassificationResponse(video_id=video.video_id, title=video.title,
            description=video.description, transcript=video.transcript,
            channel_name=video.channel_name, duration_seconds=video.duration_seconds,
            classification=Classification(category=category, education_score=education,
                entertainment_score=entertainment, confidence=confidence, topics=topics,
                explanation=explanation), classified_at=datetime.now(timezone.utc))

    @staticmethod
    def _explanation(category: VideoCategory, education: int, entertainment: int) -> str:
        if category == VideoCategory.EDUCATION:
            return f"Learning signals dominate ({education}% educational value)."
        if category == VideoCategory.ENTERTAINMENT:
            return f"Entertainment signals dominate ({entertainment}% entertainment intensity)."
        return "The content is mixed or needs more transcript context for a confident label."
