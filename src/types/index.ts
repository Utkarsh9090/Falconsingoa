/* ===================================================================
   APP STATE
   =================================================================== */

/** All possible application states */
export const AppState = {
  IDLE: 'IDLE',
  LISTENING: 'LISTENING',
  TRANSCRIBING: 'TRANSCRIBING',
  RETRIEVING: 'RETRIEVING',
  GENERATING: 'GENERATING',
  VERIFYING: 'VERIFYING',
  ANSWER: 'ANSWER',
  NO_CONTEXT: 'NO_CONTEXT',
  OFF_TOPIC: 'OFF_TOPIC',
  BLOCKED: 'BLOCKED',
  ERROR: 'ERROR',
} as const;
export type AppState = (typeof AppState)[keyof typeof AppState];

/** Pipeline processing stages (subset of AppState for the pipeline UI) */
export const PipelineStage = {
  SPEECH: 'SPEECH',
  RETRIEVE: 'RETRIEVE',
  GENERATE: 'GENERATE',
  VERIFY: 'VERIFY',
} as const;
export type PipelineStage = (typeof PipelineStage)[keyof typeof PipelineStage];

/** Status of an individual pipeline stage */
export type StageStatus = 'pending' | 'active' | 'done' | 'error';

/* ===================================================================
   SERVICE STATUS
   =================================================================== */

export type ServiceHealth = 'online' | 'busy' | 'offline' | 'unknown';

export interface SystemStatusData {
  system: ServiceHealth;
  stt: ServiceHealth;
  retrieval: ServiceHealth;
  generation: ServiceHealth;
  guardrails: ServiceHealth;
}

/* ===================================================================
   PIPELINE METRICS
   =================================================================== */

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

/* ===================================================================
   RAG RESPONSE
   =================================================================== */

export interface Source {
  id: string;
  content: string;
  relevanceScore: number;
  metadata?: Record<string, string>;
}

export type GroundingStatus = 'grounded' | 'partial' | 'ungrounded';

export type GuardrailResult = 'pass' | 'off_topic' | 'no_context' | 'blocked';

export interface RAGResponse {
  answer: string;
  sources: Source[];
  grounded: GroundingStatus;
  guardrail: GuardrailResult;
  metrics: PipelineMetrics;
  percentiles: PercentileMetrics;
}

/* ===================================================================
   ERROR
   =================================================================== */

export type ErrorType =
  | 'mic_permission'
  | 'stt_failed'
  | 'backend_unavailable'
  | 'unknown';

export interface AppError {
  type: ErrorType;
  message: string;
}
