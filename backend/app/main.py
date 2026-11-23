from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db
from app.routers import (
    health,
    market,
    intelligence,
    portfolio,
    trading,
    alerts,
    wallet,
    demo,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema and singleton paper account
    init_db()
    yield

app = FastAPI(
    title="DeFi Guardian API",
    description="Wearable Crypto Market Intelligence and Paper Trading Engine for Even Realities G2 Smart Glasses",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for local development and Even Hub Simulator
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permissive for local hackathon development & simulator
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(market.router)
app.include_router(intelligence.router)
app.include_router(portfolio.router)
app.include_router(trading.router)
app.include_router(alerts.router)
app.include_router(wallet.router)
app.include_router(demo.router)

@app.get("/")
def get_root():
    return {
        "app": "DeFi Guardian",
        "tagline": "Your Crypto Intelligence. Just a Glance Away.",
        "track": "Crypto & DeFi — Even Realities Hackathon",
        "status": "online",
        "disclaimer": "Market information is provided for educational and informational purposes only. DeFi Guardian does not provide financial advice or execute real-money transactions.",
        "docs": "/docs",
        "endpoints": [
            "/api/health",
            "/api/market",
            "/api/market/candles",
            "/api/intelligence",
            "/api/portfolio",
            "/api/trades",
            "/api/trades/preview",
            "/api/trades/confirm",
            "/api/alerts",
            "/api/alerts/check",
            "/api/wallet",
            "/api/demo/reset"
        ]
    }
