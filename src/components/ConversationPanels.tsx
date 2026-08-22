'use client';

/**
 * ConversationPanels
 *
 * Spectra-style split-panel conversational UI.
 *
 * Left panel  — SPECTRA (agent) responses, slide in from left
 * Right panel — USER queries, slide in from right
 *
 * Each message is a glassmorphic card that animates in independently.
 * Both panels auto-scroll to the latest message using useRef.
 */

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Source, GroundingStatus, PipelineMetrics } from '../types/index';

export interface ConversationTurn {
  id: string;
  query: string;
  answer: string;
  sources: Source[];
  grounded: GroundingStatus | null;
  metrics: PipelineMetrics | null;
  timestamp: number;
}

interface ConversationPanelsProps {
  turns: ConversationTurn[];
  /** Live interim transcript while user is speaking */
  interim?: string;
  isListening: boolean;
}

export function ConversationPanels({ turns, interim, isListening }: ConversationPanelsProps) {
  const agentScrollRef = useRef<HTMLDivElement>(null);
  const userScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll both panels to bottom on new content
  useEffect(() => {
    agentScrollRef.current?.scrollTo({ top: agentScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns.length, turns[turns.length - 1]?.answer]);

  useEffect(() => {
    userScrollRef.current?.scrollTo({ top: userScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns.length, interim]);

  if (turns.length === 0 && !interim && !isListening) return null;

  return (
    <div className="conversation-panels-root">
      {/* Left: Agent responses */}
      <div className="conv-panel conv-panel--agent">
        <div className="conv-panel__label">
          <span className="conv-panel__dot conv-panel__dot--agent" />
          SPECTRA
        </div>

        <div className="conv-panel__scroll" ref={agentScrollRef}>
          <AnimatePresence initial={false}>
            {turns.map((turn) => (
              <motion.div
                key={`agent-${turn.id}`}
                className="conv-card conv-card--agent animate-slide-left"
                initial={{ opacity: 0, x: -24, y: 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              >
                {turn.answer ? (
                  <>
                    <p className="conv-card__text">{turn.answer}</p>
                    {/* Metadata pill row */}
                    <div className="conv-card__meta">
                      {turn.grounded && (
                        <span className={`conv-meta-pill ${turn.grounded === 'grounded' ? 'conv-meta-pill--accent' : 'conv-meta-pill--dim'}`}>
                          {turn.grounded === 'grounded' ? '✓ GROUNDED' : turn.grounded === 'partial' ? '~ PARTIAL' : '✗ UNGROUNDED'}
                        </span>
                      )}
                      {turn.sources.length > 0 && (
                        <span className="conv-meta-pill conv-meta-pill--dim">
                          {turn.sources.length} SOURCE{turn.sources.length !== 1 ? 'S' : ''}
                        </span>
                      )}
                      {turn.metrics?.total != null && (
                        <span className="conv-meta-pill conv-meta-pill--dim">
                          {turn.metrics.total}ms
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  /* Typing indicator while agent is processing */
                  <div className="conv-typing">
                    <span /><span /><span />
                  </div>
                )}
              </motion.div>
            ))}

            {/* Empty state when panels just opened */}
            {turns.length === 0 && (
              <motion.div
                key="agent-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="conv-card conv-card--agent conv-card--placeholder"
              >
                <div className="conv-typing">
                  <span /><span /><span />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Divider */}
      <div className="conv-divider" />

      {/* Right: User queries */}
      <div className="conv-panel conv-panel--user">
        <div className="conv-panel__label conv-panel__label--right">
          YOU
          <span className="conv-panel__dot conv-panel__dot--user" />
        </div>

        <div className="conv-panel__scroll" ref={userScrollRef}>
          <AnimatePresence initial={false}>
            {turns.map((turn) => (
              <motion.div
                key={`user-${turn.id}`}
                className="conv-card conv-card--user animate-slide-right"
                initial={{ opacity: 0, x: 24, y: 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="conv-card__text">&ldquo;{turn.query}&rdquo;</p>
              </motion.div>
            ))}

            {/* Live interim text while speaking */}
            {(isListening || interim) && (
              <motion.div
                key="interim"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="conv-card conv-card--user conv-card--interim"
              >
                <p className="conv-card__text conv-card__text--interim">
                  {interim || <span className="conv-card__text--placeholder">Listening…</span>}
                  {isListening && (
                    <motion.span
                      className="conv-cursor"
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.7, repeat: Infinity }}
                    />
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
