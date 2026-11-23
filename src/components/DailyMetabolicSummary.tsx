import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { m } from 'framer-motion';
import { AnimatedCounter } from './AnimatedCounter';
import { Heatmap } from './Heatmap';
import { MaterialIcon } from './MaterialIcon';
import { useHaptics } from '../hooks/useHaptics';
import { CinematicTransition } from '../utils/motionPresets';
import { calculateCurrentWeekBank, type CalorieBankState } from '../utils/calorieBank';
import { fetchHeatmapLogs, type DailyCaloriesMap } from '../db/heatmapData';
import { useAppSelector } from '../store/store';

export interface DailyMetabolicSummaryProps {
  remainingCalories: number;
  totalConsumed: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  targetCalories: number;
  status?: 'deficit' | 'surplus';
}

/**
 * Material Design 3 Hero Calorie & Macro Summary Card (DailyMetabolicSummary.tsx)
 *
 * M3 Spec:
 * - Container: rounded-[28px], --md-surface-container, p-5 sm:p-6
 * - M3 Circular Progress Indicator (140px diameter, 14px stroke, stroke-linecap: round)
 *   showing Calories Remaining in tabular numerals at center, with --md-surface-container-highest track and --md-primary arc.
 * - Three M3 Linear Progress Indicators (8px height, rounded-full) for Protein, Carbs, and Fats showing current / target g.
 * - Retains 3D perspective Y-axis flip to 52-Week Longitudinal Matrix (Heatmap).
 */
