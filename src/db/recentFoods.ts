import { db, type FoodItem } from './db';

/**
 * Highly optimized Dexie utility to fetch the user's most recent unique meals.
 * Queries db.logs by timestamp (reverse chronological order), extracts unique foodIds,
 * and retrieves the full FoodItem records while preserving recency order.
 *
 * @param limit Maximum number of unique recent foods to return (default: 10)
 * @returns Array of FoodItem objects in order of recency
 */
export async function getRecentlyLoggedFoods(limit: number = 10): Promise<FoodItem[]> {
  try {
    // 1. Fetch recent logs ordered by timestamp descending
    const logs = await db.logs.orderBy('timestamp').reverse().toArray();

    // 2. Extract unique foodIds preserving order of recency
    const uniqueFoodIds: string[] = [];
    const seenIds = new Set<string>();

    for (const log of logs) {
      if (log.foodId && !seenIds.has(log.foodId)) {
        seenIds.add(log.foodId);
        uniqueFoodIds.push(log.foodId);
        if (uniqueFoodIds.length >= limit) {
          break;
        }
      }
    }

    if (uniqueFoodIds.length === 0) {
      return [];
    }

    // 3. Batch fetch the full food items matching unique IDs from both foods and customFoods
    const [matchedFoods, matchedCustom] = await Promise.all([
      db.foods.where('id').anyOf(uniqueFoodIds).toArray(),
      db.customFoods.where('id').anyOf(uniqueFoodIds).toArray(),
    ]);

    // 4. Map back to enforce strict recency ordering (anyOf returns in primary key order)
    const foodLookup = new Map<string, FoodItem>();
    for (const food of [...matchedFoods, ...matchedCustom]) {
      if (food.id != null) {
        foodLookup.set(String(food.id), food);
      }
    }

    const orderedFoods: FoodItem[] = [];
    for (const id of uniqueFoodIds) {
      const food = foodLookup.get(id);
      if (food) {
        orderedFoods.push(food);
      }
    }

    return orderedFoods;
  } catch (error) {
    console.error('[recentFoods] Error fetching recently logged foods:', error);
    return [];
  }
}
