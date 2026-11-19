import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SplashScreenProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

/**
 * Startup Logo & Boot Splash Animation (src/components/SplashScreen.tsx)
 *
 * Session Guard: Plays once per browser session (sessionStorage.recomp_booted).
 * Skips immediately if already booted or if prefers-reduced-motion: reduce is active.
 *
 * Choreography (~1.3s total):
 * 1. Full-screen fixed inset-0 z-[100] bg-zinc-950
 * 2. Centerpiece: /pwa-192x192.png (w-20 h-20 rounded-2xl) framed by soft pulsing halo
 * 3. Spring physics: scale 0.85, opacity 0 -> scale 1, opacity 1 (stiffness: 380, damping: 28)
 * 4. Subtitle: RECOMP (tracking-[0.35em]) + razor-thin w-28 h-[2px] boot bar sweeping 0% -> 100% over 900ms
 * 5. Clean exit: scale 1.04, opacity 0 (300ms), unmounts completely from DOM
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, forceShow = false }) => {
  const [shouldRender, setShouldRender] = useState(() => {
    if (forceShow) return true;
    if (typeof window === 'undefined') return false;
    const isBooted = sessionStorage.getItem('recomp_booted') === 'true';
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return !isBooted && !prefersReduced;
  });

  const [isVisible, setIsVisible] = useState(shouldRender);

  useEffect(() => {
    if (!shouldRender) {
      if (onComplete) onComplete();
      return;
    }

    // Hold splash screen for ~1000ms then initiate exit animation
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [shouldRender, onComplete]);

  const handleExitComplete = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('recomp_booted', 'true');
      } catch {
        // Ignore session storage errors
      }
    }
    setShouldRender(false);
    if (onComplete) onComplete();
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isVisible && (
        <motion.div
          key="recomp-splash-screen"
          data-testid="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center select-none overflow-hidden"
        >
          {/* Subtle Ambient Background Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08)_0%,transparent_70%)] pointer-events-none" />

          {/* Centerpiece: Logo + Radial Halo */}
          <div className="relative flex flex-col items-center justify-center">
            {/* Soft Pulsing Emerald Halo */}
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.35, 0.65, 0.35],
              }}
              transition={{
                duration: 2.0,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute w-36 h-36 rounded-full bg-emerald-500/25 blur-2xl transform-gpu"
            />

            {/* Logo Image */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 28,
              }}
              className="relative w-20 h-20 rounded-2xl p-[1px] bg-gradient-to-br from-emerald-400/40 via-teal-500/20 to-transparent shadow-[0_0_35px_rgba(16,185,129,0.35)]"
            >
              <img
                src="/pwa-192x192.png"
                alt="Recomp Logo"
                className="w-full h-full object-cover rounded-2xl"
              />
            </motion.div>

            {/* Brand Title: RECOMP */}
            <motion.span
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="font-mono text-sm font-black tracking-[0.35em] text-zinc-100 uppercase mt-5"
            >
              RECOMP
            </motion.span>

            {/* 900ms Sweeping Boot Bar */}
            <div className="w-28 h-[2px] bg-zinc-900 rounded-full overflow-hidden mt-3.5 border border-white/5">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.9, ease: 'easeInOut' }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_#10b981]"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