export const DailyMetabolicSummary: React.FC<DailyMetabolicSummaryProps> = React.memo(({
  remainingCalories,
  totalConsumed,
  totalProtein,
  totalCarbs,
  totalFats,
  targetCalories,
  status: statusProp,
}) => {
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [caloriesByDate, setCaloriesByDate] = useState<DailyCaloriesMap>({});
  const haptics = useHaptics();
  const userProfile = useAppSelector((state) => state.user);

  // Targets for macros
  const targetProtein = userProfile.proteinTarget || Math.round((targetCalories * 0.3) / 4);
  const targetCarbs = Math.round((targetCalories * 0.45) / 4);
  const targetFats = Math.round((targetCalories * 0.25) / 9);

  // Load heatmap data for calorie bank calculation
  useEffect(() => {
    let isMounted = true;
    fetchHeatmapLogs().then((data) => {
      if (isMounted) setCaloriesByDate(data);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const bankState: CalorieBankState = useMemo(() => {
    return calculateCurrentWeekBank(caloriesByDate, targetCalories, new Date());
  }, [caloriesByDate, targetCalories]);

  const rawSurplus = statusProp ? statusProp === 'surplus' : remainingCalories < 0;
  const isWeekendOverageCovered =
    bankState.isWeekend && rawSurplus && totalConsumed <= targetCalories + bankState.bankedCalories;

  const isSurplus = rawSurplus && !isWeekendOverageCovered;
  const currentStatus = statusProp ?? (isSurplus ? 'surplus' : 'deficit');

  const handleFlipToTelemetry = useCallback(() => {
    haptics.tick();
    setIsFlipped(true);
  }, [haptics]);

  const handleFlipToSummary = useCallback(() => {
    haptics.tick();
    setIsFlipped(false);
  }, [haptics]);

  // Circular progress math (140px diameter, 14px stroke -> radius = 70 - 7 = 63, circumference = 2 * pi * 63 = ~395.84)
  const radius = 63;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.min(1, Math.max(0, totalConsumed / (targetCalories || 1)));
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <section aria-label="Daily Metabolic Telemetry" className="w-full [perspective:1200px] select-none touch-pan-y">
      <m.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={CinematicTransition}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-full"
      >
        {/* ============================================================ */}
        {/* FRONT FACE: Hero Calorie & Macro Summary Card               */}
        {/* ============================================================ */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          className={`relative w-full rounded-[28px] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] p-5 sm:p-6 overflow-hidden space-y-6 shadow-md transition-colors duration-300 ${
            isFlipped ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        >
          {/* Header Row: Calorie Balance & Flip Trigger */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--md-outline-variant)]/20 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-medium bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)]">
                  <MaterialIcon
                    name="nutrition"
                    size={16}
                    className={currentStatus === 'surplus' ? 'text-[var(--md-error)]' : 'text-[var(--md-primary)]'}
                  />
                  <span>Calorie Balance</span>
                </div>

                {bankState.isWeekend && bankState.bankedCalories > 0 && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-display font-semibold bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]">
                    <MaterialIcon name="savings" size={16} />
                    <span>Spend from Bank: +{bankState.bankedCalories} kcal</span>
                  </div>
                )}

                {isWeekendOverageCovered && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-display font-semibold bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]">
                    <MaterialIcon name="shield" size={16} filled />
                    <span>Bank Protected</span>
                  </div>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--md-on-surface)] font-display">
                Daily Calorie Diary
              </h2>
              <p className="text-xs text-[var(--md-on-surface-variant)] font-sans mt-0.5">
                Target:{' '}
                <span data-testid="target-calories-value" className="font-mono text-[var(--md-on-surface)] font-bold tabular-nums">
                  {targetCalories} kcal
                </span>
                {bankState.isWeekend && bankState.bankedCalories > 0 && (
                  <span className="font-mono text-[var(--md-secondary)] ml-1.5 tabular-nums">
                    (+{bankState.bankedCalories} bank buffer)
                  </span>
                )}
              </p>
            </div>

            {/* View Telemetry Button (Tonal Button, min 44x44px touch target) */}
            <button
              type="button"
              onClick={handleFlipToTelemetry}
              className="inline-flex min-h-[44px] items-center gap-2 px-4 py-2 rounded-full text-xs font-display font-semibold bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-highest)] transition-colors active:scale-95 m3-state-layer cursor-pointer shadow-sm self-start sm:self-auto"
              title="Flip to 52-Week Longitudinal Matrix"
            >
              <MaterialIcon name="query_stats" size={18} className="text-[var(--md-primary)]" />
              <span>View Telemetry</span>
              <MaterialIcon name="arrow_forward" size={16} />
            </button>
          </div>

          {/* Bento Center: Circular Progress Ring + Macros Linear Progress */}
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 py-2">
            {/* 1. M3 Circular Progress Indicator (140px diameter, 14px stroke, stroke-linecap: round) */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="relative w-[140px] h-[140px] flex items-center justify-center">
                <svg className="w-[140px] h-[140px] transform -rotate-90" viewBox="0 0 140 140">
                  {/* Track: --md-surface-container-highest */}
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="transparent"
                    stroke="var(--md-surface-container-highest)"
                    strokeWidth="14"
                  />
                  {/* Arc: --md-primary / --md-error */}
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="transparent"
                    stroke={
                      isSurplus
                        ? 'var(--md-error)'
                        : isWeekendOverageCovered
                        ? 'var(--md-secondary)'
                        : 'var(--md-primary)'
                    }
                    strokeWidth="14"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-[stroke-dashoffset] duration-700 ease-out"
                  />
                </svg>

                {/* Tabular Numerals at Center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                  <span className="text-[10px] uppercase font-display font-semibold text-[var(--md-on-surface-variant)] tracking-tight">
                    {isWeekendOverageCovered
                      ? 'Covered'
                      : isSurplus
                      ? 'Surplus'
                      : 'Remaining'}
                  </span>
                  <div className="flex items-baseline justify-center gap-0.5 text-[#00FF41] text-[var(--md-primary)]">
                    <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight tabular-nums">
                      <AnimatedCounter value={Math.abs(remainingCalories)} />
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase font-bold text-[var(--md-on-surface-variant)] tabular-nums">
                    kcal
                  </span>
                </div>
              </div>

              <div className="mt-2 text-center text-xs font-mono text-[var(--md-on-surface-variant)] tabular-nums">
                Consumed: <strong className="text-[var(--md-on-surface)] tabular-nums">{totalConsumed}</strong> / {targetCalories} kcal
              </div>
            </div>

            {/* 2. Three M3 Linear Progress Indicators (8px height, rounded-full) for Protein, Carbs, Fats */}
            <div className="flex-1 w-full space-y-4">
              {/* Protein Linear Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline text-xs font-display">
                  <span className="font-semibold text-[var(--md-on-surface)] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--md-primary)]" />
                    Protein
                  </span>
                  <span className="font-mono text-xs tabular-nums text-[var(--md-on-surface-variant)]">
                    <strong className="text-[var(--md-on-surface)]">{Math.round(totalProtein)}g</strong> / {targetProtein}g
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--md-surface-container-highest)] overflow-hidden">
                  <m.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: Math.min(1, totalProtein / (targetProtein || 1)) }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full origin-left rounded-full bg-[var(--md-primary)]"
                  />
                </div>
              </div>

              {/* Carbs Linear Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline text-xs font-display">
                  <span className="font-semibold text-[var(--md-on-surface)] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--md-secondary)]" />
                    Carbohydrates
                  </span>
                  <span className="font-mono text-xs tabular-nums text-[var(--md-on-surface-variant)]">
                    <strong className="text-[var(--md-on-surface)]">{Math.round(totalCarbs)}g</strong> / {targetCarbs}g
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--md-surface-container-highest)] overflow-hidden">
                  <m.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: Math.min(1, totalCarbs / (targetCarbs || 1)) }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full origin-left rounded-full bg-[var(--md-secondary)]"
                  />
                </div>
              </div>

              {/* Fats Linear Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline text-xs font-display">
                  <span className="font-semibold text-[var(--md-on-surface)] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--md-tertiary)]" />
                    Healthy Fats
                  </span>
                  <span className="font-mono text-xs tabular-nums text-[var(--md-on-surface-variant)]">
                    <strong className="text-[var(--md-on-surface)]">{Math.round(totalFats)}g</strong> / {targetFats}g
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--md-surface-container-highest)] overflow-hidden">
                  <m.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: Math.min(1, totalFats / (targetFats || 1)) }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full origin-left rounded-full bg-[var(--md-tertiary)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* BACK FACE: 52-Week Longitudinal Matrix (Heatmap)             */}
        {/* ============================================================ */}
        <div
          aria-label="52-Week Longitudinal Matrix"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          className={`absolute inset-0 w-full rounded-[28px] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] p-5 sm:p-6 shadow-md flex flex-col justify-between overflow-hidden touch-pan-y transition-colors duration-300 ${
            isFlipped ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
        >
          <Heatmap onBack={handleFlipToSummary} />
        </div>
      </m.div>
    </section>
  );
});

DailyMetabolicSummary.displayName = 'DailyMetabolicSummary';
