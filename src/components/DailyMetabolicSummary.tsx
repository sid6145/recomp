import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Sparkles, ArrowRight, PiggyBank, ShieldCheck } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';
import { AnimatedNumber } from './AnimatedNumber';
import { Heatmap } from './Heatmap';
import { useHaptics } from '../hooks/useHaptics';
import { CinematicTransition } from '../utils/motionPresets';
import { useMomentum } from '../context/MomentumContext';
import { calculateCurrentWeekBank, type CalorieBankState } from '../utils/calorieBank';
import { fetchHeatmapLogs, type DailyCaloriesMap } from '../db/heatmapData';

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
 * The Telemetry Card (DailyMetabolicSummary.tsx)
 *
 * Design Specification:
 * - 3D Y-Axis Flip effect using Framer Motion's `CinematicTransition` ({ duration: 1.5, ease: [0.16, 1, 0.3, 1] }).
 * - Front: Displays daily remaining calories (using AnimatedCounter) with a breathing neon/crimson radial gradient.
 *   - Deficit: Neon Matrix Green (#00FF41) with shadow-[0_0_15px_rgba(0,255,65,0.2)].
 *   - Surplus: Deep Crimson (#E60000).
 * - "View Telemetry" button initiates the 3D flip to the Back.
 * - Back: Displays the 52-Week Longitudinal Matrix (Heatmap) telemetry view.
 * - Surfaces: bg-neutral-900 with border border-white/5 (The Substrate) & bg-neutral-950 (The Void).
 * - Monospace JetBrains Mono with tabular-nums strictly applied to all metrics.
 */
export const DailyMetabolicSummary: React.FC<DailyMetabolicSummaryProps> = ({
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
  const { momentumTier, isOverdrive, springPhysics } = useMomentum();

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
  // If weekend, check if overage is covered by available bank
  const isWeekendOverageCovered =
    bankState.isWeekend && rawSurplus && totalConsumed <= targetCalories + bankState.bankedCalories;

  const isSurplus = rawSurplus && !isWeekendOverageCovered;
  const currentStatus = statusProp ?? (isSurplus ? 'surplus' : 'deficit');

  const handleFlipToTelemetry = () => {
    haptics.tick();
    setIsFlipped(true);
  };

  const handleFlipToSummary = () => {
    haptics.tick();
    setIsFlipped(false);
  };

  return (
    <section aria-label="Daily Metabolic Telemetry" className="w-full [perspective:1200px] select-none touch-pan-y">
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={CinematicTransition}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative w-full"
      >
        {/* ============================================================ */}
        {/* FRONT FACE: Daily Remaining Balance & Live Metabolic Stats   */}
        {/* ============================================================ */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          className={`relative w-full rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-card)] backdrop-blur-2xl p-6 sm:p-8 overflow-hidden space-y-6 touch-pan-y transition-all duration-500 shadow-[var(--surface-highlight),var(--accent-glow)] ${
            isOverdrive ? 'ring-1 ring-emerald-400/40 overdrive-conic-border' : ''
          } ${isFlipped ? 'pointer-events-none' : 'pointer-events-auto'}`}
        >
          {/* Overdrive Animated Conic Ambient Aura */}
          {isOverdrive && (
            <div className="pointer-events-none absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-emerald-500/25 via-cyan-400/25 to-emerald-500/25 opacity-80 blur-sm animate-pulse" />
          )}

          {/* Breathing Neon Matrix Green (#00FF41) or Deep Crimson (#E60000) Radial Gradient */}
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: currentStatus === 'surplus' ? [0.2, 0.35, 0.2] : [0.15, 0.3, 0.15],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`pointer-events-none absolute -top-28 -right-28 w-80 h-80 rounded-full blur-[100px] transform-gpu will-change-transform ${
              currentStatus === 'surplus'
                ? 'bg-[#E60000] shadow-[0_0_120px_rgba(230,0,0,0.35)]'
                : 'bg-[#00FF41] shadow-[0_0_120px_rgba(0,255,65,0.25)]'
            }`}
          />

          {/* Header Row: Calorie Balance & Flip Trigger */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-white/5 text-neutral-300 border border-white/10">
                  <Sparkles
                    className={`w-3 h-3 ${
                      currentStatus === 'surplus' ? 'text-[#E60000]' : 'text-[#00FF41]'
                    }`}
                  />
                  Calorie Balance
                </div>

                {/* Weekend Flex-Deficit: "Spend from Bank" indicator on Sat/Sun */}
                {bankState.isWeekend && bankState.bankedCalories > 0 && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                    <PiggyBank className="w-3 h-3 text-cyan-400" />
                    <span>Spend from Bank: +{bankState.bankedCalories} kcal</span>
                  </div>
                )}

                {/* Protected by Bank pill if covered */}
                {isWeekendOverageCovered && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Bank Protected</span>
                  </div>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100 font-sans">
                Daily Calorie Diary
              </h2>
              <p className="text-xs text-neutral-400 font-sans">
                Target:{' '}
                <span className="font-mono text-neutral-200 font-semibold tabular-nums">
                  {targetCalories} kcal
                </span>
                {bankState.isWeekend && bankState.bankedCalories > 0 && (
                  <span className="font-mono text-cyan-300 ml-1.5">
                    (+{bankState.bankedCalories} bank buffer)
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Remaining / Surplus Readout using AnimatedCounter */}
              <div className="flex flex-col items-start sm:items-end">
                <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 font-semibold">
                  {isWeekendOverageCovered
                    ? 'Covered by Bank:'
                    : isSurplus
                    ? 'Surplus:'
                    : 'Remaining:'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <AnimatedCounter
                    value={Math.abs(remainingCalories)}
                    className={`text-3xl sm:text-4xl font-black font-mono tracking-tight tabular-nums ${
                      isSurplus
                        ? 'text-[#E60000] drop-shadow-[0_0_15px_rgba(230,0,0,0.4)]'
                        : isWeekendOverageCovered
                        ? 'text-cyan-300 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        : 'text-[#00FF41] drop-shadow-[0_0_15px_rgba(0,255,65,0.2)] shadow-[0_0_15px_rgba(0,255,65,0.2)]'
                    } ${
                      isOverdrive
                        ? 'drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                        : momentumTier >= 1.5
                        ? 'drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                        : ''
                    }`}
                  />
                  <span
                    className={`text-xs font-mono font-bold uppercase tracking-wider ${
                      isSurplus
                        ? 'text-[#E60000]/80'
                        : isWeekendOverageCovered
                        ? 'text-cyan-300/80'
                        : 'text-[#00FF41]/80'
                    }`}
                  >
                    kcal
                  </span>
                </div>
              </div>

              {/* View Telemetry Button (triggers 3D Y-axis flip with 44px touch target) */}
              <motion.button
                type="button"
                onClick={handleFlipToTelemetry}
                whileTap={{ scale: 0.96 }}
                transition={springPhysics}
                className={`inline-flex min-h-[44px] min-w-[44px] items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 hover:text-white transition-all cursor-pointer shadow-md ${
                  isOverdrive
                    ? 'hover:border-emerald-400/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                    : ''
                }`}
                title="Flip to 52-Week Longitudinal Matrix"
              >
                <Activity className="w-4 h-4 text-[#00FF41]" />
                <span className="hidden sm:inline">View Telemetry</span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
              </motion.button>
            </div>
          </div>

          {/* Calorie Progress Meter */}
          <div className="relative z-10 space-y-2">
            <div className="flex justify-between text-xs font-mono text-neutral-400 tabular-nums">
              <span>
                Consumed:{' '}
                <strong className="text-amber-400 font-mono tabular-nums">
                  <AnimatedCounter value={totalConsumed} /> kcal
                </strong>
              </span>
              <span>
                {Math.round((totalConsumed / (targetCalories || 1)) * 100)}% of Daily Goal
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-neutral-950/80 border border-white/5 overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, (totalConsumed / (targetCalories || 1)) * 100)}%`,
                }}
                transition={{ duration: 1.0, ease: 'easeOut' }}
                className={`h-full rounded-full transition-colors ${
                  isSurplus
                    ? 'bg-[#E60000] shadow-[0_0_15px_rgba(230,0,0,0.4)]'
                    : isWeekendOverageCovered
                    ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'bg-[#00FF41] shadow-[0_0_15px_rgba(0,255,65,0.2)]'
                } ${momentumTier >= 1.5 ? 'drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]' : ''}`}
              />
            </div>
          </div>

          {/* Macro Strips (Protein, Carbs, Fats) strictly Monospace Tabular-Nums */}
          <div className="relative z-10 grid grid-cols-3 gap-3 pt-2">
            {/* Protein */}
            <div className="p-3 rounded-2xl bg-neutral-950/80 border border-white/5 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-neutral-400 font-semibold">[ P: Protein ]</span>
                <span
                  className={`text-rose-400 text-xs font-bold font-mono tabular-nums ${
                    isOverdrive ? 'drop-shadow-[0_0_8px_rgba(244,63,94,0.45)]' : ''
                  }`}
                >
                  <AnimatedNumber value={Math.round(totalProtein)} suffix="g" />
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500 tabular-nums">
                {Math.round(totalProtein * 4)} kcal
              </span>
            </div>

            {/* Carbs */}
            <div className="p-3 rounded-2xl bg-neutral-950/80 border border-white/5 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-neutral-400 font-semibold">[ C: Carbs ]</span>
                <span className="text-cyan-400 text-xs font-bold font-mono tabular-nums">
                  {Math.round(totalCarbs)}g
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500 tabular-nums">
                {Math.round(totalCarbs * 4)} kcal
              </span>
            </div>

            {/* Fats */}
            <div className="p-3 rounded-2xl bg-neutral-950/80 border border-white/5 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-neutral-400 font-semibold">[ F: Fats ]</span>
                <span className="text-amber-400 text-xs font-bold font-mono tabular-nums">
                  {Math.round(totalFats)}g
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500 tabular-nums">
                {Math.round(totalFats * 9)} kcal
              </span>
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
          className={`absolute inset-0 w-full rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-card)] backdrop-blur-2xl p-5 sm:p-6 shadow-[var(--surface-highlight),var(--accent-glow)] flex flex-col justify-between overflow-hidden touch-pan-y transition-all duration-500 ${
            isOverdrive ? 'ring-1 ring-emerald-400/40' : ''
          } ${isFlipped ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
          {isOverdrive && (
            <div className="pointer-events-none absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-emerald-500/25 via-cyan-400/25 to-emerald-500/25 opacity-80 blur-sm animate-pulse" />
          )}
          <Heatmap onBack={handleFlipToSummary} />
        </div>
      </motion.div>
    </section>
  );
};
