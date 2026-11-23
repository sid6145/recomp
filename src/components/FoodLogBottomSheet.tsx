import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { MaterialIcon } from './MaterialIcon';
import type { FoodItem } from '../db/db';
import { calculateDynamicMacros } from '../utils/nutritionMath';
import { addDynamicFoodLog } from '../db/logManager';
import { useAppDispatch } from '../store/store';
import { logFoodItem } from '../store/logsSlice';
import { useHaptics } from '../hooks/useHaptics';
import { useMomentum } from '../context/MomentumContext';
import { playLogTick, playProteinGoalChime } from '../utils/soundEngine';

export interface FoodLogBottomSheetProps {
  food: FoodItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Material Design 3 Modal Bottom Sheet for Food Info & Portion Logging (FoodLogBottomSheet.tsx)
 *
 * M3 Spec:
 * - Modal bottom sheet: rounded-t-[28px] sm:rounded-[28px], --md-surface-container-high, centered 32px × 4px drag handle pill, backdrop scrim rgba(0,0,0,0.32).
 * - Single internal scroll area (no double scrollbars).
 * - Serving quantity stepper / input pills.
 * - Live macro breakdown pills in M3 tonal colors.
 * - Full-width 52px-tall M3 Filled "Add to Diary" button in --md-primary / --md-on-primary.
 */
export const FoodLogBottomSheet: React.FC<FoodLogBottomSheetProps> = ({
  food,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const haptics = useHaptics();
  const { isOverdrive, momentumTier, triggerEnergyPulse, dailyProteinTarget, currentProtein } = useMomentum();
  const [mounted, setMounted] = useState(false);
  const [ringFlash, setRingFlash] = useState(false);

  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [isLogging, setIsLogging] = useState<boolean>(false);
  const [loggedSuccess, setLoggedSuccess] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (food && food.servings && food.servings.length > 0) {
      setSelectedUnit(food.servings[0].unit);
      setQuantity('1');
      setLoggedSuccess(false);
    }
  }, [food]);

