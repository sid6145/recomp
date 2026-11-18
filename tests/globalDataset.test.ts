import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { GlobalFoodItem } from '../scripts/buildGlobalDataset';

describe('Global Foods Master Dataset (IFCT + INDB + USDA)', () => {
  const jsonPath = path.resolve(process.cwd(), 'src', 'db', 'globalFoods.json');
  expect(fs.existsSync(jsonPath)).toBe(true);

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const dataset = JSON.parse(raw) as GlobalFoodItem[];

  it('validates file size is well under 30MB budget', () => {
    const stats = fs.statSync(jsonPath);
    const sizeInMB = stats.size / (1024 * 1024);
    expect(sizeInMB).toBeLessThan(30);
    expect(sizeInMB).toBeGreaterThan(0.1);
  });

  it('contains entries merged from all three primary nutritional databases', () => {
    const origins = new Set(dataset.map((d) => d.origin));
    expect(origins.has('IFCT')).toBe(true);
    expect(origins.has('INDB')).toBe(true);
    expect(origins.has('USDA')).toBe(true);

    const ifctItems = dataset.filter((d) => d.origin === 'IFCT');
    const indbItems = dataset.filter((d) => d.origin === 'INDB');
    const usdaItems = dataset.filter((d) => d.origin === 'USDA');

    expect(ifctItems.length).toBeGreaterThan(500);
    expect(indbItems.length).toBeGreaterThan(50);
    expect(usdaItems.length).toBeGreaterThan(10);
  });

  it('enforces strict schema compliance across all items', () => {
    for (const item of dataset) {
      expect(typeof item.id).toBe('string');
      expect(item.id.length).toBeGreaterThan(0);
      expect(typeof item.name).toBe('string');
      expect(item.name.length).toBeGreaterThan(0);
      expect(['IFCT', 'INDB', 'USDA']).toContain(item.origin);

      const m = item.baseMacrosPer100g;
      expect(typeof m.calories).toBe('number');
      expect(m.calories).toBeGreaterThan(0);
      expect(m.protein).toBeGreaterThanOrEqual(0);
      expect(m.carbs).toBeGreaterThanOrEqual(0);
      expect(m.fats).toBeGreaterThanOrEqual(0);

      expect(Array.isArray(item.servings)).toBe(true);
      expect(item.servings.length).toBeGreaterThanOrEqual(2);

      // Universal baseline units: 'gram' (1g) and '100g' (100g)
      const hasGram = item.servings.some((s) => s.unit === 'gram' && s.weightInGrams === 1);
      const has100g = item.servings.some((s) => s.unit === '100g' && s.weightInGrams === 100);
      expect(hasGram).toBe(true);
      expect(has100g).toBe(true);
    }
  });

  it('verifies dynamic smart unit mappings for culinary categories', () => {
    // 1. Sugars / spices / powders / oils -> teaspoon (4.5g), tablespoon (15g)
    const sugarItem = dataset.find((d) => d.name.toLowerCase().includes('sugar') && !d.name.includes('Water melon'));
    expect(sugarItem).toBeDefined();
    expect(sugarItem?.servings.some((s) => s.unit === 'teaspoon' && s.weightInGrams === 4.5)).toBe(true);
    expect(sugarItem?.servings.some((s) => s.unit === 'tablespoon' && s.weightInGrams === 15)).toBe(true);

    // 2. Cereals / dals / curries / soups -> katori (150g), bowl (250g)
    const dalItem = dataset.find((d) => d.name.toLowerCase().includes('dal'));
    expect(dalItem).toBeDefined();
    expect(dalItem?.servings.some((s) => s.unit === 'katori' && s.weightInGrams === 150)).toBe(true);
    expect(dalItem?.servings.some((s) => s.unit === 'bowl' && s.weightInGrams === 250)).toBe(true);

    // 3. Breads / rotis / eggs / apples -> piece (50g)
    const rotiItem = dataset.find((d) => d.name.toLowerCase().includes('roti'));
    expect(rotiItem).toBeDefined();
    expect(rotiItem?.servings.some((s) => s.unit === 'piece' && s.weightInGrams === 50)).toBe(true);
  });

  it('verifies Atwater thermodynamic calorie consistency across a sample', () => {
    const sample = dataset.slice(0, 50);
    for (const item of sample) {
      const { calories, protein, carbs, fats } = item.baseMacrosPer100g;
      const atwater = protein * 4 + carbs * 4 + fats * 9;
      // Stated calories must be within reasonable margin of Atwater calculation
      if (atwater > 20) {
        const diff = Math.abs(calories - atwater);
        const margin = Math.max(calories, atwater) * 0.25;
        expect(diff).toBeLessThanOrEqual(margin);
      }
    }
  });
});
