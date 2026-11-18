import React from 'react';
import { BookOpen, Search, UtensilsCrossed, Target, ShieldAlert } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';
import type { NavigationTab } from './CommandBar';

export interface HeaderNavProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenSOS?: () => void;
}

/**
 * Phase 1: Desktop Header Navigation (HeaderNav.tsx)
 *
 * Responsive specification:
 * - hidden on mobile screens
 * - md:flex on desktop/tablet (>= 768px)
 * - Fixed top-0, z-50, backdrop blur with subtle zinc border
 */
export const HeaderNav: React.FC<HeaderNavProps> = ({
  activeTab,
  onTabChange,
  onOpenSOS,
}) => {
  const haptics = useHaptics();

  const handleTabClick = (tab: NavigationTab) => {
    haptics.tick();
    onTabChange(tab);
  };

  return (
    <header className="hidden md:flex fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 px-6 py-3 items-center justify-between">
      {/* Brand & System OS Indicator */}
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-[#00FF41] shadow-[0_0_10px_#00FF41]" />
        <span className="font-mono text-sm font-bold tracking-widest uppercase text-zinc-100">
          recomp <span className="text-xs text-zinc-500 font-normal">// OS</span>
        </span>
      </div>

      {/* Primary Desktop Navigation Links */}
      <nav aria-label="Desktop Primary Navigation" className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900/80 border border-white/5">
        <button
          type="button"
          onClick={() => handleTabClick('diary')}
          className={`min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
            activeTab === 'diary'
              ? 'bg-[#00FF41] text-zinc-950 shadow-[0_0_15px_rgba(0,255,65,0.25)] font-bold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Daily Diary</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('search')}
          className={`min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
            activeTab === 'search'
              ? 'bg-[#00FF41] text-zinc-950 shadow-[0_0_15px_rgba(0,255,65,0.25)] font-bold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>AI Food Search</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('recipe')}
          className={`min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
            activeTab === 'recipe'
              ? 'bg-[#00FF41] text-zinc-950 shadow-[0_0_15px_rgba(0,255,65,0.25)] font-bold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Recipe Builder</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('goal')}
          className={`min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
            activeTab === 'goal'
              ? 'bg-[#00FF41] text-zinc-950 shadow-[0_0_15px_rgba(0,255,65,0.25)] font-bold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Goal &amp; Target</span>
        </button>
      </nav>

      {/* SOS Craving Pause Button */}
      {onOpenSOS && (
        <button
          type="button"
          onClick={() => {
            haptics.heartbeat(0.8);
            onOpenSOS();
          }}
          className="min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer shadow-lg shadow-rose-950/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
          <span>SOS Craving</span>
        </button>
      )}
    </header>
  );
};
