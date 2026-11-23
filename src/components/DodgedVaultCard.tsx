import React, { useEffect, useState, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { MaterialIcon } from './MaterialIcon';
import { getAllDodgedLogs, getTotalDodgedCalories } from '../db/dodgedLogs';
import type { DodgedLog } from '../db/db';
import { useHaptics } from '../hooks/useHaptics';
import { useMomentum } from '../context/MomentumContext';
import { useAppSelector } from '../store/store';
import { AnimatedNumber } from './AnimatedNumber';

export const DodgedVaultCard: React.FC = React.memo(() => {
  const { isOverdrive } = useMomentum();
  const isSOSActive = useAppSelector((state) => state.sos.isSOSActive);
  const [totalDodged, setTotalDodged] = useState<number>(0);
  const [recentLogs, setRecentLogs] = useState<DodgedLog[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const haptics = useHaptics();

  const syncVault = useCallback(() => {
    getTotalDodgedCalories().then(setTotalDodged);
    getAllDodgedLogs().then(setRecentLogs);
  }, []);

  useEffect(() => {
    syncVault();
    const handleUpdate = () => syncVault();
    window.addEventListener('focus', handleUpdate);
    window.addEventListener('dodged-vault-updated', handleUpdate);
    return () => {
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('dodged-vault-updated', handleUpdate);
    };
  }, [syncVault]);

  useEffect(() => {
    if (!isSOSActive) {
      syncVault();
    }
  }, [isSOSActive, syncVault]);

  const fatEquivalentKg = (totalDodged / 7700).toFixed(2);
  const progressToNextKg = Math.min(100, Math.round(((totalDodged % 7700) / 7700) * 100));

  const toggleExpand = () => {
    haptics.tick();
    setIsExpanded((prev) => !prev);
  };

  return (
    <div
      className={`w-full h-full flex flex-col justify-between p-5 rounded-[24px] bg-[var(--md-tertiary-container)] text-[var(--md-on-tertiary-container)] shadow-md transition-colors duration-300 ${
        isOverdrive ? 'ring-2 ring-[var(--md-primary)]' : ''
      }`}
    >
      {/* Top Section: Header, Subtitle, Metric Sub-Cards & History */}
      <div>
        {/* Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-[var(--md-surface)]/20 text-[var(--md-on-tertiary-container)]">
              <MaterialIcon name="savings" size={22} filled />
            </div>
            <h3 className="text-sm font-bold tracking-tight uppercase font-display truncate">
              Dodged Vault
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-3 py-1 rounded-full text-[11px] font-display font-semibold whitespace-nowrap bg-[var(--md-surface)]/20 text-[var(--md-on-tertiary-container)]">
              {recentLogs.length} Urge{recentLogs.length === 1 ? '' : 's'}
            </span>
            {recentLogs.length > 0 && (
              <button
                type="button"
                onClick={toggleExpand}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--md-surface)]/20 transition-colors m3-state-layer cursor-pointer"
                title={isExpanded ? 'Collapse history' : 'Expand history'}
              >
                <MaterialIcon
                  name={isExpanded ? 'expand_less' : 'expand_more'}
                  size={20}
                />
              </button>
            )}
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-xs opacity-80 truncate mt-2 font-sans">
          Total energy saved from defeated impulsive cravings
        </p>

        {/* Hero Balance Row */}
        <div className="flex items-baseline justify-between mt-4 pt-3 border-t border-[var(--md-on-tertiary-container)]/10">
          <span className="text-xs uppercase font-display font-semibold opacity-75">
            Calories Dodged
          </span>
          <div className="flex items-baseline">
            <AnimatedNumber
              value={totalDodged}
              prefix="+"
              className="text-2xl font-mono font-bold tabular-nums"
            />
            <span className="text-xs font-mono ml-1 opacity-75">kcal</span>
          </div>
        </div>

        {/* Fat Equivalent Sub-Card */}
        <div className="mt-3 p-3 rounded-[16px] bg-[var(--md-surface)]/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MaterialIcon name="scale" size={18} />
            <span className="text-xs font-display font-semibold">Body Fat Defended</span>
          </div>
          <span className="text-xs font-mono font-bold tabular-nums">
            ~{fatEquivalentKg} kg
          </span>
        </div>
      </div>

      {/* Progress towards next 1 kg burned */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-display opacity-85">
          <span>Next 1kg Milestone</span>
          <span className="font-mono tabular-nums font-bold">{progressToNextKg}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[var(--md-surface)]/20 overflow-hidden">
          <m.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progressToNextKg / 100 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full origin-left rounded-full bg-[var(--md-primary)]"
          />
        </div>
      </div>

      {/* Expandable History Drawer */}
      <AnimatePresence>
        {isExpanded && recentLogs.length > 0 && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-[var(--md-on-tertiary-container)]/10 space-y-1.5 max-h-36 overflow-y-auto"
          >
            {recentLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between text-xs p-2 rounded-[12px] bg-[var(--md-surface)]/15 font-sans"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <MaterialIcon name="check_circle" size={14} filled />
                  <span className="truncate font-medium">{log.foodName}</span>
                </div>
                <span className="font-mono font-bold shrink-0 ml-2 tabular-nums">
                  +{log.calories} kcal
                </span>
              </div>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
});

DodgedVaultCard.displayName = 'DodgedVaultCard';
