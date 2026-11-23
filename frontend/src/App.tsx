import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScreenId,
  MarketOverview,
  IntelligenceData,
  PaperPortfolio,
  TradeRecord,
  PriceAlert,
  PublicWallet,
  BackendHealth
} from './types';
import { api } from './services/api';
import { evenBridge } from './services/evenBridge';
import { GlassesHud } from './components/GlassesHud';
import { CompanionView } from './components/CompanionView';
import { MarketGlance } from './components/MarketGlance';
import { AiInsight } from './components/AiInsight';
import { PortfolioView } from './components/PortfolioView';
import { MarketAttention } from './components/MarketAttention';
import { PaperTradingView } from './components/PaperTradingView';
import { AlertsView } from './components/AlertsView';
import { SettingsView } from './components/SettingsView';

const SCREENS: ScreenId[] = [
  'MARKET',
  'INTELLIGENCE',
  'PORTFOLIO',
  'ATTENTION',
  'TRADING',
  'ALERTS',
  'SETTINGS',
];

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('MARKET');
  const [selectedCoin, setSelectedCoin] = useState<string>('BTC');
  const [portfolioMode, setPortfolioMode] = useState<'PAPER' | 'PUBLIC'>('PAPER');

  // Backend state
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [market, setMarket] = useState<MarketOverview | null>(null);
  const [intel, setIntel] = useState<IntelligenceData | null>(null);
  const [portfolio, setPortfolio] = useState<PaperPortfolio | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [wallet, setWallet] = useState<PublicWallet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBridgeActive, setIsBridgeActive] = useState<boolean>(false);
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  // Ref to track activeScreen inside callbacks without stale closures
  const activeScreenRef = useRef(activeScreen);
  activeScreenRef.current = activeScreen;

  // 1. Fetch data functions
  const fetchMarketData = useCallback(async () => {
    try {
      const m = await api.getMarket();
      setMarket(m);
    } catch (e) {
      console.warn('Failed to fetch market data:', e);
    }
  }, []);

  const fetchIntelligence = useCallback(async (coin: string) => {
    try {
      const i = await api.getIntelligence(coin);
      setIntel(i);
    } catch (e) {
      console.warn('Failed to fetch intelligence data:', e);
    }
  }, []);

  const fetchPortfolioAndTrades = useCallback(async () => {
    try {
      const [p, t, w] = await Promise.all([
        api.getPortfolio(),
        api.getTrades(),
        api.getWallet(),
      ]);
      setPortfolio(p);
      setTrades(t);
      setWallet(w);
    } catch (e) {
      console.warn('Failed to fetch portfolio data:', e);
    }
  }, []);

  const fetchAlertsAndCheck = useCallback(async () => {
    try {
      const a = await api.getAlerts();
      setAlerts(a);
      // Check triggers
      const checkRes = await api.checkAlerts();
      if (checkRes.triggered_count > 0) {
        const top = checkRes.triggered_alerts[0];
        setLastNotification(`ALERT: ${top.coin} reached $${top.target_price}!`);
        setTimeout(() => setLastNotification(null), 4000);
      }
    } catch (e) {
      console.warn('Failed to fetch/check alerts:', e);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const h = await api.getHealth();
      setHealth(h);
      await Promise.all([
        fetchMarketData(),
        fetchIntelligence(selectedCoin),
        fetchPortfolioAndTrades(),
        fetchAlertsAndCheck(),
      ]);
    } catch (err) {
      console.error('Refresh all error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchMarketData, fetchIntelligence, selectedCoin, fetchPortfolioAndTrades, fetchAlertsAndCheck]);

  // Initial load
  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      fetchMarketData();
      fetchAlertsAndCheck();
    }, 6000);
    return () => clearInterval(interval);
  }, [refreshAll, fetchMarketData, fetchAlertsAndCheck]);

  // Whenever selectedCoin changes, refresh intelligence
  useEffect(() => {
    fetchIntelligence(selectedCoin);
  }, [selectedCoin, fetchIntelligence]);

  // Screen navigation handlers
  const handleNextScreen = useCallback(() => {
    const curIdx = SCREENS.indexOf(activeScreenRef.current);
    const nextIdx = (curIdx + 1) % SCREENS.length;
    setActiveScreen(SCREENS[nextIdx]);
  }, []);

  const handlePrevScreen = useCallback(() => {
    const curIdx = SCREENS.indexOf(activeScreenRef.current);
    const prevIdx = (curIdx - 1 + SCREENS.length) % SCREENS.length;
    setActiveScreen(SCREENS[prevIdx]);
  }, []);

  const handleDoubleTap = useCallback(() => {
    setLastNotification('Double-Tap: Application Exit Event');
    setTimeout(() => setLastNotification(null), 2500);
  }, []);

  // 2. Initialize Even Hub SDK Bridge
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    (async () => {
      const active = await evenBridge.initialize();
      setIsBridgeActive(active);

      unsubscribe = evenBridge.subscribe((type) => {
        if (type === 'CLICK') {
          handleNextScreen();
        } else if (type === 'SCROLL_DOWN') {
          handleNextScreen();
        } else if (type === 'SCROLL_UP') {
          handlePrevScreen();
        } else if (type === 'DOUBLE_CLICK') {
          handleDoubleTap();
        }
      });
    })();

    return () => {
      if (unsubscribe) unsubscribe();
      evenBridge.cleanup();
    };
  }, [handleNextScreen, handlePrevScreen, handleDoubleTap]);

  // 3. Update Even Hub SDK Display Text Containers
  useEffect(() => {
    if (!isBridgeActive) return;

    // Generate formatted plain-text representation for G2 Text Containers
    let mainText = '';
    const screenTitle = SCREENS.indexOf(activeScreen) + 1;

    switch (activeScreen) {
      case 'MARKET': {
        const btc = market?.coins['BTC']?.price ?? 0;
        const eth = market?.coins['ETH']?.price ?? 0;
        const sol = market?.coins['SOL']?.price ?? 0;
        mainText = `DEFI GUARDIAN · LIVE MARKET\n\nBTC: $${btc.toLocaleString()}\nETH: $${eth.toLocaleString()}\nSOL: $${sol.toFixed(2)}\n\nSource: Hyperliquid Mids`;
        break;
      }
      case 'INTELLIGENCE': {
        mainText = `AI MARKET INTELLIGENCE [${selectedCoin}]\n\nStatus: ${intel?.classification ?? 'ANALYZING'}\nScore: ${intel?.anomaly_score ?? 0}/100\n\n"${intel?.explanation ?? ''}"`;
        break;
      }
      case 'PORTFOLIO': {
        mainText = `PAPER PORTFOLIO\n\nTotal: $${portfolio?.total_portfolio_value.toFixed(2) ?? '10000.00'}\nCash:  $${portfolio?.available_cash.toFixed(2) ?? '10000.00'}\nP&L:   ${portfolio && portfolio.total_pnl >= 0 ? '+' : ''}$${portfolio?.total_pnl.toFixed(2) ?? '0.00'}\n\nPaper Account - Not Real Funds`;
        break;
      }
      case 'ATTENTION': {
        mainText = `MARKET ATTENTION [${selectedCoin}]\n\n${intel?.is_anomaly ? 'UNUSUAL ACTIVITY DETECTED' : 'NORMAL MARKET CONDITIONS'}\n\nObserved: ${intel?.contributing_factors[0] ?? 'Within baseline bounds'}`;
        break;
      }
      case 'TRADING': {
        mainText = `PAPER TRADING [${selectedCoin}]\n\nSimulate BUY/SELL without risk.\nAvailable Cash: $${portfolio?.available_cash.toFixed(2) ?? '10000.00'}\n\nConfirm order via Companion`;
        break;
      }
      case 'ALERTS': {
        mainText = `PRICE ALERTS\n\nActive: ${alerts.length}\n${alerts.slice(0, 2).map((a) => `${a.coin} ${a.condition} $${a.target_price}`).join('\n')}`;
        break;
      }
      case 'SETTINGS': {
        mainText = `DEFI GUARDIAN SETTINGS\n\nBackend: ONLINE\nHyperliquid: ${health?.hyperliquid_connected ? 'CONNECTED' : 'DISCONNECTED'}\nML Engine: READY\nDatabase: PERSISTED`;
        break;
      }
    }

    const navText = `Screen ${screenTitle}/7 · Tap: Next · Double-Tap: Exit`;
    evenBridge.updateDisplay(mainText, navText);
  }, [activeScreen, selectedCoin, market, intel, portfolio, alerts, health, isBridgeActive]);

  // Keyboard navigation for desktop browser / simulator
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNextScreen();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevScreen();
      } else if (e.key === 'Escape') {
        handleDoubleTap();
      } else if (['1', '2', '3', '4', '5', '6', '7'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        setActiveScreen(SCREENS[idx]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextScreen, handlePrevScreen, handleDoubleTap]);

  return (
    <div className="min-h-screen bg-[#050806] text-[#e0f2e9] p-4 flex flex-col items-center justify-between font-mono">
      {/* Top Brand Banner */}
      <header className="w-full max-w-4xl flex justify-between items-center py-2 mb-3 border-b border-[#112417]">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00e676] hud-glow"></span>
          <h1 className="text-sm font-bold tracking-widest text-[#00e676]">
            DEFI GUARDIAN
          </h1>
          <span className="text-[10px] text-[#2e7d32] border border-[#1a3322] px-1.5 py-0.5 rounded">
            Even Realities G2
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px] text-[#81c784]">
          <span>Track: Crypto & DeFi</span>
          <span className="text-[#2e7d32]">|</span>
          <span className={health?.hyperliquid_connected ? 'text-[#00e676]' : 'text-[#ff8a80]'}>
            ● {health?.hyperliquid_connected ? 'Live API' : 'Offline'}
          </span>
        </div>
      </header>

      {/* Floating Alert Notification Toast */}
      {lastNotification && (
        <div className="fixed top-12 z-50 bg-[#00441b] border border-[#00e676] text-white px-4 py-1.5 rounded-full text-xs font-bold hud-box-glow animate-bounce">
          {lastNotification}
        </div>
      )}

      {/* Main Container: G2 Glasses HUD Display */}
      <main className="w-full max-w-4xl flex flex-col items-center space-y-5">
        <GlassesHud
          activeScreen={activeScreen}
          onTap={handleNextScreen}
          onDoubleTap={handleDoubleTap}
          onSwipeUp={handleNextScreen}
          onSwipeDown={handlePrevScreen}
        >
          {activeScreen === 'MARKET' && (
            <MarketGlance
              market={market}
              isLoading={isLoading}
              onRefresh={fetchMarketData}
            />
          )}

          {activeScreen === 'INTELLIGENCE' && (
            <AiInsight
              intel={intel}
              selectedCoin={selectedCoin}
              onSelectCoin={setSelectedCoin}
              isLoading={isLoading}
            />
          )}

          {activeScreen === 'PORTFOLIO' && (
            <PortfolioView
              portfolio={portfolio}
              wallet={wallet}
              mode={portfolioMode}
              onToggleMode={() => setPortfolioMode(portfolioMode === 'PAPER' ? 'PUBLIC' : 'PAPER')}
              isLoading={isLoading}
            />
          )}

          {activeScreen === 'ATTENTION' && (
            <MarketAttention
              intel={intel}
              selectedCoin={selectedCoin}
            />
          )}

          {activeScreen === 'TRADING' && (
            <PaperTradingView
              portfolio={portfolio}
              defaultCoin={selectedCoin}
              onTradeExecuted={fetchPortfolioAndTrades}
            />
          )}

          {activeScreen === 'ALERTS' && (
            <AlertsView
              alerts={alerts}
              market={market}
              onAlertsChanged={fetchAlertsAndCheck}
            />
          )}

          {activeScreen === 'SETTINGS' && (
            <SettingsView
              health={health}
              wallet={wallet}
              onRefreshAll={refreshAll}
            />
          )}
        </GlassesHud>

        {/* Companion Control View below the glasses */}
        <CompanionView
          activeScreen={activeScreen}
          onSelectScreen={setActiveScreen}
          market={market}
          intel={intel}
          portfolio={portfolio}
          trades={trades}
          alerts={alerts}
          wallet={wallet}
          health={health}
          isBridgeActive={isBridgeActive}
          onRefreshAll={refreshAll}
        />
      </main>

      {/* Bottom Footer */}
      <footer className="w-full max-w-4xl text-center text-[10px] text-[#2e7d32] py-4 border-t border-[#112417] mt-4">
        DeFi Guardian · Heads Up: Even Realities Hackathon · Non-custodial Educational Crypto Intelligence
      </footer>
    </div>
  );
};
