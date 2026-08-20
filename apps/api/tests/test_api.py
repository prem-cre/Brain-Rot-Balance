import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.services.video_intelligence import VideoIntelligenceService
from src.models.schemas import VideoInput

def test_health_check():
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data

def test_dashboard_endpoint():
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/dashboard",
            headers={"X-Device-ID": "test-device-123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "wallet" in data
        assert "analytics" in data
        assert "vault" in data

def test_video_classification_service():
    service = VideoIntelligenceService()
    input_data = VideoInput(
        video_id="test-vid-1",
        title="System Design Deep Dive: Building Distributed Systems",
        description="Learn architecture patterns for scale.",
        duration_seconds=900
    )
    res = service.classify(input_data)
    assert res.classification.education_score >= 40
    assert res.classification.category.value in ["education", "mixed"]

def test_wallet_boost_endpoint():
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/wallet/boost?minutes=5",
            headers={"X-Device-ID": "test-device-123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["remaining_minutes"] >= 50
        assert data["earned_minutes"] >= 5

def test_add_to_vault_educational_success():
    with TestClient(app) as client:
        payload = {
            "video": {
                "video_id": "edu-123",
                "title": "Python Programming Course Tutorial for Beginners",
                "description": "Learn python step by step algorithm and data structures.",
                "duration_seconds": 1200
            },
            "priority": 4,
            "goal": "Master Python"
        }
        response = client.post(
            "/api/v1/vault",
            json=payload,
            headers={"X-Device-ID": "test-device-123"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["video"]["video_id"] == "edu-123"

def test_add_to_vault_entertainment_rejected():
    with TestClient(app) as client:
        payload = {
            "video": {
                "video_id": "ent-999",
                "title": "Funniest Gaming Pranks and Meme Compilation",
                "description": "Hilarious reaction and viral gaming video.",
                "duration_seconds": 600
            },
            "priority": 3,
            "goal": "Entertainment"
        }
        response = client.post(
            "/api/v1/vault",
            json=payload,
            headers={"X-Device-ID": "test-device-123"}
        )
        assert response.status_code == 422
        detail = response.json()["detail"]
        assert "Cannot add to Learning Vault" in detail
        assert "classified as Entertainment" in detail

def test_generate_micro_quiz_endpoint():
    with TestClient(app) as client:
        payload = {
            "video_id": "test-react-vid",
            "title": "React 19 Hooks and Component State Tutorial",
            "description": "Deep dive into useEffect and state architecture."
        }
        response = client.post(
            "/api/v1/learning/quiz",
            json=payload,
            headers={"X-Device-ID": "test-device-123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["options"]) == 4
        assert 0 <= data["correct_index"] < 4
        assert data["bonus_minutes"] == 5
        assert "question" in data
        assert "explanation" in data

def test_ml_classifier_endpoint():
    with TestClient(app) as client:
        edu_payload = {
            "title": "System Design: Building Scalable Microservices with Kafka",
            "description": "Learn event driven architecture patterns.",
            "channel": "Tech With Tim"
        }
        res = client.post("/api/v1/ml/classify", json=edu_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["is_educational"] is True
        assert data["education_score"] >= 60
        assert data["p_education"] > data["p_entertainment"]
        assert len(data["top_salient_terms"]) > 0

        ent_payload = {
            "title": "Sidemen $10,000,000 Luxury House Hide and Seek Challenge",
            "description": "Funniest moments and gaming highlights.",
            "channel": "Sidemen"
        }
        res_ent = client.post("/api/v1/ml/classify", json=ent_payload)
        assert res_ent.status_code == 200
        data_ent = res_ent.json()
        assert data_ent["is_educational"] is False
        assert data_ent["entertainment_score"] >= 60

def test_rl_habit_policy_and_feedback():
    with TestClient(app) as client:
        context = {
            "streak_days": 14,
            "spent_minutes_today": 45,
            "total_budget_minutes": 50,
            "quiz_pass_rate": 0.9,
            "completion_rate": 0.85
        }
        res = client.post("/api/v1/ml/habit-policy", json=context)
        assert res.status_code == 200
        policy = res.json()
        assert "action_id" in policy
        assert "reward_ratio_seconds" in policy
        assert policy["reward_ratio_seconds"] in [200, 240, 300]
        assert "recommendation_rationale" in policy

        feedback_payload = {
            "context": context,
            "action_id": policy["action_id"],
            "reward": 1.0
        }
        fb_res = client.post("/api/v1/ml/habit-feedback", json=feedback_payload)
        assert fb_res.status_code == 200
        assert fb_res.json()["status"] == "updated"




