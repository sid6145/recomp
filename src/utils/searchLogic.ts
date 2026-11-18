import type { FoodItem } from '../db/db';
import { cosineSimilarity } from './cosineSimilarity';

export interface SearchResultItem extends FoodItem {
  similarity: number;
}

/**
 * Standard substring text search (food.name.toLowerCase().includes(query)) on food items.
 * Prioritizes exact matches, prefix matches, and whole word matches before general substrings.
 */
export function executeTextSearch(
  query: string,
  foods: FoodItem[]
): SearchResultItem[] {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return [];

  const matches: SearchResultItem[] = [];

  for (const food of foods) {
    if (!food.name) continue;
    const foodNameLower = food.name.toLowerCase();

    if (foodNameLower.includes(cleanQuery)) {
      let similarity = 0.7; // baseline substring match
      const words = foodNameLower.split(/[\s,()/-]+/).filter(Boolean);

      if (foodNameLower === cleanQuery) {
        similarity = 1.0; // exact full match
      } else if (
        foodNameLower.startsWith(cleanQuery + ' ') ||
        foodNameLower.startsWith(cleanQuery + '(') ||
        foodNameLower.startsWith(cleanQuery + ',') ||
        words[0] === cleanQuery
      ) {
        similarity = 0.98; // exact whole word at start of food name (e.g. "Sugar (White Granulated)")
      } else if (words.includes(cleanQuery)) {
        similarity = 0.93; // exact whole word inside food name
      } else if (foodNameLower.startsWith(cleanQuery)) {
        similarity = 0.88; // prefix of first word (e.g. "Sugarcane")
      } else if (words.some((w) => w.startsWith(cleanQuery))) {
        similarity = 0.82; // prefix of subsequent word
      }

      matches.push({
        ...food,
        similarity,
      });
    }
  }

  // Sort descending by calculated text similarity, then shorter names first
  matches.sort((a, b) => {
    if (b.similarity !== a.similarity) {
      return b.similarity - a.similarity;
    }
    return a.name.length - b.name.length;
  });

  return matches;
}

/**
 * Executes semantic cosine similarity search against pre-computed embedding vectors.
 */
export function executeSemanticSearch(
  queryVector: number[],
  foods: FoodItem[],
  minThreshold: number = 0.15
): SearchResultItem[] {
  const results: SearchResultItem[] = [];

  for (const food of foods) {
    if (food.embedding_vector && food.embedding_vector.length > 0) {
      const similarity = cosineSimilarity(
        queryVector,
        Array.from(food.embedding_vector)
      );
      if (similarity >= minThreshold) {
        results.push({
          ...food,
          similarity,
        });
      }
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results;
}

/**
 * Merges text search results and semantic search results,
 * deduplicates them by item id, and returns top matches (default limit: 15).
 */
export function mergeAndDeduplicateResults(
  textResults: SearchResultItem[],
  semanticResults: SearchResultItem[],
  limit: number = 15
): SearchResultItem[] {
  const mergedMap = new Map<string | number, SearchResultItem>();

  // 1. Insert text matches first (guarantees instant zero-wait matches)
  for (const item of textResults) {
    if (item.id != null) {
      mergedMap.set(item.id, { ...item });
    }
  }

  // 2. Insert or augment with semantic cosine similarity matches
  for (const item of semanticResults) {
    if (item.id != null) {
      if (!mergedMap.has(item.id)) {
        mergedMap.set(item.id, { ...item });
      } else {
        // Boost similarity if item satisfies both text and vector semantics
        const existing = mergedMap.get(item.id)!;
        existing.similarity = Math.min(
          1.0,
          Math.max(existing.similarity, item.similarity) + 0.05
        );
      }
    }
  }

  const allMerged = Array.from(mergedMap.values());
  allMerged.sort((a, b) => b.similarity - a.similarity);

  return allMerged.slice(0, limit);
}
