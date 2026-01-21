// All magic numbers live HERE — do not scatter throughout codebase

// === TEMPO / CLOCK ===
export const TEMPO_BPM = 128;
export const STEPS_PER_BAR = 16; // 16th notes per bar
export const BEATS_PER_BAR = 4;

// === SEQUENCER LAYOUT ===
export const LANE_HEIGHT = 55;      // Height of each lane in pixels (reduced from 70 for tabbed UI)
export const STEP_WIDTH = 0;        // 0 = auto-calculate based on screen width
export const PLAYHEAD_WIDTH = 4;    // Width of playhead line
export const TRIGGER_RADIUS = 10;   // Radius of trigger circles (reduced slightly)
export const LANE_PADDING = 20;     // Padding around lanes
export const HEADER_WIDTH = 60;     // Width of lane header (for tap detection)
export const STAB_BUTTON_SIZE = 56; // Size of stab buttons
export const STAB_BAR_HEIGHT = 100; // Height of stab button bar (2x2 grid)

// === CATEGORY SYSTEM ===
export const CATEGORIES = {
  drums: { name: 'DRUMS', color: '#f97316' },
  bass: { name: 'BASS', color: '#a855f7' },
  melodic: { name: 'MELODIC', color: '#22d3ee' },
};

export const CATEGORY_ORDER = ['drums', 'bass', 'melodic'];

// === LANE TYPES ===
// grid: 16-step tap-to-toggle (standard)
// pattern: tap header to cycle pre-made patterns
export const LANE_TYPES = {
  grid: 'grid',
  pattern: 'pattern',
};

// === LANE CONFIGURATION ===
export const LANES = {
  // DRUMS category
  kick: {
    name: 'KICK',
    color: { core: '#f97316', glow: '#7c2d12' },
    synth: 'kick',
    type: 'grid',
    category: 'drums',
  },
  hat: {
    name: 'HAT',
    color: { core: '#00ffff', glow: '#0a3d4a' },
    synth: 'hat',
    type: 'grid',
    category: 'drums',
  },
  clap: {
    name: 'CLAP',
    color: { core: '#f8fafc', glow: '#64748b' },
    synth: 'clap',
    type: 'grid',
    category: 'drums',
  },
  perc: {
    name: 'PERC',
    color: { core: '#fbbf24', glow: '#78350f' },
    synth: 'perc',
    type: 'grid',
    category: 'drums',
  },
  // BASS category
  sub: {
    name: 'SUB',
    color: { core: '#a855f7', glow: '#581c87' },
    synth: 'sub',
    type: 'grid',
    category: 'bass',
  },
  wobble: {
    name: 'WOBBLE',
    color: { core: '#ec4899', glow: '#831843' },
    synth: 'wobble',
    type: 'pattern',
    category: 'bass',
    patterns: ['1/4', '1/8', '1/16'],
    defaultPattern: 1, // 1/8
  },
  // MELODIC category
  chord: {
    name: 'CHORD',
    color: { core: '#22d3ee', glow: '#164e63' },
    synth: 'chord',
    type: 'pattern',
    category: 'melodic',
    patterns: ['i-VI-III-VII', 'i-VII-VI-VII', 'i-i-VI-VII'],
    defaultPattern: 0,
  },
  lead: {
    name: 'LEAD',
    color: { core: '#4ade80', glow: '#14532d' },
    synth: 'lead',
    type: 'pattern',
    category: 'melodic',
    patterns: ['Hook 1', 'Hook 2', 'Hook 3'],
    defaultPattern: 0,
  },
  arp: {
    name: 'ARP',
    color: { core: '#f472b6', glow: '#831843' },
    synth: 'arp',
    type: 'pattern',
    category: 'melodic',
    patterns: ['Up', 'Down', 'Random'],
    defaultPattern: 0,
  },
};

// Lanes per category
export const LANES_BY_CATEGORY = {
  drums: ['kick', 'hat', 'clap', 'perc'],
  bass: ['sub', 'wobble'],
  melodic: ['chord', 'lead', 'arp'],
};

// All lanes in order (for backwards compatibility)
export const LANE_ORDER = ['kick', 'hat', 'clap', 'perc', 'sub', 'wobble', 'chord', 'lead', 'arp'];

// Grid-type lanes only (for step sequencer logic)
export const GRID_LANES = ['kick', 'hat', 'clap', 'perc', 'sub'];

// Pattern-type lanes (for pattern cycling logic)
export const PATTERN_LANES = ['wobble', 'chord', 'lead', 'arp'];

// Progressive unlock thresholds (number of triggers to unlock each lane)
// All lanes start unlocked for better UX
export const UNLOCK_THRESHOLDS = {
  kick: 0,
  hat: 0,
  clap: 0,
  perc: 0,
  sub: 0,
  wobble: 0,
  chord: 0,
  lead: 0,
  arp: 0,
};

// Tempo range
export const TEMPO_MIN = 80;
export const TEMPO_MAX = 160;
export const TEMPO_STEP = 4;

// === RENDERING ===
export const GLOW_BLUR = 8;

// === AUDIO ===
// C-Minor Pentatonic scale for sub bass notes
export const C_MINOR_BASS = ['C2', 'Eb2', 'F2', 'G2', 'Bb2'];

// Legacy alias for backwards compatibility
export const F_MINOR_BASS = C_MINOR_BASS;

// Perc pitches (cycling)
export const PERC_PITCHES = ['F3', 'C3', 'G3', 'D3'];

