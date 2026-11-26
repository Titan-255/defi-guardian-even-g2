# DEFI GUARDIAN
## AI-Powered Crypto Market Intelligence & Paper Trading for Even Realities G2 Smart Glasses

[![Hackathon](https://img.shields.io/badge/Hackathon-Heads_Up:_Even_Realities-00e676?style=for-the-badge)](https://dorahacks.io/hackathon/even-realities/detail)
[![Track](https://img.shields.io/badge/Track-Crypto_%26_DeFi-00e676?style=for-the-badge)](https://dorahacks.io/hackathon/even-realities/detail)
[![Live Demo](https://img.shields.io/badge/Vercel-Live_Demo-black?style=for-the-badge&logo=vercel)](https://defi-guardian-eight.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-13%2F13_Passed-success?style=for-the-badge)](TEST_REPORT.md)

> **"Your Crypto Intelligence. Just a Glance Away."**  
> **Live Web & G2 Simulator Preview:** [https://defi-guardian-eight.vercel.app](https://defi-guardian-eight.vercel.app)  
> Built for the **Heads Up: Even Realities Hackathon** organized by Even Realities, TVM Ventures, and DAOs Hub.

---

## 1. Overview & Vision

**DeFi Guardian** transforms the **Even Realities G2 smart glasses** into an ambient, hands-free cryptocurrency intelligence companion. 

Crypto markets operate 24/7. When prices move or volatility spikes, pulling out a smartphone in meetings, social settings, or during commutes is distracting, socially disruptive, and visually exhausting.

DeFi Guardian replaces noisy 100-number mobile exchange dashboards with a focused 4-stage pipeline:
$$\mathbf{LIVE\ DATA} \longrightarrow \mathbf{LOCAL\ MACHINE\ LEARNING} \longrightarrow \mathbf{TRANSPARENT\ EXPLANATION} \longrightarrow \mathbf{TOUCH\ CONFIRMATION}$$

Through subtle, 16-shade green waveguide typography floating in your field of view, DeFi Guardian delivers:
1. **Real-time Mid-Prices** for BTC, ETH, and SOL streamed from **Hyperliquid**.
2. **Local Machine Learning Anomaly Detection** using **Isolation Forest** on real historical candles.
3. **Transparent Statistical Explanations** (no hallucinating external LLMs).
4. **Interactive Paper Trading (Read & Write)** with $10,000 simulated cash and G2 touch confirmation.
5. **Real-time Price Alerts** and optional read-only public wallet monitoring.

---

## 2. System Architecture

```mermaid
flowchart TD
    subgraph WearableHardware ["Even Realities G2 Smart Glasses"]
        G2Display["Monochrome Green Waveguide HUD\n(576 × 288 px)"]
        G2Touch["Temple Touch Sensor\n(Tap, Double-Tap, Swipe)"]
    end

    subgraph PhoneOrSimulator ["Even Hub Runtime / Mobile Companion"]
        SDKBridge["Even Hub SDK Bridge\n(@evenrealities/even_hub_sdk)"]
        ReactApp["React 18 + TypeScript Application\n(Vite Dev Server :5173)"]
        CompanionUI["Companion Dashboard & Simulator Controls"]
    end

    subgraph PythonBackend ["Python FastAPI Backend (:8000)"]
        APIRouters["FastAPI Routers\n(/health, /market, /intelligence, /trading, /portfolio, /alerts, /wallet)"]
        MLEngine["Local ML Anomaly Engine\n(Scikit-Learn IsolationForest)"]
        PaperEngine["Paper Trading Engine\n(Stateful Buy/Sell Simulation)"]
        SQLiteDB[("SQLite Database\n(defi_guardian.db)")]
    end

    subgraph ExternalAPIs ["Real Cryptocurrency Data"]
        HyperliquidAPI["Hyperliquid Public Info API\n(allMids, candleSnapshot, clearinghouseState)"]
        CoinGeckoAPI["Optional CoinGecko Demo API"]
    end

    %% Interactions
    G2Touch -->|Hardware Gestures| SDKBridge
    SDKBridge -->|sysEvent / textEvent| ReactApp
    ReactApp -->|textContainerUpgrade| SDKBridge
    SDKBridge -->|Optical Projection| G2Display

    ReactApp <-->|REST API (HTTP/JSON)| APIRouters
    APIRouters <--> MLEngine
    APIRouters <--> PaperEngine
    PaperEngine <--> SQLiteDB
    APIRouters <--> HyperliquidAPI
    APIRouters -.-> CoinGeckoAPI
```

---

## 3. The 7 Smart Glasses Screens

The G2 display (576 × 288 pixels per eye, 16 shades of green) is organized into 7 micro-screens accessible via temple tap or swipe:

1. **Screen 1 — Live Market Glance:** Real-time mid-prices and 24h % return for BTC, ETH, and SOL from Hyperliquid.
2. **Screen 2 — AI Market Intelligence:** Anomaly score (0–100), statistical classification (Normal vs Unusual), 1h return, candle range, and relative volume ratio.
3. **Screen 3 — Paper Portfolio:** Total value, available cash, open holdings, and live unrealized P&L.
4. **Screen 4 — Market Attention:** Isolated alert card showing when an asset exhibits statistically anomalous behavior and the primary contributing factor.
5. **Screen 5 — Wearable Paper Trading:** Select asset (BTC, ETH, SOL), action (BUY/SELL), and amount ($25, $50, $100); view order preview computed against live prices; confirm with a single tap.
6. **Screen 6 — Price Alerts:** Active price target alerts (ABOVE / BELOW); notifies user hands-free when crossed.
7. **Screen 7 — System & Settings:** Live health diagnostics (Hyperliquid LIVE, Backend ONLINE, ML Engine READY, SQLite PERSISTED), optional read-only public wallet setup, and demo reset.

---

## 4. Local Machine Learning Engine

Unlike applications that rely on paid, cloud-hosted generative AI chatbots that hallucinate market facts, DeFi Guardian runs a **local, reproducible Python machine-learning model**:

- **Model:** Scikit-Learn `IsolationForest(n_estimators=100, contamination=0.1, random_state=42)`.
- **Training Data:** Real historical hourly candles retrieved from Hyperliquid (`candleSnapshot`).
- **Engineered Features:**
  1. Logarithmic price return: $r_t = \ln(close_t / open_t)$
  2. Candle range %: $(high_t - low_t) / open_t \times 100$
  3. Candle body conviction %: $|close_t - open_t| / (high_t - low_t + 10^{-8}) \times 100$
  4. Logarithmic trading volume: $\ln(volume_t + 10^{-8})$
  5. Relative volume against 24h baseline: $volume_t / (\text{mean}(volume_{t-24 \dots t-1}) + 10^{-8})$
- **Inference Without Lookahead Bias:** The model trains on historical completed candles and evaluates the latest candle separately.
- **Deterministic Explanations:** Transparent factor analysis templates constructed strictly from observed feature percentiles (e.g. *"Volume is 3.1x higher than recent 24h baseline"*).
- **Safety Fallback:** If fewer than 24 candles are available, the model returns `MODEL WARMING UP` rather than guessing.

---

## 5. Quickstart for Beginners (1-Click Run)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (v3.10 or v3.11)

### Setup in 2 Easy Steps:

1. **Step 1: Automated Installation**  
   Double-click:
   ```cmd
   RUN_ME_FIRST.bat
   ```
   *Installs Python and npm dependencies, builds the frontend, and creates `defi-guardian.ehpk`.*

2. **Step 2: Start the Demo**  
   Double-click:
   ```cmd
   START_DEMO.bat
   ```
   *Spins up FastAPI on `http://127.0.0.1:8000` and Vite on `http://localhost:5173`, opening your browser automatically!*

### Testing with the Official Even Hub Simulator:
In a new terminal window:
```bash
cd frontend
npm run simulate
```

### Keyboard Shortcuts (for Browser / Simulator):
- **Spacebar / Right Arrow (`→`):** Next screen (Single Tap)
- **Left Arrow (`←`):** Previous screen (Swipe Down)
- **Number keys (`1` to `7`):** Jump directly to screen 1–7
- **Escape (`Esc`):** Exit event (Double Tap)

---

## 6. Verification and Testing

All components have been tested and verified:

```bash
# Run 13 automated backend tests
python -m pytest backend/tests -v

# Run frontend production build
cd frontend && npm run build

# Package Even Hub app
cd frontend && npx evenhub pack app.json dist -o defi-guardian.ehpk
```

- **Backend Unit Tests:** 13/13 Passed (100%) in 2.8s
- **Frontend Production Build:** Succeeded with zero TypeScript errors
- **Package Generated:** `defi-guardian.ehpk` (92,602 bytes stamped with `min_app_version 2.2.10`)
- **Detailed Test Log:** See [TEST_REPORT.md](TEST_REPORT.md)

---

## 7. Submission Materials Index

Comprehensive competition documents are organized in the [`submission/`](submission/) directory:

- [PROJECT_DESCRIPTION.md](submission/PROJECT_DESCRIPTION.md) — Complete overview, problem, solution, and short summary.
- [PITCH_SCRIPT.md](submission/PITCH_SCRIPT.md) — 90-second oral presentation and video pitch script.
- [DEMO_VIDEO_SCRIPT.md](submission/DEMO_VIDEO_SCRIPT.md) — 3-minute video recording plan with timestamps and visual proof.
- [JUDGING_CRITERIA_MAPPING.md](submission/JUDGING_CRITERIA_MAPPING.md) — Detailed mapping to the 5 official judging rubrics.
- [PROJECT_ARCHITECTURE.md](submission/PROJECT_ARCHITECTURE.md) — Full technical architecture and sequence diagrams.
- [API_SOURCES.md](submission/API_SOURCES.md) — Hyperliquid & CoinGecko endpoint specifications.
- [SETUP_GUIDE_FOR_BEGINNERS.md](submission/SETUP_GUIDE_FOR_BEGINNERS.md) — Plain-English setup guide.
- [JUDGE_QA.md](submission/JUDGE_QA.md) — 16 prepared judge questions and answers.

---

## 8. Open Source vs Original Work Disclosure

In compliance with hackathon rules:
- **Starter Foundation:** Minimal structure and packaging rules referenced from official Even Hub templates (`@evenrealities/even_hub_sdk`, `@evenrealities/evenhub-cli`, `@evenrealities/evenhub-simulator`).
- **Created for this Hackathon:**
  - Complete DeFi Guardian 7-screen G2 HUD and companion UI.
  - Python FastAPI backend architecture and service layer.
  - Scikit-learn Isolation Forest machine learning pipeline and feature extractors.
  - Paper trading execution engine and SQLite persistence layer.
  - Price alert trigger engine.
  - Live Hyperliquid API integration layer.

---

## 9. Security & Financial Safety Disclaimer

> **IMPORTANT DISCLAIMER:**  
> Market information and anomaly metrics provided by DeFi Guardian are strictly for educational and informational purposes only. DeFi Guardian does not provide financial advice, make price predictions, or execute real blockchain/exchange transactions. All trades in the application are simulated paper trades using virtual demo currency. The software is non-custodial and never requests, stores, or handles private keys, seed phrases, or exchange credentials.
