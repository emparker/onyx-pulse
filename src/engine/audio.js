import * as Tone from 'tone';
import {
  C_MINOR_BASS,
  PERC_PITCHES,
  CHORD_PROGRESSIONS,
  LEAD_PHRASES,
  ARP_NOTES,
  ARP_MODES,
  SUB_CHARACTERS,
  WOBBLE_CHARACTERS,
  LAYER_GAIN_DB,
  RECORDING,
} from './constants.js';
import { initClock, disposeClock, emitSidechain, getTempo } from './clock.js';

// Audio engine singleton state
let kickSynth = null;
let hatSynth = null;
let hatFilter = null;
let clapSynth = null;
let clapFilter = null;
let subSynth = null;
let percSynth = null;
let wobbleSynth = null;
let wobbleLFO = null;
let chordSynth = null;
let leadSynth = null;
let arpSynth = null;

// Stab synths
let impactSynth = null;
let impactNoise = null;
let riserSynth = null;
let riserFilter = null;
let laserSynth = null;
let reverseSynth = null;
let reverseFilter = null;

// Build/Drop system
let masterHighpass = null;
let snareRollLoop = null;

let sidechainGain = null;
let masterCompressor = null;
let masterLimiter = null;
let layerGain = null;  // Gain node for layer auto-EQ
let currentLayerCount = 1;  // Track current layer count for gain adjustment
let isInitialized = false;

// Recording system
let recorder = null;
let recordingFadeGain = null;  // For graceful fade-out
let isRecording = false;
let recordingBlob = null;

// Note indices for cycling through scales/patterns
let subNoteIndex = 0;
let percPitchIndex = 0;
let leadNoteIndex = 0;
let arpNoteIndex = 0;
let arpDirection = 1; // 1 = up, -1 = down

// Pattern state
let currentSubCharacter = 'Deep'; // Deep, Punch, Growl, Reese, Acid, Rubber
let currentWobbleCharacter = 'Smooth'; // Smooth, Pulse, Growl, Sweep, Chop, Chaos
let currentChordProgression = 'Epic Rise';
let currentChordIndex = 0;
let currentLeadPhrase = 'Soar';
let currentArpMode = 'Climb'; // Climb, Fall, Scatter, Cascade, Skip, Shimmer
let arpPingPongDirection = 1; // For Cascade mode: 1 = up, -1 = down

