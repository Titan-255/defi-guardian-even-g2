# DeFi Guardian — Verification & Test Report

**Execution Date:** 26 November 2026  
**Environment:** Windows 11, Node.js v24.13.1, Python 3.11.9, Vite 6.4.6, Even Hub SDK v0.0.10, Even Hub CLI v0.1.12

---

## 1. Executive Summary

| Suite | Command | Result | Details |
|---|---|---|---|
| **Backend Offline Unit Tests** | `python -m pytest -v` (in `backend/`) | **21/21 PASSED** (0.41s) | Mocked Hyperliquid API; 0 external network calls |
| **Backend Live Integration Test** | `python -m pytest -m integration -v` (in `backend/`) | **1/1 PASSED** (1.43s) | Verified live Hyperliquid `allMids` response |
| **Frontend TypeScript & Vite Build** | `npm run build` (in `frontend/`) | **PASSED** (1.16s) | 0 TS errors; `Localhost leak found: False` |
| **Playwright E2E & Responsive** | `python scratch/verify_e2e.py` | **ALL PASSED** | 7 screens, trading, alerts, wallet validation, zoom, 360px/768px/1280px, 0 console errors |
| **Dependency Security Audit** | `npm audit` (in `frontend/`) | **0 VULNERABILITIES** | Upgraded Vite to 6.4.6 |
| **Even Hub Package** | `npx evenhub pack app.json dist -o defi-guardian.ehpk` | **PASSED** | Stamped `frontend/defi-guardian.ehpk` (100,132 bytes) |

---

## 2. Backend Test Coverage (`21 passed` offline + `1 passed` live)
- `tests/test_alerts.py`: One-time alert triggering across 3 consecutive checks (fires once, then deactivates), invalid coin/price/condition validation (`1e300`, negative, unsupported coin).
- `tests/test_health.py`: Health endpoint (`database_ready`, `ml_engine_ready`, `session_token`) and root endpoint.
- `tests/test_market.py`: Market overview, 503 when upstream unavailable, candles, invalid coin/interval/hours_back (`400`/`422`).
- `tests/test_ml_anomaly.py`: Feature extraction, insufficient data (`MODEL WARMING UP`), adequate data anomaly scoring, `/api/intelligence`.
- `tests/test_paper_trading.py`: Portfolio init ($10,000), BUY & SELL with preview quote lock, stale price drift (`409`), negative/insufficient balance rejections, concurrent BUY race-condition protection (`BEGIN IMMEDIATE`), demo reset.
- `tests/test_security.py`: Allowed vs untrusted CORS origins, `X-Session-Token` & origin enforcement on mutating endpoints (`403`), regex wallet validation (`^0x[0-9a-fA-F]{40}$`).
- `tests/test_integration_live.py`: Live Hyperliquid API smoke test (`@pytest.mark.integration`).

---

## 3. Playwright Browser & Visual Regression Results
- Verified viewport meta allows user zoom (`width=device-width, initial-scale=1.0`).
- Verified all 7 screens render at `1280x900`, `768x812`, and `360x812` with **0 horizontal overflow**.
- Verified Coin selection (`BTC` -> `ETH`), truthful detector label (`Rule-Based Statistical Detector` in Cloud Edge mode), Paper Trading `BUY $50` confirmation updating balance to `$9950.00`, Alert creation/typing (`123456` without shortcut hijacking) & deletion, and invalid wallet rejection.
- Compared `scratch/after/` screenshots against `scratch/baseline/`: original dark/green UI, G2 HUD, and 7-screen companion layout preserved; mobile 360px overflow resolved.

---

## 4. Even Hub Simulator & Hardware Status
- `app.json` updated with `https://api.hyperliquid.xyz` in `network` permission whitelist and packed cleanly into `frontend/defi-guardian.ehpk` (100,132 bytes).
- **Unverified / Not Executed:** Live interactive GUI launch inside `evenhub-simulator` desktop window and physical Even Realities G2 hardware testing (no physical G2 glasses available).
