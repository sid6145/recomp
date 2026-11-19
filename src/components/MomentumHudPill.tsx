import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Zap, ShieldCheck, ChevronRight, X, Sparkles } from 'lucide-react';
import { useMomentum } from '../context/MomentumContext';
import { useHaptics } from '../hooks/useHaptics';

export const MomentumHudPill: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const {
    momentumTier,
    tierName,
    consecutiveHitDays,
    daysUntilNextTier,
    isOverdrive,
    shieldActive,
    cycleTier,
  } = useMomentum();
  const [isOpen, setIsOpen] = useState(false);
  const haptics = useHaptics();

  const handleToggle = () => {
    haptics.tick();
    setIsOpen((prev) => !prev);
  };

  const getTierColor = () => {
    switch (momentumTier) {
      case 3.0:
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]';
      case 2.0:
        return 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]';
      case 1.5:
        return 'bg-zinc-900/80 text-emerald-400/90 border-emerald-500/20';
      case 1.0:
      default:
        return 'bg-zinc-900/60 text-zinc-400 border-white/5';
    }
  };

  return (
    <div className="relative inline-block select-none">
      {/* Multiplier Trigger Pill */}
      <button
        type="button"
        onClick={handleToggle}
        className={`min-h-[36px] inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-bold tracking-tight border cursor-pointer transition-all active:scale-[0.97] transition-transform duration-100 ease-out ${getTierColor()}`}
        title="View Momentum Multiplier & Anti-Quit Status"
      >
        {isOverdrive ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          </span>
        ) : (
          <Zap
            className={`w-3.5 h-3.5 ${
              momentumTier >= 1.5 ? 'text-emerald-400 fill-emerald-400/30' : 'text-zinc-500'
            }`}
          />
        )}

        <span>
          {isOverdrive
            ? compact
              ? '3.0x'
              : 'OVERDRIVE // 3.0x'
            : compact
            ? `${momentumTier.toFixed(1)}x`
            : `${momentumTier.toFixed(1)}x ${tierName.toUpperCase()}`}
        </span>
      </button>

      {/* Popover Card */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Dismiss */}
            <div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setIsOpen(false)}
            />

            <m.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 sm:right-auto sm:left-0 mt-2 z-50 w-72 sm:w-80 rounded-2xl bg-zinc-950/95 border border-white/10 backdrop-blur-2xl p-4 shadow-2xl text-left space-y-3.5"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Zap className="w-4 h-4 fill-emerald-400/20" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-100">
                      Momentum Multiplier
                    </h4>
                    <span className="text-[10px] font-mono text-zinc-400">Anti-Quit System</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="min-h-[32px] min-w-[32px] p-1 text-zinc-400 hover:text-zinc-100 transition-colors rounded-lg flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Current Status Readout */}
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-zinc-400">Active Tier:</span>
                  <span className="text-xs font-mono font-extrabold text-emerald-400 uppercase">
                    {tierName} ({momentumTier.toFixed(1)}x)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-zinc-400">Consistency:</span>
                  <span className="text-xs font-mono text-zinc-200 tabular-nums">
                    {consecutiveHitDays} day{consecutiveHitDays === 1 ? '' : 's'} on target
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-zinc-400">Next Upgrade:</span>
                  <span className="text-xs font-mono text-zinc-300">
                    {isOverdrive
                      ? 'Maximum Tier (3.0x)'
                      : `${daysUntilNextTier} day${daysUntilNextTier === 1 ? '' : 's'} remaining`}
                  </span>
                </div>
              </div>

              {/* Anti-Quit Shield Status */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-zinc-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] space-y-0.5 leading-snug">
                  <div className="font-mono font-bold text-emerald-400">
                    {shieldActive ? 'Anti-Quit Shield Armed' : 'Shield Inactive'}
                  </div>
                  <p className="text-zinc-400">
                    Missing a day never wipes your progress. You only drop 1 tier down instead of
                    resetting to zero.
                  </p>
                </div>
              </div>

              {/* Dev Preview Quick Cycle Button */}
              <button
                type="button"
                onClick={() => {
                  haptics.tick();
                  cycleTier();
                }}
                className="w-full min-h-[36px] flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-white/5 hover:bg-white/10 active:bg-white/15 text-zinc-200 border border-white/10 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dev Preview: Cycle Tier</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
