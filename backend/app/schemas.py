from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    hyperliquid_connected: bool
    ml_engine_ready: bool
    database_ready: bool
    coingecko_enabled: bool
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
    t: int # open time ms
    T: int # close time ms
    s: str # coin
    i: str # interval
    o: float # open
    c: float # close
    h: float # high
    l: float # low
    v: float # volume
    n: int # count

class CandlesResponse(BaseModel):
    coin: str
    interval: str
    count: int
    candles: List[CandleItem]
    is_cached: bool = False

class IntelligenceResponse(BaseModel):
    coin: str
    classification: str # "UNUSUAL ACTIVITY", "NORMAL ACTIVITY", "MODEL WARMING UP"
    is_anomaly: bool
    anomaly_score: float # 0.0 to 100.0 scale (higher = more unusual)
    raw_decision_score: float
    severity: str # "LOW", "MODERATE", "HIGH"
    explanation: str
    contributing_factors: List[str]
    features: Dict[str, float]
    candle_time: str
    sample_count: int
    source: str = "Hyperliquid Candles + Local Isolation Forest"
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
    action: str # "BUY" or "SELL"
    amount_usd: float # e.g. 25, 50, 100

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
    is_paper: bool = True
    label: str = "SIMULATED ORDER PREVIEW"

class TradeConfirmRequest(BaseModel):
    coin: str
    action: str # "BUY" or "SELL"
    amount_usd: float

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
    condition: str # "ABOVE" or "BELOW"

class AlertResponse(BaseModel):
    id: int
    coin: str
    target_price: float
    condition: str
    is_active: bool
    created_at: str
    triggered_at: Optional[str] = None
    current_price: Optional[float] = None
    is_triggered_now: Optional[bool] = False

class AlertCheckResult(BaseModel):
    triggered_count: int
    triggered_alerts: List[AlertResponse]
