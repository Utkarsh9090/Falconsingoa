import { motion } from 'framer-motion';
import type { PipelineMetrics, GroundingStatus } from '../types/index';

interface AnswerViewProps {
  /** Unused — answer text is now rendered inside ConversationPanels */
  answer: string;
  sourceCount: number;
  grounded: GroundingStatus | null;
  metrics: PipelineMetrics | null;
}

/**
 * AnswerView — metadata row only.
 *
 * The answer text itself is now rendered inside ConversationPanels (Spectra arch).
 * This component shows the source count, grounding status, and total latency below
 * the conversation panels.
 */
export function AnswerView({ sourceCount, grounded, metrics }: AnswerViewProps) {
  // Don't render if there's nothing meaningful to show
  if (sourceCount === 0 && !grounded && metrics?.total == null) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-2xl px-6 mt-4"
    >
      {/* Metadata pill row */}
      <div className="flex flex-wrap items-center gap-6">
        {sourceCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono tracking-[0.2em] text-text-tertiary">
              SOURCE CONTEXT
            </span>
            <span className="text-[11px] font-mono font-medium text-text-secondary">
              {sourceCount.toString().padStart(2, '0')} SOURCES
            </span>
          </div>
        )}

        {grounded && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono tracking-[0.2em] text-text-tertiary">
              GROUNDED
            </span>
            <span
              className={`text-[11px] font-mono font-medium ${
                grounded === 'grounded'
                  ? 'text-accent'
                  : grounded === 'partial'
                  ? 'text-text-secondary'
                  : 'text-status-offline'
              }`}
            >
              {grounded === 'grounded' ? 'YES' : grounded === 'partial' ? 'PARTIAL' : 'NO'}
            </span>
          </div>
        )}

        {metrics?.total != null && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono tracking-[0.2em] text-text-tertiary">
              LATENCY
            </span>
            <span className="text-[11px] font-mono font-medium text-text-secondary">
              {metrics.total}ms
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
