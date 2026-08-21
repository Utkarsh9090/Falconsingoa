import { motion, AnimatePresence } from 'framer-motion';
import { AppState } from '../types/index';

interface TranscriptProps {
  state: AppState;
  text: string;
}

export function Transcript({ state, text }: TranscriptProps) {
  const isVisible =
    state === AppState.LISTENING ||
    state === AppState.TRANSCRIBING ||
    state === AppState.RETRIEVING ||
    state === AppState.GENERATING ||
    state === AppState.VERIFYING ||
    state === AppState.ANSWER;

  const isListening = state === AppState.LISTENING;

  return (
    <AnimatePresence>
      {isVisible && text && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 text-center"
        >
          <p className="mx-auto max-w-lg text-lg font-light leading-relaxed text-text-primary md:text-xl">
            &ldquo;{text}&rdquo;
          </p>
          {isListening && (
            <motion.span
              className="ml-1 inline-block h-5 w-0.5 bg-accent"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
