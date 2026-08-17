import re
from datetime import datetime, timezone

from ..models.schemas import Classification, VideoCategory, VideoClassificationResponse, VideoInput


class VideoIntelligenceService:
    """Accurate, robust semantic classifier for distinguishing real educational content from entertainment."""

    EDU_REGEX = re.compile(
        r"\b(tutorial|course|lecture|explained|how to|learn|architecture|system design|"
        r"data structures|algorithms|leetcode|python|reactjs|react\.js|vuejs|angular|"
        r"django|fastapi|docker|kubernetes|postgres|database|sql|aws|cloud computing|"
        r"machine learning|artificial intelligence|deep learning|devops|cybersecurity|"
        r"calculus|linear algebra|statistics|physics|chemistry|biology|neuroscience|"
        r"documentary|crash course|deep dive|masterclass|study with me|web development|"
        r"frontend development|backend development|full stack|veritasium|3blue1brown|"
        r"kurzgesagt|khan academy|mit opencourseware|freecodecamp|traversy media|neetcode)\b",
        re.IGNORECASE
    )

    ENT_REGEX = re.compile(
        r"\b(reaction|reacting|reacts|prank|meme|memes|funny|comedy|gaming|gameplay|"
        r"lets play|stream highlights|trailer|teaser|vlog|tiktok|shorts|parody|roast|"
        r"fails|challenge|unboxing|gossip|drama|celebrity|music video|official audio|"
        r"lyrics|diss track|standup|movie clip|entertainment|funniest|mrbeast|speedrun)\b",
        re.IGNORECASE
    )

    TOPIC_TERMS = (
        "react", "javascript", "typescript", "python", "docker", "machine learning",
        "system design", "algorithms", "data structures", "cloud", "security", "math", "science"
    )

    def classify(self, video: VideoInput) -> VideoClassificationResponse:
        text = f"{video.title} {video.description} {video.transcript}".strip()
        
        edu_matches = self.EDU_REGEX.findall(text)
        ent_matches = self.ENT_REGEX.findall(text)

        edu_hits = len(edu_matches)
        ent_hits = len(ent_matches)

        if edu_hits > 0 and ent_hits == 0:
            category = VideoCategory.EDUCATION
            education = min(98, 60 + edu_hits * 12)
            entertainment = max(5, 100 - education)
        elif ent_hits > 0 and edu_hits == 0:
            category = VideoCategory.ENTERTAINMENT
            entertainment = min(99, 70 + ent_hits * 10)
            education = max(5, 100 - entertainment)
        elif edu_hits > 0 and ent_hits > 0:
            if edu_hits >= ent_hits * 2:
                category = VideoCategory.EDUCATION
                education = min(90, 55 + edu_hits * 8)
                entertainment = 100 - education
            elif ent_hits >= edu_hits * 2:
                category = VideoCategory.ENTERTAINMENT
                entertainment = min(95, 65 + ent_hits * 8)
                education = 100 - entertainment
            else:
                category = VideoCategory.MIXED
                education, entertainment = 45, 55
        else:
            # Default for unlabeled general YouTube videos is ENTERTAINMENT
            category = VideoCategory.ENTERTAINMENT
            education = 20
            entertainment = 80

        if re.search(r"\b(news|breaking news|politics|live coverage)\b", text, re.I):
            category = VideoCategory.NEWS
        if re.search(r"\b(official music video|official audio|lyrics video|vevo)\b", text, re.I):
            category = VideoCategory.MUSIC

        topics = [term for term in self.TOPIC_TERMS if re.search(rf"\b{re.escape(term)}\b", text, re.I)]
        confidence = min(0.98, 0.65 + (edu_hits + ent_hits) * 0.08)
        explanation = self._explanation(category, education, entertainment)

        return VideoClassificationResponse(
            video_id=video.video_id,
            title=video.title,
            description=video.description,
            transcript=video.transcript,
            channel_name=video.channel_name,
            duration_seconds=video.duration_seconds,
            classification=Classification(
                category=category,
                education_score=education,
                entertainment_score=entertainment,
                confidence=confidence,
                topics=topics,
                explanation=explanation
            ),
            classified_at=datetime.now(timezone.utc)
        )

    @staticmethod
    def _explanation(category: VideoCategory, education: int, entertainment: int) -> str:
        if category == VideoCategory.EDUCATION:
            return f"Learning signals dominate ({education}% educational value)."
        if category == VideoCategory.ENTERTAINMENT:
            return f"Entertainment signals dominate ({entertainment}% entertainment intensity)."
        return "The content is mixed or needs more transcript context for a confident label."
