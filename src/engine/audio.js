import * as Tone from 'tone';
import { PENTATONIC_SCALE, MAX_VELOCITY } from './constants.js';
import { clamp } from '../utils/math.js';

// Audio engine singleton state
let synth = null;
let filter = null;
let isInitialized = false;

/**
 * Initialize the audio engine
 * MUST be called inside a user gesture handler (click/tap)
 */
export async function initAudio() {
  if (isInitialized) return true;

  try {
    // Start the audio context (required by browser autoplay policies)
    await Tone.start();
    console.log('Audio context started');

    // Create a lowpass filter for velocity-responsive brightness
    filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 2000,
      rolloff: -12,
    }).toDestination();

    // Create PolySynth with voice limiting (max 32 voices)
    synth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 32,
      voice: Tone.Synth,
      options: {
        oscillator: {
          type: 'triangle',
        },
        envelope: {
          attack: 0.005,
          decay: 0.3,
          sustain: 0.1,
          release: 0.8,
        },
      },
    }).connect(filter);

    // Set initial volume
    synth.volume.value = -6;

    isInitialized = true;
    console.log('Audio engine initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize audio:', error);
    return false;
  }
}

/**
 * Check if audio is initialized
 */
export function isAudioReady() {
  return isInitialized;
}

/**
 * Map collision velocity to a note frequency
 * Uses square root mapping for more musical distribution
 */
function velocityToFrequency(velocity) {
  const normalized = clamp(velocity / MAX_VELOCITY, 0, 1);
  // Square root gives better distribution - soft hits get lower notes
  const noteIndex = Math.floor(Math.sqrt(normalized) * (PENTATONIC_SCALE.length - 1));
  return PENTATONIC_SCALE[noteIndex];
}

/**
 * Map collision velocity to gain (0.15 - 0.85)
 * Prevents both inaudible notes and clipping
 */
function velocityToGain(velocity) {
  const normalized = clamp(velocity / MAX_VELOCITY, 0, 1);
  return 0.15 + normalized * 0.7;
}

/**
 * Map collision velocity to filter cutoff (300Hz - 3000Hz)
 * Faster hits = brighter sound
 */
function velocityToFilterCutoff(velocity) {
  const normalized = clamp(velocity / MAX_VELOCITY, 0, 1);
  // Power curve for more dramatic brightness on hard hits
  return 300 + Math.pow(normalized, 1.5) * 2700;
}

/**
 * Play a note based on collision data
 * @param {number} impactMagnitude - The collision velocity magnitude
 */
export function playCollisionNote(impactMagnitude) {
  if (!isInitialized || !synth) return;

  // Ignore very soft collisions
  if (impactMagnitude < 0.5) return;

  const frequency = velocityToFrequency(impactMagnitude);
  const gain = velocityToGain(impactMagnitude);
  const cutoff = velocityToFilterCutoff(impactMagnitude);

  // Update filter cutoff with smooth ramp (prevents clicks)
  filter.frequency.rampTo(cutoff, 0.01);

  // Play the note with velocity-based gain
  // Using short duration for plucky sound
  synth.triggerAttackRelease(frequency, '16n', Tone.now(), gain);
}

/**
 * Cleanup audio engine
 */
export function disposeAudio() {
  if (synth) {
    synth.dispose();
    synth = null;
  }
  if (filter) {
    filter.dispose();
    filter = null;
  }
  isInitialized = false;
}
