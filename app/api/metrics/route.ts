/**
 * GET /api/metrics
 *
 * Returns average metrics across the rolling latency window.
 * Matches the PipelineMetrics type.
 */

import { NextResponse } from 'next/server';
import { getAverageMetrics } from '@/lib/rag/latencyStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const avg = getAverageMetrics();

  if (!avg) {
    // If no queries yet, return nulls
    return NextResponse.json({
      stt: null,
      retrieval: null,
      reranking: null,
      generation: null,
      grounding: null,
      total: null,
    });
  }

  return NextResponse.json(avg);
}
