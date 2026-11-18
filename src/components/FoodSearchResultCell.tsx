import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import type { FoodItem } from '../db/db';
import type { SemanticSearchResult } from '../hooks/useSemanticSearch';
import { useHaptics } from '../hooks/useHaptics';
import { AgenticTransition } from '../utils/motionPresets';

export interface FoodSearchResultCellProps {
  food: FoodItem | SemanticSearchResult;
  onSelect: (food: FoodItem) => void;
  className?: string;
}

/**
 * High-Density 3-Tier Bento Grid Search Result Cell for recomp.
 *
 * Design Specification:
 * - Surface: bg-neutral-900 (The Substrate) with border border-white/5.
 * - Top-Left: Truncated food name (sans-serif Geist/Inter).
 * - Top-Right: Total calories (large, glowing #00FF41 Neon Matrix Green, monospace JetBrains Mono, tabular-nums).
 * - Bottom: Horizontal macro pill strip: e.g. [ P: 24g ] [ C: 12g ] [ F: 5g ] in text-neutral-500.
 * - Motion: Fluid Agentic spring physics for instant tactical feedback.
 */
export const FoodSearchResultCell: React.FC<FoodSearchResultCellProps> = ({
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
    <motion.div
      layout="position"
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={AgenticTransition}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`group relative p-4 rounded-xl bg-neutral-900 hover:bg-neutral-900/95 border border-white/5 hover:border-[#00FF41]/40 shadow-lg shadow-black/40 transition-colors cursor-pointer flex flex-col justify-between gap-3 overflow-hidden select-none outline-none focus-visible:ring-1 focus-visible:ring-[#00FF41] touch-pan-y ${className}`}
    >
      {/* Ambient Neon Matrix hover glow line */}
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#00FF41]/0 to-transparent group-hover:via-[#00FF41]/50 transition-all duration-300" />

      {/* Tier 1 & 2: Top Row */}
      <div className="flex items-start justify-between gap-3">
        {/* Tier 1: Top-Left - Truncated Food Name (Sans-Serif) */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold tracking-tight text-neutral-100 group-hover:text-neutral-50 transition-colors truncate font-sans">
              {food.name}
            </h4>
            {similarityScore !== null && (
              <span className="shrink-0 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/20 tabular-nums">
                {similarityScore}%
              </span>
            )}
          </div>
          <p className="text-[11px] font-medium text-neutral-400 font-sans truncate">
            Serving: <span className="text-neutral-300 font-mono tabular-nums">{defaultServing}</span>
          </p>
        </div>

        {/* Tier 2: Top-Right - Total Calories (Large, Glowing #00FF41, Monospace) */}
        <div className="flex flex-col items-end shrink-0 pl-2">
          <div className="flex items-baseline gap-1 text-[#00FF41] shadow-[0_0_15px_rgba(0,255,65,0.2)] drop-shadow-[0_0_15px_rgba(0,255,65,0.2)]">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tighter tabular-nums">
              {calories}
            </span>
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-[#00FF41]/80">
              kcal
            </span>
          </div>
          <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest tabular-nums mt-0.5">
            per 100g
          </span>
        </div>
      </div>

      {/* Tier 3: Bottom - Horizontal Macro Pill Strip e.g., [ P: 24g ] [ C: 12g ] [ F: 5g ] in text-neutral-500 */}
      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/5">
        <div className="flex items-center gap-2 flex-wrap text-neutral-500 text-[11px] font-mono tabular-nums">
          {/* Protein Pill: [ P: 24g ] */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-950/80 border border-white/5">
            <span className="text-neutral-500 font-medium">[ P:</span>
            <span className="text-neutral-300 font-bold">{`${protein}g`}</span>
            <span className="text-neutral-500 font-medium">]</span>
          </span>

          {/* Carbs Pill: [ C: 12g ] */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-950/80 border border-white/5">
            <span className="text-neutral-500 font-medium">[ C:</span>
            <span className="text-neutral-300 font-bold">{`${carbs}g`}</span>
            <span className="text-neutral-500 font-medium">]</span>
          </span>

          {/* Fat Pill: [ F: 5g ] */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-950/80 border border-white/5">
            <span className="text-neutral-500 font-medium">[ F:</span>
            <span className="text-neutral-300 font-bold">{`${fatDisplay}g`}</span>
            <span className="text-neutral-500 font-medium">]</span>
          </span>
        </div>

        {/* Quick Log Button (E2E & Tactical Action with min 44x44px touch target) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          aria-label="Log Food"
          className="shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#00FF41]/10 hover:bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]/20 text-xs font-mono font-medium transition-all group-hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Log Food</span>
        </button>
      </div>
    </motion.div>
  );
};
