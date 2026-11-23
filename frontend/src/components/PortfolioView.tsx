import React from 'react';
import { PaperPortfolio, PublicWallet } from '../types';

interface Props {
  portfolio: PaperPortfolio | null;
  wallet: PublicWallet | null;
  mode: 'PAPER' | 'PUBLIC';
  onToggleMode: () => void;
  isLoading: boolean;
}

export const PortfolioView: React.FC<Props> = ({ portfolio, wallet, mode, onToggleMode, isLoading }) => {
  const isPaper = mode === 'PAPER' || !wallet?.is_configured;

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 bg-black text-[#00e676] font-mono select-none">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#1a3322] pb-1">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold tracking-widest text-[#69f0ae]">
            {isPaper ? 'PAPER PORTFOLIO' : 'READ-ONLY WALLET'}
          </span>
          <span className="text-[8px] bg-[#00441b] text-[#69f0ae] px-1 py-0.5 rounded">
            {isPaper ? 'SIMULATED' : 'HYPERLIQUID'}
          </span>
        </div>
        {wallet?.is_configured && (
          <button
            onClick={onToggleMode}
            className="text-[9px] text-[#81c784] underline"
          >
            Switch to {isPaper ? 'Live' : 'Paper'}
          </button>
        )}
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-2 my-1">
        <div className="border border-[#1a3322] bg-[#050f08] p-2 rounded">
          <div className="text-[9px] text-[#2e7d32]">TOTAL VALUE</div>
          <div className="text-sm font-bold text-white hud-glow">
            ${isPaper ? portfolio?.total_portfolio_value.toFixed(2) : wallet?.account_value.toFixed(2)}
          </div>
          <div className="text-[9px] text-[#81c784] mt-0.5">
            P&L: {isPaper ? `${portfolio && portfolio.total_pnl >= 0 ? '+' : ''}$${portfolio?.total_pnl.toFixed(2)} (${portfolio?.total_pnl_percent.toFixed(1)}%)` : '---'}
          </div>
        </div>

        <div className="border border-[#1a3322] bg-[#050f08] p-2 rounded">
          <div className="text-[9px] text-[#2e7d32]">AVAILABLE CASH</div>
          <div className="text-sm font-bold text-[#b9f6ca]">
            ${isPaper ? portfolio?.available_cash.toFixed(2) : wallet?.withdrawable.toFixed(2)}
          </div>
          <div className="text-[9px] text-[#2e7d32] mt-0.5">
            {isPaper ? 'Initial: $10,000' : 'Margin Used: $' + wallet?.total_margin_used.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Holdings / Positions Row */}
      <div className="flex-1 overflow-hidden border border-[#1a3322] bg-[#050f08] rounded p-1.5 flex flex-col justify-center">
        <div className="text-[9px] text-[#2e7d32] mb-1 font-bold">
          {isPaper ? 'ACTIVE ASSET HOLDINGS' : 'OPEN PERP POSITIONS'}
        </div>
        <div className="grid grid-cols-3 gap-1 text-[10px]">
          {isPaper ? (
            portfolio?.holdings.map((h) => (
              <div key={h.coin} className="flex flex-col border border-[#1a3322] p-1 rounded">
                <div className="flex justify-between text-[9px]">
                  <span className="font-bold text-[#b9f6ca]">{h.coin}</span>
                  <span className={h.unrealized_pnl >= 0 ? 'text-[#00e676]' : 'text-[#81c784]'}>
                    {h.unrealized_pnl >= 0 ? '+' : ''}{h.unrealized_pnl.toFixed(1)}
                  </span>
                </div>
                <div className="text-[10px] text-white font-bold">{h.quantity.toFixed(4)}</div>
                <div className="text-[8px] text-[#2e7d32]">${h.current_value.toFixed(1)}</div>
              </div>
            ))
          ) : wallet?.positions.length ? (
            wallet.positions.slice(0, 3).map((p) => (
              <div key={p.coin} className="flex flex-col border border-[#1a3322] p-1 rounded">
                <div className="flex justify-between text-[9px]">
                  <span className="font-bold text-[#b9f6ca]">{p.coin}</span>
                  <span className={p.unrealized_pnl >= 0 ? 'text-[#00e676]' : 'text-[#81c784]'}>
                    {p.unrealized_pnl >= 0 ? '+' : ''}{p.unrealized_pnl.toFixed(1)}
                  </span>
                </div>
                <div className="text-[10px] text-white">{p.szi.toFixed(4)}</div>
                <div className="text-[8px] text-[#2e7d32]">${p.position_value.toFixed(1)}</div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center text-[9px] text-[#2e7d32] py-2">
              No open positions. Use Paper Trading to simulate orders.
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-[10px] text-[#2e7d32] border-t border-[#1a3322] pt-1 mt-1">
        <span className="text-[8px] text-[#81c784]">PAPER ACCOUNT — NOT REAL MONEY</span>
        <span className="text-[#69f0ae]">Tap: Next Screen</span>
      </div>
    </div>
  );
};
