import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { MaterialIcon } from './MaterialIcon';
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

  return (
    <div className="relative inline-block select-none">
      {/* Multiplier Trigger Pill (M3 Primary Container Pill) */}
      <button
        type="button"
        onClick={handleToggle}
        className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold tracking-tight bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] cursor-pointer transition-transform active:scale-[0.97] m3-state-layer shadow-sm"
        title="View Momentum Multiplier & Anti-Quit Status"
      >
        {isOverdrive ? (
          <span className="relative flex h-2 w-2 mr-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--md-primary)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--md-primary)]" />
          </span>
        ) : (
          <MaterialIcon
            name="bolt"
            size={16}
            filled={momentumTier >= 1.5}
            className="text-[var(--md-on-primary-container)]"
          />
        )}

        <span className="tabular-nums">
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
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]"
              onClick={() => setIsOpen(false)}
            />

            <m.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="absolute right-0 sm:right-auto sm:left-0 mt-2 z-50 w-72 sm:w-80 rounded-[24px] bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] border border-[var(--md-outline-variant)]/30 p-4 shadow-2xl text-left space-y-3.5"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)]/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-full bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center">
                    <MaterialIcon name="bolt" size={16} filled />
                  </div>
                  <div>
                    <h4 className="text-xs font-display font-bold uppercase tracking-wider text-[var(--md-on-surface)]">
                      Momentum Multiplier
                    </h4>
                    <span className="text-[10px] text-[var(--md-on-surface-variant)]">Anti-Quit System</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full text-[var(--md-on-surface-variant)] hover:bg-[var(--md-on-surface)]/10 flex items-center justify-center transition-colors"
                >
                  <MaterialIcon name="close" size={16} />
                </button>
              </div>

              {/* Status Row */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-[16px] bg-[var(--md-surface-container)]">
                  <span className="text-[10px] uppercase font-semibold text-[var(--md-on-surface-variant)] block">
                    Current Streak
                  </span>
                  <span className="text-base font-bold font-mono text-[var(--md-primary)] tabular-nums">
                    {consecutiveHitDays} {consecutiveHitDays === 1 ? 'Day' : 'Days'}
                  </span>
                </div>
                <div className="p-2.5 rounded-[16px] bg-[var(--md-surface-container)]">
                  <span className="text-[10px] uppercase font-semibold text-[var(--md-on-surface-variant)] block">
                    Next Multiplier
                  </span>
                  <span className="text-base font-bold font-mono text-[var(--md-secondary)] tabular-nums">
                    {isOverdrive ? 'MAX' : `in ${daysUntilNextTier}d`}
                  </span>
                </div>
              </div>

              {/* Anti-Quit Shield Status */}
              <div className="flex items-center gap-2 p-2.5 rounded-[16px] bg-[var(--md-surface-container)] text-xs">
                <MaterialIcon
                  name={shieldActive ? 'shield' : 'shield'}
                  filled={shieldActive}
                  size={18}
                  className={shieldActive ? 'text-[var(--md-primary)]' : 'text-[var(--md-on-surface-variant)]'}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[var(--md-on-surface)] flex items-center gap-1">
                    <span>Anti-Quit Shield:</span>
                    <span className={shieldActive ? 'text-[var(--md-primary)]' : 'text-[var(--md-on-surface-variant)]'}>
                      {shieldActive ? 'Active' : 'Standby'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--md-on-surface-variant)] truncate">
                    Never drops to zero on a missed day
                  </p>
                </div>
              </div>

              {/* Tier Cycle Button for Testing/Demo */}
              <button
                type="button"
                onClick={() => {
                  haptics.tick();
                  cycleTier();
                }}
                className="w-full py-2 px-3 rounded-full text-xs font-semibold bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] flex items-center justify-center gap-1.5 transition-transform active:scale-95 m3-state-layer"
              >
                <span>Cycle Tier Demo ({momentumTier}x)</span>
                <MaterialIcon name="chevron_right" size={16} />
              </button>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
