import os
import sys
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.config import settings
settings.DATABASE_PATH = "test_defi_guardian.db"

from app.database import init_db, reset_paper_database
from app.main import app


def make_mock_candles(coin: str = "BTC", count: int = 48, base_price: float = 60000.0):
    candles = []
    for i in range(count):
        o = base_price + (i % 5) * 50.0
        c = o + 25.0
        h = max(o, c) + 40.0
        l = min(o, c) - 40.0
        v = 200.0 + (i % 3) * 15.0
        candles.append({
            "t": 1700000000000 + i * 3600000,
            "T": 1700000000000 + (i + 1) * 3600000 - 1,
            "s": coin,
            "i": "1h",
            "o": o,
            "c": c,
            "h": h,
            "l": l,
            "v": v,
            "n": 150,
        })
    return candles


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db()
    reset_paper_database()
    yield
    test_db = os.path.abspath(settings.DATABASE_PATH)
    if os.path.exists(test_db):
        try:
            os.remove(test_db)
        except Exception:
            pass


@pytest.fixture(autouse=True)
def mock_hyperliquid_offline(request):
    """Mocks all Hyperliquid network calls for deterministic offline unit tests."""
    if "integration" in request.keywords:
        yield
        return

    async def fake_all_mids():
        return {
            "data": {"BTC": "60000.0", "ETH": "2000.0", "SOL": "100.0"},
            "is_cached": False,
            "error": None,
        }

    async def fake_candles(coin: str, interval: str = "1h", hours_back: int = 72):
        coin_u = coin.strip().upper()
        if coin_u not in settings.SUPPORTED_COINS:
            raise ValueError(f"Unsupported asset: {coin}")
        if interval not in settings.SUPPORTED_INTERVALS:
            raise ValueError(f"Unsupported interval: {interval}")
        base = {"BTC": 60000.0, "ETH": 2000.0, "SOL": 100.0}.get(coin_u, 100.0)
        return {
            "candles": make_mock_candles(coin=coin_u, count=48, base_price=base),
            "is_cached": False,
            "error": None,
        }

    async def fake_clearinghouse(address: str):
        return {
            "data": {
                "marginSummary": {"accountValue": "1250.50", "totalMarginUsed": "100.0"},
                "withdrawable": "1150.50",
                "assetPositions": [],
            },
            "is_cached": False,
            "error": None,
        }

    with patch("app.services.hyperliquid.hyperliquid_service.get_all_mids", side_effect=fake_all_mids), \
         patch("app.services.hyperliquid.hyperliquid_service.get_candles", side_effect=fake_candles), \
         patch("app.services.hyperliquid.hyperliquid_service.get_clearinghouse_state", side_effect=fake_clearinghouse):
        yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers():
    return {"X-Session-Token": settings.SESSION_TOKEN}
