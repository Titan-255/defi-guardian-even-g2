from fastapi import APIRouter, HTTPException
from app.schemas import PaperPortfolioResponse
from app.services.paper_trading import paper_trading_service

router = APIRouter(prefix="/api/portfolio", tags=["Portfolio"])

@router.get("", response_model=PaperPortfolioResponse)
async def get_portfolio():
    """
    Returns the user's paper trading portfolio:
    - Available simulated cash ($10,000 initial)
    - Asset holdings with live market valuations and unrealized P&L
    """
    try:
        portfolio = await paper_trading_service.get_portfolio()
        return PaperPortfolioResponse(**portfolio)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Portfolio error: {str(e)}")
