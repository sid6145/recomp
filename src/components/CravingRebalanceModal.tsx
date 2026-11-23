import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Search,
  PlusCircle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { db, type FoodItem } from '../db/db';
import { useAppDispatch, useAppSelector } from '../store/store';
import { logFoodItem } from '../store/logsSlice';
import { openSOS } from '../store/sosSlice';
import { useHaptics } from '../hooks/useHaptics';
import { useMomentum } from '../context/MomentumContext';
import { playLogTick } from '../utils/soundEngine';
import {
  type CravingFoodInput,
  type CravingAdjustmentResult,
} from '../utils/cravingOptimizer';
import {
  calculateCravingRebalance,
} from '../db/cravingManager';
import { addDynamicFoodLog } from '../db/logManager';

export interface CravingRebalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CravingRebalanceModal: React.FC<CravingRebalanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const haptics = useHaptics();
  const { triggerEnergyPulse } = useMomentum();

  const entries = useAppSelector((state) => state.logs.entries);
  const targetCalories = useAppSelector((state) => state.user.dailyCaloricTarget);

  // Compute current remaining calories today
  const totalConsumedToday = useMemo(() => {
    return entries.reduce((acc, e) => acc + (e.totalCalories || 0), 0);
  }, [entries]);

  const currentRemainingCalories = Math.max(0, targetCalories - totalConsumedToday);

  // Step state: 'input' | 'preview' | 'success'
  const [currentStep, setCurrentStep] = useState<'input' | 'preview' | 'success'>('input');
  const [inputTab, setInputTab] = useState<'search' | 'manual'>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Manual input state
  const [manualName, setManualName] = useState<string>('');
  const [manualCalories, setManualCalories] = useState<string>('');
  const [manualProtein, setManualProtein] = useState<string>('');
  const [manualCarbs, setManualCarbs] = useState<string>('');
  const [manualFats, setManualFats] = useState<string>('');
  const [manualUnit, setManualUnit] = useState<string>('portion');

  // Optimization result state
  const [rebalanceResult, setRebalanceResult] = useState<CravingAdjustmentResult | null>(null);

  // Edge case state: 5-second auto-start SOS countdown when craving exceeds remaining budget
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('input');
      setInputTab('search');
      setSearchQuery('');
      setSearchResults([]);
      setManualName('');
      setManualCalories('');
      setManualProtein('');
      setManualCarbs('');
      setManualFats('');
      setRebalanceResult(null);
      setSosCountdown(null);
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isOpen]);

  // Active 5-second countdown timer when craving exceeds remaining daily budget
  useEffect(() => {
    if (sosCountdown === null) return;

    if (sosCountdown <= 0) {
      haptics.warning();
      dispatch(openSOS());
      onClose();
      return;
    }

    const timer = setInterval(() => {
      setSosCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [sosCountdown, dispatch, onClose, haptics]);

  // Live search against Dexie foods & customFoods
  useEffect(() => {
    if (!searchQuery.trim() || inputTab !== 'search') {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const q = searchQuery.toLowerCase().trim();
        const [foods, customFoods] = await Promise.all([
          db.foods
            .filter((f) => f.name.toLowerCase().includes(q))
            .limit(10)
            .toArray(),
          db.customFoods
            .filter((f) => f.name.toLowerCase().includes(q))
            .limit(10)
            .toArray(),
        ]);
        setSearchResults([...customFoods, ...foods].slice(0, 8));
      } catch (err) {
        console.error('Craving search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, inputTab]);

  // Compute rebalance plan from selected DB item or manual inputs
  const handleCalculate = async (cravingInput: CravingFoodInput) => {
    haptics.tick();
    try {
      const result = await calculateCravingRebalance(
        cravingInput,
        currentRemainingCalories,
        true, // Ingest manual food to DB if custom
        new Date() // Dynamically evaluates current time of day
      );
      setRebalanceResult(result);

      // Edge case: if craving alone exceeds remaining daily calories, trigger 5s SOS countdown
      if (result.isExceedingDailyBudget) {
        setSosCountdown(5);
      } else {
        setSosCountdown(null);
      }

      setCurrentStep('preview');
    } catch (err) {
      console.error('Rebalance calculation error:', err);
    }
  };

  const handleSelectDbFood = (food: FoodItem) => {
    const cal = food.calories || food.baseMacrosPer100g.calories;
    const p = food.protein || food.baseMacrosPer100g.protein;
    const c = food.carbs || food.baseMacrosPer100g.carbs;
    const f = food.fats || food.baseMacrosPer100g.fats;

    handleCalculate({
      foodId: String(food.id),
      name: food.name,
      calories: cal,
      protein: p,
      carbs: c,
      fats: f,
      servingUnit: food.servings?.[0]?.unit || 'serving',
      servingWeightInGrams: food.servings?.[0]?.weightInGrams || 100,
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cal = parseInt(manualCalories, 10);
    if (isNaN(cal) || cal <= 0 || !manualName.trim()) return;

    const p = parseFloat(manualProtein) || 0;
    const c = parseFloat(manualCarbs) || 0;
    const f = parseFloat(manualFats) || 0;

    handleCalculate({
      name: manualName.trim(),
      calories: cal,
      protein: p,
      carbs: c,
      fats: f,
      servingUnit: manualUnit.trim() || 'piece',
      servingWeightInGrams: 100,
    });
  };

  const handleTriggerSOSNow = () => {
    setSosCountdown(null);
    haptics.warning();
    dispatch(openSOS());
    onClose();
  };

  const handlePauseCountdown = () => {
    haptics.tick();
    setSosCountdown(null);
  };

  // Log craving food item & confirm rebalance
  const handleConfirmAndLog = async () => {
    if (!rebalanceResult) return;
    setSosCountdown(null);
    haptics.success();
    playLogTick();
    triggerEnergyPulse();

    const craving = rebalanceResult.craving;

    // 1. Ingest into Dexie consumption log
    const savedLog = await addDynamicFoodLog(
      craving.foodId || `craving_${Date.now()}`,
      craving.name,
      craving.servingUnit || 'portion',
      1,
      {
        calories: craving.calories,
        protein: craving.protein,
        carbs: craving.carbs,
        fats: craving.fats,
      }
    );

    // 2. Dispatch to Redux store
    dispatch(
      logFoodItem({
        food: {
          id: savedLog.foodId,
          name: craving.name,
          baseMacrosPer100g: {
            calories: craving.calories,
            protein: craving.protein,
            carbs: craving.carbs,
            fats: craving.fats,
          },
          servings: [{ unit: craving.servingUnit || 'portion', weightInGrams: 100 }],
          calories: craving.calories,
          protein: craving.protein,
          carbs: craving.carbs,
          fats: craving.fats,
        },
        quantity: 1,
        savedLog,
      })
    );

    setCurrentStep('success');
    setTimeout(() => {
      onSuccess?.();
      onClose();
    }, 2000);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const content = (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-950/90 backdrop-blur-2xl text-zinc-100 overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="relative w-full max-w-xl my-auto rounded-3xl bg-zinc-900/95 border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/5 flex items-center justify-center"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* ========================================================================= */}
          {/* STEP 1: INPUT CRAVING (SEARCH OR MANUAL ENTRY)                            */}
          {/* ========================================================================= */}
          {currentStep === 'input' && (
            <div className="space-y-6">
              <header className="space-y-2 text-center sm:text-left pr-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>24/7 Craving Management Engine</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white font-sans">
                  Fulfill Craving & Rebalance Meals
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 font-sans">
                  Current remaining budget today:{' '}
                  <span className="font-mono font-bold text-[#00FF41]">
                    {currentRemainingCalories} kcal
                  </span>
                  . Enter your craving item to automatically adjust your upcoming meal without breaking macros.
                </p>
              </header>

              {/* Input Mode Selector Tabs */}
              <div className="flex p-1 rounded-xl bg-zinc-950 border border-white/10">
                <button
                  type="button"
                  onClick={() => setInputTab('search')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-medium transition-all ${
                    inputTab === 'search'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Search Database
                </button>
                <button
                  type="button"
                  onClick={() => setInputTab('manual')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-medium transition-all ${
                    inputTab === 'manual'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Manual Entry + Ingest to DB
                </button>
              </div>

              {/* SEARCH TAB */}
              {inputTab === 'search' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. Tiramisu, Chocolate Cake, Gulab Jamun..."
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-sans text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50"
                      autoFocus
                    />
                  </div>

                  {/* Results list */}
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {isSearching ? (
                      <div className="py-6 text-center text-xs font-mono text-zinc-500">
                        Searching local foods database...
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((food) => (
                        <button
                          key={String(food.id)}
                          type="button"
                          onClick={() => handleSelectDbFood(food)}
                          className="w-full p-2.5 rounded-xl bg-zinc-950/60 hover:bg-zinc-950 border border-white/5 hover:border-amber-500/30 text-left transition-all flex items-center justify-between cursor-pointer group"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="text-xs font-semibold text-zinc-200 group-hover:text-amber-300 truncate block">
                              {food.name}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              {food.servingSize || '1 serving'}
                            </span>
                          </div>
                          <div className="shrink-0 text-right font-mono">
                            <span className="text-xs font-bold text-amber-400">
                              {food.calories || food.baseMacrosPer100g.calories} kcal
                            </span>
                            <span className="text-[10px] text-zinc-500 block">
                              P: {food.protein || food.baseMacrosPer100g.protein}g · C:{' '}
                              {food.carbs || food.baseMacrosPer100g.carbs}g
                            </span>
                          </div>
                        </button>
                      ))
                    ) : searchQuery.trim() ? (
                      <div className="py-6 text-center text-xs text-zinc-500">
                        No matches found. Switch to &ldquo;Manual Entry&rdquo; to input and ingest it to DB!
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-zinc-500">
                        Type a craving or dessert name to pick from your verified database.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MANUAL ENTRY TAB */}
              {inputTab === 'manual' && (
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-mono uppercase text-zinc-400">
                        Food Item Name
                      </label>
                      <input
                        type="text"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="e.g. Tiramisu Cake"
                        required
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-sans text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-zinc-400">
                        Calories (kcal)
                      </label>
                      <input
                        type="number"
                        value={manualCalories}
                        onChange={(e) => setManualCalories(e.target.value)}
                        placeholder="e.g. 300"
                        required
                        min="1"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 tabular-nums"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-zinc-400">
                        Serving Unit
                      </label>
                      <input
                        type="text"
                        value={manualUnit}
                        onChange={(e) => setManualUnit(e.target.value)}
                        placeholder="e.g. 1 slice"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-sans text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-rose-400">
                        Protein (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={manualProtein}
                        onChange={(e) => setManualProtein(e.target.value)}
                        placeholder="e.g. 4"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 tabular-nums"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-cyan-400">
                        Carbs (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={manualCarbs}
                        onChange={(e) => setManualCarbs(e.target.value)}
                        placeholder="e.g. 35"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 tabular-nums"
                      />
                    </div>

                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-mono uppercase text-amber-400">
                        Fats (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={manualFats}
                        onChange={(e) => setManualFats(e.target.value)}
                        placeholder="e.g. 16"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 tabular-nums"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] font-mono text-zinc-400">
                    💡 This item will be automatically ingested and saved to your IndexedDB for future instant search.
                  </p>

                  <button
                    type="submit"
                    disabled={!manualName || !manualCalories || parseInt(manualCalories, 10) <= 0}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Ingest & Calculate Rebalance</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: DETERMINISTIC MEAL ADJUSTMENT PREVIEW                             */}
          {/* ========================================================================= */}
          {currentStep === 'preview' && rebalanceResult && (
            <div className="space-y-6">
              <header className="space-y-1 pr-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Deterministic Rebalance Ready</span>
                </div>
                <h3 className="text-xl font-black text-white font-sans">
                  {rebalanceResult.pendingMealName} Macro Adjustment Plan
                </h3>
              </header>

              {/* Edge Case Alert: Craving exceeds remaining daily calorie budget */}
              {rebalanceResult.isExceedingDailyBudget && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-3 shadow-[0_0_25px_rgba(244,63,94,0.2)]">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-rose-300 uppercase tracking-wider font-mono">
                          Target Calorie Overshoot
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                          +{rebalanceResult.overshootCalories} kcal Deficit Breach
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                        This {rebalanceResult.craving.name} ({rebalanceResult.craving.calories} kcal) exceeds your remaining calorie budget ({rebalanceResult.initialRemainingCalories} kcal).
                      </p>
                    </div>
                  </div>

                  {/* 5-Second Countdown Callout */}
                  <div className="p-3 rounded-xl bg-zinc-950/80 border border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center font-mono font-bold text-sm tabular-nums shrink-0">
                        {sosCountdown !== null ? sosCountdown : '⏸'}
                      </div>
                      <span className="text-xs font-sans text-zinc-300">
                        {sosCountdown !== null
                          ? `Starting SOS Craving in ${sosCountdown}s to help pause and ride the urge...`
                          : 'SOS countdown paused. You can review plan or log anyway.'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {sosCountdown !== null ? (
                        <button
                          type="button"
                          onClick={handlePauseCountdown}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 cursor-pointer"
                        >
                          Pause Timer
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSosCountdown(5)}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 cursor-pointer"
                        >
                          Resume (5s)
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleTriggerSOSNow}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold bg-rose-500 text-zinc-950 hover:bg-rose-400 cursor-pointer shadow-sm active:scale-95"
                      >
                        Start SOS Now
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Mathematical Telemetry Balance Box */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-zinc-950 border border-white/10 text-center font-mono">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Remaining Now</span>
                  <span className="text-sm sm:text-base font-bold text-zinc-300 tabular-nums">
                    {rebalanceResult.initialRemainingCalories} kcal
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-400 uppercase block">Craving Taken</span>
                  <span className="text-sm sm:text-base font-bold text-amber-400 tabular-nums">
                    -{rebalanceResult.craving.calories} kcal
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400 uppercase block">
                    Pending {rebalanceResult.pendingMealName}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-emerald-400 tabular-nums">
                    {rebalanceResult.pendingCaloriesAfterCraving} kcal
                  </span>
                </div>
              </div>

              {/* Comparison: Habitual Meal vs Adjusted Meal */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400 uppercase">
                    Habitual vs Adjusted {rebalanceResult.pendingMealName}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    Retained {rebalanceResult.retainedProteinPercentage}% Protein
                  </span>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {rebalanceResult.adjustedMeal.items.map((item) => (
                    <div
                      key={item.foodId}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        item.status === 'skipped'
                          ? 'bg-rose-950/20 border-rose-500/20 opacity-60'
                          : item.status === 'reduced'
                          ? 'bg-amber-950/20 border-amber-500/20'
                          : 'bg-zinc-950/70 border-white/5'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold truncate ${
                              item.status === 'skipped'
                                ? 'line-through text-zinc-500'
                                : 'text-zinc-200'
                            }`}
                          >
                            {item.foodName}
                          </span>
                          {item.isProteinAnchor && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                              PROTEIN ANCHOR
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-zinc-400 block mt-0.5">
                          {item.status === 'skipped'
                            ? `Skipped (was ${item.originalQuantity} ${item.unit})`
                            : item.status === 'reduced'
                            ? `Portion: ${item.originalQuantity} → ${item.adjustedQuantity} ${item.unit}`
                            : `Kept full portion (${item.adjustedQuantity} ${item.unit})`}
                        </span>
                      </div>

                      <div className="shrink-0 text-right font-mono text-xs">
                        <span
                          className={`font-bold block ${
                            item.status === 'skipped'
                              ? 'text-rose-400 line-through'
                              : 'text-zinc-200'
                          }`}
                        >
                          {item.adjustedCalories} kcal
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          P: {item.adjustedMacros.protein}g · C: {item.adjustedMacros.carbs}g
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Notes / Explanation list */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1 text-xs text-zinc-300 font-sans">
                {rebalanceResult.explanation.slice(0, 3).map((exp, idx) => (
                  <p key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">›</span>
                    <span>{exp}</span>
                  </p>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSosCountdown(null);
                    setCurrentStep('input');
                  }}
                  className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl font-mono text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 border border-white/5 transition-all cursor-pointer"
                >
                  Back / Change
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndLog}
                  className={`flex-2 min-h-[44px] py-2.5 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider text-zinc-950 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    rebalanceResult.isExceedingDailyBudget
                      ? 'bg-gradient-to-r from-amber-500 to-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_20px_rgba(16,185,129,0.35)] active:scale-[0.98]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {rebalanceResult.isExceedingDailyBudget
                      ? 'Eat Anyway & Log Craving'
                      : 'Log Craving & Apply Plan'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: CELEBRATION / SUCCESS                                             */}
          {/* ========================================================================= */}
          {currentStep === 'success' && rebalanceResult && (
            <div className="py-8 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center animate-bounce shadow-[0_0_25px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-white font-sans">
                  Craving Logged & {rebalanceResult.pendingMealName} Rebalanced!
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 font-sans max-w-sm">
                  {rebalanceResult.craving.name} was successfully logged. Your pending {rebalanceResult.pendingMealName.toLowerCase()} has been adjusted to {rebalanceResult.adjustedMeal.calories} kcal while keeping your daily macros locked in!
                </p>
              </div>
            </div>
          )}
        </div>
      </m.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
};
