import { describe, it, expect } from 'vitest';
import {
  executeTextSearch,
  executeSemanticSearch,
  mergeAndDeduplicateResults,
  type SearchResultItem,
} from '../src/utils/searchLogic';
import type { FoodItem } from '../src/db/db';

describe('Text-Search Fallback and Hybrid Merging (searchLogic.ts)', () => {
  const sampleFoods: FoodItem[] = [
    {
      id: 'd_02',
      name: 'Mango Lassi',
      baseMacrosPer100g: { calories: 85, protein: 2.8, carbs: 14.5, fats: 1.8 },
      servings: [{ unit: 'glass', weightInGrams: 250 }],
      // Has no embedding yet
    },
    {
      id: 'f_01',
      name: 'Fresh Mango',
      baseMacrosPer100g: { calories: 60, protein: 0.8, carbs: 15.0, fats: 0.4 },
      servings: [{ unit: 'piece', weightInGrams: 150 }],
      // Has embedding
      embedding_vector: [0.9, 0.1, 0.0],
    },
    {
      id: 's_01',
      name: 'Vada Pav',
      baseMacrosPer100g: { calories: 285, protein: 6.5, carbs: 42.0, fats: 10.5 },
      servings: [{ unit: 'piece', weightInGrams: 80 }],
      embedding_vector: [0.0, 0.8, 0.6],
    },
  ];

  it('instantly matches foods via substring text search without embeddings', () => {
    const results = executeTextSearch('Mango', sampleFoods);
    expect(results.length).toBe(2);
    // Both Mango Lassi (unvectorized) and Fresh Mango match
    const names = results.map((r) => r.name);
    expect(names).toContain('Mango Lassi');
    expect(names).toContain('Fresh Mango');
  });

  it('is case-insensitive and trims whitespace in text search', () => {
    const results = executeTextSearch('  vAdA  ', sampleFoods);
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Vada Pav');
  });

  it('executes semantic search using query vector and cosine similarity', () => {
    // Query vector aligned with sampleFoods[1] (Fresh Mango)
    const queryVector = [0.95, 0.05, 0.0];
    const results = executeSemanticSearch(queryVector, sampleFoods);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Fresh Mango');
    expect(results[0].similarity).toBeGreaterThan(0.9);
  });

  it('merges, deduplicates by id, and caps results to limit (default 15)', () => {
    const textResults: SearchResultItem[] = [
      {
        ...sampleFoods[0],
        similarity: 0.95,
      },
      {
        ...sampleFoods[1],
        similarity: 0.85,
      },
    ];

    const semanticResults: SearchResultItem[] = [
      {
        ...sampleFoods[1], // Duplicate id
        similarity: 0.98,
      },
      {
        ...sampleFoods[2], // Distinct id
        similarity: 0.65,
      },
    ];

    const merged = mergeAndDeduplicateResults(textResults, semanticResults, 15);

    // Total should be 3 unique items
    expect(merged.length).toBe(3);
    const ids = merged.map((m) => m.id);
    expect(new Set(ids).size).toBe(3);

    // Fresh Mango was in both, should have boosted similarity
    const freshMango = merged.find((m) => m.id === 'f_01');
    expect(freshMango).toBeDefined();
    expect(freshMango!.similarity).toBeGreaterThanOrEqual(0.98);
  });

  it('returns empty array if query is blank', () => {
    const results = executeTextSearch('', sampleFoods);
    expect(results).toEqual([]);
  });
});
