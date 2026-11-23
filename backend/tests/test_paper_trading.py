import pytest
from app.database import reset_paper_database

def test_paper_portfolio_initialization(client):
    reset_paper_database()
    response = client.get("/api/portfolio")
    assert response.status_code == 200
    data = response.json()
    assert data["initial_cash"] == 10000.0
    assert data["available_cash"] == 10000.0
    assert data["total_portfolio_value"] == 10000.0
    assert data["is_paper"] is True
    assert "holdings" in data

def test_paper_trade_buy_and_sell(client):
    reset_paper_database()
    
    # 1. Preview BUY $100 BTC
    preview_res = client.post("/api/trades/preview", json={
        "coin": "BTC",
        "action": "BUY",
        "amount_usd": 100.0
    })
    assert preview_res.status_code == 200
    p_data = preview_res.json()
    assert p_data["valid"] is True
    assert p_data["cash_after_trade"] == 9900.0
    assert p_data["calculated_quantity"] > 0

    # 2. Confirm BUY $100 BTC
    confirm_res = client.post("/api/trades/confirm", json={
        "coin": "BTC",
        "action": "BUY",
        "amount_usd": 100.0
    })
    assert confirm_res.status_code == 200
    c_data = confirm_res.json()
    assert c_data["success"] is True
    assert c_data["available_cash"] == 9900.0
    assert c_data["coin"] == "BTC"
    bought_qty = c_data["quantity"]

    # 3. Check portfolio after BUY
    port_res = client.get("/api/portfolio")
    assert port_res.status_code == 200
    port_data = port_res.json()
    assert port_data["available_cash"] == 9900.0
    btc_holding = next(h for h in port_data["holdings"] if h["coin"] == "BTC")
    assert btc_holding["quantity"] > 0

    # 4. Confirm SELL $50 BTC
    sell_res = client.post("/api/trades/confirm", json={
        "coin": "BTC",
        "action": "SELL",
        "amount_usd": 50.0
    })
    assert sell_res.status_code == 200
    s_data = sell_res.json()
    assert s_data["success"] is True
    assert s_data["available_cash"] == 9950.0

    # 5. Check trades history
    trades_res = client.get("/api/trades")
    assert trades_res.status_code == 200
    trades = trades_res.json()
    assert len(trades) >= 2

def test_paper_trade_rejections(client):
    reset_paper_database()

    # Reject BUY exceeding available cash ($15,000 > $10,000)
    preview_res = client.post("/api/trades/preview", json={
        "coin": "BTC",
        "action": "BUY",
        "amount_usd": 15000.0
    })
    assert preview_res.status_code == 200
    assert preview_res.json()["valid"] is False
    assert "Insufficient paper cash" in preview_res.json()["error_message"]

    # Reject SELL when user owns 0 BTC
    sell_preview = client.post("/api/trades/preview", json={
        "coin": "BTC",
        "action": "SELL",
        "amount_usd": 50.0
    })
    assert sell_preview.status_code == 200
    assert sell_preview.json()["valid"] is False
    assert "Insufficient BTC holding" in sell_preview.json()["error_message"]

    # Reject invalid coin
    bad_coin = client.post("/api/trades/preview", json={
        "coin": "DOGE",
        "action": "BUY",
        "amount_usd": 50.0
    })
    assert bad_coin.status_code == 200
    assert bad_coin.json()["valid"] is False

def test_demo_reset(client):
    # Execute a trade
    client.post("/api/trades/confirm", json={
        "coin": "ETH",
        "action": "BUY",
        "amount_usd": 200.0
    })
    # Reset
    reset_res = client.post("/api/demo/reset")
    assert reset_res.status_code == 200
    # Verify balance restored
    port_res = client.get("/api/portfolio")
    assert port_res.json()["available_cash"] == 10000.0
    assert port_res.json()["total_portfolio_value"] == 10000.0
