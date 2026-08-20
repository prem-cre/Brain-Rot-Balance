from typing import Any
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from ..ml.classifier import LightweightMLClassifier
from ..ml.rl_agent import LinUCBHabitPolicyAgent, RLPolicyRecommendation, UserHabitContext

router = APIRouter(prefix="/ml", tags=["machine-learning"])

# In-memory singleton instances for high-speed local inference
ml_classifier = LightweightMLClassifier()
rl_agent = LinUCBHabitPolicyAgent()


class MLClassifyRequest(BaseModel):
    title: str = Field(..., description="Video title")
    description: str = Field("", description="Video description")
    channel: str = Field("", description="Channel name")


class MLClassifyResponse(BaseModel):
    title: str
    is_educational: bool
    education_score: int
    entertainment_score: int
    p_education: float
    p_entertainment: float
    confidence: float
    top_salient_terms: list[str]


class RLFeedbackRequest(BaseModel):
    context: UserHabitContext
    action_id: int
    reward: float = Field(..., description="Observed reward (-1.0 to +1.0)")


@router.post("/classify", response_model=MLClassifyResponse)
def classify_video_ml(payload: MLClassifyRequest) -> MLClassifyResponse:
    """Classifies video educational vs entertainment probability using TF-IDF + Logistic ML model."""
    full_text = f"{payload.title} {payload.channel} {payload.description}".strip()
    result = ml_classifier.predict(full_text)

    return MLClassifyResponse(
        title=payload.title,
        is_educational=result["is_educational"],
        education_score=result["education_score"],
        entertainment_score=result["entertainment_score"],
        p_education=result["p_education"],
        p_entertainment=result["p_entertainment"],
        confidence=result["confidence"],
        top_salient_terms=result["top_salient_terms"]
    )


@router.post("/habit-policy", response_model=RLPolicyRecommendation)
def get_habit_policy_recommendation(context: UserHabitContext) -> RLPolicyRecommendation:
    """Uses LinUCB Contextual Bandit Reinforcement Learning to recommend an adaptive habit policy."""
    return rl_agent.select_policy(context)


@router.post("/habit-feedback")
def submit_habit_feedback(payload: RLFeedbackRequest) -> dict[str, Any]:
    """Applies online Bayesian update to the Reinforcement Learning policy agent."""
    rl_agent.update(payload.context, payload.action_id, payload.reward)
    return {
        "status": "updated",
        "action_id": payload.action_id,
        "reward_applied": payload.reward
    }
