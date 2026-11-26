import React from 'react';
import { MarketOverview } from '../types';

interface Props {
  market: MarketOverview | null;
  isLoading: boolean;
  dataError?: string | null;
  onRefresh: () => void;
}

export const MarketGlance: React.FC<Props> = ({ market, isLoading, dataError, onRefresh }) => {
  const coins = market?.coins || {};
  const btc = coins['BTC'];
  const eth = coins['ETH'];
  const sol = coins['SOL'];

  const formatPrice = (p?: number) => {
    if (p === undefined || p === null || p === 0) return '---';
    return p >= 1000
      ? `$${p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
      : `$${p.toFixed(2)}`;
  };

  const formatChange = (c?: number) => {
    if (c === undefined || c === null) return '0.0%';
    const sign = c > 0 ? '+' : '';
    return `${sign}${c.toFixed(1)}%`;
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 bg-black text-[#00e676] font-mono select-none">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#1a3322] pb-1">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold tracking-widest text-[#69f0ae]">DEFI GUARDIAN</span>
          <span className="text-[10px] bg-[#00441b] text-[#69f0ae] px-1.5 py-0.5 rounded">
            {dataError && !market ? 'UNAVAILABLE' : market?.is_cached ? 'CACHED — NOT LIVE' : 'MARKET LIVE'}
          </span>
        </div>
        <span className="text-[10px] text-[#4caf50]">
          {isLoading ? 'SYNCING...' : 'HYPERLIQUID'}
        </span>
      </div>

      {/* Error State when no market data is available */}
      {dataError && !market ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-2 text-center py-4" role="alert">
          <div className="text-xs font-bold text-[#ff8a80]">{dataError}</div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
            className="bg-[#00e676] text-black text-xs font-bold px-3 py-1 rounded hover:bg-[#69f0ae] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#69f0ae]"
          >
            Retry Market Fetch
          </button>
        </div>
      ) : (
        /* 3 Major Coins Grid */
        <div className="grid grid-cols-3 gap-2 py-2">
          {/* BTC */}
          <div className="border border-[#1a3322] bg-[#050f08] p-2 rounded flex flex-col">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#b9f6ca]">BTC</span>
              <span className={`text-[11px] ${btc && btc.change_24h >= 0 ? 'text-[#00e676]' : 'text-[#81c784]'}`}>
                {formatChange(btc?.change_24h)}
              </span>
            </div>
            <div className="text-sm font-bold text-[#e8f5e9] mt-1 hud-glow">
              {formatPrice(btc?.price)}
            </div>
            <div className="text-[10px] text-[#4caf50] mt-0.5">24h Mid</div>
          </div>

          {/* ETH */}
          <div className="border border-[#1a3322] bg-[#050f08] p-2 rounded flex flex-col">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#b9f6ca]">ETH</span>
              <span className={`text-[11px] ${eth && eth.change_24h >= 0 ? 'text-[#00e676]' : 'text-[#81c784]'}`}>
                {formatChange(eth?.change_24h)}
              </span>
            </div>
            <div className="text-sm font-bold text-[#e8f5e9] mt-1 hud-glow">
              {formatPrice(eth?.price)}
            </div>
            <div className="text-[10px] text-[#4caf50] mt-0.5">24h Mid</div>
          </div>

          {/* SOL */}
          <div className="border border-[#1a3322] bg-[#050f08] p-2 rounded flex flex-col">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#b9f6ca]">SOL</span>
              <span className={`text-[11px] ${sol && sol.change_24h >= 0 ? 'text-[#00e676]' : 'text-[#81c784]'}`}>
                {formatChange(sol?.change_24h)}
              </span>
            </div>
            <div className="text-sm font-bold text-[#e8f5e9] mt-1 hud-glow">
              {formatPrice(sol?.price)}
            </div>
            <div className="text-[10px] text-[#4caf50] mt-0.5">24h Mid</div>
          </div>
        </div>
      )}

      {/* Footer Info & Instructions */}
      <div className="flex justify-between items-center text-[10px] text-[#4caf50] border-t border-[#1a3322] pt-1">
        <span>Updated: {market?.last_updated ? new Date(market.last_updated).toLocaleTimeString() : '---'}</span>
        <span className="text-[#69f0ae]">Tap: Next Screen</span>
      </div>
    </div>
  );
};
