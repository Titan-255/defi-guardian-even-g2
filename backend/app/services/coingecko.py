import httpx
import logging
from typing import Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class CoinGeckoService:
    def __init__(self):
        self.api_key = settings.COINGECKO_API_KEY
        self.base_url = settings.COINGECKO_API_URL

    @property
    def is_enabled(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    async def get_prices(self) -> Dict[str, Any]:
        """
        Optional secondary price lookup from CoinGecko free demo API.
        Maps BTC, ETH, SOL.
        """
        if not self.is_enabled:
            return {"enabled": False, "prices": {}, "error": "CoinGecko API key not configured (optional)"}

        headers = {}
        # Demo API uses x-cg-demo-api-key header
        if self.api_key:
            headers["x-cg-demo-api-key"] = self.api_key

        params = {
            "ids": "bitcoin,ethereum,solana",
            "vs_currencies": "usd",
            "include_24hr_change": "true",
            "include_24hr_vol": "true"
        }

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                response = await client.get(f"{self.base_url}/simple/price", params=params, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    mapped = {
                        "BTC": {
                            "price": data.get("bitcoin", {}).get("usd"),
                            "change_24h": data.get("bitcoin", {}).get("usd_24h_change"),
                        },
                        "ETH": {
                            "price": data.get("ethereum", {}).get("usd"),
                            "change_24h": data.get("ethereum", {}).get("usd_24h_change"),
                        },
                        "SOL": {
                            "price": data.get("solana", {}).get("usd"),
                            "change_24h": data.get("solana", {}).get("usd_24h_change"),
                        }
                    }
                    return {"enabled": True, "prices": mapped, "error": None}
        except Exception as e:
            logger.warning(f"Optional CoinGecko request failed: {e}")

        return {"enabled": True, "prices": {}, "error": "CoinGecko API request failed"}

coingecko_service = CoinGeckoService()
