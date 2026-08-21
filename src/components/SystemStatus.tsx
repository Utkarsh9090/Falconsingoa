import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { SystemStatusData, ServiceHealth } from '../types/index';

interface SystemStatusProps {
  status: SystemStatusData | null;
  onRefresh: () => void;
}

const SERVICES: { key: keyof SystemStatusData; label: string }[] = [
  { key: 'system', label: 'SYSTEM' },
  { key: 'stt', label: 'STT' },
  { key: 'retrieval', label: 'RETRIEVAL' },
  { key: 'generation', label: 'GENERATION' },
  { key: 'guardrails', label: 'GUARDRAILS' },
];

function healthToLabel(h: ServiceHealth): string {
  switch (h) {
    case 'online': return 'ONLINE';
    case 'busy': return 'BUSY';
    case 'offline': return 'OFFLINE';
    case 'unknown': return '—';
  }
}

function healthToClass(h: ServiceHealth): string {
  switch (h) {
    case 'online': return 'online';
    case 'busy': return 'busy';
    case 'offline': return 'offline';
    case 'unknown': return 'unknown';
  }
}

export function SystemStatus({ status, onRefresh }: SystemStatusProps) {
  useEffect(() => {
    onRefresh();
    const interval = setInterval(onRefresh, 30000);
    return () => clearInterval(interval);
  }, [onRefresh]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-5xl px-6 py-16 md:px-10"
    >
      <h2 className="mb-8 text-[10px] font-mono tracking-[0.3em] text-text-secondary">
        SYSTEM STATUS
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {SERVICES.map(({ key, label }) => {
          const health = status?.[key] ?? 'unknown';
          return (
            <div
              key={key}
              className="rounded-md border border-border bg-bg-secondary px-4 py-3"
            >
              <div className="mb-2 text-[9px] font-mono tracking-[0.2em] text-text-tertiary">
                {label}
              </div>
              <div className="flex items-center gap-2">
                <span className={`status-dot ${healthToClass(health)}`} />
                <span className="text-[10px] font-mono tracking-[0.1em] text-text-secondary">
                  {healthToLabel(health)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
