import asyncio
from datetime import datetime, timezone
from typing import Dict, Any
from app.services.hyperliquid import hyperliquid_service

SUPPORTED_COINS = ["BTC", "ETH", "SOL"]

class MarketService:
    async def get_market_overview(self) -> Dict[str, Any]:
        """
        Retrieves real-time market data for BTC, ETH, SOL from Hyperliquid.
        Calculates 24h price change from cached hourly candle history concurrently.
        """
        mids_res = await hyperliquid_service.get_all_mids()
        mids_data = mids_res.get("data", {})
        is_cached = mids_res.get("is_cached", False)
        error = mids_res.get("error")

        if not mids_data and error:
            raise RuntimeError(error)

        # Fetch candle snapshots concurrently (served from 120s cache when warm)
        candle_results = await asyncio.gather(
            *[hyperliquid_service.get_candles(coin, interval="1h", hours_back=30) for coin in SUPPORTED_COINS],
            return_exceptions=True
        )

        coins_result = {}
        now_iso = datetime.now(timezone.utc).isoformat()

        for coin, candles_res in zip(SUPPORTED_COINS, candle_results):
            current_price_str = mids_data.get(coin)
            current_price = float(current_price_str) if current_price_str else 0.0

            change_24h = 0.0
            high_24h = None
            low_24h = None
            volume_24h = None

            candles = candles_res.get("candles", []) if isinstance(candles_res, dict) else []

            if len(candles) >= 24:
                c_24h_ago = candles[-24]["c"]
                if c_24h_ago > 0 and current_price > 0:
                    change_24h = round(((current_price - c_24h_ago) / c_24h_ago) * 100, 2)

                last_24 = candles[-24:]
                high_24h = max(c["h"] for c in last_24)
                low_24h = min(c["l"] for c in last_24)
                volume_24h = sum(c["v"] for c in last_24)
            elif current_price > 0 and len(candles) > 1:
                first_c = candles[0]["c"]
                if first_c > 0:
                    change_24h = round(((current_price - first_c) / first_c) * 100, 2)

            coins_result[coin] = {
                "coin": coin,
                "price": current_price,
                "change_24h": change_24h,
                "high_24h": high_24h,
                "low_24h": low_24h,
                "volume_24h": volume_24h,
                "timestamp": now_iso,
                "source": "Hyperliquid AllMids"
            }

        return {
            "coins": coins_result,
            "source": "Hyperliquid",
            "last_updated": now_iso,
            "is_cached": is_cached
        }

market_service = MarketService()
