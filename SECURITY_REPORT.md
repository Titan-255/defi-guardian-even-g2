# DeFi Guardian — Security Hardening Report

**Date:** 26 November 2026  
**Scope:** Backend FastAPI API, Frontend Bundle, Even Hub Manifest, and Dependencies

---

## 1. CORS & Cross-Origin Protection
- **Before:** `allow_origins=["*"]` combined with `allow_credentials=True` allowed any external website to send credentialed cross-origin requests to a locally running backend.
- **After:**
  - `allow_origins` is strictly bound to `settings.CORS_ORIGINS` (`localhost:5173`, `127.0.0.1:5173`, `localhost:4173`, `127.0.0.1:4173`, `localhost:3000`, `127.0.0.1:3000`, `localhost:8080`, `127.0.0.1:8080`, `https://defi-guardian-eight.vercel.app`).
  - `allow_credentials=False` (cookies/credentials are not used).
  - `allow_methods` restricted to `["GET", "POST", "DELETE", "OPTIONS"]`.
  - `allow_headers` restricted to `["Content-Type", "X-Session-Token"]`.

## 2. Mutating Endpoint Protection
- Added `verify_mutating_request` dependency (`backend/app/security.py`) on all state-changing endpoints:
  - `POST /api/trades/confirm`
  - `POST /api/alerts`
  - `DELETE /api/alerts/{alert_id}`
  - `POST /api/wallet/configure`
  - `DELETE /api/wallet/configure`
  - `POST /api/demo/reset`
- Validates:
  1. `Origin` header (when present) must match `settings.CORS_ORIGINS`.
  2. `X-Session-Token` header must match the server's per-process cryptographic token (`secrets.token_urlsafe(32)`) via constant-time `secrets.compare_digest`.
- Verified via `tests/test_security.py`: requests missing the token or originating from untrusted origins receive `HTTP 403`.

## 3. Input Validation
- **Wallet Addresses:** Enforced `^0x[0-9a-fA-F]{40}$` in Pydantic `ConfigureWalletRequest`, `wallet.py`, `hyperliquid.py`, `api.ts`, and `SettingsView.tsx`.
- **Alerts:** Enforced `SUPPORTED_COINS` (`BTC`, `ETH`, `SOL`), `ABOVE`/`BELOW` condition, and finite positive `target_price <= 10,000,000` (rejecting `NaN`, `inf`, negatives, and `1e300`).
- **Candles & Intelligence:** Enforced `SUPPORTED_COINS` and `SUPPORTED_INTERVALS` (`1m`, `5m`, `15m`, `1h`, `4h`, `1d`) with bounded `hours_back` (`6..168` / `24..168`), returning `HTTP 400`/`422`.

## 4. Concurrency & Financial Safety
- Paper trading confirmation (`paper_trading.py`) uses `BEGIN IMMEDIATE` exclusive write locking in SQLite, re-reads `available_cash` and holdings inside the transaction, and executes conditional SQL (`WHERE id = 1 AND available_cash >= ?`) to prevent double-spending under concurrent requests.
- Stale or drifted quotes (`> 30s` or `> 0.5%` price drift) are rejected with `HTTP 409 Conflict`.
- Production frontend build (`dist/assets/*.js`) was scanned and verified to contain **zero** `127.0.0.1:8000` localhost references.

## 5. Dependency Audit
- Upgraded `vite` from `5.4.11` to `6.4.6` (`^6.4.4`), eliminating the `esbuild <=0.24.2` moderate vulnerability (`GHSA-67mh-4wv8-2f99`).
- `npm audit` in `frontend/` now reports **0 vulnerabilities**.

## 6. Remaining Security Limitations
- The local FastAPI backend is designed for single-user local development and simulator use; it does not implement multi-user authentication.
- Public deployment of the Python backend would require HTTPS hosting and removing local development origins from `CORS_ORIGINS`.