  useEffect(() => {
    if (isOpen && food) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen, food]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const currentServing = useMemo(() => {
    if (!food || !food.servings) return null;
    return (
      food.servings.find((s) => s.unit === selectedUnit) ?? food.servings[0] ?? null
    );
  }, [food, selectedUnit]);

  const numericQuantity = parseFloat(quantity) || 0;
  const calculatedMacros = useMemo(() => {
    if (!food || !currentServing) {
      return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    }
    return calculateDynamicMacros(
      food.baseMacrosPer100g,
      currentServing.weightInGrams,
      numericQuantity
    );
  }, [food, currentServing, numericQuantity]);

  const totalCalculatedGrams = currentServing
    ? Math.round(currentServing.weightInGrams * numericQuantity * 10) / 10
    : 0;

  const handleUnitChange = (unit: string) => {
    haptics.tick();
    setSelectedUnit(unit);
  };

  const handleQuantityChange = (val: string) => {
    setQuantity(val);
  };

  const handleStepQuantity = (delta: number) => {
    haptics.tick();
    const current = parseFloat(quantity) || 1;
    const next = Math.max(0.5, Math.round((current + delta) * 10) / 10);
    setQuantity(String(next));
  };

  const handleClose = () => {
    haptics.tick();
    onClose();
  };

  const handleLog = async () => {
    if (!food || numericQuantity <= 0) return;

    try {
      setIsLogging(true);
      haptics.tick();
      playLogTick();

      if (isOverdrive || momentumTier >= 3.0) {
        triggerEnergyPulse();
        setRingFlash(true);
        setTimeout(() => setRingFlash(false), 600);
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          try {
            navigator.vibrate(8);
          } catch {
            // Ignored
          }
        }
        if (currentProtein < dailyProteinTarget && currentProtein + calculatedMacros.protein >= dailyProteinTarget) {
          playProteinGoalChime();
        }
      }

      const savedLog = await addDynamicFoodLog(
        String(food.id ?? ''),
        food.name,
        selectedUnit,
        numericQuantity,
        calculatedMacros
      );

      dispatch(
        logFoodItem({
          food: {
            id: String(food.id ?? ''),
            name: food.name,
            servingSize: `${numericQuantity} ${selectedUnit} (${totalCalculatedGrams}g)`,
            calories: calculatedMacros.calories,
            protein: calculatedMacros.protein,
            carbs: calculatedMacros.carbs,
            fats: calculatedMacros.fats,
            baseMacrosPer100g: food.baseMacrosPer100g,
            servings: food.servings,
          },
          quantity: numericQuantity,
          savedLog,
        })
      );

      haptics.success();
      setLoggedSuccess(true);
      setTimeout(() => {
        setIsLogging(false);
        setLoggedSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 700);
    } catch (err) {
      console.error('Failed to log food entry:', err);
      setIsLogging(false);
    }
  };

  const content = (
    <AnimatePresence>
      {isOpen && food && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Log Portion for ${food.name}`}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto"
        >
          {/* Backdrop Scrim (rgba(0,0,0,0.32)) */}
          <m.div
            key="food-log-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
          />

          {/* M3 Modal Bottom Sheet (Single internal scroll container) */}
          <m.div
            key="food-log-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden z-10 border-t sm:border border-[var(--md-outline-variant)]/30"
          >
            {/* Centered 32px × 4px Drag Handle Pill */}
            <div className="w-full flex justify-center pt-3 pb-1 shrink-0 cursor-grab">
              <div className="w-8 h-1 rounded-full bg-[var(--md-outline-variant)] opacity-60" />
            </div>

            {/* Single Internal Scroll Container to Guarantee Zero Double Scrollbars */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
              {/* Header Row */}
              <div className="flex items-start justify-between gap-4 border-b border-[var(--md-outline-variant)]/20 pb-4">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-display font-semibold uppercase bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]">
                    <MaterialIcon name="restaurant" size={14} />
                    <span>Food Portion</span>
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-[var(--md-on-surface)] tracking-tight font-display">
                    {food.name}
                  </h3>
                  <p className="text-xs text-[var(--md-on-surface-variant)] flex items-center gap-1.5 font-sans">
                    <MaterialIcon name="scale" size={16} />
                    <span>
                      <strong className="font-mono tabular-nums text-[var(--md-on-surface)]">{food.baseMacrosPer100g.calories}</strong> kcal per 100g
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--md-on-surface-variant)] hover:bg-[var(--md-on-surface)]/10 transition-colors m3-state-layer cursor-pointer"
                  title="Close"
                  aria-label="Close"
                >
                  <MaterialIcon name="close" size={20} />
                </button>
              </div>

              {/* Portion Stepper Pills & Unit Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--md-on-surface-variant)] font-display">
                  Serving Size &amp; Quantity
                </label>

                {/* Stepper Pill */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center p-1 rounded-full bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)]/30">
                    <button
                      type="button"
                      onClick={() => handleStepQuantity(-0.5)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--md-on-surface)] hover:bg-[var(--md-on-surface)]/10 transition-colors m3-state-layer"
                      aria-label="Decrease quantity"
                    >
                      <MaterialIcon name="remove" size={18} />
                    </button>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      placeholder="1"
                      className="w-16 text-center font-mono text-base font-bold text-[var(--md-on-surface)] bg-transparent focus:outline-none tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => handleStepQuantity(0.5)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--md-on-surface)] hover:bg-[var(--md-on-surface)]/10 transition-colors m3-state-layer"
                      aria-label="Increase quantity"
                    >
                      <MaterialIcon name="add" size={18} />
                    </button>
                  </div>

                  {/* Unit Select Dropdown */}
                  <div className="flex-1 relative">
                    <select
                      value={selectedUnit}
                      onChange={(e) => handleUnitChange(e.target.value)}
                      className="w-full min-h-[48px] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] border border-[var(--md-outline-variant)]/30 rounded-full px-4 py-2.5 text-xs font-display font-semibold appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)] cursor-pointer"
                    >
                      {food.servings.map((serving) => (
                        <option
                          key={serving.unit}
                          value={serving.unit}
                          className="bg-[var(--md-surface-container)] text-[var(--md-on-surface)]"
                        >
                          {serving.unit} ({serving.weightInGrams}g)
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-4 top-3.5 text-[var(--md-on-surface-variant)]">
                      <MaterialIcon name="expand_more" size={18} />
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs font-mono text-[var(--md-on-surface-variant)] tabular-nums pr-2">
                  Total weight: <strong className="text-[var(--md-on-surface)]">{totalCalculatedGrams}g</strong>
                </div>
              </div>

              {/* Live Caloric & Macro Readout (M3 Bento Surface) */}
              <div className="rounded-[24px] bg-[var(--md-surface-container)] p-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--md-on-surface-variant)] font-display">
                    Computed Energy
                  </span>
                  <div className="flex items-baseline gap-1 text-[var(--md-primary)]">
                    <span className="text-3xl font-black font-mono tracking-tight tabular-nums">
                      {calculatedMacros.calories}
                    </span>
                    <span className="text-xs font-bold font-mono uppercase">kcal</span>
                  </div>
                </div>

                {/* Macro Breakdown Pills */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 rounded-[16px] bg-[var(--md-surface-container-high)] text-center">
                    <span className="block text-[10px] font-display font-bold uppercase text-[var(--md-primary)]">
                      Protein
                    </span>
                    <span className="text-base font-bold font-mono text-[var(--md-on-surface)] tabular-nums">
                      {calculatedMacros.protein}g
                    </span>
                  </div>
                  <div className="p-2.5 rounded-[16px] bg-[var(--md-surface-container-high)] text-center">
                    <span className="block text-[10px] font-display font-bold uppercase text-[var(--md-secondary)]">
                      Carbs
                    </span>
                    <span className="text-base font-bold font-mono text-[var(--md-on-surface)] tabular-nums">
                      {calculatedMacros.carbs}g
                    </span>
                  </div>
                  <div className="p-2.5 rounded-[16px] bg-[var(--md-surface-container-high)] text-center">
                    <span className="block text-[10px] font-display font-bold uppercase text-[var(--md-tertiary)]">
                      Fats
                    </span>
                    <span className="text-base font-bold font-mono text-[var(--md-on-surface)] tabular-nums">
                      {calculatedMacros.fats}g
                    </span>
                  </div>
                </div>
              </div>

              {/* Full-width 52px-tall M3 Filled "Add to Diary" Button */}
              <button
                type="button"
                disabled={isLogging || numericQuantity <= 0}
                onClick={handleLog}
                className={`w-full h-[52px] rounded-full font-display font-bold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 m3-state-layer bg-[var(--md-primary)] text-[var(--md-on-primary)] disabled:opacity-50 disabled:cursor-not-allowed ${
                  ringFlash ? 'ring-4 ring-[var(--md-primary)]' : ''
                }`}
              >
                {loggedSuccess ? (
                  <>
                    <MaterialIcon name="check" size={20} />
                    <span>Logged to Diary</span>
                  </>
                ) : (
                  <>
                    <MaterialIcon name="add" size={20} />
                    <span>
                      Add to Diary ({calculatedMacros.calories} kcal)
                    </span>
                  </>
                )}
              </button>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted || typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
};
