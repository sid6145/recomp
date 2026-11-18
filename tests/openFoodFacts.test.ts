import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeOFFData,
  searchProductByName,
  searchProductByBarcode,
  type OpenFoodFactsProduct,
} from '../src/utils/openFoodFacts';

describe('Open Food Facts Normalizer & API Utilities', () => {
  it('correctly maps standard OFF product to FoodItem schema with baseMacrosPer100g', () => {
    const mockProduct: OpenFoodFactsProduct = {
      code: '737628064502',
      product_name: 'Peanut Butter Creamy',
      brands: 'Skippy',
      serving_size: '32 g',
      nutriments: {
        'energy-kcal_100g': 588,
        proteins_100g: 22.2,
        carbohydrates_100g: 18.8,
        fat_100g: 50.0,
      },
    };

    const normalized = normalizeOFFData(mockProduct);

    expect(normalized.id).toBe('off_737628064502');
    expect(normalized.name).toBe('Skippy - Peanut Butter Creamy');
    expect(normalized.baseMacrosPer100g).toEqual({
      calories: 588,
      protein: 22.2,
      carbs: 18.8,
      fats: 50.0,
    });
    expect(normalized.servings).toEqual([
      { unit: 'gram', weightInGrams: 1 },
      { unit: '100g', weightInGrams: 100 },
      { unit: 'serving (32g)', weightInGrams: 32 },
    ]);
  });

  it('handles missing calories by converting energy kJ to kcal', () => {
    const mockProduct: OpenFoodFactsProduct = {
      code: '123456789',
      product_name: 'Greek Yogurt',
      nutriments: {
        'energy-kj_100g': 418.4, // 100 kcal
        proteins_100g: 10,
        carbohydrates_100g: 4,
        fat_100g: 0,
      },
    };

    const normalized = normalizeOFFData(mockProduct);
    expect(normalized.baseMacrosPer100g.calories).toBe(100);
    expect(normalized.baseMacrosPer100g.protein).toBe(10);
    expect(normalized.baseMacrosPer100g.carbs).toBe(4);
    expect(normalized.baseMacrosPer100g.fats).toBe(0);
  });

  it('handles null and missing nutrient values safely without crashing or NaN', () => {
    const mockProduct: OpenFoodFactsProduct = {
      code: '999999',
      product_name: '',
      nutriments: {},
    };

    const normalized = normalizeOFFData(mockProduct);
    expect(normalized.name).toBe('Unknown Packaged Food');
    expect(normalized.baseMacrosPer100g).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
    });
    expect(normalized.servings).toEqual([
      { unit: 'gram', weightInGrams: 1 },
      { unit: '100g', weightInGrams: 100 },
    ]);
  });
});
