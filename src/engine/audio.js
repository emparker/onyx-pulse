import * as Tone from 'tone';
import {
  C_MINOR_BASS,
  PERC_PITCHES,
  CHORD_PROGRESSIONS,
  LEAD_PHRASES,
  ARP_NOTES,
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
let isInitialized = false;

// Note indices for cycling through scales/patterns
let subNoteIndex = 0;
let percPitchIndex = 0;
let leadNoteIndex = 0;
let arpNoteIndex = 0;
let arpDirection = 1; // 1 = up, -1 = down

// Pattern state
let wobbleRate = '8n'; // Current wobble LFO rate
let currentChordProgression = 'i-VI-III-VII';
let currentChordIndex = 0;
let currentLeadPhrase = 'Hook 1';
let currentArpMode = 'Up'; // Up, Down, Random

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

    // Master highpass filter for build/drop system
    masterHighpass = new Tone.Filter({
      frequency: 20,
      type: 'highpass',
      rolloff: -24,
    }).connect(masterLimiter);

    // === SIDECHAIN GAIN ===
    // All non-kick sounds route through this for the "pump" effect
    sidechainGain = new Tone.Gain(1).connect(masterHighpass);

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
    }).connect(masterHighpass); // Kick bypasses sidechain

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

    // === PERC SYNTH (Tuned percussion, cycling pitches) ===
    percSynth = new Tone.MembraneSynth({
      pitchDecay: 0.02,
      octaves: 2,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.15,
        sustain: 0,
        release: 0.1,
      },
    }).connect(sidechainGain);

    percSynth.volume.value = -8;

    // === SUB SYNTH (Sub bass with filter) ===
    subSynth = new Tone.MonoSynth({
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

    subSynth.volume.value = -6;

    // === WOBBLE SYNTH (Dubstep bass with LFO) ===
    wobbleSynth = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: {
        Q: 6,
        type: 'lowpass',
        rolloff: -24,
      },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.8,
        release: 0.3,
      },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: 0.3,
        baseFrequency: 200,
        octaves: 3,
      },
    }).connect(sidechainGain);

    wobbleSynth.volume.value = -8;

    // LFO for wobble filter modulation
    wobbleLFO = new Tone.LFO({
      frequency: '8n',
      min: 100,
      max: 2000,
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

    chordSynth.volume.value = -12;

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
 * Play perc (cycling through pitches)
 */
export function playPerc() {
  if (!isInitialized || !percSynth) return;

  const pitch = PERC_PITCHES[percPitchIndex];
  percSynth.triggerAttackRelease(pitch, '16n', Tone.now(), 0.7);
  percPitchIndex = (percPitchIndex + 1) % PERC_PITCHES.length;
}

/**
 * Play sub bass note (cycles through C-minor pentatonic)
 */
export function playSub() {
  if (!isInitialized || !subSynth) return;

  const note = C_MINOR_BASS[subNoteIndex];
  subSynth.triggerAttackRelease(note, '8n', Tone.now(), 0.8);
  subNoteIndex = (subNoteIndex + 1) % C_MINOR_BASS.length;
}

/**
 * Reset sub note index (e.g., on pattern restart)
 */
export function resetSubPattern() {
  subNoteIndex = 0;
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
  wobbleSynth.triggerAttack('C2', Tone.now(), 0.7);
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
 * Set wobble LFO rate
 * @param {string} rate - '4n', '8n', or '16n'
 */
export function setWobbleRate(rate) {
  wobbleRate = rate;
  if (wobbleLFO) {
    wobbleLFO.frequency.value = rate;
  }
}

/**
 * Get current wobble rate
 */
export function getWobbleRate() {
  return wobbleRate;
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
 */
export function playLead() {
  if (!isInitialized || !leadSynth) return;

  const phrase = LEAD_PHRASES[currentLeadPhrase];
  if (!phrase) return;

  const note = phrase[leadNoteIndex];
  leadSynth.triggerAttackRelease(note, '16n', Tone.now(), 0.7);
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
 */
export function playArp() {
  if (!isInitialized || !arpSynth) return;

  let note;
  switch (currentArpMode) {
    case 'Up':
      note = ARP_NOTES[arpNoteIndex];
      arpNoteIndex = (arpNoteIndex + 1) % ARP_NOTES.length;
      break;
    case 'Down':
      note = ARP_NOTES[ARP_NOTES.length - 1 - arpNoteIndex];
      arpNoteIndex = (arpNoteIndex + 1) % ARP_NOTES.length;
      break;
    case 'Random':
      note = ARP_NOTES[Math.floor(Math.random() * ARP_NOTES.length)];
      break;
    default:
      note = ARP_NOTES[0];
  }

  arpSynth.triggerAttackRelease(note, '16n', Tone.now(), 0.7);
}

/**
 * Set arp mode
 * @param {string} mode - 'Up', 'Down', or 'Random'
 */
export function setArpMode(mode) {
  if (['Up', 'Down', 'Random'].includes(mode)) {
    currentArpMode = mode;
    arpNoteIndex = 0;
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
  const other = [wobbleLFO, sidechainGain, masterCompressor, masterLimiter];

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

  isInitialized = false;
  subNoteIndex = 0;
  percPitchIndex = 0;
  leadNoteIndex = 0;
  arpNoteIndex = 0;
}
