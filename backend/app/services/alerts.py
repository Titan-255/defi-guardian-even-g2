from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from app.database import get_connection

class AlertsService:
    def get_alerts(self, active_only: bool = False) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        query = "SELECT id, coin, target_price, condition, is_active, created_at, triggered_at FROM price_alerts"
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
                "created_at": r["created_at"],
                "triggered_at": r["triggered_at"]
            })
        conn.close()
        return alerts

    def create_alert(self, coin: str, target_price: float, condition: str) -> Dict[str, Any]:
        coin_upper = coin.upper()
        cond_upper = condition.upper()
        if cond_upper not in ["ABOVE", "BELOW"]:
            raise ValueError("Alert condition must be ABOVE or BELOW")
        if target_price <= 0:
            raise ValueError("Target price must be greater than zero")

        conn = get_connection()
        cursor = conn.cursor()
        now_iso = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            INSERT INTO price_alerts (coin, target_price, condition, is_active, created_at)
            VALUES (?, ?, ?, 1, ?)
        """, (coin_upper, target_price, cond_upper, now_iso))
        alert_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return {
            "id": alert_id,
            "coin": coin_upper,
            "target_price": target_price,
            "condition": cond_upper,
            "is_active": True,
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
        Returns triggered alerts and updates their triggered_at timestamp in SQLite.
        """
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, coin, target_price, condition, is_active, created_at FROM price_alerts WHERE is_active = 1")
        active_alerts = cursor.fetchall()

        triggered_list = []
        now_iso = datetime.now(timezone.utc).isoformat()

        for a in active_alerts:
            alert_id = a["id"]
            coin = a["coin"]
            target = float(a["target_price"])
            condition = a["condition"]

            current_price = live_prices.get(coin)
            if current_price is None or current_price <= 0:
                continue

            is_triggered = False
            if condition == "ABOVE" and current_price >= target:
                is_triggered = True
            elif condition == "BELOW" and current_price <= target:
                is_triggered = True

            if is_triggered:
                cursor.execute("UPDATE price_alerts SET triggered_at = ? WHERE id = ?", (now_iso, alert_id))
                triggered_list.append({
                    "id": alert_id,
                    "coin": coin,
                    "target_price": target,
                    "condition": condition,
                    "is_active": True,
                    "created_at": a["created_at"],
                    "triggered_at": now_iso,
                    "current_price": current_price,
                    "is_triggered_now": True
                })

        conn.commit()
        conn.close()
        return triggered_list

alerts_service = AlertsService()
