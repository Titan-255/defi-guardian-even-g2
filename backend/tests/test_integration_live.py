import pytest

@pytest.mark.integration
def test_live_hyperliquid_market_smoke(client):
    res = client.get("/api/market")
    assert res.status_code == 200
    data = res.json()
    assert data["coins"]["BTC"]["price"] > 0
