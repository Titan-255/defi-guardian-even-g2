from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from app.schemas import (
    TradeRecord,
    TradePreviewRequest,
    TradePreviewResponse,
    TradeConfirmRequest,
    TradeConfirmResponse
)
from app.security import verify_mutating_request
from app.services.paper_trading import paper_trading_service, PriceDriftError

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

@router.post("/confirm", response_model=TradeConfirmResponse, dependencies=[Depends(verify_mutating_request)])
async def confirm_trade(req: TradeConfirmRequest):
    """
    Executes a confirmed simulated paper trade and updates paper portfolio in SQLite.
    Rejects stale or drifted quotes with HTTP 409 Conflict.
    Never executes real blockchain or exchange transactions.
    """
    try:
        trade_result = await paper_trading_service.execute_trade(
            coin=req.coin,
            action=req.action,
            amount_usd=req.amount_usd,
            preview_price=req.preview_price,
            preview_timestamp=req.preview_timestamp,
        )
        return TradeConfirmResponse(**trade_result)
    except PriceDriftError as pde:
        raise HTTPException(status_code=409, detail=str(pde))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trade execution error: {str(e)}")
