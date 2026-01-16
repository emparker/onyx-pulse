import { useRef, useCallback, useEffect } from 'react';
import {
  initAudio,
  isAudioReady,
  playKick,
  playHat,
  playClap,
  playBass,
  disposeAudio,
} from '../engine/audio.js';
import { onBeat, onSidechain } from '../engine/clock.js';

/**
 * React hook for managing the Tone.js audio engine
 * Handles initialization on first user gesture and cleanup
 */
export function useAudioEngine() {
  const initAttemptedRef = useRef(false);
  const beatUnsubscribeRef = useRef(null);
  const sidechainUnsubscribeRef = useRef(null);

  // Initialize audio on first user interaction
  const ensureAudioReady = useCallback(async () => {
    if (isAudioReady()) return true;
    if (initAttemptedRef.current) return isAudioReady();

    initAttemptedRef.current = true;
    return await initAudio();
  }, []);

  // Subscribe to beat events (for visual effects)
  const subscribeToBeat = useCallback((callback) => {
    if (beatUnsubscribeRef.current) {
      beatUnsubscribeRef.current();
    }
    beatUnsubscribeRef.current = onBeat(callback);
    return beatUnsubscribeRef.current;
  }, []);

  // Subscribe to sidechain events (for visual pump)
  const subscribeToSidechain = useCallback((callback) => {
    if (sidechainUnsubscribeRef.current) {
      sidechainUnsubscribeRef.current();
    }
    sidechainUnsubscribeRef.current = onSidechain(callback);
    return sidechainUnsubscribeRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (beatUnsubscribeRef.current) {
        beatUnsubscribeRef.current();
      }
      if (sidechainUnsubscribeRef.current) {
        sidechainUnsubscribeRef.current();
      }
      disposeAudio();
    };
  }, []);

  return {
    ensureAudioReady,
    subscribeToBeat,
    subscribeToSidechain,
    playKick,
    playHat,
    playClap,
    playBass,
    isReady: isAudioReady,
  };
}
