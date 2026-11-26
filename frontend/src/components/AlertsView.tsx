import React, { useState } from 'react';
import { PriceAlert, MarketOverview } from '../types';
import { api } from '../services/api';

interface Props {
  alerts: PriceAlert[];
  market: MarketOverview | null;
  onAlertsChanged: () => void;
}

const MAX_ALERT_PRICE = 10_000_000;

export const AlertsView: React.FC<Props> = ({ alerts, market, onAlertsChanged }) => {
  const [coin, setCoin] = useState('BTC');
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const showStatus = (text: string, isError = false) => {
    setAlertMsg({ text, isError });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = Number(targetPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0 || priceNum > MAX_ALERT_PRICE) {
      showStatus(`Enter a valid price between $0 and $${MAX_ALERT_PRICE.toLocaleString()}`, true);
      return;
    }

    try {
      await api.createAlert(coin, priceNum, condition);
      setTargetPrice('');
      setIsAdding(false);
      showStatus(`Alert saved: ${coin} ${condition} $${priceNum.toLocaleString()}`);
      onAlertsChanged();
    } catch (err: any) {
      showStatus(`Error creating alert: ${err.message}`, true);
    }
  };

  const handleDeleteAlert = async (id: number) => {
    try {
      await api.deleteAlert(id);
      showStatus('Alert removed');
      onAlertsChanged();
    } catch (err: any) {
      showStatus(`Delete failed: ${err.message}`, true);
    }
  };

  const coins = ['BTC', 'ETH', 'SOL'];
  const currentPrices = {
    BTC: market?.coins['BTC']?.price ?? 0,
    ETH: market?.coins['ETH']?.price ?? 0,
    SOL: market?.coins['SOL']?.price ?? 0,
  };

  const activeCount = alerts.filter((a) => a.is_active).length;

  return (
    <div
      className="w-full h-full flex flex-col justify-between p-3 bg-black text-[#00e676] font-mono select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#1a3322] pb-1">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold tracking-widest text-[#69f0ae]">PRICE ALERTS</span>
          <span className="text-[9px] bg-[#00441b] text-[#69f0ae] px-1.5 py-0.5 rounded">
            {activeCount} ACTIVE
          </span>
        </div>
        <button
          type="button"
          onClick={() => { setIsAdding(!isAdding); setAlertMsg(null); }}
          className="text-[10px] bg-[#050f08] border border-[#1a3322] px-2 py-0.5 rounded text-[#69f0ae] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00e676]"
        >
          {isAdding ? 'CANCEL' : '+ ADD ALERT'}
        </button>
      </div>

      {/* Inline Status / Error Banner */}
      {alertMsg && (
        <div
          role="status"
          aria-live="polite"
          className={`text-[10px] px-2 py-0.5 rounded mt-1 border ${
            alertMsg.isError
              ? 'bg-[#1a0505] border-[#ff8a80] text-[#ff8a80]'
              : 'bg-[#00240e] border-[#00e676] text-[#69f0ae]'
          }`}
        >
          {alertMsg.text}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto my-1 py-1 pr-1">
        {isAdding ? (
          <form onSubmit={handleCreateAlert} className="border border-[#1a3322] bg-[#050f08] p-2 rounded flex flex-col space-y-1.5">
            <div className="flex space-x-1">
              {coins.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCoin(c)}
                  className={`flex-1 text-[10px] py-0.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00e676] ${
                    coin === c ? 'bg-[#00e676] text-black font-bold' : 'border border-[#1a3322] text-[#81c784]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex space-x-1 text-[10px]">
              <button
                type="button"
                onClick={() => setCondition('ABOVE')}
                className={`flex-1 py-0.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00e676] ${
                  condition === 'ABOVE' ? 'bg-[#00e676] text-black font-bold' : 'border border-[#1a3322] text-[#81c784]'
                }`}
              >
                PRICE &gt;= TARGET
              </button>
              <button
                type="button"
                onClick={() => setCondition('BELOW')}
                className={`flex-1 py-0.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00e676] ${
                  condition === 'BELOW' ? 'bg-[#00e676] text-black font-bold' : 'border border-[#1a3322] text-[#81c784]'
                }`}
              >
                PRICE &lt;= TARGET
              </button>
            </div>

            <div className="flex space-x-1">
              <input
                type="number"
                step="any"
                min="0.000001"
                max={MAX_ALERT_PRICE}
                aria-label="Target price in USD"
                placeholder={`Current: $${currentPrices[coin as keyof typeof currentPrices]}`}
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="flex-1 bg-black border border-[#1a3322] rounded px-2 py-0.5 text-xs text-white placeholder-[#4caf50] focus:outline-none focus:border-[#00e676]"
                required
              />
              <button
                type="submit"
                className="bg-[#00e676] text-black text-[10px] font-bold px-3 py-0.5 rounded hover:bg-[#69f0ae] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#69f0ae]"
              >
                SAVE
              </button>
            </div>
          </form>
        ) : alerts.length > 0 ? (
          <div className="space-y-1">
            {alerts.map((a) => {
              const cur = currentPrices[a.coin as keyof typeof currentPrices] ?? 0;
              return (
                <div
                  key={a.id}
                  className={`flex justify-between items-center border px-2 py-1 rounded text-[11px] ${
                    a.is_active
                      ? 'border-[#1a3322] bg-[#050f08]'
                      : 'border-[#112417] bg-[#030905] opacity-80'
                  }`}
                >
                  <div>
                    <span className="font-bold text-white mr-1.5">{a.coin}</span>
                    <span className="text-[#81c784] mr-2">
                      {a.condition === 'ABOVE' ? '≥' : '≤'} ${a.target_price.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[#4caf50]">
                      (Now: ${cur.toLocaleString()})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!a.is_active || a.triggered_at ? (
                      <span className="text-[9px] bg-[#00441b] text-[#69f0ae] px-1 rounded">
                        {a.is_active ? 'TRIGGERED' : 'DONE'}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleDeleteAlert(a.id)}
                      aria-label={`Delete ${a.coin} ${a.condition} ${a.target_price} alert`}
                      className="text-[#81c784] hover:text-white text-sm px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00e676]"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-[11px] text-[#4caf50]">
            <span>No active price alerts</span>
            <span className="text-[10px] mt-0.5 text-[#81c784]">Tap + ADD ALERT to monitor a target price</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-[10px] text-[#4caf50] border-t border-[#1a3322] pt-1">
        <span>Evaluates on live Hyperliquid ticks</span>
        <span className="text-[#69f0ae]">Tap: Next Screen</span>
      </div>
    </div>
  );
};
