import React from 'react';
import { IntelligenceData } from '../types';

interface Props {
  intel: IntelligenceData | null;
  selectedCoin: string;
}

export const MarketAttention: React.FC<Props> = ({ intel, selectedCoin }) => {
  const isAnomaly = intel?.is_anomaly ?? false;

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 bg-black text-[#00e676] font-mono select-none">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#1a3322] pb-1">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold tracking-widest text-[#69f0ae]">MARKET ATTENTION</span>
        </div>
        <span className="text-[10px] text-[#4caf50]">DEFI GUARDIAN</span>
      </div>

      {/* Main Alert Card */}
      <div className={`flex-1 flex flex-col justify-center my-1 p-2 rounded border ${
        isAnomaly ? 'border-[#00e676] bg-[#00240e]' : 'border-[#1a3322] bg-[#050f08]'
      }`}>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold text-white tracking-wider">{selectedCoin} ALERT</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            isAnomaly ? 'bg-[#00e676] text-black' : 'bg-[#050f08] text-[#81c784] border border-[#1a3322]'
          }`}>
            {intel ? (isAnomaly ? 'UNUSUAL ACTIVITY' : intel.classification) : 'UNAVAILABLE'}
          </span>
        </div>

        <div className="text-[11px] text-[#e8f5e9] my-1 leading-snug">
          {intel?.explanation ?? 'Monitoring live market candles for statistical deviations.'}
        </div>

        <div className="text-[10px] text-[#81c784] border-t border-[#1a3322] pt-1 mt-1">
          <div className="font-bold text-[#b9f6ca] mb-0.5">Primary Observation:</div>
          {intel?.contributing_factors && intel.contributing_factors.length > 0 ? (
            intel.contributing_factors.slice(0, 2).map((factor, idx) => (
              <div key={idx} className="truncate">• {factor}</div>
            ))
          ) : (
            <div>• Statistical properties within recent historical bounds</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-[10px] text-[#4caf50] border-t border-[#1a3322] pt-1">
        <span className="truncate pr-2">Source: {intel?.source ?? 'Hyperliquid API'}</span>
        <span className="text-[#69f0ae] shrink-0">Tap: Next Screen</span>
      </div>
    </div>
  );
};
