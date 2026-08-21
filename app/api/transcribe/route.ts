/**
 * POST /api/transcribe
 *
 * Accepts: multipart/form-data with `audio` file
 * Returns: { transcript: string; sttMs: number }
 *
 * Uses Sarvam Saaras v2 for speech-to-text.
 */

import { NextRequest, NextResponse } from 'next/server';

const SARVAM_STT = 'https://api.sarvam.ai/v1/speech-to-text';

export async function POST(req: NextRequest) {
  const apiKey = process.env.SARVAM;
  if (!apiKey) {
    return NextResponse.json({ error: 'SARVAM API key not configured' }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const audioFile = formData.get('audio') as File | null;
  if (!audioFile) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
  }

  const t0 = Date.now();

  try {
    // Forward to Sarvam STT
    const sarvamForm = new FormData();
    sarvamForm.append('file', audioFile, 'audio.webm');
    sarvamForm.append('model', 'saaras:v2');

    const res = await fetch(SARVAM_STT, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
      },
      body: sarvamForm,
    });

    const sttMs = Date.now() - t0;

    if (!res.ok) {
      const errText = await res.text();
      console.error('[STT] Sarvam error:', res.status, errText);
      return NextResponse.json(
        { error: `Sarvam STT failed: ${res.status}` },
        { status: 502 }
      );
    }

    const json = (await res.json()) as { transcript?: string };
    const transcript = json.transcript?.trim() ?? '';

    if (!transcript) {
      return NextResponse.json(
        { error: 'No speech detected in audio' },
        { status: 422 }
      );
    }

    return NextResponse.json({ transcript, sttMs });
  } catch (err) {
    console.error('[STT] Unexpected error:', err);
    return NextResponse.json({ error: 'Speech-to-text service unavailable' }, { status: 503 });
  }
}
