// All magic numbers live HERE — do not scatter throughout codebase

// === PHYSICS ===
export const MARBLE_RADIUS = 12;
export const MARBLE_RESTITUTION = 0.85;
export const MARBLE_FRICTION = 0.01;
export const MAX_MARBLES = 100;
export const MAX_WALLS = 10;
export const MAX_VELOCITY = 15;
export const BOUNDARY_SEGMENTS = 36;
export const BOUNDARY_THICKNESS = 40;
export const SPAWN_VELOCITY_VARIANCE = 2;

// Walls - physics body is thick for collision, visual is thin
export const WALL_PHYSICS_THICKNESS = 24;
export const WALL_VISUAL_THICKNESS = 4;
export const WALL_MIN_LENGTH = 30;
export const WALL_RESTITUTION = 0.9;

// Gravity
export const GRAVITY_STRENGTH = 1;
export const GRAVITY_LERP_FACTOR = 0.1;

// Rendering
export const GLOW_BLUR = 15;
export const TRAIL_DECAY = 0.92;

// Pentatonic scale frequencies (C-Major) — THE scale (do not modify)
export const PENTATONIC_SCALE = [
  261.63,  // C4
  293.66,  // D4
  329.63,  // E4
  392.00,  // G4
  440.00,  // A4
  523.25,  // C5
  587.33,  // D5
  659.25,  // E5
];

// === COLOR SYSTEM — "Neon Noir" ===

export const COLORS = {
  // === WORLD (The Void) ===
  background: {
    core: '#030308',      // Abyss - deepest point
    mid: '#050510',       // Deep space - primary
    edge: '#0a1628',      // Horizon - outer gradient
    atmosphere: '#061018', // Faint ambient haze
  },

  boundary: {
    idle: '#0a3d4a',      // Dim cyan - containment field
    pulse: '#0f5266',     // Muted teal - subtle pulse
    flash: '#00d4ff',     // Bright cyan - collision
  },

  // === MARBLES ===
  marble: {
    cyan:       { core: '#00ffff', glow: '#0a3d4a' },
    indigo:     { core: '#6366f1', glow: '#312e81' },
    chartreuse: { core: '#a3e635', glow: '#3f6212' },
    orange:     { core: '#f97316', glow: '#7c2d12' },
  },

  // Velocity-based color mapping (slow → fast)
  marbleByVelocity: ['#6366f1', '#00ffff', '#a3e635', '#f97316'],

  // === WALLS (Force Fields) ===
  wall: {
    preview: '#ffffff',   // Ghost white during drawing
    previewOpacity: 0.35, // 35% opacity for preview
    placed: '#94a3b8',    // Steel blue - structural
    glow: '#475569',      // Subtle glow
    flash: '#f8fafc',     // Bright white - collision
  },

  // === EFFECTS ===
  burst: {
    core: '#ffffff',
    boundary: '#00ffff',  // Marble ↔ Boundary
    wall: '#f8fafc',      // Marble ↔ Wall
    // Marble ↔ Marble uses blend of both marble colors
  },

  trail: {
    opacityFresh: 0.4,
    opacityMid: 0.2,
    opacityOld: 0.08,
  },

  // === UI ===
  ui: {
    textPrimary: '#e2e8f0',
    textSecondary: '#94a3b8',
    iconIdle: '#64748b',
    iconActive: '#fbbf24',
    recording: '#ef4444',
    success: '#22c55e',
  },
};

// Convenience exports for marble colors (array for random selection)
export const MARBLE_COLORS = [
  COLORS.marble.cyan,
  COLORS.marble.indigo,
  COLORS.marble.chartreuse,
  COLORS.marble.orange,
];
