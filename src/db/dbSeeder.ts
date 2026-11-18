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
 * Lazy loads the 2,040 seed food items on demand.
 * Prevents 1.2MB of raw JSON from blocking initial JavaScript parse time.
 */
async function loadSeedDatasets(): Promise<FoodItem[]> {
  const [globalModule, indianModule, indianPart2Module] = await Promise.all([
    import('./globalFoods.json'),
    import('./indianFoodsSeed.json'),
    import('./indianFoodsSeed_Part2.json'),
  ]);
  const batch1 = (indianModule.default || indianModule) as FoodItem[];
  const batch2 = (indianPart2Module.default || indianPart2Module) as FoodItem[];
  const global = (globalModule.default || globalModule) as FoodItem[];
  return [...global, ...batch1, ...batch2];
}

/**
 * Target count of all combined local datasets (1440 global + 300 Indian pt 1 + 300 Indian pt 2 = 2,040)
 */
export const TARGET_FOOD_COUNT = 2040;

/**
 * Initializes the Dexie database by merging Batch 1, Batch 2, and global datasets.
 * Protects existing records and vector embeddings from being overwritten.
 * Once seeded, identifies unvectorized foods and dispatches them to the Web Worker.
 */
export async function initializeDatabase(worker?: Worker): Promise<FoodItem[]> {
  try {
    const count = await db.foods.count();

    // If database is empty or has fewer entries than the full dataset, dynamically load and seed items
    if (count < TARGET_FOOD_COUNT) {
      console.log(`[dbSeeder] Current IndexedDB count (${count}) < target (${TARGET_FOOD_COUNT}). Loading datasets...`);
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

    // Query for all items missing an embedding vector
    const unvectorized = await db.foods
      .filter((f) => !f.embedding_vector || f.embedding_vector.length === 0)
      .toArray();

    console.log(`[dbSeeder] Unvectorized items count in IndexedDB: ${unvectorized.length}`);

    // Dispatch to Web Worker if worker reference is provided
    if (worker) {
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

    const all = await db.foods.toArray();
    return all;
  } catch (error) {
    console.error('[dbSeeder] Seeding failure boundary in initializeDatabase:', error);
    try {
      return await db.foods.toArray();
    } catch {
      return [];
    }
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
