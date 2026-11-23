import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import {
  X,
  PlusCircle,
  Sparkles,
  Scale,
  CheckCircle2,
  Utensils,
  Coffee,
  Package,
  Layers,
  ChevronDown,
} from 'lucide-react';
import type { FoodItem, ServingOption } from '../db/db';
import { useHaptics } from '../hooks/useHaptics';

export type FoodType = 'solid' | 'beverage' | 'other';

export const PREDEFINED_CATEGORIES: Record<FoodType, { label: string; icon: typeof Utensils; categories: string[] }> = {
  solid: {
    label: 'Solid Foods',
    icon: Utensils,
    categories: [
      'Main Meals & Curries',
      'Breads & Rotis',
      'Rice & Grains',
      'Dairy & Paneer',
      'Meat & Poultry',
      'Snacks & Street Food',
      'Fruits & Vegetables',
      'Bakery & Sweets',
    ],
  },
  beverage: {
    label: 'Beverages',
    icon: Coffee,
    categories: [
      'Tea & Coffee',
      'Juices & Smoothies',
      'Protein Shakes',
      'Dairy Drinks & Lassi',
      'Soft Drinks & Soda',
      'Soups & Broths',
    ],
  },
  other: {
    label: 'Other Items',
    icon: Package,
    categories: [
      'Sauces & Condiments',
      'Powders & Supplements',
      'Nuts, Seeds & Oils',
      'Desserts & Confectionery',
    ],
  },
};

export interface ServingPreset {
  unit: string;
  weightInGrams: number;
  label: string;
  isLiquid?: boolean;
}

export const SERVING_CRITERIA_PRESETS: Record<FoodType, ServingPreset[]> = {
  solid: [
    { unit: '100g', weightInGrams: 100, label: '100g (Standard)' },
    { unit: 'bowl (150g)', weightInGrams: 150, label: '1 Bowl (150g)' },
    { unit: 'katori (100g)', weightInGrams: 100, label: '1 Katori (100g)' },
    { unit: 'piece (35g)', weightInGrams: 35, label: '1 Piece (35g)' },
    { unit: 'plate (300g)', weightInGrams: 300, label: '1 Plate (300g)' },
    { unit: 'cup (200g)', weightInGrams: 200, label: '1 Cup (200g)' },
    { unit: 'gram', weightInGrams: 1, label: 'Per 1g' },
  ],
  beverage: [
    { unit: '100ml', weightInGrams: 100, label: '100ml (Standard)', isLiquid: true },
    { unit: 'glass (250ml)', weightInGrams: 250, label: '1 Glass (250ml)', isLiquid: true },
    { unit: 'cup (150ml)', weightInGrams: 150, label: '1 Cup (150ml)', isLiquid: true },
    { unit: 'mug (350ml)', weightInGrams: 350, label: '1 Mug (350ml)', isLiquid: true },
    { unit: 'bottle (500ml)', weightInGrams: 500, label: '1 Bottle (500ml)', isLiquid: true },
    { unit: 'can (330ml)', weightInGrams: 330, label: '1 Can (330ml)', isLiquid: true },
    { unit: 'ml', weightInGrams: 1, label: 'Per 1ml', isLiquid: true },
  ],
  other: [
    { unit: '100g', weightInGrams: 100, label: '100g' },
    { unit: 'tbsp (15g)', weightInGrams: 15, label: '1 Tablespoon (15g)' },
    { unit: 'tsp (5g)', weightInGrams: 5, label: '1 Teaspoon (5g)' },
    { unit: 'scoop (30g)', weightInGrams: 30, label: '1 Scoop (30g)' },
    { unit: 'slice (30g)', weightInGrams: 30, label: '1 Slice (30g)' },
    { unit: 'serving', weightInGrams: 100, label: '1 Custom Serving' },
  ],
};

export interface AddCustomFoodModalProps {
  isOpen: boolean;
  initialQuery?: string;
  onClose: () => void;
  onSaved: (item: FoodItem, autoLog: boolean) => void;
}

