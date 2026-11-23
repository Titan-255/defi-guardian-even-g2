# DeFi Guardian — Judge Q&A Preparation

This document prepares you for 16 likely judge questions with honest, technically sound, and confident answers.

---

### Q1: Why build this for smart glasses rather than a mobile phone app?
**Answer:**  
"Cryptocurrency markets operate 24/7. When prices move or volatility spikes, pulling out a phone, unlocking it, and staring at a screen is distracting and socially disruptive—especially during meetings, conversations, or commutes. Smart glasses allow ambient, hands-free awareness. You absorb the status in a 2-second glance without disconnecting from the physical world."

---

### Q2: Why is DeFi Guardian better than an existing crypto dashboard like CoinMarketCap?
**Answer:**  
"Traditional dashboards are built for large screens. They bombard users with hundreds of numbers, dense tables, and complex candlestick charts that don't fit into a wearable form factor. DeFi Guardian takes a fundamentally different approach: we compress market complexity into a 4-step sequence: **Live Data → Machine Learning → Simple Explanation → Touch Confirmation**. You get distilled intelligence, not visual noise."

---

### Q3: How does your Machine Learning engine work?
**Answer:**  
"Our ML engine runs locally on our Python backend using Scikit-Learn’s **Isolation Forest** algorithm. We ingest historical hourly candles from Hyperliquid and engineer 5 key features: logarithmic price returns, candle range percentage, candle body conviction ratio, logarithmic trading volume, and relative volume against a 24-hour rolling baseline. The model trains on historical completed candles and scores the latest candle to identify statistically abnormal volume or volatility spikes."

---

### Q4: What is an Isolation Forest, and why choose it over an LLM like GPT-4 or Gemini?
**Answer:**  
"Isolation Forest is an unsupervised tree-based anomaly detection algorithm that isolates outliers by randomly partitioning feature space. We chose it over an LLM for three reasons:  
1. **Speed & Zero Cost:** It runs locally in Python in under 5 milliseconds with zero API credit costs.  
2. **Zero Hallucination:** LLMs can hallucinate market facts or invent phantom trends. Isolation Forest is deterministic and mathematically grounded in real candle features.  
3. **Hackathon Compliance:** The rules explicitly restrict unapproved external AI APIs, so running an open-source model locally ensures 100% compliance."

---

### Q5: Does your AI predict future cryptocurrency prices?
**Answer:**  
"No, and we are very clear about this: **our model detects anomalies, not the future**. It identifies when current volume or volatility deviates significantly from recent statistical norms. It does not promise that prices will rise or fall, and we display clear disclaimers that DeFi Guardian provides market intelligence, not financial advice."

---

### Q6: Where does the market data come from?
**Answer:**  
"Our primary and mandatory data provider is the official Hyperliquid public API. We use `allMids` for real-time mid-prices, `candleSnapshot` for multi-day hourly candle history, and `clearinghouseState` for optional public wallet monitoring. We also implemented an optional secondary integration with CoinGecko's demo API."

---

### Q7: Are the prices shown live or simulated?
**Answer:**  
"The market prices are **100% real and live**, fetched directly from Hyperliquid's public endpoints. The only simulated element is the $10,000 paper trading cash balance, which allows users to practice trades without risking real money."

---

### Q8: Is a private wallet connected?
**Answer:**  
"No. DeFi Guardian is strictly **non-custodial**. We never request private keys, seed phrases, or exchange signing credentials. Users can optionally enter a public wallet address in read-only mode to view margin and open positions via Hyperliquid's public clearinghouse endpoint, but the app can never execute real on-chain transfers."

---

### Q9: Are the trades real blockchain transactions?
**Answer:**  
"No. All trades in the application are **simulated paper trades** recorded locally in SQLite. This satisfies the hackathon's Read and Write requirement by demonstrating interactive state changes, balance calculations, and touch confirmations without putting user capital at risk."

---

### Q10: How do you handle network downtime or API outages?
**Answer:**  
"We built a multi-tier fallback architecture:  
1. The backend implements an in-memory cache with an 8-second timeout. If Hyperliquid experiences a momentary lag, the app serves the last valid cached data with a `CACHED DATA` badge.  
2. If historical candles are insufficient (<24 candles), the ML engine gracefully outputs `MODEL WARMING UP`.  
3. If internet is lost entirely, the app clearly displays `BACKEND OFFLINE` rather than crashing or showing blank screens."

---

### Q11: Why did you choose Hyperliquid as your primary integration?
**Answer:**  
"Hyperliquid is one of the premier decentralized perpetual exchanges, listed as a mandatory core integration in the hackathon's Crypto & DeFi track. Its API is fast, publicly accessible, provides millisecond-level mid-prices, and gives comprehensive candle snapshots without requiring paid API subscriptions or complex OAuth flows."

---

### Q12: How did you design for the G2's hardware display constraints?
**Answer:**  
"The Even Realities G2 display has a resolution of 576 × 288 pixels per eye, optical diffractive waveguides, and a 16-shade monochrome green palette. We designed strictly for this hardware: pure black backgrounds (`#000000`) for transparency, large readable typography, high-contrast borders, zero colorful gradients, and short text snippets that fit comfortably within the glasses' optical sweet spot."

---

### Q13: How did you test the application without physical G2 glasses?
**Answer:**  
"We developed and verified the application using the **official Even Hub SDK (`@evenrealities/even_hub_sdk`)** and the **official Even Hub Simulator (`evenhub-simulator`)**. We also built an on-screen G2 HUD simulation with touch gesture hotkeys and packaged the app into a validated `.ehpk` file using `evenhub pack`."

---

### Q14: How does this scale to support dozens of cryptocurrencies?
**Answer:**  
"Hyperliquid's `allMids` endpoint already returns mid-prices for over 100 perpetual assets in a single HTTP response. In our backend, we can easily add symbols to our watchlist. On the smart glasses, users can swipe through their monitored watchlist or set top-priority assets via the companion settings page."

---

### Q15: What are the current limitations of the project?
**Answer:**  
"Currently, the local FastAPI backend runs on the developer's local machine, meaning the glasses simulator communicates over `localhost`. To deploy to real physical G2 glasses via mobile companion in production, the backend would need to be hosted on a public HTTPS server (such as Cloudflare or Fly.io) and whitelisted in `app.json`. Also, our paper trading is limited to spot simulation rather than perpetual leverage."

---

### Q16: What would you build next if you had another month?
**Answer:**  
"Three things:  
1. **Physical G2 Testing:** Test and refine text placement and brightness on physical G2 frames in various outdoor lighting conditions.  
2. **On-Chain Testnet Integration:** Integrate Hyperliquid EVM testnet or Arbitrum Sepolia for optional on-chain testnet signing using the companion app.  
3. **Multi-Asset Attention Ranking:** Enhance the Isolation Forest engine into an anomaly leaderboard that automatically surfaces the top 3 most unusual crypto assets across the entire market."
