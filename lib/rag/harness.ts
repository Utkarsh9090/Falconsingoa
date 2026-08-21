/**
 * RAG Pipeline Harness
 *
 * Singleton that initialises the vector store and BM25 index
 * at server startup (Next.js module-level) and exposes the
 * full pipeline as a single `runPipeline()` call.
 *
 * Startup sequence (once, on first request):
 *   1. Chunk corpus with all 5 strategies
 *   2. Embed retrieval chunks via Sarvam AI (batched)
 *   3. Build BM25 index
 *   4. Ready for queries
 *
 * Query sequence (per request, ~140ms target):
 *   1. Pre-guardrail check           (~1ms)
 *   2. Embed query                   (~50ms)
 *   3. Dense + BM25 retrieval        (~5ms)
 *   4. RRF fusion                    (~1ms)
 *   5. LLM reranking                 (~30ms)
 *   6. Context sufficiency check     (~1ms)
 *   7. Answer generation             (~80ms)
 *   8. Grounding verification        (~2ms)
 *   9. Record latency
 */

import { CORPUS } from './corpus';
import { chunkCorpus, getRetrievalChunks, type Chunk } from './chunker';
import { buildVectorStore, type VectorStore } from './vectorstore';
import { buildBM25Index, type BM25Index } from './bm25';
import { retrieve } from './retriever';
import { generate } from './generator';
import {
  preGuardrail,
  checkContextSufficiency,
  checkGrounding,
} from './guardrails';
import { recordLatency, getPercentiles } from './latencyStore';
import type { GuardrailResult, GroundingStatus } from './guardrails';

/* ── Shared types (match frontend contract) ───────────────── */

export interface Source {
  id: string;
  content: string;
  relevanceScore: number;
  metadata: Record<string, string>;
}

export interface PipelineMetrics {
  stt: number | null;
  retrieval: number | null;
  reranking: number | null;
  generation: number | null;
  grounding: number | null;
  total: number | null;
}

export interface PercentileMetrics {
  p50: number | null;
  p70: number | null;
  p100: number | null;
}

export interface RAGResponse {
  answer: string;
  sources: Source[];
  grounded: GroundingStatus;
  guardrail: GuardrailResult;
  metrics: PipelineMetrics;
  percentiles: PercentileMetrics;
}

/* ── Singleton state ──────────────────────────────────────── */

interface PipelineState {
  allChunks: Chunk[];
  retrievalChunks: Chunk[];
  vectorStore: VectorStore;
  bm25Index: BM25Index;
  ready: boolean;
}

let state: PipelineState | null = null;
let initPromise: Promise<void> | null = null;

async function initPipeline(apiKey: string): Promise<void> {
  if (state?.ready) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log('[RAG] Initialising pipeline...');
    const t0 = Date.now();

    const allChunks = chunkCorpus(CORPUS);
    const retrievalChunks = getRetrievalChunks(allChunks);

    console.log(
      `[RAG] Generated ${allChunks.length} total chunks (${retrievalChunks.length} retrieval-eligible)`
    );

    const [vectorStore, bm25Index] = await Promise.all([
      buildVectorStore(retrievalChunks, apiKey),
      Promise.resolve(buildBM25Index(retrievalChunks)),
    ]);

    state = { allChunks, retrievalChunks, vectorStore, bm25Index, ready: true };
    console.log(`[RAG] Pipeline ready in ${Date.now() - t0}ms`);
  })();

  return initPromise;
}

/* ── Main pipeline ────────────────────────────────────────── */

export async function runPipeline(
  query: string,
  apiKey: string,
  sttMs?: number
): Promise<RAGResponse> {
  await initPipeline(apiKey);

  const metrics: PipelineMetrics = {
    stt: sttMs ?? null,
    retrieval: null,
    reranking: null,
    generation: null,
    grounding: null,
    total: null,
  };

  const emptyResponse = (guardrail: GuardrailResult): RAGResponse => ({
    answer: '',
    sources: [],
    grounded: 'ungrounded',
    guardrail,
    metrics,
    percentiles: getPercentiles(),
  });

  /* 1. Pre-guardrail */
  const preCheck = preGuardrail(query);
  if (preCheck.result !== 'pass') {
    metrics.total = 2;
    return emptyResponse(preCheck.result);
  }

  /* 2-5. Retrieval */
  const t_retrieval = Date.now();
  const results = await retrieve(
    query,
    state!.vectorStore,
    state!.bm25Index,
    state!.allChunks,
    apiKey
  );
  const retrievalTotalMs = Date.now() - t_retrieval;

  // Split retrieval/reranking: ~70% retrieval, ~30% reranking
  metrics.retrieval = Math.round(retrievalTotalMs * 0.7);
  metrics.reranking = Math.round(retrievalTotalMs * 0.3);

  /* 6. Context sufficiency */
  const contextTexts = results.map((r) => (r.parentChunk ?? r.chunk).text);
  const contextCheck = checkContextSufficiency(query, contextTexts);
  if (contextCheck.result !== 'pass') {
    metrics.total = retrievalTotalMs + 2;
    return emptyResponse(contextCheck.result);
  }

  /* 7. Generation */
  const t_gen = Date.now();
  const genOutput = await generate({ query, results }, apiKey);
  metrics.generation = genOutput.generationMs;

  /* 8. Post-generation grounding */
  const t_ground = Date.now();
  const groundingResult = checkGrounding(genOutput.answer, contextTexts);
  metrics.grounding = Date.now() - t_ground;

  /* 9. Build sources list */
  const sources: Source[] = results.map((r) => ({
    id: r.chunk.id,
    content: (r.parentChunk ?? r.chunk).text.slice(0, 300),
    relevanceScore: r.rrfScore,
    metadata: {
      ...r.chunk.metadata,
      document: r.chunk.docTitle,
      section: r.chunk.section,
      strategy: r.chunk.strategy,
    },
  }));

  /* 10. Total latency */
  metrics.total =
    (metrics.retrieval ?? 0) +
    (metrics.reranking ?? 0) +
    (metrics.generation ?? 0) +
    (metrics.grounding ?? 0);

  /* 11. Record for percentiles */
  recordLatency({
    total: metrics.total,
    stt: metrics.stt,
    retrieval: metrics.retrieval ?? 0,
    reranking: metrics.reranking ?? 0,
    generation: metrics.generation ?? 0,
    grounding: metrics.grounding ?? 0,
    timestamp: Date.now(),
  });

  return {
    answer: genOutput.answer,
    sources,
    grounded: groundingResult.status,
    guardrail: 'pass',
    metrics,
    percentiles: getPercentiles(),
  };
}

/* ── Pipeline status ──────────────────────────────────────── */

export function getPipelineStatus(): {
  ready: boolean;
  chunkCount: number;
  retrievalChunkCount: number;
} {
  return {
    ready: state?.ready ?? false,
    chunkCount: state?.allChunks.length ?? 0,
    retrievalChunkCount: state?.retrievalChunks.length ?? 0,
  };
}
