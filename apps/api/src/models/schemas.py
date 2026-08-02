from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class VideoCategory(StrEnum):
    EDUCATION = "education"
    ENTERTAINMENT = "entertainment"
    NEWS = "news"
    MUSIC = "music"
    FITNESS = "fitness"
    MIXED = "mixed"


class SessionKind(StrEnum):
    LEARNING = "learning"
    ENTERTAINMENT = "entertainment"


class VideoInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    video_id: str = Field(min_length=1, max_length=32)
    title: str = Field(min_length=1, max_length=300)
    description: str = Field(default="", max_length=10_000)
    transcript: str = Field(default="", max_length=100_000)
    channel_name: str = Field(default="", max_length=200)
    duration_seconds: int | None = Field(default=None, ge=1, le=86_400)


class Classification(BaseModel):
    category: VideoCategory
    education_score: int = Field(ge=0, le=100)
    entertainment_score: int = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    topics: list[str] = Field(default_factory=list, max_length=12)
    explanation: str


class VideoClassificationResponse(VideoInput):
    classification: Classification
    classified_at: datetime


class SessionStart(BaseModel):
    video: VideoInput
    kind: SessionKind | None = None
    source: str = Field(default="youtube", max_length=40)


class Session(BaseModel):
    id: str
    video: VideoInput
    classification: Classification
    kind: SessionKind
    started_at: datetime
    last_heartbeat_at: datetime
    watched_seconds: int = 0
    active_seconds: int = 0
    max_position_seconds: int = 0
    tab_focus_ratio: float = 1.0
    playback_speed: float = 1.0
    completed: bool = False


class Heartbeat(BaseModel):
    position_seconds: int = Field(ge=0)
    active_seconds: int = Field(default=0, ge=0, le=120)
    tab_focused: bool = True
    playback_speed: float = Field(default=1.0, ge=0.25, le=4.0)


class SessionResponse(BaseModel):
    session: Session
    wallet_minutes: int
    focus_mode: bool


class Wallet(BaseModel):
    date: str
    remaining_minutes: int = Field(ge=0)
    earned_minutes: int = Field(ge=0)
    spent_minutes: int = Field(ge=0)
    limit_minutes: int = Field(ge=1)
    focus_mode: bool


class LearningVerification(BaseModel):
    session_id: str
    quiz_answer: str = Field(default="", max_length=2_000)
    quiz_score: float | None = Field(default=None, ge=0, le=1)
    transcript_coverage: float = Field(default=0, ge=0, le=1)
    attention_ratio: float = Field(default=0, ge=0, le=1)


class VerificationResult(BaseModel):
    confidence_score: int = Field(ge=0, le=100)
    verified: bool
    reward_minutes: int = Field(ge=0)
    reasons: list[str]
    wallet: Wallet


class VaultItemCreate(BaseModel):
    video: VideoInput
    priority: int = Field(default=3, ge=1, le=5)
    goal: str = Field(default="General learning", max_length=200)


class VaultItem(VaultItemCreate):
    id: str
    status: str = "queued"
    added_at: datetime
    completed_at: datetime | None = None


class DailyAnalytics(BaseModel):
    date: str
    learning_minutes: int
    entertainment_minutes: int
    videos_completed: int
    learning_confidence: int
    streak_days: int
    topics: list[str]


class DashboardResponse(BaseModel):
    wallet: Wallet
    analytics: DailyAnalytics
    current_session: Session | None
    vault: list[VaultItem]


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str
    version: str


@field_validator("video_id")
def video_id_is_safe(value: str) -> str:
    if any(char.isspace() for char in value):
        raise ValueError("video_id cannot contain whitespace")
    return value
