/**
 * Multi-Strategy Chunker
 *
 * Five chunking strategies:
 *   1. FixedSize    — fixed token windows with overlap
 *   2. Sentence     — sentence-boundary aware grouping
 *   3. Semantic     — topic-boundary detection via embedding similarity
 *   4. MetadataAware— respects document structure (title/section)
 *   5. Hierarchical — parent (large) + child (small) dual index
 */

import type { CorpusDocument } from './corpus';

export interface Chunk {
  id: string;
  text: string;
  docId: string;
  docTitle: string;
  section: string;
  strategy: ChunkStrategy;
  metadata: Record<string, string>;
  /** For hierarchical: reference to parent chunk id */
  parentId?: string;
  /** Rough token estimate */
  tokenCount: number;
}

export type ChunkStrategy =
  | 'fixed_size'
  | 'sentence'
  | 'semantic'
  | 'metadata_aware'
  | 'hierarchical_child'
  | 'hierarchical_parent';

/* ── helpers ──────────────────────────────────────────────── */

/** Naive word-based tokeniser (≈ GPT token count within 10%) */
function roughTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

/** Split text into sentences using punctuation heuristics */
function splitSentences(text: string): string[] {
  return text
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function chunkId(docId: string, strategy: string, index: number): string {
  return `${docId}__${strategy}__${index}`;
}

/* ================================================================
   1. FIXED-SIZE CHUNKING
   ================================================================ */
function fixedSizeChunk(
  doc: CorpusDocument,
  maxTokens = 200,
  overlapTokens = 40
): Chunk[] {
  const words = doc.content.split(/\s+/);
  const chunks: Chunk[] = [];
  let start = 0;
  let idx = 0;

  // Convert token counts to word counts (using 1/1.3 ratio)
  const maxWords = Math.floor(maxTokens / 1.3);
  const overlapWords = Math.floor(overlapTokens / 1.3);

  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    const text = words.slice(start, end).join(' ');
    chunks.push({
      id: chunkId(doc.id, 'fs', idx++),
      text,
      docId: doc.id,
      docTitle: doc.title,
      section: doc.section,
      strategy: 'fixed_size',
      metadata: { ...doc.metadata, chunkStrategy: 'fixed_size' },
      tokenCount: roughTokens(text),
    });
    if (end === words.length) break;
    start = end - overlapWords;
  }
  return chunks;
}

/* ================================================================
   2. SENTENCE-BOUNDARY CHUNKING
   ================================================================ */
function sentenceChunk(doc: CorpusDocument, maxTokens = 180): Chunk[] {
  const sentences = splitSentences(doc.content);
  const chunks: Chunk[] = [];
  let current: string[] = [];
  let currentTokens = 0;
  let idx = 0;

  for (const sentence of sentences) {
    const tokens = roughTokens(sentence);
    if (currentTokens + tokens > maxTokens && current.length > 0) {
      const text = current.join(' ');
      chunks.push({
        id: chunkId(doc.id, 'sent', idx++),
        text,
        docId: doc.id,
        docTitle: doc.title,
        section: doc.section,
        strategy: 'sentence',
        metadata: { ...doc.metadata, chunkStrategy: 'sentence' },
        tokenCount: roughTokens(text),
      });
      // Carry last sentence as overlap
      current = [current[current.length - 1] ?? ''];
      currentTokens = roughTokens(current[0] ?? '');
    }
    current.push(sentence);
    currentTokens += tokens;
  }

  if (current.length > 0) {
    const text = current.join(' ');
    chunks.push({
      id: chunkId(doc.id, 'sent', idx),
      text,
      docId: doc.id,
      docTitle: doc.title,
      section: doc.section,
      strategy: 'sentence',
      metadata: { ...doc.metadata, chunkStrategy: 'sentence' },
      tokenCount: roughTokens(text),
    });
  }

  return chunks;
}

/* ================================================================
   3. SEMANTIC CHUNKING
   (No embedding at index time — uses lexical similarity proxy
    via shared keyword overlap as a fast stand-in.
    True semantic chunking requires calling the embedding API
    for each sentence pair — too slow for startup.
    The retrieval layer handles semantic matching at query time.)
   ================================================================ */
