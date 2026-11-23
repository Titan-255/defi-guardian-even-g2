import httpx
import time
import logging
from typing import Dict, List, Optional, Any
from app.config import settings

logger = logging.getLogger(__name__)

# In-memory short-lived cache to avoid hammering Hyperliquid and ensure instant responses
_CACHE = {
    "all_mids": {"data": None, "timestamp": 0},
    "candles": {}, # key: f"{coin}_{interval}" -> {"data": None, "timestamp": 0}
    "wallet": {},  # key: address -> {"data": None, "timestamp": 0}
}

CACHE_TTL_MIDS_SECONDS = 3.0
CACHE_TTL_CANDLES_SECONDS = 15.0
CACHE_TTL_WALLET_SECONDS = 10.0

class HyperliquidService:
    def __init__(self, api_url: Optional[str] = None):
        self.api_url = api_url or settings.HYPERLIQUID_API_URL

    async def get_all_mids(self) -> Dict[str, Any]:
        """
        Fetches current mid-prices for all traded assets on Hyperliquid.
        Returns: Dict mapping asset symbol to mid price string, e.g. {'BTC': '61400.0', ...}
        """
        now = time.time()
        cached = _CACHE["all_mids"]
        if cached["data"] and (now - cached["timestamp"] < CACHE_TTL_MIDS_SECONDS):
            return {"data": cached["data"], "is_cached": False, "error": None}

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.post(
                    self.api_url,
                    json={"type": "allMids"},
                    headers={"Content-Type": "application/json"}
                )
                if response.status_code == 200:
                    data = response.json()
                    _CACHE["all_mids"] = {"data": data, "timestamp": now}
                    return {"data": data, "is_cached": False, "error": None}
                else:
                    logger.warning(f"Hyperliquid allMids returned status {response.status_code}")
        except Exception as e:
            logger.error(f"Error fetching Hyperliquid allMids: {e}")

        # Fallback to stale cache if available
        if cached["data"]:
            return {"data": cached["data"], "is_cached": True, "error": "Using cached market data"}

        # If no cache exists, return empty fallback
        return {"data": {}, "is_cached": True, "error": "Hyperliquid API currently unavailable"}

    async def get_candles(self, coin: str, interval: str = "1h", hours_back: int = 72) -> Dict[str, Any]:
        """
        Fetches historical candle snapshots for a coin.
        API schema: { 'type': 'candleSnapshot', 'req': { 'coin': 'BTC', 'interval': '1h', 'startTime': ms, 'endTime': ms } }
        """
        cache_key = f"{coin.upper()}_{interval}"
        now = time.time()
        cached = _CACHE["candles"].get(cache_key)
        if cached and (now - cached["timestamp"] < CACHE_TTL_CANDLES_SECONDS):
            return {"candles": cached["data"], "is_cached": False, "error": None}

        now_ms = int(now * 1000)
        start_ms = now_ms - (hours_back * 3600 * 1000)

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.post(
                    self.api_url,
                    json={
                        "type": "candleSnapshot",
                        "req": {
                            "coin": coin.upper(),
                            "interval": interval,
                            "startTime": start_ms,
                            "endTime": now_ms
                        }
                    },
                    headers={"Content-Type": "application/json"}
                )
                if response.status_code == 200:
                    raw_candles = response.json()
                    # Parse numerical fields
                    parsed_candles = []
                    for c in raw_candles:
                        try:
                            parsed_candles.append({
                                "t": int(c["t"]),
                                "T": int(c["T"]),
                                "s": str(c["s"]),
                                "i": str(c["i"]),
                                "o": float(c["o"]),
                                "c": float(c["c"]),
                                "h": float(c["h"]),
                                "l": float(c["l"]),
                                "v": float(c["v"]),
                                "n": int(c.get("n", 0))
                            })
                        except (ValueError, KeyError) as parse_err:
                            continue
                    
                    _CACHE["candles"][cache_key] = {"data": parsed_candles, "timestamp": now}
                    return {"candles": parsed_candles, "is_cached": False, "error": None}
        except Exception as e:
            logger.error(f"Error fetching Hyperliquid candles for {coin}: {e}")

        if cached and cached["data"]:
            return {"candles": cached["data"], "is_cached": True, "error": "Using cached candles"}

        return {"candles": [], "is_cached": True, "error": f"Failed to retrieve candles for {coin}"}

    async def get_clearinghouse_state(self, address: str) -> Dict[str, Any]:
        """
        Fetches public margin and position details for an address from Hyperliquid.
        """
        if not address or not address.startswith("0x") or len(address) != 42:
            return {"error": "Invalid Ethereum/Hyperliquid wallet address format (must be 42-char hex starting with 0x)"}

        now = time.time()
        cached = _CACHE["wallet"].get(address)
        if cached and (now - cached["timestamp"] < CACHE_TTL_WALLET_SECONDS):
            return {"data": cached["data"], "is_cached": False, "error": None}

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.post(
                    self.api_url,
                    json={"type": "clearinghouseState", "user": address},
                    headers={"Content-Type": "application/json"}
                )
                if response.status_code == 200:
                    data = response.json()
                    _CACHE["wallet"][address] = {"data": data, "timestamp": now}
                    return {"data": data, "is_cached": False, "error": None}
        except Exception as e:
            logger.error(f"Error fetching clearinghouse state for {address}: {e}")

        if cached and cached["data"]:
            return {"data": cached["data"], "is_cached": True, "error": "Using cached wallet data"}

        return {"data": None, "is_cached": True, "error": "Could not connect to Hyperliquid for wallet data"}

hyperliquid_service = HyperliquidService()
