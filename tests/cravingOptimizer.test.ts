import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../src/db/db';
import {
  optimizeMealForCraving,
  calculateNutrientDensityRatio,
  detectPendingMealContext,
  DEFAULT_HABITUAL_DINNER,
  DEFAULT_HABITUAL_LUNCH,
} from '../src/utils/cravingOptimizer';
import {
  ingestManualCravingFood,
  fetchPastWeekDinnerPattern,
  fetchPastWeekPendingMealPattern,
  calculateCravingRebalance,
} from '../src/db/cravingManager';

describe('Deterministic Craving & Meal Re-balancing Engine', () => {
  beforeEach(async () => {
    await db.customFoods.clear();
    await db.logs.clear();
  });

  describe('Mathematical Determinism & Exact User Scenario', () => {
    it('accurately reproduces the user example: 800 kcal left - 300 kcal tiramisu = 500 kcal dinner, skipping rice and keeping chapati + paneer', () => {
      const remainingBeforeCraving = 800;
      const craving = {
        name: 'Tiramisu Cake',
        calories: 300,
        protein: 4,
        carbs: 35,
        fats: 16,
      };

      const pendingBudget = remainingBeforeCraving - craving.calories;
      expect(pendingBudget).toBe(500);

      // Baseline dinner: 3 chapati (210 kcal) + paneer (300 kcal) + rice (290 kcal) = 800 kcal
      const baseline = DEFAULT_HABITUAL_DINNER;
      const result = optimizeMealForCraving(baseline, pendingBudget, craving, 'Dinner');

      // Total pending calories matches exactly
      expect(result.pendingCaloriesAfterCraving).toBe(500);

      // Check adjusted items:
      // Rice should be skipped completely (lowest protein density: high carb)
      const riceItem = result.adjustedDinner.items.find((i) => i.foodName.includes('Rice'));
      expect(riceItem).toBeDefined();
      expect(riceItem?.adjustedQuantity).toBe(0);
      expect(riceItem?.status).toBe('skipped');

      // Chapati should be kept
      const chapatiItem = result.adjustedDinner.items.find((i) => i.foodName.includes('Chapati'));
      expect(chapatiItem).toBeDefined();
      expect(chapatiItem?.adjustedQuantity).toBeGreaterThanOrEqual(2);

      // Paneer should be kept (core protein anchor)
      const paneerItem = result.adjustedDinner.items.find((i) => i.foodName.includes('Paneer'));
      expect(paneerItem).toBeDefined();
      expect(paneerItem?.adjustedQuantity).toBeGreaterThan(0);

      // Total adjusted calories should be around 500-600 kcal
      expect(result.adjustedDinner.calories).toBeLessThanOrEqual(600);
      expect(result.adjustedDinner.calories).toBeGreaterThanOrEqual(480);

      // Retained protein should remain very high (>80%) because paneer was protected
      expect(result.retainedProteinPercentage).toBeGreaterThanOrEqual(85);

      // Verification of determinism: running twice yields identical results
      const run2 = optimizeMealForCraving(baseline, pendingBudget, craving, 'Dinner');
      expect(result.adjustedDinner.calories).toBe(run2.adjustedDinner.calories);
      expect(result.adjustedDinner.protein).toBe(run2.adjustedDinner.protein);
      expect(result.adjustedDinner.carbs).toBe(run2.adjustedDinner.carbs);
      expect(result.adjustedDinner.fats).toBe(run2.adjustedDinner.fats);
    });

    it('ranks nutrient density correctly so high-protein items are protected over high-carb sides', () => {
      const chapati = DEFAULT_HABITUAL_DINNER[0];
      const paneer = DEFAULT_HABITUAL_DINNER[1];
      const rice = DEFAULT_HABITUAL_DINNER[2];

      const rChapati = calculateNutrientDensityRatio(chapati);
      const rPaneer = calculateNutrientDensityRatio(paneer);
      const rRice = calculateNutrientDensityRatio(rice);

      // Paneer has highest protein density ratio
      expect(rPaneer).toBeGreaterThan(rChapati);
      expect(rPaneer).toBeGreaterThan(rRice);

      // Rice has lower protein density than Chapati (more carb-heavy)
      expect(rChapati).toBeGreaterThan(rRice);
    });

    it('handles scenario where remaining budget comfortably accommodates dinner and craving with zero cuts', () => {
      const remainingBeforeCraving = 1200;
      const craving = {
        name: 'Dark Chocolate',
        calories: 150,
        protein: 2,
        carbs: 18,
        fats: 10,
      };

      const pendingBudget = remainingBeforeCraving - craving.calories; // 1050 kcal
      const result = optimizeMealForCraving(DEFAULT_HABITUAL_DINNER, pendingBudget, craving, 'Dinner');

      expect(result.adjustedDinner.calories).toBe(800);
      expect(result.retainedProteinPercentage).toBe(100);
      expect(result.adjustedDinner.items.every((i) => i.status === 'kept')).toBe(true);
    });
  });

  describe('Edge Case: Craving Calories Exceeds Remaining Daily Budget', () => {
    it('detects when craving exceeds remaining calories, computes overshoot, and signals SOS intervention', () => {
      const remainingToday = 200; // User only has 200 kcal left
      const heavyCraving = {
        name: 'Double Chocolate Donut',
        calories: 450,
        protein: 4,
        carbs: 55,
        fats: 24,
      };

      // Target pending budget = max(0, 200 - 450) = 0 kcal
      const pendingBudget = Math.max(0, remainingToday - heavyCraving.calories);
      const result = optimizeMealForCraving(
        DEFAULT_HABITUAL_DINNER,
        pendingBudget,
        heavyCraving,
        'Dinner',
        remainingToday
      );

      expect(result.isExceedingDailyBudget).toBe(true);
      expect(result.overshootCalories).toBe(250); // 450 - 200 = 250 kcal overshoot
      expect(result.explanation.some((msg) => msg.includes('Craving exceeds your remaining daily budget'))).toBe(true);
      expect(result.explanation.some((msg) => msg.includes('Suggesting SOS Craving pause'))).toBe(true);
    });
  });

  describe('24/7 Any-Time-Of-Day Dynamic Meal Re-balancing', () => {
    it('correctly maps time of day to upcoming pending meal', () => {
      // 10:00 AM -> Morning -> Pending meal is Lunch
      const morningDate = new Date(2026, 10, 22, 10, 0, 0);
      expect(detectPendingMealContext(morningDate).mealSlot).toBe('lunch');
      expect(detectPendingMealContext(morningDate).displayName).toBe('Lunch');

      // 14:30 (2:30 PM) -> Afternoon -> Pending meal is Dinner
      const afternoonDate = new Date(2026, 10, 22, 14, 30, 0);
      expect(detectPendingMealContext(afternoonDate).mealSlot).toBe('dinner');
      expect(detectPendingMealContext(afternoonDate).displayName).toBe('Dinner');

      // 20:15 (8:15 PM) -> Evening -> Pending meal is Dinner
      const eveningDate = new Date(2026, 10, 22, 20, 15, 0);
      expect(detectPendingMealContext(eveningDate).mealSlot).toBe('dinner');
      expect(detectPendingMealContext(eveningDate).displayName).toBe('Dinner');

      // 02:00 (2:00 AM) -> Late Night -> Pending meal is Breakfast
      const nightDate = new Date(2026, 10, 22, 2, 0, 0);
      expect(detectPendingMealContext(nightDate).mealSlot).toBe('breakfast');
      expect(detectPendingMealContext(nightDate).displayName).toBe('Breakfast');
    });

    it('rebalances Lunch dynamically when a craving is logged during the morning', async () => {
      const morningDate = new Date(2026, 10, 22, 10, 30, 0); // 10:30 AM
      const remainingToday = 1400; // Remaining budget at 10:30 AM
      const craving = {
        name: 'Pastry / Cupcake',
        calories: 280,
        protein: 3,
        carbs: 38,
        fats: 13,
      };

      // Habitual Lunch baseline: 650 kcal (2 chapati + dal tadka + rice + salad)
      // Craving consumed 280 kcal -> pending lunch adjusted down
      const { items: lunchItems, pendingMealName } = await fetchPastWeekPendingMealPattern(morningDate);
      expect(pendingMealName).toBe('Lunch');

      // Target lunch budget = 650 - 280 = 370 kcal
      const result = optimizeMealForCraving(lunchItems, 370, craving, pendingMealName);

      expect(result.pendingMealName).toBe('Lunch');
      expect(result.adjustedMeal.calories).toBeLessThanOrEqual(420);

      // Rice should be skipped to absorb the carbs, dal (protein anchor) preserved
      const rice = result.adjustedMeal.items.find((i) => i.foodName.includes('Rice'));
      expect(rice?.status).toBe('skipped');

      const dal = result.adjustedMeal.items.find((i) => i.foodName.includes('Dal'));
      expect(dal?.status).toBe('kept');
      expect(result.retainedProteinPercentage).toBeGreaterThanOrEqual(70);
    });
  });

  describe('Database Ingestion & Past Week Pattern Extraction', () => {
    it('ingests manual food item into Dexie customFoods table with correct baseMacrosPer100g and servings', async () => {
      const manualCraving = {
        name: 'Chocolate Lava Cake',
        calories: 420,
        protein: 5.5,
        carbs: 52,
        fats: 22,
        servingUnit: 'piece',
        servingWeightInGrams: 120,
      };

      const saved = await ingestManualCravingFood(manualCraving);
      expect(saved.id).toBeDefined();
      expect(saved.name).toBe('Chocolate Lava Cake');
      expect(saved.category).toBe('Cravings & Desserts');

      // Verify persisted in IndexedDB
      const foundInDb = await db.customFoods.get(saved.id);
      expect(foundInDb).toBeDefined();
      expect(foundInDb?.name).toBe('Chocolate Lava Cake');
      expect(foundInDb?.calories).toBe(420);
      expect(foundInDb?.servings[0].unit).toBe('piece');
      expect(foundInDb?.servings[0].weightInGrams).toBe(120);

      // Base macros per 100g normalized
      expect(foundInDb?.baseMacrosPer100g.calories).toBe(Math.round(420 * (100 / 120)));
    });

    it('extracts past week dinner pattern from db.logs when historical logs exist', async () => {
      const today = new Date(2026, 10, 22, 20, 0, 0); // 8 PM
      const todayStr = today.toISOString().split('T')[0];
      const eveningTimestamp = new Date(`${todayStr}T20:30:00`).getTime();

      // Seed 2 dinner logs for tonight/past days
      await db.logs.add({
        date: todayStr,
        foodId: 'food_roti_1',
        foodName: 'Tandoori Roti',
        selectedUnit: 'roti',
        quantity: 2,
        totalCalories: 220,
        calculatedMacros: { calories: 220, protein: 7, carbs: 42, fats: 2 },
        timestamp: eveningTimestamp,
      });

      await db.logs.add({
        date: todayStr,
        foodId: 'food_chicken_1',
        foodName: 'Grilled Chicken Breast',
        selectedUnit: 'portion (200g)',
        quantity: 1,
        totalCalories: 330,
        calculatedMacros: { calories: 330, protein: 62, carbs: 0, fats: 7 },
        timestamp: eveningTimestamp,
      });

      const pattern = await fetchPastWeekDinnerPattern(today);
      expect(pattern.length).toBe(2);

      const chicken = pattern.find((p) => p.foodName.includes('Chicken'));
      expect(chicken).toBeDefined();
      expect(chicken?.isProteinAnchor).toBe(true);
      expect(chicken?.originalCalories).toBe(330);
    });

    it('runs end-to-end calculateCravingRebalance workflow including auto-ingesting custom food', async () => {
      const result = await calculateCravingRebalance(
        {
          name: 'Gulab Jamun',
          calories: 280,
          protein: 4,
          carbs: 45,
          fats: 11,
          servingUnit: '2 pieces',
          servingWeightInGrams: 80,
        },
        800, // 800 kcal remaining before craving
        true // save to db
      );

      expect(result.craving.foodId).toBeDefined();
      expect(result.pendingCaloriesAfterCraving).toBe(520);
      expect(result.adjustedMeal.calories).toBeLessThanOrEqual(600);

      // Verify it was saved to DB
      const dbEntries = await db.customFoods.toArray();
      expect(dbEntries.some((e) => e.name === 'Gulab Jamun')).toBe(true);
    });
  });
});
