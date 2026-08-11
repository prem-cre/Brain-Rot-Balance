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


