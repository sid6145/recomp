import React from 'react';
import { MaterialIcon } from './MaterialIcon';
import { BrandLogo } from './BrandLogo';
import { useHaptics } from '../hooks/useHaptics';
import { MomentumHudPill } from './MomentumHudPill';
import { useMomentum } from '../context/MomentumContext';
import { useAppDispatch } from '../store/store';
import { openPaletteSheet } from '../store/themeSlice';
import type { NavigationTab } from './CommandBar';

export interface HeaderNavProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenSOS?: () => void;
}

const DESKTOP_TABS: Array<{ id: NavigationTab; label: string; icon: string }> = [
  { id: 'diary', label: 'Daily Diary', icon: 'menu_book' },
  { id: 'search', label: 'AI Food Search', icon: 'search' },
  { id: 'recipe', label: 'Recipe Builder', icon: 'restaurant_menu' },
  { id: 'goal', label: 'Goals & Targets', icon: 'track_changes' },
];

export const HeaderNav: React.FC<HeaderNavProps> = ({
  activeTab,
  onTabChange,
  onOpenSOS,
}) => {
  const dispatch = useAppDispatch();
  const haptics = useHaptics();
  const { isOverdrive, consecutiveHitDays } = useMomentum();

  const handleTabClick = (tab: NavigationTab) => {
    haptics.tick();
    onTabChange(tab);
  };

  return (
    <header className="hidden md:flex fixed top-0 left-0 right-0 h-16 z-50 bg-[var(--md-surface)]/90 backdrop-blur-md text-[var(--md-on-surface)] border-b border-[var(--md-outline-variant)]/20 px-6 items-center justify-between transition-colors duration-300">
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-3">
        <BrandLogo variant="horizontal" interactive={true} size={32} />
        {isOverdrive ? (
          <span
            data-testid="overdrive-telemetry-strip"
            className="text-[11px] font-mono font-bold text-[var(--md-primary)] bg-[var(--md-primary-container)] px-2.5 py-0.5 rounded-full flex items-center gap-1.5 tabular-nums"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--md-primary)] animate-ping" />
            <span>OVERDRIVE · DAY {consecutiveHitDays}</span>
          </span>
        ) : (
          <span className="text-xs text-[var(--md-on-surface-variant)] font-normal">
            // Tracker
          </span>
        )}
      </div>

      {/* Middle: M3 Pill Navigation Bar */}
      <nav
        aria-label="Desktop Primary Navigation"
        className="flex items-center gap-1 p-1 rounded-full bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)]/30"
      >
        {DESKTOP_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`min-h-[36px] flex items-center gap-2 px-4 py-1.5 rounded-full text-xs transition-all cursor-pointer m3-state-layer ${
                isActive
                  ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] font-bold shadow-sm'
                  : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
              }`}
            >
              <MaterialIcon name={tab.icon} filled={isActive} size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Cluster: Momentum Pill + Palette Button + SOS Craving Button */}
      <div className="flex items-center gap-2.5">
        <MomentumHudPill />

        {/* Theme Palette Button (40px circular tonal button) */}
        <button
          type="button"
          onClick={() => {
            haptics.tick();
            dispatch(openPaletteSheet());
          }}
          className="w-10 h-10 rounded-full bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] flex items-center justify-center transition-colors hover:bg-[var(--md-surface-container-highest)] m3-state-layer cursor-pointer"
          title="Wallpaper & Style / Theme Customizer"
          aria-label="Theme Customizer"
        >
          <MaterialIcon name="palette" size={20} />
        </button>

        {/* SOS Craving Trigger */}
        {onOpenSOS && (
          <button
            type="button"
            onClick={() => {
              haptics.heartbeat(0.8);
              onOpenSOS();
            }}
            className="min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-bold bg-[var(--md-error-container)] text-[var(--md-on-error-container)] flex items-center gap-1.5 transition-transform active:scale-95 m3-state-layer cursor-pointer shadow-sm"
            title="CBT Urge Surfing Intervention"
          >
            <MaterialIcon name="warning" filled size={18} className="text-[var(--md-error)]" />
            <span>SOS</span>
          </button>
        )}
      </div>
    </header>
  );
};
