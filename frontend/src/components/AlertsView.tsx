import React, { useState } from 'react';
import { PriceAlert, MarketOverview } from '../types';
import { api } from '../services/api';

interface Props {
  alerts: PriceAlert[];
  market: MarketOverview | null;
  onAlertsChanged: () => void;
}

export const AlertsView: React.FC<Props> = ({ alerts, market, onAlertsChanged }) => {
  const [coin, setCoin] = useState('BTC');
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(targetPrice);
    if (!priceNum || priceNum <= 0) return;

    try {
      await api.createAlert(coin, priceNum, condition);
      setTargetPrice('');
      setIsAdding(false);
      onAlertsChanged();
    } catch (err: any) {
      alert(`Error creating alert: ${err.message}`);
    }
  };

  const handleDeleteAlert = async (id: number) => {
    try {
      await api.deleteAlert(id);
      onAlertsChanged();
    } catch (err: any) {
      console.error('Delete alert failed:', err);
    }
  };

  const coins = ['BTC', 'ETH', 'SOL'];
  const currentPrices = {
    BTC: market?.coins['BTC']?.price ?? 0,
    ETH: market?.coins['ETH']?.price ?? 0,
    SOL: market?.coins['SOL']?.price ?? 0,
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 bg-black text-[#00e676] font-mono select-none">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#1a3322] pb-1">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold tracking-widest text-[#69f0ae]">PRICE ALERTS</span>
          <span className="text-[8px] bg-[#00441b] text-[#69f0ae] px-1 py-0.5 rounded">
            {alerts.length} ACTIVE
          </span>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-[9px] bg-[#050f08] border border-[#1a3322] px-1.5 py-0.5 rounded text-[#69f0ae]"
        >
          {isAdding ? 'CANCEL' : '+ ADD ALERT'}
        </button>
      </div>

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
                  className={`flex-1 text-[9px] py-0.5 rounded ${
                    coin === c ? 'bg-[#00e676] text-black font-bold' : 'border border-[#1a3322] text-[#81c784]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex space-x-1 text-[9px]">
              <button
                type="button"
                onClick={() => setCondition('ABOVE')}
                className={`flex-1 py-0.5 rounded ${
                  condition === 'ABOVE' ? 'bg-[#00e676] text-black font-bold' : 'border border-[#1a3322] text-[#81c784]'
                }`}
              >
                PRICE &gt;= TARGET
              </button>
              <button
                type="button"
                onClick={() => setCondition('BELOW')}
                className={`flex-1 py-0.5 rounded ${
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
                placeholder={`Current: $${currentPrices[coin as keyof typeof currentPrices]}`}
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="flex-1 bg-black border border-[#1a3322] rounded px-2 py-0.5 text-xs text-white placeholder-[#2e7d32] focus:outline-none focus:border-[#00e676]"
                required
              />
              <button
                type="submit"
                className="bg-[#00e676] text-black text-[10px] font-bold px-3 py-0.5 rounded hover:bg-[#69f0ae]"
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
                <div key={a.id} className="flex justify-between items-center border border-[#1a3322] bg-[#050f08] px-2 py-1 rounded text-[10px]">
                  <div>
                    <span className="font-bold text-white mr-1.5">{a.coin}</span>
                    <span className="text-[#81c784] mr-2">
                      {a.condition === 'ABOVE' ? '≥' : '≤'} ${a.target_price.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-[#2e7d32]">
                      (Now: ${cur.toLocaleString()})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {a.triggered_at && (
                      <span className="text-[8px] bg-[#00441b] text-[#69f0ae] px-1 rounded">TRIGGERED</span>
                    )}
                    <button
                      onClick={() => handleDeleteAlert(a.id)}
                      className="text-[#81c784] hover:text-white text-xs px-1"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-[10px] text-[#2e7d32]">
            <span>No active price alerts</span>
            <span className="text-[9px] mt-0.5 text-[#81c784]">Tap + ADD ALERT to monitor a target price</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-[9px] text-[#2e7d32] border-t border-[#1a3322] pt-1">
        <span>Evaluates on live Hyperliquid ticks</span>
        <span className="text-[#69f0ae]">Tap: Next Screen</span>
      </div>
    </div>
  );
};
