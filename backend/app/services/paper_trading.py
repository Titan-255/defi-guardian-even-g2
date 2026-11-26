import math
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from app.config import settings
from app.database import get_connection
from app.services.hyperliquid import hyperliquid_service

SUPPORTED_COINS = ["BTC", "ETH", "SOL"]

class PriceDriftError(Exception):
    """Raised when market price moved beyond tolerance or preview quote expired (HTTP 409)."""
    def __init__(self, message: str, latest_price: float):
        super().__init__(message)
        self.latest_price = latest_price

class PaperTradingService:
    async def get_live_price(self, coin: str) -> float:
        """Retrieves actual current mid-price for coin from Hyperliquid."""
        coin_upper = coin.upper()
        mids_res = await hyperliquid_service.get_all_mids()
        mids_data = mids_res.get("data", {})
        price_str = mids_data.get(coin_upper)
        if not price_str:
            raise ValueError(f"Live market price for {coin_upper} is currently unavailable.")
        price = float(price_str)
        if not math.isfinite(price) or price <= 0:
            raise ValueError(f"Invalid market price received for {coin_upper}.")
        return price

    async def get_portfolio(self) -> Dict[str, Any]:
        """
        Calculates user's simulated paper trading portfolio:
        - Available cash balance
        - Current holdings of BTC, ETH, SOL
        - Live market value and unrealized P&L
        """
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT initial_cash, available_cash FROM paper_account WHERE id = 1")
        acc_row = cursor.fetchone()
        initial_cash = float(acc_row["initial_cash"]) if acc_row else 10000.0
        available_cash = float(acc_row["available_cash"]) if acc_row else 10000.0

        cursor.execute("SELECT coin, quantity, average_buy_price, total_invested FROM paper_holdings")
        holding_rows = cursor.fetchall()
        conn.close()

        mids_res = await hyperliquid_service.get_all_mids()
        mids_data = mids_res.get("data", {})

        holdings_list = []
        total_holdings_value = 0.0

        for row in holding_rows:
            coin = row["coin"]
            qty = float(row["quantity"])
            avg_price = float(row["average_buy_price"])
            tot_invested = float(row["total_invested"])

            live_p_str = mids_data.get(coin)
            live_price = float(live_p_str) if live_p_str else avg_price

            curr_val = qty * live_price
            total_holdings_value += curr_val

            unrealized_pnl = curr_val - tot_invested if qty > 0 else 0.0
            unrealized_pnl_pct = (unrealized_pnl / tot_invested * 100.0) if (tot_invested > 0 and qty > 0) else 0.0

            holdings_list.append({
                "coin": coin,
                "quantity": round(qty, 6),
                "average_buy_price": round(avg_price, 2),
                "current_price": round(live_price, 2),
                "current_value": round(curr_val, 2),
                "unrealized_pnl": round(unrealized_pnl, 2),
                "unrealized_pnl_percent": round(unrealized_pnl_pct, 2)
            })

        total_portfolio_value = available_cash + total_holdings_value
        total_pnl = total_portfolio_value - initial_cash
        total_pnl_pct = (total_pnl / initial_cash * 100.0) if initial_cash > 0 else 0.0

        return {
            "total_portfolio_value": round(total_portfolio_value, 2),
            "available_cash": round(available_cash, 2),
            "initial_cash": round(initial_cash, 2),
            "total_pnl": round(total_pnl, 2),
            "total_pnl_percent": round(total_pnl_pct, 2),
            "holdings": holdings_list,
            "is_paper": True,
            "label": "PAPER ACCOUNT — NOT REAL MONEY"
        }

    async def preview_trade(self, coin: str, action: str, amount_usd: float) -> Dict[str, Any]:
        """
        Validates simulated trade parameters and previews expected output before confirmation.
        """
        coin_upper = coin.strip().upper()
        action_upper = action.strip().upper()
        now_iso = datetime.now(timezone.utc).isoformat()

        if coin_upper not in SUPPORTED_COINS:
            return {
                "valid": False,
                "error_message": f"Unsupported asset: {coin}. Supported: {', '.join(SUPPORTED_COINS)}",
                "coin": coin_upper, "action": action_upper, "amount_usd": amount_usd,
                "current_price": 0.0, "calculated_quantity": 0.0, "simulated_fee": 0.0,
                "current_cash": 0.0, "cash_after_trade": 0.0, "current_holding": 0.0,
                "holding_after_trade": 0.0, "preview_timestamp": now_iso,
                "is_paper": True, "label": "SIMULATED ORDER PREVIEW"
            }

        if action_upper not in ["BUY", "SELL"]:
            return {
                "valid": False, "error_message": f"Invalid action: {action}. Must be BUY or SELL",
                "coin": coin_upper, "action": action_upper, "amount_usd": amount_usd,
                "current_price": 0.0, "calculated_quantity": 0.0, "simulated_fee": 0.0,
                "current_cash": 0.0, "cash_after_trade": 0.0, "current_holding": 0.0,
                "holding_after_trade": 0.0, "preview_timestamp": now_iso,
                "is_paper": True, "label": "SIMULATED ORDER PREVIEW"
            }

        if not math.isfinite(amount_usd) or amount_usd <= 0:
            return {
                "valid": False, "error_message": "Trade amount must be strictly greater than $0",
                "coin": coin_upper, "action": action_upper, "amount_usd": amount_usd,
                "current_price": 0.0, "calculated_quantity": 0.0, "simulated_fee": 0.0,
                "current_cash": 0.0, "cash_after_trade": 0.0, "current_holding": 0.0,
                "holding_after_trade": 0.0, "preview_timestamp": now_iso,
                "is_paper": True, "label": "SIMULATED ORDER PREVIEW"
            }

        try:
            current_price = await self.get_live_price(coin_upper)
        except Exception as e:
            return {
                "valid": False, "error_message": f"Market price unavailable: {e}",
                "coin": coin_upper, "action": action_upper, "amount_usd": amount_usd,
                "current_price": 0.0, "calculated_quantity": 0.0, "simulated_fee": 0.0,
                "current_cash": 0.0, "cash_after_trade": 0.0, "current_holding": 0.0,
                "holding_after_trade": 0.0, "preview_timestamp": now_iso,
                "is_paper": True, "label": "SIMULATED ORDER PREVIEW"
            }

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT available_cash FROM paper_account WHERE id = 1")
        acc_row = cursor.fetchone()
        available_cash = float(acc_row["available_cash"]) if acc_row else 0.0

        cursor.execute("SELECT quantity FROM paper_holdings WHERE coin = ?", (coin_upper,))
        holding_row = cursor.fetchone()
        current_holding_qty = float(holding_row["quantity"]) if holding_row else 0.0
        conn.close()

        calculated_quantity = amount_usd / current_price

        if action_upper == "BUY":
            if amount_usd > available_cash:
                return {
                    "valid": False,
                    "error_message": f"Insufficient paper cash. Available: ${available_cash:.2f}, Required: ${amount_usd:.2f}",
                    "coin": coin_upper, "action": action_upper, "amount_usd": amount_usd,
                    "current_price": current_price, "calculated_quantity": calculated_quantity, "simulated_fee": 0.0,
                    "current_cash": available_cash, "cash_after_trade": available_cash,
                    "current_holding": current_holding_qty, "holding_after_trade": current_holding_qty,
                    "preview_timestamp": now_iso, "is_paper": True, "label": "SIMULATED ORDER PREVIEW"
                }
            cash_after = available_cash - amount_usd
            holding_after = current_holding_qty + calculated_quantity
        else:
            current_holding_value = current_holding_qty * current_price
            if calculated_quantity > (current_holding_qty + 1e-9):
                return {
                    "valid": False,
                    "error_message": f"Insufficient {coin_upper} holding. You hold {current_holding_qty:.6f} (${current_holding_value:.2f}), tried to sell {calculated_quantity:.6f} (${amount_usd:.2f})",
                    "coin": coin_upper, "action": action_upper, "amount_usd": amount_usd,
                    "current_price": current_price, "calculated_quantity": calculated_quantity, "simulated_fee": 0.0,
                    "current_cash": available_cash, "cash_after_trade": available_cash,
                    "current_holding": current_holding_qty, "holding_after_trade": current_holding_qty,
                    "preview_timestamp": now_iso, "is_paper": True, "label": "SIMULATED ORDER PREVIEW"
                }
            cash_after = available_cash + amount_usd
            holding_after = max(0.0, current_holding_qty - calculated_quantity)

        return {
            "valid": True,
            "error_message": None,
            "coin": coin_upper,
            "action": action_upper,
            "amount_usd": round(amount_usd, 2),
            "current_price": round(current_price, 2),
            "calculated_quantity": round(calculated_quantity, 6),
            "simulated_fee": 0.0,
            "current_cash": round(available_cash, 2),
            "cash_after_trade": round(cash_after, 2),
            "current_holding": round(current_holding_qty, 6),
            "holding_after_trade": round(holding_after, 6),
            "preview_timestamp": now_iso,
            "is_paper": True,
            "label": "SIMULATED ORDER PREVIEW"
        }

    async def execute_trade(
        self,
        coin: str,
        action: str,
        amount_usd: float,
        preview_price: Optional[float] = None,
        preview_timestamp: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes confirmed simulated order inside an immediate exclusive SQLite transaction.
        Validates preview quote freshness and price drift before locking and mutating balances.
        """
        coin_upper = coin.strip().upper()
        action_upper = action.strip().upper()

        if coin_upper not in SUPPORTED_COINS:
            raise ValueError(f"Unsupported asset: {coin}")
        if action_upper not in ["BUY", "SELL"]:
            raise ValueError(f"Invalid action: {action}")
        if not math.isfinite(amount_usd) or amount_usd <= 0:
            raise ValueError("Trade amount must be strictly greater than $0")

        # Validate preview timestamp expiration if provided
        if preview_timestamp:
            try:
                prev_dt = datetime.fromisoformat(preview_timestamp)
                age_sec = (datetime.now(timezone.utc) - prev_dt).total_seconds()
                if age_sec > settings.PREVIEW_TTL_SECONDS:
                    latest_price = await self.get_live_price(coin_upper)
                    raise PriceDriftError(
                        f"Quote expired ({int(age_sec)}s old). Refreshed {coin_upper} price is ${latest_price:,.2f}. Please confirm again.",
                        latest_price=latest_price
                    )
            except PriceDriftError:
                raise
            except ValueError:
                pass

        # Fetch fresh execution price
        execution_price = await self.get_live_price(coin_upper)

        # Validate price drift against previewed price if provided
        if preview_price is not None and preview_price > 0:
            drift = abs(execution_price - preview_price) / preview_price
            if drift > settings.PRICE_DRIFT_TOLERANCE:
                raise PriceDriftError(
                    f"{coin_upper} price changed from ${preview_price:,.2f} to ${execution_price:,.2f} ({drift * 100:.2f}%). Please review and confirm the updated preview.",
                    latest_price=execution_price
                )

        amount = round(amount_usd, 2)
        price = round(execution_price, 2)
        quantity = round(amount / execution_price, 6)

        conn = get_connection()
        cursor = conn.cursor()
        now_iso = datetime.now(timezone.utc).isoformat()
        trade_id = f"TRD-{uuid.uuid4().hex[:8].upper()}"

        try:
            # Acquire IMMEDIATE write lock to prevent concurrent overspending
            cursor.execute("BEGIN IMMEDIATE")

            cursor.execute("SELECT available_cash FROM paper_account WHERE id = 1")
            acc_row = cursor.fetchone()
            available_cash = float(acc_row["available_cash"]) if acc_row else 0.0

            cursor.execute(
                "SELECT quantity, average_buy_price, total_invested FROM paper_holdings WHERE coin = ?",
                (coin_upper,)
            )
            holding_row = cursor.fetchone()
            curr_qty = float(holding_row["quantity"]) if holding_row else 0.0
            curr_avg_price = float(holding_row["average_buy_price"]) if holding_row else 0.0
            curr_invested = float(holding_row["total_invested"]) if holding_row else 0.0

            if action_upper == "BUY":
                if amount > available_cash:
                    raise ValueError(
                        f"Insufficient paper cash. Available: ${available_cash:.2f}, Required: ${amount:.2f}"
                    )
                cursor.execute(
                    "UPDATE paper_account SET available_cash = available_cash - ?, updated_at = ? "
                    "WHERE id = 1 AND available_cash >= ?",
                    (amount, now_iso, amount)
                )
                if cursor.rowcount != 1:
                    raise ValueError("Concurrent balance check failed: insufficient paper cash.")

                new_cash = round(available_cash - amount, 2)
                new_qty = curr_qty + quantity
                new_invested = curr_invested + amount
                new_avg_price = (new_invested / new_qty) if new_qty > 0 else price
            else:
                if quantity > (curr_qty + 1e-9):
                    raise ValueError(
                        f"Insufficient {coin_upper} holding. You hold {curr_qty:.6f}, tried to sell {quantity:.6f}"
                    )
                cursor.execute(
                    "UPDATE paper_account SET available_cash = available_cash + ?, updated_at = ? WHERE id = 1",
                    (amount, now_iso)
                )
                new_cash = round(available_cash + amount, 2)
                new_qty = max(0.0, curr_qty - quantity)
                sold_fraction = (quantity / curr_qty) if curr_qty > 0 else 1.0
                new_invested = max(0.0, curr_invested * (1.0 - sold_fraction))
                new_avg_price = curr_avg_price if new_qty > 0 else 0.0

            cursor.execute("""
                INSERT INTO paper_holdings (coin, quantity, average_buy_price, total_invested, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(coin) DO UPDATE SET
                    quantity = excluded.quantity,
                    average_buy_price = excluded.average_buy_price,
                    total_invested = excluded.total_invested,
                    updated_at = excluded.updated_at
            """, (coin_upper, new_qty, new_avg_price, new_invested, now_iso))

            cursor.execute("""
                INSERT INTO paper_trades (trade_id, coin, action, amount_usd, price, quantity, simulated_cash_after, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (trade_id, coin_upper, action_upper, amount, price, quantity, new_cash, now_iso))

            conn.commit()

            return {
                "success": True,
                "trade_id": trade_id,
                "coin": coin_upper,
                "action": action_upper,
                "amount_usd": amount,
                "price": price,
                "quantity": quantity,
                "available_cash": new_cash,
                "timestamp": now_iso,
                "message": f"Successfully executed paper {action_upper} of {quantity:.6f} {coin_upper} at ${price:.2f}",
                "is_paper": True
            }
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def get_trades(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Returns recent simulated paper trades from SQLite."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, trade_id, coin, action, amount_usd, price, quantity, simulated_cash_after, timestamp "
            "FROM paper_trades ORDER BY id DESC LIMIT ?",
            (limit,)
        )
        rows = cursor.fetchall()
        result = []
        for r in rows:
            result.append({
                "id": r["id"],
                "trade_id": r["trade_id"],
                "coin": r["coin"],
                "action": r["action"],
                "amount_usd": float(r["amount_usd"]),
                "price": float(r["price"]),
                "quantity": float(r["quantity"]),
                "simulated_cash_after": float(r["simulated_cash_after"]),
                "timestamp": r["timestamp"]
            })
        conn.close()
        return result

paper_trading_service = PaperTradingService()
