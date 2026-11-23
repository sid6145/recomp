import React, { useEffect, useState, useMemo } from 'react';
import { m } from 'framer-motion';
import { MaterialIcon } from './MaterialIcon';
import {
  calculateCurrentWeekBank,
  syncBankTelemetry,
  type CalorieBankState,
} from '../utils/calorieBank';
import { fetchHeatmapLogs, type DailyCaloriesMap } from '../db/heatmapData';
import { useAppSelector } from '../store/store';
import { useMomentum } from '../context/MomentumContext';
import { AnimatedNumber } from './AnimatedNumber';

export const WeekendVaultCard: React.FC = React.memo(() => {
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
      className={`w-full h-full flex flex-col justify-between p-5 rounded-[24px] bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] shadow-md transition-colors duration-300 ${
        isOverdrive ? 'ring-2 ring-[var(--md-primary)]' : ''
      }`}
    >
      {/* Top Section: Header, Subtitle, Balance & Progress */}
      <div>
        {/* Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-[var(--md-surface)]/20 text-[var(--md-on-secondary-container)]">
              <MaterialIcon name="savings" size={22} filled />
            </div>
            <h3 className="text-sm font-bold tracking-tight uppercase font-display truncate">
              Weekend Bank
            </h3>
          </div>

          <span className="px-3 py-1 rounded-full text-[11px] font-display font-semibold whitespace-nowrap shrink-0 bg-[var(--md-surface)]/20 text-[var(--md-on-secondary-container)]">
            {bankState.isWeekend ? 'Spend Mode' : 'Auto-Sweep'}
          </span>
        </div>

        {/* Subtitle */}
        <p className="text-xs opacity-80 truncate mt-2 font-sans">
          {bankState.isWeekend
            ? 'Sat & Sun overages draw from this balance first'
            : 'Unused weekday deficit banked for weekend flexibility'}
        </p>

        {/* Hero Balance Row */}
        <div className="flex items-baseline justify-between mt-4 pt-3 border-t border-[var(--md-on-secondary-container)]/10">
          <span className="text-xs uppercase font-display font-semibold opacity-75">
            Available Balance
          </span>
          <div className="flex items-baseline">
            <AnimatedNumber
              value={bankState.bankedCalories}
              prefix="+"
              className="text-2xl font-mono font-bold tabular-nums"
            />
            <span className="text-xs font-mono ml-1 opacity-75">kcal</span>
          </div>
        </div>

        {/* M3 Segmented Progress Bar & Accumulation Info */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono opacity-85">
            <span className="flex items-center gap-1.5 font-display text-xs">
              <MaterialIcon name="bolt" size={14} filled />
              <span>Weekly Accumulation</span>
            </span>
            <span className="tabular-nums font-bold">
              {bankState.totalEarnedThisWeek} / {bankState.maxWeeklyCapacity} kcal
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-[var(--md-surface)]/20 overflow-hidden">
            <m.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: Math.min(1, Math.max(0, fillPercentage / 100)) }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full origin-left w-full rounded-full bg-[var(--md-primary)]"
            />
          </div>
        </div>
      </div>

      {/* Bottom Section: Mon–Fri Strip */}
      <div className="mt-auto pt-4">
        <div className="grid grid-cols-5 gap-1.5">
          {bankState.weekdaySweeps.map((sweep) => (
            <div
              key={sweep.dayName}
              className={`py-2 px-1 rounded-[16px] flex flex-col items-center justify-center text-center transition-all ${
                sweep.sweptCalories > 0
                  ? 'bg-[var(--md-surface)]/25 font-bold'
                  : sweep.isPastOrToday
                  ? 'bg-[var(--md-surface)]/10 opacity-70'
                  : 'bg-[var(--md-surface)]/5 opacity-40'
              }`}
            >
              <span className="text-[10px] font-display font-bold uppercase">
                {sweep.dayName}
              </span>
              <span className="text-xs font-mono font-bold mt-0.5 tabular-nums">
                {sweep.sweptCalories > 0 ? `+${sweep.sweptCalories}` : '-'}
              </span>
            </div>
          ))}
        </div>

        {bankState.isWeekend && bankState.spentThisWeekend > 0 && (
          <div className="mt-2.5 p-2 rounded-[16px] bg-[var(--md-surface)]/20 flex items-center justify-between text-xs font-mono">
            <span className="flex items-center gap-1.5 font-display font-medium">
              <MaterialIcon name="shield" size={16} filled />
              <span>Weekend spent:</span>
            </span>
            <span className="font-bold tabular-nums">-{bankState.spentThisWeekend} kcal</span>
          </div>
        )}
      </div>
    </div>
  );
});

WeekendVaultCard.displayName = 'WeekendVaultCard';
