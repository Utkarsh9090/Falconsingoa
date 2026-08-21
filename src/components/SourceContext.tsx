import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Source } from '../types/index';

interface SourceContextProps {
  sources: Source[];
}

export function SourceContext({ sources }: SourceContextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (sources.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto mt-6 max-w-2xl px-6"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="group flex w-full items-center justify-between rounded-md border border-border bg-bg-secondary px-5 py-3 transition-all duration-300 hover:border-accent/30"
      >
        <span className="text-[10px] font-mono tracking-[0.2em] text-text-secondary group-hover:text-accent transition-colors duration-300">
          WHY THIS ANSWER?
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-text-tertiary">
            {sources.length} {sources.length === 1 ? 'SOURCE' : 'SOURCES'}
          </span>
          <motion.span
            className="text-text-tertiary text-xs"
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            ▾
          </motion.span>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3">
              {sources.map((source, index) => (
                <motion.div
                  key={source.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="rounded-md border border-border-subtle bg-bg-tertiary p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[9px] font-mono tracking-[0.25em] text-accent">
                      SOURCE {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <span className="text-[9px] font-mono text-text-tertiary">
                      {Math.round(source.relevanceScore * 100)}% RELEVANCE
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {source.content}
                  </p>
                  {source.metadata && (
                    <div className="mt-2 flex flex-wrap gap-3">
                      {Object.entries(source.metadata).map(([key, val]) => (
                        <span
                          key={key}
                          className="text-[9px] font-mono text-text-tertiary"
                        >
                          {key.toUpperCase()}: {val}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
