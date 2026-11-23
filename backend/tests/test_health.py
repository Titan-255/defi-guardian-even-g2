def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database_ready" in data
    assert data["database_ready"] is True
    assert data["ml_engine_ready"] is True

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "DeFi Guardian"
    assert "disclaimer" in data
