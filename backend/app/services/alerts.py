import math
from datetime import datetime, timezone
from typing import Dict, List, Any
from app.config import settings
from app.database import get_connection

class AlertsService:
    def get_alerts(self, active_only: bool = False) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        query = (
            "SELECT id, coin, target_price, condition, is_active, repeat, cooldown_seconds, created_at, triggered_at "
            "FROM price_alerts"
        )
        if active_only:
            query += " WHERE is_active = 1"
        query += " ORDER BY id DESC"
        cursor.execute(query)
        rows = cursor.fetchall()
        alerts = []
        for r in rows:
            alerts.append({
                "id": r["id"],
                "coin": r["coin"],
                "target_price": float(r["target_price"]),
                "condition": r["condition"],
                "is_active": bool(r["is_active"]),
                "repeat": bool(r["repeat"]),
                "cooldown_seconds": int(r["cooldown_seconds"]),
                "created_at": r["created_at"],
                "triggered_at": r["triggered_at"]
            })
        conn.close()
        return alerts

    def create_alert(
        self,
        coin: str,
        target_price: float,
        condition: str,
        repeat: bool = False,
        cooldown_seconds: int = 300
    ) -> Dict[str, Any]:
        coin_upper = coin.strip().upper()
        if coin_upper not in settings.SUPPORTED_COINS:
            raise ValueError(f"Unsupported asset: {coin}. Supported: {', '.join(settings.SUPPORTED_COINS)}")

        cond_upper = condition.strip().upper()
        if cond_upper not in ("ABOVE", "BELOW"):
            raise ValueError("Alert condition must be ABOVE or BELOW")

        if not math.isfinite(target_price) or target_price <= 0 or target_price > settings.MAX_ALERT_PRICE:
            raise ValueError(f"Target price must be finite, > 0, and <= ${settings.MAX_ALERT_PRICE:,.0f}")

        conn = get_connection()
        cursor = conn.cursor()
        now_iso = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            INSERT INTO price_alerts (coin, target_price, condition, is_active, repeat, cooldown_seconds, created_at)
            VALUES (?, ?, ?, 1, ?, ?, ?)
        """, (coin_upper, target_price, cond_upper, int(bool(repeat)), int(cooldown_seconds), now_iso))
        alert_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return {
            "id": alert_id,
            "coin": coin_upper,
            "target_price": target_price,
            "condition": cond_upper,
            "is_active": True,
            "repeat": bool(repeat),
            "cooldown_seconds": int(cooldown_seconds),
            "created_at": now_iso,
            "triggered_at": None
        }

    def delete_alert(self, alert_id: int) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM price_alerts WHERE id = ?", (alert_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted

    def check_alerts(self, live_prices: Dict[str, float]) -> List[Dict[str, Any]]:
        """
        Evaluates active alerts against live market mid-prices.
        One-time alerts (repeat=False) are deactivated (is_active=0) upon trigger so they never fire repeatedly.
        Repeat alerts enforce cooldown_seconds before firing again.
        """
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("BEGIN IMMEDIATE")

        triggered_list = []
        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()

        try:
            cursor.execute(
                "SELECT id, coin, target_price, condition, is_active, repeat, cooldown_seconds, created_at, triggered_at "
                "FROM price_alerts WHERE is_active = 1"
            )
            active_alerts = cursor.fetchall()

            for a in active_alerts:
                alert_id = a["id"]
                coin = a["coin"]
                target = float(a["target_price"])
                condition = a["condition"]
                is_repeat = bool(a["repeat"])
                cooldown = int(a["cooldown_seconds"])
                last_triggered = a["triggered_at"]

                # Enforce cooldown for repeat alerts
                if is_repeat and last_triggered:
                    try:
                        last_dt = datetime.fromisoformat(last_triggered)
                        if (now_dt - last_dt).total_seconds() < cooldown:
                            continue
                    except ValueError:
                        pass

                current_price = live_prices.get(coin)
                if current_price is None or not math.isfinite(current_price) or current_price <= 0:
                    continue

                is_triggered = (
                    (condition == "ABOVE" and current_price >= target) or
                    (condition == "BELOW" and current_price <= target)
                )

                if is_triggered:
                    next_active = 1 if is_repeat else 0
                    cursor.execute(
                        "UPDATE price_alerts SET triggered_at = ?, is_active = ? WHERE id = ?",
                        (now_iso, next_active, alert_id)
                    )
                    triggered_list.append({
                        "id": alert_id,
                        "coin": coin,
                        "target_price": target,
                        "condition": condition,
                        "is_active": bool(next_active),
                        "repeat": is_repeat,
                        "cooldown_seconds": cooldown,
                        "created_at": a["created_at"],
                        "triggered_at": now_iso,
                        "current_price": current_price,
                        "is_triggered_now": True
                    })

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

        return triggered_list

alerts_service = AlertsService()
