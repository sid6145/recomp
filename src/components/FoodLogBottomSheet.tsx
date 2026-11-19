import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Check, Scale } from 'lucide-react';
import type { FoodItem } from '../db/db';
import { calculateDynamicMacros } from '../utils/nutritionMath';
import { addDynamicFoodLog } from '../db/logManager';
import { useAppDispatch } from '../store/store';
import { logFoodItem } from '../store/logsSlice';
import { useHaptics } from '../hooks/useHaptics';
import { AgenticTransition } from '../utils/motionPresets';
import { useMomentum } from '../context/MomentumContext';
import { playLogTick, playProteinGoalChime } from '../utils/soundEngine';

export interface FoodLogBottomSheetProps {
  food: FoodItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Mobile-First Precision Portion Bottom Sheet (FoodLogBottomSheet.tsx)
 *
 * Architectural & Ergonomic Upgrades:
 * 1. Stacking Context (z-[80]): Portaled directly into `document.body` at z-[80],
 *    strictly higher than the bottom navigation dock (z-40).
 * 2. AnimatePresence Exit: Renders exit slide animations cleanly without layer trapping.
 * 3. Safe Area Padding: Responsive `env(safe-area-inset-bottom)` prevents button clipping.
 * 4. Background Scroll Lock: Locks `body.style.overflow` while sheet is active.
 * 5. Minimum 44x44px Touch Targets: Tappable areas meet iOS Human Interface Guidelines.
 */
export const FoodLogBottomSheet: React.FC<FoodLogBottomSheetProps> = ({
  food,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const haptics = useHaptics();
  const { isOverdrive, momentumTier, springPhysics, triggerEnergyPulse, dailyProteinTarget, currentProtein } = useMomentum();
  const [mounted, setMounted] = useState(false);
  const [ringFlash, setRingFlash] = useState(false);

  // Unit and Quantity state
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [isLogging, setIsLogging] = useState<boolean>(false);
  const [loggedSuccess, setLoggedSuccess] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // When food changes, initialize unit to the first available serving option
  useEffect(() => {
    if (food && food.servings && food.servings.length > 0) {
      setSelectedUnit(food.servings[0].unit);
      setQuantity('1');
      setLoggedSuccess(false);
    }
  }, [food]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen && food) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen, food]);

  // Keyboard accessibility: ESC key dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Find currently selected serving definition
  const currentServing = useMemo(() => {
    if (!food || !food.servings) return null;
    return (
      food.servings.find((s) => s.unit === selectedUnit) ?? food.servings[0] ?? null
    );
  }, [food, selectedUnit]);

  // Dynamic Macro Calculation
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

