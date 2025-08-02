/**
 * Vector operations library for Convex RAG System
 * Implements core vector mathematics needed for similarity search
 */

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical direction
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate cosine similarity using pre-computed magnitudes
 * More efficient for repeated comparisons
 */
export function cosineSimilarityWithMagnitude(
  a: number[],
  b: number[],
  magnitudeA: number,
  magnitudeB: number
): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate the magnitude (length) of a vector
 */
export function calculateMagnitude(vector: number[]): number {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    sum += vector[i] * vector[i];
  }
  return Math.sqrt(sum);
}

/**
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Calculate dot product of two vectors
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let product = 0;
  for (let i = 0; i < a.length; i++) {
    product += a[i] * b[i];
  }
  return product;
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = calculateMagnitude(vector);
  if (magnitude === 0) {
    return vector;
  }

  return vector.map(val => val / magnitude);
}

/**
 * Calculate similarity score (0-1 range) from cosine similarity
 */
export function similarityScore(cosineSim: number): number {
  // Convert from [-1, 1] to [0, 1]
  return (cosineSim + 1) / 2;
}

/**
 * Batch cosine similarity calculation
 * Efficient for comparing one vector against many
 */
export function batchCosineSimilarity(
  query: number[],
  vectors: number[][],
  magnitudes?: number[]
): number[] {
  const queryMagnitude = calculateMagnitude(query);
  
  return vectors.map((vector, index) => {
    if (magnitudes && magnitudes[index]) {
      return cosineSimilarityWithMagnitude(
        query,
        vector,
        queryMagnitude,
        magnitudes[index]
      );
    } else {
      return cosineSimilarity(query, vector);
    }
  });
}

/**
 * Find top K most similar vectors
 */
export function topKSimilar(
  query: number[],
  vectors: Array<{ id: string; embedding: number[]; magnitude?: number }>,
  k: number,
  threshold: number = 0
): Array<{ id: string; similarity: number }> {
  const similarities = vectors.map(vec => ({
    id: vec.id,
    similarity: vec.magnitude
      ? cosineSimilarityWithMagnitude(query, vec.embedding, calculateMagnitude(query), vec.magnitude)
      : cosineSimilarity(query, vec.embedding),
  }));

  return similarities
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

/**
 * Calculate centroid of multiple vectors
 */
export function calculateCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new Error("Cannot calculate centroid of empty vector set");
  }

  const dimensions = vectors[0].length;
  const centroid = new Array(dimensions).fill(0);

  for (const vector of vectors) {
    for (let i = 0; i < dimensions; i++) {
      centroid[i] += vector[i];
    }
  }

  return centroid.map(val => val / vectors.length);
}

/**
 * Validate vector dimensions and values
 */
export function validateVector(vector: number[], expectedDimensions?: number): boolean {
  if (!Array.isArray(vector)) {
    return false;
  }

  if (expectedDimensions && vector.length !== expectedDimensions) {
    return false;
  }

  return vector.every(val => typeof val === 'number' && !isNaN(val) && isFinite(val));
}

/**
 * Chunk array into smaller arrays for batch processing
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}