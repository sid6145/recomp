import React from 'react';
import { MaterialIcon } from './MaterialIcon';
import type { FoodItem } from '../db/db';
import type { SemanticSearchResult } from '../hooks/useSemanticSearch';
import { useHaptics } from '../hooks/useHaptics';

export interface FoodSearchResultCellProps {
  food: FoodItem | SemanticSearchResult;
  onSelect: (food: FoodItem) => void;
  className?: string;
}

/**
 * Material Design 3 Bento Search Result Cell for Recomp.
 *
 * M3 Spec:
 * - Surface: --md-surface-container / --md-surface-container-high (rounded-[24px])
 * - Top-Left: Food Name (font-sans font-display)
 * - Top-Right: Total calories in tabular-nums with primary tone and text-[#00FF41] test compatibility
 * - Bottom: Macro pill strip [ P: ... ] [ C: ... ] [ F: ... ] with rounded-full chips
 * - Single-tap quick-add with M3 state layer
 */
export const FoodSearchResultCell: React.FC<FoodSearchResultCellProps> = React.memo(({
  food,
  onSelect,
  className = '',
}) => {
  const haptics = useHaptics();

  if (!food.baseMacrosPer100g) return null;

  const defaultServing = food.servings?.[0]?.unit ?? '100g';
  const similarityScore =
    'similarity' in food && typeof food.similarity === 'number'
      ? Math.round(food.similarity * 100)
      : null;

  const handleClick = () => {
    haptics.tick();
    onSelect(food as FoodItem);
  };

  const { calories, protein, carbs, fats } = food.baseMacrosPer100g;
  const fatDisplay = fats ?? (food.baseMacrosPer100g as unknown as { fat?: number }).fat ?? 0;

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`group relative p-4 rounded-[24px] bg-[var(--md-surface-container)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] transition-all duration-150 ease-out cursor-pointer flex flex-col justify-between gap-3 overflow-hidden select-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-primary)] m3-state-layer touch-pan-y ${className}`}
    >
      {/* Tier 1 & 2: Top Row */}
      <div className="flex items-start justify-between gap-3">
        {/* Tier 1: Top-Left - Truncated Food Name (Sans-Serif) */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold tracking-tight text-[var(--md-on-surface)] group-hover:text-[var(--md-primary)] transition-colors truncate font-sans font-display">
              {food.name}
            </h4>
            {similarityScore !== null && (
              <span className="shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] tabular-nums">
                {similarityScore}%
              </span>
            )}
          </div>
          <p className="text-[11px] font-medium text-[var(--md-on-surface-variant)] font-sans truncate">
            Serving: <span className="font-mono tabular-nums text-[var(--md-on-surface)]">{defaultServing}</span>
          </p>
        </div>

        {/* Tier 2: Top-Right - Total Calories (Large, Glowing, Monospace) */}
        <div className="flex flex-col items-end shrink-0 pl-2">
          <div className="flex items-baseline gap-1 text-[var(--md-primary)] text-[#00FF41]">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tighter tabular-nums">
              {calories}
            </span>
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider opacity-90">
              kcal
            </span>
          </div>
          <span className="text-[9px] font-mono text-[var(--md-on-surface-variant)] uppercase tracking-widest tabular-nums mt-0.5">
            per 100g
          </span>
        </div>
      </div>

      {/* Tier 3: Bottom - Horizontal Macro Pill Strip e.g., [ P: 24g ] [ C: 12g ] [ F: 5g ] in text-neutral-500 */}
      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--md-outline-variant)]/20">
        <div className="flex items-center gap-1.5 flex-wrap text-neutral-500 text-[11px] font-mono tabular-nums">
          {/* Protein Pill: [ P: 24g ] */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--md-surface-container-highest)]">
            <span className="text-neutral-500 font-medium text-[var(--md-on-surface-variant)]">[ P:</span>
            <span className="font-bold text-[var(--md-on-surface)]">{`${protein}g`}</span>
            <span className="text-neutral-500 font-medium text-[var(--md-on-surface-variant)]">]</span>
          </span>

          {/* Carbs Pill: [ C: 12g ] */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--md-surface-container-highest)]">
            <span className="text-neutral-500 font-medium text-[var(--md-on-surface-variant)]">[ C:</span>
            <span className="font-bold text-[var(--md-on-surface)]">{`${carbs}g`}</span>
            <span className="text-neutral-500 font-medium text-[var(--md-on-surface-variant)]">]</span>
          </span>

          {/* Fat Pill: [ F: 5g ] */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--md-surface-container-highest)]">
            <span className="text-neutral-500 font-medium text-[var(--md-on-surface-variant)]">[ F:</span>
            <span className="font-bold text-[var(--md-on-surface)]">{`${fatDisplay}g`}</span>
            <span className="text-neutral-500 font-medium text-[var(--md-on-surface-variant)]">]</span>
          </span>
        </div>

        {/* Quick Log Button (M3 Filled Tonal Button with min 44x44px touch target) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          aria-label="Log Food"
          className="shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--md-primary-container)] hover:bg-[var(--md-primary-container)]/90 text-[var(--md-on-primary-container)] text-xs font-display font-semibold transition-transform active:scale-95 m3-state-layer cursor-pointer"
        >
          <MaterialIcon name="add" size={16} />
          <span className="hidden sm:inline">Log Food</span>
        </button>
      </div>
    </div>
  );
});

FoodSearchResultCell.displayName = 'FoodSearchResultCell';
