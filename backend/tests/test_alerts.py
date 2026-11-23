def test_alerts_crud_and_check(client):
    # 1. Create alert
    create_res = client.post("/api/alerts", json={
        "coin": "BTC",
        "target_price": 50000.0,
        "condition": "ABOVE"
    })
    assert create_res.status_code == 200
    alert_data = create_res.json()
    assert alert_data["coin"] == "BTC"
    assert alert_data["target_price"] == 50000.0
    alert_id = alert_data["id"]

    # 2. List alerts
    list_res = client.get("/api/alerts")
    assert list_res.status_code == 200
    alerts = list_res.json()
    assert any(a["id"] == alert_id for a in alerts)

    # 3. Check alerts (BTC is > 50,000, so it should trigger)
    check_res = client.post("/api/alerts/check")
    assert check_res.status_code == 200
    check_data = check_res.json()
    assert check_data["triggered_count"] >= 1
    assert any(a["id"] == alert_id for a in check_data["triggered_alerts"])

    # 4. Delete alert
    del_res = client.delete(f"/api/alerts/{alert_id}")
    assert del_res.status_code == 200

    # 5. Verify deleted
    list_res2 = client.get("/api/alerts")
    alerts2 = list_res2.json()
    assert not any(a["id"] == alert_id for a in alerts2)
