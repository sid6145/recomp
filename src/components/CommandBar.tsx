import React from 'react';
import { motion } from 'framer-motion';
import { Search, BookOpen, UtensilsCrossed, Target } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';
import { AgenticTransition } from '../utils/motionPresets';

export type NavigationTab = 'diary' | 'search' | 'recipe' | 'goal';

export interface CommandBarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenSOS?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
}

/**
 * Pure Floating Bottom Navigation Bar (CommandBar.tsx)
 *
 * Architectural Specifications:
 * 1. Pure Navigation Dock: Search input has been relocated to FoodSearchDashboard.
 *    The bottom bar serves exclusively as a high-ergonomics floating tab bar.
 * 2. Stacking Context (z-40): Kept strictly at z-40 so modals and bottom sheets (z-[80]/z-[100])
 *    render completely unobstructed above it.
 * 3. Mobile Ergonomics: All tabs enforce min 44x44px touch targets.
 * 4. Safe Area Support: Anchored using env(safe-area-inset-bottom) to respect iOS home indicators.
 */
export const CommandBar: React.FC<CommandBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const haptics = useHaptics();

  const handleTabSelect = (tab: NavigationTab) => {
    haptics.tick();
    onTabChange(tab);
  };

  return (
    <aside
      aria-label="Floating Navigation Dock"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] inset-x-0 mx-auto w-full max-w-md px-4 z-40 pointer-events-none"
    >
      <motion.nav
        aria-label="Command Bar Navigation"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 32, opacity: 0 }}
        transition={AgenticTransition}
        className="pointer-events-auto rounded-3xl bg-neutral-900/90 border border-white/5 backdrop-blur-md p-1.5 shadow-[0_12px_45px_rgba(0,0,0,0.85)] flex items-center justify-around gap-1"
      >
        {/* Daily Diary Tab */}
        <button
          type="button"
          aria-label="Diary"
          onClick={() => handleTabSelect('diary')}
          className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-3 py-2 rounded-2xl text-xs font-mono font-medium transition-all cursor-pointer ${
            activeTab === 'diary'
              ? 'bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30 shadow-[0_0_12px_rgba(0,255,65,0.15)] font-bold'
              : 'text-neutral-400 hover:text-neutral-200 border border-transparent'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span className="truncate">Diary</span>
        </button>

        {/* AI Food Search Tab */}
        <button
          type="button"
          aria-label="AI Search"
          title="AI Food Search"
          onClick={() => handleTabSelect('search')}
          className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-3 py-2 rounded-2xl text-xs font-mono font-medium transition-all cursor-pointer ${
            activeTab === 'search'
              ? 'bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30 shadow-[0_0_12px_rgba(0,255,65,0.15)] font-bold'
              : 'text-neutral-400 hover:text-neutral-200 border border-transparent'
          }`}
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="truncate">AI Search</span>
        </button>

        {/* Recipe Builder Tab */}
        <button
          type="button"
          aria-label="Recipes"
          title="Recipe Builder"
          onClick={() => handleTabSelect('recipe')}
          className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-3 py-2 rounded-2xl text-xs font-mono font-medium transition-all cursor-pointer ${
            activeTab === 'recipe'
              ? 'bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30 shadow-[0_0_12px_rgba(0,255,65,0.15)] font-bold'
              : 'text-neutral-400 hover:text-neutral-200 border border-transparent'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4 shrink-0" />
          <span className="truncate">Recipes</span>
        </button>

        {/* Goals Tab */}
        <button
          type="button"
          aria-label="Goals"
          title="Goal & Target"
          onClick={() => handleTabSelect('goal')}
          className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-3 py-2 rounded-2xl text-xs font-mono font-medium transition-all cursor-pointer ${
            activeTab === 'goal'
              ? 'bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/30 shadow-[0_0_12px_rgba(0,255,65,0.15)] font-bold'
              : 'text-neutral-400 hover:text-neutral-200 border border-transparent'
          }`}
        >
          <Target className="w-4 h-4 shrink-0" />
          <span className="truncate">Goals</span>
        </button>
      </motion.nav>
    </aside>
  );
};
