'use client';

// Re-export existing App as a client component entry point
// This is needed because App uses browser APIs (MediaRecorder, Web Audio, etc.)
export { default } from './App';
