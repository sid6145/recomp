import React, { useEffect, useState, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Flame, Scale, ChevronDown, ChevronUp } from 'lucide-react';
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

  // Also sync when SOS modal closes
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
      className={`w-full h-full flex flex-col justify-between p-5 rounded-2xl bg-zinc-900/95 md:bg-[var(--surface-card)] md:backdrop-blur-xl border border-[var(--surface-border)] shadow-[var(--surface-highlight),var(--accent-glow)] transition-all duration-500 hover:border-white/10 ${
        isOverdrive ? 'ring-1 ring-emerald-400/30' : ''
      }`}
    >
      {/* Top Section: Header, Subtitle, Metric Sub-Cards & History */}
      <div>
        {/* Header Row: Clean 2-Column Layout */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Icon box + Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold tracking-wide uppercase text-zinc-100 whitespace-nowrap font-mono truncate">
              Dodged Vault
            </h3>
          </div>

          {/* Right: Status Pill & History toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono whitespace-nowrap shrink-0 border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
              {recentLogs.length} Urge{recentLogs.length === 1 ? '' : 's'}
            </span>
            {recentLogs.length > 0 && (
              <button
                type="button"
                onClick={toggleExpand}
                className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                title={isExpanded ? 'Collapse history' : 'Expand history'}
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Subtitle directly below */}
        <p className="text-xs text-zinc-400 truncate mt-1.5 font-sans">
          Cravings overridden via CBT pause
        </p>

        {/* Metric Sub-Cards (grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/5) */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/5">
          {/* Left stat: Avoided Intake */}
          <div className="flex flex-col justify-between p-3.5 rounded-xl bg-zinc-950/60 border border-white/5">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 uppercase tracking-wider whitespace-nowrap">
              <Flame className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Avoided Intake</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-3">
              <AnimatedNumber
                value={totalDodged}
                prefix="+"
                className={`text-2xl font-mono font-bold text-emerald-400 tabular-nums ${
                  isOverdrive ? 'drop-shadow-[0_0_10px_rgba(52,211,153,0.45)]' : ''
                }`}
              />
              <span className="text-xs font-mono text-zinc-400 whitespace-nowrap">kcal</span>
            </div>
          </div>

          {/* Right stat: Fat Equivalent */}
          <div className="flex flex-col justify-between p-3.5 rounded-xl bg-zinc-950/60 border border-white/5">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 uppercase tracking-wider whitespace-nowrap">
              <Scale className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Fat Equivalent</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-3">
              <span
                className={`text-2xl font-mono font-bold text-zinc-100 tabular-nums ${
                  isOverdrive ? 'drop-shadow-[0_0_10px_rgba(52,211,153,0.35)]' : ''
                }`}
              >
                {fatEquivalentKg}
              </span>
              <span className="text-xs font-mono text-zinc-400 whitespace-nowrap">kg fat</span>
            </div>
          </div>
        </div>

        {/* Expandable History Drawer */}
        <AnimatePresence>
          {isExpanded && recentLogs.length > 0 && (
            <m.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                  Resisted Urge History:
                </span>
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 rounded-lg bg-zinc-950/40 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="font-sans font-medium text-zinc-200 truncate">
                          {log.foodName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                        <span className="text-zinc-500">
                          {new Date(log.timestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="font-bold text-emerald-400">+{log.calories} kcal</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Section: Slim Footer Progress Bar tracking next 1 kg fat avoided (mt-auto pt-4) */}
      <div className="mt-auto pt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <span className="truncate">Next 1 kg fat avoided</span>
          <span className="tabular-nums text-zinc-300 whitespace-nowrap ml-2">
            {totalDodged % 7700} / 7,700 kcal
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-zinc-950/80 border border-white/5 overflow-hidden p-0">
          <m.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: Math.min(1, Math.max(0, progressToNextKg / 100)) }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full origin-left w-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
          />
        </div>
      </div>
    </div>
  );
});
