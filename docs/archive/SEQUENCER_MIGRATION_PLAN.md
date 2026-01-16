# Onyx Pulse: Sequencer Migration Plan

> Migrating from physics-based marble bounce to a lane-based step sequencer

---

## Executive Summary

**Current State**: Marbles bounce chaotically, triggering sounds on collision. Visually interesting but musically unpredictable.

**Target State**: Horizontal lanes with a playhead. Users tap to place triggers. Sounds play exactly on beat. Music emerges from intentional patterns.

**Outcome**: Simpler codebase (~73% less code), guaranteed musical timing, clearer user mental model.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [What We Remove](#2-what-we-remove)
3. [What We Keep](#3-what-we-keep)
4. [What We Build](#4-what-we-build)
5. [Phase 1: Core Sequencer](#5-phase-1-core-sequencer)
6. [Phase 2: Visual Polish](#6-phase-2-visual-polish)
7. [Phase 3: Extended Features](#7-phase-3-extended-features)
8. [File-by-File Checklist](#8-file-by-file-checklist)
9. [Testing Protocol](#9-testing-protocol)
10. [Rollback Plan](#10-rollback-plan)

---

## 1. Architecture Overview

### Before (Physics Model)

```
User Tap
    ↓
Spawn Marble (random velocity)
    ↓
Matter.js Physics Simulation (every frame)
    ↓
Collision Detection
    ↓
Audio Trigger (unpredictable timing)
```

### After (Sequencer Model)

```
User Tap
    ↓
Toggle Grid Cell (lane + step)
    ↓
Clock Tick (every 16th note, ~117ms at 128 BPM)
    ↓
Check Grid → Trigger Sounds (perfect timing)
```

### New Mental Model

```
┌─────────────────────────────────────────────────────────────┐
│  STEP:   1   2   3   4   5   6   7   8   ... 16            │
│  ────────────────────────────────────────────────           │
│  KICK:   ●   ○   ○   ○   ●   ○   ○   ○   ... ○    ← tap to │
│  HAT:    ●   ○   ●   ○   ●   ○   ●   ○   ... ○      toggle │
│  CLAP:   ○   ○   ○   ○   ●   ○   ○   ○   ... ○             │
│  BASS:   ●   ○   ○   ●   ○   ○   ●   ○   ... ○             │
│          ▲                                                  │
│          └── playhead (moves right, loops)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. What We Remove

### Files to Delete

| File | Lines | Reason |
|------|-------|--------|
| `src/engine/physics.js` | ~240 | No more Matter.js physics |
| `src/hooks/usePhysicsWorld.js` | ~180 | No more physics state management |
| `src/components/Controls/WallDrawer.jsx` | ~150 | No more wall drawing |
| `src/components/Controls/GravityController.jsx` | ~80 | No more gravity control |
| `src/components/Canvas/TrailLayer.jsx` | ~120 | No more marble trails |
| `src/hooks/useDeviceMotion.js` | ~60 | No more accelerometer |

**Total removed: ~830 lines**

### Dependencies to Remove

```json
// package.json - remove from dependencies:
"matter-js": "^0.20.0"
```

### Constants to Remove

From `src/engine/constants.js`:
- `MARBLE_RADIUS`
- `MARBLE_RESTITUTION`
- `MARBLE_FRICTION`
- `MAX_MARBLES`
- `BOUNDARY_SEGMENTS`
- `BOUNDARY_THICKNESS`
- `SPAWN_VELOCITY_VARIANCE`
- `WALL_*` constants
- `GRAVITY_*` constants
- `TRAIL_DECAY`
- `MARBLE_COLORS` (replace with lane colors)
- `MARBLE_TYPE_CONFIG` (replace with lane config)

---

## 3. What We Keep

### Files to Keep (Unchanged or Minor Edits)

| File | Status | Notes |
|------|--------|-------|
| `src/main.jsx` | Keep as-is | Entry point unchanged |
| `src/App.jsx` | Minor edit | Render SequencerCanvas instead |
| `src/engine/clock.js` | Keep as-is | Already perfect for sequencer |
| `src/engine/audio.js` | Minor edit | Add hat, clap, bass synths |
| `src/hooks/useAudioEngine.js` | Minor edit | Expose new synth triggers |
| `src/components/Canvas/GlowBurst.jsx` | Keep | Repurpose for trigger hit effects |
| `src/utils/math.js` | Keep as-is | Utility functions still useful |
| `src/styles/globals.css` | Keep as-is | Base styles unchanged |

### Constants to Keep

From `src/engine/constants.js`:
- `TEMPO_BPM` (128)
- `GRID_RESOLUTION` (16)
- `BEATS_PER_BAR` (4)
- `MarbleType` → rename to `LaneType`
- `GLOW_BLUR`
- `COLORS.background.*`
- `COLORS.ui.*`
- `PENTATONIC_SCALE` / `F_MINOR_FULL`

---

## 4. What We Build

### New Files

| File | Purpose | Est. Lines |
|------|---------|------------|
| `src/engine/sequencer.js` | Grid state, playhead logic | ~100 |
| `src/hooks/useSequencer.js` | React wrapper for sequencer | ~80 |
| `src/components/Canvas/SequencerCanvas.jsx` | Main render + interaction | ~250 |
| `src/components/Canvas/LaneRenderer.jsx` | Draw individual lanes | ~100 |
| `src/components/Canvas/PlayheadRenderer.jsx` | Draw playhead + trail | ~60 |

**Total new: ~590 lines**

### New Constants

```javascript
// Lane configuration
export const LANES = {
  kick: { color: '#f97316', name: 'KICK', synth: 'kick' },
  hat:  { color: '#00ffff', name: 'HAT',  synth: 'hat' },
  clap: { color: '#ffffff', name: 'CLAP', synth: 'clap' },
  bass: { color: '#a855f7', name: 'BASS', synth: 'bass' },
};

export const LANE_ORDER = ['kick', 'hat', 'clap', 'bass'];
export const STEPS_PER_BAR = 16;
export const LANE_HEIGHT = 60;  // pixels
export const STEP_WIDTH = 40;   // pixels
export const PLAYHEAD_WIDTH = 4;
```

---

## 5. Phase 1: Core Sequencer

**Goal**: Playable step sequencer with 4 lanes. Tap to toggle. Sounds play on beat.

### Step 1.1: Create Sequencer Engine

**File**: `src/engine/sequencer.js`

```javascript
// Core state
let grid = {
  kick: new Array(16).fill(0),
  hat:  new Array(16).fill(0),
  clap: new Array(16).fill(0),
  bass: new Array(16).fill(0),
};
let playhead = 0;
let stepListeners = [];

// API
export function initSequencer() { /* reset grid, playhead */ }
export function toggleStep(lane, step) { /* flip 0↔1 */ }
export function getGrid() { /* return current grid */ }
export function getPlayhead() { /* return current position */ }
export function onStep(callback) { /* subscribe to step events */ }
export function advancePlayhead() { /* move playhead, notify listeners */ }
export function disposeSequencer() { /* cleanup */ }
```

### Step 1.2: Update Clock Integration

**File**: `src/engine/clock.js`

Modify beat emission to emit on **16th notes** (not quarter notes):

```javascript
// Change from '4n' to '16n'
Tone.Transport.scheduleRepeat((time) => {
  // ... emit step event
}, '16n');
```

### Step 1.3: Add Missing Synths

**File**: `src/engine/audio.js`

Add synths for hat, clap, bass (we already have kick):

```javascript
// HAT - metallic tick
let hatSynth = new Tone.MetalSynth({
  frequency: 200,
  envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 4000,
  octaves: 1.5,
});

// CLAP - noise burst
let clapSynth = new Tone.NoiseSynth({
  noise: { type: 'white' },
  envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.1 },
});
let clapFilter = new Tone.Filter({ frequency: 2500, type: 'bandpass', Q: 2 });

// BASS - sub bass
let bassSynth = new Tone.MonoSynth({
  oscillator: { type: 'square' },
  envelope: { attack: 0.005, decay: 0.2, sustain: 0.4, release: 0.3 },
  filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.3, baseFrequency: 100, octaves: 2 },
});
```

Export trigger functions:
```javascript
export function playHat() { /* trigger hat */ }
export function playClap() { /* trigger clap */ }
export function playBass(note) { /* trigger bass with note */ }
```

### Step 1.4: Create Sequencer Hook

**File**: `src/hooks/useSequencer.js`

```javascript
export function useSequencer() {
  // Initialize on mount
  // Subscribe to clock for playhead advance
  // Return: { grid, playhead, toggleStep, isPlaying }
}
```

### Step 1.5: Create Sequencer Canvas

**File**: `src/components/Canvas/SequencerCanvas.jsx`

```javascript
export function SequencerCanvas() {
  const { grid, playhead, toggleStep } = useSequencer();
  const { triggerKick, triggerHat, triggerClap, triggerBass } = useAudioEngine();

  // Render loop: draw lanes, triggers, playhead
  // Handle taps: determine lane + step, call toggleStep
  // On playhead advance: trigger sounds for active steps
}
```

### Step 1.6: Update App.jsx

```javascript
// Replace PhysicsCanvas with SequencerCanvas
import { SequencerCanvas } from './components/Canvas/SequencerCanvas.jsx';

export default function App() {
  return (
    <div className="w-full h-full">
      <SequencerCanvas />
    </div>
  );
}
```

### Step 1.7: Remove Old Files

Delete physics-related files (see Section 2).

### Phase 1 Exit Criteria

- [ ] 4 lanes visible (kick, hat, clap, bass)
- [ ] Playhead moves left-to-right, loops every bar
- [ ] Tap on lane toggles trigger at that step
- [ ] Sounds play exactly when playhead crosses active triggers
- [ ] All 4 instruments produce distinct sounds
- [ ] 60fps rendering maintained

---

## 6. Phase 2: Visual Polish

**Goal**: Make it beautiful. Lanes feel alive, hits feel impactful.

### Step 2.1: Lane Idle Animation

- Subtle glow/pulse on each lane (breathing effect)
- Differentiated colors per lane
- Lane labels with instrument names

### Step 2.2: Trigger Hit Effects

- Bright flash when playhead crosses active trigger
- Ripple/burst effect (reuse GlowBurst)
- Trigger marker grows briefly on hit

### Step 2.3: Sidechain Visual

- When kick fires, other lanes briefly dim/compress
- Creates visual "pump" matching audio sidechain

### Step 2.4: Playhead Trail

- Playhead leaves fading trail behind it
- Trail color matches most recent hit

### Step 2.5: Background Response

- Background subtly pulses on downbeat (beat 1)
- Overall brightness responds to density of hits

### Phase 2 Exit Criteria

- [ ] Lanes have distinct, vibrant colors
- [ ] Active triggers visually "pop" when hit
- [ ] Sidechain pump visible on kick hits
- [ ] Playhead has smooth trail effect
- [ ] Overall aesthetic matches "Neon Noir" theme

---

## 7. Phase 3: Extended Features

**Goal**: Depth for power users without complicating basics.

### Step 3.1: Progressive Lane Unlock

- Start with only KICK lane visible
- After placing 4 triggers, HAT lane fades in
- Continue unlocking CLAP, then BASS
- Keeps first experience focused

### Step 3.2: Pattern Variations

- Long-press on trigger = accent (louder hit)
- Double-tap lane header = mute/unmute lane
- Swipe lane = clear all triggers in lane

### Step 3.3: Multiple Bars

- Allow 2-bar or 4-bar patterns
- Visual indicator of current bar
- Scroll or zoom to see full pattern

### Step 3.4: Bass Note Selection

- Bass lane triggers can have different notes
- Vertical position within lane = pitch
- Or: cycle through scale notes on repeated taps

### Step 3.5: Tempo Control

- Tap BPM display to adjust tempo
- Range: 80-160 BPM
- Smooth tempo transitions

### Step 3.6: Share/Export (Deferred)

- Encode pattern to URL
- Export audio (Tone.Recorder)
- This was already deferred in original spec

### Phase 3 Exit Criteria

- [ ] New users see simplified single-lane experience
- [ ] Power users can access all 4 lanes
- [ ] At least one interaction enhancement (accent or mute)
- [ ] Bass has melodic variation

---

## 8. File-by-File Checklist

### Files to DELETE

- [ ] `src/engine/physics.js`
- [ ] `src/hooks/usePhysicsWorld.js`
- [ ] `src/hooks/useDeviceMotion.js`
- [ ] `src/components/Controls/WallDrawer.jsx`
- [ ] `src/components/Controls/GravityController.jsx`
- [ ] `src/components/Canvas/TrailLayer.jsx`
- [ ] `src/components/Canvas/PhysicsCanvas.jsx`

### Files to CREATE

- [ ] `src/engine/sequencer.js`
- [ ] `src/hooks/useSequencer.js`
- [ ] `src/components/Canvas/SequencerCanvas.jsx`

### Files to MODIFY

- [ ] `src/App.jsx` - Import SequencerCanvas
- [ ] `src/engine/constants.js` - Remove physics constants, add lane constants
- [ ] `src/engine/audio.js` - Add hat, clap, bass synths
- [ ] `src/engine/clock.js` - Emit on 16th notes
- [ ] `src/hooks/useAudioEngine.js` - Expose new triggers
- [ ] `package.json` - Remove matter-js dependency

### Files UNCHANGED

- [ ] `src/main.jsx`
- [ ] `src/utils/math.js`
- [ ] `src/styles/globals.css`
- [ ] `src/components/Canvas/GlowBurst.jsx`

---

## 9. Testing Protocol

### After Phase 1

1. **Clock Accuracy**
   - Use browser devtools to verify 16th note timing (~117ms intervals)
   - No drift over 1 minute of playback

2. **Grid State**
   - Toggle step on → verify grid[lane][step] === 1
   - Toggle step off → verify grid[lane][step] === 0
   - Refresh page → grid resets (expected for MVP)

3. **Audio Sync**
   - Place kick on steps 1, 5, 9, 13 (standard four-on-floor)
   - Verify kicks land exactly on beat
   - No audio pops, clicks, or timing drift

4. **Interaction**
   - Tap anywhere in lane → correct step toggles
   - Rapid tapping → no missed inputs
   - Tap during playhead crossing → still works

5. **Performance**
   - 60fps with all 4 lanes, 16 triggers each
   - No memory leaks over 5 minutes

### After Phase 2

1. **Visual Sync**
   - Trigger flash happens exactly when sound plays
   - Sidechain visual matches audio duck
   - No visual lag behind audio

2. **Aesthetic**
   - Screenshot looks polished
   - Colors are vibrant but not harsh
   - Passes "would I post this on social media" test

### After Phase 3

1. **Progressive Unlock**
   - Fresh load shows only kick lane
   - Lanes unlock in correct order
   - Unlocked state persists (or intentionally resets)

2. **Interaction Enhancements**
   - Accents audibly louder
   - Mute actually silences lane
   - Clear removes all triggers

---

## 10. Rollback Plan

If the sequencer approach doesn't work out:

1. **Git History**: All physics code preserved in git history
2. **Branch Strategy**: Create `feature/sequencer-migration` branch
3. **Parallel Preservation**: Optionally keep PhysicsCanvas renamed to `PhysicsCanvas.backup.jsx`

### Rollback Steps

```bash
# If we need to revert
git checkout main -- src/engine/physics.js
git checkout main -- src/hooks/usePhysicsWorld.js
# ... etc for all deleted files

# Restore matter-js
npm install matter-js
```

---

## Appendix: Quick Reference

### Key Measurements

| Metric | Value |
|--------|-------|
| Tempo | 128 BPM |
| Step duration | ~117ms (60000 / 128 / 4) |
| Steps per bar | 16 |
| Lanes | 4 (kick, hat, clap, bass) |
| Grid cells total | 64 (4 × 16) |

### Audio Trigger Map

| Lane | Function | Note |
|------|----------|------|
| kick | `playKick()` | C1 (fixed) |
| hat | `playHat()` | N/A (noise) |
| clap | `playClap()` | N/A (noise) |
| bass | `playBass(note)` | From F_MINOR_FULL.bass |

### Color Palette

| Lane | Core Color | Glow Color |
|------|------------|------------|
| kick | `#f97316` (orange) | `#7c2d12` |
| hat | `#00ffff` (cyan) | `#0a3d4a` |
| clap | `#ffffff` (white) | `#666666` |
| bass | `#a855f7` (purple) | `#581c87` |

---

## Sign-Off

- [ ] Plan reviewed and approved
- [ ] Phase 1 scope confirmed
- [ ] Ready to begin implementation

---

*Document created: Phase 1 implementation ready to begin on approval.*
