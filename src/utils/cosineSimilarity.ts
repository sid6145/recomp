/**
 * Pure JavaScript Cosine Similarity computation.
 * Compares two high-dimensional vectors (e.g. 384-dimensional dense text embeddings)
 * and returns their directional cosine similarity score between -1 and 1.
 */

export function cosineSimilarity(
  vecA: number[] | Float32Array | undefined | null,
  vecB: number[] | Float32Array | undefined | null
): number {
  // CRITICAL EDGE CASE GUARD:
  // If either vector is missing (e.g., Dexie record hasn't completed embedding generation yet)
  // or lengths do not match, return 0 immediately to prevent NaN propagation or silent math errors.
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
    return 0;
  }

  if (vecA.length !== vecB.length) {
    console.warn(
      `[cosineSimilarity] Dimensionality mismatch: vecA (${vecA.length}) vs vecB (${vecB.length})`
    );
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const len = vecA.length;
  for (let i = 0; i < len; i++) {
    const a = vecA[i];
    const b = vecB[i];

    // Check for NaN or non-finite float corruptions
    if (isNaN(a) || isNaN(b)) {
      return 0;
    }

    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  // Prevent divide-by-zero errors when vector magnitude is zero
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0 || !isFinite(magnitude)) {
    return 0;
  }

  // Bound result tightly between -1 and 1 to absorb IEEE-754 precision drifts
  const similarity = dotProduct / magnitude;
  return Math.max(-1, Math.min(1, similarity));
}
