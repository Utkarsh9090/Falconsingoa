import { motion, AnimatePresence } from 'framer-motion';
import type { AppError } from '../types/index';
import { AppState } from '../types/index';

interface ErrorStateProps {
  state: AppState;
  error: AppError | null;
  onRetry: () => void;
}

const GUARDRAIL_CONTENT: Record<string, { title: string; message: string; icon: string }> = {
  [AppState.OFF_TOPIC]: {
    title: 'OUTSIDE KNOWLEDGE SCOPE',
    message: "I couldn't find relevant information in the provided knowledge base.",
    icon: '⊘',
  },
  [AppState.NO_CONTEXT]: {
    title: 'NOT ENOUGH EVIDENCE',
    message: "I don't have enough grounded context to answer this reliably.",
    icon: '◇',
  },
  [AppState.BLOCKED]: {
    title: 'REQUEST BLOCKED',
    message: 'The request cannot be processed.',
    icon: '⊗',
  },
};

const ERROR_CONTENT: Record<string, { title: string; message: string }> = {
  mic_permission: {
    title: 'MICROPHONE ACCESS REQUIRED',
    message: 'Please allow microphone access to use voice input.',
  },
  stt_failed: {
    title: "COULDN'T HEAR THAT",
    message: 'Speech recognition failed. Please try again.',
  },
  backend_unavailable: {
    title: 'THE KNOWLEDGE BASE IS UNAVAILABLE',
    message: 'The backend service is not responding. Please try again later.',
  },
  unknown: {
    title: 'SOMETHING WENT WRONG',
    message: 'An unexpected error occurred.',
  },
};

export function ErrorState({ state, error, onRetry }: ErrorStateProps) {
  const isGuardrail = state === AppState.OFF_TOPIC || state === AppState.NO_CONTEXT || state === AppState.BLOCKED;
  const isError = state === AppState.ERROR;

  if (!isGuardrail && !isError) return null;

  const guardrail = isGuardrail ? GUARDRAIL_CONTENT[state] : null;
  const errorInfo = isError && error ? ERROR_CONTENT[error.type] ?? ERROR_CONTENT.unknown : null;

  const title = guardrail?.title ?? errorInfo?.title ?? 'ERROR';
  const message = guardrail?.message ?? errorInfo?.message ?? '';
  const icon = guardrail?.icon ?? '⚠';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto mt-12 max-w-xl px-6"
      >
        <div className="rounded-lg border border-border bg-bg-secondary p-8 text-center">
          {/* Icon */}
          <div className="mb-4 text-3xl text-accent opacity-60">{icon}</div>

          {/* Title */}
          <h3 className="mb-3 text-xs font-semibold tracking-[0.25em] text-text-primary">
            {title}
          </h3>

          {/* Message */}
          <p className="mb-6 text-sm leading-relaxed text-text-secondary">
            {message}
          </p>

          {/* Retry */}
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-[11px] font-mono tracking-[0.15em] text-text-secondary transition-all duration-300 hover:border-accent hover:text-accent"
          >
            TRY AGAIN
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
