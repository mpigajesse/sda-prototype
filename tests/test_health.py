def test_health_returns_operational(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "operational"
    assert body["offline_ready"] is True
    assert body["central_dependency"] == "none"
