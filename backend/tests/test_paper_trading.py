import asyncio
from unittest.mock import AsyncMock, patch
import pytest
from app.database import reset_paper_database
from app.services.paper_trading import paper_trading_service


def test_paper_portfolio_initialization(client):
    reset_paper_database()
    response = client.get("/api/portfolio")
    assert response.status_code == 200
    data = response.json()
    assert data["initial_cash"] == 10000.0
    assert data["available_cash"] == 10000.0
    assert data["total_portfolio_value"] == 10000.0
    assert data["is_paper"] is True


def test_paper_trade_buy_and_sell(client, auth_headers):
    reset_paper_database()

    # 1. Preview BUY $100 BTC
    preview_res = client.post("/api/trades/preview", json={"coin": "BTC", "action": "BUY", "amount_usd": 100.0})
    assert preview_res.status_code == 200
    p_data = preview_res.json()
    assert p_data["valid"] is True
    assert p_data["cash_after_trade"] == 9900.0

    # 2. Confirm BUY $100 BTC with matching preview price/timestamp
    confirm_res = client.post(
        "/api/trades/confirm",
        json={
            "coin": "BTC",
            "action": "BUY",
            "amount_usd": 100.0,
            "preview_price": p_data["current_price"],
            "preview_timestamp": p_data["preview_timestamp"],
        },
        headers=auth_headers,
    )
    assert confirm_res.status_code == 200
    assert confirm_res.json()["available_cash"] == 9900.0

    # 3. Confirm SELL $50 BTC
    sell_res = client.post(
        "/api/trades/confirm",
        json={"coin": "BTC", "action": "SELL", "amount_usd": 50.0},
        headers=auth_headers,
    )
    assert sell_res.status_code == 200
    assert sell_res.json()["available_cash"] == 9950.0

    # 4. Persistence check
    trades = client.get("/api/trades").json()
    assert len(trades) == 2


def test_paper_trade_stale_price_drift_returns_409(client, auth_headers):
    reset_paper_database()
    # Preview was at $50,000, current mock is $60,000 (>0.5% drift)
    res = client.post(
        "/api/trades/confirm",
        json={"coin": "BTC", "action": "BUY", "amount_usd": 100.0, "preview_price": 50000.0},
        headers=auth_headers,
    )
    assert res.status_code == 409
    assert "price changed" in res.json()["detail"].lower()


def test_paper_trade_rejections(client, auth_headers):
    reset_paper_database()

    # Negative amount
    neg_res = client.post("/api/trades/preview", json={"coin": "BTC", "action": "BUY", "amount_usd": -50.0})
    assert neg_res.status_code == 422

    # Insufficient cash
    ins_cash = client.post("/api/trades/preview", json={"coin": "BTC", "action": "BUY", "amount_usd": 15000.0})
    assert ins_cash.status_code == 200
    assert ins_cash.json()["valid"] is False

    # Insufficient holdings
    ins_hold = client.post("/api/trades/preview", json={"coin": "BTC", "action": "SELL", "amount_usd": 50.0})
    assert ins_hold.status_code == 200
    assert ins_hold.json()["valid"] is False


@pytest.mark.asyncio
async def test_concurrent_paper_trades_prevent_overspending():
    reset_paper_database()
    # Attempt two simultaneous $6,000 BUY orders against $10,000 cash
    results = await asyncio.gather(
        paper_trading_service.execute_trade("BTC", "BUY", 6000.0),
        paper_trading_service.execute_trade("BTC", "BUY", 6000.0),
        return_exceptions=True,
    )
    successes = [r for r in results if isinstance(r, dict) and r.get("success")]
    failures = [r for r in results if isinstance(r, Exception)]

    assert len(successes) == 1
    assert len(failures) == 1

    portfolio = await paper_trading_service.get_portfolio()
    assert portfolio["available_cash"] == 4000.0
    assert portfolio["available_cash"] >= 0


def test_demo_reset(client, auth_headers):
    client.post("/api/trades/confirm", json={"coin": "ETH", "action": "BUY", "amount_usd": 200.0}, headers=auth_headers)
    reset_res = client.post("/api/demo/reset", headers=auth_headers)
    assert reset_res.status_code == 200
    port = client.get("/api/portfolio").json()
    assert port["available_cash"] == 10000.0
