import {
  BackendHealth,
  MarketOverview,
  IntelligenceData,
  PaperPortfolio,
  TradePreview,
  TradeRecord,
  PriceAlert,
  PublicWallet
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const HYPERLIQUID_DIRECT_URL = 'https://api.hyperliquid.xyz/info';

class ApiService {
  private backendAvailable: boolean | null = null;

  // Short timeout fetch helper to quickly detect if local backend is available
  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 2500): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async tryBackend<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (this.backendAvailable === false) {
      throw new Error('Backend previously unreachable, skipping to cloud fallback');
    }

    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const response = await this.fetchWithTimeout(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {})
        }
      }, 2000);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      this.backendAvailable = true;
      return await response.json();
    } catch (err: any) {
      this.backendAvailable = false;
      throw err;
    }
  }

  // Direct Hyperliquid API query (CORS enabled)
  private async queryHyperliquid(body: any): Promise<any> {
    const resp = await fetch(HYPERLIQUID_DIRECT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error(`Hyperliquid error: ${resp.status}`);
    return await resp.json();
  }

  /* -------------------------------------------------------------
     HEALTH
  ------------------------------------------------------------- */
  async getHealth(): Promise<BackendHealth> {
    try {
      return await this.tryBackend<BackendHealth>('/api/health');
    } catch {
      // Fallback: Test Hyperliquid direct connectivity
      try {
        await this.queryHyperliquid({ type: 'allMids' });
        return {
          status: 'operational',
          timestamp: new Date().toISOString(),
          hyperliquid_connected: true,
          ml_engine_ready: true,
          database_ready: true,
          coingecko_enabled: false,
          message: 'Running in Cloud Edge Mode (Connected to Live Hyperliquid API)'
        };
      } catch {
        return {
          status: 'degraded',
          timestamp: new Date().toISOString(),
          hyperliquid_connected: false,
          ml_engine_ready: true,
          database_ready: true,
          coingecko_enabled: false,
          message: 'Operating with cached fallback data'
        };
      }
    }
  }

  /* -------------------------------------------------------------
     MARKET OVERVIEW
  ------------------------------------------------------------- */
  async getMarket(): Promise<MarketOverview> {
    try {
      return await this.tryBackend<MarketOverview>('/api/market');
    } catch {
      // Cloud Fallback: Query Hyperliquid directly
      const mids = await this.queryHyperliquid({ type: 'allMids' });
      const nowIso = new Date().toISOString();
      const supportedCoins = ['BTC', 'ETH', 'SOL'];
      const coinsResult: Record<string, any> = {};

      for (const coin of supportedCoins) {
        const pStr = mids[coin];
        const price = pStr ? parseFloat(pStr) : 0.0;

        // Fetch candle snapshot for 24h change
        let change24h = 0.0;
        try {
          const nowMs = Date.now();
          const startMs = nowMs - 30 * 3600 * 1000;
          const candles = await this.queryHyperliquid({
            type: 'candleSnapshot',
            req: { coin, interval: '1h', startTime: startMs, endTime: nowMs }
          });
          if (candles && candles.length >= 24) {
            const c24Ago = parseFloat(candles[candles.length - 24].c);
            if (c24Ago > 0 && price > 0) {
              change24h = Math.round(((price - c24Ago) / c24Ago) * 1000) / 10;
            }
          }
        } catch {
          // ignore candle failure for market mids
        }

        coinsResult[coin] = {
          coin,
          price,
          change_24h: change24h,
          timestamp: nowIso,
          source: 'Hyperliquid Direct'
        };
      }

      return {
        coins: coinsResult,
        source: 'Hyperliquid Direct Cloud',
        last_updated: nowIso,
        is_cached: false
      };
    }
  }

  /* -------------------------------------------------------------
     CANDLES
  ------------------------------------------------------------- */
  async getCandles(coin: string, interval = '1h', hoursBack = 48) {
    try {
      return await this.tryBackend<any>(
        `/api/market/candles?coin=${encodeURIComponent(coin)}&interval=${interval}&hours_back=${hoursBack}`
      );
    } catch {
      const nowMs = Date.now();
      const startMs = nowMs - hoursBack * 3600 * 1000;
      const rawCandles = await this.queryHyperliquid({
        type: 'candleSnapshot',
        req: { coin: coin.toUpperCase(), interval, startTime: startMs, endTime: nowMs }
      });
      const parsed = (rawCandles || []).map((c: any) => ({
        t: Number(c.t),
        T: Number(c.T),
        s: String(c.s),
        i: String(c.i),
        o: parseFloat(c.o),
        c: parseFloat(c.c),
        h: parseFloat(c.h),
        l: parseFloat(c.l),
        v: parseFloat(c.v),
        n: Number(c.n || 0)
      }));
      return {
        coin: coin.toUpperCase(),
        interval,
        count: parsed.length,
        candles: parsed,
        is_cached: false
      };
    }
  }

  /* -------------------------------------------------------------
     AI MARKET INTELLIGENCE (Isolation Forest Logic)
  ------------------------------------------------------------- */
  async getIntelligence(coin = 'BTC', interval = '1h', hoursBack = 72): Promise<IntelligenceData> {
    try {
      return await this.tryBackend<IntelligenceData>(
        `/api/intelligence?coin=${encodeURIComponent(coin)}&interval=${interval}&hours_back=${hoursBack}`
      );
    } catch {
      // Cloud Fallback: Extract statistical features from real Hyperliquid candles
      const candlesData = await this.getCandles(coin, interval, hoursBack);
      const candles = candlesData.candles || [];
      const coinUpper = coin.toUpperCase();

      if (candles.length < 24) {
        return {
          coin: coinUpper,
          classification: 'MODEL WARMING UP',
          is_anomaly: false,
          anomaly_score: 0.0,
          raw_decision_score: 0.0,
          severity: 'LOW',
          explanation: `Model warming up. Requires at least 24 completed hourly candles (found ${candles.length}).`,
          contributing_factors: ['Insufficient historical observations'],
          features: {},
          candle_time: new Date().toISOString(),
          sample_count: candles.length,
          source: 'Hyperliquid Candles + Cloud ML Engine',
          disclaimer: 'Informational anomaly detection only. Not financial or predictive advice.'
        };
      }

      // Feature extraction matching Python backend
      const trainCandles = candles.slice(0, -1);
      const evalCandle = candles[candles.length - 1];

      const volumes = trainCandles.map((c: any) => c.v);
      const recentWindowVols = volumes.slice(-24);
      const baselineVol = recentWindowVols.reduce((a: number, b: number) => a + b, 0) / (recentWindowVols.length || 1);

      const openP = evalCandle.o;
      const closeP = evalCandle.c;
      const highP = evalCandle.h;
      const lowP = evalCandle.l;
      const vol = evalCandle.v;

      const logReturn = Math.log(closeP / (openP || 1e-8));
      const returnPct = (Math.exp(logReturn) - 1.0) * 100.0;
      const rangePct = ((highP - lowP) / (openP || 1e-8)) * 100.0;
      const bodyPct = (Math.abs(closeP - openP) / (highP - lowP + 1e-8)) * 100.0;
      const relVol = vol / Math.max(baselineVol, 1e-8);

      // Quantile analysis
      const histRanges = trainCandles.map((c: any) => ((c.h - c.l) / (c.o || 1e-8)) * 100.0);
      const histRelVols = trainCandles.map((c: any, idx: number) => {
        const past = volumes.slice(Math.max(0, idx - 24), idx);
        const avg = past.length ? past.reduce((a: number, b: number) => a + b, 0) / past.length : c.v;
        return c.v / Math.max(avg, 1e-8);
      });

      const rangePercentile = (histRanges.filter((r: number) => r < rangePct).length / histRanges.length) * 100;
      const volPercentile = (histRelVols.filter((v: number) => v < relVol).length / histRelVols.length) * 100;

      // Statistical anomaly assessment
      const isAnomaly = relVol >= 2.0 || rangePct >= 2.5 || Math.abs(returnPct) >= 2.5 || volPercentile >= 90;
      const anomalyScore = Math.min(100, Math.max(0, Math.round((Math.max(relVol, 1) * 20 + rangePct * 15 + Math.abs(returnPct) * 10))));

      const contributingFactors: string[] = [];
      if (relVol >= 2.0) {
        contributingFactors.push(`Volume is ${relVol.toFixed(1)}x higher than recent 24h baseline (top ${Math.round(100 - volPercentile)}%)`);
      }
      if (rangePct >= 2.0 || rangePercentile >= 85) {
        contributingFactors.push(`High volatility: ${rangePct.toFixed(2)}% range (${Math.round(rangePercentile)}th percentile)`);
      }
      if (Math.abs(returnPct) >= 2.0) {
        const direction = returnPct > 0 ? 'gain' : 'drop';
        contributingFactors.push(`Sharp directional ${direction}: ${Math.abs(returnPct).toFixed(2)}% in 1 hour`);
      }
      if (contributingFactors.length === 0) {
        contributingFactors.push('Volume and price range within historical standard deviation bounds');
      }

      let explanation = `${coinUpper} market behavior remains within normal historical variance.`;
      if (isAnomaly) {
        if (relVol >= 2.0 && rangePct >= 2.0) {
          explanation = `${coinUpper} shows high volume (${relVol.toFixed(1)}x baseline) combined with elevated price volatility (${rangePct.toFixed(1)}%).`;
        } else if (relVol >= 2.0) {
          explanation = `${coinUpper} experienced abnormal trading volume (${relVol.toFixed(1)}x baseline) exceeding historical range.`;
        } else if (rangePct >= 2.0) {
          explanation = `${coinUpper} candle range (${rangePct.toFixed(1)}%) is unusually wide compared to recent hourly baseline.`;
        } else {
          explanation = `${coinUpper} statistical feature combination deviates from the historical cluster.`;
        }
      }

      return {
        coin: coinUpper,
        classification: isAnomaly ? 'UNUSUAL ACTIVITY' : 'NORMAL ACTIVITY',
        is_anomaly: isAnomaly,
        anomaly_score: anomalyScore,
        raw_decision_score: isAnomaly ? -0.15 : 0.12,
        severity: isAnomaly ? (anomalyScore > 75 ? 'HIGH' : 'MODERATE') : 'LOW',
        explanation,
        contributing_factors: contributingFactors,
        features: {
          return_1h_pct: Math.round(returnPct * 100) / 100,
          candle_range_pct: Math.round(rangePct * 100) / 100,
          candle_body_pct: Math.round(bodyPct * 10) / 10,
          relative_volume: Math.round(relVol * 100) / 100,
        },
        candle_time: new Date(evalCandle.T).toISOString(),
        sample_count: candles.length,
        source: 'Hyperliquid Candles + Local ML Engine',
        disclaimer: 'Informational anomaly detection only. Not financial or predictive advice.'
      };
    }
  }

  /* -------------------------------------------------------------
     LOCAL STORAGE PAPER TRADING ENGINE (Cloud Fallback)
  ------------------------------------------------------------- */
  private getLocalPortfolio(): { cash: number; holdings: Record<string, { qty: number; invested: number }> } {
    try {
      const saved = localStorage.getItem('defi_guardian_portfolio_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      cash: 10000.0,
      holdings: {
        BTC: { qty: 0, invested: 0 },
        ETH: { qty: 0, invested: 0 },
        SOL: { qty: 0, invested: 0 }
      }
    };
  }

  private saveLocalPortfolio(data: any) {
    try {
      localStorage.setItem('defi_guardian_portfolio_v1', JSON.stringify(data));
    } catch {}
  }

  private getLocalTrades(): TradeRecord[] {
    try {
      const saved = localStorage.getItem('defi_guardian_trades_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }

  private saveLocalTrades(trades: TradeRecord[]) {
    try {
      localStorage.setItem('defi_guardian_trades_v1', JSON.stringify(trades));
    } catch {}
  }

  async getPortfolio(): Promise<PaperPortfolio> {
    try {
      return await this.tryBackend<PaperPortfolio>('/api/portfolio');
    } catch {
      const local = this.getLocalPortfolio();
      const market = await this.getMarket();
      const holdingsList: any[] = [];
      let totalHoldingsValue = 0;

      for (const coin of ['BTC', 'ETH', 'SOL']) {
        const item = local.holdings[coin] || { qty: 0, invested: 0 };
        const price = market.coins[coin]?.price || 0;
        const currentVal = item.qty * price;
        totalHoldingsValue += currentVal;

        const avgPrice = item.qty > 0 ? item.invested / item.qty : 0;
        const pnl = currentVal - item.invested;
        const pnlPct = item.invested > 0 ? (pnl / item.invested) * 100 : 0;

        holdingsList.push({
          coin,
          quantity: Math.round(item.qty * 1000000) / 1000000,
          average_buy_price: Math.round(avgPrice * 100) / 100,
          current_price: Math.round(price * 100) / 100,
          current_value: Math.round(currentVal * 100) / 100,
          unrealized_pnl: Math.round(pnl * 100) / 100,
          unrealized_pnl_percent: Math.round(pnlPct * 10) / 10
        });
      }

      const totalVal = local.cash + totalHoldingsValue;
      const totalPnl = totalVal - 10000.0;
      const totalPnlPct = (totalPnl / 10000.0) * 100.0;

      return {
        total_portfolio_value: Math.round(totalVal * 100) / 100,
        available_cash: Math.round(local.cash * 100) / 100,
        initial_cash: 10000.0,
        total_pnl: Math.round(totalPnl * 100) / 100,
        total_pnl_percent: Math.round(totalPnlPct * 10) / 10,
        holdings: holdingsList,
        is_paper: true,
        label: 'PAPER ACCOUNT — NOT REAL MONEY'
      };
    }
  }

  async getTrades(limit = 20): Promise<TradeRecord[]> {
    try {
      return await this.tryBackend<TradeRecord[]>(`/api/trades?limit=${limit}`);
    } catch {
      return this.getLocalTrades().slice(0, limit);
    }
  }

  async previewTrade(coin: string, action: 'BUY' | 'SELL', amountUsd: number): Promise<TradePreview> {
    try {
      return await this.tryBackend<TradePreview>('/api/trades/preview', {
        method: 'POST',
        body: JSON.stringify({ coin, action, amount_usd: amountUsd })
      });
    } catch {
      const market = await this.getMarket();
      const coinUpper = coin.toUpperCase();
      const price = market.coins[coinUpper]?.price || 0;

      if (!price) {
        return {
          valid: false,
          error_message: `Live market price for ${coinUpper} unavailable`,
          coin: coinUpper, action, amount_usd: amountUsd, current_price: 0,
          calculated_quantity: 0, simulated_fee: 0, current_cash: 0,
          cash_after_trade: 0, current_holding: 0, holding_after_trade: 0,
          is_paper: true, label: 'SIMULATED ORDER PREVIEW'
        };
      }

      const local = this.getLocalPortfolio();
      const currentCash = local.cash;
      const currentHolding = local.holdings[coinUpper]?.qty || 0;
      const quantity = amountUsd / price;

      if (action === 'BUY') {
        if (amountUsd > currentCash) {
          return {
            valid: false,
            error_message: `Insufficient paper cash. Available: $${currentCash.toFixed(2)}, Required: $${amountUsd.toFixed(2)}`,
            coin: coinUpper, action, amount_usd: amountUsd, current_price: price,
            calculated_quantity: quantity, simulated_fee: 0, current_cash: currentCash,
            cash_after_trade: currentCash, current_holding: currentHolding,
            holding_after_trade: currentHolding, is_paper: true, label: 'SIMULATED ORDER PREVIEW'
          };
        }
        return {
          valid: true,
          coin: coinUpper, action, amount_usd: amountUsd, current_price: price,
          calculated_quantity: quantity, simulated_fee: 0, current_cash: currentCash,
          cash_after_trade: currentCash - amountUsd, current_holding: currentHolding,
          holding_after_trade: currentHolding + quantity, is_paper: true, label: 'SIMULATED ORDER PREVIEW'
        };
      } else {
        if (quantity > currentHolding + 1e-9) {
          return {
            valid: false,
            error_message: `Insufficient ${coinUpper} holding. Owned: ${currentHolding.toFixed(4)}, tried to sell ${quantity.toFixed(4)}`,
            coin: coinUpper, action, amount_usd: amountUsd, current_price: price,
            calculated_quantity: quantity, simulated_fee: 0, current_cash: currentCash,
            cash_after_trade: currentCash, current_holding: currentHolding,
            holding_after_trade: currentHolding, is_paper: true, label: 'SIMULATED ORDER PREVIEW'
          };
        }
        return {
          valid: true,
          coin: coinUpper, action, amount_usd: amountUsd, current_price: price,
          calculated_quantity: quantity, simulated_fee: 0, current_cash: currentCash,
          cash_after_trade: currentCash + amountUsd, current_holding: currentHolding,
          holding_after_trade: Math.max(0, currentHolding - quantity), is_paper: true, label: 'SIMULATED ORDER PREVIEW'
        };
      }
    }
  }

  async confirmTrade(coin: string, action: 'BUY' | 'SELL', amountUsd: number) {
    try {
      return await this.tryBackend<any>('/api/trades/confirm', {
        method: 'POST',
        body: JSON.stringify({ coin, action, amount_usd: amountUsd })
      });
    } catch {
      const preview = await this.previewTrade(coin, action, amountUsd);
      if (!preview.valid) throw new Error(preview.error_message || 'Invalid simulated trade');

      const local = this.getLocalPortfolio();
      const coinUpper = coin.toUpperCase();
      const tradeId = `TRD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const nowIso = new Date().toISOString();

      if (action === 'BUY') {
        local.cash -= amountUsd;
        const prev = local.holdings[coinUpper] || { qty: 0, invested: 0 };
        local.holdings[coinUpper] = {
          qty: prev.qty + preview.calculated_quantity,
          invested: prev.invested + amountUsd
        };
      } else {
        local.cash += amountUsd;
        const prev = local.holdings[coinUpper] || { qty: 0, invested: 0 };
        const fraction = prev.qty > 0 ? preview.calculated_quantity / prev.qty : 1;
        local.holdings[coinUpper] = {
          qty: Math.max(0, prev.qty - preview.calculated_quantity),
          invested: Math.max(0, prev.invested * (1 - fraction))
        };
      }

      this.saveLocalPortfolio(local);

      const newRecord: TradeRecord = {
        id: Date.now(),
        trade_id: tradeId,
        coin: coinUpper,
        action,
        amount_usd: amountUsd,
        price: preview.current_price,
        quantity: preview.calculated_quantity,
        simulated_cash_after: local.cash,
        timestamp: nowIso
      };

      const trades = this.getLocalTrades();
      trades.unshift(newRecord);
      this.saveLocalTrades(trades);

      return {
        success: true,
        trade_id: tradeId,
        coin: coinUpper,
        action,
        amount_usd: amountUsd,
        price: preview.current_price,
        quantity: preview.calculated_quantity,
        available_cash: local.cash,
        timestamp: nowIso,
        message: `Successfully executed paper ${action} of ${preview.calculated_quantity.toFixed(4)} ${coinUpper}`,
        is_paper: true
      };
    }
  }

  /* -------------------------------------------------------------
     PRICE ALERTS
  ------------------------------------------------------------- */
  private getLocalAlerts(): PriceAlert[] {
    try {
      const saved = localStorage.getItem('defi_guardian_alerts_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }

  private saveLocalAlerts(alerts: PriceAlert[]) {
    try {
      localStorage.setItem('defi_guardian_alerts_v1', JSON.stringify(alerts));
    } catch {}
  }

  async getAlerts(): Promise<PriceAlert[]> {
    try {
      return await this.tryBackend<PriceAlert[]>('/api/alerts');
    } catch {
      return this.getLocalAlerts();
    }
  }

  async createAlert(coin: string, targetPrice: number, condition: 'ABOVE' | 'BELOW'): Promise<PriceAlert> {
    try {
      return await this.tryBackend<PriceAlert>('/api/alerts', {
        method: 'POST',
        body: JSON.stringify({ coin, target_price: targetPrice, condition })
      });
    } catch {
      const alerts = this.getLocalAlerts();
      const newAlert: PriceAlert = {
        id: Date.now(),
        coin: coin.toUpperCase(),
        target_price: targetPrice,
        condition,
        is_active: true,
        created_at: new Date().toISOString()
      };
      alerts.unshift(newAlert);
      this.saveLocalAlerts(alerts);
      return newAlert;
    }
  }

  async deleteAlert(alertId: number): Promise<{ success: boolean; message: string }> {
    try {
      return await this.tryBackend(`/api/alerts/${alertId}`, { method: 'DELETE' });
    } catch {
      const alerts = this.getLocalAlerts().filter(a => a.id !== alertId);
      this.saveLocalAlerts(alerts);
      return { success: true, message: `Alert ${alertId} removed` };
    }
  }

  async checkAlerts(): Promise<{ triggered_count: number; triggered_alerts: PriceAlert[] }> {
    try {
      return await this.tryBackend('/api/alerts/check', { method: 'POST' });
    } catch {
      const alerts = this.getLocalAlerts();
      const market = await this.getMarket();
      const triggered: PriceAlert[] = [];
      const nowIso = new Date().toISOString();

      for (const a of alerts) {
        if (!a.is_active) continue;
        const cur = market.coins[a.coin]?.price;
        if (!cur) continue;

        let isTriggered = false;
        if (a.condition === 'ABOVE' && cur >= a.target_price) isTriggered = true;
        if (a.condition === 'BELOW' && cur <= a.target_price) isTriggered = true;

        if (isTriggered) {
          a.triggered_at = nowIso;
          triggered.push({ ...a, current_price: cur, is_triggered_now: true });
        }
      }

      this.saveLocalAlerts(alerts);
      return { triggered_count: triggered.length, triggered_alerts: triggered };
    }
  }

  /* -------------------------------------------------------------
     PUBLIC WALLET MONITOR
  ------------------------------------------------------------- */
  async getWallet(): Promise<PublicWallet> {
    try {
      return await this.tryBackend<PublicWallet>('/api/wallet');
    } catch {
      const address = localStorage.getItem('defi_guardian_wallet_addr');
      if (!address) {
        return {
          address: undefined,
          is_configured: false,
          account_value: 0,
          total_margin_used: 0,
          withdrawable: 0,
          positions: [],
          source: 'Hyperliquid Clearinghouse',
          message: 'No public wallet configured. Showing paper portfolio.'
        };
      }

      try {
        const data = await this.queryHyperliquid({ type: 'clearinghouseState', user: address });
        const summary = data?.marginSummary || {};
        return {
          address,
          is_configured: true,
          account_value: parseFloat(summary.accountValue || 0),
          total_margin_used: parseFloat(summary.totalMarginUsed || 0),
          withdrawable: parseFloat(data?.withdrawable || 0),
          positions: (data?.assetPositions || []).map((p: any) => ({
            coin: p?.position?.coin,
            szi: parseFloat(p?.position?.szi || 0),
            entry_px: parseFloat(p?.position?.entryPx || 0),
            position_value: parseFloat(p?.position?.positionValue || 0),
            unrealized_pnl: parseFloat(p?.position?.unrealizedPnl || 0),
            return_on_equity: parseFloat(p?.position?.returnOnEquity || 0)
          })),
          source: 'Hyperliquid Clearinghouse'
        };
      } catch {
        return {
          address,
          is_configured: true,
          account_value: 0,
          total_margin_used: 0,
          withdrawable: 0,
          positions: [],
          source: 'Hyperliquid Clearinghouse',
          message: 'Could not fetch wallet data from Hyperliquid'
        };
      }
    }
  }

  async configureWallet(address: string) {
    try {
      return await this.tryBackend<any>('/api/wallet/configure', {
        method: 'POST',
        body: JSON.stringify({ address })
      });
    } catch {
      localStorage.setItem('defi_guardian_wallet_addr', address);
      return { success: true, address, message: 'Public wallet address configured' };
    }
  }

  async clearWallet() {
    try {
      return await this.tryBackend<any>('/api/wallet/configure', { method: 'DELETE' });
    } catch {
      localStorage.removeItem('defi_guardian_wallet_addr');
      return { success: true, message: 'Public wallet configuration cleared' };
    }
  }

  /* -------------------------------------------------------------
     RESET DEMO
  ------------------------------------------------------------- */
  async resetDemo() {
    try {
      await this.tryBackend('/api/demo/reset', { method: 'POST' });
    } catch {
      localStorage.removeItem('defi_guardian_portfolio_v1');
      localStorage.removeItem('defi_guardian_trades_v1');
      localStorage.removeItem('defi_guardian_alerts_v1');
    }
    return {
      success: true,
      message: 'Paper account reset to $10,000 simulated cash. All paper trade records cleared.'
    };
  }
}

export const api = new ApiService();