// Sub bass state (for continuous playback as pattern lane)
let subIsPlaying = false;

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
    // Recording fade gain (for graceful fade-out during recording)
    recordingFadeGain = new Tone.Gain(1).toDestination();

    // Gentler master compressor - less pumping, more transparent
    masterCompressor = new Tone.Compressor({
      threshold: -12,    // Higher threshold = less constant compression
      ratio: 3,          // Gentler ratio
      attack: 0.01,      // Slower attack = less pumping on transients
      release: 0.15,     // Faster release = more natural recovery
    }).connect(recordingFadeGain);

    masterLimiter = new Tone.Limiter(-1).connect(masterCompressor);

    // === RECORDING ===
    recorder = new Tone.Recorder();
    recordingFadeGain.connect(recorder);

    // Layer gain node for auto-EQ based on layer count
    layerGain = new Tone.Gain(1).connect(masterLimiter);

    // Master highpass filter for build/drop system
    masterHighpass = new Tone.Filter({
      frequency: 20,
      type: 'highpass',
      rolloff: -24,
    }).connect(layerGain);

    // === SIDECHAIN GAIN ===
    // All non-kick sounds route through this for the "pump" effect
    sidechainGain = new Tone.Gain(1).connect(masterHighpass);

    // === KICK SYNTH (808-Style) ===
    // Tighter envelope prevents overlap on rapid triggers
    kickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.04,       // Slightly faster pitch drop
      octaves: 5,             // Less extreme pitch range = cleaner
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.15,          // Tighter decay (was 0.25)
        sustain: 0,
        release: 0.08,        // Much tighter release (was 0.3)
      },
    }).connect(masterHighpass); // Kick bypasses sidechain

    kickSynth.volume.value = -6;  // Foundation - loudest drum element

    // === HAT SYNTH (High-passed noise for crisp tick) ===
    hatFilter = new Tone.Filter({
      frequency: 7000,        // Slightly lower = less harsh
      type: 'highpass',
      Q: 0.7,                 // Lower Q = smoother, less resonant peak
    }).connect(sidechainGain);

    hatSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.002,        // Tiny attack softens the click
        decay: 0.05,          // Slightly tighter
        sustain: 0,
        release: 0.02,
      },
    }).connect(hatFilter);

    hatSynth.volume.value = -12;  // High-end detail, sits behind kick

    // === CLAP SYNTH (Filtered noise burst) ===
    clapFilter = new Tone.Filter({
      frequency: 2200,        // Slightly lower center frequency
      type: 'bandpass',
      Q: 1.2,                 // Lower Q = less peaky, smoother
    }).connect(sidechainGain);

    clapSynth = new Tone.NoiseSynth({
      noise: { type: 'pink' },  // Pink noise = warmer than white
      envelope: {
        attack: 0.003,
        decay: 0.1,           // Tighter decay (was 0.15)
        sustain: 0,
        release: 0.05,        // Tighter release (was 0.1)
      },
    }).connect(clapFilter);

    clapSynth.volume.value = -8;

    // === PERC SYNTH (Tuned percussion, cycling pitches) ===
    // Tighter envelope for cleaner rapid triggers
    percSynth = new Tone.MembraneSynth({
      pitchDecay: 0.015,      // Faster pitch drop
      octaves: 1.5,           // Less extreme = cleaner
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.08,          // Tighter (was 0.15)
        sustain: 0,
        release: 0.04,        // Tighter (was 0.1)
      },
    }).connect(sidechainGain);

    percSynth.volume.value = -10;  // Slightly lower

    // === SUB SYNTH (Sub bass with filter) ===
    // Tighter envelope + lower Q for cleaner bass
    subSynth = new Tone.MonoSynth({
      oscillator: { type: 'triangle' },  // Triangle = cleaner than square
      filter: {
        Q: 1,                   // Lower Q = less resonant
        type: 'lowpass',
        rolloff: -24,
      },
      envelope: {
        attack: 0.005,
        decay: 0.12,            // Tighter (was 0.2)
        sustain: 0.3,
        release: 0.1,           // Much tighter (was 0.3)
      },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.15,
        sustain: 0.2,
        release: 0.1,
        baseFrequency: 80,      // Lower base = deeper bass
        octaves: 1.5,
      },
    }).connect(sidechainGain);

    subSynth.volume.value = -6;  // BASS IS THE HEART - equal presence with kick

    // === WOBBLE SYNTH (Dubstep bass with LFO) ===
    // Lower Q for smoother wobble without harsh resonance
    wobbleSynth = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: {
        Q: 3,                   // Lower Q (was 6) = smoother
        type: 'lowpass',
        rolloff: -24,
      },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.7,
        release: 0.15,          // Tighter release
      },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.4,
        release: 0.15,
        baseFrequency: 150,     // Lower base frequency
        octaves: 2.5,
      },
    }).connect(sidechainGain);

    wobbleSynth.volume.value = -8;  // BASS IS THE HEART - prominent wobble

    // LFO for wobble filter modulation
    // Lower max frequency for smoother wobble
    wobbleLFO = new Tone.LFO({
      frequency: '8n',
      min: 80,
      max: 1200,              // Lower max (was 2000) = less harsh
      type: 'sine',
    });
    wobbleLFO.connect(wobbleSynth.filter.frequency);

    // === CHORD SYNTH (PolySynth for pads) ===
    chordSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.1,
        decay: 0.3,
        sustain: 0.5,
        release: 0.8,
      },
    }).connect(sidechainGain);

    chordSynth.volume.value = -12;  // Harmonic bed, fills space without dominating

    // === LEAD SYNTH (Mono lead for hooks) ===
    leadSynth = new Tone.MonoSynth({
      oscillator: { type: 'square' },
      filter: {
        Q: 3,
        type: 'lowpass',
        rolloff: -12,
      },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.3,
        release: 0.2,
      },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: 0.2,
        baseFrequency: 500,
        octaves: 2.5,
      },
    }).connect(sidechainGain);

    leadSynth.volume.value = -10;

    // === ARP SYNTH (Plucky arpeggiator) ===
    arpSynth = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: {
        Q: 2,
        type: 'lowpass',
        rolloff: -24,
      },
      envelope: {
        attack: 0.001,
        decay: 0.15,
        sustain: 0.1,
        release: 0.1,
      },
      filterEnvelope: {
        attack: 0.001,
        decay: 0.15,
        sustain: 0.3,
        release: 0.1,
        baseFrequency: 800,
        octaves: 2,
      },
    }).connect(sidechainGain);

    arpSynth.volume.value = -10;

    // === STAB: IMPACT (Pink noise sweep + membrane thump) ===
    // Boosted for more punch
    impactNoise = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: {
        attack: 0.001,
        decay: 0.6,
        sustain: 0,
        release: 0.4,
      },
    }).connect(sidechainGain);
    impactNoise.volume.value = -4; // Boosted from -8

    impactSynth = new Tone.MembraneSynth({
      pitchDecay: 0.1,
      octaves: 8,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.8,
        sustain: 0,
        release: 0.5,
      },
    }).connect(masterHighpass);
    impactSynth.volume.value = 0; // Boosted from -4

    // === STAB: RISER (White noise with filter sweep) ===
    riserFilter = new Tone.Filter({
      frequency: 200,
      type: 'lowpass',
      rolloff: -24,
      Q: 4,
    }).connect(sidechainGain);

    riserSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 1,
        release: 0.5,
      },
    }).connect(riserFilter);
    riserSynth.volume.value = -12;

    // === STAB: LASER (Clean pitch-down sweep C5→C2) ===
    laserSynth = new Tone.FMSynth({
      harmonicity: 4, // More musical, less harsh
      modulationIndex: 12,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.45,    // Extended for longer tail
        sustain: 0.1,
        release: 0.2,
      },
      modulation: { type: 'sine' },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.1,
        release: 0.2,
      },
    }).connect(sidechainGain);
    laserSynth.volume.value = -4; // Boosted for more impact

    // === STAB: REVERSE (Reversed cymbal/reverb swell - fade IN then cut) ===
    reverseFilter = new Tone.Filter({
      frequency: 200,
      type: 'lowpass',
      rolloff: -24,
      Q: 3,
    }).connect(sidechainGain);

    reverseSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.8,   // Extended swell-in (was 0.4)
        decay: 0.08,   // Quick cut
        sustain: 0,
        release: 0.08,
      },
    }).connect(reverseFilter);
    reverseSynth.volume.value = -5; // Boosted for more impact

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
 * Uses exponential curves for smoother, more musical ducking
 */
