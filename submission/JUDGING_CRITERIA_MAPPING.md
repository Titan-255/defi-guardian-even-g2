# DeFi Guardian — Judging Criteria Mapping

This document maps the implementation of **DeFi Guardian** directly to the 5 official judging criteria defined by Even Realities, TVM Ventures, and DAOs Hub.

---

## 1. Usefulness on G2 (Weight: 30%)

### Criterion Definition
Does the application solve a real problem uniquely suited for smart glasses? Is information delivered at a glance rather than requiring an oversized phone or desktop dashboard?

### DeFi Guardian Implementation & Evidence
- **The Core Wearable Problem:** Crypto markets run 24/7. Looking down at a phone every few minutes is disruptive in professional meetings, social gatherings, or during commutes. 
- **Glanceable Information Hierarchy:** Instead of dense orderbooks and multi-window charts, DeFi Guardian distills market status into 7 micro-screens designed for rapid 2-second comprehension.
- **Micro-Interactions Over Deep Navigation:** Market status, anomaly alerts, and simulated positions are accessible with intuitive single-tap cycles, keeping the user present in their physical environment.
- **Contextual Attention System (Screen 4):** Rather than buzzing with notifications constantly, the system isolates high-confidence statistical anomalies, so the glasses only draw attention when the market exhibits statistically unusual behavior.

---

## 2. Read and Write Capability (Weight: 25%)

### Criterion Definition
Does the application both read external blockchain/financial data AND provide an interactive, state-changing "write" capability on the smart glasses?

### DeFi Guardian Implementation & Evidence
- **READ Implementation:**
  - Streams real-time mid-prices for BTC, ETH, and SOL from Hyperliquid's `allMids` API.
  - Fetches multi-day hourly historical candles via Hyperliquid's `candleSnapshot` API.
  - Reads margin, equity, and positions via Hyperliquid's `clearinghouseState` API for optional public addresses.
- **WRITE Implementation:**
  - Full-featured **Paper Trading System** allowing simulated BUY and SELL orders ($25, $50, $100 amounts).
  - Previews order quantities dynamically calculated against live exchange prices.
  - Requires user touch confirmation on the glasses.
  - Executes atomic state changes in the local SQLite database (`paper_account`, `paper_holdings`, `paper_trades`).
  - Updates cash balances, recalculates weighted average purchase prices, and logs full transaction receipts.
  - Price alert creation and deletion stored directly into SQLite.

---

## 3. Technical Execution & Architecture (Weight: 20%)

### Criterion Definition
Code quality, architectural separation, robust error handling, reliable dependencies, and test coverage.

### DeFi Guardian Implementation & Evidence
- **Full-Stack Clean Architecture:**
  - **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, official Even Hub SDK (`@evenrealities/even_hub_sdk`).
  - **Backend:** Python 3.11, FastAPI, Pydantic V2 validation, HTTPX async client, SQLite.
- **Genuine Machine Learning:**
  - Scikit-Learn `IsolationForest` running locally in Python.
  - Multi-feature engineering: Log returns, candle range %, body ratio %, log volume, and rolling 24-hour relative volume.
  - Target candle evaluated against historical training distribution without lookahead bias.
  - Fallback "MODEL WARMING UP" handling when historical candles are insufficient.
- **Test Coverage & Verification:**
  - 13 automated backend unit and integration tests covering health, market endpoints, ML feature extraction, paper trading BUY/SELL math, balance constraints, and alert triggering.
  - 100% test pass rate with zero deprecation warnings.
  - Automated production build check (`npm run build`) passing with zero TypeScript errors.
- **Resilient Fallback System:**
  - Transient API downtime falls back gracefully to cached market prices with an explicit `CACHED DATA` badge.
  - Zero hardcoded mock numbers presented as live.

---

## 4. Display and Wearable UX (Weight: 15%)

### Criterion Definition
Adherence to G2 optical waveguide display constraints (576 × 288 pixels per eye, 16-shade monochrome green) and ergonomic touch interactions.

### DeFi Guardian Implementation & Evidence
- **Hardware-Tailored Visual Design:**
  - Strict high-contrast monochrome green palette on pure `#000000` black background.
  - Custom 16-level grayscale-to-green palette ensuring maximum legibility on diffractive waveguides without color bleeding.
  - Large, crisp numbers for prices and key metrics; short, punchy natural-language explanations.
  - No decorative gradients, unreadable charts, or dense tables that fail on wearable displays.
- **Touch Gesture Integration:**
  - Uses official Even Hub SDK event routing (`bridge.onEvenHubEvent`).
  - Robust handling of protobuf zero-value click events (`CLICK_EVENT = 0`).
  - Single tap: cycles through screens or selects options.
  - Swipe up / Swipe down: navigates historical metrics or options.
  - Double tap: clean, native-compliant app shutdown (`bridge.shutDownPageContainer(1)`).
- **Dual-Surface Architecture:**
  - G2 Heads-Up Display: 576 × 288 pixel text containers upgraded in place via `bridge.textContainerUpgrade`.
  - Companion Web Interface: Full-featured phone/desktop interface for entering public wallet addresses, reviewing detailed trade logs, and managing settings.

---

## 5. Business Potential and Financial Safety (Weight: 10%)

### Criterion Definition
Commercial feasibility, target audience clarity, user data privacy, and ethical compliance.

### DeFi Guardian Implementation & Evidence
- **Clear Target Audience:**
  - Active cryptocurrency traders, DeFi enthusiasts, portfolio managers, and web3 professionals who need ambient market awareness during daily activities.
- **Zero-Risk Financial Safety:**
  - Non-custodial and strictly educational.
  - Never asks for, stores, or transmits private keys, seed phrases, or exchange API credentials.
  - All trades are simulated paper trades using a virtual $10,000 balance.
  - Transparent ML explanations without speculative price predictions, guarantee claims, or liquidation promises.
  - Prominent safety disclaimer displayed on all screens and documentation.
- **Zero-Cost Deployment & Packaging:**
  - Uses free public APIs (Hyperliquid, optional CoinGecko demo).
  - Packaged and validated into official `.ehpk` format (`defi-guardian.ehpk`) ready for distribution on the Even Hub app ecosystem.
