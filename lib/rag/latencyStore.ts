/**
 * Latency Store
 *
 * Rolling window of the last 100 query latencies.
 * Used to compute P50 / P70 / P100 percentiles.
 */

export interface LatencyRecord {
  total: number;
  stt: number | null;
  retrieval: number;
  reranking: number;
  generation: number;
  grounding: number;
  timestamp: number;
}

const MAX_RECORDS = 100;
const records: LatencyRecord[] = [];

export function recordLatency(r: LatencyRecord): void {
  records.push(r);
  if (records.length > MAX_RECORDS) {
    records.shift(); // maintain rolling window
  }
}

export interface PercentileMetrics {
  p50: number | null;
  p70: number | null;
  p100: number | null;
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(
    Math.ceil((p / 100) * sorted.length) - 1,
    sorted.length - 1
  );
  return Math.round(sorted[Math.max(0, idx)]!);
}

export function getPercentiles(): PercentileMetrics {
  if (records.length === 0) {
    return { p50: null, p70: null, p100: null };
  }
  const totals = records.map((r) => r.total).sort((a, b) => a - b);
  return {
    p50: percentile(totals, 50),
    p70: percentile(totals, 70),
    p100: percentile(totals, 100),
  };
}

export function getAverageMetrics(): Omit<LatencyRecord, 'timestamp'> | null {
  if (records.length === 0) return null;
  const avg = (key: keyof Omit<LatencyRecord, 'timestamp' | 'stt'>) =>
    Math.round(records.reduce((s, r) => s + r[key], 0) / records.length);
  return {
    total: avg('total'),
    stt: null,
    retrieval: avg('retrieval'),
    reranking: avg('reranking'),
    generation: avg('generation'),
    grounding: avg('grounding'),
  };
}
