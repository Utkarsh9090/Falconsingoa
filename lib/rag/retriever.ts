/**
 * Hybrid Retriever
 *
 * Combines dense (vector) + sparse (BM25) retrieval via
 * Reciprocal Rank Fusion (RRF), then applies LLM-based reranking.
 *
 * Pipeline:
 *   query → embed → vector search (top-20)
 *           → BM25 search (top-20)
 *           → RRF fusion (top-10)
 *           → LLM rerank (top-5)
 */

import type { VectorStore } from './vectorstore';
import { vectorSearch, embedQuery } from './vectorstore';
import type { BM25Index } from './bm25';
import { bm25Search } from './bm25';
import type { Chunk } from './chunker';
import { resolveParent } from './chunker';

export interface RetrievalResult {
  chunk: Chunk;
  /** Final RRF score */
  rrfScore: number;
  /** Dense cosine similarity score */
  denseScore?: number;
  /** BM25 score */
  bm25Score?: number;
  /** Cross-encoder rerank score */
  rerankScore?: number;
  /** Index in final ranked list */
  rank: number;
  /** For hierarchical chunks: the resolved parent chunk */
  parentChunk?: Chunk;
}

/* ── RRF ──────────────────────────────────────────────────── */

const RRF_K = 60;

function rrfScore(rank: number): number {
  return 1 / (RRF_K + rank);
}

/**
 * Reciprocal Rank Fusion over two ranked lists.
 * Returns deduplicated results sorted by combined RRF score.
 */
function reciprocalRankFusion(
  denseResults: { chunk: Chunk; score: number; rank: number }[],
  bm25Results: { chunk: Chunk; score: number; rank: number }[]
): { chunk: Chunk; rrfScore: number; denseScore?: number; bm25Score?: number }[] {
  const combined = new Map<
    string,
    { chunk: Chunk; rrfScore: number; denseScore?: number; bm25Score?: number }
  >();

  for (const r of denseResults) {
    const key = r.chunk.id;
    const existing = combined.get(key) ?? {
      chunk: r.chunk,
      rrfScore: 0,
    };
    combined.set(key, {
      ...existing,
      rrfScore: existing.rrfScore + rrfScore(r.rank),
      denseScore: r.score,
    });
  }

  for (const r of bm25Results) {
    const key = r.chunk.id;
    const existing = combined.get(key) ?? {
      chunk: r.chunk,
      rrfScore: 0,
    };
    combined.set(key, {
      ...existing,
      rrfScore: existing.rrfScore + rrfScore(r.rank),
      bm25Score: r.score,
    });
  }

  const sorted = [...combined.values()].sort((a, b) => b.rrfScore - a.rrfScore);
  return sorted;
}

/* ── LLM reranker ─────────────────────────────────────────── */

/**
 * Lightweight reranker using Sarvam AI.
 * Scores each query-chunk pair and returns sorted results.
 * Falls back to RRF order if the API call fails.
 */
async function llmRerank(
  query: string,
  candidates: { chunk: Chunk; rrfScore: number }[],
  apiKey: string,
  topK = 5
): Promise<RetrievalResult[]> {
  if (candidates.length === 0) return [];

  try {
    const promptEntries = candidates
      .slice(0, 10)
      .map(
        (c, i) =>
          `[${i + 1}] (${c.chunk.docTitle} — ${c.chunk.section}): ${c.chunk.text.slice(0, 200)}`
      )
      .join('\n\n');

    const prompt = `You are a relevance ranker. Given the query and candidate passages, return a JSON array of the top ${topK} passage numbers (1-indexed) in order of relevance. Only return the JSON array, nothing else.

Query: "${query}"

Candidates:
${promptEntries}

Respond with ONLY a JSON array like: [3, 1, 5, 2, 4]`;

    const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        model: 'sarvam-m',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 50,
      }),
    });

    if (res.ok) {
      const json = (await res.json()) as {
        choices: { message: { content: string } }[];
      };
      const content = json.choices[0]?.message?.content?.trim() ?? '';
      // Extract JSON array from the response
      const match = content.match(/\[[\d,\s]+\]/);
      if (match) {
        const ranks = JSON.parse(match[0]) as number[];
        const reranked: RetrievalResult[] = [];
        for (let i = 0; i < ranks.length; i++) {
          const idx = (ranks[i] ?? 1) - 1;
          const candidate = candidates[idx];
          if (candidate) {
            reranked.push({
              chunk: candidate.chunk,
              rrfScore: candidate.rrfScore,
              rerankScore: topK - i,
              rank: i + 1,
            });
          }
        }
        return reranked.slice(0, topK);
      }
    }
  } catch {
    // fall through to RRF fallback
  }

  // Fallback: use RRF order
  return candidates.slice(0, topK).map((c, i) => ({
    chunk: c.chunk,
    rrfScore: c.rrfScore,
    rank: i + 1,
  }));
}

/* ── Main retriever ───────────────────────────────────────── */

export interface RetrieverOptions {
  topKDense?: number;
  topKBM25?: number;
  topKRerank?: number;
  resolveHierarchical?: boolean;
}

export async function retrieve(
  query: string,
  vectorStore: VectorStore,
  bm25Index: BM25Index,
  allChunks: Chunk[],
  apiKey: string,
  options: RetrieverOptions = {}
): Promise<RetrievalResult[]> {
  const {
    topKDense = 20,
    topKBM25 = 20,
    topKRerank = 5,
    resolveHierarchical = true,
  } = options;

  // 1. Embed query
  const queryEmbedding = await embedQuery(query, apiKey);

  // 2. Dense retrieval
  const denseResults = vectorSearch(vectorStore, queryEmbedding, topKDense);

  // 3. Sparse BM25 retrieval
  const sparseResults = bm25Search(bm25Index, query, topKBM25);

  // 4. RRF fusion
  const fused = reciprocalRankFusion(denseResults, sparseResults);

  // 5. LLM reranking
  const reranked = await llmRerank(query, fused, apiKey, topKRerank);

  // 6. Resolve hierarchical parents for richer context
  if (resolveHierarchical) {
    for (const result of reranked) {
      if (result.chunk.strategy === 'hierarchical_child' && result.chunk.parentId) {
        result.parentChunk = resolveParent(result.chunk, allChunks);
      }
    }
  }

  return reranked;
}
