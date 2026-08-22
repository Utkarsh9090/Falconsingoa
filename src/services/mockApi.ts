/**
 * Mock API Service
 *
 * Realistic mock implementation that simulates the full RAG pipeline.
 * Provides believable latencies, multiple Q&A scenarios, and guardrail triggers.
 */

import type {
  RAGResponse,
  SystemStatusData,
  PipelineMetrics,
  Source,
  GuardrailResult,
} from '../types/index';
import type { APIService } from './api';

/* ===================================================================
   HELPERS
   =================================================================== */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const jitter = (base: number, variance: number = 0.3) =>
  Math.round(base * (1 + (Math.random() * 2 - 1) * variance));

/* ===================================================================
   MOCK KNOWLEDGE BASE
   =================================================================== */

interface MockQA {
  keywords: string[];
  answer: string;
  sources: Source[];
  guardrail: GuardrailResult;
}

const MOCK_QA: MockQA[] = [
  {
    keywords: ['retrieval', 'augmented', 'rag', 'what is rag'],
    answer:
      'Retrieval-Augmented Generation (RAG) is a technique that enhances large language model outputs by grounding them in externally retrieved documents. Rather than relying solely on the model\'s parametric knowledge, RAG first retrieves relevant passages from a knowledge base using semantic search, then conditions the generation on those passages. This significantly reduces hallucination and allows the system to provide verifiable, sourced answers. The architecture typically combines a dense retriever (e.g., bi-encoder with vector similarity search) with a generative model that produces answers conditioned on the retrieved context.',
    sources: [
      {
        id: 'src-001',
        content: 'RAG combines retrieval mechanisms with generative models to produce outputs grounded in external knowledge sources, significantly reducing factual hallucination in LLM responses.',
        relevanceScore: 0.94,
        metadata: { document: 'Lewis et al. 2020', section: 'Abstract' },
      },
      {
        id: 'src-002',
        content: 'The retrieval component uses dense passage retrieval (DPR) to encode queries and documents into a shared embedding space, enabling efficient nearest-neighbor search over millions of passages.',
        relevanceScore: 0.89,
        metadata: { document: 'RAG Architecture Guide', section: '2.1 Dense Retrieval' },
      },
      {
        id: 'src-003',
        content: 'By conditioning generation on retrieved evidence, RAG systems achieve significantly higher factual accuracy compared to closed-book models, particularly on knowledge-intensive tasks.',
        relevanceScore: 0.85,
        metadata: { document: 'Benchmarking RAG Systems', section: '4. Results' },
      },
    ],
    guardrail: 'pass',
  },
  {
    keywords: ['embedding', 'vector', 'embeddings'],
    answer:
      'Vector embeddings are dense numerical representations of text that capture semantic meaning in a continuous vector space. In RAG systems, both queries and document chunks are encoded into embeddings using models like sentence-transformers. Similar texts produce vectors with high cosine similarity, enabling efficient semantic search. The embedding dimension (typically 384–1536) represents a trade-off between representational capacity and computational cost. Modern embedding models are trained with contrastive learning objectives that push semantically similar pairs closer together in the vector space while separating dissimilar ones.',
    sources: [
      {
        id: 'src-004',
        content: 'Dense vector embeddings encode semantic meaning into fixed-dimensional representations, enabling similarity search that goes beyond keyword matching to capture conceptual relationships.',
        relevanceScore: 0.92,
        metadata: { document: 'Embedding Models Survey', section: '1. Introduction' },
      },
      {
        id: 'src-005',
        content: 'Contrastive learning objectives such as InfoNCE train embedding models to minimize distance between positive pairs while maximizing distance from hard negatives, producing discriminative representations.',
        relevanceScore: 0.87,
        metadata: { document: 'Training Dense Retrievers', section: '3.2 Loss Functions' },
      },
    ],
    guardrail: 'pass',
  },
  {
    keywords: ['hallucination', 'grounding', 'grounded', 'factual'],
    answer:
      'Grounding refers to the process of anchoring LLM-generated responses in verifiable source material. In a RAG system, grounding is achieved by explicitly conditioning the generation on retrieved passages and then verifying that the generated answer is supported by those passages. A grounding check compares claims in the answer against the retrieved context, flagging any statements that cannot be traced back to a source. This is critical for production deployments where factual reliability is non-negotiable. Techniques include NLI-based verification, citation generation, and confidence scoring.',
    sources: [
      {
        id: 'src-006',
        content: 'Grounding verification uses natural language inference (NLI) models to determine whether generated claims are entailed by, contradicted by, or neutral with respect to the retrieved evidence passages.',
        relevanceScore: 0.91,
        metadata: { document: 'Grounding in RAG', section: '3. Verification Pipeline' },
      },
      {
        id: 'src-007',
        content: 'Ungrounded generations—hallucinations—occur when the model produces factual-sounding statements that are not supported by any retrieved source, a critical failure mode in knowledge-intensive applications.',
        relevanceScore: 0.88,
        metadata: { document: 'Hallucination Detection', section: '2.1 Taxonomy' },
      },
      {
        id: 'src-008',
        content: 'Citation-augmented generation forces the model to produce inline references to specific retrieved passages, enabling users to verify claims and increasing trust in the system.',
        relevanceScore: 0.82,
        metadata: { document: 'Trustworthy AI Systems', section: '5. Citation Methods' },
      },
    ],
    guardrail: 'pass',
  },
  {
    keywords: ['reranking', 'rerank', 'cross-encoder'],
    answer:
      'Reranking is a critical second-stage retrieval step that improves the precision of retrieved documents. After the initial retrieval (typically using a fast bi-encoder), a more computationally expensive cross-encoder model scores each query-document pair jointly. Unlike bi-encoders that encode queries and documents independently, cross-encoders process the concatenated query-document pair through a transformer, enabling rich token-level interactions. This dramatically improves relevance ranking at the cost of higher latency. Common reranking models include cross-encoder variants of BERT and Cohere Rerank.',
    sources: [
      {
        id: 'src-009',
        content: 'Cross-encoder rerankers process query-document pairs jointly through a transformer, enabling full token-level attention between the query and document tokens for superior relevance estimation.',
        relevanceScore: 0.93,
        metadata: { document: 'Two-Stage Retrieval', section: '3. Cross-Encoder Reranking' },
      },
      {
        id: 'src-010',
        content: 'Empirical results show that reranking the top-100 bi-encoder results with a cross-encoder improves NDCG@10 by 15-25% across standard benchmarks while adding only 50-150ms of latency.',
        relevanceScore: 0.86,
        metadata: { document: 'Retrieval Pipeline Optimization', section: '4.2 Latency Analysis' },
      },
    ],
    guardrail: 'pass',
  },
  {
    keywords: ['hybrid', 'search', 'bm25', 'sparse'],
    answer:
      'Hybrid retrieval combines sparse retrieval methods (like BM25) with dense retrieval methods (vector similarity search) to leverage the strengths of both approaches. BM25 excels at exact keyword matching and handles rare terms well, while dense retrieval captures semantic similarity and handles paraphrases. In practice, hybrid retrieval typically uses reciprocal rank fusion (RRF) or weighted linear combination to merge the two result sets. This approach consistently outperforms either method alone, particularly on diverse query distributions where some queries benefit from lexical matching and others from semantic understanding.',
    sources: [
      {
        id: 'src-011',
        content: 'Reciprocal Rank Fusion (RRF) combines ranked lists from multiple retrievers by assigning scores based on rank position: score(d) = Σ 1/(k + rank_i(d)), where k is typically 60.',
        relevanceScore: 0.90,
        metadata: { document: 'Hybrid Search Systems', section: '2.3 Fusion Methods' },
      },
      {
        id: 'src-012',
        content: 'Hybrid retrieval with BM25 + dense retrieval achieves 8-12% higher recall@100 compared to dense-only retrieval, with the improvement most pronounced on queries containing domain-specific terminology.',
        relevanceScore: 0.87,
        metadata: { document: 'Retrieval Benchmarks 2024', section: '5. Results' },
      },
    ],
    guardrail: 'pass',
  },
];

