import React, { useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  Search,
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react';
import { useSemanticSearch } from '../hooks/useSemanticSearch';
import { calculateCompositeRecipe, type IngredientInput } from '../utils/recipeMath';
import { db, type FoodItem } from '../db/db';
import { useHaptics } from '../hooks/useHaptics';

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
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12 }}
        className="relative overflow-hidden rounded-[28px] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] shadow-lg p-6 sm:p-8 space-y-6 touch-pan-y"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--md-outline-variant)]/20 pb-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--md-on-surface)] font-display">
              Recipe Builder
            </h2>
            <p className="text-xs sm:text-sm text-[var(--md-on-surface-variant)] font-sans">
              Combine ingredients to calculate total calories and nutrition for your recipe.
            </p>
          </div>

          {/* Aggregated Calories Readout */}
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--md-on-surface-variant)]">
              Recipe Total ({compositeOutput.totalWeightInGrams}g)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-[var(--md-primary)] font-mono tracking-tight tabular-nums">
                {compositeOutput.totalCalories}
              </span>
              <span className="text-xs font-mono font-semibold text-[var(--md-on-surface-variant)]">kcal</span>
            </div>
            <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
              ~{compositeOutput.baseMacrosPer100g.calories} kcal / 100g
            </span>
          </div>
        </div>

        {/* Live Aggregated Macros Strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--md-surface-container-low)] text-center transition-colors">
            <span className="block text-[10px] uppercase font-mono font-bold text-[var(--md-primary)]">
              Protein
            </span>
            <span className="text-base sm:text-lg font-bold text-[var(--md-on-surface)] font-mono tabular-nums">
              {compositeOutput.totalProtein}g
            </span>
            <span className="block text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums mt-0.5">
              ({compositeOutput.baseMacrosPer100g.protein}g / 100g)
            </span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--md-secondary-container)] text-center transition-colors">
            <span className="block text-[10px] uppercase font-mono font-bold text-[var(--md-on-secondary-container)]">
              Carbs
            </span>
            <span className="text-base sm:text-lg font-bold text-[var(--md-on-secondary-container)] font-mono tabular-nums">
              {compositeOutput.totalCarbs}g
            </span>
            <span className="block text-[10px] text-[var(--md-on-secondary-container)]/70 font-mono tabular-nums mt-0.5">
              ({compositeOutput.baseMacrosPer100g.carbs}g / 100g)
            </span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-[var(--md-tertiary-container)] text-center transition-colors">
            <span className="block text-[10px] uppercase font-mono font-bold text-[var(--md-on-tertiary-container)]">
              Fats
            </span>
            <span className="text-base sm:text-lg font-bold text-[var(--md-on-tertiary-container)] font-mono tabular-nums">
              {compositeOutput.totalFats}g
            </span>
            <span className="block text-[10px] text-[var(--md-on-tertiary-container)]/70 font-mono tabular-nums mt-0.5">
              ({compositeOutput.baseMacrosPer100g.fats}g / 100g)
            </span>
          </div>
        </div>

        {/* Recipe Name Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--md-on-surface-variant)] font-sans">
            Dish / Recipe Name
          </label>
          <input
            type="text"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="e.g. Khichdi with Ghee, Homemade Dal Makhani, Protein Smoothie"
            className="w-full bg-[var(--md-surface-container-high)] border border-[var(--md-outline-variant)]/30 rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--md-on-surface)] placeholder-[var(--md-on-surface-variant)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)] transition-colors font-sans"
          />
        </div>

        {/* Search Bar for Raw Ingredients */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--md-on-surface-variant)] flex items-center justify-between font-sans">
            <span>Find &amp; Add Ingredients</span>
            <span className="text-[var(--md-on-surface-variant)]/70 font-normal font-mono text-[11px]">AI Semantic Lookup</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--md-on-surface-variant)]">
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--md-primary)]" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search ingredient (e.g. 'Rice', 'Dal', 'Ghee', 'Paneer')..."
              className="w-full bg-[var(--md-surface-container-high)] border border-[var(--md-outline-variant)]/30 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium text-[var(--md-on-surface)] placeholder-[var(--md-on-surface-variant)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)] transition-all font-sans"
            />
          </div>

          {/* Quick Dropdown of Results */}
          <AnimatePresence>
            {searchQuery.trim() && results.length > 0 && (
              <m.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="rounded-2xl border border-[var(--md-outline-variant)]/30 bg-[var(--md-surface-container-highest)] shadow-2xl p-2 space-y-1 max-h-56 overflow-y-auto"
              >
                {results.map((food) => (
                  <div
                    key={food.id}
                    className="p-2.5 rounded-xl hover:bg-[var(--md-surface-container-high)] flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    onClick={() => handleAddIngredient(food)}
                  >
                    <div>
                      <div className="text-xs font-bold text-[var(--md-on-surface)] font-sans">{food.name}</div>
                      <div className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
                        {food.baseMacrosPer100g.calories} kcal / 100g &bull;{' '}
                        {food.servings?.map((s) => s.unit).join(', ')}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </m.div>
            )}
          </AnimatePresence>
        </div>

        {/* Selected Ingredients Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--md-on-surface-variant)] font-sans">
              Recipe Ingredients ({ingredients.length})
            </span>
            <span className="text-xs text-[var(--md-on-surface-variant)] font-mono tabular-nums">
              Total Weight: {compositeOutput.totalWeightInGrams}g
            </span>
          </div>

          {ingredients.length === 0 ? (
            <div className="py-8 border border-dashed border-[var(--md-outline-variant)]/30 rounded-2xl text-center space-y-1.5 bg-[var(--md-surface-container-low)]">
              <UtensilsCrossed className="w-6 h-6 text-[var(--md-on-surface-variant)] mx-auto opacity-60" />
              <p className="text-xs font-medium text-[var(--md-on-surface)] font-sans">No ingredients added yet.</p>
              <p className="text-[11px] text-[var(--md-on-surface-variant)] font-sans">
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
                  <m.div
                    key={`${item.food.id}-${index}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className="p-3.5 rounded-2xl bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="space-y-0.5 flex-1">
                      <div className="text-xs font-bold text-[var(--md-on-surface)] font-display">
                        {item.food.name}
                      </div>
                      <div className="text-[11px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
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
                        className="w-16 bg-[var(--md-surface-container-highest)] border border-[var(--md-outline-variant)]/30 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-center text-[var(--md-on-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--md-primary)] tabular-nums"
                      />

                      {/* Serving Unit Dropdown */}
                      <select
                        value={item.unit}
                        onChange={(e) => handleUpdateUnit(index, e.target.value)}
                        className="bg-[var(--md-surface-container-highest)] border border-[var(--md-outline-variant)]/30 rounded-xl px-2.5 py-1.5 text-xs font-sans font-semibold text-[var(--md-on-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--md-primary)] cursor-pointer"
                      >
                        {item.food.servings?.map((s) => (
                          <option key={s.unit} value={s.unit} className="bg-[var(--md-surface)] text-[var(--md-on-surface)]">
                            {s.unit} ({s.weightInGrams}g)
                          </option>
                        ))}
                      </select>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(index)}
                        className="min-h-[36px] min-w-[36px] p-1.5 text-[var(--md-on-surface-variant)] hover:text-[var(--md-error)] hover:bg-[var(--md-error-container)]/30 rounded-xl transition-colors flex items-center justify-center cursor-pointer m3-state-layer"
                        title="Remove ingredient"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </m.div>
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
          className={`w-full min-h-[52px] py-3.5 px-6 rounded-full font-bold text-sm tracking-tight transition-all shadow-md flex items-center justify-center gap-2 m3-state-layer ${
            saveSuccess
              ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
              : !recipeName.trim() || ingredients.length === 0
              ? 'bg-[var(--md-surface-container-highest)] text-[var(--md-on-surface-variant)]/50 cursor-not-allowed opacity-60'
              : 'bg-[var(--md-primary)] text-[var(--md-on-primary)] hover:brightness-105 active:scale-95 cursor-pointer font-display'
          }`}
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
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
      </m.div>
    </div>
  );
};
