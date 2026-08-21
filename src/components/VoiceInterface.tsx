import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { AppState } from '../types/index';
import { AudioVisualizer } from './AudioVisualizer';
import type { AudioVisualizerHook } from '../hooks/useAudioVisualizer';

interface VoiceInterfaceProps {
  state: AppState;
  audio: AudioVisualizerHook;
  onStartListening: () => void;
  onStopListening: (audioBlob: Blob) => void;
  onError: (type: 'mic_permission', message: string) => void;
}

export function VoiceInterface({
  state,
  audio,
  onStartListening,
  onStopListening,
  onError,
}: VoiceInterfaceProps) {
  const isListening = state === AppState.LISTENING;
  const isProcessing =
    state === AppState.TRANSCRIBING ||
    state === AppState.RETRIEVING ||
    state === AppState.GENERATING ||
    state === AppState.VERIFYING;
  const isIdle = state === AppState.IDLE;
  const canInteract = isIdle || state === AppState.ANSWER || state === AppState.ERROR ||
    state === AppState.OFF_TOPIC || state === AppState.NO_CONTEXT || state === AppState.BLOCKED;

  const handleClick = useCallback(async () => {
    if (isListening) {
      // Stop listening
      const blob = audio.stopCapture();
      if (blob) {
        onStopListening(blob);
      }
      return;
    }

    if (canInteract) {
      // Start listening
      const stream = await audio.startCapture();
      if (!stream) {
        onError('mic_permission', audio.micError ?? 'Microphone access was denied');
        return;
      }
      onStartListening();
    }
  }, [isListening, canInteract, audio, onStartListening, onStopListening, onError]);

  // Status label
  const statusLabel = (() => {
    switch (state) {
      case AppState.LISTENING: return 'LISTENING';
      case AppState.TRANSCRIBING: return 'TRANSCRIBING';
      case AppState.RETRIEVING: return 'RETRIEVING';
      case AppState.GENERATING: return 'GENERATING';
      case AppState.VERIFYING: return 'VERIFYING';
      default: return 'TAP TO SPEAK';
    }
  })();

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
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Audio visualizer ring (listening) */}
        <AudioVisualizer
          frequencyData={audio.frequencyData}
          amplitude={audio.amplitude}
          isActive={isListening}
        />

        {/* Processing pulse ring */}
        {isProcessing && (
          <motion.div
            className="absolute rounded-full border border-accent/20"
            style={{ width: 140, height: 140 }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* The actual button */}
        <motion.button
          onClick={handleClick}
          disabled={isProcessing}
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

      {/* Status label */}
      <motion.div
        key={statusLabel}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-4"
      >
        <span
          className={`text-[11px] font-mono tracking-[0.25em] ${
            isListening ? 'text-accent' : isProcessing ? 'text-text-secondary' : 'text-text-tertiary'
          }`}
        >
          {statusLabel}
        </span>
      </motion.div>
    </div>
  );
}
