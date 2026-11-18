import type { BaseMacros, FoodItem, RecipeIngredient, ServingOption } from '../db/db';
import { calculateDynamicMacros } from './nutritionMath';

export interface IngredientInput {
  food: FoodItem;
  unit: string;
  quantity: number;
}

export interface CompositeRecipeOutput {
  recipeName: string;
  ingredients: RecipeIngredient[];
  totalWeightInGrams: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  baseMacrosPer100g: BaseMacros;
  servings: ServingOption[];
}

/**
 * Pure calculation utility to aggregate composite recipes from individual ingredients.
 * Calculates exact total weights, cumulative calories/macros, and derives standard baseMacrosPer100g.
 */
export function calculateCompositeRecipe(
  recipeName: string,
  ingredientsData: IngredientInput[]
): CompositeRecipeOutput {
  let cumulativeWeight = 0;
  let cumulativeCalories = 0;
  let cumulativeProtein = 0;
  let cumulativeCarbs = 0;
  let cumulativeFats = 0;

  const processedIngredients: RecipeIngredient[] = [];

  for (const item of ingredientsData) {
    const { food, unit, quantity } = item;
    const validQty = Math.max(0, isNaN(quantity) ? 0 : quantity);

    // Locate the serving weight in grams for the selected unit
    const matchedServing =
      food.servings?.find((s) => s.unit === unit) ??
      food.servings?.[0] ?? { unit: 'gram', weightInGrams: 1 };

    const ingredientWeight = matchedServing.weightInGrams * validQty;
    const macros = calculateDynamicMacros(
      food.baseMacrosPer100g,
      matchedServing.weightInGrams,
      validQty
    );

    cumulativeWeight += ingredientWeight;
    cumulativeCalories += macros.calories;
    cumulativeProtein += macros.protein;
    cumulativeCarbs += macros.carbs;
    cumulativeFats += macros.fats;

    processedIngredients.push({
      foodId: String(food.id ?? ''),
      foodName: food.name,
      unit,
      quantity: validQty,
      weightInGrams: Math.round(ingredientWeight * 10) / 10,
      calculatedMacros: macros,
    });
  }

  // Round cumulative sums
  const roundedWeight = Math.round(cumulativeWeight * 10) / 10;
  const roundedCalories = Math.round(cumulativeCalories);
  const roundedProtein = Math.round(cumulativeProtein * 10) / 10;
  const roundedCarbs = Math.round(cumulativeCarbs * 10) / 10;
  const roundedFats = Math.round(cumulativeFats * 10) / 10;

  // Derive baseMacrosPer100g: (totalMacro / totalWeight) * 100
  const factor = roundedWeight > 0 ? 100 / roundedWeight : 1;

  const baseMacrosPer100g: BaseMacros = {
    calories: Math.round(roundedCalories * factor),
    protein: Math.round(roundedProtein * factor * 10) / 10,
    carbs: Math.round(roundedCarbs * factor * 10) / 10,
    fats: Math.round(roundedFats * factor * 10) / 10,
  };

  // Standard serving options for the composite recipe
  const servings: ServingOption[] = [
    { unit: 'gram', weightInGrams: 1 },
    { unit: 'serving (full dish)', weightInGrams: roundedWeight > 0 ? roundedWeight : 100 },
    { unit: 'half portion', weightInGrams: roundedWeight > 0 ? Math.round(roundedWeight / 2) : 50 },
    { unit: 'katori (150g)', weightInGrams: 150 },
    { unit: 'bowl (250g)', weightInGrams: 250 },
    { unit: 'kg', weightInGrams: 1000 },
  ];

  return {
    recipeName,
    ingredients: processedIngredients,
    totalWeightInGrams: roundedWeight,
    totalCalories: roundedCalories,
    totalProtein: roundedProtein,
    totalCarbs: roundedCarbs,
    totalFats: roundedFats,
    baseMacrosPer100g,
    servings,
  };
}
