import React from 'react';
import { ScreenId } from '../types';

interface Props {
  activeScreen: ScreenId;
  children: React.ReactNode;
  onTap: () => void;
  onDoubleTap: () => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
}

export const GlassesHud: React.FC<Props> = ({
  activeScreen,
  children,
  onTap,
  onDoubleTap,
  onSwipeUp,
  onSwipeDown,
}) => {
  const screens: ScreenId[] = [
    'MARKET',
    'INTELLIGENCE',
    'PORTFOLIO',
    'ATTENTION',
    'TRADING',
    'ALERTS',
    'SETTINGS',
  ];
  const screenIndex = screens.indexOf(activeScreen) + 1;

  return (
    <div className="flex flex-col items-center w-full max-w-[604px]">
      {/* Glasses Frame Bezel Simulation */}
      <div className="relative w-full p-3 bg-[#0d140f] border-2 border-[#1a3322] rounded-2xl shadow-2xl hud-box-glow">
        {/* Device Status Header Bar on Glasses frame */}
        <div className="flex justify-between items-center px-2 pb-1.5 text-[11px] text-[#4caf50] font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-pulse"></span>
            <span className="font-bold text-[#69f0ae]">EVEN REALITIES G2</span>
            <span className="text-[#4caf50]">|</span>
            <span>576 × 288px</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>HUD {screenIndex}/{screens.length}</span>
            <span className="text-[#00e676]" aria-label="Battery 100%">100% 🔋</span>
          </div>
        </div>

        {/* 576 x 288 Optical Display Canvas (responsive max-w-[576px] on narrow phones) */}
        <div
          id="evenhub-g2-canvas"
          className="relative w-full max-w-[576px] min-h-[288px] mx-auto bg-black border border-[#173722] overflow-hidden shadow-inner flex flex-col cursor-pointer select-none"
          onClick={onTap}
          onDoubleClick={onDoubleTap}
          title="G2 Display — Tap to cycle screens, Double-tap to exit"
        >
          {/* Green scanline & vignette optical filter */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black opacity-40 z-10"></div>
          <div className="relative z-20 w-full flex-1 flex flex-col">
            {children}
          </div>
        </div>

        {/* Touch Gestures Simulation Bar */}
        <div className="mt-2 pt-2 border-t border-[#1a3322] flex flex-wrap gap-2 justify-between items-center text-[11px] text-[#81c784] font-mono">
          <span className="text-[#4caf50]">Touch Bar:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onTap(); }}
              className="bg-[#050f08] border border-[#1a3322] hover:border-[#00e676] px-2 py-0.5 rounded transition text-[#69f0ae] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00e676]"
            >
              Single Tap (Next)
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSwipeDown(); }}
              className="bg-[#050f08] border border-[#1a3322] hover:border-[#00e676] px-2 py-0.5 rounded transition text-[#69f0ae] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00e676]"
            >
              Swipe Down (Prev)
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSwipeUp(); }}
              className="bg-[#050f08] border border-[#1a3322] hover:border-[#00e676] px-2 py-0.5 rounded transition text-[#69f0ae] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00e676]"
            >
              Swipe Up (Next)
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDoubleTap(); }}
              className="bg-[#1a3322] hover:bg-[#ff8a80] hover:text-black px-2 py-0.5 rounded transition text-[#e8f5e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00e676]"
            >
              Double Tap (Exit)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
