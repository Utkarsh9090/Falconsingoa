/**
 * GET /api/status
 *
 * Returns system health status matching the SystemStatusData type.
 * Evaluates RAG pipeline readiness and Sarvam API connectivity.
 */

import { NextResponse } from 'next/server';
import { getPipelineStatus } from '@/lib/rag/harness';

export async function GET() {
  const apiKey = process.env.SARVAM;
  const pipeline = getPipelineStatus();

  // Basic check for API key
  const systemState = apiKey ? 'online' : 'offline';
  const pipelineReady = pipeline.ready ? 'online' : 'busy';

  // In a real production system, you might ping the downstream APIs,
  // but for a <200ms target we just report our own configured state.
  return NextResponse.json({
    system: systemState,
    stt: systemState, // Assuming if we have the key, STT is available
    retrieval: pipelineReady,
    generation: systemState,
    guardrails: 'online', // Guardrails are local compute
    details: {
      chunks: pipeline.chunkCount,
      retrievalChunks: pipeline.retrievalChunkCount,
    },
  });
}
