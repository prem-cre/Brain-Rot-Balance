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


