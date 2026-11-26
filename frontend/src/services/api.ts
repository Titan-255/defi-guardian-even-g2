import {
  BackendHealth,
  MarketOverview,
  IntelligenceData,
  PaperPortfolio,
  TradePreview,
  TradeRecord,
  PriceAlert,
  PublicWallet,
  OperatingMode
} from '../types';

const CONFIGURED_API_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = CONFIGURED_API_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
const HYPERLIQUID_DIRECT_URL = 'https://api.hyperliquid.xyz/info';

const SUPPORTED_COINS = ['BTC', 'ETH', 'SOL'] as const;
const MAX_ALERT_PRICE = 10_000_000;
const PREVIEW_TTL_MS = 30_000;
const PRICE_DRIFT_TOLERANCE = 0.005;
const CANDLE_CACHE_TTL_MS = 120_000;
const BACKEND_RECHECK_INTERVAL_MS = 15_000;
const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/** Application/validation HTTP error (4xx) — must NOT trigger storage/mode failover. */
export class ApiValidationError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiValidationError';
    this.status = status;
  }
}

function generateLocalId(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0];
  }
  return Date.now() + Math.floor(Math.random() * 10000);
}

class ApiService {
  private operatingMode: OperatingMode = API_BASE_URL ? 'BACKEND' : 'CLOUD_EDGE';
  private lastBackendCheck = 0;
  private sessionToken: string | null = null;
  private candleCache: Record<string, { candles: any[]; timestamp: number }> = {};

  getOperatingMode(): OperatingMode {
    return this.operatingMode;
  }

  hasConfiguredBackend(): boolean {
    return Boolean(API_BASE_URL);
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 2500): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async ensureSessionToken(): Promise<void> {
    if (this.sessionToken || !API_BASE_URL) return;
    try {
      const resp = await this.fetchWithTimeout(`${API_BASE_URL}/api/health`, {}, 2000);
      if (resp.ok) {
        const data = await resp.json();
        if (data.session_token) this.sessionToken = data.session_token;
      }
    } catch {
      // ignore; tryBackend handles connectivity
    }
  }

  private async tryBackend<T>(endpoint: string, options?: RequestInit, isMutating = false): Promise<T> {
    if (!API_BASE_URL) {
      this.operatingMode = 'CLOUD_EDGE';
      throw new Error('No backend URL configured for production');
    }

    // Periodically recheck backend if currently in CLOUD_EDGE failover
    if (this.operatingMode === 'CLOUD_EDGE') {
      const now = Date.now();
      if (now - this.lastBackendCheck < BACKEND_RECHECK_INTERVAL_MS) {
        throw new Error('Backend in cooldown before next health recheck');
      }
      this.lastBackendCheck = now;
    }

    if (isMutating && !this.sessionToken) {
      await this.ensureSessionToken();
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> || {})
    };
    if (isMutating && this.sessionToken) {
      headers['X-Session-Token'] = this.sessionToken;
    }

    let response: Response;
    try {
      response = await this.fetchWithTimeout(url, { ...options, headers }, 3000);
    } catch (networkErr: any) {
      // Genuine network failure / timeout / CORS block
      this.operatingMode = 'CLOUD_EDGE';
      this.lastBackendCheck = Date.now();
      throw networkErr;
    }

    // 4xx HTTP errors are valid backend application responses (NOT offline!)
    if (response.status >= 400 && response.status < 500) {
      this.operatingMode = 'BACKEND';
      let errMessage = `Request rejected (${response.status})`;
      try {
        const errData = await response.json();
        if (errData.detail) errMessage = errData.detail;
      } catch {
        // keep default
      }
      throw new ApiValidationError(errMessage, response.status);
    }

    if (!response.ok) {
      // 5xx server error
      throw new Error(`Backend server error (${response.status})`);
    }

