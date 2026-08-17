from fastapi import APIRouter, Request
from ..services.quiz import QuizRequest, QuizResponse

router = APIRouter(prefix="/learning", tags=["quiz"])


@router.post("/quiz", response_model=QuizResponse)
def generate_micro_quiz(request: Request, payload: QuizRequest) -> QuizResponse:
    """Generates a 1-question comprehension micro-quiz for educational verification."""
    quiz_service = getattr(request.app.state, "quiz_service", None)
    if not quiz_service:
        from ..config import get_settings
        from ..services.quiz import GroqQuizService
        settings = get_settings()
        quiz_service = GroqQuizService(api_key=settings.groq_api_key, model=settings.groq_model)

    return quiz_service.generate_quiz(payload)
