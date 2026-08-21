import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_health_check():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

def test_get_incidents():
    with TestClient(app) as client:
        response = client.get("/api/incidents")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

def test_get_analytics():
    with TestClient(app) as client:
        response = client.get("/api/analytics")
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "active_incidents" in data["summary"]

def test_submit_report():
    with TestClient(app) as client:
        payload = {
            "source": "API Test Citizen",
            "source_type": "verified_citizen",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "raw_text": "Flooded road near school campus with 4 stranded people",
            "disaster_type": "Flood",
            "people_affected": 4,
            "medical_need": False,
            "resource_requirements": ["Rescue Boat"]
        }
        response = client.post("/api/reports", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["source"] == "API Test Citizen"
