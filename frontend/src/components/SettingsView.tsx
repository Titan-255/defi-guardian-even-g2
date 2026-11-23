import React, { useState } from 'react';
import { BackendHealth, PublicWallet } from '../types';
import { api } from '../services/api';

interface Props {
  health: BackendHealth | null;
  wallet: PublicWallet | null;
  onRefreshAll: () => void;
}

export const SettingsView: React.FC<Props> = ({ health, wallet, onRefreshAll }) => {
  const [addressInput, setAddressInput] = useState(wallet?.address || '');
  const [walletMsg, setWalletMsg] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const handleSaveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;
    try {
      const res = await api.configureWallet(addressInput.trim());
      setWalletMsg(res.message);
      onRefreshAll();
      setTimeout(() => setWalletMsg(null), 3000);
    } catch (err: any) {
      setWalletMsg(`Error: ${err.message}`);
    }
  };

  const handleClearWallet = async () => {
    try {
      await api.clearWallet();
      setAddressInput('');
      setWalletMsg('Public wallet cleared');
      onRefreshAll();
      setTimeout(() => setWalletMsg(null), 3000);
    } catch (err: any) {
      setWalletMsg(`Error: ${err.message}`);
    }
  };

  const handleResetDemo = async () => {
    if (confirm('Reset paper account to initial $10,000 cash and wipe simulated trades?')) {
      try {
        const res = await api.resetDemo();
        setResetMsg(res.message);
        onRefreshAll();
        setTimeout(() => setResetMsg(null), 3000);
      } catch (err: any) {
        setResetMsg(`Reset failed: ${err.message}`);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 bg-black text-[#00e676] font-mono select-none overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#1a3322] pb-1">
        <span className="text-[11px] font-bold tracking-widest text-[#69f0ae]">SYSTEM & SETTINGS</span>
        <span className="text-[9px] text-[#2e7d32]">v1.0.0</span>
      </div>

      {/* Health Grid */}
      <div className="grid grid-cols-2 gap-1 my-1 text-[9px]">
        <div className="border border-[#1a3322] bg-[#050f08] p-1.5 rounded flex items-center justify-between">
          <span className="text-[#81c784]">HYPERLIQUID:</span>
          <span className={`font-bold ${health?.hyperliquid_connected ? 'text-[#00e676]' : 'text-[#ff8a80]'}`}>
            {health?.hyperliquid_connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        <div className="border border-[#1a3322] bg-[#050f08] p-1.5 rounded flex items-center justify-between">
          <span className="text-[#81c784]">BACKEND:</span>
          <span className={`font-bold ${health?.status === 'operational' ? 'text-[#00e676]' : 'text-[#ffb74d]'}`}>
            {health?.status === 'operational' ? 'ONLINE' : 'DEGRADED'}
          </span>
        </div>
        <div className="border border-[#1a3322] bg-[#050f08] p-1.5 rounded flex items-center justify-between">
          <span className="text-[#81c784]">ML ENGINE:</span>
          <span className="text-[#00e676] font-bold">READY (Local)</span>
        </div>
        <div className="border border-[#1a3322] bg-[#050f08] p-1.5 rounded flex items-center justify-between">
          <span className="text-[#81c784]">SQLITE DB:</span>
          <span className="text-[#00e676] font-bold">PERSISTED</span>
        </div>
      </div>

      {/* Public Wallet Settings */}
      <div className="border border-[#1a3322] bg-[#050f08] p-1.5 rounded text-[9px] my-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[#b9f6ca] font-bold">READ-ONLY PUBLIC WALLET</span>
          {wallet?.is_configured && (
            <button onClick={handleClearWallet} className="text-[#ff8a80] underline">
              Disconnect
            </button>
          )}
        </div>
        <form onSubmit={handleSaveWallet} className="flex space-x-1">
          <input
            type="text"
            placeholder="0x... (Hyperliquid address)"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            className="flex-1 bg-black border border-[#1a3322] rounded px-1.5 py-0.5 text-[9px] text-white placeholder-[#2e7d32] focus:outline-none focus:border-[#00e676]"
          />
          <button
            type="submit"
            className="bg-[#00e676] text-black font-bold px-2 py-0.5 rounded text-[8px]"
          >
            SET
          </button>
        </form>
        {walletMsg && <div className="text-[8px] text-[#69f0ae] mt-0.5">{walletMsg}</div>}
      </div>

      {/* Reset & Safety */}
      <div className="border border-[#1a3322] bg-[#050f08] p-1.5 rounded text-[8px] space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[#81c784]">Demo Paper Trading Reset:</span>
          <button
            onClick={handleResetDemo}
            className="bg-[#1a3322] text-[#69f0ae] hover:bg-[#255a36] px-2 py-0.5 rounded text-[8px]"
          >
            RESET TO $10K
          </button>
        </div>
        {resetMsg && <div className="text-[#69f0ae]">{resetMsg}</div>}
        <div className="text-[#2e7d32] leading-tight pt-0.5">
          Disclaimer: DeFi Guardian does not provide financial advice or execute real blockchain transactions. Non-custodial educational software.
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-[9px] text-[#2e7d32] border-t border-[#1a3322] pt-1 mt-1">
        <span>Even Realities G2 Heads-Up Display</span>
        <span className="text-[#69f0ae]">Tap: Screen 1</span>
      </div>
    </div>
  );
};
