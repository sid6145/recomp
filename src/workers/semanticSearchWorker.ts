import { pipeline, env, type FeatureExtractionPipeline } from '@xenova/transformers';
import { db, type FoodItem } from '../db/db';
import {
  executeTextSearch,
  executeSemanticSearch,
  mergeAndDeduplicateResults,
  type SearchResultItem,
} from '../utils/searchLogic';

// 1. TRANSFORMERS.JS SETUP:
// Force Hugging Face CDN fetch rather than looking for non-existent local file URLs.
// Enable browser cache so the ONNX weights are permanently cached in CacheStorage / IndexedDB.
env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

let extractor: FeatureExtractionPipeline | null = null;
let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

// In-worker in-memory cache of searchable foods to prevent heavy IndexedDB deserialization on each search
let cachedSearchableItems: FoodItem[] | null = null;

async function getSearchableItems(forceRefresh = false): Promise<FoodItem[]> {
  if (!cachedSearchableItems || forceRefresh) {
    const [foods, customFoods] = await Promise.all([
      db.foods.toArray(),
      db.customFoods.toArray(),
    ]);
    cachedSearchableItems = [...customFoods, ...foods];
  }
  return cachedSearchableItems;
}

/**
 * Extracts a normalized 384-dimensional dense embedding vector from arbitrary text.
 * Converts the Tensor object output into a standard JS number[] array using Array.from(output.data).
 */
async function generateVector(
  pipelineInstance: FeatureExtractionPipeline,
  text: string
): Promise<number[]> {
  try {
    const output = await pipelineInstance(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data as Float32Array);
  } catch (err) {
    console.error(`[Worker] Vector mapping failure boundary for text "${text}":`, err);
    throw err;
  }
}

/**
 * Returns the singleton pipeline instance or boots it on demand.
 */