export const AddCustomFoodModal: React.FC<AddCustomFoodModalProps> = ({
  isOpen,
  initialQuery = '',
  onClose,
  onSaved,
}) => {
  const haptics = useHaptics();

  // Core classification state
  const [foodType, setFoodType] = useState<FoodType>('solid');
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('Main Meals & Curries');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState<boolean>(false);

  // Serving criteria state
  const [selectedPresetUnit, setSelectedPresetUnit] = useState<string>('100g');
  const [customUnitName, setCustomUnitName] = useState<string>('');
  const [servingWeightGrams, setServingWeightGrams] = useState<string>('100');

  // Nutritional values for the chosen serving criteria
  const [calories, setCalories] = useState<string>('');
  const [protein, setProtein] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [fats, setFats] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Advanced: multi-serving preview toggle
  const [showMultiServingPreview, setShowMultiServingPreview] = useState<boolean>(false);

  // Initialize and reset on open
  useEffect(() => {
    if (isOpen) {
      setName(initialQuery.trim());
      setFoodType('solid');
      setCategory('Main Meals & Curries');
      setCustomCategory('');
      setIsCustomCategoryMode(false);
      setSelectedPresetUnit('100g');
      setCustomUnitName('');
      setServingWeightGrams('100');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFats('');
      setIsSubmitting(false);
      setShowMultiServingPreview(false);

      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isOpen, initialQuery]);

  // When foodType changes, set sensible defaults
  const handleFoodTypeChange = (type: FoodType) => {
    haptics.tick();
    setFoodType(type);
    const defaultCat = PREDEFINED_CATEGORIES[type].categories[0];
    setCategory(defaultCat);
    setIsCustomCategoryMode(false);

    const defaultPreset = SERVING_CRITERIA_PRESETS[type][0];
    setSelectedPresetUnit(defaultPreset.unit);
    setServingWeightGrams(String(defaultPreset.weightInGrams));
  };

  const handleSelectPresetServing = (preset: ServingPreset) => {
    haptics.tick();
    setSelectedPresetUnit(preset.unit);
    setServingWeightGrams(String(preset.weightInGrams));
    setCustomUnitName('');
  };

  // Keyboard shortcut: ESC to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Derived macro calculations
  const numCal = parseFloat(calories) || 0;
  const numP = parseFloat(protein) || 0;
  const numC = parseFloat(carbs) || 0;
  const numF = parseFloat(fats) || 0;
  const numWeight = parseFloat(servingWeightGrams) || 100;

  // Active serving unit display name
  const effectiveUnit = customUnitName.trim() || selectedPresetUnit;

  // Normalization to 100g standard
  const multiplierTo100g = numWeight > 0 ? 100 / numWeight : 1;
  const baseMacrosPer100g = useMemo(() => {
    return {
      calories: Math.round(numCal * multiplierTo100g),
      protein: Math.round(numP * multiplierTo100g * 10) / 10,
      carbs: Math.round(numC * multiplierTo100g * 10) / 10,
      fats: Math.round(numF * multiplierTo100g * 10) / 10,
    };
  }, [numCal, numP, numC, numF, multiplierTo100g]);

  // Generate complete multi-serving criteria list for this food
  const generatedServings = useMemo<ServingOption[]>(() => {
    const list: ServingOption[] = [];

    // 1. Primary selected serving
    list.push({
      unit: effectiveUnit,
      weightInGrams: numWeight,
    });

    // 2. Add standard 100g/100ml if different
    const standardUnit = foodType === 'beverage' ? '100ml' : '100g';
    if (effectiveUnit !== standardUnit && numWeight !== 100) {
      list.push({ unit: standardUnit, weightInGrams: 100 });
    }

    // 3. Add standard gram/ml for precision fractional logging
    const baseUnit = foodType === 'beverage' ? 'ml' : 'gram';
    if (effectiveUnit !== baseUnit) {
      list.push({ unit: baseUnit, weightInGrams: 1 });
    }

    // 4. Add common household criteria presets for this type
    const commonPresets = SERVING_CRITERIA_PRESETS[foodType].filter(
      (p) => p.unit !== effectiveUnit && p.unit !== standardUnit && p.unit !== baseUnit
    );

    for (const preset of commonPresets.slice(0, 3)) {
      list.push({ unit: preset.unit, weightInGrams: preset.weightInGrams });
    }

    return list;
  }, [effectiveUnit, numWeight, foodType]);

  const isValid = name.trim().length > 0 && numCal > 0 && numWeight > 0;
  const activeCategory = isCustomCategoryMode ? customCategory.trim() || 'Custom Foods' : category;

  const handleSave = async (autoLog: boolean) => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    haptics.success();

    const customItem: FoodItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      category: activeCategory,
      baseMacrosPer100g,
      servings: generatedServings,
      calories: numCal,
      protein: numP,
      carbs: numC,
      fats: numF,
      servingSize: `1 ${effectiveUnit} (${numWeight}${foodType === 'beverage' ? 'ml' : 'g'})`,
    };

    onSaved(customItem, autoLog);
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-950/85 backdrop-blur-xl text-zinc-100 overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="relative w-full max-w-xl my-auto rounded-[28px] bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto border border-[var(--md-outline-variant)]/30">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/5 flex items-center justify-center"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="space-y-1.5 pr-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Criteria Food Ingestion</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
              Add Custom Food to Database
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 font-sans">
              Configure food classification and enter macros per your preferred criteria (bowl, 100g, piece, ml). Other units are auto-calculated.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave(false);
            }}
            className="space-y-5"
          >
            {/* STEP 1: FOOD TYPE SELECTOR (Solid, Beverage, Other) */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase text-zinc-400">
                1. Food Classification
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['solid', 'beverage', 'other'] as FoodType[]).map((type) => {
                  const info = PREDEFINED_CATEGORIES[type];
                  const Icon = info.icon;
                  const isSelected = foodType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleFoodTypeChange(type)}
                      className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-mono font-medium transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                        isSelected
                          ? 'bg-[#00FF41]/15 text-[#00FF41] border-[#00FF41]/40 font-bold shadow-[0_0_12px_rgba(0,255,65,0.15)]'
                          : 'bg-zinc-950 text-zinc-400 border-white/5 hover:border-white/15 hover:text-zinc-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: PRE-DEFINED CATEGORIES */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-400 uppercase">2. Category</span>
                <button
                  type="button"
                  onClick={() => setIsCustomCategoryMode(!isCustomCategoryMode)}
                  className="text-xs text-[#00FF41] hover:underline cursor-pointer"
                >
                  {isCustomCategoryMode ? '← Pick Pre-defined' : '+ Custom Category'}
                </button>
              </div>

              {isCustomCategoryMode ? (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. Grandma's Secret Recipes, Keto Desserts..."
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-sans text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#00FF41]/50"
                  autoFocus
                />
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-zinc-950 rounded-xl border border-white/5">
                  {PREDEFINED_CATEGORIES[foodType].categories.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          haptics.tick();
                          setCategory(cat);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-sans transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#00FF41] text-zinc-950 font-bold shadow-sm'
                            : 'bg-white/5 text-zinc-300 hover:bg-white/10 border border-white/5'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* STEP 3: FOOD NAME */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-zinc-400">
                3. Food Item Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  foodType === 'beverage'
                    ? 'e.g. Cold Brew Coffee, Mango Lassi, Whey Protein Shake'
                    : 'e.g. Paneer Butter Masala, Roti, Protein Bar'
                }
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-sans text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#00FF41]/50"
              />
            </div>

            {/* STEP 4: SERVING CRITERIA SELECTOR */}
            <div className="space-y-2 p-4 rounded-2xl bg-zinc-950 border border-white/5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-[#00FF41]" />
                  <span>4. Serving Criteria</span>
                </span>
                <span className="text-[10px] text-zinc-500">
                  Select unit to enter macros for
                </span>
              </div>

              {/* Predefined Serving Criteria Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SERVING_CRITERIA_PRESETS[foodType].map((preset) => {
                  const isSelected = selectedPresetUnit === preset.unit && !customUnitName;
                  return (
                    <button
                      key={preset.unit}
                      type="button"
                      onClick={() => handleSelectPresetServing(preset)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-[#00FF41]/20 text-[#00FF41] border-[#00FF41]/40 font-bold'
                          : 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/10 hover:text-zinc-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Unit Weight Customization */}
              <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="space-y-1">
                  <span className="text-zinc-400 block">Serving Label:</span>
                  <input
                    type="text"
                    value={effectiveUnit}
                    onChange={(e) => setCustomUnitName(e.target.value)}
                    placeholder="e.g. 1 bowl"
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-[#00FF41]/50"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-zinc-400 block">
                    Weight ({foodType === 'beverage' ? 'ml / g' : 'grams'}):
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={servingWeightGrams}
                    onChange={(e) => setServingWeightGrams(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-[#00FF41]/50 tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* STEP 5: MACRO VALUES FOR THE CHOSEN CRITERIA */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase text-zinc-400 block">
                5. Nutrition per 1 {effectiveUnit} ({numWeight}{foodType === 'beverage' ? 'ml' : 'g'})
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-[#00FF41]">
                    Calories (kcal) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    placeholder="e.g. 240"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#00FF41] placeholder-zinc-700 focus:outline-none focus:border-[#00FF41]/50 tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-rose-400">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    placeholder="0"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-rose-400/50 tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-cyan-400">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    placeholder="0"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-cyan-400/50 tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-amber-400">
                    Fats (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={fats}
                    onChange={(e) => setFats(e.target.value)}
                    placeholder="0"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-amber-400/50 tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* MULTI-SERVING PREVIEW DRAWER */}
            {numCal > 0 && (
              <div className="p-3.5 rounded-2xl bg-zinc-950/70 border border-white/5 space-y-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setShowMultiServingPreview(!showMultiServingPreview)}
                  className="w-full flex items-center justify-between text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#00FF41]" />
                    <span>Auto-Generated Serving Options ({generatedServings.length})</span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${showMultiServingPreview ? 'rotate-180' : ''}`}
                  />
                </button>

                {showMultiServingPreview && (
                  <div className="pt-2 border-t border-white/5 space-y-1.5 max-h-36 overflow-y-auto">
                    {generatedServings.map((serving) => {
                      const scale = serving.weightInGrams / 100;
                      const sCal = Math.round(baseMacrosPer100g.calories * scale);
                      const sP = Math.round(baseMacrosPer100g.protein * scale * 10) / 10;
                      const sC = Math.round(baseMacrosPer100g.carbs * scale * 10) / 10;
                      const sF = Math.round(baseMacrosPer100g.fats * scale * 10) / 10;
                      return (
                        <div
                          key={serving.unit}
                          className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-white/5"
                        >
                          <span className="text-zinc-300 font-bold">{serving.unit}</span>
                          <span className="text-zinc-500">
                            <span className="text-[#00FF41] font-bold">{sCal} kcal</span> · P: {sP}g · C: {sC}g · F: {sF}g
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={!isValid || isSubmitting}
                className="w-full sm:flex-1 min-h-[44px] py-2.5 px-4 rounded-xl font-mono text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-white/10 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4 text-[#00FF41]" />
                <span>Save to Database</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={!isValid || isSubmitting}
                className="w-full sm:flex-1 min-h-[44px] py-2.5 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-400 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save &amp; Log Food</span>
              </button>
            </div>
          </form>
        </div>
      </m.div>
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
};
