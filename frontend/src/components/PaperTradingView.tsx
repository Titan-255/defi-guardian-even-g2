import React, { useState, useEffect, useCallback } from 'react';
import { TradePreview, PaperPortfolio } from '../types';
import { api, ApiValidationError } from '../services/api';

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
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tradeStatus, setTradeStatus] = useState<string | null>(null);

  const loadPreview = useCallback(async (c: string, act: 'BUY' | 'SELL', amt: number) => {
    try {
      const res = await api.previewTrade(c, act, amt);
      setPreview(res);
      setPreviewError(null);
    } catch (err: any) {
      setPreview(null);
      setPreviewError(`Preview error: ${err.message}`);
    }
  }, []);

  // Load preview whenever coin, action, or amount changes
  useEffect(() => {
    let isCurrent = true;
    (async () => {
      try {
        const res = await api.previewTrade(coin, action, amount);
        if (isCurrent) {
          setPreview(res);
          setPreviewError(null);
        }
      } catch (err: any) {
        if (isCurrent) {
          setPreview(null);
          setPreviewError(`Preview error: ${err.message}`);
        }
      }
    })();
    return () => {
      isCurrent = false;
    };
  }, [coin, action, amount]);

  const handleConfirmTrade = async () => {
    if (!preview || !preview.valid || isSubmitting) return;

    setIsSubmitting(true);
    setTradeStatus('EXECUTING SIMULATED ORDER...');
    try {
      const res = await api.confirmTrade(
        coin,
        action,
        amount,
        preview.current_price,
        preview.preview_timestamp
      );
      if (res.success) {
        setPreviewError(null);
        setTradeStatus(`SUCCESS! ${action} ${res.quantity.toFixed(4)} ${coin}`);
        onTradeExecuted();
        loadPreview(coin, action, amount);
        setTimeout(() => setTradeStatus(null), 3000);
      }
    } catch (err: any) {
      if (err instanceof ApiValidationError && err.status === 409) {
        // Stale or drifted quote: refresh preview and require explicit re-confirmation
        setTradeStatus(err.message);
        await loadPreview(coin, action, amount);
        setTimeout(() => setTradeStatus(null), 4000);
      } else {
        setTradeStatus(`Failed: ${err.message}`);
        setTimeout(() => setTradeStatus(null), 3500);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const amounts = [25, 50, 100];
  const coins = ['BTC', 'ETH', 'SOL'];

  return (
    <div
      className="w-full h-full flex flex-col justify-between p-3 bg-black text-[#00e676] font-mono select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#1a3322] pb-1">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold tracking-widest text-[#69f0ae]">PAPER TRADING</span>
          <span className="text-[9px] bg-[#00441b] text-[#69f0ae] px-1 py-0.5 rounded">SIMULATOR</span>
        </div>
        <span className="text-[11px] text-[#81c784]">
          Cash: ${portfolio?.available_cash.toFixed(0) ?? '10,000'}
        </span>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-3 gap-1 my-1">
        {/* Coin Selector */}
        <div className="flex bg-[#050f08] border border-[#1a3322] rounded p-0.5" role="group" aria-label="Select asset">
          {coins.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCoin(c)}
              aria-pressed={coin === c}
              className={`flex-1 text-[10px] py-0.5 rounded transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00e676] ${
                coin === c ? 'bg-[#00e676] text-black font-bold' : 'text-[#81c784]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Action Selector */}
        <div className="flex bg-[#050f08] border border-[#1a3322] rounded p-0.5" role="group" aria-label="Select action">
          <button
            type="button"
            onClick={() => setAction('BUY')}
            aria-pressed={action === 'BUY'}
            className={`flex-1 text-[10px] py-0.5 rounded transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00e676] ${
              action === 'BUY' ? 'bg-[#00e676] text-black font-bold' : 'text-[#81c784]'
            }`}
          >
            BUY
          </button>
          <button
            type="button"
            onClick={() => setAction('SELL')}
            aria-pressed={action === 'SELL'}
            className={`flex-1 text-[10px] py-0.5 rounded transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00e676] ${
              action === 'SELL' ? 'bg-[#00e676] text-black font-bold' : 'text-[#81c784]'
            }`}
          >
            SELL
          </button>
        </div>

        {/* Amount Selector */}
        <div className="flex bg-[#050f08] border border-[#1a3322] rounded p-0.5" role="group" aria-label="Select amount">
          {amounts.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setAmount(amt)}
              aria-pressed={amount === amt}
              className={`flex-1 text-[10px] py-0.5 rounded transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00e676] ${
                amount === amt ? 'bg-[#00e676] text-black font-bold' : 'text-[#81c784]'
              }`}
            >
              ${amt}
            </button>
          ))}
        </div>
      </div>

      {/* Order Preview Box */}
      <div
        className="border border-[#1a3322] bg-[#050f08] p-2 rounded flex flex-col justify-between my-0.5"
        aria-live="polite"
      >
        {tradeStatus ? (
          <div className="text-center py-1.5 text-xs font-bold text-white hud-glow">
            {tradeStatus}
          </div>
        ) : previewError ? (
          <div className="text-center py-1.5 text-[11px] text-[#ff8a80]">
            {previewError}
          </div>
        ) : preview ? (
          <>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#81c784]">
                {action} {coin} @ ${preview.current_price.toLocaleString()}
              </span>
              <span className="text-white font-bold">
                Qty: {preview.calculated_quantity.toFixed(6)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-[#4caf50] mt-1 border-t border-[#1a3322] pt-1">
              <span>Cash after: ${preview.cash_after_trade.toFixed(2)}</span>
              <span>Holding after: {preview.holding_after_trade.toFixed(4)} {coin}</span>
            </div>
            {!preview.valid && (
              <div className="text-[10px] text-[#ff8a80] mt-0.5">
                {preview.error_message}
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-[11px] text-[#4caf50]">Loading price preview...</div>
        )}
      </div>

      {/* Confirmation Button */}
      <button
        type="button"
        onClick={handleConfirmTrade}
        disabled={!preview?.valid || isSubmitting}
        className={`w-full py-1.5 rounded text-xs font-bold tracking-wider transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#69f0ae] ${
          preview?.valid && !isSubmitting
            ? 'bg-[#00e676] text-black hover:bg-[#69f0ae] active:scale-[0.98]'
            : 'bg-[#1a3322] text-[#4caf50] cursor-not-allowed'
        }`}
      >
        {isSubmitting ? 'CONFIRMING...' : `CONFIRM ${action} $${amount} ${coin}`}
      </button>

      {/* Footer */}
      <div className="flex justify-between items-center text-[10px] text-[#4caf50] border-t border-[#1a3322] pt-0.5 mt-0.5">
        <span>PAPER ACCOUNT — NOT REAL MONEY</span>
        <span className="text-[#69f0ae]">Tap: Next Screen</span>
      </div>
    </div>
  );
};
