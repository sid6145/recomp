import React, { useCallback, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { DailyMetabolicSummary } from './DailyMetabolicSummary';
import { AnimatedCounter } from './AnimatedCounter';
import { WeekendVaultCard } from './WeekendVaultCard';
import { DodgedVaultCard } from './DodgedVaultCard';
import { MaterialIcon } from './MaterialIcon';
import { useHaptics } from '../hooks/useHaptics';
import { useAppDispatch } from '../store/store';
import { openCravingRebalance } from '../store/sosSlice';
import type { LoggedEntry } from '../store/logsSlice';

export interface DiaryViewProps {
  entries: LoggedEntry[];
  targetCalories: number;
  onNavigateToSearch: () => void;
  onDeleteEntry: (id: number) => void;
}

type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';

const MEAL_CONFIG: Record<
  MealType,
  { label: string; icon: string; timeHint: string }
> = {
  Breakfast: { label: 'Breakfast', icon: 'wb_twilight', timeHint: '5:00 AM – 11:30 AM' },
  Lunch: { label: 'Lunch', icon: 'wb_sunny', timeHint: '11:30 AM – 4:30 PM' },
  Dinner: { label: 'Dinner', icon: 'dark_mode', timeHint: '4:30 PM – 10:00 PM' },
  Snacks: { label: 'Snacks & Other', icon: 'cookie', timeHint: 'Anytime' },
};

function categorizeEntryMeal(timestamp: number): MealType {
  const hour = new Date(timestamp).getHours();
  const minutes = new Date(timestamp).getMinutes();
  const timeVal = hour + minutes / 60;
  if (timeVal >= 5 && timeVal < 11.5) return 'Breakfast';
  if (timeVal >= 11.5 && timeVal < 16.5) return 'Lunch';
  if (timeVal >= 16.5 && timeVal < 22) return 'Dinner';
  return 'Snacks';
}

interface DiaryEntryRowProps {
  entry: LoggedEntry;
  onDelete: (id: number) => void;
}

const DiaryEntryRow: React.FC<DiaryEntryRowProps> = React.memo(({ entry, onDelete }) => {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.15 }}
      className="min-h-[64px] p-3 rounded-[20px] bg-[var(--md-surface-container)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] transition-colors duration-150 flex items-center justify-between gap-3 m3-state-layer"
    >
      {/* 40px Circular Tonal Icon */}
      <div className="w-10 h-10 rounded-full bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] flex items-center justify-center shrink-0">
        <MaterialIcon name="restaurant" size={20} />
      </div>

      {/* Middle: Food Identity, Portion, and Time */}
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-[var(--md-on-surface)] truncate font-display">
            {entry.foodName}
          </h4>
          <span className="text-[11px] font-mono text-[var(--md-on-surface-variant)] tabular-nums shrink-0">
            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <p className="text-xs text-[var(--md-on-surface-variant)] font-sans flex items-center gap-1.5">
          <span>
            <strong className="font-mono tabular-nums text-[var(--md-on-surface)]">{entry.quantity}</strong>{' '}
            {entry.selectedUnit}
          </span>
        </p>

        {/* Macro pill summary */}
        {entry.calculatedMacros && (
          <div className="flex gap-2 text-[10px] font-mono tabular-nums pt-0.5">
            <span className="text-[var(--md-primary)] font-bold">
              P: {entry.calculatedMacros.protein}g
            </span>
            <span className="text-[var(--md-secondary)] font-bold">
              C: {entry.calculatedMacros.carbs}g
            </span>
            <span className="text-[var(--md-tertiary)] font-bold">
              F: {entry.calculatedMacros.fats}g
            </span>
          </div>
        )}
      </div>

      {/* Right: Calories + Protein Pill + Delete Button */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex flex-col items-end">
          <span className="text-base font-bold font-mono text-[var(--md-primary)] tabular-nums">
            <AnimatedCounter value={entry.totalCalories} /> kcal
          </span>
          {entry.calculatedMacros && entry.calculatedMacros.protein > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] tabular-nums mt-0.5">
              {entry.calculatedMacros.protein}g protein
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          className="min-h-[44px] min-w-[44px] rounded-full text-[var(--md-on-surface-variant)] hover:text-[var(--md-error)] hover:bg-[var(--md-error-container)]/30 flex items-center justify-center transition-colors m3-state-layer active:scale-95 cursor-pointer"
          title="Delete log entry"
          aria-label={`Delete ${entry.foodName}`}
        >
          <MaterialIcon name="delete" size={20} />
        </button>
      </div>
    </m.div>
  );
});

DiaryEntryRow.displayName = 'DiaryEntryRow';

