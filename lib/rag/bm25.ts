/**
 * BM25 Index (Okapi BM25)
 *
 * Pure JavaScript BM25 implementation.
 * Used alongside the vector store for hybrid retrieval.
 *
 * BM25 parameters:
 *   k1 = 1.5  (term frequency saturation)
 *   b  = 0.75 (length normalisation)
 */

import type { Chunk } from './chunker';

export interface BM25Index {
  chunks: Chunk[];
  idf: Map<string, number>;
  tf: Map<string, number>[]; // tf[i][term] = normalised TF for chunk i
  avgDocLen: number;
}

/* ── tokenisation ─────────────────────────────────────────── */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to',
  'from', 'up', 'down', 'out', 'off', 'over', 'under', 'then', 'once',
  'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'just',
  'of', 'and', 'or', 'but', 'if', 'this', 'that', 'these', 'those', 'it',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/* ── index construction ───────────────────────────────────── */

export function buildBM25Index(chunks: Chunk[]): BM25Index {
  const N = chunks.length;
  const df = new Map<string, number>(); // document frequency
  const tokenizedChunks: string[][] = [];
  let totalLen = 0;

  // Tokenize and count document frequencies
  for (const chunk of chunks) {
    const tokens = tokenize(`${chunk.docTitle} ${chunk.section} ${chunk.text}`);
    tokenizedChunks.push(tokens);
    totalLen += tokens.length;
    for (const term of new Set(tokens)) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const avgDocLen = N === 0 ? 1 : totalLen / N;

  // Compute IDF for each term: log((N - df + 0.5) / (df + 0.5) + 1)
  const idf = new Map<string, number>();
  for (const [term, freq] of df) {
    idf.set(term, Math.log((N - freq + 0.5) / (freq + 0.5) + 1));
  }

  // Compute TF maps per chunk
  const tfMaps: Map<string, number>[] = tokenizedChunks.map((tokens) => {
    const m = new Map<string, number>();
    for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  });

  return { chunks, idf, tf: tfMaps, avgDocLen };
}

/* ── scoring ──────────────────────────────────────────────── */

const K1 = 1.5;
const B = 0.75;

export interface BM25Result {
  chunk: Chunk;
  score: number;
  rank: number;
}

export function bm25Search(
  index: BM25Index,
  query: string,
  topK = 20
): BM25Result[] {
  const queryTerms = tokenize(query);
  const scores: { chunk: Chunk; score: number }[] = [];

  for (let i = 0; i < index.chunks.length; i++) {
    const tfMap = index.tf[i]!;
    const docLen =
      [...tfMap.values()].reduce((s, v) => s + v, 0) || index.avgDocLen;
    let score = 0;

    for (const term of queryTerms) {
      const idfVal = index.idf.get(term) ?? 0;
      if (idfVal === 0) continue;
      const tfVal = tfMap.get(term) ?? 0;
      const numerator = tfVal * (K1 + 1);
      const denominator = tfVal + K1 * (1 - B + B * (docLen / index.avgDocLen));
      score += idfVal * (numerator / denominator);
    }

    if (score > 0) {
      scores.push({ chunk: index.chunks[i]!, score });
    }
  }

  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topK).map((s, i) => ({ ...s, rank: i + 1 }));
}
