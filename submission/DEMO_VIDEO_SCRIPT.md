# DeFi Guardian — 3-Minute Demo Video Walkthrough Script

*Target Duration: Exactly 2:45 to 3:00 minutes*  
*Environment: Official Even Hub Simulator + DeFi Guardian Full-Stack Web App*

---

## Video Timeline Overview

| Timecode | Section | Visual Focus | Action / Proof for Judges |
|---|---|---|---|
| 0:00 - 0:25 | Intro & Architecture | Title slide + Split view: Simulator & Terminal | Show FastAPI backend running + Vite frontend + Even Hub SDK connected |
| 0:25 - 0:55 | Screen 1: Live Market Glance | G2 HUD Screen 1 | Point out live Hyperliquid mid-prices for BTC, ETH, SOL and 24h % change |
| 0:55 - 1:30 | Screen 2 & 4: AI Anomaly Engine | G2 HUD Screen 2 & 4 | Show Isolation Forest anomaly score, feature metrics, and plain-English factor analysis |
| 1:30 - 2:10 | Screen 5 & 3: Paper Trading (Write) | G2 HUD Screen 5 & Companion | Select BTC, choose BUY $100, show live price calculation, tap confirm, show SQLite updated balance on Screen 3 |
| 2:10 - 2:35 | Screen 6 & 7: Price Alerts & Settings | G2 HUD Screen 6 & 7 | Demonstrate price alert trigger, view backend health indicators and public wallet status |
| 2:35 - 3:00 | Wrap-up & Hackathon Value | G2 HUD Overview + Package Verification | Show `defi-guardian.ehpk` package and conclude with vision |

---

## Detailed Scene-by-Scene Script

### Scene 1: Introduction & Technology Foundation [0:00 – 0:25]
- **Visual:** Split screen showing the official Even Hub Simulator displaying the DeFi Guardian HUD, and the terminal showing FastAPI running on `localhost:8000`.
- **Spoken Audio:**
  > "Welcome to the demonstration of **DeFi Guardian**, built for the Heads Up: Even Realities Hackathon in the Crypto & DeFi track.
  >
  > Today I'm demonstrating DeFi Guardian running in the official Even Hub Simulator using the official Even Hub SDK. On the left is our Python FastAPI backend, which is actively communicating with the live Hyperliquid public API and running our local machine learning engine."

---

### Scene 2: Live Market Intelligence (Screen 1) [0:25 – 0:55]
- **Visual:** G2 HUD Screen 1 (576 × 288 monochrome green).
- **Action:** Tap the screen or press the spacebar to demonstrate refreshing and cycling.
- **Spoken Audio:**
  > "Here on Screen 1, we see our **Live Market Glance**. 
  >
  > Notice the clean, high-contrast monochrome green layout engineered specifically for the G2's optical waveguide. These prices for Bitcoin, Ethereum, and Solana are not hardcoded numbers—they are live mid-prices fetched directly from Hyperliquid's `allMids` API. 
  >
  > In the top right, we see the 'MARKET LIVE' status and the 24-hour return calculated from hourly candle history."

---

### Scene 3: Local AI Market Anomaly Engine (Screens 2 & 4) [0:55 – 1:30]
- **Visual:** Tap once to transition to Screen 2 (AI Market Intelligence), then to Screen 4 (Market Attention).
- **Action:** Switch between BTC, ETH, and SOL using the touch controls.
- **Spoken Audio:**
  > "Now let's tap the temple to advance to Screen 2: our **AI Market Intelligence**. 
  >
  > This is powered by a local Scikit-Learn **Isolation Forest** model running on our backend. The engine trains on historical hourly candles from Hyperliquid, evaluating log returns, candle range, body ratio, and relative volume against a 24-hour baseline.
  >
  > Notice the Anomaly Score and the transparent explanation: 'Market behavior remains within normal historical variance' with relative volume and 1-hour return metrics. 
  >
  > When we tap into Screen 4, the **Market Attention** view isolates any unusual statistical outliers so traders know immediately when a market event warrants their attention."

---

### Scene 4: Wearable Paper Trading & Read/Write Action (Screen 5 & 3) [1:30 – 2:10]
- **Visual:** Transition to Screen 5 (Paper Trading), preview an order, then transition to Screen 3 (Portfolio).
- **Action:** Click "BUY $100 BTC". Show the order preview calculated using the live API price, then click "CONFIRM BUY". Show the green success message: `SUCCESS! BUY 0.0016 BTC`. Then switch to Screen 3 to verify available cash dropped from $10,000 to $9,900 and BTC holding increased.
- **Spoken Audio:**
  > "Next is our core interactive feature: **Wearable Paper Trading**, fulfilling the hackathon's Read and Write requirement.
  >
  > The demo starts with $10,000 of simulated cash. Here on Screen 5, I select Bitcoin, choose BUY, and select $100. The system instantly queries the live Hyperliquid price and calculates our exact order quantity.
  >
  > I confirm the order with a touch interaction. In the terminal, FastAPI commits the trade atomically into SQLite.
  >
  > Now let's switch to Screen 3: the **Portfolio**. You can see our available cash has updated to $9,900, our Bitcoin holding is actively tracked, and our unrealized P&L is calculated dynamically against live ticks."

---

### Scene 5: Price Alerts & System Health (Screens 6 & 7) [2:10 – 2:35]
- **Visual:** Show Screen 6 (Active Alerts) and Screen 7 (System Health & Public Wallet).
- **Action:** Point out active alerts and the backend health grid showing Hyperliquid LIVE, Backend ONLINE, and ML Engine READY.
- **Spoken Audio:**
  > "Screen 6 manages our **Price Alerts**. Users can set target thresholds to be notified hands-free the moment a cryptocurrency hits their price.
  >
  > On Screen 7, our **System & Settings** view displays live diagnostic checks confirming Hyperliquid connectivity, SQLite persistence, and our optional read-only public wallet integration."

---

### Scene 6: Conclusion & Packaging Verification [2:35 – 3:00]
- **Visual:** Show the generated `defi-guardian.ehpk` package stamped in the terminal and a final shot of the G2 HUD.
- **Spoken Audio:**
  > "Finally, we validated and stamped the project into `defi-guardian.ehpk` using the official Even Hub CLI, ready for distribution on Even Hub.
  >
  > DeFi Guardian delivers glanceable, safe, and actionable financial intelligence to smart glasses. Thank you for watching!"
