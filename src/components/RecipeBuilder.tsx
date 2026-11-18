import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  Search,
  Sparkles,
  Check,
  ChefHat,
  Loader2,
} from 'lucide-react';
import { useSemanticSearch } from '../hooks/useSemanticSearch';
import { calculateCompositeRecipe, type IngredientInput } from '../utils/recipeMath';
import { db, type FoodItem } from '../db/db';
import { useHaptics } from '../hooks/useHaptics';
import { AgenticTransition } from '../utils/motionPresets';

interface RecipeBuilderProps {
  onRecipeSaved?: () => void;
}

export const RecipeBuilder: React.FC<RecipeBuilderProps> = ({ onRecipeSaved }) => {
  const [recipeName, setRecipeName] = useState<string>('');
  const [ingredients, setIngredients] = useState<IngredientInput[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const { search, results, isSearching, indexItem } = useSemanticSearch();
  const haptics = useHaptics();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    search(q);
  };

  // Add raw ingredient to recipe composition
  const handleAddIngredient = (food: FoodItem) => {
    haptics.tick();
    const defaultUnit = food.servings?.[0]?.unit ?? 'gram';
    setIngredients((prev) => [
      ...prev,
      {
        food,
        unit: defaultUnit,
        quantity: 1,
      },
    ]);
    setSearchQuery('');
  };

  // Update quantity of an added ingredient
  const handleUpdateQuantity = (index: number, quantity: number) => {
    haptics.tick();
    setIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity };
      return updated;
    });
  };

  // Update serving unit of an added ingredient
  const handleUpdateUnit = (index: number, unit: string) => {
    haptics.tick();
    setIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], unit };
      return updated;
    });
  };

  // Remove ingredient
  const handleRemoveIngredient = (index: number) => {
    haptics.tick();
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // Compute live aggregated macros across all ingredients
  const compositeOutput = useMemo(() => {
    return calculateCompositeRecipe(recipeName || 'Custom Dish', ingredients);
  }, [recipeName, ingredients]);

  // Save as Custom Dish
  const handleSaveRecipe = async () => {
    if (!recipeName.trim() || ingredients.length === 0) return;

    try {
      setIsSaving(true);
      haptics.tick();

      const generatedId = `custom_recipe_${Date.now()}`;

      // 1. Save to Dexie recipes table
      await db.recipes.add({
        name: compositeOutput.recipeName,
        ingredients: compositeOutput.ingredients,
        totalWeightInGrams: compositeOutput.totalWeightInGrams,
        baseMacrosPer100g: compositeOutput.baseMacrosPer100g,
        totalCalories: compositeOutput.totalCalories,
        totalProtein: compositeOutput.totalProtein,
        totalCarbs: compositeOutput.totalCarbs,
        totalFats: compositeOutput.totalFats,
        servings: compositeOutput.servings,
        createdAt: Date.now(),
      });

      // 2. Also register as a standard food item in db.foods so it appears in standard search/logging
      const customFoodItem: FoodItem = {
        id: generatedId,
        name: compositeOutput.recipeName,
        baseMacrosPer100g: compositeOutput.baseMacrosPer100g,
        servings: compositeOutput.servings,
        calories: compositeOutput.totalCalories,
        protein: compositeOutput.totalProtein,
        carbs: compositeOutput.totalCarbs,
        fats: compositeOutput.totalFats,
        servingSize: `1 serving (${compositeOutput.totalWeightInGrams}g)`,
      };

      await db.foods.put(customFoodItem);

      // 3. Command Web Worker to generate a semantic embedding vector for this new custom dish
      indexItem({
        id: generatedId,
        name: compositeOutput.recipeName,
        servings: compositeOutput.servings,
      });

      haptics.success();
      setSaveSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        setSaveSuccess(false);
        setRecipeName('');
        setIngredients([]);
        if (onRecipeSaved) onRecipeSaved();
      }, 1000);
    } catch (err) {
      console.error('Failed to save recipe:', err);
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 touch-pan-y">
      {/* Header & Live Aggregated Nutrition Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={AgenticTransition}
        className="relative overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/90 backdrop-blur-2xl shadow-2xl p-6 sm:p-8 space-y-6 touch-pan-y"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/20">
              <ChefHat className="w-3.5 h-3.5" />
              <span>Composite Recipe Builder</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-100 font-sans">
              Recipe Builder
            </h2>
            <p className="text-xs text-neutral-400 font-sans">
              Combine ingredients to calculate total calories and nutrition for your recipe.
            </p>
          </div>

          {/* Aggregated Calories Readout */}
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
              Recipe Total ({compositeOutput.totalWeightInGrams}g)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-amber-400 text-[#00FF41] font-mono tracking-tight drop-shadow-[0_0_15px_rgba(0,255,65,0.2)] tabular-nums">
                {compositeOutput.totalCalories}
              </span>
              <span className="text-xs font-mono font-semibold text-neutral-400">kcal</span>
            </div>
            <span className="text-[10px] text-neutral-500 font-mono tabular-nums">
              ~{compositeOutput.baseMacrosPer100g.calories} kcal / 100g
            </span>
          </div>
        </div>

        {/* Live Aggregated Macros Strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
            <span className="block text-[10px] uppercase font-mono font-bold text-rose-400">
              Protein
            </span>
            <span className="text-base sm:text-lg font-bold text-rose-200 font-mono tabular-nums">
              {compositeOutput.totalProtein}g
            </span>
            <span className="block text-[10px] text-neutral-500 font-mono tabular-nums mt-0.5">
              ({compositeOutput.baseMacrosPer100g.protein}g / 100g)
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-center">
            <span className="block text-[10px] uppercase font-mono font-bold text-sky-400">
              Carbs
            </span>
            <span className="text-base sm:text-lg font-bold text-sky-200 font-mono tabular-nums">
              {compositeOutput.totalCarbs}g
            </span>
            <span className="block text-[10px] text-neutral-500 font-mono tabular-nums mt-0.5">
              ({compositeOutput.baseMacrosPer100g.carbs}g / 100g)
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
            <span className="block text-[10px] uppercase font-mono font-bold text-amber-400">
              Fats
            </span>
            <span className="text-base sm:text-lg font-bold text-amber-200 font-mono tabular-nums">
              {compositeOutput.totalFats}g
            </span>
            <span className="block text-[10px] text-neutral-500 font-mono tabular-nums mt-0.5">
              ({compositeOutput.baseMacrosPer100g.fats}g / 100g)
            </span>
          </div>
        </div>

        {/* Recipe Name Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 font-sans">
            Dish / Recipe Name
          </label>
          <input
            type="text"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="e.g. Khichdi with Ghee, Homemade Dal Makhani, Protein Smoothie"
            className="w-full bg-neutral-950 border border-white/5 rounded-2xl px-4 py-3 text-sm font-semibold text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#00FF41]/50 focus:border-[#00FF41]/50 transition-colors font-sans"
          />
        </div>

        {/* Search Bar for Raw Ingredients */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center justify-between font-sans">
            <span>Find & Add Ingredients</span>
            <span className="text-neutral-500 font-normal font-mono text-[11px]">AI Semantic Lookup</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#00FF41]" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search ingredient (e.g. 'Rice', 'Dal', 'Ghee', 'Paneer')..."
              className="w-full bg-neutral-950 border border-white/5 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#00FF41]/50 focus:border-[#00FF41]/50 transition-all font-sans"
            />
          </div>

          {/* Quick Dropdown of Results */}
          <AnimatePresence>
            {searchQuery.trim() && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={AgenticTransition}
                className="rounded-2xl border border-white/5 bg-neutral-900/95 shadow-2xl p-2 space-y-1 max-h-56 overflow-y-auto"
              >
                {results.map((food) => (
                  <div
                    key={food.id}
                    className="p-2.5 rounded-xl hover:bg-neutral-800/80 hover:bg-zinc-800/80 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    onClick={() => handleAddIngredient(food)}
                  >
                    <div>
                      <div className="text-xs font-bold text-neutral-200 font-sans">{food.name}</div>
                      <div className="text-[10px] text-neutral-400 font-mono tabular-nums">
                        {food.baseMacrosPer100g.calories} kcal / 100g &bull;{' '}
                        {food.servings?.map((s) => s.unit).join(', ')}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/20 hover:bg-[#00FF41] hover:text-neutral-950 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Selected Ingredients Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-sans">
              Recipe Ingredients ({ingredients.length})
            </span>
            <span className="text-xs text-neutral-500 font-mono tabular-nums">
              Total Weight: {compositeOutput.totalWeightInGrams}g
            </span>
          </div>

          {ingredients.length === 0 ? (
            <div className="py-8 border border-dashed border-white/5 rounded-2xl text-center space-y-1.5 bg-neutral-950/40">
              <UtensilsCrossed className="w-6 h-6 text-neutral-600 mx-auto" />
              <p className="text-xs font-medium text-neutral-400 font-sans">No ingredients added yet.</p>
              <p className="text-[11px] text-neutral-500 font-sans">
                Use the search input above to pick ingredients and adjust portions.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {ingredients.map((item, index) => {
                const currentServing =
                  item.food.servings?.find((s) => s.unit === item.unit) ??
                  item.food.servings?.[0];
                const itemGrams = currentServing
                  ? Math.round(currentServing.weightInGrams * item.quantity * 10) / 10
                  : 0;

                const macros = compositeOutput.ingredients[index]?.calculatedMacros ?? {
                  calories: 0,
                  protein: 0,
                  carbs: 0,
                  fats: 0,
                };

                return (
                  <motion.div
                    key={`${item.food.id}-${index}`}
                    layout="position"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={AgenticTransition}
                    className="p-3.5 rounded-2xl bg-neutral-950/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 flex-1">
                      <div className="text-xs font-bold text-neutral-200 font-sans">
                        {item.food.name}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono tabular-nums">
                        {macros.calories} kcal &bull; P: {macros.protein}g, C: {macros.carbs}g, F: {macros.fats}g ({itemGrams}g)
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Quantity Input */}
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateQuantity(index, parseFloat(e.target.value) || 0)
                        }
                        className="w-16 bg-neutral-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-center text-neutral-100 focus:outline-none focus:border-[#00FF41]/50 tabular-nums"
                      />

                      {/* Serving Unit Dropdown */}
                      <select
                        value={item.unit}
                        onChange={(e) => handleUpdateUnit(index, e.target.value)}
                        className="bg-neutral-900 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs font-sans font-semibold text-neutral-200 focus:outline-none focus:border-[#00FF41]/50 cursor-pointer"
                      >
                        {item.food.servings?.map((s) => (
                          <option key={s.unit} value={s.unit} className="bg-neutral-950">
                            {s.unit} ({s.weightInGrams}g)
                          </option>
                        ))}
                      </select>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(index)}
                        className="min-h-[36px] min-w-[36px] p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800/80 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                        title="Remove ingredient"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Save as Custom Dish Button */}
        <button
          type="button"
          disabled={isSaving || !recipeName.trim() || ingredients.length === 0}
          onClick={handleSaveRecipe}
          className={`w-full min-h-[48px] py-3.5 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 ${
            saveSuccess
              ? 'bg-[#00FF41] text-neutral-950 shadow-[0_0_20px_rgba(0,255,65,0.3)]'
              : !recipeName.trim() || ingredients.length === 0
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-white/5'
              : 'bg-[#00FF41] hover:bg-[#00FF41]/90 text-neutral-950 shadow-[0_0_15px_rgba(0,255,65,0.2)] active:scale-95 cursor-pointer font-mono font-bold'
          }`}
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4 text-neutral-950" />
              <span>Saved to Custom Dishes</span>
            </>
          ) : isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Recipe...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>
                Save as Custom Dish ({compositeOutput.totalCalories} kcal)
              </span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
};
