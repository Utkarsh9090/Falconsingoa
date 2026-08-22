/**
 * useSpeechRecognition
 *
 * Native browser Speech Recognition hook — Spectra architecture port.
 *
 * Why: Eliminates the audio-upload round-trip to /api/transcribe by having
 * the browser/OS process speech locally. Zero network cost for STT.
 *
 * Features:
 *  - interimResults: true  → words appear live as user speaks
 *  - onFinal callback      → fires with complete transcript (isFinal === true)
 *  - Auto-retry loop       → up to MAX_RETRIES reconnects on transient errors
 *  - Graceful degradation  → `isSupported: false` when API unavailable
 */

import { useRef, useCallback, useState, useEffect } from 'react';

export interface SpeechRecognitionHook {
  /** Whether the browser supports the Web Speech API */
  isSupported: boolean;
  /** Currently listening */
  isListening: boolean;
  /** Live interim transcript (updates word-by-word) */
  interim: string;
  /** Start recognition */
  start: (onFinal: (text: string) => void, onInterim?: (text: string) => void) => void;
  /** Stop recognition (fires any pending onFinal) */
  stop: () => void;
}

const MAX_RETRIES = 3;

// Minimal interfaces for browsers that expose SpeechRecognition
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => ISpeechRecognition;

// Resolve the correct constructor
function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition ??
    null
  );
}

export function useSpeechRecognition(): SpeechRecognitionHook {
  // Detect support client-side only (avoids SSR/hydration mismatch)
  const [isSupported, setIsSupported] = useState(false);
  const SpeechRecognitionCtorRef = useRef<SpeechRecognitionCtor | null>(null);

  useEffect(() => {
    const ctor = getSpeechRecognition();
    SpeechRecognitionCtorRef.current = ctor;
    setIsSupported(!!ctor);
  }, []);

  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const retriesRef = useRef(0);
  const onFinalRef = useRef<((text: string) => void) | null>(null);
  const onInterimRef = useRef<((text: string) => void) | null>(null);
  const stoppedManuallyRef = useRef(false);
  const isListeningRef = useRef(false);

  const destroyRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }, []);

  const createAndStart = useCallback(() => {
    const SpeechRecognitionCtor = SpeechRecognitionCtorRef.current;
    if (!SpeechRecognitionCtor) return;

    destroyRecognition();

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (interimText) {
        setInterim(interimText);
        onInterimRef.current?.(interimText);
      }

      if (finalText) {
        setInterim('');
        retriesRef.current = 0; // reset retry counter on successful recognition
        onFinalRef.current?.(finalText.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Ignore aborted errors (user manually stopped)
      if (event.error === 'aborted' || stoppedManuallyRef.current) return;

      console.warn('[STT] Recognition error:', event.error);

      if (retriesRef.current < MAX_RETRIES) {
        retriesRef.current++;
        const delay = retriesRef.current * 300;
        console.log(`[STT] Retrying (${retriesRef.current}/${MAX_RETRIES}) in ${delay}ms`);
        setTimeout(() => {
          if (!stoppedManuallyRef.current) createAndStart();
        }, delay);
      } else {
        console.error('[STT] Max retries reached, stopping.');
        setIsListening(false);
        setInterim('');
      }
    };

    recognition.onend = () => {
      // If not manually stopped and still in listening state, auto-restart (continuous mode)
      if (!stoppedManuallyRef.current && isListeningRef.current) {
        // brief pause to avoid tight loop
        setTimeout(() => {
          if (!stoppedManuallyRef.current) {
            try { recognition.start(); } catch { /* recognition may already be started */ }
          }
        }, 50);
      } else {
        isListeningRef.current = false;
        setIsListening(false);
        setInterim('');
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      isListeningRef.current = true;
      setIsListening(true);
    } catch (err) {
      console.error('[STT] Failed to start recognition:', err);
    }
  }, [destroyRecognition]);

  const start = useCallback(
    (onFinal: (text: string) => void, onInterim?: (text: string) => void) => {
      if (!SpeechRecognitionCtorRef.current) return;

      stoppedManuallyRef.current = false;
      retriesRef.current = 0;
      onFinalRef.current = onFinal;
      onInterimRef.current = onInterim ?? null;
      setInterim('');

      createAndStart();
    },
    [createAndStart]
  );

  const stop = useCallback(() => {
    stoppedManuallyRef.current = true;
    isListeningRef.current = false;
    setIsListening(false);
    setInterim('');
    destroyRecognition();
  }, [destroyRecognition]);

  return { isSupported, isListening, interim, start, stop };
}
