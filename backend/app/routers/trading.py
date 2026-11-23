from fastapi import APIRouter, HTTPException, Query
from typing import List
from app.schemas import (
    TradeRecord,
    TradePreviewRequest,
    TradePreviewResponse,
    TradeConfirmRequest,
    TradeConfirmResponse
)
from app.services.paper_trading import paper_trading_service

router = APIRouter(prefix="/api/trades", tags=["Trading"])

@router.get("", response_model=List[TradeRecord])
def get_trades(limit: int = Query(50, ge=1, le=200)):
    """Returns recent paper trades recorded in SQLite."""
    try:
        trades = paper_trading_service.get_trades(limit=limit)
        return [TradeRecord(**t) for t in trades]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch trade history: {str(e)}")

@router.post("/preview", response_model=TradePreviewResponse)
async def preview_trade(req: TradePreviewRequest):
    """
    Validates simulated trade parameters and previews expected order before confirmation.
    Uses real-time market price from Hyperliquid.
    """
    try:
        preview = await paper_trading_service.preview_trade(
            coin=req.coin,
            action=req.action,
            amount_usd=req.amount_usd
        )
        return TradePreviewResponse(**preview)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Trade preview error: {str(e)}")

@router.post("/confirm", response_model=TradeConfirmResponse)
async def confirm_trade(req: TradeConfirmRequest):
    """
    Executes a confirmed simulated paper trade and updates paper portfolio in SQLite.
    Never executes real blockchain or exchange transactions.
    """
    try:
        trade_result = await paper_trading_service.execute_trade(
            coin=req.coin,
            action=req.action,
            amount_usd=req.amount_usd
        )
        return TradeConfirmResponse(**trade_result)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trade execution error: {str(e)}")
