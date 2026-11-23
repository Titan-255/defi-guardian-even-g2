import pytest
import numpy as np
from app.services.anomaly_engine import AnomalyEngine

def test_extract_features():
    engine = AnomalyEngine()
    candle = {
        "o": 60000.0,
        "c": 61200.0,
        "h": 61500.0,
        "l": 59800.0,
        "v": 500.0
    }
    past_vols = [250.0, 250.0, 250.0]
    feats = engine.extract_features(candle, past_vols)
    assert len(feats) == 5
    # Log return should be ln(61200 / 60000) > 0
    assert feats[0] > 0
    # Range pct should be (61500 - 59800) / 60000 * 100 = 2.833%
    assert round(feats[1], 2) == 2.83
    # Rel vol should be 500 / 250 = 2.0
    assert round(feats[4], 1) == 2.0

@pytest.mark.asyncio
async def test_ml_anomaly_insufficient_data():
    engine = AnomalyEngine()
    # Mock hyperliquid service with insufficient candles (<24)
    from unittest.mock import AsyncMock, patch
    with patch("app.services.anomaly_engine.hyperliquid_service.get_candles", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = {
            "candles": [{"t": 1, "T": 2, "s": "BTC", "i": "1h", "o": 100, "c": 101, "h": 102, "l": 99, "v": 10, "n": 5}],
            "is_cached": False,
            "error": None
        }
        res = await engine.analyze_market(coin="BTC", interval="1h", hours_back=24)
        assert res["classification"] == "MODEL WARMING UP"
        assert res["is_anomaly"] is False
        assert "Model warming up" in res["explanation"]

@pytest.mark.asyncio
async def test_ml_anomaly_adequate_data():
    engine = AnomalyEngine()
    # Create 40 synthetic candles with an extreme anomaly on the last one
    synthetic_candles = []
    base_price = 60000.0
    for i in range(40):
        o = base_price + np.random.normal(0, 100)
        c = o + np.random.normal(0, 50)
        h = max(o, c) + 30
        l = min(o, c) - 30
        v = 200.0 + np.random.normal(0, 20)
        synthetic_candles.append({
            "t": 1000 + i * 3600000,
            "T": 1000 + (i + 1) * 3600000 - 1,
            "s": "BTC",
            "i": "1h",
            "o": o, "c": c, "h": h, "l": l, "v": v, "n": 100
        })

    # Add anomalous last candle: 10x volume, 8% range drop
    last_o = 60000.0
    last_c = 55200.0 # -8% drop
    synthetic_candles.append({
        "t": 1000 + 40 * 3600000,
        "T": 1000 + 41 * 3600000 - 1,
        "s": "BTC",
        "i": "1h",
        "o": last_o, "c": last_c, "h": 60100.0, "l": 55000.0, "v": 2500.0, "n": 2000
    })

    from unittest.mock import AsyncMock, patch
    with patch("app.services.anomaly_engine.hyperliquid_service.get_candles", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = {
            "candles": synthetic_candles,
            "is_cached": False,
            "error": None
        }
        res = await engine.analyze_market(coin="BTC", interval="1h", hours_back=48)
        assert res["coin"] == "BTC"
        assert res["sample_count"] == 41
        assert "disclaimer" in res
        # Anomaly score should be elevated
        assert res["anomaly_score"] > 0
        assert len(res["contributing_factors"]) > 0

def test_api_intelligence_endpoint(client):
    response = client.get("/api/intelligence?coin=BTC")
    assert response.status_code == 200
    data = response.json()
    assert data["coin"] == "BTC"
    assert "classification" in data
    assert "anomaly_score" in data
    assert "explanation" in data
    assert "disclaimer" in data
