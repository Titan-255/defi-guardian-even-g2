import math

def test_alerts_one_time_trigger_fires_only_once(client, auth_headers):
    # Create one-time alert: BTC >= 50000 (mock BTC is 60000)
    create_res = client.post(
        "/api/alerts",
        json={"coin": "BTC", "target_price": 50000.0, "condition": "ABOVE"},
        headers=auth_headers,
    )
    assert create_res.status_code == 200
    alert_data = create_res.json()
    assert alert_data["is_active"] is True
    alert_id = alert_data["id"]

    # 1st check: triggers and deactivates
    check1 = client.post("/api/alerts/check").json()
    assert check1["triggered_count"] == 1
    assert check1["triggered_alerts"][0]["id"] == alert_id
    assert check1["triggered_alerts"][0]["is_active"] is False

    # 2nd & 3rd consecutive checks: must NOT fire again
    check2 = client.post("/api/alerts/check").json()
    check3 = client.post("/api/alerts/check").json()
    assert check2["triggered_count"] == 0
    assert check3["triggered_count"] == 0

    # Delete alert
    del_res = client.delete(f"/api/alerts/{alert_id}", headers=auth_headers)
    assert del_res.status_code == 200
    assert not any(a["id"] == alert_id for a in client.get("/api/alerts").json())


def test_alert_validation(client, auth_headers):
    # Unsupported coin
    r1 = client.post("/api/alerts", json={"coin": "DOGE", "target_price": 1.0, "condition": "ABOVE"}, headers=auth_headers)
    assert r1.status_code == 422

    # Negative / zero price
    r2 = client.post("/api/alerts", json={"coin": "BTC", "target_price": -100.0, "condition": "ABOVE"}, headers=auth_headers)
    assert r2.status_code == 422

    # Extremely large price
    r3 = client.post("/api/alerts", json={"coin": "BTC", "target_price": 1e300, "condition": "ABOVE"}, headers=auth_headers)
    assert r3.status_code == 422

    # Invalid condition
    r4 = client.post("/api/alerts", json={"coin": "BTC", "target_price": 50000.0, "condition": "EQUAL"}, headers=auth_headers)
    assert r4.status_code == 422
