import sqlite3
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from app.config import settings

def get_db_path() -> str:
    return os.path.abspath(settings.DATABASE_PATH)

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Paper Account Singleton Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS paper_account (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        initial_cash REAL NOT NULL DEFAULT 10000.0,
        available_cash REAL NOT NULL DEFAULT 10000.0,
        updated_at TEXT NOT NULL
    );
    """)
    
    # 2. Paper Holdings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS paper_holdings (
        coin TEXT PRIMARY KEY,
        quantity REAL NOT NULL DEFAULT 0.0,
        average_buy_price REAL NOT NULL DEFAULT 0.0,
        total_invested REAL NOT NULL DEFAULT 0.0,
        updated_at TEXT NOT NULL
    );
    """)
    
    # 3. Paper Trades History Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS paper_trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trade_id TEXT UNIQUE NOT NULL,
        coin TEXT NOT NULL,
        action TEXT NOT NULL,
        amount_usd REAL NOT NULL,
        price REAL NOT NULL,
        quantity REAL NOT NULL,
        simulated_cash_after REAL NOT NULL,
        timestamp TEXT NOT NULL
    );
    """)
    
    # 4. Price Alerts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS price_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        coin TEXT NOT NULL,
        target_price REAL NOT NULL,
        condition TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        triggered_at TEXT
    );
    """)
    
    # 5. App Settings (e.g. public wallet address)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    """)
    
    # Initialize default paper account if not present
    cursor.execute("SELECT id FROM paper_account WHERE id = 1")
    if not cursor.fetchone():
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            "INSERT INTO paper_account (id, initial_cash, available_cash, updated_at) VALUES (1, 10000.0, 10000.0, ?)",
            (now,)
        )
        # Pre-populate supported coins in holdings
        for coin in ["BTC", "ETH", "SOL"]:
            cursor.execute(
                "INSERT OR IGNORE INTO paper_holdings (coin, quantity, average_buy_price, total_invested, updated_at) VALUES (?, 0.0, 0.0, 0.0, ?)",
                (coin, now)
            )
            
    conn.commit()
    conn.close()

def reset_paper_database():
    """Resets paper account back to initial $10,000 cash and clears paper trades & holdings."""
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("UPDATE paper_account SET available_cash = 10000.0, updated_at = ? WHERE id = 1", (now,))
    cursor.execute("DELETE FROM paper_trades")
    cursor.execute("UPDATE paper_holdings SET quantity = 0.0, average_buy_price = 0.0, total_invested = 0.0, updated_at = ?", (now,))
    conn.commit()
    conn.close()
