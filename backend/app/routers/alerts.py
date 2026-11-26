from fastapi import APIRouter, Body, Depends, HTTPException, Path
from typing import List, Optional
from app.schemas import AlertResponse, AlertCreateRequest, AlertCheckRequest, AlertCheckResult
from app.security import verify_mutating_request
from app.services.alerts import alerts_service
from app.services.hyperliquid import hyperliquid_service

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def get_alerts():
    """Lists saved price alerts."""
    try:
        alerts = alerts_service.get_alerts()
        return [AlertResponse(**a) for a in alerts]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch alerts: {str(e)}")

@router.post("", response_model=AlertResponse, dependencies=[Depends(verify_mutating_request)])
def create_alert(req: AlertCreateRequest):
    """Creates a new price alert."""
    try:
        new_alert = alerts_service.create_alert(
            coin=req.coin,
            target_price=req.target_price,
            condition=req.condition,
            repeat=req.repeat,
            cooldown_seconds=req.cooldown_seconds,
        )
        return AlertResponse(**new_alert)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create alert: {str(e)}")

@router.delete("/{alert_id}", dependencies=[Depends(verify_mutating_request)])
def delete_alert(alert_id: int = Path(..., ge=1)):
    """Deletes an alert."""
    success = alerts_service.delete_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    return {"success": True, "message": f"Alert {alert_id} removed"}

@router.post("/check", response_model=AlertCheckResult)
async def check_alerts(req: Optional[AlertCheckRequest] = Body(default=None)):
    """
    Checks active alerts against provided shared market prices or cached/live Hyperliquid mids.
    Returns any alerts triggered during this check.
    """
    try:
        if req and req.prices:
            live_prices = {k.upper(): float(v) for k, v in req.prices.items() if v and v > 0}
        else:
            mids_res = await hyperliquid_service.get_all_mids()
            mids_data = mids_res.get("data", {})
            live_prices = {k: float(v) for k, v in mids_data.items() if v}

        triggered = alerts_service.check_alerts(live_prices)
        return AlertCheckResult(
            triggered_count=len(triggered),
            triggered_alerts=[AlertResponse(**a) for a in triggered]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Alert check error: {str(e)}")