      // In 3.0x (Overdrive), fire triggerEnergyPulse, ring flash, and mobile haptic tap
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
        // Check if hitting 100% daily protein target in Overdrive
        if (currentProtein < dailyProteinTarget && currentProtein + calculatedMacros.protein >= dailyProteinTarget) {
          playProteinGoalChime();
        }
      }

      // 1. Add to Dexie IndexedDB
      const savedLog = await addDynamicFoodLog(
        String(food.id ?? ''),
        food.name,
        selectedUnit,
        numericQuantity,
        calculatedMacros
      );

      // 2. Dispatch to Redux state
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
          {/* Backdrop (z-[80] Isolation) */}
          <motion.div
            key="food-log-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md"
          />

          {/* Modal / Bottom Sheet Container (Safe Area padded on iOS) */}
          <motion.div
            key="food-log-sheet"
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={AgenticTransition}
            className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-white/5 bg-neutral-900/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-7 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-6 z-10 max-h-[88vh] overflow-y-auto overscroll-contain touch-pan-y"
          >
            {/* Subtle Ambient Radial Glow */}
            <div className="pointer-events-none absolute -top-24 -right-24 w-60 h-60 bg-[#00FF41]/10 rounded-full blur-3xl transform-gpu will-change-transform" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl transform-gpu will-change-transform" />

            {/* Header Row */}
            <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#00FF41] bg-[#00FF41]/10 px-2 py-0.5 rounded-full border border-[#00FF41]/20">
                  Log Food
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-neutral-100 tracking-tight font-sans">
                  {food.name}
                </h3>
                <p className="text-xs text-neutral-400 flex items-center gap-1.5 font-medium font-sans">
                  <Scale className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="font-mono tabular-nums text-neutral-300 font-semibold">
                    {food.baseMacrosPer100g.calories}
                  </span>{' '}
                  kcal per 100g
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 border border-transparent hover:border-white/10 transition-colors flex items-center justify-center cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Portion Controls: Quantity Input & Unit Select Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 font-sans">
                Serving Size
              </label>
              <div className="grid grid-cols-12 gap-3">
                {/* Quantity input (16px base font size prevents iOS Safari zoom) */}
                <div className="col-span-4 relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    placeholder="1"
                    className="w-full min-h-[44px] bg-neutral-950/90 border border-white/5 rounded-2xl px-3.5 py-3 text-base font-semibold text-neutral-100 text-center font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-[#00FF41]/60 focus:border-[#00FF41]/60 transition-colors"
                  />
                  <span className="block text-[10px] text-neutral-500 text-center mt-1 font-mono uppercase">
                    Quantity
                  </span>
                </div>

                {/* Unit Select Dropdown (min 44px height) */}
                <div className="col-span-8 relative">
                  <select
                    value={selectedUnit}
                    onChange={(e) => handleUnitChange(e.target.value)}
                    className="w-full min-h-[44px] appearance-none bg-neutral-950/90 border border-white/5 rounded-2xl px-4 py-3 text-base sm:text-sm font-semibold text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#00FF41]/60 focus:border-[#00FF41]/60 transition-colors cursor-pointer font-sans"
                  >
                    {food.servings.map((serving) => (
                      <option
                        key={serving.unit}
                        value={serving.unit}
                        className="bg-neutral-950 text-neutral-100 py-2"
                      >
                        {serving.unit} ({serving.weightInGrams}g)
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-4 top-4 text-neutral-500 text-xs">
                    ▼
                  </div>
                  <span className="block text-[10px] text-neutral-500 text-right pr-2 mt-1 font-mono tabular-nums">
                    Total: <strong className="text-neutral-300">{totalCalculatedGrams}g</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Live Caloric & Macro Readout */}
            <div className="rounded-2xl border border-white/5 bg-neutral-950/60 p-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 font-sans">
                  Nutrition
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-amber-400 font-mono tracking-tight tabular-nums">
                    {calculatedMacros.calories}
                  </span>
                  <span className="text-xs font-semibold text-neutral-400 font-mono">kcal</span>
                </div>
              </div>

              {/* Macro Breakdown Pills (strictly Monospace Tabular-Nums) */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400">
                    Protein
                  </span>
                  <span className="text-base font-bold text-rose-200 font-mono tabular-nums">
                    {calculatedMacros.protein}g
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-center">
                  <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400">
                    Carbs
                  </span>
                  <span className="text-base font-bold text-sky-200 font-mono tabular-nums">
                    {calculatedMacros.carbs}g
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
                  <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-yellow-400">
                    Fats
                  </span>
                  <span className="text-base font-bold text-yellow-200 font-mono tabular-nums">
                    {calculatedMacros.fats}g
                  </span>
                </div>
              </div>
            </div>

            {/* Action Button (min 48px touch target with Overdrive tactile spring physics) */}
            <motion.button
              type="button"
              disabled={isLogging || numericQuantity <= 0}
              onClick={handleLog}
              whileTap={{ scale: 0.96 }}
              transition={springPhysics}
              className={`relative overflow-hidden w-full min-h-[48px] py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer ${
                ringFlash ? 'ring-4 ring-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.8)] ' : ''
              }${
                loggedSuccess
                  ? 'bg-[#00FF41] text-neutral-950 shadow-[0_0_25px_rgba(0,255,65,0.4)] scale-[0.99]'
                  : numericQuantity <= 0
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5'
                  : isOverdrive
                  ? 'bg-[#00FF41] hover:bg-[#00FF41]/95 text-neutral-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] active:scale-95 ring-1 ring-emerald-400 cta-sheen'
                  : 'bg-[#00FF41] hover:bg-[#00FF41]/90 text-neutral-950 shadow-[0_0_15px_rgba(0,255,65,0.2)] active:scale-95'
              }`}
            >
              {isOverdrive && (
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
              )}
              {loggedSuccess ? (
                <>
                  <Check className="w-5 h-5 text-neutral-950" />
                  <span>Logged to Diary</span>
                </>
              ) : (
                <>
                  <Flame className="w-5 h-5 text-neutral-950" />
                  <span>
                    Log to Diary ({calculatedMacros.calories} kcal)
                  </span>
                </>
              )}
            </motion.button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted || typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
};
