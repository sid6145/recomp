import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { db, type FoodItem } from '../src/db/db';
import {
  AddCustomFoodModal,
  PREDEFINED_CATEGORIES,
  SERVING_CRITERIA_PRESETS,
} from '../src/components/AddCustomFoodModal';
import { executeTextSearch } from '../src/utils/searchLogic';

describe('Custom Food Manual Ingestion System', () => {
  beforeEach(async () => {
    await db.customFoods.clear();
  });

  describe('AddCustomFoodModal Markup, Categories & Serving Criteria', () => {
    it('renders classification buttons, pre-defined category chips, and serving criteria presets', () => {
      const html = renderToString(
        React.createElement(AddCustomFoodModal, {
          isOpen: true,
          initialQuery: 'Homemade Protein Bar',
          onClose: vi.fn(),
          onSaved: vi.fn(),
        })
      );

      // Verify header and fields
      expect(html).toContain('Add Custom Food to Database');
      expect(html).toContain('Multi-Criteria Food Ingestion');
      expect(html).toContain('Food Item Name');
      expect(html).toContain('Calories (kcal)');
      expect(html).toContain('Protein (g)');
      expect(html).toContain('Carbs (g)');
      expect(html).toContain('Fats (g)');

      // Verify food type classifications
      expect(html).toContain('Solid Foods');
      expect(html).toContain('Beverages');
      expect(html).toContain('Other Items');

      // Verify pre-defined solid food categories
      expect(html).toContain('Main Meals &amp; Curries');
      expect(html).toContain('Breads &amp; Rotis');
      expect(html).toContain('Rice &amp; Grains');
      expect(html).toContain('Dairy &amp; Paneer');

      // Verify solid serving criteria presets
      expect(html).toContain('1 Bowl (150g)');
      expect(html).toContain('100g (Standard)');
      expect(html).toContain('1 Piece (35g)');
      expect(html).toContain('1 Plate (300g)');
      expect(html).toContain('Per 1g');

      // Verify buttons
      expect(html).toContain('Save to Database');
      expect(html).toContain('Save &amp; Log Food');
    });

    it('has comprehensive category structures for Solid Foods, Beverages, and Other Items', () => {
      expect(PREDEFINED_CATEGORIES.solid.categories).toContain('Main Meals & Curries');
      expect(PREDEFINED_CATEGORIES.solid.categories).toContain('Breads & Rotis');
      expect(PREDEFINED_CATEGORIES.beverage.categories).toContain('Tea & Coffee');
      expect(PREDEFINED_CATEGORIES.beverage.categories).toContain('Juices & Smoothies');
      expect(PREDEFINED_CATEGORIES.beverage.categories).toContain('Protein Shakes');
      expect(PREDEFINED_CATEGORIES.other.categories).toContain('Sauces & Condiments');
      expect(PREDEFINED_CATEGORIES.other.categories).toContain('Powders & Supplements');
    });

    it('has tailored serving criteria presets for beverages including glass, cup, and ml', () => {
      const beverageUnits = SERVING_CRITERIA_PRESETS.beverage.map((p) => p.unit);
      expect(beverageUnits).toContain('100ml');
      expect(beverageUnits).toContain('glass (250ml)');
      expect(beverageUnits).toContain('cup (150ml)');
      expect(beverageUnits).toContain('ml');

      const solidUnits = SERVING_CRITERIA_PRESETS.solid.map((p) => p.unit);
      expect(solidUnits).toContain('100g');
      expect(solidUnits).toContain('bowl (150g)');
      expect(solidUnits).toContain('piece (35g)');
      expect(solidUnits).toContain('gram');
    });

    it('returns null when isOpen is false', () => {
      const html = renderToString(
        React.createElement(AddCustomFoodModal, {
          isOpen: false,
          onClose: vi.fn(),
          onSaved: vi.fn(),
        })
      );
      expect(html).toBe('');
    });
  });

  describe('Database Persistence & Multi-Serving Normalization', () => {
    it('persists a custom food item with bowl criteria and auto-generates proportional multi-serving criteria', async () => {
      // User inputs: 1 bowl (150g) of Paneer Butter Masala has 360 kcal, 18g protein, 12g carbs, 26g fats
      const servingWeight = 150;
      const multiplier = 100 / servingWeight;

      const customFood: FoodItem = {
        id: 'custom_paneer_butter',
        name: 'Paneer Butter Masala',
        category: 'Main Meals & Curries',
        baseMacrosPer100g: {
          calories: Math.round(360 * multiplier), // 240 kcal
          protein: Math.round(18 * multiplier * 10) / 10, // 12g
          carbs: Math.round(12 * multiplier * 10) / 10, // 8g
          fats: Math.round(26 * multiplier * 10) / 10, // 17.3g
        },
        servings: [
          { unit: 'bowl (150g)', weightInGrams: 150 },
          { unit: '100g', weightInGrams: 100 },
          { unit: 'gram', weightInGrams: 1 },
          { unit: 'plate (300g)', weightInGrams: 300 },
        ],
        calories: 360,
        protein: 18,
        carbs: 12,
        fats: 26,
        servingSize: '1 bowl (150g)',
      };

      await db.customFoods.put(customFood);

      const stored = await db.customFoods.get('custom_paneer_butter');
      expect(stored).toBeDefined();
      expect(stored?.name).toBe('Paneer Butter Masala');
      expect(stored?.category).toBe('Main Meals & Curries');

      // Verify multi-serving criteria exists
      expect(stored?.servings.length).toBe(4);
      const units = stored?.servings.map((s) => s.unit);
      expect(units).toContain('bowl (150g)');
      expect(units).toContain('100g');
      expect(units).toContain('gram');
      expect(units).toContain('plate (300g)');

      // Verify exact 100g normalization
      expect(stored?.baseMacrosPer100g.calories).toBe(240);
      expect(stored?.baseMacrosPer100g.protein).toBe(12);
    });

    it('persists a beverage item with glass and ml criteria', async () => {
      // 1 glass (250ml) of Mango Smoothie has 200 kcal, 8g protein, 35g carbs, 3g fats
      const servingWeight = 250;
      const multiplier = 100 / servingWeight;

      const customBeverage: FoodItem = {
        id: 'custom_mango_smoothie',
        name: 'Fresh Mango Smoothie',
        category: 'Juices & Smoothies',
        baseMacrosPer100g: {
          calories: Math.round(200 * multiplier), // 80 kcal
          protein: Math.round(8 * multiplier * 10) / 10, // 3.2g
          carbs: Math.round(35 * multiplier * 10) / 10, // 14g
          fats: Math.round(3 * multiplier * 10) / 10, // 1.2g
        },
        servings: [
          { unit: 'glass (250ml)', weightInGrams: 250 },
          { unit: '100ml', weightInGrams: 100 },
          { unit: 'ml', weightInGrams: 1 },
          { unit: 'cup (150ml)', weightInGrams: 150 },
        ],
        calories: 200,
        protein: 8,
        carbs: 35,
        fats: 3,
        servingSize: '1 glass (250ml)',
      };

      await db.customFoods.put(customBeverage);

      const stored = await db.customFoods.get('custom_mango_smoothie');
      expect(stored).toBeDefined();
      expect(stored?.name).toBe('Fresh Mango Smoothie');
      expect(stored?.category).toBe('Juices & Smoothies');

      const units = stored?.servings.map((s) => s.unit);
      expect(units).toContain('glass (250ml)');
      expect(units).toContain('ml');
      expect(units).toContain('100ml');
    });

    it('immediately surfaces newly ingested custom food in local text search', async () => {
      const customFood: FoodItem = {
        id: 'custom_energy_bar_99',
        name: 'Whey Crisp Protein Bar',
        category: 'Snacks & Street Food',
        baseMacrosPer100g: {
          calories: 380,
          protein: 30,
          carbs: 35,
          fats: 12,
        },
        servings: [{ unit: 'bar', weightInGrams: 60 }],
        calories: 228,
        protein: 18,
        carbs: 21,
        fats: 7.2,
      };

      await db.customFoods.put(customFood);

      const allCustomFoods = await db.customFoods.toArray();
      const results = executeTextSearch('Whey Crisp', allCustomFoods);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Whey Crisp Protein Bar');
      expect(results[0].calories).toBe(228);
    });
  });
});
