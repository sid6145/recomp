import type { BaseMacros, CalculatedMacros } from '../db/db';

/**
 * Pure utility function to calculate final calories and macronutrients
 * given the base profile per 100g, unit weight in grams, and user quantity.
 * 
 * Formula:
 * Total Weight (g) = servingWeightInGrams * inputQuantity
 * Multiplier       = Total Weight / 100
 * Final Values     = baseMacros * Multiplier (rounded to 1 decimal place)
 */
export function calculateDynamicMacros(
  baseMacrosPer100g: BaseMacros,
  servingWeightInGrams: number,
  inputQuantity: number
): CalculatedMacros {
  // Guard against non-numeric or negative inputs
  const validQuantity = Math.max(0, isNaN(inputQuantity) ? 0 : inputQuantity);
  const totalWeightInGrams = servingWeightInGrams * validQuantity;
  const multiplier = totalWeightInGrams / 100;

  const roundToOneDecimal = (val: number): number => {
    return Math.round(val * 10) / 10;
  };

  return {
    calories: Math.round(baseMacrosPer100g.calories * multiplier),
    protein: roundToOneDecimal(baseMacrosPer100g.protein * multiplier),
    carbs: roundToOneDecimal(baseMacrosPer100g.carbs * multiplier),
    fats: roundToOneDecimal(baseMacrosPer100g.fats * multiplier),
  };
}
