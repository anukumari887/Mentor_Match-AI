from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_and_metrics_endpoints():
    assert client.get("/health").json() == {"status": "ok"}
    metrics = client.get("/metrics")
    assert metrics.status_code == 200
    assert "ml_recommend_requests_total" in metrics.text


def test_recommendation_contract_and_validation():
    response = client.post("/recommend", json={
        "learner": {"wantedSkills": ["python"], "budgetPerHour": 1000},
        "mentors": [{
            "id": "mentor-1",
            "skills": ["python"],
            "headline": "Python mentor",
            "bio": "Build useful software",
            "experienceYears": 5,
            "pricePerHour": 700,
            "availability": [],
            "ratingAvg": 0,
            "ratingCount": 0
        }],
        "limit": 5
    })
    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["id"] == "mentor-1"
    assert item["score"] > 0
    assert "breakdown" in item
    assert isinstance(item["reasons"], list)

    invalid = client.post("/recommend", json={"learner": {}, "mentors": [], "limit": 1000})
    assert invalid.status_code == 422