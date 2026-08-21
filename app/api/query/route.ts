/**
 * POST /api/query
 *
 * Accepts: JSON { query: string, sttMs?: number }
 * Returns: RAGResponse object
 *
 * Invokes the full RAG pipeline harness.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runPipeline } from '@/lib/rag/harness';

export async function POST(req: NextRequest) {
  const apiKey = process.env.SARVAM;
  if (!apiKey) {
    return NextResponse.json({ error: 'SARVAM API key not configured' }, { status: 500 });
  }

  let body: { query?: string; sttMs?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { query, sttMs } = body;
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid query string' }, { status: 400 });
  }

  try {
    const response = await runPipeline(query, apiKey, sttMs);
    return NextResponse.json(response);
  } catch (err) {
    console.error('[RAG] Pipeline error:', err);
    return NextResponse.json(
      { error: 'Internal pipeline error' },
      { status: 500 }
    );
  }
}
