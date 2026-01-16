import * as Tone from 'tone';
import { TEMPO_BPM, STEPS_PER_BAR, TEMPO_MIN, TEMPO_MAX } from './constants.js';

// Clock module singleton state
let isInitialized = false;
let isPlaying = true;
let stepListeners = [];
let beatListeners = [];
let sidechainListeners = [];
let scheduledEventId = null;
let currentStep = 0;
let currentTempo = TEMPO_BPM;

/**
 * Initialize the master clock
 * MUST be called after Tone.start() (audio context is running)
 */
export function initClock() {
  if (isInitialized) return;

  // Set tempo
  Tone.Transport.bpm.value = TEMPO_BPM;

  // Schedule step events on 16th notes (for sequencer)
  scheduledEventId = Tone.Transport.scheduleRepeat((time) => {
    // Skip if paused
    if (!isPlaying) return;

    const step = currentStep;

    // Use Tone.Draw to sync with animation frame
    Tone.Draw.schedule(() => {
      const stepInfo = {
        step,
        isDownbeat: step === 0,
        isBeat: step % 4 === 0, // Quarter note
        timestamp: performance.now(),
      };

      // Notify step listeners (sequencer uses this)
      stepListeners.forEach(cb => cb(stepInfo));

      // Also notify beat listeners on quarter notes (for visual pulse)
      if (step % 4 === 0) {
        beatListeners.forEach(cb => cb({
          beat: Math.floor(step / 4),
          isDownbeat: step === 0,
          timestamp: performance.now(),
        }));
      }
    }, time);

    // Advance step counter
    currentStep = (currentStep + 1) % STEPS_PER_BAR;
  }, '16n'); // 16th note interval

  // Start the transport
  Tone.Transport.start();

  isInitialized = true;
  console.log(`Clock initialized at ${TEMPO_BPM} BPM (16th note resolution)`);
}

/**
 * Check if clock is initialized
 */
export function isClockReady() {
  return isInitialized;
}

/**
 * Check if clock is playing
 */
export function isClockPlaying() {
  return isPlaying;
}

/**
 * Pause the clock
 */
export function pauseClock() {
  isPlaying = false;
}

/**
 * Resume the clock
 */
export function resumeClock() {
  isPlaying = true;
}

/**
 * Toggle play/pause
 * @returns {boolean} New playing state
 */
export function togglePlayPause() {
  isPlaying = !isPlaying;
  return isPlaying;
}

/**
 * Get current step position
 */
export function getCurrentStep() {
  return currentStep;
}

/**
 * Register a callback for step events (every 16th note)
 * @param {Function} callback - Called on each step with stepInfo
 * @returns {Function} Unsubscribe function
 */
export function onStep(callback) {
  stepListeners.push(callback);
  return () => {
    stepListeners = stepListeners.filter(cb => cb !== callback);
  };
}

/**
 * Register a callback for beat events (every quarter note)
 * @param {Function} callback - Called on each beat with beatInfo
 * @returns {Function} Unsubscribe function
 */
export function onBeat(callback) {
  beatListeners.push(callback);
  return () => {
    beatListeners = beatListeners.filter(cb => cb !== callback);
  };
}

/**
 * Register a callback for sidechain events (kick triggers)
 * @param {Function} callback - Called when sidechain should duck
 * @returns {Function} Unsubscribe function
 */
export function onSidechain(callback) {
  sidechainListeners.push(callback);
  return () => {
    sidechainListeners = sidechainListeners.filter(cb => cb !== callback);
  };
}

/**
 * Emit a sidechain event (called by audio engine when kick fires)
 * @param {number} intensity - 0-1 intensity of the duck
 */
export function emitSidechain(intensity = 1) {
  const event = {
    intensity,
    timestamp: performance.now(),
    durationMs: 150, // Standard sidechain release
  };
  sidechainListeners.forEach(cb => cb(event));
}

/**
 * Get milliseconds per step at current tempo
 */
export function getMsPerStep() {
  return (60000 / currentTempo) / 4; // 16th note duration
}

/**
 * Get milliseconds per beat at current tempo
 */
export function getMsPerBeat() {
  return 60000 / currentTempo;
}

/**
 * Get current tempo
 * @returns {number} Current BPM
 */
export function getTempo() {
  return currentTempo;
}

/**
 * Set tempo
 * @param {number} bpm - New tempo in BPM
 */
export function setTempo(bpm) {
  const clampedBpm = Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, bpm));
  currentTempo = clampedBpm;

  if (isInitialized) {
    Tone.Transport.bpm.value = clampedBpm;
  }

  console.log(`Tempo set to ${clampedBpm} BPM`);
  return clampedBpm;
}

/**
 * Increase tempo by step amount
 * @param {number} step - Amount to increase (default 4)
 * @returns {number} New tempo
 */
export function increaseTempo(step = 4) {
  return setTempo(currentTempo + step);
}

/**
 * Decrease tempo by step amount
 * @param {number} step - Amount to decrease (default 4)
 * @returns {number} New tempo
 */
export function decreaseTempo(step = 4) {
  return setTempo(currentTempo - step);
}

/**
 * Cleanup clock resources
 */
export function disposeClock() {
  if (scheduledEventId !== null) {
    Tone.Transport.clear(scheduledEventId);
    scheduledEventId = null;
  }
  Tone.Transport.stop();
  stepListeners = [];
  beatListeners = [];
  sidechainListeners = [];
  currentStep = 0;
  isInitialized = false;
}