export const DiaryView: React.FC<DiaryViewProps> = React.memo(({
  entries,
  targetCalories,
  onNavigateToSearch,
  onDeleteEntry,
}) => {
  const haptics = useHaptics();
  const dispatch = useAppDispatch();

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

  const handleDelete = useCallback((id: number) => {
    haptics.tick();
    onDeleteEntry(id);
  }, [haptics, onDeleteEntry]);

  // Group entries by Meal
  const groupedMeals = useMemo(() => {
    const groups: Record<MealType, LoggedEntry[]> = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
      Snacks: [],
    };
    for (const entry of entries) {
      const meal = categorizeEntryMeal(entry.timestamp);
      groups[meal].push(entry);
    }
    return groups;
  }, [entries]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-[calc(100px+env(safe-area-inset-bottom,0px))]">
      {/* 1. TOP HERO: Z-Axis Flip Card (Summary <-> Telemetry Heatmap) */}
      <DailyMetabolicSummary
        remainingCalories={remainingCalories}
        totalConsumed={totalConsumed}
        totalProtein={totalProtein}
        totalCarbs={totalCarbs}
        totalFats={totalFats}
        targetCalories={targetCalories}
      />

      {/* 2. BEHAVIORAL GAMIFICATION BENTO ROW (2-Column Grid, gap-3) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <WeekendVaultCard />
        <DodgedVaultCard />
      </div>

      {/* 3. FOOD DIARY MEAL SECTIONS */}
      <div className="space-y-4">
        {/* Diary Controls Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm uppercase font-display tracking-wider text-[var(--md-on-surface-variant)] font-bold">
              Food Diary
            </h3>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] tabular-nums font-semibold">
              {entries.length} {entries.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                haptics.tick();
                dispatch(openCravingRebalance());
              }}
              className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-display font-semibold rounded-full bg-[var(--md-tertiary-container)] text-[var(--md-on-tertiary-container)] transition-all active:scale-95 cursor-pointer shadow-sm m3-state-layer"
              title="Eat a craving and deterministically rebalance your dinner"
            >
              <MaterialIcon name="auto_fix_high" size={16} />
              <span>Rebalance Craving</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {entries.length === 0 ? (
          <div className="py-14 rounded-[28px] text-center space-y-3 bg-[var(--md-surface-container-low)] text-[var(--md-on-surface)] transition-colors duration-300">
            <div className="w-12 h-12 rounded-full bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] flex items-center justify-center mx-auto">
              <MaterialIcon name="restaurant" size={24} />
            </div>
            <p className="text-sm font-semibold font-display">
              No entries logged for today.
            </p>
            <p className="text-xs text-[var(--md-on-surface-variant)] max-w-xs mx-auto font-sans">
              Search and add foods you&apos;ve eaten to track your daily calories and macros.
            </p>
            <button
              type="button"
              onClick={() => {
                haptics.tick();
                onNavigateToSearch();
              }}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-display font-bold bg-[var(--md-primary)] text-[var(--md-on-primary)] shadow-md active:scale-95 m3-state-layer cursor-pointer"
            >
              <MaterialIcon name="search" size={18} />
              <span>Search Foods</span>
            </button>
          </div>
        ) : (
          /* Populated 4 Meal Section Cards (Breakfast, Lunch, Dinner, Snacks) */
          <div className="space-y-4">
            {(['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const).map((mealType) => {
              const mealEntries = groupedMeals[mealType];
              const mealCalories = mealEntries.reduce((acc, curr) => acc + (curr.totalCalories || 0), 0);
              const config = MEAL_CONFIG[mealType];

              return (
                <div
                  key={mealType}
                  className="rounded-[24px] bg-[var(--md-surface-container-low)] text-[var(--md-on-surface)] p-4 sm:p-5 shadow-sm space-y-3 transition-colors duration-300"
                >
                  {/* Meal Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[var(--md-surface-container-high)] text-[var(--md-primary)] flex items-center justify-center">
                        <MaterialIcon name={config.icon} size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold font-display tracking-tight text-[var(--md-on-surface)]">
                          {config.label}
                        </h4>
                        <span className="text-[11px] text-[var(--md-on-surface-variant)] font-sans">
                          {config.timeHint}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[var(--md-on-surface)] tabular-nums">
                        {mealCalories} kcal
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          haptics.tick();
                          onNavigateToSearch();
                        }}
                        className="w-8 h-8 rounded-full bg-[var(--md-surface-container-high)] text-[var(--md-primary)] flex items-center justify-center transition-transform active:scale-90 m3-state-layer cursor-pointer"
                        title={`Add to ${config.label}`}
                        aria-label={`Add food to ${config.label}`}
                      >
                        <MaterialIcon name="add" size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Meal Entries or subtle empty hint */}
                  {mealEntries.length === 0 ? (
                    <div className="py-2 px-3 text-xs text-[var(--md-on-surface-variant)]/60 font-sans italic">
                      No items logged for {config.label.toLowerCase()} yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence initial={false}>
                        {mealEntries.map((entry) => (
                          <DiaryEntryRow
                            key={entry.id}
                            entry={entry}
                            onDelete={handleDelete}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

DiaryView.displayName = 'DiaryView';
