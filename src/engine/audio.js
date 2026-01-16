import * as Tone from 'tone';
import { F_MINOR_BASS } from './constants.js';
import { initClock, disposeClock, emitSidechain } from './clock.js';

// Audio engine singleton state
let kickSynth = null;
let hatSynth = null;
let hatFilter = null;
let clapSynth = null;
let clapFilter = null;
let bassSynth = null;
let sidechainGain = null;
let masterCompressor = null;
let masterLimiter = null;
let isInitialized = false;

// Bass note index (cycles through scale)
let bassNoteIndex = 0;

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

    // === MASTER CHAIN ===
    masterCompressor = new Tone.Compressor({
      threshold: -24,
      ratio: 4,
      attack: 0.003,
      release: 0.25,
    }).toDestination();

    masterLimiter = new Tone.Limiter(-1).connect(masterCompressor);

    // === SIDECHAIN GAIN ===
    // All non-kick sounds route through this for the "pump" effect
    sidechainGain = new Tone.Gain(1).connect(masterLimiter);

    // === KICK SYNTH (808-Style) ===
    kickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.01,
        release: 1.4,
      },
    }).connect(masterLimiter); // Kick bypasses sidechain

    kickSynth.volume.value = -3;

    // === HAT SYNTH (High-passed noise for crisp tick) ===
    hatFilter = new Tone.Filter({
      frequency: 8000,
      type: 'highpass',
      Q: 1,
    }).connect(sidechainGain);

    hatSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.06,
        sustain: 0,
        release: 0.03,
      },
    }).connect(hatFilter);

    hatSynth.volume.value = -4;

    // === CLAP SYNTH (Filtered noise burst) ===
    clapFilter = new Tone.Filter({
      frequency: 2500,
      type: 'bandpass',
      Q: 2,
    }).connect(sidechainGain);

    clapSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.005,
        decay: 0.15,
        sustain: 0,
        release: 0.1,
      },
    }).connect(clapFilter);

    clapSynth.volume.value = -8;

    // === BASS SYNTH (Sub bass with filter) ===
    bassSynth = new Tone.MonoSynth({
      oscillator: { type: 'square' },
      filter: {
        Q: 2,
        type: 'lowpass',
        rolloff: -24,
      },
      envelope: {
        attack: 0.005,
        decay: 0.2,
        sustain: 0.4,
        release: 0.3,
      },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.3,
        release: 0.3,
        baseFrequency: 100,
        octaves: 2,
      },
    }).connect(sidechainGain);

    bassSynth.volume.value = -6;

    // Initialize the master clock
    initClock();

    isInitialized = true;
    console.log('Audio engine initialized with all synths');
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
 * Trigger sidechain compression
 */
function triggerSidechain() {
  if (!sidechainGain) return;

  const now = Tone.now();
  sidechainGain.gain.cancelScheduledValues(now);
  sidechainGain.gain.setValueAtTime(1, now);
  sidechainGain.gain.linearRampToValueAtTime(0.3, now + 0.01);
  sidechainGain.gain.linearRampToValueAtTime(1, now + 0.15);

  emitSidechain(1);
}

/**
 * Play kick drum
 */
export function playKick() {
  if (!isInitialized || !kickSynth) return;

  kickSynth.triggerAttackRelease('C1', '8n', Tone.now(), 0.9);
  triggerSidechain();
}

/**
 * Play hi-hat
 */
export function playHat() {
  if (!isInitialized || !hatSynth) return;

  hatSynth.triggerAttackRelease('32n', Tone.now(), 0.8);
}

/**
 * Play clap/snare
 */
export function playClap() {
  if (!isInitialized || !clapSynth) return;

  clapSynth.triggerAttackRelease('16n', Tone.now(), 0.8);
}

/**
 * Play bass note
 * Cycles through F-Minor pentatonic scale
 */
export function playBass() {
  if (!isInitialized || !bassSynth) return;

  const note = F_MINOR_BASS[bassNoteIndex];
  bassSynth.triggerAttackRelease(note, '8n', Tone.now(), 0.8);

  // Cycle to next note in scale
  bassNoteIndex = (bassNoteIndex + 1) % F_MINOR_BASS.length;
}

/**
 * Play bass with specific note
 * @param {string} note - Note name (e.g., 'F2', 'Ab2')
 */
export function playBassNote(note) {
  if (!isInitialized || !bassSynth) return;

  bassSynth.triggerAttackRelease(note, '8n', Tone.now(), 0.8);
}

/**
 * Reset bass note index (e.g., on pattern restart)
 */
export function resetBassPattern() {
  bassNoteIndex = 0;
}

/**
 * Cleanup audio engine
 */
export function disposeAudio() {
  disposeClock();

  if (kickSynth) {
    kickSynth.dispose();
    kickSynth = null;
  }
  if (hatSynth) {
    hatSynth.dispose();
    hatSynth = null;
  }
  if (hatFilter) {
    hatFilter.dispose();
    hatFilter = null;
  }
  if (clapSynth) {
    clapSynth.dispose();
    clapSynth = null;
  }
  if (clapFilter) {
    clapFilter.dispose();
    clapFilter = null;
  }
  if (bassSynth) {
    bassSynth.dispose();
    bassSynth = null;
  }
  if (sidechainGain) {
    sidechainGain.dispose();
    sidechainGain = null;
  }
  if (masterCompressor) {
    masterCompressor.dispose();
    masterCompressor = null;
  }
  if (masterLimiter) {
    masterLimiter.dispose();
    masterLimiter = null;
  }

  isInitialized = false;
  bassNoteIndex = 0;
}
