from fastapi import APIRouter
from datetime import datetime, timezone
from app.schemas import HealthResponse
from app.services.hyperliquid import hyperliquid_service
from app.services.coingecko import coingecko_service
from app.database import get_connection

router = APIRouter(prefix="/api/health", tags=["Health"])

@router.get("", response_model=HealthResponse)
async def get_health():
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # Check Hyperliquid
    hl_res = await hyperliquid_service.get_all_mids()
    hl_ok = bool(hl_res.get("data") and not hl_res.get("is_cached"))
    
    # Check Database
    db_ok = False
    try:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT 1")
        db_ok = True
        conn.close()
    except Exception:
        db_ok = False

    return HealthResponse(
        status="operational" if (hl_ok and db_ok) else "degraded",
        timestamp=now_iso,
        hyperliquid_connected=hl_ok,
        ml_engine_ready=True,
        database_ready=db_ok,
        coingecko_enabled=coingecko_service.is_enabled,
        message="DeFi Guardian backend is fully operational" if (hl_ok and db_ok) else "Operating in fallback mode"
    )
