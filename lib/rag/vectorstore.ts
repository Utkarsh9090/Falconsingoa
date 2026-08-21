/**
 * In-Memory Vector Store
 *
 * Pure JavaScript cosine similarity search.
 * Chunk embeddings are fetched from Sarvam AI at server startup
 * and cached in memory for sub-5ms query-time retrieval.
 */

import type { Chunk } from './chunker';

export interface VectorEntry {
  chunk: Chunk;
  embedding: number[];
}

export interface VectorStore {
  entries: VectorEntry[];
  dim: number;
}

/* ── math helpers ─────────────────────────────────────────── */

/** L2-normalise a vector in place */
export function normalise(v: number[]): number[] {
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm);
  if (norm === 0) return v;
  return v.map((x) => x / norm);
}

/** Dot product (= cosine sim for normalised vectors) */
export function dot(a: number[], b: number[]): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i]! * b[i]!;
  return s;
}

/* ── Sarvam embedding client ──────────────────────────────── */

const SARVAM_BASE = 'https://api.sarvam.ai/v1';
const EMBED_MODEL = 'text-embedding-3-small'; // Sarvam proxies OpenAI-compatible

/**
 * Embed a batch of texts via Sarvam AI embedding API.
 * Falls back to a TF-IDF-like sparse vector if the API fails
 * so startup is never blocked by a transient error.
 */
export async function embedBatch(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  try {
    const res = await fetch(`${SARVAM_BASE}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
    });

    if (res.ok) {
      const json = (await res.json()) as {
        data: { embedding: number[] }[];
      };
      return json.data.map((d) => normalise(d.embedding));
    }
  } catch {
    // fall through to fallback
  }

  // Fallback: sparse bag-of-words TF-IDF-like 512-dim vector
  return texts.map((t) => fallbackEmbed(t));
}

/** Embed a single query string */
export async function embedQuery(
  text: string,
  apiKey: string
): Promise<number[]> {
  const [vec] = await embedBatch([text], apiKey);
  return vec ?? fallbackEmbed(text);
}

/* ── Fallback embedding (sparse, deterministic) ───────────── */
const DIM = 512;

function fallbackEmbed(text: string): number[] {
  const vec = new Array<number>(DIM).fill(0);
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  for (const word of words) {
    const h = hashWord(word);
    vec[h % DIM] = (vec[h % DIM]! + 1);
  }
  return normalise(vec);
}

function hashWord(w: string): number {
  let h = 5381;
  for (let i = 0; i < w.length; i++) {
    h = ((h << 5) + h) ^ w.charCodeAt(i);
    h = h >>> 0; // keep unsigned
  }
  return h;
}

/* ── VectorStore build & search ──────────────────────────── */

/**
 * Build a VectorStore from chunks.
 * Embeddings are fetched in batches of 20 to avoid API rate limits.
 */
export async function buildVectorStore(
  chunks: Chunk[],
  apiKey: string
): Promise<VectorStore> {
  const BATCH_SIZE = 20;
  const entries: VectorEntry[] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => `${c.docTitle} ${c.section}: ${c.text}`);
    const embeddings = await embedBatch(texts, apiKey);
    for (let j = 0; j < batch.length; j++) {
      entries.push({ chunk: batch[j]!, embedding: embeddings[j]! });
    }
  }

  return { entries, dim: entries[0]?.embedding.length ?? DIM };
}

export interface SearchResult {
  chunk: Chunk;
  score: number;
  rank: number;
}

/**
 * Top-K cosine similarity search over the in-memory vector store.
 * O(n) — fast for corpora < 50K chunks.
 */
export function vectorSearch(
  store: VectorStore,
  queryEmbedding: number[],
  topK = 20
): SearchResult[] {
  const scored = store.entries.map((e) => ({
    chunk: e.chunk,
    score: dot(queryEmbedding, e.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map((s, i) => ({ ...s, rank: i + 1 }));
}
