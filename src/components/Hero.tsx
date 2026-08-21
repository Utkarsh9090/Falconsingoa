import { motion } from 'framer-motion';
import { VoiceInterface } from './VoiceInterface';
import { Transcript } from './Transcript';
import { ProcessingPipeline } from './ProcessingPipeline';
import { GoaHindiLogo, HackerHouseLogo, FalconsLogo } from './BrandLogos';
import { AppState } from '../types/index';
import type { AudioVisualizerHook } from '../hooks/useAudioVisualizer';

interface HeroProps {
  state: AppState;
  transcript: string;
  audio: AudioVisualizerHook;
  onStartListening: () => void;
  onStopListening: (audioBlob: Blob) => void;
  onError: (type: 'mic_permission', message: string) => void;
}

export function Hero({
  state,
  transcript,
  audio,
  onStartListening,
  onStopListening,
  onError,
}: HeroProps) {
  const showHeadline = state === AppState.IDLE;

  return (
    <section className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
      {/* Subtle radial glow behind content */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(255,212,0,0.03) 0%, transparent 70%)',
        }}
      />

      {/* Atmospheric Goa Hindi SVG Watermark in background */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.025] select-none">
        <GoaHindiLogo className="w-[480px] h-[480px] text-accent" />
      </div>

      {/* Top Brand Pill (HH GOA 2026 x FALCONS) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8 flex items-center gap-3 rounded-full border border-border/80 bg-bg-secondary/80 px-3.5 py-1.5 backdrop-blur-sm"
      >
        <HackerHouseLogo className="h-3 w-auto text-accent" />
        <span className="text-[9px] font-mono tracking-[0.2em] text-text-secondary uppercase">
          HH Goa 2026
        </span>
        <span className="h-2.5 w-px bg-border" />
        <FalconsLogo className="h-2.5 w-auto text-text-tertiary" />
        <span className="text-[9px] font-mono tracking-[0.15em] text-text-tertiary">
          TASK 02
        </span>
      </motion.div>

      {/* Headline — visible in IDLE, fades when active */}
      <motion.div
        className="mb-10 text-center relative z-10"
        animate={{
          opacity: showHeadline ? 1 : 0,
          y: showHeadline ? 0 : -20,
          height: showHeadline ? 'auto' : 0,
        }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center gap-3 mb-3"
        >
          <GoaHindiLogo className="h-7 w-auto text-accent opacity-90" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl font-light tracking-tight text-text-primary sm:text-4xl md:text-5xl"
        >
          Ask the knowledge base.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-3 text-sm text-text-secondary md:text-base max-w-md mx-auto font-light"
        >
          Speak naturally. Get grounded answers.
        </motion.p>
      </motion.div>

      {/* Voice Interface */}
      <VoiceInterface
        state={state}
        audio={audio}
        onStartListening={onStartListening}
        onStopListening={onStopListening}
        onError={onError}
      />

      {/* Technical descriptor */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="mt-6"
      >
        <span className="text-[9px] font-mono tracking-[0.2em] text-text-tertiary">
          VOICE-ENABLED RETRIEVAL AUGMENTED GENERATION
        </span>
      </motion.div>

      {/* Transcript */}
      <Transcript state={state} text={transcript} />

      {/* Processing Pipeline */}
      <ProcessingPipeline state={state} />
    </section>
  );
}
