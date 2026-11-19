import React, { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Zap, ArrowDown, X } from 'lucide-react';
import { useMomentum } from '../context/MomentumContext';
import { useHaptics } from '../hooks/useHaptics';

export const OverdriveEngagementCelebration: React.FC = () => {
  const { momentumTier } = useMomentum();
  const haptics = useHaptics();

  const [showOverdrivePulse, setShowOverdrivePulse] = useState(false);
  const [showOverdriveToast, setShowOverdriveToast] = useState(false);

  const [showDropPulse, setShowDropPulse] = useState(false);
  const [showDropToast, setShowDropToast] = useState(false);
  const [droppedTier, setDroppedTier] = useState<number>(1.0);

  const prevTierRef = useRef<number | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Skip initial mount
    if (prevTierRef.current === null) {
      prevTierRef.current = momentumTier;
      return;
    }

    const prev = prevTierRef.current;
    prevTierRef.current = momentumTier;

    // 1. Upgrade into Overdrive (3.0x)
    if (prev < 3.0 && momentumTier === 3.0) {
      haptics.success();
      setShowOverdrivePulse(true);
      setShowOverdriveToast(true);

      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = setTimeout(() => {
        setShowOverdrivePulse(false);
      }, 600);

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setShowOverdriveToast(false);
      }, 3500);
    }
    // 2. Power-Down Transition: Dropping down a tier
    else if (prev > momentumTier) {
      haptics.warning();
      setDroppedTier(momentumTier);
      setShowDropPulse(true);
      setShowDropToast(true);

      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = setTimeout(() => {
        setShowDropPulse(false);
      }, 400);

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setShowDropToast(false);
      }, 3000);
    }

    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [momentumTier, haptics]);

  return (
    <>
      {/* 600ms Full-Screen Radial Emerald Sweep on 3.0x Engagement */}
      <AnimatePresence>
        {showOverdrivePulse && (
          <div className="fixed inset-0 pointer-events-none z-[60] flex items-center justify-center overflow-hidden">
            <m.div
              initial={{ scale: 0.1, opacity: 0.95 }}
              animate={{ scale: 3.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="w-[120vw] h-[120vw] max-w-[1200px] max-h-[1200px] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.55)_0%,rgba(6,182,212,0.25)_40%,transparent_70%)]"
            />
          </div>
        )}
      </AnimatePresence>

      {/* 400ms Dimming Fade Overlay on Power-Down Drop */}
      <AnimatePresence>
        {showDropPulse && (
          <div className="fixed inset-0 pointer-events-none z-[60] flex items-center justify-center overflow-hidden">
            <m.div
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
            />
          </div>
        )}
      </AnimatePresence>

      {/* Non-Blocking Toast Container */}
      <div className="fixed top-20 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto z-[40] max-w-md mx-auto pointer-events-none">
        {/* Overdrive Toast */}
        <AnimatePresence>
          {showOverdriveToast && (
            <m.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="px-4 py-3 rounded-2xl bg-zinc-950/95 border border-emerald-400/50 backdrop-blur-2xl shadow-[0_0_35px_rgba(16,185,129,0.35)] flex items-center justify-between gap-3 select-none pointer-events-none"
            >
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-black tracking-wider text-emerald-300 uppercase flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/40" />
                    <span>OVERDRIVE ENGAGED // 3.0x MOMENTUM</span>
                  </span>
                  <span className="text-[10px] font-sans text-zinc-400">
                    Maximum multiplier active. All biometric telemetry elevated.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowOverdriveToast(false)}
                className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center shrink-0 pointer-events-auto"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </m.div>
          )}
        </AnimatePresence>

        {/* Momentum Dropped Toast */}
        <AnimatePresence>
          {showDropToast && (
            <m.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mt-2 px-4 py-3 rounded-2xl bg-zinc-950/95 border border-amber-500/40 backdrop-blur-2xl shadow-[0_0_30px_rgba(245,158,11,0.25)] flex items-center justify-between gap-3 select-none pointer-events-none"
            >
              <div className="flex items-center gap-3">
                <div className="p-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <ArrowDown className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-black tracking-wider text-amber-300 uppercase">
                    MOMENTUM DROPPED TO {droppedTier.toFixed(1)}x
                  </span>
                  <span className="text-[10px] font-sans text-zinc-400">
                    Anti-Quit Shield absorbed the fall. Re-engage to recover multiplier.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDropToast(false)}
                className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center shrink-0 pointer-events-auto"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
