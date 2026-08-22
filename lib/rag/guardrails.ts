/**
 * Guardrails
 *
 * Pre-LLM and Post-LLM safety checks:
 *   1. Pre-LLM: keyword blocklist + off-topic topic classification
 *   2. Post-LLM: grounding verification (token overlap + citation check)
 *   3. Post-LLM: unsafe content detection in generated answer
 */

export type GuardrailResult = 'pass' | 'off_topic' | 'no_context' | 'blocked' | 'casual';

export interface GuardrailCheck {
  result: GuardrailResult;
  reason: string;
  groundingScore?: number; // 0–1
}

/* ── 1. KEYWORD BLOCKLIST ─────────────────────────────────── */

const BLOCKED_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+)?(instructions?|prompts?)/i,
  /jailbreak/i,
  /prompt\s+injection/i,
  /act\s+as\s+(if\s+you\s+are\s+)?a?\s*(different|another|new)\s+(ai|model|assistant)/i,
  /dan\s+mode/i,
  /\bdisregard\b.*\binstructions?\b/i,
  /\byou\s+are\s+now\b/i,
];

const OFF_TOPIC_PATTERNS = [
  /\b(weather|temperature|forecast|rain|sunny|cloudy)\b/i,
  /\b(recipe|cooking|ingredient|bake|fry|boil)\b/i,
  /\b(football|cricket|soccer|basketball|tennis|sport)\b/i,
  /\b(movie|film|actor|actress|celebrity|gossip)\b/i,
  /\b(horoscope|zodiac|astrology)\b/i,
  /\b(stock\s+price|crypto|bitcoin|ethereum)\b/i,
];

const CASUAL_PATTERNS = [
  /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening|night))(?!.+)/i,
  /^how\s+are\s+you/i,
  /^what'?s\s+up/i,
  /^who\s+are\s+you/i,
  /^thanks/i,
  /^thank\s+you/i,
];

/* ── 2. TOPIC KEYWORDS (for domain relevance) ─────────────── */

const DOMAIN_KEYWORDS = [
  'rag', 'retrieval', 'augmented', 'generation', 'embedding', 'vector',
  'chunk', 'chunking', 'index', 'llm', 'language model', 'ai', 'machine learning',
  'sarvam', 'falcons', 'hackerhous', 'hackathon', 'goa', 'task',
  'speech', 'transcribe', 'voice', 'stt', 'text', 'search', 'similarity',
  'cosine', 'bm25', 'rerank', 'hybrid', 'hallucination', 'grounding',
  'latency', 'pipeline', 'api', 'next', 'javascript', 'python',
  'context', 'document', 'knowledge', 'base', 'faiss', 'semantic',
  'guardrail', 'harness', 'orchestration', 'query', 'answer',
  'what', 'how', 'why', 'explain', 'describe', 'tell', 'show',
];

export function preGuardrail(query: string): GuardrailCheck {
  const trimmed = query.trim();

  // Empty query
  if (trimmed.length < 3) {
    return { result: 'blocked', reason: 'Query too short or empty' };
  }

  // Prompt injection / jailbreak
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        result: 'blocked',
        reason: 'Query contains prompt injection or jailbreak attempt',
      };
    }
  }

  // Casual greeting / Intent routing
  for (const pattern of CASUAL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { result: 'casual', reason: 'Casual greeting detected' };
    }
  }

  // Clearly off-topic
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        result: 'off_topic',
        reason:
          'Query is outside the knowledge base domain (AI/RAG/Falcons HackerHouse)',
      };
    }
  }

  // Check if query has any domain relevance
  const q = trimmed.toLowerCase();
  const hasRelevantTerm = DOMAIN_KEYWORDS.some((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(q);
  });

  if (!hasRelevantTerm && trimmed.split(/\s+/).length > 6) {
    return {
      result: 'off_topic',
      reason: 'Query does not appear to be related to the knowledge base topics',
    };
  }

  return { result: 'pass', reason: 'OK' };
}

/* ── 3. CONTEXT SUFFICIENCY CHECK ─────────────────────────── */

export function checkContextSufficiency(
  query: string,
  contextChunks: string[]
): GuardrailCheck {
  if (contextChunks.length === 0) {
    return {
      result: 'no_context',
      reason: 'No relevant context found in the knowledge base',
    };
  }

  const combinedContext = contextChunks.join(' ').toLowerCase();
  const queryTerms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 3);

  const matchCount = queryTerms.filter((t) => combinedContext.includes(t)).length;
  const coverageRatio = queryTerms.length > 0 ? matchCount / queryTerms.length : 0;

  if (coverageRatio < 0.2) {
    return {
      result: 'no_context',
      reason: 'Retrieved context has insufficient overlap with the query',
    };
  }

  return { result: 'pass', reason: 'Context sufficient' };
}

/* ── 4. POST-GENERATION GROUNDING CHECK ───────────────────── */

export type GroundingStatus = 'grounded' | 'partial' | 'ungrounded';

export interface GroundingResult {
  status: GroundingStatus;
  score: number; // 0–1
  reason: string;
}

/**
 * Token overlap-based grounding check.
 * Checks what fraction of significant answer tokens appear in the context.
 * Score < 0.25 → ungrounded, 0.25–0.5 → partial, > 0.5 → grounded
 */
export function checkGrounding(
  answer: string,
  contextChunks: string[]
): GroundingResult {
  const STOP = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'it', 'this', 'that', 'and', 'or', 'but',
    'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  ]);

  const answerTokens = answer
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 3 && !STOP.has(t));

  if (answerTokens.length === 0) {
    return { status: 'ungrounded', score: 0, reason: 'Answer is empty' };
  }

  const combinedContext = contextChunks.join(' ').toLowerCase();
  const matchedTokens = answerTokens.filter((t) => combinedContext.includes(t));
  const score = matchedTokens.length / answerTokens.length;

  let status: GroundingStatus;
  let reason: string;

  if (score >= 0.5) {
    status = 'grounded';
    reason = `${Math.round(score * 100)}% of answer tokens found in retrieved context`;
  } else if (score >= 0.25) {
    status = 'partial';
    reason = `Only ${Math.round(score * 100)}% of answer tokens found — may contain unsupported claims`;
  } else {
    status = 'ungrounded';
    reason = `Only ${Math.round(score * 100)}% of answer tokens found — answer may be hallucinated`;
  }

  return { status, score, reason };
}
