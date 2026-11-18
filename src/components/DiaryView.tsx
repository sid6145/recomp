import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Flame, Trash2, Scale } from 'lucide-react';
import { DailyMetabolicSummary } from './DailyMetabolicSummary';
import { AnimatedCounter } from './AnimatedCounter';
import { useHaptics } from '../hooks/useHaptics';
import type { LoggedEntry } from '../store/logsSlice';

export interface DiaryViewProps {
  entries: LoggedEntry[];
  targetCalories: number;
  onNavigateToSearch: () => void;
  onDeleteEntry: (id: number) => void;
}

/**
 * Mobile-First Daily Diary View.
 * Top Half: Z-Axis Flip Card (DailyMetabolicSummary <-> 52-Week Longitudinal Matrix).
 * Bottom Half: High-density Logged Foods List.
 */
export const DiaryView: React.FC<DiaryViewProps> = ({
  entries,
  targetCalories,
  onNavigateToSearch,
  onDeleteEntry,
}) => {
  const haptics = useHaptics();

  const totalConsumed = entries.reduce(
    (acc, curr) => acc + (curr.totalCalories || 0),
    0
  );
  const remainingCalories = targetCalories - totalConsumed;

  const totalProtein = entries.reduce(
    (acc, curr) => acc + (curr.calculatedMacros?.protein || 0),
    0
  );
  const totalCarbs = entries.reduce(
    (acc, curr) => acc + (curr.calculatedMacros?.carbs || 0),
    0
  );
  const totalFats = entries.reduce(
    (acc, curr) => acc + (curr.calculatedMacros?.fats || 0),
    0
  );

  const handleDelete = (id: number) => {
    haptics.tick();
    onDeleteEntry(id);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-[calc(100px+env(safe-area-inset-bottom,0px))]">
      {/* ============================================================ */}
      {/* TOP HALF: Z-Axis Flip Card (Summary <-> Telemetry Heatmap)   */}
      {/* ============================================================ */}
      <DailyMetabolicSummary
        remainingCalories={remainingCalories}
        totalConsumed={totalConsumed}
        totalProtein={totalProtein}
        totalCarbs={totalCarbs}
        totalFats={totalFats}
        targetCalories={targetCalories}
      />

      {/* ============================================================ */}
      {/* BOTTOM HALF: Today's Logged Foods List                       */}
      {/* ============================================================ */}
      <div className="space-y-3">
        {/* Section Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs uppercase font-mono tracking-wider text-neutral-400 font-bold">
              Today&apos;s Foods
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-300 tabular-nums">
              {entries.length} items
            </span>
          </div>

          <motion.button
            type="button"
            onClick={() => {
              haptics.tick();
              onNavigateToSearch();
            }}
            whileTap={{ scale: 0.95 }}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Entry</span>
          </motion.button>
        </div>

        {/* Empty State */}
        {entries.length === 0 ? (
          <div className="py-14 border border-dashed border-white/10 rounded-3xl text-center space-y-3 bg-neutral-900/30 backdrop-blur-sm">
            <Flame className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-sm font-medium text-neutral-300 font-sans">
              No entries logged for today.
            </p>
            <p className="text-xs text-neutral-500 font-sans max-w-xs mx-auto">
              Search and add foods you&apos;ve eaten to track your daily calories.
            </p>
            <motion.button
              type="button"
              onClick={() => {
                haptics.tick();
                onNavigateToSearch();
              }}
              whileTap={{ scale: 0.96 }}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              Search Foods
            </motion.button>
          </div>
        ) : (
          /* Populated Entries List */
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  layout="position"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  className="group p-4 rounded-2xl bg-neutral-900/70 hover:bg-neutral-900 border border-white/5 hover:border-white/10 flex items-center justify-between gap-4 transition-all touch-pan-y"
                >
                  {/* Left: Food Identity and Portion */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-neutral-100 group-hover:text-[#00FF41] transition-colors truncate font-sans">
                        {entry.foodName}
                      </h4>
                      <span className="text-[10px] font-mono text-neutral-500 tabular-nums">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 font-sans flex items-center gap-1.5">
                      <Scale className="w-3 h-3 text-neutral-500" />
                      <span>
                        <span className="font-mono tabular-nums">{entry.quantity}</span> {entry.selectedUnit}
                      </span>
                    </p>

                    {/* Macro pills */}
                    {entry.calculatedMacros && (
                      <div className="flex gap-2 text-[10px] font-mono tabular-nums pt-0.5">
                        <span className="text-rose-400 font-medium">
                          P: {entry.calculatedMacros.protein}g
                        </span>
                        <span className="text-cyan-400 font-medium">
                          C: {entry.calculatedMacros.carbs}g
                        </span>
                        <span className="text-amber-400 font-medium">
                          F: {entry.calculatedMacros.fats}g
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Calories & Delete Button */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-base font-bold font-mono text-[#00FF41] tabular-nums shadow-[0_0_12px_rgba(0,255,65,0.15)]">
                      <AnimatedCounter value={entry.totalCalories} /> kcal
                    </span>
                    <motion.button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      whileTap={{ scale: 0.9 }}
                      className="min-h-[44px] min-w-[44px] p-2 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800/80 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                      title="Delete log entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
