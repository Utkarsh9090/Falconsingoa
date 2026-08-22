/**
 * useAppState — Central application state management
 *
 * Orchestrates the full query lifecycle:
 * IDLE → LISTENING → TRANSCRIBING → RETRIEVING → GENERATING → VERIFYING → ANSWER
 *
 * Also handles guardrail states (OFF_TOPIC, NO_CONTEXT, BLOCKED) and errors.
 *
 * Spectra optimization: Supports native STT path (no audio upload) and
 * maintains a conversation history for the split-panel UI.
 */

import { useState, useCallback, useRef } from 'react';
import {
  AppState,
  type RAGResponse,
  type PipelineMetrics,
  type PercentileMetrics,
  type SystemStatusData,
  type AppError,
  type Source,
  type GroundingStatus,
} from '../types/index';
import { api } from '../services/api';
import type { ConversationTurn } from '../components/ConversationPanels';

export interface AppStateHook {
  /* Core state */
  state: AppState;
  transcript: string;
  answer: string;
  sources: Source[];
  grounded: GroundingStatus | null;
  metrics: PipelineMetrics | null;
  percentiles: PercentileMetrics | null;
  systemStatus: SystemStatusData | null;
  error: AppError | null;

  /** All completed conversation turns (for ConversationPanels) */
  turns: ConversationTurn[];

  /* Actions */
  startListening: () => void;
  stopListening: (audioBlob: Blob) => void;
  setTranscript: (text: string) => void;
  submitQuery: (query: string) => void;
  reset: () => void;
  refreshSystemStatus: () => void;
}

