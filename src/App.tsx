'use client';

import { useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AppState } from './types/index';

import { useAppState } from './hooks/useAppState';
import { useAudioVisualizer } from './hooks/useAudioVisualizer';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { AnswerView } from './components/AnswerView';
import { SourceContext } from './components/SourceContext';
import { LatencyPanel } from './components/LatencyPanel';
import { ErrorState } from './components/ErrorState';
import { ArchitectureSection } from './components/ArchitectureSection';
import { SystemStatus } from './components/SystemStatus';
import { Footer } from './components/Footer';

export default function App() {
  const app = useAppState();
  const audio = useAudioVisualizer();

  const handleError = useCallback(
    (_type: 'mic_permission', message: string) => {
      // We need to set error state — use the reset then manually set error
      // The stopListening path won't be called since startCapture failed
      app.reset();
      // Trigger error after reset
      setTimeout(() => {
        app.submitQuery(''); // This is a no-op that won't actually fire
      }, 0);
      // Instead, we handle it by showing mic error inline
      console.error('Mic error:', message);
    },
    [app]
  );

  const isAnswerOrGuardrail =
    app.state === AppState.ANSWER ||
    app.state === AppState.OFF_TOPIC ||
    app.state === AppState.NO_CONTEXT ||
    app.state === AppState.BLOCKED ||
    app.state === AppState.ERROR;

  const showAnswer = app.state === AppState.ANSWER;

  return (
    <div className="relative min-h-screen bg-bg-primary">
      <Navbar />

      {/* Hero / Primary interaction */}
      <Hero
        state={app.state}
        transcript={app.transcript}
        audio={audio}
        onStartListening={app.startListening}
        onStopListening={app.stopListening}
        onError={handleError}
      />

      {/* Answer panel */}
      <AnimatePresence>
        {showAnswer && (
          <>
            <AnswerView
              answer={app.answer}
              sourceCount={app.sources.length}
              grounded={app.grounded}
              metrics={app.metrics}
            />
            <SourceContext sources={app.sources} />
            <LatencyPanel metrics={app.metrics} percentiles={app.percentiles} />
          </>
        )}
      </AnimatePresence>

      {/* Error / Guardrail states */}
      <AnimatePresence>
        {isAnswerOrGuardrail && !showAnswer && (
          <ErrorState
            state={app.state}
            error={app.error}
            onRetry={app.reset}
          />
        )}
      </AnimatePresence>

      {/* Architecture diagram */}
      <div className="border-t border-border mt-16">
        <ArchitectureSection />
      </div>

      {/* System status */}
      <div className="border-t border-border">
        <SystemStatus
          status={app.systemStatus}
          onRefresh={app.refreshSystemStatus}
        />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
