import React, { useState } from 'react';
import { BackendHealth, PublicWallet, OperatingMode } from '../types';
import { api } from '../services/api';

interface Props {
  health: BackendHealth | null;
  wallet: PublicWallet | null;
  operatingMode: OperatingMode;
  onRefreshAll: () => void;
}

const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export const SettingsView: React.FC<Props> = ({ health, wallet, operatingMode, onRefreshAll }) => {
  const [addressInput, setAddressInput] = useState(wallet?.address || '');
  const [walletMsg, setWalletMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const handleSaveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = addressInput.trim();
    if (!ETH_ADDRESS_RE.test(trimmed)) {
      setWalletMsg({
        text: 'Invalid address: must be 0x followed by 40 hex characters.',
        isError: true,
      });
      return;
    }

    try {
      const res = await api.configureWallet(trimmed);
      setWalletMsg({ text: res.message, isError: false });
      onRefreshAll();
      setTimeout(() => setWalletMsg(null), 3000);
    } catch (err: any) {
      setWalletMsg({ text: `Error: ${err.message}`, isError: true });
    }
  };

  const handleClearWallet = async () => {
    try {
      await api.clearWallet();
      setAddressInput('');
      setWalletMsg({ text: 'Public wallet cleared', isError: false });
      onRefreshAll();
      setTimeout(() => setWalletMsg(null), 3000);
    } catch (err: any) {
      setWalletMsg({ text: `Error: ${err.message}`, isError: true });
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

  const backendLabel =
    operatingMode === 'BACKEND'
      ? (health?.status === 'operational' ? 'ONLINE' : 'DEGRADED')
      : operatingMode === 'CLOUD_EDGE'
        ? 'CLOUD EDGE'
        : 'OFFLINE';

  const mlLabel =
    operatingMode === 'OFFLINE' || !health?.ml_engine_ready
      ? 'UNAVAILABLE'
      : operatingMode === 'BACKEND'
        ? 'ISOLATION FOREST'
        : 'RULE-BASED (CLOUD)';

  const storageLabel =
    operatingMode === 'OFFLINE' || !health?.database_ready
      ? 'UNAVAILABLE'
      : operatingMode === 'BACKEND'
        ? 'SQLITE (BACKEND)'
        : 'BROWSER STORAGE';

  return (
    <div
      className="w-full h-full flex flex-col justify-between p-3 bg-black text-[#00e676] font-mono select-none overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#1a3322] pb-1">
        <span className="text-[11px] font-bold tracking-widest text-[#69f0ae]">SYSTEM & SETTINGS</span>
        <span className="text-[10px] text-[#4caf50]">v1.0.0</span>
      </div>

      {/* Genuine Health Grid */}
      <div className="grid grid-cols-2 gap-1 my-1 text-[10px]">
        <div className="border border-[#1a3322] bg-[#050f08] p-1.5 rounded flex items-center justify-between">
          <span className="text-[#81c784]">HYPERLIQUID:</span>
          <span className={`font-bold ${health?.hyperliquid_connected ? 'text-[#00e676]' : 'text-[#ff8a80]'}`}>
            {health ? (health.hyperliquid_connected ? 'LIVE' : 'OFFLINE') : 'CHECKING'}
          </span>
        </div>
        <div className="border border-[#1a3322] bg-[#050f08] p-1.5 rounded flex items-center justify-between">
          <span className="text-[#81c784]">MODE:</span>
          <span
            className={`font-bold ${
              operatingMode === 'BACKEND'
                ? 'text-[#00e676]'
                : operatingMode === 'CLOUD_EDGE'
                  ? 'text-[#69f0ae]'
                  : 'text-[#ff8a80]'
            }`}
          >
            {backendLabel}
          </span>
        </div>
        <div className="border border-[#1a3322] bg-[#050f08] p-1.5 rounded flex items-center justify-between">
          <span className="text-[#81c784]">DETECTOR:</span>
          <span className={`font-bold ${health?.ml_engine_ready ? 'text-[#00e676]' : 'text-[#ff8a80]'}`}>
            {mlLabel}
          </span>
        </div>
        <div className="border border-[#1a3322] bg-[#050f08] p-1.5 rounded flex items-center justify-between">
          <span className="text-[#81c784]">STORAGE:</span>
          <span className={`font-bold ${health?.database_ready ? 'text-[#00e676]' : 'text-[#ff8a80]'}`}>
            {storageLabel}
          </span>
        </div>
      </div>

      {/* Public Wallet Settings */}
      <div className="border border-[#1a3322] bg-[#050f08] p-1.5 rounded text-[10px] my-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[#b9f6ca] font-bold">READ-ONLY PUBLIC WALLET</span>
          {wallet?.is_configured && (
            <button
              type="button"
              onClick={handleClearWallet}
              className="text-[#ff8a80] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff8a80]"
            >
              Disconnect
            </button>
          )}
        </div>
        <form onSubmit={handleSaveWallet} className="flex space-x-1">
          <input
            type="text"
            aria-label="Read-only public Hyperliquid wallet address"
            placeholder="0x... (42-char Hyperliquid address)"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            className="flex-1 bg-black border border-[#1a3322] rounded px-1.5 py-0.5 text-[10px] text-white placeholder-[#4caf50] focus:outline-none focus:border-[#00e676]"
          />
          <button
            type="submit"
            className="bg-[#00e676] text-black font-bold px-2 py-0.5 rounded text-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#69f0ae]"
          >
            SET
          </button>
        </form>
        {walletMsg && (
          <div
            role="status"
            aria-live="polite"
            className={`text-[9px] mt-0.5 ${walletMsg.isError ? 'text-[#ff8a80]' : 'text-[#69f0ae]'}`}
          >
            {walletMsg.text}
          </div>
        )}
      </div>

      {/* Reset & Safety */}
      <div className="border border-[#1a3322] bg-[#050f08] p-1.5 rounded text-[9px] space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[#81c784]">Demo Paper Trading Reset:</span>
          <button
            type="button"
            onClick={handleResetDemo}
            className="bg-[#1a3322] text-[#69f0ae] hover:bg-[#255a36] px-2 py-0.5 rounded text-[9px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00e676]"
          >
            RESET TO $10K
          </button>
        </div>
        {resetMsg && (
          <div role="status" aria-live="polite" className="text-[#69f0ae]">
            {resetMsg}
          </div>
        )}
        <div className="text-[#4caf50] leading-tight pt-0.5">
          Market information is provided for educational and informational purposes only. DeFi Guardian does not provide financial advice or execute real-money transactions.
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center text-[10px] text-[#4caf50] border-t border-[#1a3322] pt-1 mt-1">
        <span>Even Realities G2 Heads-Up Display</span>
        <span className="text-[#69f0ae]">Tap: Screen 1</span>
      </div>
    </div>
  );
};
