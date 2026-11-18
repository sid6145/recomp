import { describe, it, expect } from 'vitest';
import realIndianFoods from '../src/db/realIndianFoods.json';

describe('IFCT 2017 & INDB Dataset Integrity Tests', () => {
  it('Schema Validation: every object has id, name, baseMacrosPer100g, and servings with gram unit', () => {
    expect(realIndianFoods.length).toBeGreaterThan(500);

    for (const food of realIndianFoods) {
      expect(food).toHaveProperty('id');
      expect(typeof food.id).toBe('string');
      expect(food.id.length).toBeGreaterThan(0);

      expect(food).toHaveProperty('name');
      expect(typeof food.name).toBe('string');
      expect(food.name.length).toBeGreaterThan(0);

      expect(food).toHaveProperty('baseMacrosPer100g');
      expect(typeof food.baseMacrosPer100g.calories).toBe('number');
      expect(typeof food.baseMacrosPer100g.protein).toBe('number');
      expect(typeof food.baseMacrosPer100g.carbs).toBe('number');
      expect(typeof food.baseMacrosPer100g.fats).toBe('number');

      expect(Array.isArray(food.servings)).toBe(true);
      expect(food.servings.length).toBeGreaterThanOrEqual(1);

      // Must contain standard "gram" unit with weightInGrams: 1
      const gramUnit = food.servings.find((s) => s.unit === 'gram');
      expect(gramUnit).toBeDefined();
      expect(gramUnit?.weightInGrams).toBe(1);
    }
  });

  it('Granular Unit Verification: Sugar / Sucrose explicitly contains teaspoon (4g) and tablespoon (15g)', () => {
    const sugarItem = realIndianFoods.find(
      (f) =>
        f.name.toLowerCase().includes('sugar') ||
        f.name.toLowerCase().includes('sucrose')
    );

    expect(sugarItem).toBeDefined();

    const teaspoon = sugarItem?.servings.find((s) => s.unit === 'teaspoon');
    const tablespoon = sugarItem?.servings.find((s) => s.unit === 'tablespoon');

    expect(teaspoon).toBeDefined();
    expect(teaspoon?.weightInGrams).toBe(4);

    expect(tablespoon).toBeDefined();
    expect(tablespoon?.weightInGrams).toBe(15);
  });

  it('Macro Math Sanity Check: (Protein * 4) + (Carbs * 4) + (Fats * 9) roughly equals stated calories within 10%', () => {
    // Sample 50 random items
    const sample = realIndianFoods.slice(0, 50);

    for (const item of sample) {
      const { calories, protein, carbs, fats } = item.baseMacrosPer100g;
      const expectedAtwaterCalories = protein * 4 + carbs * 4 + fats * 9;

      if (calories === 0) {
        expect(expectedAtwaterCalories).toBeLessThanOrEqual(5);
        continue;
      }

      const diff = Math.abs(calories - expectedAtwaterCalories);
      const margin = Math.max(calories, expectedAtwaterCalories) * 0.10;

      // Allow 10% margin of error or up to 5 kcal for low-calorie foods with rounding
      expect(diff).toBeLessThanOrEqual(Math.max(margin, 5));
    }
  });
});
