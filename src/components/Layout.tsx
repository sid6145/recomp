import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { HeaderNav } from './HeaderNav';
import { BottomNav } from './BottomNav';
import { GlobalBackground } from './GlobalBackground';
import { AmbientBackdrop } from './AmbientBackdrop';
import { OverdriveEngagementCelebration } from './OverdriveEngagementCelebration';
import { UnstableOverdriveBanner } from './UnstableOverdriveBanner';
import { PwaLaunchSplash } from './PwaLaunchSplash';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { useMomentum, getMomentumDatasetValue } from '../context/MomentumContext';
import type { NavigationTab } from './CommandBar';

export interface LayoutProps {
  children: React.ReactNode;
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenSOS?: () => void;
  hideBottomNav?: boolean;
}

/**
 * Phase 3: Main Layout Wrapper (Layout.tsx)
 *
 * Responsive layout specification:
 * - min-h-[100dvh] bg-[var(--app-bg)] text-zinc-100 flex flex-col
 * - AmbientBackdrop mounted once (fixed inset-0 pointer-events-none -z-10 overflow-hidden)
 * - HeaderNav (hidden md:flex) on desktop
 * - BottomNav (flex md:hidden) on mobile
 * - Unstable Overdrive Banner when data-unstable="true"
 */
export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  onOpenSOS,
  hideBottomNav = false,
}) => {
  const { momentumTier, isUnstable } = useMomentum();
  const [splashDone, setSplashDone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return sessionStorage.getItem('recomp_booted') === 'true';
  });

  return (
    <div
      data-momentum={getMomentumDatasetValue(momentumTier)}
      data-unstable={isUnstable ? 'true' : 'false'}
      className="relative min-h-[100dvh] bg-[var(--app-bg)] text-neutral-100 flex flex-col transition-[background-color] duration-500"
    >
      {/* Non-Blocking Material You PWA Launch Splash */}
      <PwaLaunchSplash onComplete={() => setSplashDone(true)} />

      {/* Global Dark-Luxury Base Background (Grid + Ambient Noise) */}
      <GlobalBackground />

      {/* Reactive Aurora + Motes Background Ladder */}
      <AmbientBackdrop />

      {/* Full-Screen Overdrive Engagement / Power-Down Pulse & Toast */}
      <OverdriveEngagementCelebration />

      {/* Desktop Top Navigation (hidden on mobile, flex on md and above) */}
      <HeaderNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenSOS={onOpenSOS}
      />

      {/* Main Content Area with Platform-Specific Responsive Padding */}
      <main className="flex-1 w-full flex flex-col items-center pt-0 md:pt-20 pb-24 md:pb-8 px-4 sm:px-6">
        <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col items-center">
          {/* Unstable Overdrive Warning Pill (when data-unstable="true") */}
          <UnstableOverdriveBanner />
          {children}
        </div>
      </main>

      {/* Smart Mobile PWA Install Popup (floats cleanly above BottomNav) */}
      <PWAInstallPrompt splashDone={splashDone} />

      {/* Mobile Bottom Navigation (flex on mobile, hidden on md and above) */}
      <AnimatePresence>
        {!hideBottomNav && (
          <BottomNav
            activeTab={activeTab}
            onTabChange={onTabChange}
            onOpenSOS={onOpenSOS}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
