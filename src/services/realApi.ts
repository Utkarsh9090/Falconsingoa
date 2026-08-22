/**
 * Real API Service
 *
 * Connects to Next.js API Routes.
 */

import type { APIService } from './api';
import type { RAGResponse, SystemStatusData, PipelineMetrics } from '../types';

let lastSttMs: number | undefined = undefined;

export const realAPI: APIService = {
  async synthesizeSpeech(text: string): Promise<string> {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      throw new Error(`TTS failed with status ${res.status}`);
    }
    const data = await res.json();
    return data.audioBase64;
  },

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('audio', audioBlob);

    const res = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `STT failed with status ${res.status}`);
    }

    const data = await res.json();
    lastSttMs = data.sttMs;
    return data.transcript;
  },

  async queryRAG(query: string): Promise<RAGResponse> {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, sttMs: lastSttMs }),
    });

    if (!res.ok) {
      throw new Error(`RAG query failed with status ${res.status}`);
    }

    lastSttMs = undefined; // reset
    return res.json();
  },

  async getSystemStatus(): Promise<SystemStatusData> {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('Status failed');
    return res.json();
  },

  async getPipelineMetrics(): Promise<PipelineMetrics> {
    const res = await fetch('/api/metrics');
    if (!res.ok) throw new Error('Metrics failed');
    return res.json();
  },
};
