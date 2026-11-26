import re
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from app.schemas import PublicWalletResponse, ConfigureWalletRequest
from app.security import verify_mutating_request
from app.database import get_connection
from app.services.hyperliquid import hyperliquid_service
from app.config import settings

router = APIRouter(prefix="/api/wallet", tags=["Wallet"])
ETH_ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")

def get_configured_address() -> Optional[str]:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT value FROM app_settings WHERE key = 'public_wallet_address'")
    row = c.fetchone()
    conn.close()
    if row and row["value"]:
        return row["value"]
    return settings.PUBLIC_WALLET_ADDRESS if settings.PUBLIC_WALLET_ADDRESS else None

@router.get("", response_model=PublicWalletResponse)
async def get_wallet():
    """
    Returns public Hyperliquid wallet state (read-only) if an address is configured.
    Never requests or handles private keys.
    """
    address = get_configured_address()
    if not address:
        return PublicWalletResponse(
            address=None,
            is_configured=False,
            account_value=0.0,
            total_margin_used=0.0,
            withdrawable=0.0,
            positions=[],
            source="Hyperliquid Clearinghouse",
            message="No public wallet configured. Showing paper portfolio by default."
        )

    hl_res = await hyperliquid_service.get_clearinghouse_state(address)
    if hl_res.get("error"):
        return PublicWalletResponse(
            address=address,
            is_configured=True,
            account_value=0.0,
            total_margin_used=0.0,
            withdrawable=0.0,
            positions=[],
            source="Hyperliquid Clearinghouse",
            message=hl_res["error"]
        )

    data = hl_res.get("data", {})
    margin_summary = data.get("marginSummary", {})
    account_value = float(margin_summary.get("accountValue", 0.0))
    total_margin = float(margin_summary.get("totalMarginUsed", 0.0))
    withdrawable = float(data.get("withdrawable", 0.0))

    positions = []
    raw_positions = data.get("assetPositions", [])
    for pos_item in raw_positions:
        pos = pos_item.get("position", {})
        if pos:
            positions.append({
                "coin": pos.get("coin"),
                "szi": float(pos.get("szi", 0.0)),
                "entry_px": float(pos.get("entryPx", 0.0)),
                "position_value": float(pos.get("positionValue", 0.0)),
                "unrealized_pnl": float(pos.get("unrealizedPnl", 0.0)),
                "return_on_equity": float(pos.get("returnOnEquity", 0.0))
            })

    return PublicWalletResponse(
        address=address,
        is_configured=True,
        account_value=account_value,
        total_margin_used=total_margin,
        withdrawable=withdrawable,
        positions=positions,
        source="Hyperliquid Clearinghouse",
        message="Read-only public wallet loaded successfully"
    )

@router.post("/configure", dependencies=[Depends(verify_mutating_request)])
def configure_wallet(req: ConfigureWalletRequest):
    """Configures a public wallet address for read-only monitoring."""
    address = req.address.strip()
    if not ETH_ADDRESS_RE.match(address):
        raise HTTPException(status_code=400, detail="Address must match ^0x[0-9a-fA-F]{40}$")

    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT INTO app_settings (key, value)
        VALUES ('public_wallet_address', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    """, (address,))
    conn.commit()
    conn.close()

    return {"success": True, "address": address, "message": "Public wallet address configured"}

@router.delete("/configure", dependencies=[Depends(verify_mutating_request)])
def clear_wallet():
    """Removes configured public wallet address."""
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM app_settings WHERE key = 'public_wallet_address'")
    conn.commit()
    conn.close()
    return {"success": True, "message": "Public wallet configuration cleared"}
