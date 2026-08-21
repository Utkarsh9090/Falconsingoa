import { motion } from 'framer-motion';
import type { PipelineMetrics, GroundingStatus } from '../types/index';

interface AnswerViewProps {
  answer: string;
  sourceCount: number;
  grounded: GroundingStatus | null;
  metrics: PipelineMetrics | null;
}

export function AnswerView({ answer, sourceCount, grounded, metrics }: AnswerViewProps) {
  if (!answer) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto mt-12 max-w-2xl px-6"
    >
      {/* Section label */}
      <div className="mb-4 text-[10px] font-mono tracking-[0.3em] text-accent">
        ANSWER
      </div>

      {/* Answer text */}
      <div className="rounded-lg border border-border bg-bg-secondary p-6 md:p-8">
        <p className="text-base leading-[1.8] text-text-primary md:text-lg">
          {answer}
        </p>
      </div>

      {/* Metadata row */}
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono tracking-[0.2em] text-text-tertiary">
            SOURCE CONTEXT
          </span>
          <span className="text-[11px] font-mono font-medium text-text-secondary">
            {sourceCount.toString().padStart(2, '0')} SOURCES
          </span>
        </div>

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
