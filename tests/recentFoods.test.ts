import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db/db';
import { getRecentlyLoggedFoods } from '../src/db/recentFoods';

describe('getRecentlyLoggedFoods Utility', () => {
  beforeEach(async () => {
    await db.logs.clear();
    await db.foods.clear();
  });

  it('returns empty array when no logs exist', async () => {
    const recent = await getRecentlyLoggedFoods(10);
    expect(recent).toEqual([]);
  });

  it('returns unique recent foods ordered by timestamp descending', async () => {
    // Seed test foods
    await db.foods.bulkPut([
      {
        id: 'food_1',
        name: 'Oatmeal',
        baseMacrosPer100g: { calories: 389, protein: 16.9, carbs: 66.3, fats: 6.9 },
        servings: [{ unit: 'gram', weightInGrams: 1 }, { unit: '100g', weightInGrams: 100 }],
      },
      {
        id: 'food_2',
        name: 'Boiled Egg',
        baseMacrosPer100g: { calories: 155, protein: 12.6, carbs: 1.1, fats: 10.6 },
        servings: [{ unit: 'gram', weightInGrams: 1 }, { unit: 'piece', weightInGrams: 50 }],
      },
      {
        id: 'food_3',
        name: 'Apple',
        baseMacrosPer100g: { calories: 52, protein: 0.3, carbs: 13.8, fats: 0.2 },
        servings: [{ unit: 'gram', weightInGrams: 1 }, { unit: 'piece', weightInGrams: 100 }],
      },
    ]);

    // Seed test logs with distinct timestamps
    await db.logs.bulkAdd([
      {
        date: '2026-11-18',
        foodId: 'food_1',
        foodName: 'Oatmeal',
        selectedUnit: 'gram',
        quantity: 50,
        calculatedMacros: { calories: 195, protein: 8.5, carbs: 33, fats: 3.5 },
        totalCalories: 195,
        timestamp: 1000,
      },
      {
        date: '2026-11-18',
        foodId: 'food_2',
        foodName: 'Boiled Egg',
        selectedUnit: 'piece',
        quantity: 2,
        calculatedMacros: { calories: 155, protein: 12.6, carbs: 1.1, fats: 10.6 },
        totalCalories: 155,
        timestamp: 2000,
      },
      {
        date: '2026-11-18',
        foodId: 'food_1', // Duplicate log for food_1 later in the day
        foodName: 'Oatmeal',
        selectedUnit: 'gram',
        quantity: 50,
        calculatedMacros: { calories: 195, protein: 8.5, carbs: 33, fats: 3.5 },
        totalCalories: 195,
        timestamp: 3000,
      },
      {
        date: '2026-11-18',
        foodId: 'food_3',
        foodName: 'Apple',
        selectedUnit: 'piece',
        quantity: 1,
        calculatedMacros: { calories: 52, protein: 0.3, carbs: 13.8, fats: 0.2 },
        totalCalories: 52,
        timestamp: 4000,
      },
    ]);

    const recent = await getRecentlyLoggedFoods(2);
    // Most recent is food_3 (timestamp 4000), then food_1 (timestamp 3000)
    expect(recent.length).toBe(2);
    expect(recent[0].id).toBe('food_3');
    expect(recent[1].id).toBe('food_1');

    const recentAll = await getRecentlyLoggedFoods(10);
    // Unique list: food_3, food_1, food_2
    expect(recentAll.length).toBe(3);
    expect(recentAll.map((f) => f.id)).toEqual(['food_3', 'food_1', 'food_2']);
  });
});
