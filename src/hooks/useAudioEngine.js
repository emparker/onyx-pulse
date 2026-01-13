import { useRef, useCallback, useEffect } from 'react';
import {
  initAudio,
  isAudioReady,
  playCollisionNote,
  disposeAudio,
} from '../engine/audio.js';

/**
 * React hook for managing the Tone.js audio engine
 * Handles initialization on first user gesture and cleanup
 */
export function useAudioEngine() {
  const initAttemptedRef = useRef(false);

  // Initialize audio on first user interaction
  const ensureAudioReady = useCallback(async () => {
    if (isAudioReady()) return true;
    if (initAttemptedRef.current) return isAudioReady();

    initAttemptedRef.current = true;
    return await initAudio();
  }, []);

  // Play a collision sound
  const triggerCollisionSound = useCallback((impactMagnitude) => {
    if (!isAudioReady()) return;
    playCollisionNote(impactMagnitude);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disposeAudio();
    };
  }, []);

  return {
    ensureAudioReady,
    triggerCollisionSound,
    isReady: isAudioReady,
  };
}
