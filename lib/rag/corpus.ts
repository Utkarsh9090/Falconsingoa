/**
 * RAG Corpus — Combined dataset
 * AI/RAG knowledge + Falcons/HackerHouse Goa 2026 event data
 *
 * This is the knowledge base that gets chunked and indexed at startup.
 * Each document has: id, title, section, content, metadata
 */

export interface CorpusDocument {
  id: string;
  title: string;
  section: string;
  content: string;
  metadata: Record<string, string>;
}

export const CORPUS: CorpusDocument[] = [
  // =========================================================
  // FALCONS / HACKERHHOUSE GOA 2026 — Event Data
  // =========================================================
  {
    id: 'hh-001',
    title: 'HackerHouse Goa 2026',
    section: 'Overview',
    content:
      'HackerHouse Goa 2026 is an elite, invite-only hackathon and technical residency hosted by the Falcons community in Goa, India. It brings together the top 1% of builders, engineers, and founders for an intense week of hacking, learning, and shipping. The event runs from August 18-25, 2026 at a beachside venue in North Goa. Participants form small teams of 2-4 and compete across multiple technical tracks. Prizes include cash awards, investor introductions, and accelerator spots.',
    metadata: { source: 'Falcons Event Guide', type: 'event' },
  },
  {
    id: 'hh-002',
    title: 'HackerHouse Goa 2026',
    section: 'Tracks and Challenges',
    content:
      'HackerHouse Goa 2026 runs five competitive tracks: (1) AI & Machine Learning — build intelligent systems using LLMs, RAG, agents, or custom models; (2) Web3 & DeFi — smart contracts, DAOs, on-chain products; (3) DevTools & Infrastructure — developer productivity, CI/CD, monitoring, databases; (4) Consumer Apps — mobile and web products with real user value; (5) Open Innovation — anything that does not fit neatly into the above. Task 02 specifically focuses on building a voice-enabled RAG system with Sarvam AI integration and sub-200ms latency.',
    metadata: { source: 'Falcons Event Guide', type: 'track' },
  },
  {
    id: 'hh-003',
    title: 'Falcons Community',
    section: 'About',
    content:
      'Falcons is a curated community of elite software engineers, founders, and technical leaders based primarily in India. Founded in 2023, Falcons has grown to over 2,000 vetted members across product engineering, AI/ML, Web3, and infrastructure domains. The community runs regular events including HackerHouse residencies, technical workshops, and a private Slack for peer-to-peer knowledge exchange. Membership is by application only and requires demonstrated technical excellence.',
    metadata: { source: 'Falcons Community Wiki', type: 'community' },
  },
  {
    id: 'hh-004',
    title: 'HackerHouse Goa 2026',
    section: 'Schedule',
    content:
      'Day 1 (Aug 18): Arrivals, check-in, welcome dinner, team formation. Day 2 (Aug 19): Opening keynote, track briefings, hacking begins at noon. Day 3-5 (Aug 20-22): Deep work sessions, mentor office hours, daily stand-ups at 9am. Day 6 (Aug 23): Feature freeze, polish sprint, demo preparation. Day 7 (Aug 24): Final demos and presentations — 5-minute pitches + 3-minute Q&A per team. Day 8 (Aug 25): Awards ceremony, closing dinner, departures. Judges include investors from Sequoia, Accel, and prominent angel investors from the Falcons network.',
    metadata: { source: 'Falcons Event Guide', type: 'schedule' },
  },
  {
    id: 'hh-005',
    title: 'HackerHouse Goa 2026',
    section: 'Task 02 — Voice RAG Requirements',
    content:
      'Task 02 at HackerHouse Goa 2026 requires building a voice-enabled Retrieval-Augmented Generation system end-to-end. The pipeline shape is: Voice input → Speech-to-text (using Sarvam AI) → Chunking and Retrieval via vector DB → Answer generation. Requirements: (1) Use Sarvam for STT; (2) Use multiple chunking strategies — not single naive fixed-size chunking; (3) Full pipeline latency under 200ms; (4) Submit P50/P70/P100 latency numbers across multiple test queries; (5) Run the model inside a proper harness with tool calls, retries, structured I/O; (6) Add guardrails for off-topic queries, unsafe inputs, and hallucination checks.',
    metadata: { source: 'Task 02 Briefing', type: 'requirements' },
  },
  {
    id: 'hh-006',
    title: 'Sarvam AI',
    section: 'Overview',
    content:
      'Sarvam AI is an Indian AI startup focused on building AI for all 22 scheduled Indian languages. Their flagship product Sarvam-2B is a language model specifically trained on Indic language data. Their API suite includes: speech-to-text (Saaras), text-to-speech (Bulbul), translation, and chat completion. Sarvam is backed by Lightspeed and Peak XV Partners. The Sarvam API base URL is https://api.sarvam.ai/v1 and it is OpenAI-compatible. Authentication uses the api-subscription-key header.',
    metadata: { source: 'Sarvam AI Docs', type: 'tool' },
  },
  {
    id: 'hh-007',
    title: 'Sarvam AI',
    section: 'Speech-to-Text API',
    content:
      'Sarvam Saaras is the speech-to-text model. API endpoint: POST https://api.sarvam.ai/v1/speech-to-text. Accepts multipart/form-data with a file field (audio file, max 25MB) and model field (saaras:v2). Supported audio formats: WAV, MP3, OGG, WebM, FLAC. Returns JSON with transcript field. Supports 10 Indian languages plus English. The model automatically detects language if not specified. Rate limit: 100 requests per minute on the free tier.',
    metadata: { source: 'Sarvam AI Docs', type: 'api' },
  },
  {
    id: 'hh-008',
    title: 'Sarvam AI',
    section: 'Chat Completion API',
    content:
      'Sarvam chat completion API is OpenAI-compatible. Endpoint: POST https://api.sarvam.ai/v1/chat/completions. Request format identical to OpenAI with messages array, model field, and temperature. Available models: sarvam-m (fast, general purpose), sarvam-2b (small, efficient), saaras-v2 (STT only). The API supports function calling, streaming, and structured outputs. Maximum context window is 8192 tokens. Response format matches OpenAI ChatCompletion object.',
    metadata: { source: 'Sarvam AI Docs', type: 'api' },
  },

  // =========================================================
  // AI / RAG KNOWLEDGE BASE
  // =========================================================
  {
    id: 'rag-001',
    title: 'Retrieval-Augmented Generation',
    section: 'Introduction',
    content:
      'Retrieval-Augmented Generation (RAG) is a technique that enhances large language model outputs by grounding them in externally retrieved documents. Rather than relying solely on the model\'s parametric knowledge, RAG first retrieves relevant passages from a knowledge base using semantic search, then conditions the generation on those passages. This significantly reduces hallucination and allows the system to provide verifiable, sourced answers. The architecture was introduced by Lewis et al. (2020) in "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks".',
    metadata: { source: 'Lewis et al. 2020', type: 'research' },
  },
  {
    id: 'rag-002',
    title: 'Retrieval-Augmented Generation',
    section: 'Architecture',
    content:
      'A standard RAG system has three main components: (1) Indexing — documents are chunked, embedded using a text embedding model, and stored in a vector database; (2) Retrieval — at query time, the query is embedded and the most similar document chunks are retrieved using approximate nearest-neighbor search; (3) Generation — the retrieved chunks are concatenated with the query and fed to a language model to produce the final answer. Advanced RAG systems add reranking, query rewriting, and multi-hop retrieval on top of this basic pipeline.',
    metadata: { source: 'RAG Architecture Guide', type: 'technical' },
  },
  {
    id: 'rag-003',
    title: 'Chunking Strategies',
    section: 'Fixed-Size Chunking',
    content:
      'Fixed-size chunking splits documents into chunks of a fixed token count (typically 256-1024 tokens) with a configurable overlap (typically 10-20% of chunk size). This is the simplest and most common chunking approach. Advantages: predictable chunk sizes, easy to implement, works well for homogeneous text. Disadvantages: can split sentences mid-thought, ignores document structure, may create semantically incoherent chunks. Best used as a baseline or for documents with uniform formatting.',
    metadata: { source: 'Chunking Best Practices', type: 'technical' },
  },
  {
    id: 'rag-004',
    title: 'Chunking Strategies',
    section: 'Sentence-Boundary Chunking',
    content:
      'Sentence-boundary chunking uses NLP tools (like NLTK or spaCy) to split text at grammatical sentence boundaries, then groups sentences into chunks that respect a maximum token budget. This preserves semantic coherence better than fixed-size chunking because it never splits mid-sentence. Chunks can be further refined by merging short sentences or splitting very long ones. Works well for natural language documents like articles, reports, and documentation. Common implementation: use NLTK sent_tokenize or regex-based sentence splitters.',
    metadata: { source: 'Chunking Best Practices', type: 'technical' },
  },
  {
    id: 'rag-005',
    title: 'Chunking Strategies',
    section: 'Semantic Chunking',
    content:
      'Semantic chunking uses embedding models to identify natural topic boundaries in text. The algorithm embeds each sentence, then computes cosine similarity between adjacent sentences. A large drop in similarity (below a threshold like 0.5) signals a topic change and creates a chunk boundary. This approach produces highly coherent chunks that correspond to natural topic shifts. It is more expensive than fixed or sentence chunking because it requires running embeddings at index time, but produces superior retrieval quality. Greg Kamradt popularized this approach.',
    metadata: { source: 'Semantic Chunking Research', type: 'technical' },
  },
  {
    id: 'rag-006',
    title: 'Chunking Strategies',
    section: 'Hierarchical Chunking',
    content:
      'Hierarchical chunking (also called "parent-child chunking" or "small-to-big retrieval") creates chunks at multiple granularities. Small child chunks (128-256 tokens) are indexed and retrieved for precise matching. When a child chunk is retrieved, its parent chunk (1024-2048 tokens) is returned as the actual context for generation. This preserves local precision during retrieval while providing broader context for generation. LlamaIndex calls this "auto-merging retrieval". It addresses the precision-context tradeoff in standard fixed-size chunking.',
    metadata: { source: 'LlamaIndex Documentation', type: 'technical' },
  },
  {
    id: 'rag-007',
    title: 'Chunking Strategies',
    section: 'Metadata-Aware Chunking',
    content:
      'Metadata-aware chunking uses document structure signals (headings, section markers, table-of-contents) to create chunks that correspond to logical sections of a document. For structured documents (markdown, HTML, PDFs with headers), the chunker respects H1/H2/H3 boundaries to ensure each chunk represents one cohesive section. Each chunk is annotated with its section path (e.g., "Chapter 2 > Section 3 > Subsection 1"), which enables precise citation. This is especially effective for technical documentation and books.',
    metadata: { source: 'Advanced RAG Techniques', type: 'technical' },
  },
  {
    id: 'rag-008',
    title: 'Vector Embeddings',
    section: 'Overview',
    content:
      'Vector embeddings are dense numerical representations of text that capture semantic meaning in a continuous vector space. In RAG systems, both queries and document chunks are encoded into embeddings using models like sentence-transformers (all-MiniLM-L6-v2, all-mpnet-base-v2). Similar texts produce vectors with high cosine similarity, enabling semantic search beyond keyword matching. Embedding dimensions typically range from 384 (MiniLM) to 1536 (OpenAI ada-002). Modern embedding models are trained with contrastive objectives (SimCSE, E5, BGE).',
    metadata: { source: 'Embedding Models Survey', type: 'technical' },
  },
  {
    id: 'rag-009',
    title: 'Hybrid Retrieval',
    section: 'BM25 + Dense',
    content:
      'Hybrid retrieval combines sparse retrieval methods (BM25) with dense retrieval methods (vector similarity) to leverage the strengths of both. BM25 excels at exact keyword matching and handles rare or domain-specific terms well. Dense retrieval captures semantic similarity and handles paraphrases and synonyms. Results from both are merged using Reciprocal Rank Fusion (RRF): score(d) = sum(1 / (k + rank_i(d))) where k=60 is a constant. Hybrid retrieval consistently outperforms either method alone, especially on heterogeneous query distributions.',
    metadata: { source: 'Hybrid Search Systems', type: 'technical' },
  },
  {
    id: 'rag-010',
    title: 'Reranking',
    section: 'Cross-Encoder',
    content:
      'Reranking is a two-stage retrieval refinement step. After initial retrieval (via fast bi-encoder or hybrid search), a more expensive cross-encoder model scores each query-document pair jointly. Unlike bi-encoders that encode queries and documents independently, cross-encoders process the concatenated (query, document) pair through a transformer, enabling rich token-level attention. This dramatically improves relevance ranking. Common models: cross-encoder/ms-marco-MiniLM-L-6-v2, Cohere Rerank, and Jina Reranker. Adds 20-80ms depending on the number of candidates.',
    metadata: { source: 'Two-Stage Retrieval', type: 'technical' },
  },
  {
    id: 'rag-011',
    title: 'Guardrails',
    section: 'Overview',
    content:
      'Guardrails in RAG systems are safety and quality checks that determine when the system should not answer. Types: (1) Pre-retrieval guardrails — block clearly off-topic or harmful queries before spending compute; (2) Post-retrieval guardrails — check if retrieved context is sufficient to answer the query; (3) Post-generation guardrails — verify the generated answer is grounded in the retrieved context and does not hallucinate. Guardrails should be fast (under 20ms) and conservative — it is better to decline than to hallucinate.',
    metadata: { source: 'RAG Safety Systems', type: 'technical' },
  },
  {
    id: 'rag-012',
    title: 'Guardrails',
    section: 'Hallucination Detection',
    content:
      'Hallucination detection in RAG checks whether the generated answer is entailed by the retrieved context. Approaches: (1) Token overlap — compute what fraction of the answer\'s key tokens (nouns, numbers, entities) appear in the retrieved chunks; (2) NLI-based — use a Natural Language Inference model to determine if the context "entails" the answer; (3) Self-consistency — generate the answer multiple times and flag high variance; (4) Retrieval citation check — require the model to cite specific source IDs and verify citations exist. Low overlap scores (< 30%) are strong hallucination signals.',
    metadata: { source: 'Hallucination Detection Survey', type: 'technical' },
  },
  {
    id: 'rag-013',
    title: 'Latency Optimization',
    section: 'Sub-200ms RAG',
    content:
      'Achieving sub-200ms end-to-end RAG latency requires careful engineering. Target latency budget: embedding the query (15-50ms), vector search (2-10ms), BM25 search (1-5ms), RRF fusion (1ms), reranking top-20 (20-50ms), LLM generation (50-100ms), grounding check (5-10ms). Key optimizations: (1) Pre-compute and cache all document embeddings at server startup; (2) Use quantized embedding models (int8); (3) Use small but fast LLMs (Groq, Sarvam); (4) Limit reranking to top-20 candidates; (5) Keep context window under 2000 tokens for generation; (6) Use streaming to reduce time-to-first-token perception.',
    metadata: { source: 'Latency Optimization Guide', type: 'technical' },
  },
  {
    id: 'rag-014',
    title: 'Latency Analytics',
    section: 'Percentiles',
    content:
      'Latency analytics for RAG systems should report percentile statistics rather than averages. P50 (median) represents the typical user experience. P70 shows what 70% of requests experience. P95/P99 captures the tail latency. P100 is the worst case observed. To compute meaningful percentiles, measure across at least 20-50 representative queries covering different topics, lengths, and complexity levels. Store timestamps for each pipeline stage (embedding, retrieval, reranking, generation) to identify bottlenecks. Common tools: Prometheus, DataDog, custom rolling window implementations.',
    metadata: { source: 'Observability Best Practices', type: 'technical' },
  },
  {
    id: 'rag-015',
    title: 'Pipeline Harness',
    section: 'Structured Orchestration',
    content:
      'A proper pipeline harness wraps the RAG model with structured orchestration: (1) Input validation — sanitize and validate queries before processing; (2) Retry logic — automatically retry failed API calls with exponential backoff (max 3 retries); (3) Structured output parsing — use Pydantic or Zod schemas to validate LLM JSON outputs; (4) Error recovery — graceful degradation when individual stages fail; (5) Observability — log per-stage latencies and errors; (6) Timeout handling — enforce per-stage timeouts to prevent single slow calls from dominating. The harness pattern is the difference between a prototype and a production system.',
    metadata: { source: 'Production RAG Engineering', type: 'technical' },
  },
  {
    id: 'rag-016',
    title: 'FAISS',
    section: 'Vector Database',
    content:
      'FAISS (Facebook AI Similarity Search) is a library for efficient similarity search over dense vectors. It supports multiple index types: IndexFlatIP (exact inner product), IndexIVFFlat (approximate, faster), and IndexHNSWFlat (hierarchical navigable small world, very fast approximate search). For RAG systems with under 100K documents, IndexFlatIP with normalized vectors provides exact cosine similarity search in <10ms. For larger corpora, HNSW provides near-exact results with significantly lower latency. FAISS is primarily Python/C++ — in Node.js, similar functionality can be achieved with hnswlib-node or in-memory cosine search.',
    metadata: { source: 'FAISS Documentation', type: 'technical' },
  },
  {
    id: 'rag-017',
    title: 'LLM Providers',
    section: 'Speed Comparison',
    content:
      'For low-latency RAG generation (under 100ms), the fastest providers are: (1) Groq — uses custom LPU hardware, typically 50-80ms for 500 token outputs with Llama-3.3-70B; (2) Sarvam AI — fast inference for Indian language tasks, ~80-120ms; (3) Together AI — competitive speeds with open source models; (4) Fireworks AI — optimized inference, similar to Groq; (5) OpenAI GPT-4o-mini — ~80-150ms depending on load. For the best latency/quality tradeoff in a RAG context with <500 token outputs, Groq with Llama models or Sarvam are the top choices.',
    metadata: { source: 'LLM Provider Benchmarks', type: 'technical' },
  },
  {
    id: 'rag-018',
    title: 'Voice AI',
    section: 'Speech-to-Text',
    content:
      'Speech-to-text (STT) in voice-enabled applications converts audio recordings to text transcripts. Key metrics: Word Error Rate (WER), latency, language support. Top STT providers: Sarvam Saaras (best for Indian languages and English), OpenAI Whisper (open-source, good English), Deepgram (fast, real-time streaming), ElevenLabs (high quality, English-focused), Google Speech-to-Text (broad language support). For a hackathon voice RAG demo, Sarvam is the natural choice for India-focused use cases because it handles Indian accents and code-switching between English and Hindi exceptionally well.',
    metadata: { source: 'STT Provider Guide', type: 'technical' },
  },
  {
    id: 'rag-019',
    title: 'Next.js API Routes',
    section: 'Server-Side RAG',
    content:
      'Next.js App Router API routes (route handlers) are the ideal way to implement RAG backends in a monolithic Next.js application. They run on Node.js in the server environment, have access to the full Node.js API, and can be deployed to Vercel, AWS Lambda, or any Node.js server. For RAG pipelines: the corpus is loaded and indexed at module initialization (singleton pattern), and each query hits the in-memory index for fast retrieval. API routes are defined in app/api/[route]/route.ts files and export GET, POST, etc. handlers. They support streaming responses via ReadableStream for progressive answer delivery.',
    metadata: { source: 'Next.js Documentation', type: 'technical' },
  },
];
