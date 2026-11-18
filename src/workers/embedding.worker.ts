/**
 * Semantic Embedding & Vector Search Web Worker
 * Uses Transformers.js with ONNX/WASM runtime off the main UI thread.
 */

// Placeholder message contract for semantic indexing and querying
export interface WorkerMessageRequest {
  type: 'INIT' | 'GENERATE_EMBEDDING' | 'SEARCH';
  payload: unknown;
}

export interface WorkerMessageResponse {
  type: 'INIT_COMPLETE' | 'EMBEDDING_READY' | 'SEARCH_RESULTS' | 'ERROR';
  payload: unknown;
}

self.onmessage = async (e: MessageEvent<WorkerMessageRequest>) => {
  const { type } = e.data;
  switch (type) {
    case 'INIT':
      self.postMessage({ type: 'INIT_COMPLETE' });
      break;
    default:
      break;
  }
};
