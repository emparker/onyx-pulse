// All magic numbers live HERE — do not scatter throughout codebase

// === TEMPO / CLOCK ===
export const TEMPO_BPM = 128;
export const STEPS_PER_BAR = 16; // 16th notes per bar
export const BEATS_PER_BAR = 4;

// === SEQUENCER LAYOUT ===
export const LANE_HEIGHT = 70;      // Height of each lane in pixels
export const STEP_WIDTH = 0;        // 0 = auto-calculate based on screen width
export const PLAYHEAD_WIDTH = 4;    // Width of playhead line
export const TRIGGER_RADIUS = 12;   // Radius of trigger circles
export const LANE_PADDING = 20;     // Padding around lanes

// === LANE CONFIGURATION ===
export const LANES = {
  kick: {
    name: 'KICK',
    color: { core: '#f97316', glow: '#7c2d12' },
    synth: 'kick',
  },
  hat: {
    name: 'HAT',
    color: { core: '#00ffff', glow: '#0a3d4a' },
    synth: 'hat',
  },
  clap: {
    name: 'CLAP',
    color: { core: '#f8fafc', glow: '#64748b' },
    synth: 'clap',
  },
  bass: {
    name: 'BASS',
    color: { core: '#a855f7', glow: '#581c87' },
    synth: 'bass',
  },
};

// Order lanes appear (top to bottom)
export const LANE_ORDER = ['kick', 'hat', 'clap', 'bass'];

// Progressive unlock thresholds (number of triggers to unlock each lane)
export const UNLOCK_THRESHOLDS = {
  kick: 0,   // Always unlocked
  hat: 4,    // Unlock after 4 triggers
  clap: 8,   // Unlock after 8 triggers
  bass: 12,  // Unlock after 12 triggers
};

// Tempo range
export const TEMPO_MIN = 80;
export const TEMPO_MAX = 160;
export const TEMPO_STEP = 4;

// === RENDERING ===
export const GLOW_BLUR = 8;

// === AUDIO ===
// F-Minor Pentatonic scale for bass notes
export const F_MINOR_BASS = ['F2', 'Ab2', 'Bb2', 'C3', 'Eb3'];

// Max velocity for audio calculations
export const MAX_VELOCITY = 15;

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
};
