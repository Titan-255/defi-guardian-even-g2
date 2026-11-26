export type ScreenId =
  | 'MARKET'
  | 'INTELLIGENCE'
  | 'PORTFOLIO'
  | 'ATTENTION'
  | 'TRADING'
  | 'ALERTS'
  | 'SETTINGS';

export type OperatingMode = 'BACKEND' | 'CLOUD_EDGE' | 'OFFLINE';

export interface BackendHealth {
  status: string;
  timestamp: string;
  hyperliquid_connected: boolean;
  ml_engine_ready: boolean;
  database_ready: boolean;
  coingecko_enabled: boolean;
  session_token?: string;
  message: string;
}

export interface CoinPriceInfo {
  coin: string;
  price: number;
  change_24h: number;
  high_24h?: number;
  low_24h?: number;
  volume_24h?: number;
  timestamp: string;
  source: string;
}

export interface MarketOverview {
  coins: Record<string, CoinPriceInfo>;
  source: string;
  last_updated: string;
  is_cached: boolean;
}

export interface IntelligenceData {
  coin: string;
  classification: string; // "UNUSUAL ACTIVITY", "NORMAL ACTIVITY", "MODEL WARMING UP", "UNAVAILABLE"
  is_anomaly: boolean;
  anomaly_score: number;
  raw_decision_score: number;
  severity: 'LOW' | 'MODERATE' | 'HIGH';
  explanation: string;
  contributing_factors: string[];
  features: {
    return_1h_pct?: number;
    candle_range_pct?: number;
    candle_body_pct?: number;
    relative_volume?: number;
  };
  candle_time: string;
  sample_count: number;
  source: string;
  disclaimer: string;
}

export interface PaperHolding {
  coin: string;
  quantity: number;
  average_buy_price: number;
  current_price: number;
  current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
}

export interface PaperPortfolio {
  total_portfolio_value: number;
  available_cash: number;
  initial_cash: number;
  total_pnl: number;
  total_pnl_percent: number;
  holdings: PaperHolding[];
  is_paper: boolean;
  label: string;
}

export interface TradePreview {
  valid: boolean;
  error_message?: string;
  coin: string;
  action: 'BUY' | 'SELL';
  amount_usd: number;
  current_price: number;
  calculated_quantity: number;
  simulated_fee: number;
  current_cash: number;
  cash_after_trade: number;
  current_holding: number;
  holding_after_trade: number;
  preview_timestamp?: string;
  is_paper: boolean;
  label: string;
}

export interface TradeRecord {
  id: number;
  trade_id: string;
  coin: string;
  action: 'BUY' | 'SELL';
  amount_usd: number;
  price: number;
  quantity: number;
  simulated_cash_after: number;
  timestamp: string;
}

export interface PriceAlert {
  id: number;
  coin: string;
  target_price: number;
  condition: 'ABOVE' | 'BELOW';
  is_active: boolean;
  repeat?: boolean;
  cooldown_seconds?: number;
  created_at: string;
  triggered_at?: string;
  current_price?: number;
  is_triggered_now?: boolean;
}

export interface PublicWallet {
  address?: string;
  is_configured: boolean;
  account_value: number;
  total_margin_used: number;
  withdrawable: number;
  positions: Array<{
    coin: string;
    szi: number;
    entry_px: number;
    position_value: number;
    unrealized_pnl: number;
    return_on_equity: number;
  }>;
  source: string;
  message?: string;
}
