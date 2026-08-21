/**
 * useAppState — Central application state management
 *
 * Orchestrates the full query lifecycle:
 * IDLE → LISTENING → TRANSCRIBING → RETRIEVING → GENERATING → VERIFYING → ANSWER
 *
 * Also handles guardrail states (OFF_TOPIC, NO_CONTEXT, BLOCKED) and errors.
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

  const abortRef = useRef(false);

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

  const processResponse = useCallback((response: RAGResponse) => {
    if (abortRef.current) return;

    setMetrics(response.metrics);
    setPercentiles(response.percentiles);

    switch (response.guardrail) {
      case 'off_topic':
        setState(AppState.OFF_TOPIC);
        break;
      case 'no_context':
        setState(AppState.NO_CONTEXT);
        break;
      case 'blocked':
        setState(AppState.BLOCKED);
        break;
      case 'pass':
        setAnswer(response.answer);
        setSources(response.sources);
        setGrounded(response.grounded);
        setState(AppState.ANSWER);
        break;
    }
  }, []);

  const stopListening = useCallback(
    async (audioBlob: Blob) => {
      try {
        setState(AppState.TRANSCRIBING);

        const text = await api.transcribeAudio(audioBlob);
        if (abortRef.current) return;

        setTranscriptState(text);
        setState(AppState.RETRIEVING);

        // Simulate stage transitions with real timing from the API
        const startTime = Date.now();
        const response = await api.queryRAG(text);
        if (abortRef.current) return;

        // Brief pause at GENERATING state for visual effect
        setState(AppState.GENERATING);
        await new Promise((r) => setTimeout(r, 200));
        if (abortRef.current) return;

        setState(AppState.VERIFYING);
        await new Promise((r) => setTimeout(r, 300));
        if (abortRef.current) return;

        // Remove fake delay logic - backend sets real STT times

        processResponse(response);
      } catch {
        if (abortRef.current) return;
        setError({ type: 'stt_failed', message: "Couldn't process the audio" });
        setState(AppState.ERROR);
      }
    },
    [processResponse]
  );

  const submitQuery = useCallback(
    async (query: string) => {
      try {
        abortRef.current = false;
        setTranscriptState(query);
        setState(AppState.RETRIEVING);
        setAnswer('');
        setSources([]);
        setGrounded(null);
        setMetrics(null);
        setPercentiles(null);
        setError(null);

        const response = await api.queryRAG(query);
        if (abortRef.current) return;

        setState(AppState.GENERATING);
        await new Promise((r) => setTimeout(r, 200));
        if (abortRef.current) return;

        setState(AppState.VERIFYING);
        await new Promise((r) => setTimeout(r, 300));
        if (abortRef.current) return;

        processResponse(response);
      } catch {
        if (abortRef.current) return;
        setError({
          type: 'backend_unavailable',
          message: 'The knowledge base is unavailable',
        });
        setState(AppState.ERROR);
      }
    },
    [processResponse]
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
    startListening,
    stopListening,
    setTranscript,
    submitQuery,
    reset,
    refreshSystemStatus,
  };
}
