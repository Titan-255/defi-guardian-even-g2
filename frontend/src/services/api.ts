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

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {})
        }
      });
      if (!response.ok) {
        let errMessage = `HTTP error ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.detail) errMessage = errData.detail;
        } catch {
          // keep fallback
        }
        throw new Error(errMessage);
      }
      return await response.json();
    } catch (err: any) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  }

  async getHealth(): Promise<BackendHealth> {
    return this.request<BackendHealth>('/api/health');
  }

  async getMarket(): Promise<MarketOverview> {
    return this.request<MarketOverview>('/api/market');
  }

  async getCandles(coin: string, interval = '1h', hoursBack = 48) {
    return this.request<any>(`/api/market/candles?coin=${encodeURIComponent(coin)}&interval=${interval}&hours_back=${hoursBack}`);
  }

  async getIntelligence(coin = 'BTC', interval = '1h', hoursBack = 72): Promise<IntelligenceData> {
    return this.request<IntelligenceData>(`/api/intelligence?coin=${encodeURIComponent(coin)}&interval=${interval}&hours_back=${hoursBack}`);
  }

  async getPortfolio(): Promise<PaperPortfolio> {
    return this.request<PaperPortfolio>('/api/portfolio');
  }

  async getTrades(limit = 20): Promise<TradeRecord[]> {
    return this.request<TradeRecord[]>(`/api/trades?limit=${limit}`);
  }

  async previewTrade(coin: string, action: 'BUY' | 'SELL', amountUsd: number): Promise<TradePreview> {
    return this.request<TradePreview>('/api/trades/preview', {
      method: 'POST',
      body: JSON.stringify({
        coin,
        action,
        amount_usd: amountUsd
      })
    });
  }

  async confirmTrade(coin: string, action: 'BUY' | 'SELL', amountUsd: number): Promise<{
    success: boolean;
    trade_id: string;
    coin: string;
    action: string;
    amount_usd: number;
    price: number;
    quantity: number;
    available_cash: number;
    timestamp: string;
    message: string;
  }> {
    return this.request('/api/trades/confirm', {
      method: 'POST',
      body: JSON.stringify({
        coin,
        action,
        amount_usd: amountUsd
      })
    });
  }

  async getAlerts(): Promise<PriceAlert[]> {
    return this.request<PriceAlert[]>('/api/alerts');
  }

  async createAlert(coin: string, targetPrice: number, condition: 'ABOVE' | 'BELOW'): Promise<PriceAlert> {
    return this.request<PriceAlert>('/api/alerts', {
      method: 'POST',
      body: JSON.stringify({
        coin,
        target_price: targetPrice,
        condition
      })
    });
  }

  async deleteAlert(alertId: number): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/alerts/${alertId}`, {
      method: 'DELETE'
    });
  }

  async checkAlerts(): Promise<{ triggered_count: number; triggered_alerts: PriceAlert[] }> {
    return this.request('/api/alerts/check', {
      method: 'POST'
    });
  }

  async getWallet(): Promise<PublicWallet> {
    return this.request<PublicWallet>('/api/wallet');
  }

  async configureWallet(address: string): Promise<{ success: boolean; address: string; message: string }> {
    return this.request('/api/wallet/configure', {
      method: 'POST',
      body: JSON.stringify({ address })
    });
  }

  async clearWallet(): Promise<{ success: boolean; message: string }> {
    return this.request('/api/wallet/configure', {
      method: 'DELETE'
    });
  }

  async resetDemo(): Promise<{ success: boolean; message: string }> {
    return this.request('/api/demo/reset', {
      method: 'POST'
    });
  }
}

export const api = new ApiService();