/* Special guardrail-triggering queries */
const GUARDRAIL_TRIGGERS: Record<string, { guardrail: GuardrailResult; answer: string }> = {
  weather: { guardrail: 'off_topic', answer: '' },
  recipe: { guardrail: 'off_topic', answer: '' },
  sports: { guardrail: 'off_topic', answer: '' },
  'hack the system': { guardrail: 'blocked', answer: '' },
  'ignore instructions': { guardrail: 'blocked', answer: '' },
};

/* ===================================================================
   MOCK API IMPLEMENTATION
   =================================================================== */

function findBestMatch(query: string): MockQA | null {
  const q = query.toLowerCase();
  let bestMatch: MockQA | null = null;
  let bestScore = 0;

  for (const qa of MOCK_QA) {
    const score = qa.keywords.filter((kw) => q.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = qa;
    }
  }

  return bestMatch;
}

function checkGuardrails(query: string): { guardrail: GuardrailResult; answer: string } | null {
  const q = query.toLowerCase();
  for (const [trigger, result] of Object.entries(GUARDRAIL_TRIGGERS)) {
    if (q.includes(trigger)) return result;
  }
  return null;
}

export const mockAPI: APIService = {
  async synthesizeSpeech(_text: string): Promise<string> {
    // Mock: no actual audio — return empty base64 string
    await sleep(jitter(200, 0.2));
    return '';
  },

  async transcribeAudio(_audioBlob: Blob): Promise<string> {
    // Simulate STT latency
    await sleep(jitter(800, 0.3));

    // Return a random mock query
    const queries = [
      'What is retrieval augmented generation?',
      'How do vector embeddings work in RAG systems?',
      'What is grounding and why does it matter?',
      'Explain the reranking step in a retrieval pipeline',
      'How does hybrid search combine BM25 and dense retrieval?',
    ];
    return queries[Math.floor(Math.random() * queries.length)]!;
  },

  async queryRAG(query: string): Promise<RAGResponse> {
    const metrics: PipelineMetrics = {
      stt: null,
      retrieval: null,
      reranking: null,
      generation: null,
      grounding: null,
      total: null,
    };

    // Check guardrails first
    const guardrailCheck = checkGuardrails(query);
    if (guardrailCheck) {
      await sleep(jitter(300));
      return {
        answer: guardrailCheck.answer,
        sources: [],
        grounded: 'ungrounded',
        guardrail: guardrailCheck.guardrail,
        metrics: { ...metrics, total: jitter(300) },
        percentiles: { p50: null, p70: null, p100: null },
      };
    }

    // Simulate retrieval stage
    const retrievalTime = jitter(45, 0.4);
    await sleep(retrievalTime);
    metrics.retrieval = retrievalTime;

    // Simulate reranking
    const rerankTime = jitter(25, 0.3);
    await sleep(rerankTime);
    metrics.reranking = rerankTime;

    // Simulate generation
    const genTime = jitter(120, 0.35);
    await sleep(genTime);
    metrics.generation = genTime;

    // Simulate grounding verification
    const groundTime = jitter(18, 0.3);
    await sleep(groundTime);
    metrics.grounding = groundTime;

    const totalTime = (metrics.retrieval ?? 0) + (metrics.reranking ?? 0) + (metrics.generation ?? 0) + (metrics.grounding ?? 0);
    metrics.total = totalTime;

    // Find matching answer
    const match = findBestMatch(query);

    if (!match) {
      return {
        answer: '',
        sources: [],
        grounded: 'ungrounded',
        guardrail: 'no_context',
        metrics,
        percentiles: { p50: jitter(91), p70: jitter(113), p100: jitter(181) },
      };
    }

    return {
      answer: match.answer,
      sources: match.sources,
      grounded: 'grounded',
      guardrail: 'pass',
      metrics,
      percentiles: { p50: jitter(91), p70: jitter(113), p100: jitter(181) },
    };
  },

  async getSystemStatus(): Promise<SystemStatusData> {
    await sleep(100);
    return {
      system: 'online',
      stt: 'online',
      retrieval: 'online',
      generation: 'online',
      guardrails: 'online',
    };
  },

  async getPipelineMetrics(): Promise<PipelineMetrics> {
    await sleep(100);
    return {
      stt: jitter(42),
      retrieval: jitter(18),
      reranking: jitter(11),
      generation: jitter(63),
      grounding: jitter(9),
      total: jitter(143),
    };
  },
};
