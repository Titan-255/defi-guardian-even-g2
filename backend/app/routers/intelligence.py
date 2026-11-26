from fastapi import APIRouter, Query, HTTPException
from app.config import settings
from app.schemas import IntelligenceResponse
from app.services.anomaly_engine import anomaly_engine

router = APIRouter(prefix="/api/intelligence", tags=["Intelligence"])

@router.get("", response_model=IntelligenceResponse)
async def get_market_intelligence(
    coin: str = Query("BTC", description="Cryptocurrency symbol to evaluate (BTC, ETH, SOL)"),
    interval: str = Query("1h", description="Candle interval (default 1h)"),
    hours_back: int = Query(72, ge=24, le=168, description="Historical candle window size")
):
    """
    Executes local Scikit-learn Isolation Forest anomaly detection on real Hyperliquid candles.
    Returns anomaly classification, score, contributing features, and deterministic explanations.
    """
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

    try:
        result = await anomaly_engine.analyze_market(coin=coin_upper, interval=interval, hours_back=hours_back)
        return IntelligenceResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML intelligence engine error: {str(e)}")
