def test_cors_allowed_and_untrusted_origins(client):
    # Trusted origin
    ok_res = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert ok_res.status_code == 200
    assert ok_res.headers.get("access-control-allow-origin") == "http://localhost:5173"

    # Untrusted origin should NOT receive CORS allow header
    bad_res = client.get("/api/health", headers={"Origin": "https://evil-attacker.example"})
    assert bad_res.status_code == 200
    assert bad_res.headers.get("access-control-allow-origin") is None


def test_mutating_endpoints_require_session_token_and_trusted_origin(client, auth_headers):
    # Missing token -> 403
    r1 = client.post("/api/demo/reset")
    assert r1.status_code == 403

    r2 = client.post("/api/trades/confirm", json={"coin": "BTC", "action": "BUY", "amount_usd": 50.0})
    assert r2.status_code == 403

    r3 = client.post("/api/alerts", json={"coin": "BTC", "target_price": 50000.0, "condition": "ABOVE"})
    assert r3.status_code == 403

    # Untrusted origin even with token -> 403
    r4 = client.post(
        "/api/demo/reset",
        headers={**auth_headers, "Origin": "https://evil-attacker.example"},
    )
    assert r4.status_code == 403


def test_wallet_address_validation(client, auth_headers):
    invalid_addresses = [
        "",
        "0x123",
        "0x" + "Z" * 40,
        "1234567890abcdef1234567890abcdef12345678",
        "0x" + "a" * 41,
    ]
    for addr in invalid_addresses:
        res = client.post("/api/wallet/configure", json={"address": addr}, headers=auth_headers)
        assert res.status_code in (400, 422), f"Expected rejection for {addr}"

    # Valid address
    valid_addr = "0x1234567890abcdef1234567890abcdef12345678"
    ok_res = client.post("/api/wallet/configure", json={"address": valid_addr}, headers=auth_headers)
    assert ok_res.status_code == 200
    assert ok_res.json()["address"] == valid_addr

    # Clear
    clr = client.delete("/api/wallet/configure", headers=auth_headers)
    assert clr.status_code == 200
