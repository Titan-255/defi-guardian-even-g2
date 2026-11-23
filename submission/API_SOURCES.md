# DeFi Guardian — API Sources & Integration Reference

This document details every external cryptocurrency and financial API integrated into DeFi Guardian, conforming strictly to the official hackathon track requirements (Hyperliquid as mandatory primary; CoinGecko as optional secondary).

---

## 1. Primary Integration: Hyperliquid API

DeFi Guardian uses the official, public Hyperliquid Info API for real-time market mid-prices, historical candle snapshots, and optional public wallet state.

### 1.1 Base Endpoint
- **URL:** `POST https://api.hyperliquid.xyz/info`
- **Method:** `POST`
- **Authentication:** None required (Public Info Endpoint)
- **Rate Limit:** Generous public allowance (~1200 weight/minute); DeFi Guardian implements backend in-memory caching to stay well below limits.
- **Cost:** Free ($0.00)

### 1.2 Endpoint: Real-Time Mid Prices (`allMids`)
- **Request Payload:**
  ```json
  {
    "type": "allMids"
  }
  ```
- **Response Format:**
  ```json
  {
    "BTC": "61408.5",
    "ETH": "1730.25",
    "SOL": "71.5935",
    ...
  }
  ```
- **Usage in DeFi Guardian:** Supplies real-time mid-prices for the Live Market Glance screen, order preview calculations, and real-time alert trigger checks.
- **Caching:** Backend caches responses for 3 seconds.

### 1.3 Endpoint: Historical Candles (`candleSnapshot`)
- **Request Payload:**
  ```json
  {
    "type": "candleSnapshot",
    "req": {
      "coin": "BTC",
      "interval": "1h",
      "startTime": 1795323600000,
      "endTime": 1795410000000
    }
  }
  ```
- **Response Format:**
  ```json
  [
    {
      "t": 1795410000000,
      "T": 1795413599999,
      "s": "BTC",
      "i": "1h",
      "o": "61231.0",
      "c": "61409.0",
      "h": "61464.0",
      "l": "61085.0",
      "v": "427.2692",
      "n": 4925
    }
  ]
  ```
- **Usage in DeFi Guardian:** Feeds the local Machine Learning Anomaly Engine. The system computes 24-hour baseline volumes, volatility distributions, and rolling price returns.
- **Caching:** Backend caches responses for 15 seconds.

### 1.4 Endpoint: Public Clearinghouse State (`clearinghouseState`)
- **Request Payload:**
  ```json
  {
    "type": "clearinghouseState",
    "user": "0x0000000000000000000000000000000000000000"
  }
  ```
- **Response Fields:**
  - `marginSummary.accountValue`: Total account equity
  - `marginSummary.totalMarginUsed`: Total margin consumed
  - `withdrawable`: Usable cash
  - `assetPositions`: Open perpetual futures positions, entry prices, and unrealized P&L
- **Usage in DeFi Guardian:** Provides optional read-only portfolio monitoring without connecting a private wallet.

---

## 2. Optional Secondary Integration: CoinGecko Demo API

- **Base URL:** `GET https://api.coingecko.com/api/v3/simple/price`
- **Method:** `GET`
- **Authentication:** `x-cg-demo-api-key` header (optional)
- **Status in DeFi Guardian:** Purely optional. If an API key is not supplied in `backend/.env`, the backend reports `coingecko_enabled: false` and continues using Hyperliquid without error.
- **Usage:** Secondary verification of 24h percentage changes and multi-source price consensus.

---

## 3. Resilient Error-Handling Strategy

1. **Transient Network Timeout:** If Hyperliquid does not respond within 8 seconds, the backend immediately serves the most recent cached snapshot marked with `"is_cached": true`. The G2 display surfaces a subtle `CACHED DATA` badge.
2. **Missing Candles:** If historical candle records are insufficient (< 24 hourly periods), the ML engine explicitly reports `MODEL WARMING UP` rather than generating fabricated anomalies.
3. **Invalid Addresses:** Public wallet addresses are validated for 42-character hex formatting (`0x...`) before querying the network.
4. **Offline Mode:** If internet access is completely lost, the application surfaces clear connection diagnostic flags without crashing.
