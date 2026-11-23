import React from 'react';
import { IntelligenceData } from '../types';

interface Props {
  intel: IntelligenceData | null;
  selectedCoin: string;
  onSelectCoin: (coin: string) => void;
  isLoading: boolean;
}

export const AiInsight: React.FC<Props> = ({ intel, selectedCoin, onSelectCoin, isLoading }) => {
  const coins = ['BTC', 'ETH', 'SOL'];

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 bg-black text-[#00e676] font-mono select-none">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#1a3322] pb-1">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold tracking-widest text-[#69f0ae]">AI MARKET INTELLIGENCE</span>
        </div>
        {/* Coin Selector */}
        <div className="flex space-x-1">
          {coins.map((c) => (
            <button
              key={c}
              onClick={() => onSelectCoin(c)}
              className={`text-[9px] px-1.5 py-0.5 rounded transition ${
                selectedCoin === c ? 'bg-[#00e676] text-black font-bold' : 'bg-[#050f08] text-[#2e7d32] border border-[#1a3322]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[#2e7d32] animate-pulse">
          EVALUATING ISOLATION FOREST ON {selectedCoin}...
        </div>
      ) : intel ? (
        <div className="flex-1 flex flex-col justify-center py-1">
          {/* Status Badge & Anomaly Score */}
          <div className="flex justify-between items-center mb-1">
            <span
              className={`text-xs px-2 py-0.5 rounded font-bold ${
                intel.is_anomaly
                  ? 'bg-[#00441b] text-[#b9f6ca] border border-[#00e676]'
                  : 'bg-[#050f08] text-[#81c784] border border-[#1a3322]'
              }`}
            >
              {intel.classification}
            </span>
            <span className="text-[11px] text-[#81c784]">
              Anomaly Score: <span className="text-white font-bold">{intel.anomaly_score}</span>/100
            </span>
          </div>

          {/* Explanation Text */}
          <div className="text-[11px] text-[#e8f5e9] bg-[#050f08] border border-[#1a3322] p-2 rounded leading-snug my-1">
            "{intel.explanation}"
          </div>

          {/* Key Feature Metrics */}
          <div className="grid grid-cols-3 gap-1 text-[9px] text-[#81c784]">
            <div className="bg-[#050f08] p-1 border border-[#1a3322] rounded">
              <span>1h Return: </span>
              <span className="font-bold text-[#b9f6ca]">{intel.features.return_1h_pct ?? 0}%</span>
            </div>
            <div className="bg-[#050f08] p-1 border border-[#1a3322] rounded">
              <span>Rel Vol: </span>
              <span className="font-bold text-[#b9f6ca]">{intel.features.relative_volume ?? 1}x</span>
            </div>
            <div className="bg-[#050f08] p-1 border border-[#1a3322] rounded">
              <span>Range: </span>
              <span className="font-bold text-[#b9f6ca]">{intel.features.candle_range_pct ?? 0}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-[#2e7d32]">
          No intelligence data available
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center text-[10px] text-[#2e7d32] border-t border-[#1a3322] pt-1">
        <span>Candle: {intel?.candle_time ? new Date(intel.candle_time).toLocaleTimeString() : '---'}</span>
        <span className="text-[#69f0ae]">Tap: Next Screen</span>
      </div>
    </div>
  );
};
