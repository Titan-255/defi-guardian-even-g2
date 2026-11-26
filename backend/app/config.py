import secrets
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True

    # Hyperliquid
    HYPERLIQUID_API_URL: str = "https://api.hyperliquid.xyz/info"

    # Optional CoinGecko
    COINGECKO_API_KEY: str = ""
    COINGECKO_API_URL: str = "https://api.coingecko.com/api/v3"

    # Database
    DATABASE_PATH: str = "defi_guardian.db"

    # Optional Public Wallet
    PUBLIC_WALLET_ADDRESS: str = ""

    # Validation & Trading Safety Limits
    SUPPORTED_COINS: List[str] = ["BTC", "ETH", "SOL"]
    SUPPORTED_INTERVALS: List[str] = ["1m", "5m", "15m", "1h", "4h", "1d"]
    MAX_ALERT_PRICE: float = 10_000_000.0
    MAX_TRADE_AMOUNT_USD: float = 100_000.0
    PREVIEW_TTL_SECONDS: int = 30
    PRICE_DRIFT_TOLERANCE: float = 0.005  # 0.5% max drift before requiring re-confirmation

    # Per-process session token for mutating endpoint protection
    SESSION_TOKEN: str = secrets.token_urlsafe(32)

    # Allowed CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "https://defi-guardian-eight.vercel.app",
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
