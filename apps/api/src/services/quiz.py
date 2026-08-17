import json
import logging
from typing import Any
import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class QuizRequest(BaseModel):
    video_id: str = Field(..., description="YouTube video ID or slug")
    title: str = Field(..., description="Video title")
    description: str | None = Field(None, description="Video description or snippet")
    transcript: str | None = Field(None, description="Optional transcript excerpt")


class QuizResponse(BaseModel):
    video_id: str
    question: str
    options: list[str]
    correct_index: int
    explanation: str
    concept: str
    bonus_minutes: int = 5


class GroqQuizService:
    """Generates 1-question comprehension micro-quizzes using Groq llama-3.1-8b-instant with resilient fallback."""

    FALLBACK_QUESTION_BANK: dict[str, dict[str, Any]] = {
        "system_design": {
            "concept": "System Design & Scaling",
            "question": "Which strategy is primarily used to prevent a single point of failure and distribute incoming web traffic across multiple servers?",
            "options": [
                "Deploying a Reverse Proxy / Load Balancer",
                "Increasing the hard drive storage capacity",
                "Hardcoding IP addresses in client browsers",
                "Disabling database caching"
            ],
            "correct_index": 0,
            "explanation": "A Load Balancer distributes network traffic evenly across backend instances, improving availability and preventing single points of failure."
        },
        "react": {
            "concept": "React Component Architecture",
            "question": "In modern React, why should side effects (like data fetching or subscriptions) be placed inside useEffect instead of the component body?",
            "options": [
                "To prevent infinite re-render loops and unintended side-effects on every render cycle",
                "Because React components cannot execute standard JavaScript functions",
                "To make HTML markup render in 3D",
                "To automatically convert client components to server components"
            ],
            "correct_index": 0,
            "explanation": "Placing side-effects in useEffect ensures they only run after render completion and according to explicit dependency triggers."
        },
        "python": {
            "concept": "Python Concurrency & Memory",
            "question": "What is the primary benefit of using Python generators with the 'yield' keyword over returning a full list?",
            "options": [
                "Memory efficiency through lazy evaluation (yielding one item at a time on demand)",
                "They automatically encrypt variable values in RAM",
                "They bypass Python syntax error checks",
                "They run code on the GPU directly"
            ],
            "correct_index": 0,
            "explanation": "Generators compute items lazily, requiring O(1) memory overhead compared to generating large lists in memory."
        },
        "dsa": {
            "concept": "Data Structures & Algorithms",
            "question": "What is the average time complexity for searching an element in a balanced Binary Search Tree (BST) with N nodes?",
            "options": [
                "O(log N)",
                "O(N^2)",
                "O(1) constant time",
                "O(N log N)"
            ],
            "correct_index": 0,
            "explanation": "A balanced BST cuts the remaining search space in half at each step, yielding logarithmic O(log N) search complexity."
        },
        "docker": {
            "concept": "Containerization & DevOps",
            "question": "What is the primary architectural difference between a Docker container and a traditional Virtual Machine?",
            "options": [
                "Containers share the host OS kernel and isolate at process level, making them lightweight",
                "Containers require dedicated hypervisors with full guest OS kernels",
                "Virtual machines cannot run on Linux servers",
                "Containers cannot communicate across network ports"
            ],
            "correct_index": 0,
            "explanation": "Docker containers share the host operating system kernel, avoiding the heavy memory and startup overhead of a guest OS."
        },
        "general": {
            "concept": "Engineering Fundamentals",
            "question": "What is the primary purpose of writing modular, decoupled software architectures?",
            "options": [
                "To improve maintainability, testability, and separation of concerns",
                "To increase the number of files in the project",
                "To force all functions to be synchronous",
                "To prevent unit tests from executing"
            ],
            "correct_index": 0,
            "explanation": "Modular decoupling ensures components can be developed, tested, and scaled independently with minimal side effects."
        }
    }

    def __init__(self, api_key: str | None = None, model: str = "llama-3.1-8b-instant"):
        self.api_key = api_key
        self.model = model
        self.endpoint = "https://api.groq.com/openai/v1/chat/completions"

    def generate_quiz(self, request: QuizRequest) -> QuizResponse:
        """Generates a 1-question micro-quiz using Groq LLM or falls back to topic rules."""
        if self.api_key:
            try:
                ai_quiz = self._call_groq_api(request)
                if ai_quiz:
                    return ai_quiz
            except Exception as e:
                logger.warning(f"Groq API quiz generation failed, using intelligent fallback: {e}")

        return self._generate_fallback_quiz(request)

    def _call_groq_api(self, request: QuizRequest) -> QuizResponse | None:
        """Calls Groq API with JSON mode for llama-3.1-8b-instant."""
        system_prompt = (
            "You are an expert technical education engine. Given a video title and description, "
            "generate exactly ONE multiple-choice comprehension question that tests understanding of the core concept.\n"
            "Rules:\n"
            "1. Focus on core architectural/conceptual principles, NOT trivial trivia.\n"
            "2. Provide exactly 4 options (A, B, C, D) where 1 is correct and 3 are plausible distractors.\n"
            "3. Keep the question and options concise (readable in 10 seconds).\n"
            "4. Output STRICT JSON ONLY matching this schema:\n"
            "{\n"
            '  "question": "string",\n'
            '  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],\n'
            '  "correct_index": 0,\n'
            '  "explanation": "1-2 sentences explanation of why the answer is correct",\n'
            '  "concept": "1-3 words topic"\n'
            "}"
        )

        user_content = f"Video Title: {request.title}\nDescription/Context: {request.description or 'Technical tutorial'}"
        if request.transcript:
            user_content += f"\nTranscript Snippet: {request.transcript[:1000]}"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.2,
            "max_tokens": 250,
            "response_format": {"type": "json_object"}
        }

        with httpx.Client(timeout=4.0) as client:
            response = client.post(self.endpoint, headers=headers, json=payload)
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)

                options = parsed.get("options", [])
                correct_idx = int(parsed.get("correct_index", 0))

                if len(options) == 4 and 0 <= correct_idx < 4 and parsed.get("question"):
                    return QuizResponse(
                        video_id=request.video_id,
                        question=parsed["question"],
                        options=options,
                        correct_index=correct_idx,
                        explanation=parsed.get("explanation", "Correct conceptual application."),
                        concept=parsed.get("concept", "Core Concept"),
                        bonus_minutes=5
                    )

        return None

    def _generate_fallback_quiz(self, request: QuizRequest) -> QuizResponse:
        """Determines best concept match from title keywords."""
        title_lower = request.title.lower()

        if any(w in title_lower for w in ["system design", "distributed", "architecture", "microservice", "scale"]):
            template = self.FALLBACK_QUESTION_BANK["system_design"]
        elif any(w in title_lower for w in ["react", "frontend", "next.js", "hook", "component", "state"]):
            template = self.FALLBACK_QUESTION_BANK["react"]
        elif any(w in title_lower for w in ["python", "django", "fastapi", "flask", "asyncio"]):
            template = self.FALLBACK_QUESTION_BANK["python"]
        elif any(w in title_lower for w in ["dsa", "algorithm", "tree", "graph", "binary search", "sorting", "leetcode"]):
            template = self.FALLBACK_QUESTION_BANK["dsa"]
        elif any(w in title_lower for w in ["docker", "kubernetes", "k8s", "container", "devops", "ci/cd"]):
            template = self.FALLBACK_QUESTION_BANK["docker"]
        else:
            template = self.FALLBACK_QUESTION_BANK["general"]

        return QuizResponse(
            video_id=request.video_id,
            question=template["question"],
            options=template["options"],
            correct_index=template["correct_index"],
            explanation=template["explanation"],
            concept=template["concept"],
            bonus_minutes=5
        )
