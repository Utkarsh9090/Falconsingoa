'use client';

/**
 * VoiceInterface — Spectra-optimized mic button
 *
 * Detection order:
 *  1. window.SpeechRecognition / webkitSpeechRecognition → native STT path
 *     - Interim words appear live inside the button ring
 *     - isFinal text goes straight to submitQuery (no blob upload)
 *  2. Fallback → existing MediaRecorder blob path (Firefox/Safari)
 */

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { AppState } from '../types/index';
import { AudioVisualizer } from './AudioVisualizer';
import type { AudioVisualizerHook } from '../hooks/useAudioVisualizer';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface VoiceInterfaceProps {
  state: AppState;
  audio: AudioVisualizerHook;
  onStartListening: () => void;
  /** Blob-based stop (fallback path) */
  onStopListening: (audioBlob: Blob) => void;
  /** Native STT final text (primary path) */
  onFinalTranscript: (text: string) => void;
  /** Live interim text from native STT */
  onInterimTranscript: (text: string) => void;
  onError: (type: 'mic_permission', message: string) => void;
}

export function VoiceInterface({
  state,
  audio,
  onStartListening,
  onStopListening,
  onFinalTranscript,
  onInterimTranscript,
  onError,
}: VoiceInterfaceProps) {
  const nativeSTT = useSpeechRecognition();

  const isListening = state === AppState.LISTENING;
  const isProcessing =
    state === AppState.TRANSCRIBING ||
    state === AppState.RETRIEVING ||
    state === AppState.GENERATING ||
    state === AppState.VERIFYING;
  const isIdle = state === AppState.IDLE;
  const canInteract =
    isIdle ||
    state === AppState.ANSWER ||
    state === AppState.ERROR ||
    state === AppState.OFF_TOPIC ||
    state === AppState.NO_CONTEXT ||
    state === AppState.BLOCKED;

  const handleClick = useCallback(async () => {
    if (isListening) {
      if (nativeSTT.isSupported) {
        // Native path: stop recognition (onFinal already fired or will fire)
        nativeSTT.stop();
      } else {
        // Blob fallback path
        const blob = await audio.stopCapture();
        if (blob) onStopListening(blob);
      }
      return;
    }

    if (canInteract) {
      onStartListening();

      if (nativeSTT.isSupported) {
        // Native path: no mic capture needed, browser handles audio
        nativeSTT.start(
          (finalText) => {
            // isFinal → stop listening to prevent echo, then trigger the RAG pipeline
            nativeSTT.stop();
            onFinalTranscript(finalText);
          },
          (interimText) => {
            // Live interim → update UI
            onInterimTranscript(interimText);
          }
        );
      } else {
        // Blob fallback: request mic access
        const stream = await audio.startCapture();
        if (!stream) {
          onError('mic_permission', audio.micError ?? 'Microphone access was denied');
        }
      }
    }
  }, [
    isListening,
    canInteract,
    nativeSTT,
    audio,
    onStartListening,
    onStopListening,
    onFinalTranscript,
    onInterimTranscript,
    onError,
  ]);

  // Status label — show interim text if available, otherwise standard labels
  const statusLabel = (() => {
    if (state === AppState.LISTENING) {
      if (nativeSTT.interim) return nativeSTT.interim.slice(0, 40) + (nativeSTT.interim.length > 40 ? '…' : '');
      return 'LISTENING';
    }
    switch (state) {
      case AppState.TRANSCRIBING: return 'TRANSCRIBING';
      case AppState.RETRIEVING: return 'RETRIEVING';
      case AppState.GENERATING: return 'GENERATING';
      case AppState.VERIFYING: return 'VERIFYING';
      default: return nativeSTT.isSupported ? 'TAP TO SPEAK' : 'TAP TO RECORD';
    }
  })();

  const showInterim = isListening && !!nativeSTT.interim;

  return (
    <div className="flex flex-col items-center">
      {/* Mic button container */}
      <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
        {/* Ambient glow (idle) */}
        {!isListening && !isProcessing && (
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 160,
              height: 160,
              background: 'radial-gradient(circle, rgba(255,212,0,0.06) 0%, transparent 70%)',
            }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Audio visualizer ring (listening — blob fallback path) */}
        {!nativeSTT.isSupported && (
          <AudioVisualizer
            frequencyData={audio.frequencyData}
            amplitude={audio.amplitude}
            isActive={isListening}
          />
        )}

        {/* Native STT listening ring */}
        {nativeSTT.isSupported && isListening && (
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 160,
              height: 160,
              border: '1px solid rgba(255,212,0,0.35)',
              boxShadow: '0 0 40px rgba(255,212,0,0.1)',
            }}
            animate={{ scale: [1, 1.06, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Processing pulse ring */}
        {isProcessing && (
          <motion.div
            className="absolute rounded-full border border-accent/20"
            style={{ width: 140, height: 140 }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* The actual button */}
        <motion.button
          id="voice-mic-button"
          onClick={handleClick}
          disabled={isProcessing}
          aria-label={isListening ? 'Stop listening' : 'Start speaking'}
          className={`relative z-10 flex h-[120px] w-[120px] items-center justify-center rounded-full border transition-all duration-500 ${
            isListening
              ? 'border-accent/50 bg-accent/10'
              : isProcessing
              ? 'border-border bg-bg-tertiary cursor-not-allowed'
              : 'border-border bg-bg-secondary hover:border-accent/30 hover:bg-bg-tertiary cursor-pointer'
          }`}
          whileHover={canInteract ? { scale: 1.04 } : undefined}
          whileTap={canInteract ? { scale: 0.96 } : undefined}
        >
          {isListening ? (
            /* Stop icon */
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="h-6 w-6 rounded-sm bg-accent"
            />
          ) : isProcessing ? (
            /* Processing spinner */
            <motion.div
              className="h-6 w-6 rounded-full border-2 border-accent/20 border-t-accent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            /* Microphone icon */
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-primary"
            >
              <rect x="9" y="1" width="6" height="13" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1="12" y1="17" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          )}
        </motion.button>
      </div>

      {/* Status label / live interim text */}
      <motion.div
        key={showInterim ? 'interim' : statusLabel}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-4 text-center px-4"
        style={{ maxWidth: 280 }}
      >
        <span
          className={`font-mono ${showInterim ? 'text-xs text-text-secondary leading-relaxed' : 'text-[11px] tracking-[0.25em]'} ${
            isListening ? 'text-accent' : isProcessing ? 'text-text-secondary' : 'text-text-tertiary'
          }`}
        >
          {statusLabel}
          {isListening && (
            <motion.span
              className="inline-block w-0.5 h-3 bg-accent ml-0.5 align-middle"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.7, repeat: Infinity }}
            />
          )}
        </span>
      </motion.div>

      {/* STT method indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-2"
      >
        <span className="text-[9px] font-mono tracking-[0.15em] text-text-tertiary opacity-40">
          {nativeSTT.isSupported ? 'NATIVE STT' : 'CLOUD STT'}
        </span>
      </motion.div>
    </div>
  );
}
