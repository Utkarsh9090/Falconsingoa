import { NextRequest, NextResponse } from 'next/server';

const SARVAM_TTS = 'https://api.sarvam.ai/text-to-speech';

export async function POST(req: NextRequest) {
  const apiKey = process.env.SARVAM;
  if (!apiKey) {
    return NextResponse.json({ error: 'SARVAM API key not configured' }, { status: 500 });
  }

  let body: { text?: string; speaker?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { text, speaker = 'shubh' } = body;
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid text' }, { status: 400 });
  }

  try {
    // Truncate to avoid limit issues if answer is too long.
    const safeText = text.substring(0, 500);
    const res = await fetch(SARVAM_TTS, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: safeText, // curl example expects this
        language_code: 'en-IN',
        speaker: speaker,
        model: 'bulbul:v3'
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[TTS] Sarvam error:', res.status, errText);
      return NextResponse.json(
        { error: `Sarvam TTS failed: ${res.status}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    // The response contains { audios: [ "base64..." ] }
    if (!json.audios || !json.audios[0]) {
      return NextResponse.json(
        { error: 'No audio returned from Sarvam' },
        { status: 502 }
      );
    }

    return NextResponse.json({ audioBase64: json.audios[0] });
  } catch (err) {
    console.error('[TTS] Unexpected error:', err);
    return NextResponse.json({ error: 'Text-to-speech service unavailable' }, { status: 503 });
  }
}
