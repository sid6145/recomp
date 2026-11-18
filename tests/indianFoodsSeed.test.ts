import { describe, it, expect } from 'vitest';
import indianFoods from '../src/db/indianFoodsSeed.json';
import indianFoodsPart2 from '../src/db/indianFoodsSeed_Part2.json';

describe('Curated Indian Foods Dataset - Part 1 (indianFoodsSeed.json)', () => {
  it('contains exactly 300 structured items', () => {
    expect(Array.isArray(indianFoods)).toBe(true);
    expect(indianFoods.length).toBe(300);
  });

  it('validates schema integrity across all items in Part 1', () => {
    for (const food of indianFoods) {
      expect(typeof food.id).toBe('string');
      expect(food.id.length).toBeGreaterThan(0);

      expect(typeof food.name).toBe('string');
      expect(food.name.length).toBeGreaterThan(0);

      expect(typeof food.category).toBe('string');
      expect(food.category.length).toBeGreaterThan(0);

      const m = food.baseMacrosPer100g;
      expect(typeof m.calories).toBe('number');
      expect(m.calories).toBeGreaterThanOrEqual(0);
      expect(typeof m.protein).toBe('number');
      expect(m.protein).toBeGreaterThanOrEqual(0);
      expect(typeof m.carbs).toBe('number');
      expect(m.carbs).toBeGreaterThanOrEqual(0);
      expect(typeof m.fats).toBe('number');
      expect(m.fats).toBeGreaterThanOrEqual(0);

      expect(Array.isArray(food.servings)).toBe(true);
      expect(food.servings.length).toBeGreaterThanOrEqual(2);
      for (const s of food.servings) {
        expect(typeof s.unit).toBe('string');
        expect(typeof s.weightInGrams).toBe('number');
        expect(s.weightInGrams).toBeGreaterThan(0);
      }
    }
  });

  it('contains 50 items across all 6 core culinary categories', () => {
    const categoryCounts: Record<string, number> = {};
    for (const food of indianFoods) {
      categoryCounts[food.category] = (categoryCounts[food.category] || 0) + 1;
    }

    expect(categoryCounts['Drinks & Juices']).toBe(50);
    expect(categoryCounts['Home Cooked']).toBe(50);
    expect(categoryCounts['Street Food']).toBe(50);
    expect(categoryCounts['Fruits & Veg']).toBe(50);
    expect(categoryCounts['Sugars & Spices']).toBe(50);
    expect(categoryCounts['Sweets']).toBe(50);
  });

  it('verifies dynamic smart serving size engines', () => {
    // 1. Liquid items: ml (1g), glass (large) (250g), cup (small) (150g)
    const mangoLassi = indianFoods.find((f) => f.id === 'd_02');
    expect(mangoLassi).toBeDefined();
    expect(mangoLassi?.servings).toEqual([
      { unit: 'ml', weightInGrams: 1 },
      { unit: 'glass (large)', weightInGrams: 250 },
      { unit: 'cup (small)', weightInGrams: 150 },
    ]);

    // 2. Sugar & Oil items: gram (1g), teaspoon (5g), tablespoon (15g)
    const ghee = indianFoods.find((f) => f.id === 'r_02');
    expect(ghee).toBeDefined();
    expect(ghee?.servings).toEqual([
      { unit: 'gram', weightInGrams: 1 },
      { unit: 'teaspoon', weightInGrams: 5 },
      { unit: 'tablespoon', weightInGrams: 15 },
    ]);

    // 3. Curry & Dal items: gram (1g), katori (medium) (150g), bowl (large) (250g)
    const dalTadka = indianFoods.find((f) => f.id === 'h_01');
    expect(dalTadka).toBeDefined();
    expect(dalTadka?.servings).toEqual([
      { unit: 'gram', weightInGrams: 1 },
      { unit: 'katori (medium)', weightInGrams: 150 },
      { unit: 'bowl (large)', weightInGrams: 250 },
    ]);

    // 4. Solid cooked/snacks: gram (1g), piece (medium) (80g)
    const vadaPav = indianFoods.find((f) => f.id === 's_01');
    expect(vadaPav).toBeDefined();
    expect(vadaPav?.servings).toEqual([
      { unit: 'gram', weightInGrams: 1 },
      { unit: 'piece (medium)', weightInGrams: 80 },
    ]);

    // 5. Raw items: gram (1g), 100g (100g)
    const rawPeanuts = indianFoods.find((f) => f.id === 'r_06');
    expect(rawPeanuts).toBeDefined();
    expect(rawPeanuts?.servings).toEqual([
      { unit: 'gram', weightInGrams: 1 },
      { unit: '100g', weightInGrams: 100 },
    ]);
  });
});

describe('Curated Indian Foods Dataset - Part 2 (indianFoodsSeed_Part2.json)', () => {
  it('contains exactly 300 structured items', () => {
    expect(Array.isArray(indianFoodsPart2)).toBe(true);
    expect(indianFoodsPart2.length).toBe(300);
  });

  it('validates schema integrity across all items in Part 2', () => {
    for (const food of indianFoodsPart2) {
      expect(typeof food.id).toBe('string');
      expect(food.id.length).toBeGreaterThan(0);

      expect(typeof food.name).toBe('string');
      expect(food.name.length).toBeGreaterThan(0);

      expect(typeof food.category).toBe('string');
      expect(food.category.length).toBeGreaterThan(0);

      const m = food.baseMacrosPer100g;
      expect(typeof m.calories).toBe('number');
      expect(m.calories).toBeGreaterThanOrEqual(0);
      expect(typeof m.protein).toBe('number');
      expect(m.protein).toBeGreaterThanOrEqual(0);
      expect(typeof m.carbs).toBe('number');
      expect(m.carbs).toBeGreaterThanOrEqual(0);
      expect(typeof m.fats).toBe('number');
      expect(m.fats).toBeGreaterThanOrEqual(0);

      expect(Array.isArray(food.servings)).toBe(true);
      expect(food.servings.length).toBeGreaterThanOrEqual(2);
      for (const s of food.servings) {
        expect(typeof s.unit).toBe('string');
        expect(typeof s.weightInGrams).toBe('number');
        expect(s.weightInGrams).toBeGreaterThan(0);
      }
    }
  });

  it('contains 50 items across all 6 core culinary categories in Part 2', () => {
    const categoryCounts: Record<string, number> = {};
    for (const food of indianFoodsPart2) {
      categoryCounts[food.category] = (categoryCounts[food.category] || 0) + 1;
    }

    expect(categoryCounts['Drinks & Juices']).toBe(50);
    expect(categoryCounts['Home Cooked']).toBe(50);
    expect(categoryCounts['Street Food']).toBe(50);
    expect(categoryCounts['Fruits & Veg']).toBe(50);
    expect(categoryCounts['Sugars & Spices']).toBe(50);
    expect(categoryCounts['Sweets']).toBe(50);
  });

  it('has zero ID collisions between Part 1 and Part 2 (600 unique Indian food items)', () => {
    const allIds = new Set<string>();
    for (const f of indianFoods) {
      expect(allIds.has(f.id)).toBe(false);
      allIds.add(f.id);
    }
    for (const f of indianFoodsPart2) {
      expect(allIds.has(f.id)).toBe(false);
      allIds.add(f.id);
    }
    expect(allIds.size).toBe(600);
  });
});