function triggerSidechain() {
  if (!sidechainGain) return;

  const now = Tone.now();
  sidechainGain.gain.cancelScheduledValues(now);
  sidechainGain.gain.setValueAtTime(1, now);
  // Gentler duck: 0.5 instead of 0.3, slower attack for less "pumpy" sound
  sidechainGain.gain.exponentialRampToValueAtTime(0.5, now + 0.015);
  // Smoother release curve
  sidechainGain.gain.exponentialRampToValueAtTime(0.95, now + 0.1);
  sidechainGain.gain.linearRampToValueAtTime(1, now + 0.12);

  emitSidechain(1);
}

/**
 * Play kick drum
 * Uses voice stealing to prevent "popcorn" sound from overlapping kicks
 */
export function playKick() {
  if (!isInitialized || !kickSynth) return;

  const now = Tone.now();
  // Cut off any previous kick immediately to prevent overlap artifacts
  kickSynth.triggerRelease(now);
  // Trigger new kick with tiny offset to allow clean cutoff
  kickSynth.triggerAttackRelease('C1', '8n', now + 0.002, 0.9);
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
 * Play perc (cycling through pitches)
 * Uses voice stealing to prevent overlap artifacts
 */
export function playPerc() {
  if (!isInitialized || !percSynth) return;

  const now = Tone.now();
  const pitch = PERC_PITCHES[percPitchIndex];
  // Cut off any previous perc to prevent overlap
  percSynth.triggerRelease(now);
  percSynth.triggerAttackRelease(pitch, '16n', now + 0.002, 0.7);
  percPitchIndex = (percPitchIndex + 1) % PERC_PITCHES.length;
}

/**
 * Start sub bass (continuous drone, pitch cycles on beat)
 * SUB is now a pattern lane - plays continuously when active
 */
export function startSub() {
  if (!isInitialized || !subSynth || subIsPlaying) return;

  const note = C_MINOR_BASS[subNoteIndex];
  subSynth.triggerAttack(note, Tone.now(), 0.9);
  subIsPlaying = true;
}

/**
 * Stop sub bass
 */
export function stopSub() {
  if (!subSynth) return;

  subSynth.triggerRelease(Tone.now());
  subIsPlaying = false;
}

/**
 * Advance sub bass to next note (called on beat)
 * Smoothly transitions to next note in C minor pentatonic
 */
export function advanceSubNote() {
  if (!isInitialized || !subSynth || !subIsPlaying) return;

  subNoteIndex = (subNoteIndex + 1) % C_MINOR_BASS.length;
  const note = C_MINOR_BASS[subNoteIndex];

  // Glide to next note for smooth bass movement
  subSynth.setNote(note, Tone.now());
}

/**
 * Play sub bass note (one-shot, for backwards compatibility)
 * Uses voice stealing to prevent overlap artifacts
 */
export function playSub() {
  if (!isInitialized || !subSynth) return;

  const now = Tone.now();
  const note = C_MINOR_BASS[subNoteIndex];
  // Cut off any previous sub note to prevent overlap
  subSynth.triggerRelease(now);
  subSynth.triggerAttackRelease(note, '8n', now + 0.002, 0.9);
  subNoteIndex = (subNoteIndex + 1) % C_MINOR_BASS.length;
}

/**
 * Reset sub note index (e.g., on pattern restart)
 */
export function resetSubPattern() {
  subNoteIndex = 0;
}

/**
 * Set sub bass character
 * @param {string} name - Character name from SUB_CHARACTERS
 */
export function setSubCharacter(name) {
  if (!SUB_CHARACTERS[name] || !subSynth) return;

  const char = SUB_CHARACTERS[name];
  currentSubCharacter = name;

  // Update synth parameters based on character
  try {
    // Update oscillator type
    if (char.oscillator === 'fmsine') {
      // FM sine needs special handling - use sine with slight FM-like attack
      subSynth.oscillator.type = 'sine';
    } else {
      subSynth.oscillator.type = char.oscillator;
    }

    // Update filter
    subSynth.filter.Q.value = char.filterQ;
    subSynth.filterEnvelope.baseFrequency = char.filterFreq;

    // Update envelope
    subSynth.envelope.attack = char.attack;
    subSynth.envelope.decay = char.decay;
    subSynth.envelope.sustain = char.sustain;
    subSynth.envelope.release = char.release;

    // Handle detune for Reese bass
    if (char.detune) {
      subSynth.detune.value = char.detune;
    } else {
      subSynth.detune.value = 0;
    }

    console.log(`Sub character set to: ${name}`);
  } catch (error) {
    console.warn(`Failed to set sub character ${name}:`, error);
  }
}

/**
 * Get current sub character name
 */
export function getSubCharacter() {
  return currentSubCharacter;
}

/**
 * Check if sub is playing
 */
export function isSubPlaying() {
  return subIsPlaying;
}

// Legacy aliases for backwards compatibility
export const playBass = playSub;
export const resetBassPattern = resetSubPattern;

/**
 * Start wobble bass
 */
export function startWobble() {
  if (!isInitialized || !wobbleSynth || !wobbleLFO) return;

  wobbleLFO.start();
  wobbleSynth.triggerAttack('C2', Tone.now(), 0.8);
}

/**
 * Stop wobble bass
 */
export function stopWobble() {
  if (!wobbleSynth || !wobbleLFO) return;

  wobbleSynth.triggerRelease(Tone.now());
  wobbleLFO.stop();
}

/**
 * Set wobble character
 * @param {string} name - Character name from WOBBLE_CHARACTERS
 */
export function setWobbleCharacter(name) {
  if (!WOBBLE_CHARACTERS[name]) return;

  const char = WOBBLE_CHARACTERS[name];
  currentWobbleCharacter = name;

  if (wobbleLFO) {
    // Set LFO rate
    wobbleLFO.frequency.value = char.rate;

    // Set LFO shape (random uses square with sample-hold effect)
    if (char.shape === 'random') {
      // For chaos mode, use a faster rate with random-ish behavior
      wobbleLFO.type = 'square';
      // We'll simulate randomness by using a non-musical rate
      wobbleLFO.frequency.value = '8t'; // Triplet timing for off-grid feel
    } else {
      wobbleLFO.type = char.shape;
    }

    // Set filter range
    wobbleLFO.min = char.filterMin;
    wobbleLFO.max = char.filterMax;
  }

  if (wobbleSynth) {
    // Set filter Q for resonance character
    wobbleSynth.filter.Q.value = char.filterQ;
  }

  console.log(`Wobble character set to: ${name}`);
}

/**
 * Get current wobble character name
 */
export function getWobbleCharacter() {
  return currentWobbleCharacter;
}

/**
 * Legacy: Set wobble LFO rate (for backwards compatibility)
 * @param {string} rate - '4n', '8n', or '16n'
 */
export function setWobbleRate(rate) {
  if (wobbleLFO) {
    wobbleLFO.frequency.value = rate;
  }
}

/**
 * Legacy: Get current wobble rate
 */
export function getWobbleRate() {
  if (wobbleLFO) {
    return wobbleLFO.frequency.value;
  }
  return '8n';
}

/**
 * Play chord (one shot on beat 1 of each bar)
 */
export function playChord() {
  if (!isInitialized || !chordSynth) return;

  const progression = CHORD_PROGRESSIONS[currentChordProgression];
  if (!progression) return;

  const chord = progression[currentChordIndex];
  chordSynth.triggerAttackRelease(chord, '2n', Tone.now(), 0.6);
  currentChordIndex = (currentChordIndex + 1) % progression.length;
}

/**
 * Set chord progression
 * @param {string} name - Progression name from CHORD_PROGRESSIONS
 */
export function setChordProgression(name) {
  if (CHORD_PROGRESSIONS[name]) {
    currentChordProgression = name;
    currentChordIndex = 0;
  }
}

/**
 * Get current chord progression name
 */
export function getChordProgression() {
  return currentChordProgression;
}

/**
 * Play lead note (cycling through phrase)
 * Uses voice stealing to prevent overlap artifacts
 */
export function playLead() {
  if (!isInitialized || !leadSynth) return;

  const phrase = LEAD_PHRASES[currentLeadPhrase];
  if (!phrase) return;

  const now = Tone.now();
  const note = phrase[leadNoteIndex];
  // Cut off any previous lead note to prevent overlap
  leadSynth.triggerRelease(now);
  leadSynth.triggerAttackRelease(note, '16n', now + 0.002, 0.7);
  leadNoteIndex = (leadNoteIndex + 1) % phrase.length;
}

/**
 * Set lead phrase
 * @param {string} name - Phrase name from LEAD_PHRASES
 */
export function setLeadPhrase(name) {
  if (LEAD_PHRASES[name]) {
    currentLeadPhrase = name;
    leadNoteIndex = 0;
  }
}

/**
 * Get current lead phrase name
 */
export function getLeadPhrase() {
  return currentLeadPhrase;
}

/**
 * Play arp note (based on current mode)
 * Uses voice stealing to prevent overlap artifacts
 */
export function playArp() {
  if (!isInitialized || !arpSynth) return;

  let note;
  const len = ARP_NOTES.length;

  switch (currentArpMode) {
    case 'Climb':
      // Ascending: C3 → Eb3 → G3 → Bb3 → C4 → repeat
      note = ARP_NOTES[arpNoteIndex];
      arpNoteIndex = (arpNoteIndex + 1) % len;
      break;

    case 'Fall':
      // Descending: C4 → Bb3 → G3 → Eb3 → C3 → repeat
      note = ARP_NOTES[len - 1 - arpNoteIndex];
      arpNoteIndex = (arpNoteIndex + 1) % len;
      break;

    case 'Scatter':
      // Random note each time
      note = ARP_NOTES[Math.floor(Math.random() * len)];
      break;

    case 'Cascade':
      // Ping-pong: up then down (C3→Eb3→G3→Bb3→C4→Bb3→G3→Eb3→repeat)
      note = ARP_NOTES[arpNoteIndex];
      arpNoteIndex += arpPingPongDirection;
      if (arpNoteIndex >= len - 1) {
        arpNoteIndex = len - 1;
        arpPingPongDirection = -1;
      } else if (arpNoteIndex <= 0) {
        arpNoteIndex = 0;
        arpPingPongDirection = 1;
      }
      break;

    case 'Skip':
      // Alternating intervals: 1st, 3rd, 5th, 2nd, 4th (indices: 0,2,4,1,3)
      const skipPattern = [0, 2, 4, 1, 3];
      note = ARP_NOTES[skipPattern[arpNoteIndex % skipPattern.length]];
      arpNoteIndex = (arpNoteIndex + 1) % skipPattern.length;
      break;

    case 'Shimmer':
      // Octave jumps: plays note then octave up (C3,C4,Eb3,Eb4,G3,G4...)
      const baseIndex = Math.floor(arpNoteIndex / 2) % (len - 1); // Skip last C4
      const isOctaveUp = arpNoteIndex % 2 === 1;
      const baseNote = ARP_NOTES[baseIndex];
      // Parse note and add octave if needed
      if (isOctaveUp) {
        const noteName = baseNote.slice(0, -1);
        const octave = parseInt(baseNote.slice(-1)) + 1;
        note = noteName + octave;
      } else {
        note = baseNote;
      }
      arpNoteIndex = (arpNoteIndex + 1) % ((len - 1) * 2);
      break;

    default:
      note = ARP_NOTES[0];
  }

  const now = Tone.now();
  // Cut off any previous arp note to prevent overlap
  arpSynth.triggerRelease(now);
  arpSynth.triggerAttackRelease(note, '16n', now + 0.002, 0.7);
}

/**
 * Set arp mode
 * @param {string} mode - One of ARP_MODES: 'Climb', 'Fall', 'Scatter', 'Cascade', 'Skip', 'Shimmer'
 */
export function setArpMode(mode) {
  if (ARP_MODES.includes(mode)) {
    currentArpMode = mode;
    arpNoteIndex = 0;
    arpPingPongDirection = 1; // Reset for Cascade mode
  }
}

/**
 * Get current arp mode
 */
export function getArpMode() {
  return currentArpMode;
}

// === STAB FUNCTIONS ===

/**
 * Play impact stab
 */
export function playImpact() {
  if (!isInitialized) return;

  const now = Tone.now();
  if (impactNoise) {
    impactNoise.triggerAttackRelease('8n', now, 0.8);
  }
  if (impactSynth) {
    impactSynth.triggerAttackRelease('C1', '4n', now, 1);
  }
  triggerSidechain();
}

/**
 * Play riser stab (2-bar sweep)
 */
export function playRiser() {
  if (!isInitialized || !riserSynth || !riserFilter) return;

  const now = Tone.now();
  const tempo = getTempo();
  const barDuration = (60 / tempo) * 4; // Duration of one bar in seconds
  const riserDuration = barDuration * 2; // 2 bars

  // Reset filter
  riserFilter.frequency.cancelScheduledValues(now);
  riserFilter.frequency.setValueAtTime(200, now);
  riserFilter.frequency.exponentialRampToValueAtTime(8000, now + riserDuration);

  riserSynth.triggerAttack(now, 0.5);
  riserSynth.triggerRelease(now + riserDuration);
}

/**
 * Stop riser immediately
 */
export function stopRiser() {
  if (!riserSynth) return;
  riserSynth.triggerRelease(Tone.now());
}

/**
 * Play laser stab (pitch-down sweep C5→C2)
 */
export function playLaser() {
  if (!isInitialized || !laserSynth) return;

  const now = Tone.now();
  // Trigger at C5 with longer duration for extended tail
  laserSynth.triggerAttackRelease('C5', '4n', now, 0.95);
  // Extended pitch sweep down to C2 (350ms)
  laserSynth.frequency.setValueAtTime(Tone.Frequency('C5').toFrequency(), now);
  laserSynth.frequency.exponentialRampToValueAtTime(
    Tone.Frequency('C2').toFrequency(),
    now + 0.35
  );
}

/**
 * Play reverse stab (swell-in effect with filter sweep)
 */
export function playReverse() {
  if (!isInitialized || !reverseSynth || !reverseFilter) return;

  const now = Tone.now();
  // Extended filter sweep UP during the attack (creates "sucking in" effect)
  reverseFilter.frequency.cancelScheduledValues(now);
  reverseFilter.frequency.setValueAtTime(200, now);
  reverseFilter.frequency.exponentialRampToValueAtTime(8000, now + 0.8);

  // Extended swell-in - fade IN then cut abruptly
  reverseSynth.triggerAttackRelease('2n', now, 0.9);
}

// === LAYER GAIN SYSTEM ===

/**
 * Update layer gain based on total layer count
 * Applies gain reduction to prevent clipping when multiple layers play
 * @param {number} layerCount - Number of active layers (1-3)
 */
export function updateLayerGains(layerCount) {
  if (!layerGain) return;

  currentLayerCount = Math.max(1, Math.min(3, layerCount));
  const gainDb = LAYER_GAIN_DB[currentLayerCount] || 0;
  const gainLinear = Math.pow(10, gainDb / 20);

  // Smooth transition to new gain
  layerGain.gain.rampTo(gainLinear, 0.05);

  console.log(`Layer gain updated: ${currentLayerCount} layers, ${gainDb}dB`);
}

/**
 * Get current layer count
 * @returns {number} Current layer count
 */
export function getCurrentLayerCount() {
  return currentLayerCount;
}

// === BUILD/DROP SYSTEM ===

/**
 * Set master highpass filter frequency (for tension)
 * @param {number} frequency - Filter frequency in Hz (20-2000)
 */
export function setMasterHighpass(frequency) {
  if (!masterHighpass) return;

  masterHighpass.frequency.rampTo(frequency, 0.05);
}

/**
 * Start snare roll at specified rate
 * @param {string} rate - '8n', '16n', or '32n'
 */
export function startSnareRoll(rate) {
  if (!isInitialized || !clapSynth) return;

  stopSnareRoll();

  snareRollLoop = new Tone.Loop((time) => {
    clapSynth.triggerAttackRelease('32n', time, 0.5);
  }, rate).start(0);
}

/**
 * Stop snare roll
 */
export function stopSnareRoll() {
  if (snareRollLoop) {
    snareRollLoop.stop();
    snareRollLoop.dispose();
    snareRollLoop = null;
  }
}

/**
 * Trigger drop effect (reset filter + impact)
 */
export function triggerDrop() {
  if (!isInitialized) return;

  // Reset filter
  setMasterHighpass(20);

  // Stop any riser
  stopRiser();

  // Stop snare roll
  stopSnareRoll();

  // Play impact
  playImpact();
}

// === RECORDING FUNCTIONS ===

/**
 * Start recording audio
 * @returns {boolean} True if recording started successfully
 */
export function startRecording() {
  if (!isInitialized || !recorder || isRecording) {
    console.warn('Cannot start recording: not ready or already recording');
    return false;
  }

  try {
    // Reset fade gain to full volume
    if (recordingFadeGain) {
      recordingFadeGain.gain.cancelScheduledValues(Tone.now());
      recordingFadeGain.gain.setValueAtTime(1, Tone.now());
    }

    recorder.start();
    isRecording = true;
    recordingBlob = null;
    console.log('Recording started');
    return true;
  } catch (error) {
    console.error('Failed to start recording:', error);
    return false;
  }
}

/**
 * Stop recording with optional graceful fade-out
 * @param {boolean} fadeOut - Whether to apply graceful fade-out
 * @returns {Promise<Blob|null>} The recorded audio blob, or null if failed
 */
export async function stopRecording(fadeOut = true) {
  if (!isInitialized || !recorder || !isRecording) {
    console.warn('Cannot stop recording: not recording');
    return null;
  }

  try {
    if (fadeOut && recordingFadeGain) {
      // Apply graceful fade-out
      const now = Tone.now();
      const fadeSeconds = RECORDING.fadeOutDurationMs / 1000;
      recordingFadeGain.gain.cancelScheduledValues(now);
      recordingFadeGain.gain.setValueAtTime(recordingFadeGain.gain.value, now);
      recordingFadeGain.gain.linearRampToValueAtTime(0, now + fadeSeconds);

      // Wait for fade to complete
      await new Promise(resolve => setTimeout(resolve, RECORDING.fadeOutDurationMs));
    }

    // Stop recorder and get blob
    recordingBlob = await recorder.stop();
    isRecording = false;

    // Reset fade gain back to full volume for live playback
    if (recordingFadeGain) {
      recordingFadeGain.gain.cancelScheduledValues(Tone.now());
      recordingFadeGain.gain.setValueAtTime(1, Tone.now());
    }

    console.log('Recording stopped, blob size:', recordingBlob?.size);
    return recordingBlob;
  } catch (error) {
    console.error('Failed to stop recording:', error);
    isRecording = false;
    return null;
  }
}

/**
 * Check if currently recording
 * @returns {boolean}
 */
export function getIsRecording() {
  return isRecording;
}

/**
 * Get the last recorded blob
 * @returns {Blob|null}
 */
export function getRecordingBlob() {
  return recordingBlob;
}

/**
 * Clear the recorded blob (for RE-DO)
 */
export function clearRecording() {
  recordingBlob = null;
}

/**
 * Download the recorded audio
 * @param {string} filename - Optional filename (default: 'onyx-pulse-track.webm')
 */
export function downloadRecording(filename = 'onyx-pulse-track.webm') {
  if (!recordingBlob) {
    console.warn('No recording to download');
    return;
  }

  const url = URL.createObjectURL(recordingBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log('Recording downloaded:', filename);
}

/**
 * Cleanup audio engine
 */
export function disposeAudio() {
  disposeClock();
  stopSnareRoll();

  const synths = [
    kickSynth, hatSynth, clapSynth, subSynth, percSynth,
    wobbleSynth, chordSynth, leadSynth, arpSynth,
    impactSynth, impactNoise, riserSynth, laserSynth, reverseSynth,
  ];

  const filters = [hatFilter, clapFilter, riserFilter, reverseFilter, masterHighpass];
  const other = [wobbleLFO, sidechainGain, masterCompressor, masterLimiter, layerGain, recordingFadeGain, recorder];

  [...synths, ...filters, ...other].forEach(node => {
    if (node) {
      node.dispose();
    }
  });

  kickSynth = null;
  hatSynth = null;
  hatFilter = null;
  clapSynth = null;
  clapFilter = null;
  subSynth = null;
  percSynth = null;
  wobbleSynth = null;
  wobbleLFO = null;
  chordSynth = null;
  leadSynth = null;
  arpSynth = null;
  impactSynth = null;
  impactNoise = null;
  riserSynth = null;
  riserFilter = null;
  laserSynth = null;
  reverseSynth = null;
  reverseFilter = null;
  masterHighpass = null;
  sidechainGain = null;
  masterCompressor = null;
  masterLimiter = null;
  layerGain = null;
  recordingFadeGain = null;
  recorder = null;

  isInitialized = false;
  currentLayerCount = 1;
  subNoteIndex = 0;
  percPitchIndex = 0;
  leadNoteIndex = 0;
  arpNoteIndex = 0;
  isRecording = false;
  recordingBlob = null;
  subIsPlaying = false;
  currentSubCharacter = 'Deep';
  currentWobbleCharacter = 'Smooth';
}