export function useAppState(): AppStateHook {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [transcript, setTranscriptState] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [grounded, setGrounded] = useState<GroundingStatus | null>(null);
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [percentiles, setPercentiles] = useState<PercentileMetrics | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);

  const abortRef = useRef(false);
  /** Pending turn id waiting for an agent answer */
  const pendingTurnIdRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    abortRef.current = true;
    setState(AppState.IDLE);
    setTranscriptState('');
    setAnswer('');
    setSources([]);
    setGrounded(null);
    setMetrics(null);
    setPercentiles(null);
    setError(null);
    setTurns([]);
    pendingTurnIdRef.current = null;
    // Allow next operation after a tick
    setTimeout(() => { abortRef.current = false; }, 0);
  }, []);

  const startListening = useCallback(() => {
    abortRef.current = false;
    setState(AppState.LISTENING);
    setTranscriptState('');
    setAnswer('');
    setSources([]);
    setGrounded(null);
    setMetrics(null);
    setPercentiles(null);
    setError(null);
  }, []);

  const setTranscript = useCallback((text: string) => {
    setTranscriptState(text);
  }, []);

  const processResponse = useCallback((response: RAGResponse, queryText: string, turnId: string) => {
    if (abortRef.current) return;

    setMetrics(response.metrics);
    setPercentiles(response.percentiles);

    switch (response.guardrail) {
      case 'off_topic':
        setState(AppState.OFF_TOPIC);
        // Remove the pending turn (no answer to show)
        setTurns((prev) => prev.filter((t) => t.id !== turnId));
        break;
      case 'no_context':
        setState(AppState.NO_CONTEXT);
        setTurns((prev) => prev.filter((t) => t.id !== turnId));
        break;
      case 'blocked':
        setState(AppState.BLOCKED);
        setTurns((prev) => prev.filter((t) => t.id !== turnId));
        break;
      case 'pass': {
        setAnswer(response.answer);
        setSources(response.sources);
        setGrounded(response.grounded);
        setState(AppState.ANSWER);

        // Fill in the pending turn with the agent's answer
        setTurns((prev) =>
          prev.map((t) =>
            t.id === turnId
              ? {
                  ...t,
                  answer: response.answer,
                  sources: response.sources,
                  grounded: response.grounded,
                  metrics: response.metrics,
                }
              : t
          )
        );

        // TTS — fire-and-forget, non-blocking
        if (!abortRef.current && response.answer) {
          api.synthesizeSpeech(response.answer)
            .then((base64) => {
              if (abortRef.current) return;
              const audio = new Audio('data:audio/wav;base64,' + base64);
              audio.play().catch((err) => {
                console.warn('[TTS] Primary audio play failed, falling back to speechSynthesis:', err);
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  const utt = new SpeechSynthesisUtterance(response.answer.substring(0, 300));
                  // Prefer Indian English voices
                  const voices = window.speechSynthesis.getVoices();
                  const preferred = voices.find(
                    (v) => v.lang.startsWith('en-IN') || v.name.toLowerCase().includes('india')
                  );
                  if (preferred) utt.voice = preferred;
                  utt.rate = 0.95;
                  window.speechSynthesis.speak(utt);
                }
              });
            })
            .catch((err) => {
              console.warn('[TTS] API fetch failed, falling back to speechSynthesis:', err);
              if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                const utt = new SpeechSynthesisUtterance(response.answer.substring(0, 300));
                const voices = window.speechSynthesis.getVoices();
                const preferred = voices.find(
                  (v) => v.lang.startsWith('en-IN') || v.name.toLowerCase().includes('india')
                );
                if (preferred) utt.voice = preferred;
                utt.rate = 0.95;
                window.speechSynthesis.speak(utt);
              }
            });
        }
        break;
      }
    }

    pendingTurnIdRef.current = null;
  }, []);

  /**
   * submitQuery — called by either:
   *   1. Native STT (isFinal text) — no audio upload needed
   *   2. Existing blob STT path (after transcribeAudio returns)
   */
  const submitQuery = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      abortRef.current = false;
      setTranscriptState(query);
      setState(AppState.RETRIEVING);
      setAnswer('');
      setSources([]);
      setGrounded(null);
      setMetrics(null);
      setPercentiles(null);
      setError(null);

      // Create a pending turn immediately so user panel shows the query
      const turnId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      pendingTurnIdRef.current = turnId;

      const pendingTurn: ConversationTurn = {
        id: turnId,
        query,
        answer: '', // will be filled in processResponse
        sources: [],
        grounded: null,
        metrics: null,
        timestamp: Date.now(),
      };
      setTurns((prev) => [...prev, pendingTurn]);

      try {
        const response = await api.queryRAG(query);
        if (abortRef.current) return;

        setState(AppState.GENERATING);
        await new Promise((r) => setTimeout(r, 200));
        if (abortRef.current) return;

        setState(AppState.VERIFYING);
        await new Promise((r) => setTimeout(r, 300));
        if (abortRef.current) return;

        processResponse(response, query, turnId);
      } catch {
        if (abortRef.current) return;
        setTurns((prev) => prev.filter((t) => t.id !== turnId));
        setError({ type: 'backend_unavailable', message: 'The knowledge base is unavailable' });
        setState(AppState.ERROR);
      }
    },
    [processResponse]
  );

  const stopListening = useCallback(
    async (audioBlob: Blob) => {
      try {
        setState(AppState.TRANSCRIBING);

        const text = await api.transcribeAudio(audioBlob);
        if (abortRef.current) return;

        // Once we have the transcript, use the shared submitQuery path
        await submitQuery(text);
      } catch {
        if (abortRef.current) return;
        setError({ type: 'stt_failed', message: "Couldn't process the audio" });
        setState(AppState.ERROR);
      }
    },
    [submitQuery]
  );

  const refreshSystemStatus = useCallback(async () => {
    try {
      const status = await api.getSystemStatus();
      setSystemStatus(status);
    } catch {
      setSystemStatus({
        system: 'offline',
        stt: 'unknown',
        retrieval: 'unknown',
        generation: 'unknown',
        guardrails: 'unknown',
      });
    }
  }, []);

  return {
    state,
    transcript,
    answer,
    sources,
    grounded,
    metrics,
    percentiles,
    systemStatus,
    error,
    turns,
    startListening,
    stopListening,
    setTranscript,
    submitQuery,
    reset,
    refreshSystemStatus,
  };
}
