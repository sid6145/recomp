import { describe, it, expect } from 'vitest';
import { calculateCompositeRecipe, type IngredientInput } from '../src/utils/recipeMath';
import type { FoodItem } from '../src/db/db';

describe('Composite Recipe Builder Math', () => {
  const riceMock: FoodItem = {
    id: 'food_rice',
    name: 'Cooked White Rice',
    baseMacrosPer100g: {
      calories: 130,
      protein: 2.7,
      carbs: 28.2,
      fats: 0.3,
    },
    servings: [
      { unit: 'gram', weightInGrams: 1 },
      { unit: 'katori', weightInGrams: 150 },
      { unit: 'cup', weightInGrams: 200 },
    ],
  };

  const dalMock: FoodItem = {
    id: 'food_dal',
    name: 'Cooked Toor Dal',
    baseMacrosPer100g: {
      calories: 110,
      protein: 6.8,
      carbs: 16.5,
      fats: 1.8,
    },
    servings: [
      { unit: 'gram', weightInGrams: 1 },
      { unit: 'katori', weightInGrams: 150 },
      { unit: 'tablespoon', weightInGrams: 15 },
    ],
  };

  const gheeMock: FoodItem = {
    id: 'food_ghee',
    name: 'Cow Ghee',
    baseMacrosPer100g: {
      calories: 900,
      protein: 0.0,
      carbs: 0.0,
      fats: 100.0,
    },
    servings: [
      { unit: 'gram', weightInGrams: 1 },
      { unit: 'teaspoon', weightInGrams: 5 },
      { unit: 'tablespoon', weightInGrams: 15 },
    ],
  };

  it('correctly aggregates multi-ingredient composite recipe with standard units', () => {
    const ingredients: IngredientInput[] = [
      { food: riceMock, unit: 'katori', quantity: 1 }, // 150g -> 130 * 1.5 = 195 kcal
      { food: dalMock, unit: 'katori', quantity: 1 },  // 150g -> 110 * 1.5 = 165 kcal
      { food: gheeMock, unit: 'teaspoon', quantity: 1 }, // 5g -> 900 * 0.05 = 45 kcal
    ];

    const result = calculateCompositeRecipe('Dal Rice with Ghee', ingredients);

    // Total weight = 150 + 150 + 5 = 305g
    expect(result.totalWeightInGrams).toBe(305);

    // Calories: 195 + 165 + 45 = 405 kcal
    expect(result.totalCalories).toBe(405);

    // Protein: (2.7 * 1.5) + (6.8 * 1.5) + (0 * 0.05) = 4.05 + 10.2 + 0 = 14.25 -> 14.3
    expect(result.totalProtein).toBeCloseTo(14.3, 1);

    // Carbs: (28.2 * 1.5) + (16.5 * 1.5) + 0 = 42.3 + 24.75 = 67.05 -> 67.1
    expect(result.totalCarbs).toBeCloseTo(67.1, 1);

    // Fats: (0.3 * 1.5) + (1.8 * 1.5) + (100 * 0.05) = 0.45 + 2.7 + 5 = 8.15 -> 8.2
    expect(result.totalFats).toBeCloseTo(8.2, 1);

    // baseMacrosPer100g = (macro / 305) * 100
    // Calories/100g = (405 / 305) * 100 = 132.8 -> 133
    expect(result.baseMacrosPer100g.calories).toBe(Math.round((405 / 305) * 100));
    expect(result.baseMacrosPer100g.protein).toBeCloseTo((14.3 / 305) * 100, 1);
  });

  it('handles fractional weights and fractional quantities accurately', () => {
    const ingredients: IngredientInput[] = [
      { food: riceMock, unit: 'katori', quantity: 0.5 }, // 75g
      { food: gheeMock, unit: 'teaspoon', quantity: 1.5 }, // 7.5g
    ];

    const result = calculateCompositeRecipe('Light Rice with Ghee', ingredients);

    // Total weight = 75 + 7.5 = 82.5g
    expect(result.totalWeightInGrams).toBe(82.5);

    // Rice: 130 * 0.75 = 97.5 kcal (rounds to 98). Ghee: 900 * 0.075 = 67.5 kcal (rounds to 68). Total = 166 kcal.
    expect(result.totalCalories).toBe(166);
    expect(result.totalWeightInGrams).toBeGreaterThan(0);
  });

  it('handles empty ingredients gracefully', () => {
    const result = calculateCompositeRecipe('Empty Dish', []);

    expect(result.totalWeightInGrams).toBe(0);
    expect(result.totalCalories).toBe(0);
    expect(result.baseMacrosPer100g.calories).toBe(0);
  });
});
