import { useState, useEffect, useRef, useCallback } from 'react';
import { db, type FoodItem } from '../db/db';
import { sendUnvectorizedToWorker } from '../db/dbSeeder';
import { executeTextSearch } from '../utils/searchLogic';
// Explicit Vite worker import syntax: spawns a dedicated worker thread with bundler support
import SearchWorker from '../workers/semanticSearchWorker?worker';

export interface SemanticSearchResult extends FoodItem {
  similarity: number;
}

export type SearchEngineStatus = 'loading_model' | 'ready' | 'searching' | 'error';

export interface UseSemanticSearchReturn {
  search: (query: string) => void;
  indexItem: (item: { id: string; name: string; servings?: { unit: string }[] }) => void;
  embedCustomFood: (food: FoodItem) => void;
  generateEmbeddings: (items?: FoodItem[]) => void;
  results: SemanticSearchResult[];
  isSearching: boolean;
  status: SearchEngineStatus;
  error: string | null;
  worker: Worker | null;
}

// ============================================================================
// SINGLETON WORKER MANAGER
// Keeps the neural model warm in memory across component unmounts and tab navigation
// ============================================================================
let sharedWorker: Worker | null = null;
let sharedStatus: SearchEngineStatus = 'loading_model';
let sharedError: string | null = null;
const workerListeners = new Set<(event: MessageEvent) => void>();

function getSharedWorker(): Worker | null {
  if (typeof window === 'undefined') return null;

  if (!sharedWorker) {
    try {
      sharedWorker = new SearchWorker();

      sharedWorker.onmessage = (e: MessageEvent) => {
        const data = e.data;
        if (data?.type === 'STATUS') {
          sharedStatus = data.payload as SearchEngineStatus;
          if (sharedStatus === 'ready') {
            sendUnvectorizedToWorker(sharedWorker!).catch((err) => {
              console.error('[useSemanticSearch] Error during initial worker batch dispatch:', err);
            });
          }
          if (sharedStatus === 'error') {
            sharedError = data.error || 'Worker initialization failed';
          }
        }
        // Broadcast to all active component subscribers
        workerListeners.forEach((listener) => {
          try {
            listener(e);
          } catch (listenerErr) {
            console.error('[useSemanticSearch] Listener broadcast error:', listenerErr);
          }
        });
      };

      sharedWorker.onerror = (err) => {
        console.error('[useSemanticSearch: Worker Crash ErrorEvent]:', err.message, err);
        sharedStatus = 'error';
        sharedError = `Worker thread crashed: ${err.message || 'Check console'}`;
        const errorMsg = { data: { type: 'ERROR', error: sharedError } } as MessageEvent;
        workerListeners.forEach((listener) => listener(errorMsg));
      };
    } catch (workerInitErr) {
      console.error('[useSemanticSearch] Failed to instantiate SearchWorker:', workerInitErr);
      sharedStatus = 'error';
      sharedError = 'Web Worker instantiation failed';
      return null;
    }
  }

  return sharedWorker;
}

/**
 * Custom React hook bridging the main thread with the background AI Semantic Search Web Worker.
 * Consumes the Singleton Worker Manager, ensuring Transformers.js ONNX runtime stays warm in memory.
 */
export function useSemanticSearch(): UseSemanticSearchReturn {
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [status, setStatus] = useState<SearchEngineStatus>(sharedStatus);
  const [error, setError] = useState<string | null>(sharedError);
  const [workerInstance, setWorkerInstance] = useState<Worker | null>(() => getSharedWorker());

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const worker = getSharedWorker();
    setWorkerInstance(worker);
    setStatus(sharedStatus);
    setError(sharedError);

    if (!worker) return;

    const messageHandler = (e: MessageEvent) => {
      const data = e.data;
      if (!data) return;

      if (data.type === 'STATUS') {
        const nextStatus = data.payload as SearchEngineStatus;
        setStatus(nextStatus);
        if (nextStatus === 'error') {
          setError(data.error || 'Worker initialization failed');
          setIsSearching(false);
        }
      } else if (data.type === 'SEARCH_RESULTS') {
        setResults(data.results || []);
        setIsSearching(false);
        setStatus('ready');
      } else if (data.type === 'GENERATE_EMBEDDINGS_COMPLETE') {
        console.log(`[useSemanticSearch] All ${data.count} items embedded by worker.`);
      } else if (data.type === 'INDEX_COMPLETE') {
        console.log(`[useSemanticSearch] Indexed custom recipe: ${data.id}`);
      } else if (data.type === 'EMBED_COMPLETE') {
        console.log(`[useSemanticSearch] Embedded custom food: ${data.id}`);
      } else if (data.type === 'ERROR') {
        console.error('[useSemanticSearch] Worker search error:', data.error);
        setError(data.error || 'Vector search failure');
        setIsSearching(false);
        setStatus('error');
      }
    };

    workerListeners.add(messageHandler);

    return () => {
      workerListeners.delete(messageHandler);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Note: We do NOT terminate sharedWorker here, keeping the model warm in memory
    };
  }, []);

  const search = useCallback((query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query || query.trim() === '') {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const trimmed = query.trim();
    setIsSearching(true);
    setStatus('searching');

    // Instant zero-latency local text search (<5ms)
    Promise.all([db.foods.toArray(), db.customFoods.toArray()])
      .then(([foods, custom]) => {
        const all = [...custom, ...foods];
        const immediateMatches = executeTextSearch(trimmed, all).slice(0, 15);
        setResults(immediateMatches);
      })
      .catch((err) => {
        console.warn('[useSemanticSearch] Instant text fallback error:', err);
      });

    // Debounce keystrokes by 250ms for background semantic neural inference
    debounceTimerRef.current = setTimeout(() => {
      const activeWorker = getSharedWorker();
      if (activeWorker) {
        activeWorker.postMessage({
          type: 'SEARCH',
          query: trimmed,
        });
      }
    }, 250);
  }, []);

  const indexItem = useCallback(
    (item: { id: string; name: string; servings?: { unit: string }[] }) => {
      const activeWorker = getSharedWorker();
      if (activeWorker) {
        activeWorker.postMessage({
          type: 'INDEX_ITEM',
          item,
        });
      }
    },
    []
  );

  const embedCustomFood = useCallback((food: FoodItem) => {
    const activeWorker = getSharedWorker();
    if (activeWorker) {
      activeWorker.postMessage({
        type: 'EMBED_CUSTOM_FOOD',
        payload: food,
      });
    }
  }, []);

  const generateEmbeddings = useCallback(async (items?: FoodItem[]) => {
    const activeWorker = getSharedWorker();
    if (activeWorker) {
      if (items && items.length > 0) {
        activeWorker.postMessage({
          type: 'GENERATE_EMBEDDINGS',
          payload: items,
        });
      } else {
        await sendUnvectorizedToWorker(activeWorker);
      }
    }
  }, []);

  return {
    search,
    indexItem,
    embedCustomFood,
    generateEmbeddings,
    results,
    isSearching,
    status,
    error,
    worker: workerInstance,
  };
}
