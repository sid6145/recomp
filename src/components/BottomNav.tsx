import React from 'react';
import { m } from 'framer-motion';
import { BookOpen, Search, UtensilsCrossed, Target } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';
import { useMomentum } from '../context/MomentumContext';
import type { NavigationTab } from './CommandBar';

export interface BottomNavProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenSOS?: () => void;
}

/**
 * Phase 2: Mobile Bottom Navigation (BottomNav.tsx)
 *
 * Responsive specification:
 * - flex md:hidden (only visible on mobile, completely hidden on >= 768px desktop)
 * - Fixed bottom-0, z-50, backdrop blur with top border bound to var(--chrome-border) and pb-safe
 */
export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  const haptics = useHaptics();
  const { isOverdrive } = useMomentum();

  const handleTabSelect = (tab: NavigationTab) => {
    haptics.tick();
    onTabChange(tab);
  };

  const getActiveTabClass = (tab: NavigationTab) => {
    if (activeTab !== tab) {
      return 'text-zinc-400 hover:text-zinc-200 border border-transparent';
    }
    if (isOverdrive) {
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)] font-bold';
    }
    return 'bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30 shadow-[0_0_12px_rgba(0,255,65,0.15)] font-bold';
  };

  return (
    <aside
      aria-label="Floating Navigation Dock"
      className={`flex md:hidden fixed bottom-0 w-full z-50 bg-zinc-950/90 backdrop-blur-md border-t border-[var(--chrome-border)] pb-safe transition-all duration-500 ${
        isOverdrive ? 'shadow-[0_-1px_20px_rgba(16,185,129,0.18)]' : ''
      }`}
    >
      <m.nav
        aria-label="Mobile Bottom Navigation"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 32, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full px-4 py-2 flex items-center justify-around gap-1"
      >
        {/* Daily Diary Tab */}
        <button
          type="button"
          aria-label="Diary"
          title="Daily Diary"
          onClick={() => handleTabSelect('diary')}
          className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${getActiveTabClass(
            'diary'
          )}`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span className="text-[10px] truncate">Diary</span>
        </button>

        {/* AI Food Search Tab */}
        <button
          type="button"
          aria-label="AI Search"
          title="AI Food Search"
          onClick={() => handleTabSelect('search')}
          className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${getActiveTabClass(
            'search'
          )}`}
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="text-[10px] truncate">Search</span>
        </button>

        {/* Recipe Builder Tab */}
        <button
          type="button"
          aria-label="Recipes"
          title="Recipe Builder"
          onClick={() => handleTabSelect('recipe')}
          className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${getActiveTabClass(
            'recipe'
          )}`}
        >
          <UtensilsCrossed className="w-4 h-4 shrink-0" />
          <span className="text-[10px] truncate">Recipes</span>
        </button>

        {/* Goals Tab */}
        <button
          type="button"
          aria-label="Goal"
          title="Goal & Target"
          onClick={() => handleTabSelect('goal')}
          className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${getActiveTabClass(
            'goal'
          )}`}
        >
          <Target className="w-4 h-4 shrink-0" />
          <span className="text-[10px] truncate">Goals</span>
        </button>
      </m.nav>
    </aside>
  );
};
