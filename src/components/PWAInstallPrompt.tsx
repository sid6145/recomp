import React, { useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, PlusSquare } from 'lucide-react';
import { useHaptics } from '../hooks/useHaptics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PWAInstallPromptProps {
  splashDone?: boolean;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DISMISS_KEY = 'recomp_pwa_dismissed_at';

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ splashDone = true }) => {
  const haptics = useHaptics();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isPreview, setIsPreview] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  // Check standalone mode
  const checkIsStandalone = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  }, []);

  // Capture beforeinstallprompt early
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (checkIsStandalone()) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Dev preview listener triggered by GoalSetter or tests
    const handleDevPreview = (e: Event) => {
      const customEvent = e as CustomEvent<{ platform?: 'android' | 'ios' }>;
      setIsPreview(true);
      if (customEvent.detail?.platform === 'ios') {
        setIsIOS(true);
      } else {
        setIsIOS(false);
      }
      setIsVisible(true);
    };
    window.addEventListener('recomp_preview_pwa_install', handleDevPreview);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('recomp_preview_pwa_install', handleDevPreview);
    };
  }, [checkIsStandalone]);

  // Handle scheduled appearance after splash finishes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (checkIsStandalone() || isInstalled) return;

    // Suppress if dismissed in the last 7 days
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const timeSince = Date.now() - parseInt(dismissedAt, 10);
        if (timeSince < SEVEN_DAYS_MS) {
          return;
        }
      }
    } catch {
      // Ignore storage errors
    }

    // Check if mobile (<768px or user agent)
    const isMobileViewport = window.innerWidth < 768;
    const isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    if (!isMobileViewport && !isMobileUA) {
      return;
    }

    // Detect iOS
    const iosDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream?: boolean }).MSStream;
    setIsIOS(iosDevice);

    if (!splashDone) return;

    // 4-second delay after splash unmounts
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, [splashDone, checkIsStandalone, isInstalled]);

  const handleDismiss = () => {
    haptics.tick();
    setIsVisible(false);
    if (!isPreview) {
      try {
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
      } catch {
        // Ignore
      }
    }
  };

  const handleInstallClick = async () => {
    haptics.success();
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsVisible(false);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('PWA install error:', err);
      }
    } else if (isIOS) {
      // iOS doesn't have programmatic install; guidance is displayed in card
      setIsVisible(false);
    } else {
      // In dev preview or fallback without prompt
      setIsVisible(false);
    }
  };

  if (!isVisible || isInstalled) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          key="pwa-install-popup"
          data-testid="pwa-install-prompt"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-20 left-3 right-3 z-40 md:hidden bg-zinc-900/95 backdrop-blur-2xl border border-emerald-500/25 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.65)]"
        >
          <div className="flex items-start gap-3">
            {/* Logo */}
            <img
              src="/pwa-192x192.png"
              alt="Recomp Icon"
              className="w-11 h-11 rounded-xl shrink-0 object-cover shadow-[0_0_12px_rgba(16,185,129,0.25)] border border-emerald-500/30"
            />

            {/* Content */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-100 tracking-tight flex items-center gap-1.5">
                  <span>Install Recomp</span>
                  {isPreview && (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Preview
                    </span>
                  )}
                </h3>
                <button
                  type="button"
                  data-testid="pwa-dismiss-button"
                  onClick={handleDismiss}
                  className="p-1 -mr-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/60 transition-colors"
                  aria-label="Dismiss installation prompt"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                Zero-friction telemetry & offline logging
              </p>

              {/* iOS Specific Instructions vs Android Action */}
              {isIOS ? (
                <div className="mt-3 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-[11px] text-zinc-300 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                      1
                    </span>
                    <span>
                      Tap the <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-emerald-400" /> Share
                      icon in Safari below.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                      2
                    </span>
                    <span>
                      Scroll and select <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-emerald-400" />{' '}
                      <strong className="text-zinc-100">Add to Home Screen</strong>.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="pwa-install-button"
                    onClick={handleInstallClick}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-colors shadow-[0_0_16px_rgba(16,185,129,0.35)] active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Install App</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 text-xs font-medium transition-colors"
                  >
                    Not now
                  </button>
                </div>
              )}
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
