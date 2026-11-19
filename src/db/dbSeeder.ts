import { db, type FoodItem } from './db';

/**
 * Normalizes a raw food item into the complete FoodItem schema.
 */
function normalizeFoodItem(item: FoodItem): FoodItem {
  return {
    id: item.id,
    name: item.name,
    category: (item as unknown as { category?: string }).category,
    baseMacrosPer100g: item.baseMacrosPer100g,
    servings: item.servings,
    embedding_vector: item.embedding_vector,
    calories: item.baseMacrosPer100g?.calories ?? 0,
    protein: item.baseMacrosPer100g?.protein ?? 0,
    carbs: item.baseMacrosPer100g?.carbs ?? 0,
    fats: item.baseMacrosPer100g?.fats ?? 0,
    servingSize: item.servings?.[0]?.unit ?? '100g',
  };
}

/**
 * Lazy loads the 1,200 Indian seed food items on demand across Batch 1, 2, and 3.
 * Prevents raw JSON from blocking initial JavaScript parse time.
 */
async function loadSeedDatasets(): Promise<FoodItem[]> {
  const [batch1Module, batch2Module, batch3Module] = await Promise.all([
    import('./indianFoodsSeed.json'),
    import('./indianFoodsSeed_Part2.json'),
    import('./indianFoodsSeed_Part3.json'),
  ]);
  const batch1 = (batch1Module.default || batch1Module) as FoodItem[];
  const batch2 = (batch2Module.default || batch2Module) as FoodItem[];
  const batch3 = (batch3Module.default || batch3Module) as FoodItem[];
  return [...batch1, ...batch2, ...batch3];
}

/**
 * Target count of all combined Indian datasets (300 Part 1 + 300 Part 2 + 600 Part 3 = 1,200)
 */
export const TARGET_FOOD_COUNT = 1200;

/**
 * Initializes the Dexie database by merging Batch 1, Batch 2, and Batch 3 datasets (1,200 items).
 * Protects existing records and vector embeddings from being overwritten.
 * Once seeded, identifies unvectorized foods and dispatches them to the Web Worker.
 */
export async function initializeDatabase(worker?: Worker): Promise<FoodItem[]> {
  try {
    const count = await db.foods.count();
    const hasBatch3Sample = await db.foods.get('d_101');

    // If database is empty, has fewer entries than the full 1,200 dataset, or lacks Batch 3 items, seed items
    if (count < TARGET_FOOD_COUNT || !hasBatch3Sample) {
      console.log(`[dbSeeder] Current IndexedDB count (${count}) or missing Batch 3 sample. Loading datasets...`);
      const allFoods = await loadSeedDatasets();
      const formattedFoods: FoodItem[] = allFoods.map(normalizeFoodItem);

      // Read existing items to preserve any existing embedding vectors
      const existingItems = await db.foods.toArray();
      const existingMap = new Map(existingItems.map((item) => [String(item.id), item]));

      const foodsToPut: FoodItem[] = formattedFoods.map((item) => {
        const existing = existingMap.get(String(item.id));
        if (existing?.embedding_vector && existing.embedding_vector.length > 0) {
          return {
            ...item,
            embedding_vector: existing.embedding_vector,
          };
        }
        return item;
      });

      await db.foods.bulkPut(foodsToPut);
      console.log(`[dbSeeder] Successfully bulkPut ${foodsToPut.length} food items into IndexedDB without overwriting.`);
    } else {
      console.log(`[dbSeeder] Database already contains ${count} items. Seeding skipped.`);
    }

    // Dispatch to Web Worker ONLY if worker reference is provided and unvectorized items exist
    if (worker) {
      const unvectorized = await db.foods
        .filter((f) => !f.embedding_vector || f.embedding_vector.length === 0)
        .toArray();

      if (unvectorized.length > 0) {
        console.log(`[dbSeeder] Sending ${unvectorized.length} unvectorized items to Web Worker.`);
        worker.postMessage({
          type: 'GENERATE_EMBEDDINGS',
          payload: unvectorized,
        });
      } else {
        console.log('[dbSeeder] All food items are already vectorized; worker idle.');
      }
    }

    // Fast return without loading entire 1,200 dataset into JS memory on startup
    return [];
  } catch (error) {
    console.error('[dbSeeder] Seeding failure boundary in initializeDatabase:', error);
    return [];
  }
}

/**
 * Utility helper to send any currently unvectorized items in IndexedDB to a Web Worker.
 */
export async function sendUnvectorizedToWorker(worker: Worker): Promise<FoodItem[]> {
  try {
    const unvectorized = await db.foods
      .filter((f) => !f.embedding_vector || f.embedding_vector.length === 0)
      .toArray();

    if (unvectorized.length > 0) {
      console.log(`[dbSeeder] Dispatching GENERATE_EMBEDDINGS for ${unvectorized.length} items.`);
      worker.postMessage({
        type: 'GENERATE_EMBEDDINGS',
        payload: unvectorized,
      });
    }
    return unvectorized;
  } catch (err) {
    console.error('[dbSeeder] Failure boundary in sendUnvectorizedToWorker:', err);
    return [];
  }
}
