from unittest.mock import AsyncMock, patch

def test_get_market(client):
    response = client.get("/api/market")
    assert response.status_code == 200
    data = response.json()
    assert data["coins"]["BTC"]["price"] == 60000.0
    assert data["coins"]["ETH"]["price"] == 2000.0
    assert data["coins"]["SOL"]["price"] == 100.0


def test_market_unavailable_returns_503(client):
    with patch("app.services.hyperliquid.hyperliquid_service.get_all_mids", new_callable=AsyncMock) as mock_mids:
        mock_mids.return_value = {"data": {}, "is_cached": False, "error": "Hyperliquid API currently unavailable"}
        response = client.get("/api/market")
        assert response.status_code == 503


def test_get_market_candles(client):
    response = client.get("/api/market/candles?coin=BTC&interval=1h&hours_back=24")
    assert response.status_code == 200
    data = response.json()
    assert data["coin"] == "BTC"
    assert len(data["candles"]) == 48


def test_invalid_candle_coin_and_interval(client):
    bad_coin = client.get("/api/market/candles?coin=DOGE&interval=1h")
    assert bad_coin.status_code == 400

    bad_interval = client.get("/api/market/candles?coin=BTC&interval=99m")
    assert bad_interval.status_code == 400

    bad_hours = client.get("/api/market/candles?coin=BTC&interval=1h&hours_back=999")
    assert bad_hours.status_code == 422
