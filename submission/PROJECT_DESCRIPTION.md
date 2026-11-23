# DeFi Guardian — Project Description

## 1. Project Information
- **Project Name:** DEFI GUARDIAN
- **Tagline:** Your Crypto Intelligence. Just a Glance Away.
- **Track:** Crypto & DeFi (Wearable Financial Intelligence)
- **Competition:** Heads Up: Even Realities Hackathon by Even Realities, TVM Ventures and DAOs Hub
- **Target Hardware:** Even Realities G2 Smart Glasses (Optical Waveguide, 576 × 288 per eye, 16-shade monochrome green)
- **Developer:** Solo Builder (College Student)
- **Repository:** `defi-guardian-even-g2`

---

## 2. Problem Statement
Cryptocurrency markets are open 24/7/365, highly volatile, and information-dense. Traders and web3 participants suffer from:
1. **Screen Fatigue & Constant Phone Distraction:** Checking smartphones dozens of times an hour to monitor Bitcoin, Ethereum, and Solana prices breaks focus, looks unprofessional in social or workplace environments, and causes high cognitive load.
2. **Information Overload:** Traditional crypto apps and exchange dashboards are cluttered with 100+ numbers, crowded orderbooks, and complex candlestick charts that are impossible to absorb at a glance.
3. **Delayed Reaction to Market Anomalies:** Unusual trading volume spikes or rapid flash volatility often occur when a user is walking, working, or unable to look down at a phone screen.
4. **Execution Barrier:** Taking out a phone, opening a browser or app, authenticating, and navigating an exchange interface takes 30–60 seconds, during which market conditions change.

---

## 3. Our Solution: DeFi Guardian
**DeFi Guardian** is an AI-powered cryptocurrency market intelligence and paper-trading assistant built specifically for the **Even Realities G2 smart glasses** and the **Even Hub SDK**.

Rather than porting an exchange UI to a wearable, DeFi Guardian engineers a glanceable, 4-stage wearable intelligence pipeline:
$$\text{LIVE DATA} \longrightarrow \text{LOCAL MACHINE LEARNING} \longrightarrow \text{TRANSPARENT EXPLANATION} \longrightarrow \text{TOUCH CONFIRMATION}$$

Through subtle, 16-shade green waveguide typography floating in the user's peripheral field of view, DeFi Guardian displays:
- Real-time mid-prices for BTC, ETH, and SOL from Hyperliquid.
- Local Scikit-learn **Isolation Forest** anomaly detection that spots abnormal trading volume or volatility.
- Transparent, deterministic explanations based on actual mathematical features (no hallucinating external LLMs).
- A zero-risk, $10,000 simulated paper-trading engine enabling instant BUY/SELL execution with G2 touch confirmation.
- Real-time price alerts and optional read-only public wallet monitoring.

---

## 4. Key Features
1. **Live Market Intelligence (Hyperliquid):** Real-time mid-prices, 24-hour percentage returns, and high/low ranges directly from the official Hyperliquid public info API.
2. **Local AI Anomaly Engine (Isolation Forest):** Python scikit-learn model trained on real historical hourly candles. Computes log returns, range percentages, candle body conviction, and relative volume baselines to identify statistically unusual market behavior.
3. **Wearable HUD User Experience:** Purpose-built for the G2 display (576 × 288 px), featuring 7 focused screens with single-tap navigation, swipe cycling, and double-tap exit.
4. **Read & Write Paper Trading Engine:** Starts with $10,000 simulated cash in SQLite. Allows users to preview orders using live market prices and confirm simulated BUY/SELL orders of $25, $50, or $100 using G2 touch gestures.
5. **Real-Time Price Alerts:** Set target thresholds (ABOVE or BELOW) for monitored cryptocurrencies; triggers heads-up notifications when live market ticks hit the target.
6. **Optional Read-Only Public Wallet Monitoring:** View live clearinghouse margin, positions, and equity from any public Hyperliquid address without exposing private keys.

---

## 5. Technology Stack
- **Wearable / Frontend:** Even Realities G2 Smart Glasses, Even Hub SDK (`@evenrealities/even_hub_sdk`), Even Hub Simulator, React 18, TypeScript, Vite, Tailwind CSS.
- **Backend:** Python 3.11, FastAPI, Pydantic V2, HTTPX (async client), SQLite3.
- **Machine Learning:** Scikit-Learn (`IsolationForest`), NumPy.
- **Data Integrations:** Official Hyperliquid Public API (`allMids`, `candleSnapshot`, `clearinghouseState`), optional CoinGecko demo API.

---

## 6. Security and Financial Safety
- **Strictly Educational & Non-Custodial:** Never requests, handles, or stores private keys or seed phrases.
- **Zero Real-Money Risk:** All trades are simulated paper trades recorded in local SQLite.
- **No Hallucinations:** Anomaly explanations are derived deterministically from actual feature statistics rather than generative AI chatbots.
- **Disclaimers:** Every screen and response explicitly affirms that DeFi Guardian provides market intelligence for informational purposes only and does not provide financial advice.

---

## 7. Short Submission Summary (Copy & Paste Ready)
> **DeFi Guardian** brings crypto market intelligence and simulated trading directly to your field of view on the Even Realities G2 smart glasses. Powered by live data from Hyperliquid and a local Python Isolation Forest machine-learning engine, DeFi Guardian detects unusual volume and volatility spikes, provides plain-English explanations of market behavior, and lets users execute simulated paper trades using intuitive touch gestures—all without ever taking out their phone.
