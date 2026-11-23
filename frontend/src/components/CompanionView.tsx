import React from 'react';
import {
  ScreenId,
  MarketOverview,
  IntelligenceData,
  PaperPortfolio,
  TradeRecord,
  PriceAlert,
  PublicWallet,
  BackendHealth
} from '../types';

interface Props {
  activeScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  market: MarketOverview | null;
  intel: IntelligenceData | null;
  portfolio: PaperPortfolio | null;
  trades: TradeRecord[];
  alerts: PriceAlert[];
  wallet: PublicWallet | null;
  health: BackendHealth | null;
  isBridgeActive: boolean;
  onRefreshAll: () => void;
}

export const CompanionView: React.FC<Props> = ({
  activeScreen,
  onSelectScreen,
  market,
  intel,
  portfolio,
  trades,
  alerts,
  wallet,
  health,
  isBridgeActive,
  onRefreshAll,
}) => {
  const screens: { id: ScreenId; title: string; num: string }[] = [
    { id: 'MARKET', title: 'Market Glance', num: '1' },
    { id: 'INTELLIGENCE', title: 'AI Anomaly Engine', num: '2' },
    { id: 'PORTFOLIO', title: 'Paper Portfolio', num: '3' },
    { id: 'ATTENTION', title: 'Market Attention', num: '4' },
    { id: 'TRADING', title: 'Paper Trading', num: '5' },
    { id: 'ALERTS', title: 'Price Alerts', num: '6' },
    { id: 'SETTINGS', title: 'System & Wallet', num: '7' },
  ];

  return (
    <div className="w-full max-w-xl mx-auto bg-[#0a120c] border border-[#1a3322] rounded-xl p-4 font-mono text-[#e0f2e9] shadow-xl">
      {/* Companion Header */}
      <div className="flex justify-between items-center border-b border-[#1a3322] pb-3 mb-3">
        <div>
          <h2 className="text-base font-bold text-[#00e676] tracking-wide flex items-center space-x-2">
            <span>DEFI GUARDIAN COMPANION</span>
          </h2>
          <p className="text-[11px] text-[#81c784] mt-0.5">
            Wearable Crypto Intelligence for Even Realities G2
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
            isBridgeActive ? 'bg-[#00441b] text-[#69f0ae] border border-[#00e676]' : 'bg-[#1a3322] text-[#81c784]'
          }`}>
            {isBridgeActive ? 'SDK BRIDGE ACTIVE' : 'SIMULATOR PREVIEW'}
          </span>
          <button
            onClick={onRefreshAll}
            className="text-[11px] bg-[#050f08] border border-[#1a3322] hover:border-[#00e676] px-2.5 py-1 rounded text-[#00e676] transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Screen Navigation Buttons */}
      <div className="mb-4">
        <div className="text-[10px] text-[#2e7d32] uppercase tracking-wider mb-1.5 font-bold">
          Glasses HUD Screen Switcher
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
          {screens.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectScreen(s.id)}
              className={`p-1.5 rounded text-center transition flex flex-col items-center justify-center ${
                activeScreen === s.id
                  ? 'bg-[#00e676] text-black font-bold shadow-md'
                  : 'bg-[#050f08] border border-[#1a3322] text-[#81c784] hover:border-[#00e676]'
              }`}
            >
              <span className="text-[11px] font-bold">{s.num}</span>
              <span className="text-[9px] truncate w-full">{s.title.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* System Status Pill Row */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-[10px]">
        <div className="border border-[#1a3322] bg-[#050f08] p-2 rounded">
          <div className="text-[#2e7d32]">DATA FEED</div>
          <div className="text-white font-bold mt-0.5">
            {health?.hyperliquid_connected ? 'Hyperliquid Live' : 'Cached/Offline'}
          </div>
        </div>
        <div className="border border-[#1a3322] bg-[#050f08] p-2 rounded">
          <div className="text-[#2e7d32]">PAPER BALANCE</div>
          <div className="text-[#69f0ae] font-bold mt-0.5">
            ${portfolio?.available_cash.toFixed(2) ?? '10,000.00'}
          </div>
        </div>
        <div className="border border-[#1a3322] bg-[#050f08] p-2 rounded">
          <div className="text-[#2e7d32]">ACTIVE ALERTS</div>
          <div className="text-white font-bold mt-0.5">
            {alerts.length} Configured
          </div>
        </div>
      </div>

      {/* Recent Paper Trade Activity Log */}
      <div className="border border-[#1a3322] bg-[#050f08] rounded p-2.5 mb-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] font-bold text-[#b9f6ca]">Simulated Paper Trades Log</span>
          <span className="text-[9px] text-[#2e7d32]">{trades.length} Recorded in SQLite</span>
        </div>
        {trades.length > 0 ? (
          <div className="max-h-28 overflow-y-auto space-y-1 pr-1 text-[10px]">
            {trades.slice(0, 5).map((t) => (
              <div key={t.trade_id} className="flex justify-between items-center border-b border-[#112417] pb-0.5">
                <div>
                  <span className={`font-bold mr-1.5 ${t.action === 'BUY' ? 'text-[#00e676]' : 'text-[#81c784]'}`}>
                    {t.action}
                  </span>
                  <span className="text-white">{t.quantity.toFixed(4)} {t.coin}</span>
                  <span className="text-[#2e7d32] ml-1.5">@ ${t.price.toLocaleString()}</span>
                </div>
                <div className="text-[9px] text-[#81c784]">
                  ${t.amount_usd} · {new Date(t.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-2 text-[10px] text-[#2e7d32]">
            No paper trades executed yet. Switch to Screen 5 to simulate a trade!
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-center text-[10px] text-[#2e7d32] border-t border-[#1a3322] pt-2">
        <span>Heads Up: Even Realities Hackathon</span>
        <span>Track: Crypto & DeFi</span>
      </div>
    </div>
  );
};
