from fastapi import APIRouter, Query, HTTPException
from app.config import settings
from app.schemas import MarketOverviewResponse, CandlesResponse, CandleItem
from app.services.market_service import market_service
from app.services.hyperliquid import hyperliquid_service

router = APIRouter(prefix="/api/market", tags=["Market"])

@router.get("", response_model=MarketOverviewResponse)
async def get_market():
    """Returns real-time mid-prices and 24h metrics for BTC, ETH, SOL from Hyperliquid."""
    try:
        overview = await market_service.get_market_overview()
        return overview
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Market data unavailable: {str(e)}")

@router.get("/candles", response_model=CandlesResponse)
async def get_candles(
    coin: str = Query("BTC", description="Coin symbol (BTC, ETH, SOL)"),
    interval: str = Query("1h", description="Candle interval (1m, 5m, 15m, 1h, 4h, 1d)"),
    hours_back: int = Query(48, ge=6, le=168, description="Hours of historical candles to fetch")
):
    """Returns historical candle snapshots for the requested coin."""
    coin_upper = coin.strip().upper()
    if coin_upper not in settings.SUPPORTED_COINS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported asset '{coin}'. Supported: {', '.join(settings.SUPPORTED_COINS)}"
        )
    if interval not in settings.SUPPORTED_INTERVALS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported interval '{interval}'. Supported: {', '.join(settings.SUPPORTED_INTERVALS)}"
        )

    res = await hyperliquid_service.get_candles(coin=coin_upper, interval=interval, hours_back=hours_back)
    if res.get("error") and not res.get("candles"):
        raise HTTPException(status_code=503, detail=res["error"])

    candles = res.get("candles", [])
    return CandlesResponse(
        coin=coin_upper,
        interval=interval,
        count=len(candles),
        candles=[CandleItem(**c) for c in candles],
        is_cached=res.get("is_cached", False)
    )
