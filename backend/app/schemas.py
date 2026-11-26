import math
import re
from pydantic import BaseModel, Field, field_validator
from typing import Dict, List, Optional, Any
from app.config import settings

ETH_ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    hyperliquid_connected: bool
    ml_engine_ready: bool
    database_ready: bool
    coingecko_enabled: bool
    session_token: Optional[str] = None
    message: str

class CoinPriceInfo(BaseModel):
    coin: str
    price: float
    change_24h: Optional[float] = 0.0
    high_24h: Optional[float] = None
    low_24h: Optional[float] = None
    volume_24h: Optional[float] = None
    timestamp: str
    source: str = "Hyperliquid"

class MarketOverviewResponse(BaseModel):
    coins: Dict[str, CoinPriceInfo]
    source: str
    last_updated: str
    is_cached: bool = False

class CandleItem(BaseModel):
    t: int
    T: int
    s: str
    i: str
    o: float
    c: float
    h: float
    l: float
    v: float
    n: int

class CandlesResponse(BaseModel):
    coin: str
    interval: str
    count: int
    candles: List[CandleItem]
    is_cached: bool = False

class IntelligenceResponse(BaseModel):
    coin: str
    classification: str
    is_anomaly: bool
    anomaly_score: float
    raw_decision_score: float
    severity: str
    explanation: str
    contributing_factors: List[str]
    features: Dict[str, float]
    candle_time: str
    sample_count: int
    source: str = "Hyperliquid Candles + Isolation Forest ML Detector"
    disclaimer: str = "Informational anomaly detection only. Not financial or predictive advice."

class PublicWalletResponse(BaseModel):
    address: Optional[str] = None
    is_configured: bool = False
    account_value: float = 0.0
    total_margin_used: float = 0.0
    withdrawable: float = 0.0
    positions: List[Dict[str, Any]] = []
    source: str = "Hyperliquid Clearinghouse"
    message: Optional[str] = None

class ConfigureWalletRequest(BaseModel):
    address: str

    @field_validator("address")
    @classmethod
    def validate_eth_address(cls, v: str) -> str:
        addr = v.strip()
        if not ETH_ADDRESS_RE.match(addr):
            raise ValueError("Invalid Ethereum/Hyperliquid address: must match ^0x[0-9a-fA-F]{40}$")
        return addr

class PaperHoldingItem(BaseModel):
    coin: str
    quantity: float
    average_buy_price: float
    current_price: float
    current_value: float
    unrealized_pnl: float
    unrealized_pnl_percent: float

class PaperPortfolioResponse(BaseModel):
    total_portfolio_value: float
    available_cash: float
    initial_cash: float
    total_pnl: float
    total_pnl_percent: float
    holdings: List[PaperHoldingItem]
    is_paper: bool = True
    label: str = "PAPER ACCOUNT — NOT REAL MONEY"

class TradePreviewRequest(BaseModel):
    coin: str
    action: str
    amount_usd: float

    @field_validator("amount_usd")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if not math.isfinite(v) or v <= 0 or v > settings.MAX_TRADE_AMOUNT_USD:
            raise ValueError(f"Trade amount must be finite and between $0 and ${settings.MAX_TRADE_AMOUNT_USD:,.0f}")
        return v

class TradePreviewResponse(BaseModel):
    valid: bool
    error_message: Optional[str] = None
    coin: str
    action: str
    amount_usd: float
    current_price: float
    calculated_quantity: float
    simulated_fee: float = 0.0
    current_cash: float
    cash_after_trade: float
    current_holding: float
    holding_after_trade: float
    preview_timestamp: Optional[str] = None
    is_paper: bool = True
    label: str = "SIMULATED ORDER PREVIEW"

class TradeConfirmRequest(BaseModel):
    coin: str
    action: str
    amount_usd: float
    preview_price: Optional[float] = None
    preview_timestamp: Optional[str] = None

    @field_validator("amount_usd")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if not math.isfinite(v) or v <= 0 or v > settings.MAX_TRADE_AMOUNT_USD:
            raise ValueError(f"Trade amount must be finite and between $0 and ${settings.MAX_TRADE_AMOUNT_USD:,.0f}")
        return v

class TradeConfirmResponse(BaseModel):
    success: bool
    trade_id: str
    coin: str
    action: str
    amount_usd: float
    price: float
    quantity: float
    available_cash: float
    timestamp: str
    message: str
    is_paper: bool = True

class TradeRecord(BaseModel):
    id: int
    trade_id: str
    coin: str
    action: str
    amount_usd: float
    price: float
    quantity: float
    simulated_cash_after: float
    timestamp: str

class AlertCreateRequest(BaseModel):
    coin: str
    target_price: float
    condition: str
    repeat: bool = False
    cooldown_seconds: int = Field(default=300, ge=10, le=86400)

    @field_validator("coin")
    @classmethod
    def validate_coin(cls, v: str) -> str:
        c = v.strip().upper()
        if c not in settings.SUPPORTED_COINS:
            raise ValueError(f"Unsupported asset: {v}. Supported: {', '.join(settings.SUPPORTED_COINS)}")
        return c

    @field_validator("target_price")
    @classmethod
    def validate_target_price(cls, v: float) -> float:
        if not math.isfinite(v) or v <= 0 or v > settings.MAX_ALERT_PRICE:
            raise ValueError(f"Target price must be finite, > 0, and <= ${settings.MAX_ALERT_PRICE:,.0f}")
        return v

    @field_validator("condition")
    @classmethod
    def validate_condition(cls, v: str) -> str:
        cond = v.strip().upper()
        if cond not in ("ABOVE", "BELOW"):
            raise ValueError("Alert condition must be ABOVE or BELOW")
        return cond

class AlertResponse(BaseModel):
    id: int
    coin: str
    target_price: float
    condition: str
    is_active: bool
    repeat: bool = False
    cooldown_seconds: int = 300
    created_at: str
    triggered_at: Optional[str] = None
    current_price: Optional[float] = None
    is_triggered_now: Optional[bool] = False

class AlertCheckRequest(BaseModel):
    prices: Optional[Dict[str, float]] = None

class AlertCheckResult(BaseModel):
    triggered_count: int
    triggered_alerts: List[AlertResponse]