function getOrCreatePipeline(): Promise<FeatureExtractionPipeline> {
  if (extractor) {
    return Promise.resolve(extractor);
  }

  if (!pipelinePromise) {
    console.log('[Worker] Initializing Transformers.js feature extraction pipeline...');
    self.postMessage({ type: 'STATUS', payload: 'loading_model' });

    pipelinePromise = pipeline('feature-extraction', MODEL_NAME, {
      quantized: true,
    })
      .then((loaded) => {
        extractor = loaded as FeatureExtractionPipeline;
        console.log('[Worker] Transformers.js Model Loaded Successfully.');
        self.postMessage({ type: 'STATUS', payload: 'ready' });
        return extractor;
      })
      .catch((error) => {
        pipelinePromise = null;
        console.error('[Worker] Pipeline initialization failure boundary:', error);
        self.postMessage({
          type: 'STATUS',
          payload: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      });
  }

  return pipelinePromise;
}

// Boot model pipeline in background
getOrCreatePipeline().catch((err) => {
  console.error('[Worker] Boot failure boundary:', err);
});

export interface SearchMessageEvent {
  type: 'SEARCH';
  query: string;
}

export interface GenerateEmbeddingsMessageEvent {
  type: 'GENERATE_EMBEDDINGS';
  payload: FoodItem[];
}

export interface IndexItemMessageEvent {
  type: 'INDEX_ITEM';
  item: {
    id: string;
    name: string;
    servings?: { unit: string }[];
  };
}

export interface EmbedCustomFoodMessageEvent {
  type: 'EMBED_CUSTOM_FOOD';
  payload: FoodItem;
}

export type IncomingWorkerMessage =
  | SearchMessageEvent
  | GenerateEmbeddingsMessageEvent
  | IndexItemMessageEvent
  | EmbedCustomFoodMessageEvent;

// Worker message listener
self.onmessage = async (e: MessageEvent<IncomingWorkerMessage>) => {
  const data = e.data;
  if (!data) return;

  // -------------------------------------------------------------
  // PHASE 2: BATCHED EMBEDDING GENERATION (20 items per batch)
  // -------------------------------------------------------------
  if (data.type === 'GENERATE_EMBEDDINGS') {
    try {
      const activePipeline = await getOrCreatePipeline();
      const items = data.payload || [];
      const total = items.length;

      if (total === 0) {
        console.log('[Worker] No unvectorized items provided in payload.');
        return;
      }

      console.log(`[Worker] Starting batch embedding generation for ${total} items...`);
      const BATCH_SIZE = 20;

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        const remaining = total - (i + batch.length);

        for (const food of batch) {
          if (food.id != null) {
            try {
              const output = await activePipeline(food.name, {
                pooling: 'mean',
                normalize: true,
              });
              const vector = Array.from(output.data as Float32Array);
              await db.foods.update(food.id, { embedding_vector: vector });
            } catch (itemErr) {
              console.error(
                `[Worker] Vector mapping failure boundary for item "${food.name}" (ID: ${food.id}):`,
                itemErr
              );
            }
          }
        }

        console.log(`[Worker] Embedded batch of 20. Remaining: ${remaining}`);
        // Small cooperative yield to keep the worker responsive to urgent messages
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      console.log(`[Worker] Batch embedding completed for all ${total} items.`);
      cachedSearchableItems = null; // Invalidate cache after embeddings batch
      self.postMessage({ type: 'GENERATE_EMBEDDINGS_COMPLETE', count: total });
    } catch (batchErr) {
      console.error('[Worker] Vector mapping failure boundary in batch loop:', batchErr);
      self.postMessage({
        type: 'ERROR',
        error: batchErr instanceof Error ? batchErr.message : String(batchErr),
      });
    }
    return;
  }

  // -------------------------------------------------------------
  // PHASE 3: HYBRID TEXT & SEMANTIC SEARCH (Immediate Fallback)
  // -------------------------------------------------------------
  if (data.type === 'SEARCH') {
    const trimmedQuery = (data.query || '').trim();

    if (!trimmedQuery) {
      self.postMessage({ type: 'SEARCH_RESULTS', query: '', results: [] });
      return;
    }

    try {
      console.log(`[Worker] Executing search query: "${trimmedQuery}"`);

      // Retrieve cached or fresh foods from in-memory worker store (Instant <2ms)
      const allSearchable = await getSearchableItems();

      // 1. Text-Search: Substring match on food.name first (Instant <5ms)
      const textMatches = executeTextSearch(trimmedQuery, allSearchable);

      // 2. Semantic Search: Cosine similarity search second
      let semanticMatches: SearchResultItem[] = [];
      try {
        const activePipeline = await getOrCreatePipeline();
        const queryVector = await generateVector(activePipeline, trimmedQuery);
        semanticMatches = executeSemanticSearch(queryVector, allSearchable);
      } catch (pipelineErr) {
        console.warn(
          '[Worker] Semantic search pipeline unavailable or loading, proceeding with text fallback:',
          pipelineErr
        );
      }

      // 3. Merge results, deduplicate by id, and return top 15 matches
      const finalResults = mergeAndDeduplicateResults(textMatches, semanticMatches, 15);

      self.postMessage({
        type: 'SEARCH_RESULTS',
        query: trimmedQuery,
        results: finalResults,
      });
    } catch (queryErr) {
      console.error('[Worker] Querying failure boundary during search:', queryErr);
      self.postMessage({
        type: 'ERROR',
        error: queryErr instanceof Error ? queryErr.message : String(queryErr),
      });
    }
    return;
  }

  // -------------------------------------------------------------
  // EMBED_CUSTOM_FOOD: Single Custom OFF / User Food Vectorization
  // -------------------------------------------------------------
  if (data.type === 'EMBED_CUSTOM_FOOD') {
    try {
      const activePipeline = await getOrCreatePipeline();
      const food = data.payload;
      const units = food.servings ? food.servings.map((s) => s.unit).join(' ') : '';
      const textToEmbed = `${food.name} ${units}`.trim();
      const vector = await generateVector(activePipeline, textToEmbed);

      if (food.id != null) {
        await db.customFoods.put({
          ...food,
          embedding_vector: vector,
        });
        cachedSearchableItems = null;
        console.log(`[Worker] EMBED_CUSTOM_FOOD vectorized & stored: "${food.name}"`);
        self.postMessage({ type: 'EMBED_COMPLETE', id: food.id });
      }
    } catch (err) {
      console.error('[Worker] Vector mapping failure boundary for EMBED_CUSTOM_FOOD:', err);
    }
    return;
  }

  // -------------------------------------------------------------
  // INDEX_ITEM: Single Recipe Item Vectorization
  // -------------------------------------------------------------
  if (data.type === 'INDEX_ITEM') {
    try {
      const activePipeline = await getOrCreatePipeline();
      const { item } = data;
      const units = item.servings ? item.servings.map((s) => s.unit).join(' ') : '';
      const textToEmbed = `${item.name} ${units}`.trim();
      const vector = await generateVector(activePipeline, textToEmbed);

      const existsInCustom = await db.customFoods.get(item.id);
      if (existsInCustom) {
        await db.customFoods.update(item.id, { embedding_vector: vector });
      } else {
        await db.foods.update(item.id, { embedding_vector: vector });
      }
      cachedSearchableItems = null;
      console.log(`[Worker] INDEX_ITEM vectorized: "${item.name}"`);
      self.postMessage({ type: 'INDEX_COMPLETE', id: item.id });
    } catch (err) {
      console.error('[Worker] Vector mapping failure boundary for INDEX_ITEM:', err);
    }
    return;
  }
};
