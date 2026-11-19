import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PiggyBank, Sparkles, ShieldCheck } from 'lucide-react';
import {
  calculateCurrentWeekBank,
  syncBankTelemetry,
  type CalorieBankState,
} from '../utils/calorieBank';
import { fetchHeatmapLogs, type DailyCaloriesMap } from '../db/heatmapData';
import { useAppSelector } from '../store/store';
import { useMomentum } from '../context/MomentumContext';
import { AnimatedNumber } from './AnimatedNumber';

export const WeekendVaultCard: React.FC = () => {
  const targetCalories = useAppSelector((state) => state.user.dailyCaloricTarget);
  const logEntries = useAppSelector((state) => state.logs.entries);
  const { isOverdrive } = useMomentum();

  const [caloriesByDate, setCaloriesByDate] = useState<DailyCaloriesMap>({});

  useEffect(() => {
    let isMounted = true;
    fetchHeatmapLogs().then((data) => {
      if (isMounted) setCaloriesByDate(data);
    });
    return () => {
      isMounted = false;
    };
  }, [logEntries]);

  const bankState: CalorieBankState = useMemo(() => {
    return calculateCurrentWeekBank(caloriesByDate, targetCalories, new Date());
  }, [caloriesByDate, targetCalories]);

  // Sync bank telemetry to Dexie whenever bank updates
  useEffect(() => {
    syncBankTelemetry(bankState.bankedCalories, bankState.spentThisWeekend);
  }, [bankState.bankedCalories, bankState.spentThisWeekend]);

  const fillPercentage = Math.min(
    100,
    Math.round((bankState.totalEarnedThisWeek / bankState.maxWeeklyCapacity) * 100)
  );

  return (
    <div
      className={`w-full h-full flex flex-col justify-between p-5 rounded-2xl bg-[var(--surface-card)] backdrop-blur-xl border border-[var(--surface-border)] shadow-[var(--surface-highlight),var(--accent-glow)] transition-all duration-500 hover:border-white/10 ${
        isOverdrive ? 'ring-1 ring-emerald-400/30' : ''
      }`}
    >
      {/* Top Section: Header, Subtitle, Balance & Progress */}
      <div>
        {/* Header Row: Clean 2-Column Layout */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Icon box + Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <PiggyBank className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold tracking-wide uppercase text-zinc-100 whitespace-nowrap font-mono truncate">
              Weekend Bank
            </h3>
          </div>

          {/* Right: Status Pill */}
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-mono whitespace-nowrap shrink-0 border ${
              bankState.isWeekend
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
            }`}
          >
            {bankState.isWeekend ? 'Spend Mode' : 'Auto-Sweep'}
          </span>
        </div>

        {/* Subtitle directly below */}
        <p className="text-xs text-zinc-400 truncate mt-1.5 font-sans">
          {bankState.isWeekend
            ? 'Sat & Sun overages draw from this balance first'
            : 'Unused weekday deficit banked for weekend flexibility'}
        </p>

        {/* Hero Balance Row */}
        <div className="flex items-baseline justify-between mt-4 pt-3 border-t border-white/5">
          <span className="text-xs text-zinc-400 uppercase font-mono">Available Balance</span>
          <div className="flex items-baseline">
            <AnimatedNumber
              value={bankState.bankedCalories}
              prefix="+"
              className={`text-2xl font-mono font-bold tabular-nums text-emerald-400 ${
                isOverdrive ? 'drop-shadow-[0_0_10px_rgba(52,211,153,0.45)]' : ''
              }`}
            />
            <span className="text-xs text-emerald-400/70 font-mono ml-1">kcal</span>
          </div>
        </div>

        {/* Progress Bar & Accumulation Info */}
        <div className="mt-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>Weekly Accumulation</span>
            </span>
            <span className="tabular-nums text-zinc-300">
              {bankState.totalEarnedThisWeek} / {bankState.maxWeeklyCapacity} kcal
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-zinc-950/80 border border-white/5 overflow-hidden p-0">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${fillPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
            />
          </div>
        </div>
      </div>

      {/* Bottom Section: Mon–Fri Strip (mt-auto pt-4) */}
      <div className="mt-auto pt-4">
        <div className="grid grid-cols-5 gap-2">
          {bankState.weekdaySweeps.map((sweep) => (
            <div
              key={sweep.dayName}
              className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                sweep.sweptCalories > 0
                  ? 'bg-zinc-950/70 border-emerald-500/30'
                  : sweep.isPastOrToday
                  ? 'bg-zinc-950/50 border-white/5'
                  : 'bg-zinc-950/20 border-white/5 opacity-40'
              }`}
            >
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
                {sweep.dayName}
              </span>
              <span
                className={`text-xs font-mono font-bold mt-0.5 tabular-nums ${
                  sweep.sweptCalories > 0
                    ? 'text-emerald-400'
                    : sweep.isPastOrToday
                    ? 'text-zinc-500'
                    : 'text-zinc-600'
                }`}
              >
                {sweep.sweptCalories > 0 ? `+${sweep.sweptCalories}` : '-'}
              </span>
            </div>
          ))}
        </div>

        {/* Weekend Spending Notice if applicable */}
        {bankState.isWeekend && bankState.spentThisWeekend > 0 && (
          <div className="mt-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs font-mono text-amber-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Weekend deficit spent:</span>
            </span>
            <span className="font-bold tabular-nums">-{bankState.spentThisWeekend} kcal</span>
          </div>
        )}
      </div>
    </div>
  );
};
