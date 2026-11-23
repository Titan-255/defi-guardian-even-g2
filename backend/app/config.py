import os
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
    
    # Allowed CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ]
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
