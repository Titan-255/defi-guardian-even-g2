import React, { useState, useEffect } from 'react';
import { TradePreview, PaperPortfolio } from '../types';
import { api } from '../services/api';

interface Props {
  portfolio: PaperPortfolio | null;
  onTradeExecuted: () => void;
  defaultCoin?: string;
}

export const PaperTradingView: React.FC<Props> = ({ portfolio, onTradeExecuted, defaultCoin = 'BTC' }) => {
  const [coin, setCoin] = useState(defaultCoin);
  const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');
  const [amount, setAmount] = useState<number>(50);
  const [preview, setPreview] = useState<TradePreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tradeStatus, setTradeStatus] = useState<string | null>(null);

  // Load preview whenever coin, action, or amount changes
  useEffect(() => {
    let isCurrent = true;
    const fetchPreview = async () => {
      try {
        const res = await api.previewTrade(coin, action, amount);
        if (isCurrent) setPreview(res);
      } catch (err: any) {
        if (isCurrent) {
          setPreview(null);
          setTradeStatus(`Preview error: ${err.message}`);
        }
      }
    };
    fetchPreview();
    return () => {
      isCurrent = false;
    };
  }, [coin, action, amount]);

  const handleConfirmTrade = async () => {
    if (!preview || !preview.valid || isSubmitting) return;

    setIsSubmitting(true);
    setTradeStatus('EXECUTING SIMULATED ORDER...');
    try {
      const res = await api.confirmTrade(coin, action, amount);
      if (res.success) {
        setTradeStatus(`SUCCESS! ${action} ${res.quantity.toFixed(4)} ${coin}`);
        onTradeExecuted();
        // Clear message after 3 seconds
        setTimeout(() => setTradeStatus(null), 3000);
      }
    } catch (err: any) {
      setTradeStatus(`Failed: ${err.message}`);
      setTimeout(() => setTradeStatus(null), 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const amounts = [25, 50, 100];
  const coins = ['BTC', 'ETH', 'SOL'];

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 bg-black text-[#00e676] font-mono select-none">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#1a3322] pb-1">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold tracking-widest text-[#69f0ae]">PAPER TRADING</span>
          <span className="text-[8px] bg-[#00441b] text-[#69f0ae] px-1 py-0.5 rounded">SIMULATOR</span>
        </div>
        <span className="text-[10px] text-[#81c784]">
          Cash: ${portfolio?.available_cash.toFixed(0) ?? '10,000'}
        </span>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-3 gap-1 my-1">
        {/* Coin Selector */}
        <div className="flex bg-[#050f08] border border-[#1a3322] rounded p-0.5">
          {coins.map((c) => (
            <button
              key={c}
              onClick={() => setCoin(c)}
              className={`flex-1 text-[9px] py-0.5 rounded transition ${
                coin === c ? 'bg-[#00e676] text-black font-bold' : 'text-[#81c784]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Action Selector */}
        <div className="flex bg-[#050f08] border border-[#1a3322] rounded p-0.5">
          <button
            onClick={() => setAction('BUY')}
            className={`flex-1 text-[9px] py-0.5 rounded transition ${
              action === 'BUY' ? 'bg-[#00e676] text-black font-bold' : 'text-[#81c784]'
            }`}
          >
            BUY
          </button>
          <button
            onClick={() => setAction('SELL')}
            className={`flex-1 text-[9px] py-0.5 rounded transition ${
              action === 'SELL' ? 'bg-[#00e676] text-black font-bold' : 'text-[#81c784]'
            }`}
          >
            SELL
          </button>
        </div>

        {/* Amount Selector */}
        <div className="flex bg-[#050f08] border border-[#1a3322] rounded p-0.5">
          {amounts.map((amt) => (
            <button
              key={amt}
              onClick={() => setAmount(amt)}
              className={`flex-1 text-[9px] py-0.5 rounded transition ${
                amount === amt ? 'bg-[#00e676] text-black font-bold' : 'text-[#81c784]'
              }`}
            >
              ${amt}
            </button>
          ))}
        </div>
      </div>

      {/* Order Preview Box */}
      <div className="border border-[#1a3322] bg-[#050f08] p-2 rounded flex flex-col justify-between my-0.5">
        {tradeStatus ? (
          <div className="text-center py-2 text-xs font-bold text-white hud-glow">
            {tradeStatus}
          </div>
        ) : preview ? (
          <>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[#81c784]">
                {action} {coin} @ ${preview.current_price.toLocaleString()}
              </span>
              <span className="text-white font-bold">
                Qty: {preview.calculated_quantity.toFixed(6)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[9px] text-[#2e7d32] mt-1 border-t border-[#1a3322] pt-1">
              <span>Cash after: ${preview.cash_after_trade.toFixed(2)}</span>
              <span>Holding after: {preview.holding_after_trade.toFixed(4)} {coin}</span>
            </div>
            {!preview.valid && (
              <div className="text-[9px] text-[#ff8a80] mt-0.5">
                {preview.error_message}
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-[10px] text-[#2e7d32]">Loading price preview...</div>
        )}
      </div>

      {/* Confirmation Button */}
      <button
        onClick={handleConfirmTrade}
        disabled={!preview?.valid || isSubmitting}
        className={`w-full py-1.5 rounded text-xs font-bold tracking-wider transition ${
          preview?.valid && !isSubmitting
            ? 'bg-[#00e676] text-black hover:bg-[#69f0ae] active:scale-[0.98]'
            : 'bg-[#1a3322] text-[#2e7d32] cursor-not-allowed'
        }`}
      >
        {isSubmitting ? 'CONFIRMING...' : `CONFIRM ${action} $${amount} ${coin}`}
      </button>

      {/* Footer */}
      <div className="flex justify-between items-center text-[9px] text-[#2e7d32] border-t border-[#1a3322] pt-0.5 mt-0.5">
        <span>PAPER ACCOUNT — NOT REAL MONEY</span>
        <span className="text-[#69f0ae]">Tap: Next Screen</span>
      </div>
    </div>
  );
};
