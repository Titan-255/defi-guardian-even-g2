# DeFi Guardian — Beginner's Setup & Demo Guide

Welcome! This guide is written in plain English for anyone with **zero technical or programming experience**. You do not need to write code or configure complex servers. Everything is automated.

---

## What You Need Installed
Before starting, ensure your computer has:
1. **Node.js** (v18 or higher) — [Download from nodejs.org](https://nodejs.org/)
2. **Python** (v3.10 or v3.11) — [Download from python.org](https://www.python.org/)
3. **Google Chrome** or any modern web browser

---

## Step 1: Automated First-Time Setup (One-Click)

1. Open your project folder (`G2_Hack`).
2. Double-click the file named:
   ```
   RUN_ME_FIRST.bat
   ```
3. What this does automatically:
   - Verifies Python and Node.js are available.
   - Installs backend Python dependencies (`fastapi`, `uvicorn`, `scikit-learn`, `httpx`).
   - Installs frontend dependencies (`react`, `vite`, `@evenrealities/even_hub_sdk`).
   - Pre-packages the application into `defi-guardian.ehpk`.

*When it finishes, you will see a message: "Setup completed successfully! Press any key to continue."*

---

## Step 2: Start the Application (One-Click)

1. In the project folder, double-click:
   ```
   START_DEMO.bat
   ```
2. Two clean command windows will open automatically:
   - **Window 1 (Backend):** Starts the Python FastAPI server at `http://127.0.0.1:8000`.
   - **Window 2 (Frontend):** Starts the React development server at `http://localhost:5173`.
3. Your web browser will open automatically displaying **DeFi Guardian**.

---

## Step 3: Launch the Official Even Hub Simulator

To test the application inside the official Even Realities G2 Simulator:
1. Open a new terminal or PowerShell window.
2. Run this exact command:
   ```bash
   cd frontend
   npm run simulate
   ```
3. The official Even Hub Simulator window will launch and load your G2 Heads-Up Display!

---

## Step 4: How to Test the Features During Your Demo

You can navigate the application using either **mouse clicks on the glasses frame**, or simple **keyboard shortcuts**:

### Keyboard Shortcuts
- **Spacebar** or **Right Arrow (`→`)**: Next screen
- **Left Arrow (`←`)**: Previous screen
- **Number keys (`1` to `7`)**: Jump directly to that screen
- **Escape (`Esc`)**: Double-tap exit event

---

### Suggested Demo Walkthrough (Screen by Screen)

#### Screen 1: Live Market Glance (Press `1`)
- **What you see:** Real-time prices for Bitcoin (BTC), Ethereum (ETH), and Solana (SOL) from Hyperliquid.
- **What to say:** *"Here on Screen 1, the user sees live market prices floating in their glasses' field of view without touching a phone."*

#### Screen 2: AI Market Intelligence (Press `2`)
- **What you see:** The Anomaly Score (0–100), statistical classification (Normal vs Unusual), and plain-English explanation.
- **What to say:** *"Screen 2 displays our local Isolation Forest machine learning model. It evaluates 24-hour volume and candle volatility to highlight market anomalies."*

#### Screen 3: Paper Portfolio (Press `3`)
- **What you see:** Total portfolio value, available simulated cash ($10,000), asset holdings, and real-time unrealized P&L.
- **What to say:** *"Screen 3 displays our simulated paper portfolio, tracking holdings and performance in real time."*

#### Screen 4: Market Attention (Press `4`)
- **What you see:** High-priority alert banner when unusual volume or volatility deviates from the historical baseline.
- **What to say:** *"Screen 4 filters out market noise and alerts the user only when significant statistical outliers occur."*

#### Screen 5: Paper Trading (Press `5`)
- **What you see:** Asset selector (BTC), Action (BUY/SELL), Predefined amount ($50, $100), live price preview, and the "CONFIRM ORDER" button.
- **Action:** Click "CONFIRM BUY $50 BTC".
- **Result:** You will see `SUCCESS! BUY 0.0008 BTC` and available cash decreases from $10,000 to $9,950.
- **What to say:** *"This satisfies the hackathon's Read and Write requirement. Users can preview and execute risk-free paper trades with a simple touch interaction on the glasses."*

#### Screen 6: Price Alerts (Press `6`)
- **What you see:** Active target price alerts.
- **Action:** Click `+ ADD ALERT`, enter a target price, and click `SAVE`.
- **What to say:** *"Users can configure target price alerts that trigger hands-free heads-up notifications."*

#### Screen 7: System Health & Settings (Press `7`)
- **What you see:** Diagnostic indicators showing Hyperliquid LIVE, Backend ONLINE, and ML Engine READY. You can also click `RESET TO $10K` to restore your paper account anytime.
- **What to say:** *"Screen 7 verifies that all local services and external APIs are operating with zero dependencies on paid subscriptions."*

---

## Step 5: Stopping the Demo

When you are finished demonstrating:
1. Simply close the terminal windows, or double-click `STOP_DEMO_INSTRUCTIONS.txt` for guidance.
