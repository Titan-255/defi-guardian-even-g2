def test_get_market(client):
    response = client.get("/api/market")
    assert response.status_code == 200
    data = response.json()
    assert "coins" in data
    assert "source" in data
    # BTC, ETH, and SOL should be present in coins mapping
    for coin in ["BTC", "ETH", "SOL"]:
        assert coin in data["coins"]
        assert "price" in data["coins"][coin]
        assert data["coins"][coin]["price"] >= 0

def test_get_market_candles(client):
    response = client.get("/api/market/candles?coin=BTC&interval=1h&hours_back=24")
    assert response.status_code == 200
    data = response.json()
    assert data["coin"] == "BTC"
    assert "candles" in data
    assert isinstance(data["candles"], list)