function semanticChunk(doc: CorpusDocument, similarityThreshold = 0.35): Chunk[] {
  const sentences = splitSentences(doc.content);
  if (sentences.length === 0) return [];

  /** Jaccard similarity on word sets */
  function lexicalSim(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
    const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
    const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union === 0 ? 0 : intersection / union;
  }

  const chunks: Chunk[] = [];
  let current: string[] = [sentences[0]!];
  let idx = 0;

  for (let i = 1; i < sentences.length; i++) {
    const sim = lexicalSim(sentences[i - 1]!, sentences[i]!);
    if (sim < similarityThreshold && current.length >= 2) {
      const text = current.join(' ');
      chunks.push({
        id: chunkId(doc.id, 'sem', idx++),
        text,
        docId: doc.id,
        docTitle: doc.title,
        section: doc.section,
        strategy: 'semantic',
        metadata: { ...doc.metadata, chunkStrategy: 'semantic' },
        tokenCount: roughTokens(text),
      });
      current = [sentences[i]!];
    } else {
      current.push(sentences[i]!);
    }
  }

  if (current.length > 0) {
    const text = current.join(' ');
    chunks.push({
      id: chunkId(doc.id, 'sem', idx),
      text,
      docId: doc.id,
      docTitle: doc.title,
      section: doc.section,
      strategy: 'semantic',
      metadata: { ...doc.metadata, chunkStrategy: 'semantic' },
      tokenCount: roughTokens(text),
    });
  }

  return chunks;
}

/* ================================================================
   4. METADATA-AWARE CHUNKING
   Produces one chunk per logical section, annotated with full path.
   ================================================================ */
function metadataAwareChunk(doc: CorpusDocument): Chunk[] {
  // One chunk per document section — the corpus already has sections
  // For larger corpora this would parse headings from markdown/HTML
  const text = `[${doc.title} — ${doc.section}]\n\n${doc.content}`;
  return [
    {
      id: chunkId(doc.id, 'meta', 0),
      text,
      docId: doc.id,
      docTitle: doc.title,
      section: doc.section,
      strategy: 'metadata_aware',
      metadata: {
        ...doc.metadata,
        chunkStrategy: 'metadata_aware',
        sectionPath: `${doc.title} > ${doc.section}`,
      },
      tokenCount: roughTokens(text),
    },
  ];
}

/* ================================================================
   5. HIERARCHICAL CHUNKING (Parent + Child)
   Children are small (≈100 tokens) for precise retrieval.
   Parents are the full section for context-rich generation.
   ================================================================ */
function hierarchicalChunk(doc: CorpusDocument): Chunk[] {
  const parentText = doc.content;
  const parentId = chunkId(doc.id, 'hier_p', 0);

  const parent: Chunk = {
    id: parentId,
    text: parentText,
    docId: doc.id,
    docTitle: doc.title,
    section: doc.section,
    strategy: 'hierarchical_parent',
    metadata: { ...doc.metadata, chunkStrategy: 'hierarchical_parent' },
    tokenCount: roughTokens(parentText),
  };

  // Create smaller child chunks (~100 tokens each)
  const words = parentText.split(/\s+/);
  const childSize = Math.floor(100 / 1.3); // ~77 words
  const children: Chunk[] = [];
  let i = 0;
  let idx = 0;

  while (i < words.length) {
    const end = Math.min(i + childSize, words.length);
    const text = words.slice(i, end).join(' ');
    children.push({
      id: chunkId(doc.id, 'hier_c', idx++),
      text,
      docId: doc.id,
      docTitle: doc.title,
      section: doc.section,
      strategy: 'hierarchical_child',
      metadata: { ...doc.metadata, chunkStrategy: 'hierarchical_child' },
      parentId,
      tokenCount: roughTokens(text),
    });
    i = end;
  }

  return [parent, ...children];
}

/* ================================================================
   MAIN: chunk all documents
   ================================================================ */
export function chunkCorpus(docs: CorpusDocument[]): Chunk[] {
  const all: Chunk[] = [];

  for (const doc of docs) {
    // Apply all five strategies — deduplicate at retrieval time
    all.push(...fixedSizeChunk(doc));
    all.push(...sentenceChunk(doc));
    all.push(...semanticChunk(doc));
    all.push(...metadataAwareChunk(doc));
    all.push(...hierarchicalChunk(doc));
  }

  return all;
}

/** Get retrieval-eligible chunks (exclude hierarchical_parent — too large) */
export function getRetrievalChunks(chunks: Chunk[]): Chunk[] {
  return chunks.filter((c) => c.strategy !== 'hierarchical_parent');
}

/** Resolve a hierarchical_child to its parent chunk */
export function resolveParent(
  chunk: Chunk,
  allChunks: Chunk[]
): Chunk | undefined {
  if (!chunk.parentId) return undefined;
  return allChunks.find((c) => c.id === chunk.parentId);
}
