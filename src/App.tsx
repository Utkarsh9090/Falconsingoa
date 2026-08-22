'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AppState } from './types/index';

import { useAppState } from './hooks/useAppState';
import { useAudioVisualizer } from './hooks/useAudioVisualizer';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { AnswerView } from './components/AnswerView';
import { LatencyPanel } from './components/LatencyPanel';
import { ErrorState } from './components/ErrorState';
import { ArchitectureSection } from './components/ArchitectureSection';
import { SystemStatus } from './components/SystemStatus';
import { Footer } from './components/Footer';

export default function App() {
  const app = useAppState();
  const audio = useAudioVisualizer();

  /** Live interim text from native STT — lifted to App so Hero + ConversationPanels share it */
  const [interim, setInterim] = useState('');

  const handleError = useCallback(
    (_type: 'mic_permission', message: string) => {
      app.reset();
      console.error('Mic error:', message);
    },
    [app]
  );

  const handleFinalTranscript = useCallback(
    (text: string) => {
      setInterim('');
      app.submitQuery(text);
    },
    [app]
  );

  const handleInterimTranscript = useCallback((text: string) => {
    setInterim(text);
    app.setTranscript(text);
  }, [app]);

  const handleStopListening = useCallback(
    (blob: Blob) => {
      setInterim('');
      app.stopListening(blob);
    },
    [app]
  );

  const handleStartListening = useCallback(() => {
    setInterim('');
    app.startListening();
  }, [app]);

  const isAnswerOrGuardrail =
    app.state === AppState.ANSWER ||
    app.state === AppState.OFF_TOPIC ||
    app.state === AppState.NO_CONTEXT ||
    app.state === AppState.BLOCKED ||
    app.state === AppState.ERROR;

  const showAnswer = app.state === AppState.ANSWER;
  const hasConversation = app.turns.length > 0;

  return (
    <div className="relative min-h-screen bg-bg-primary">
      <Navbar />

      {/* Hero / Primary interaction — now embeds ConversationPanels */}
      <Hero
        state={app.state}
        transcript={app.transcript}
        audio={audio}
        turns={app.turns}
        interim={interim}
        onStartListening={handleStartListening}
        onStopListening={handleStopListening}
        onFinalTranscript={handleFinalTranscript}
        onInterimTranscript={handleInterimTranscript}
        onError={handleError}
      />

      {/* Metadata row (sources, grounded, latency) — shown below panels when answer exists */}
      <AnimatePresence>
        {showAnswer && hasConversation && (
          <AnswerView
            answer=""
            sourceCount={app.sources.length}
            grounded={app.grounded}
            metrics={app.metrics}
          />
        )}
      </AnimatePresence>

      {/* Latency panel */}
      <AnimatePresence>
        {showAnswer && (
          <LatencyPanel metrics={app.metrics} percentiles={app.percentiles} />
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