// Chord progressions in C minor
export const CHORD_PROGRESSIONS = {
  'i-VI-III-VII': [
    ['C3', 'Eb3', 'G3'],      // Cm (i)
    ['Ab2', 'C3', 'Eb3'],     // Ab (VI)
    ['Eb3', 'G3', 'Bb3'],     // Eb (III)
    ['Bb2', 'D3', 'F3'],      // Bb (VII)
  ],
  'i-VII-VI-VII': [
    ['C3', 'Eb3', 'G3'],      // Cm (i)
    ['Bb2', 'D3', 'F3'],      // Bb (VII)
    ['Ab2', 'C3', 'Eb3'],     // Ab (VI)
    ['Bb2', 'D3', 'F3'],      // Bb (VII)
  ],
  'i-i-VI-VII': [
    ['C3', 'Eb3', 'G3'],      // Cm (i)
    ['C3', 'Eb3', 'G3'],      // Cm (i)
    ['Ab2', 'C3', 'Eb3'],     // Ab (VI)
    ['Bb2', 'D3', 'F3'],      // Bb (VII)
  ],
};

// Lead phrases (C minor pentatonic: C, Eb, F, G, Bb)
export const LEAD_PHRASES = {
  'Hook 1': ['C4', 'Eb4', 'G4', 'Eb4', 'C4', 'G4', 'F4', 'Eb4'],
  'Hook 2': ['G4', 'F4', 'Eb4', 'C4', 'Eb4', 'F4', 'G4', 'Bb4'],
  'Hook 3': ['Eb4', 'G4', 'Bb4', 'G4', 'F4', 'Eb4', 'C4', 'Eb4'],
};

// Arp notes (Cm7 arpeggio)
export const ARP_NOTES = ['C3', 'Eb3', 'G3', 'Bb3', 'C4'];

// === STAB FX ===
// Layout: 2x2 grid - top row (instant hits), bottom row (sweeps/builds)
export const STABS = {
  laser: {
    name: 'LASER',
    color: '#facc15',
  },
  impact: {
    name: 'IMPACT',
    color: '#ef4444',
  },
  reverse: {
    name: 'REVERSE',
    color: '#8b5cf6',
  },
  riser: {
    name: 'RISER',
    color: '#06b6d4',
  },
};

// Grid positions: [0]=top-left, [1]=top-right, [2]=bottom-left, [3]=bottom-right
export const STAB_ORDER = ['laser', 'impact', 'reverse', 'riser'];

// === BUILD/DROP SYSTEM ===
export const BUILD_DROP = {
  tensionMin: 0,
  tensionMax: 100,
  filterMinHz: 20,
  filterMaxHz: 2000,
  kickMuteThreshold: 75, // Mute kick above this tension %
  snareRollThresholds: {
    0: null,     // No roll
    40: '8n',    // 1/8 notes
    65: '16n',   // 1/16 notes
    85: '32n',   // 1/32 notes
  },
};

// Max velocity for audio calculations
export const MAX_VELOCITY = 15;

// === LAYER SYSTEM ===
export const MAX_LAYERS = 2;
export const LAYER_INDICATOR_RADIUS = 8;
export const LAYER_INDICATOR_SPACING = 20;

// === UNIFIED CONTROL STRIP (replaces separate rows) ===
export const CONTROL_STRIP_HEIGHT = 56;
// Gain reduction per layer count (in dB) to prevent clipping
export const LAYER_GAIN_DB = {
  1: 0,     // Single layer: full volume
  2: -3,    // Two layers: -3dB each
};

// === RECORDING SYSTEM ===
export const RECORDING = {
  maxDurationMs: 60000,       // 60 seconds max
  fadeOutDurationMs: 2000,    // 2 second graceful fade
  warningThresholdMs: 10000,  // Flash faster at 10 seconds remaining
};

// Recording states
export const RECORDING_STATE = {
  IDLE: 'idle',
  RECORDING: 'recording',
  ENDING: 'ending',      // During fade-out
  COMPLETE: 'complete',  // Showing RE-DO / DOWNLOAD
};

// === COLOR SYSTEM — "Neon Noir" ===
export const COLORS = {
  // === WORLD (The Void) ===
  background: {
    core: '#030308',      // Abyss - deepest point
    mid: '#050510',       // Deep space - primary
    edge: '#0a1628',      // Horizon - outer gradient
    atmosphere: '#061018', // Faint ambient haze
  },

  // === PLAYHEAD ===
  playhead: {
    line: '#ffffff',
    glow: '#00ffff',
    trail: 'rgba(0, 255, 255, 0.3)',
  },

  // === GRID ===
  grid: {
    line: 'rgba(255, 255, 255, 0.1)',      // Vertical step dividers
    beatLine: 'rgba(255, 255, 255, 0.2)',  // Quarter note dividers
    laneDivider: 'rgba(255, 255, 255, 0.15)', // Horizontal lane dividers
  },

  // === TRIGGERS ===
  trigger: {
    inactive: 'rgba(255, 255, 255, 0.15)', // Empty step
    active: null, // Uses lane color
    hit: '#ffffff', // Flash when played
  },

  // === EFFECTS ===
  burst: {
    core: '#ffffff',
  },

  // === UI ===
  ui: {
    textPrimary: '#e2e8f0',
    textSecondary: '#94a3b8',
    laneName: 'rgba(255, 255, 255, 0.6)',
  },

  // === LAYER INDICATORS ===
  layer: {
    empty: 'rgba(255, 255, 255, 0.2)',      // ○ Empty slot
    active: '#22d3ee',                       // ● Active (cyan)
    locked: '#f97316',                       // ◆ Locked (orange)
    lockBuildButton: '#22d3ee',              // LOCK+BUILD button
    lockBuildDisabled: '#4a5568',            // Disabled button
  },

  // === RECORDING ===
  recording: {
    idle: 'rgba(255, 255, 255, 0.6)',       // White outline when idle
    active: '#ef4444',                       // Red when recording
    pulse: '#ff6b6b',                        // Lighter red for pulse
  },
};
