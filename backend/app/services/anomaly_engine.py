import numpy as np
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from sklearn.ensemble import IsolationForest
from app.services.hyperliquid import hyperliquid_service

MIN_TRAINING_CANDLES = 24

class AnomalyEngine:
    def __init__(self, contamination: float = 0.1):
        self.contamination = contamination

    def extract_features(self, candle: Dict[str, Any], past_volumes: List[float]) -> np.ndarray:
        """
        Extracts 5 domain-informed financial features from a candle:
        1. Logarithmic price return: ln(close / open)
        2. Candle range percentage: (high - low) / open * 100
        3. Candle body percentage: abs(close - open) / (high - low + 1e-8) * 100
        4. Logarithmic trading volume: ln(volume + 1e-8)
        5. Relative volume against recent baseline: volume / mean(past_volumes)
        """
        open_p = max(float(candle["o"]), 1e-8)
        close_p = max(float(candle["c"]), 1e-8)
        high_p = max(float(candle["h"]), open_p, close_p)
        low_p = min(float(candle["l"]), open_p, close_p)
        vol = max(float(candle["v"]), 1e-8)

        # 1. Log return
        log_return = np.log(close_p / open_p)

        # 2. Candle range %
        range_pct = ((high_p - low_p) / open_p) * 100.0

        # 3. Candle body %
        body_pct = (abs(close_p - open_p) / (high_p - low_p + 1e-8)) * 100.0

        # 4. Log volume
        log_vol = np.log(vol)

        # 5. Relative volume
        baseline_vol = np.mean(past_volumes) if past_volumes else vol
        rel_vol = vol / max(baseline_vol, 1e-8)

        return np.array([log_return, range_pct, body_pct, log_vol, rel_vol])

    async def analyze_market(self, coin: str = "BTC", interval: str = "1h", hours_back: int = 72) -> Dict[str, Any]:
        """
        Executes local Isolation Forest anomaly detection on real Hyperliquid candle history.
        Evaluates the most recent completed candle against the historical baseline.
        """
        coin_upper = coin.upper()
        candles_res = await hyperliquid_service.get_candles(coin_upper, interval=interval, hours_back=hours_back)
        candles = candles_res.get("candles", [])

        # Validate minimum sample count
        if len(candles) < MIN_TRAINING_CANDLES:
            return {
                "coin": coin_upper,
                "classification": "MODEL WARMING UP",
                "is_anomaly": False,
                "anomaly_score": 0.0,
                "raw_decision_score": 0.0,
                "severity": "LOW",
                "explanation": f"Model warming up. Requires at least {MIN_TRAINING_CANDLES} completed hourly candles (found {len(candles)}).",
                "contributing_factors": ["Insufficient historical observations"],
                "features": {},
                "candle_time": datetime.now(timezone.utc).isoformat(),
                "sample_count": len(candles),
                "source": "Hyperliquid Candles + Local Isolation Forest",
                "disclaimer": "Informational anomaly detection only. Not financial or predictive advice."
            }

        # Use all completed candles except the latest one as training history
        # The latest completed candle is our target evaluation observation
        train_candles = candles[:-1]
        eval_candle = candles[-1]

        # Extract features for training set
        X_train_list = []
        volumes_history = [float(c["v"]) for c in train_candles]

        for i, c in enumerate(train_candles):
            # Rolling window for baseline volume (past up to 24 candles)
            window_vols = volumes_history[max(0, i - 24):i] if i > 0 else [volumes_history[0]]
            feats = self.extract_features(c, window_vols)
            X_train_list.append(feats)

        X_train = np.array(X_train_list)

        # Extract features for target evaluation candle
        recent_window_vols = volumes_history[-24:] if len(volumes_history) >= 24 else volumes_history
        eval_feats = self.extract_features(eval_candle, recent_window_vols)
        X_eval = eval_feats.reshape(1, -1)

        # Fit Isolation Forest strictly on historical data
        iso_forest = IsolationForest(
            n_estimators=100,
            contamination=self.contamination,
            random_state=42
        )
        iso_forest.fit(X_train)

        # Predict anomaly on test candle: -1 for outlier, 1 for inlier
        prediction = iso_forest.predict(X_eval)[0]
        is_anomaly = bool(prediction == -1)

        # Decision score: negative indicates anomaly; positive indicates inlier
        raw_score = float(iso_forest.decision_function(X_eval)[0])

        # Normalize score to 0.0 - 100.0 (higher = more anomalous)
        # Typical decision_function values range from ~ -0.3 to +0.2
        normalized_score = float(np.clip((0.15 - raw_score) / 0.35 * 100.0, 0.0, 100.0))

        # Severity determination
        if is_anomaly:
            severity = "HIGH" if normalized_score > 75.0 else "MODERATE"
            classification = "UNUSUAL ACTIVITY"
        else:
            severity = "LOW"
            classification = "NORMAL ACTIVITY"

        # Feature interpretation & transparent explanations
        log_ret, range_pct, body_pct, log_v, rel_v = eval_feats
        ret_pct = float((np.exp(log_ret) - 1.0) * 100.0)

        # Quantile calculations from historical training distribution
        hist_ranges = X_train[:, 1]
        hist_rel_vols = X_train[:, 4]
        range_percentile = float((hist_ranges < range_pct).mean() * 100.0)
        vol_percentile = float((hist_rel_vols < rel_v).mean() * 100.0)

        contributing_factors = []
        if rel_v >= 2.0:
            contributing_factors.append(f"Volume is {rel_v:.1f}x higher than recent 24h baseline (top {100 - vol_percentile:.0f}%)")
        elif rel_v <= 0.3:
            contributing_factors.append(f"Unusually low volume: only {rel_v:.2f}x of recent baseline")

        if range_pct >= 2.0 or range_percentile >= 85.0:
            contributing_factors.append(f"High volatility: {range_pct:.2f}% range ({range_percentile:.0f}th percentile)")

        if abs(ret_pct) >= 2.0:
            direction = "gain" if ret_pct > 0 else "drop"
            contributing_factors.append(f"Sharp directional {direction}: {abs(ret_pct):.2f}% in 1 hour")

        if not contributing_factors:
            contributing_factors.append("Volume and price range within historical standard deviation bounds")

        # Deterministic explanation construction
        if is_anomaly:
            if rel_v >= 2.0 and range_pct >= 2.0:
                explanation = f"{coin_upper} shows high volume ({rel_v:.1f}x baseline) combined with elevated price volatility ({range_pct:.1f}%)."
            elif rel_v >= 2.0:
                explanation = f"{coin_upper} experienced abnormal trading volume ({rel_v:.1f}x baseline) exceeding historical range."
            elif range_pct >= 2.0:
                explanation = f"{coin_upper} candle range ({range_pct:.1f}%) is unusually wide compared to recent hourly baseline."
            else:
                explanation = f"{coin_upper} statistical feature combination deviates from the historical cluster."
        else:
            explanation = f"{coin_upper} market behavior remains within normal historical variance."

        candle_timestamp_iso = datetime.fromtimestamp(eval_candle["T"] / 1000.0, tz=timezone.utc).isoformat()

        return {
            "coin": coin_upper,
            "classification": classification,
            "is_anomaly": is_anomaly,
            "anomaly_score": round(normalized_score, 1),
            "raw_decision_score": round(raw_score, 4),
            "severity": severity,
            "explanation": explanation,
            "contributing_factors": contributing_factors,
            "features": {
                "return_1h_pct": round(ret_pct, 2),
                "candle_range_pct": round(range_pct, 2),
                "candle_body_pct": round(body_pct, 1),
                "relative_volume": round(rel_v, 2),
            },
            "candle_time": candle_timestamp_iso,
            "sample_count": len(candles),
            "source": "Hyperliquid Candles + Local Isolation Forest",
            "disclaimer": "Informational anomaly detection only. Not financial or predictive advice."
        }

anomaly_engine = AnomalyEngine()
