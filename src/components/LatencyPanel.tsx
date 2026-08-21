import { motion } from 'framer-motion';
import type { PipelineMetrics, PercentileMetrics } from '../types/index';

interface LatencyPanelProps {
  metrics: PipelineMetrics | null;
  percentiles: PercentileMetrics | null;
}

const STAGES: { key: keyof PipelineMetrics; label: string }[] = [
  { key: 'stt', label: 'STT' },
  { key: 'retrieval', label: 'RETRIEVAL' },
  { key: 'reranking', label: 'RERANKING' },
  { key: 'generation', label: 'GENERATION' },
  { key: 'grounding', label: 'GROUNDING' },
];

function formatMs(value: number | null): string {
  if (value === null) return '—';
  return `${value}ms`;
}

export function LatencyPanel({ metrics, percentiles }: LatencyPanelProps) {
  if (!metrics) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto mt-8 max-w-2xl px-6"
    >
      <div className="rounded-lg border border-border bg-bg-secondary p-5 md:p-6">
        <h3 className="mb-4 text-[10px] font-mono tracking-[0.3em] text-text-tertiary">
          PIPELINE LATENCY
        </h3>

        {/* Per-stage breakdown */}
        <div className="space-y-2">
          {STAGES.map(({ key, label }) => {
            const value = metrics[key];
            return (
              <div
                key={key}
                className="flex items-center justify-between"
              >
                <span className="text-[11px] font-mono text-text-secondary">
                  {label}
                </span>
                <div className="flex items-center gap-3">
                  {value !== null && (
                    <div className="h-px flex-1 min-w-[40px] max-w-[120px] bg-border relative overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-accent/40"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (value / 150) * 100)}%` }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                      />
                    </div>
                  )}
                  <span className="text-[11px] font-mono font-medium text-text-primary tabular-nums w-14 text-right">
                    {formatMs(value)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span className="text-[11px] font-mono font-medium text-accent">
            TOTAL
          </span>
          <span className="text-[11px] font-mono font-semibold text-accent tabular-nums">
            {formatMs(metrics.total)}
          </span>
        </div>

        {/* Percentiles */}
        {percentiles && (
          <div className="mt-4 flex items-center gap-6 border-t border-border pt-3">
            {(['p50', 'p70', 'p100'] as const).map((p) => (
              <div key={p} className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-text-tertiary uppercase">
                  {p.toUpperCase()}
                </span>
                <span className="text-[10px] font-mono text-text-secondary tabular-nums">
                  {formatMs(percentiles[p])}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
