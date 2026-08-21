/**
 * useAudioVisualizer — Web Audio API hook
 *
 * Captures real microphone input and provides frequency data
 * for the waveform visualization around the mic button.
 */

import { useRef, useState, useCallback, useEffect } from 'react';

export interface AudioVisualizerHook {
  /** 0–255 frequency data array (length = frequencyBinCount) */
  frequencyData: Uint8Array;
  /** Average amplitude 0–1 */
  amplitude: number;
  /** Whether we're actively capturing */
  isCapturing: boolean;
  /** Start capturing from mic */
  startCapture: () => Promise<MediaStream | null>;
  /** Stop capturing */
  stopCapture: () => Blob | null;
  /** Error message if mic access failed */
  micError: string | null;
}

export function useAudioVisualizer(): AudioVisualizerHook {
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(
    () => new Uint8Array(64)
  );
  const [amplitude, setAmplitude] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    setFrequencyData(data);

    // Compute average amplitude (0–1)
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i]!;
    setAmplitude(sum / (data.length * 255));

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startCapture = useCallback(async (): Promise<MediaStream | null> => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up MediaRecorder
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;

      setIsCapturing(true);
      rafRef.current = requestAnimationFrame(tick);

      return stream;
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access was denied'
          : 'Could not access microphone';
      setMicError(msg);
      return null;
    }
  }, [tick]);

  const stopCapture = useCallback((): Blob | null => {
    // Stop animation
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Stop recorder and collect blob
    let audioBlob: Blob | null = null;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    if (chunksRef.current.length > 0) {
      audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
    } else {
      // Even if empty, return a placeholder blob so the pipeline continues
      audioBlob = new Blob([], { type: 'audio/webm' });
    }

    // Stop stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    mediaRecorderRef.current = null;

    setIsCapturing(false);
    setAmplitude(0);
    setFrequencyData(new Uint8Array(64));

    return audioBlob;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    frequencyData,
    amplitude,
    isCapturing,
    startCapture,
    stopCapture,
    micError,
  };
}