    this.operatingMode = 'BACKEND';
    return await response.json();
  }

  private async queryHyperliquid(body: any): Promise<any> {
    const resp = await this.fetchWithTimeout(HYPERLIQUID_DIRECT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }, 6000);
    if (!resp.ok) throw new Error(`Hyperliquid error: ${resp.status}`);
    return await resp.json();
  }

  /* -------------------------------------------------------------
     HEALTH
  ------------------------------------------------------------- */
  async getHealth(): Promise<BackendHealth> {
    if (API_BASE_URL) {
      try {
        // Allow probing health directly even during cooldown
        const resp = await this.fetchWithTimeout(`${API_BASE_URL}/api/health`, {}, 2000);
        if (resp.ok) {
          const data: BackendHealth = await resp.json();
          if (data.session_token) this.sessionToken = data.session_token;
          this.operatingMode = 'BACKEND';
          return data;
        }
      } catch {
        this.operatingMode = 'CLOUD_EDGE';
        this.lastBackendCheck = Date.now();
      }
    }

    try {
      await this.queryHyperliquid({ type: 'allMids' });
      this.operatingMode = 'CLOUD_EDGE';
      return {
        status: 'operational',
        timestamp: new Date().toISOString(),
        hyperliquid_connected: true,
        ml_engine_ready: true,
        database_ready: true,
        coingecko_enabled: false,
        message: 'Cloud-Edge Mode (Direct Hyperliquid API + Browser Storage)'
      };
    } catch {
      this.operatingMode = 'OFFLINE';
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        hyperliquid_connected: false,
        ml_engine_ready: false,
        database_ready: false,
        coingecko_enabled: false,
        message: 'Network unavailable — Hyperliquid & Backend unreachable'
      };
    }
  }

  /* -------------------------------------------------------------
     MARKET OVERVIEW (Shared Snapshot)
  ------------------------------------------------------------- */
  async getMarket(): Promise<MarketOverview> {
    try {
      return await this.tryBackend<MarketOverview>('/api/market');
    } catch (err) {
      if (err instanceof ApiValidationError) throw err;

      const mids = await this.queryHyperliquid({ type: 'allMids' });
      const nowIso = new Date().toISOString();
      const coinsResult: Record<string, any> = {};

      // Fetch candles using 120s cache in parallel
      const candleResults = await Promise.all(
        SUPPORTED_COINS.map((coin) =>
          this.getCandles(coin, '1h', 30).catch(() => ({ candles: [] }))
        )
      );

      SUPPORTED_COINS.forEach((coin, idx) => {
        const pStr = mids[coin];
        const price = pStr ? parseFloat(pStr) : 0.0;
        let change24h = 0.0;

        const candles = candleResults[idx]?.candles || [];
        if (candles.length >= 24) {
          const c24Ago = candles[candles.length - 24].c;
          if (c24Ago > 0 && price > 0) {
            change24h = Math.round(((price - c24Ago) / c24Ago) * 1000) / 10;
          }
        }

        coinsResult[coin] = {
          coin,
          price,
          change_24h: change24h,
          timestamp: nowIso,
          source: 'Hyperliquid Direct'
        };
      });

      return {
        coins: coinsResult,
        source: 'Hyperliquid Direct Cloud',
        last_updated: nowIso,
        is_cached: false
      };
    }
  }

  /* -------------------------------------------------------------
     CANDLES (120s cached in cloud mode)
  ------------------------------------------------------------- */
  async getCandles(coin: string, interval = '1h', hoursBack = 48) {
    const coinUpper = coin.trim().toUpperCase();
    try {
      return await this.tryBackend<any>(
        `/api/market/candles?coin=${encodeURIComponent(coinUpper)}&interval=${encodeURIComponent(interval)}&hours_back=${hoursBack}`
      );
    } catch (err) {
      if (err instanceof ApiValidationError) throw err;

      const cacheKey = `${coinUpper}_${interval}_${hoursBack}`;
      const cached = this.candleCache[cacheKey];
      const now = Date.now();
      if (cached && now - cached.timestamp < CANDLE_CACHE_TTL_MS) {
        return {
          coin: coinUpper,
          interval,
          count: cached.candles.length,
          candles: cached.candles,
          is_cached: false
        };
      }

      const startMs = now - hoursBack * 3600 * 1000;
      const rawCandles = await this.queryHyperliquid({
        type: 'candleSnapshot',
        req: { coin: coinUpper, interval, startTime: startMs, endTime: now }
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
      this.candleCache[cacheKey] = { candles: parsed, timestamp: now };
      return {
        coin: coinUpper,
        interval,
        count: parsed.length,
        candles: parsed,
        is_cached: false
      };
    }
  }

  /* -------------------------------------------------------------
     AI MARKET INTELLIGENCE (Truthful Labels: Backend ML vs Cloud Rule-Based)
  ------------------------------------------------------------- */
  async getIntelligence(coin = 'BTC', interval = '1h', hoursBack = 72): Promise<IntelligenceData> {
    const coinUpper = coin.trim().toUpperCase();
    try {
      return await this.tryBackend<IntelligenceData>(
        `/api/intelligence?coin=${encodeURIComponent(coinUpper)}&interval=${encodeURIComponent(interval)}&hours_back=${hoursBack}`
      );
    } catch (err) {
      if (err instanceof ApiValidationError) throw err;

      const candlesData = await this.getCandles(coinUpper, interval, hoursBack);
      const candles = candlesData.candles || [];

      if (candles.length < 24) {
        return {
          coin: coinUpper,
          classification: 'MODEL WARMING UP',
          is_anomaly: false,
          anomaly_score: 0.0,
          raw_decision_score: 0.0,
          severity: 'LOW',
          explanation: `Requires at least 24 completed hourly candles (found ${candles.length}).`,
          contributing_factors: ['Insufficient historical observations'],
          features: {},
          candle_time: new Date().toISOString(),
          sample_count: candles.length,
          source: 'Hyperliquid Candles + Rule-Based Statistical Detector',
          disclaimer: 'Informational statistical analysis only. Not financial or predictive advice.'
        };
      }

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

      const histRanges = trainCandles.map((c: any) => ((c.h - c.l) / (c.o || 1e-8)) * 100.0);
      const histRelVols = trainCandles.map((c: any, idx: number) => {
        const past = volumes.slice(Math.max(0, idx - 24), idx);
        const avg = past.length ? past.reduce((a: number, b: number) => a + b, 0) / past.length : c.v;
        return c.v / Math.max(avg, 1e-8);
      });

      const rangePercentile = (histRanges.filter((r: number) => r < rangePct).length / histRanges.length) * 100;
      const volPercentile = (histRelVols.filter((v: number) => v < relVol).length / histRelVols.length) * 100;

      const isAnomaly = relVol >= 2.0 || rangePct >= 2.5 || Math.abs(returnPct) >= 2.5 || volPercentile >= 90;
      const anomalyScore = Math.min(100, Math.max(0, Math.round(Math.max(relVol, 1) * 20 + rangePct * 15 + Math.abs(returnPct) * 10)));

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
          explanation = `${coinUpper} statistical feature combination deviates from recent baseline.`;
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
        source: 'Hyperliquid Candles + Rule-Based Statistical Detector',
        disclaimer: 'Informational statistical analysis only. Not financial or predictive advice.'
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

  async getPortfolio(sharedMarket?: MarketOverview | null): Promise<PaperPortfolio> {
    try {
      return await this.tryBackend<PaperPortfolio>('/api/portfolio');
    } catch (err) {
      if (err instanceof ApiValidationError) throw err;

      const local = this.getLocalPortfolio();
      const market = sharedMarket || await this.getMarket();
      const holdingsList: any[] = [];
      let totalHoldingsValue = 0;

      for (const coin of SUPPORTED_COINS) {
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
    } catch (err) {
      if (err instanceof ApiValidationError) throw err;
      return this.getLocalTrades().slice(0, limit);
    }
  }

  async previewTrade(coin: string, action: 'BUY' | 'SELL', amountUsd: number): Promise<TradePreview> {
    try {
      return await this.tryBackend<TradePreview>('/api/trades/preview', {
        method: 'POST',
        body: JSON.stringify({ coin, action, amount_usd: amountUsd })
      });
    } catch (err) {
      if (err instanceof ApiValidationError) throw err;

      const mids = await this.queryHyperliquid({ type: 'allMids' });
      const coinUpper = coin.toUpperCase();
      const price = mids[coinUpper] ? parseFloat(mids[coinUpper]) : 0;
      const nowIso = new Date().toISOString();

      if (!price) {
        return {
          valid: false,
          error_message: `Live market price for ${coinUpper} unavailable`,
          coin: coinUpper, action, amount_usd: amountUsd, current_price: 0,
          calculated_quantity: 0, simulated_fee: 0, current_cash: 0,
          cash_after_trade: 0, current_holding: 0, holding_after_trade: 0,
          preview_timestamp: nowIso, is_paper: true, label: 'SIMULATED ORDER PREVIEW'
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
            holding_after_trade: currentHolding, preview_timestamp: nowIso,
            is_paper: true, label: 'SIMULATED ORDER PREVIEW'
          };
        }
        return {
          valid: true,
          coin: coinUpper, action, amount_usd: amountUsd, current_price: price,
          calculated_quantity: quantity, simulated_fee: 0, current_cash: currentCash,
          cash_after_trade: currentCash - amountUsd, current_holding: currentHolding,
          holding_after_trade: currentHolding + quantity, preview_timestamp: nowIso,
          is_paper: true, label: 'SIMULATED ORDER PREVIEW'
        };
      } else {
        if (quantity > currentHolding + 1e-9) {
          return {
            valid: false,
            error_message: `Insufficient ${coinUpper} holding. Owned: ${currentHolding.toFixed(4)}, tried to sell ${quantity.toFixed(4)}`,
            coin: coinUpper, action, amount_usd: amountUsd, current_price: price,
            calculated_quantity: quantity, simulated_fee: 0, current_cash: currentCash,
            cash_after_trade: currentCash, current_holding: currentHolding,
            holding_after_trade: currentHolding, preview_timestamp: nowIso,
            is_paper: true, label: 'SIMULATED ORDER PREVIEW'
          };
        }
        return {
          valid: true,
          coin: coinUpper, action, amount_usd: amountUsd, current_price: price,
          calculated_quantity: quantity, simulated_fee: 0, current_cash: currentCash,
          cash_after_trade: currentCash + amountUsd, current_holding: currentHolding,
          holding_after_trade: Math.max(0, currentHolding - quantity), preview_timestamp: nowIso,
          is_paper: true, label: 'SIMULATED ORDER PREVIEW'
        };
      }
    }
  }

  async confirmTrade(
    coin: string,
    action: 'BUY' | 'SELL',
    amountUsd: number,
    previewPrice?: number,
    previewTimestamp?: string
  ) {
    try {
      return await this.tryBackend<any>('/api/trades/confirm', {
        method: 'POST',
        body: JSON.stringify({
          coin,
          action,
          amount_usd: amountUsd,
          preview_price: previewPrice,
          preview_timestamp: previewTimestamp
        })
      }, true);
    } catch (err) {
      if (err instanceof ApiValidationError) throw err;

      // Cloud fallback: validate quote age & price drift against fresh allMids
      if (previewTimestamp) {
        const ageMs = Date.now() - new Date(previewTimestamp).getTime();
        if (ageMs > PREVIEW_TTL_MS) {
          throw new ApiValidationError('Quote expired. Preview refreshed — please confirm again.', 409);
        }
      }

      const mids = await this.queryHyperliquid({ type: 'allMids' });
      const coinUpper = coin.toUpperCase();
      const execPrice = mids[coinUpper] ? parseFloat(mids[coinUpper]) : 0;
      if (!execPrice) throw new Error(`Live price for ${coinUpper} unavailable`);

      if (previewPrice && previewPrice > 0) {
        const drift = Math.abs(execPrice - previewPrice) / previewPrice;
        if (drift > PRICE_DRIFT_TOLERANCE) {
          throw new ApiValidationError(
            `${coinUpper} price changed from $${previewPrice.toFixed(2)} to $${execPrice.toFixed(2)}. Please confirm updated preview.`,
            409
          );
        }
      }

      const local = this.getLocalPortfolio();
      const quantity = amountUsd / execPrice;

      if (action === 'BUY') {
        if (amountUsd > local.cash) {
          throw new ApiValidationError(`Insufficient paper cash ($${local.cash.toFixed(2)})`, 400);
        }
        local.cash -= amountUsd;
        const prev = local.holdings[coinUpper] || { qty: 0, invested: 0 };
        local.holdings[coinUpper] = {
          qty: prev.qty + quantity,
          invested: prev.invested + amountUsd
        };
      } else {
        const prev = local.holdings[coinUpper] || { qty: 0, invested: 0 };
        if (quantity > prev.qty + 1e-9) {
          throw new ApiValidationError(`Insufficient ${coinUpper} holding`, 400);
        }
        local.cash += amountUsd;
        const fraction = prev.qty > 0 ? quantity / prev.qty : 1;
        local.holdings[coinUpper] = {
          qty: Math.max(0, prev.qty - quantity),
          invested: Math.max(0, prev.invested * (1 - fraction))
        };
      }

      this.saveLocalPortfolio(local);

      const tradeId = `TRD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const nowIso = new Date().toISOString();
      const newRecord: TradeRecord = {
        id: generateLocalId(),
        trade_id: tradeId,
        coin: coinUpper,
        action,
        amount_usd: amountUsd,
        price: execPrice,
        quantity,
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
        price: execPrice,
        quantity,
        available_cash: local.cash,
        timestamp: nowIso,
        message: `Successfully executed paper ${action} of ${quantity.toFixed(4)} ${coinUpper}`,
        is_paper: true
      };
    }
  }

  /* -------------------------------------------------------------
     PRICE ALERTS (One-Time Default + Shared Price Snapshot)
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
    } catch (err) {
      if (err instanceof ApiValidationError) throw err;
      return this.getLocalAlerts();
    }
  }

  async createAlert(coin: string, targetPrice: number, condition: 'ABOVE' | 'BELOW', repeat = false): Promise<PriceAlert> {
    const coinUpper = coin.trim().toUpperCase();
    if (!SUPPORTED_COINS.includes(coinUpper as any)) {
      throw new ApiValidationError(`Unsupported asset: ${coin}. Supported: BTC, ETH, SOL`, 400);
    }
    if (!Number.isFinite(targetPrice) || targetPrice <= 0 || targetPrice > MAX_ALERT_PRICE) {
      throw new ApiValidationError(`Target price must be between $0 and $${MAX_ALERT_PRICE.toLocaleString()}`, 400);
    }

    try {
      return await this.tryBackend<PriceAlert>('/api/alerts', {
        method: 'POST',
        body: JSON.stringify({ coin: coinUpper, target_price: targetPrice, condition, repeat })
      }, true);
    } catch (err) {
      if (err instanceof ApiValidationError) throw err;

      const alerts = this.getLocalAlerts();
      const newAlert: PriceAlert = {
        id: generateLocalId(),
        coin: coinUpper,
        target_price: targetPrice,
        condition,
        is_active: true,
        repeat,
        cooldown_seconds: 300,
        created_at: new Date().toISOString()
      };
      alerts.unshift(newAlert);
      this.saveLocalAlerts(alerts);
      return newAlert;
    }
  }

  async deleteAlert(alertId: number): Promise<{ success: boolean; message: string }> {
    try {
      return await this.tryBackend(`/api/alerts/${alertId}`, { method: 'DELETE' }, true);
    } catch (err) {
      if (err instanceof ApiValidationError) throw err;

      const alerts = this.getLocalAlerts();
      const filtered = alerts.filter(a => a.id !== alertId);
      if (filtered.length === alerts.length) {
        throw new ApiValidationError(`Alert ${alertId} not found`, 404);
      }
      this.saveLocalAlerts(filtered);
      return { success: true, message: `Alert ${alertId} removed` };
    }
  }

  async checkAlerts(sharedMarket?: MarketOverview | null): Promise<{ triggered_count: number; triggered_alerts: PriceAlert[] }> {
    const pricesPayload: Record<string, number> = {};
    if (sharedMarket?.coins) {
      for (const [c, info] of Object.entries(sharedMarket.coins)) {
        if (info?.price > 0) pricesPayload[c] = info.price;
      }
    }

    try {
      return await this.tryBackend('/api/alerts/check', {
        method: 'POST',
        body: Object.keys(pricesPayload).length ? JSON.stringify({ prices: pricesPayload }) : undefined
      });
    } catch (err) {
      if (err instanceof ApiValidationError) throw err;

      const alerts = this.getLocalAlerts();
      const activeAlerts = alerts.filter(a => a.is_active);
      if (activeAlerts.length === 0) {
        return { triggered_count: 0, triggered_alerts: [] };
      }

      const market = sharedMarket || await this.getMarket();
      const triggered: PriceAlert[] = [];
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();

      for (const a of alerts) {
        if (!a.is_active) continue;

        if (a.repeat && a.triggered_at) {
          const elapsedSec = (nowMs - new Date(a.triggered_at).getTime()) / 1000;
          if (elapsedSec < (a.cooldown_seconds || 300)) continue;
        }

        const cur = market.coins[a.coin]?.price;
        if (!cur || cur <= 0) continue;

        const isTriggered =
          (a.condition === 'ABOVE' && cur >= a.target_price) ||
          (a.condition === 'BELOW' && cur <= a.target_price);

        if (isTriggered) {
          a.triggered_at = nowIso;
          if (!a.repeat) {
            a.is_active = false; // One-time alert deactivates after triggering
          }
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
    } catch (err) {
      if (err instanceof ApiValidationError) throw err;

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
    const trimmed = address.trim();
    if (!ETH_ADDRESS_RE.test(trimmed)) {
      throw new ApiValidationError('Invalid address: must be 42-char hex starting with 0x', 400);
    }

    try {
      return await this.tryBackend<any>('/api/wallet/configure', {
        method: 'POST',
        body: JSON.stringify({ address: trimmed })
      }, true);
    } catch (err) {
      if (err instanceof ApiValidationError) throw err;
      localStorage.setItem('defi_guardian_wallet_addr', trimmed);
      return { success: true, address: trimmed, message: 'Public wallet address configured' };
    }
  }

  async clearWallet() {
    try {
      return await this.tryBackend<any>('/api/wallet/configure', { method: 'DELETE' }, true);
    } catch (err) {
      if (err instanceof ApiValidationError) throw err;
      localStorage.removeItem('defi_guardian_wallet_addr');
      return { success: true, message: 'Public wallet configuration cleared' };
    }
  }

  /* -------------------------------------------------------------
     RESET DEMO
  ------------------------------------------------------------- */
  async resetDemo() {
    try {
      return await this.tryBackend<{ success: boolean; message: string }>('/api/demo/reset', { method: 'POST' }, true);
    } catch (err) {
      if (err instanceof ApiValidationError) throw err;
      localStorage.removeItem('defi_guardian_portfolio_v1');
      localStorage.removeItem('defi_guardian_trades_v1');
      localStorage.removeItem('defi_guardian_alerts_v1');
      return {
        success: true,
        message: 'Paper account reset to $10,000 simulated cash. All paper trade records cleared.'
      };
    }
  }
}

export const api = new ApiService();
