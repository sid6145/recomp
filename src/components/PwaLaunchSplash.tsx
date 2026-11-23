import React, { useState, useEffect } from 'react';
import { BrandLogo } from './BrandLogo';

export interface PwaLaunchSplashProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

const STORAGE_KEY = 'recomp_boot_animated';

/**
 * Non-Blocking Material You (M3) PWA Launch Splash (PwaLaunchSplash.tsx)
 *
 * Requirements:
 * - Plays once per cold PWA session (sessionStorage.recomp_boot_animated).
 * - Zero hydration blocking: mounts as a non-blocking fixed inset-0 z-50 overlay in var(--md-surface)
 *   directly over the app shell so Dexie, Redux, and Web Workers hydrate uninterrupted.
 * - Snappy 1100ms timeline:
 *     0ms - 750ms: Centered BrandLogo (app-icon) sweeps rings + curls bicep.
 *     750ms - 1100ms: Smooth fade-out (opacity 1 -> 0, scale 1 -> 1.04), then unmounts onAnimationEnd.
 * - Respects prefers-reduced-motion: skips immediately.
 */
export const PwaLaunchSplash: React.FC<PwaLaunchSplashProps> = ({
  onComplete,
  forceShow = false,
}) => {
  const [shouldRender, setShouldRender] = useState(() => {
    if (forceShow) return true;
    if (typeof window === 'undefined') return false;
    try {
      const alreadyAnimated = sessionStorage.getItem(STORAGE_KEY) === '1';
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return !alreadyAnimated && !prefersReduced;
    } catch {
      return false;
    }
  });

  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (!shouldRender) {
      onComplete?.();
      return;
    }

    // 0ms - 750ms: Logo bicep-flex + ring sweep entrance
    // At 750ms: trigger 300ms GPU fade-out animation
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 750);

    // At 1050ms: clean unmount from DOM and persist session flag
    const unmountTimer = setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // Ignore quota/private mode errors
      }
      setShouldRender(false);
      onComplete?.();
    }, 1050);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, [shouldRender, onComplete]);

  const handleAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.animationName === 'recomp-splash-fadeout') {
      try {
        sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        // Ignore quota/private mode errors
      }
      setShouldRender(false);
      onComplete?.();
    }
  };

  if (!shouldRender) return null;

  return (
    <div
      key="pwa-launch-splash"
      data-testid="pwa-launch-splash"
      onAnimationEnd={handleAnimationEnd}
      style={{
        animation: isFadingOut ? 'recomp-splash-fadeout 300ms cubic-bezier(0.2, 0, 0, 1) forwards' : undefined,
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--md-surface,#101512)] text-[var(--md-on-surface,#e1e3df)] select-none pointer-events-none transition-colors duration-300"
      aria-hidden="true"
    >
      <style>{`
        @keyframes recomp-splash-fadeout {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.04);
          }
        }
      `}</style>

      {/* Centered Brand Logo & Dynamic Ring Flex */}
      <div className="flex flex-col items-center gap-4">
        <div className="p-2 rounded-[32px] bg-[var(--md-surface-container,#1c211e)] shadow-2xl transition-colors duration-300">
          <BrandLogo variant="app-icon" animate={true} size={96} />
        </div>

        <div className="flex flex-col items-center space-y-1 text-center">
          <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--md-on-surface,#e1e3df)]">
            Recomp
          </span>
          <span className="text-xs font-mono font-medium text-[var(--md-primary,#1e6b52)] tracking-wider uppercase">
            Nutrition &amp; Body Composition
          </span>
        </div>
      </div>
    </div>
  );
};

