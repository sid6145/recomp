import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { HeaderNav } from './HeaderNav';
import { BottomNav } from './BottomNav';
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
 * - min-h-screen bg-zinc-950 text-zinc-100 flex flex-col
 * - pt-0 md:pt-20 (clears the fixed top header on desktop)
 * - pb-24 md:pb-8 (clears the fixed bottom nav on mobile)
 */
export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  onOpenSOS,
  hideBottomNav = false,
}) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Desktop Top Navigation (hidden on mobile, flex on md and above) */}
      <HeaderNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenSOS={onOpenSOS}
      />

      {/* Main Content Area with Platform-Specific Responsive Padding */}
      <main className="flex-1 w-full flex flex-col items-center pt-0 md:pt-20 pb-24 md:pb-8 px-4 sm:px-6">
        <div className="w-full max-w-4xl flex-1 flex flex-col items-center">
          {children}
        </div>
      </main>

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
