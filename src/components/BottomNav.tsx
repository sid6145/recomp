import React from 'react';
import { m } from 'framer-motion';
import { MaterialIcon } from './MaterialIcon';
import { useHaptics } from '../hooks/useHaptics';
import type { NavigationTab } from './CommandBar';

export interface BottomNavProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenSOS?: () => void;
}

interface NavItem {
  id: NavigationTab;
  label: string;
  ariaLabel: string;
  title: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'diary',
    label: 'Diary',
    ariaLabel: 'Diary',
    title: 'Daily Diary',
    icon: 'menu_book',
  },
  {
    id: 'search',
    label: 'Search',
    ariaLabel: 'AI Search',
    title: 'AI Food Search',
    icon: 'search',
  },
  {
    id: 'recipe',
    label: 'Recipe',
    ariaLabel: 'Recipes',
    title: 'Recipe Builder',
    icon: 'restaurant_menu',
  },
  {
    id: 'goal',
    label: 'Goal',
    ariaLabel: 'Goal',
    title: 'Goal & Target',
    icon: 'track_changes',
  },
];

/**
 * Material Design 3 Navigation Bar (BottomNav.tsx)
 *
 * M3 Spec:
 * - 80px container height + env(safe-area-inset-bottom)
 * - Tonal elevation: --md-surface-container
 * - Active pill indicator: 64px × 32px rounded-full with --md-secondary-container
 * - Icons: Material Symbols Rounded (filled when active)
 * - Typography: Inter 12px font-medium
 */
export const BottomNav: React.FC<BottomNavProps> = ({
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
      className="flex md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--md-surface-container)] text-[var(--md-on-surface)] transition-colors duration-300 shadow-[0_-2px_12px_rgba(0,0,0,0.18)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <m.nav
        aria-label="Mobile Bottom Navigation"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 32, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
        className="w-full h-[80px] px-2 flex items-center justify-around"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.ariaLabel}
              title={item.title}
              onClick={() => handleTabSelect(item.id)}
              className="flex-1 min-h-[56px] flex flex-col items-center justify-center gap-1 cursor-pointer select-none m3-state-layer rounded-2xl group"
            >
              {/* Active Indicator Pill (64px × 32px rounded-full) */}
              <div
                className={`relative w-16 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                    : 'bg-transparent text-[var(--md-on-surface-variant)] group-hover:text-[var(--md-on-surface)]'
                }`}
              >
                <MaterialIcon
                  name={item.icon}
                  filled={isActive}
                  size={24}
                  className="transition-transform duration-150 group-active:scale-90"
                />
              </div>

              {/* Label */}
              <span
                className={`text-[12px] tracking-tight transition-colors duration-150 ${
                  isActive
                    ? 'font-bold text-[var(--md-on-surface)]'
                    : 'font-medium text-[var(--md-on-surface-variant)] group-hover:text-[var(--md-on-surface)]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </m.nav>
    </aside>
  );
};
