# Onyx Pulse — Next Phase Plan

> **Created:** January 2026
> **Status:** Ready for implementation

## Roadmap Priority (Confirmed)

```
Phase 1: Pads (This PR)  →  Phase 2: Layered Scenes  →  Phase 3: Recording/Share
```

---

## Phase 1: Stab Pad Improvements (Current Focus)

### Sound Changes

| Position | Current | New | Description |
|----------|---------|-----|-------------|
| Top-Left | ZAP | **LASER** | Cleaner pitch-down sweep (C5→C2), more musical |
| Top-Right | IMPACT | **IMPACT** | Keep but boost volume significantly |
| Bottom-Left | VOCAL | **REVERSE** | Reverse cymbal/reverb swell (fade IN then cut) |
| Bottom-Right | RISER | **RISER** | Keep as-is |

### Layout: 2x2 Grid

```
┌─────────────────────────────────────────────┐
│     [LASER]          [IMPACT]              │  ← Hits (instant)
│     [REVERSE]        [RISER]               │  ← Sweeps (builds)
└─────────────────────────────────────────────┘
```

**Rationale:** Top row = instant hits, bottom row = sweeping/building sounds

### Implementation

#### 1. Update Constants (`src/engine/constants.js`)

```javascript
export const STABS = {
  laser: { name: 'LASER', color: '#facc15' },   // was zap
  impact: { name: 'IMPACT', color: '#ef4444' },
  reverse: { name: 'REVERSE', color: '#8b5cf6' }, // was vocal
  riser: { name: 'RISER', color: '#06b6d4' },
};

export const STAB_ORDER = ['laser', 'impact', 'reverse', 'riser'];
// Grid: [0,1] = top row, [2,3] = bottom row
```

#### 2. Update Audio Engine (`src/engine/audio.js`)

**LASER** (replace zapSynth):
- `FMSynth` with pitch envelope
- Start at C5, sweep down to C2
- Short decay (~150ms)
- Harmonicity: 4 (less harsh than current zap)

**IMPACT** (boost existing):
- Increase volume: -4dB → 0dB (membrane), -8dB → -4dB (noise)
- Extend decay for more "thump"
- Trigger sidechain pump (already does this)

**REVERSE** (replace vocalSynth):
- `NoiseSynth` with reversed amplitude envelope
- Attack: 0.3s (fade IN)
- Decay: 0.05s (quick cut)
- Lowpass filter sweep UP during attack
- Creates "sucking in" effect before drops

**RISER** — No changes

#### 3. Update Canvas (`src/components/Canvas/SequencerCanvas.jsx`)

Change from 1x4 horizontal to 2x2 grid:

```javascript
// Layout calculation
const stabCols = 2;
const stabRows = 2;
const stabButtonWidth = (gridWidth - gap) / stabCols;
const stabButtonHeight = (STAB_BAR_HEIGHT - gap * 2) / stabRows;

// Position calculation
const col = index % stabCols;  // 0 or 1
const row = Math.floor(index / stabCols);  // 0 or 1
const stabX = LANE_PADDING + col * (stabButtonWidth + gap);
const stabY = layout.stabBarTop + row * (stabButtonHeight + gap);
```

May need to increase `STAB_BAR_HEIGHT` from 70px to ~100px for 2 rows.

### Files to Modify

| File | Changes |
|------|---------|
| `src/engine/constants.js` | Rename stabs, update STAB_ORDER, increase STAB_BAR_HEIGHT |
| `src/engine/audio.js` | Replace zapSynth→laserSynth, vocalSynth→reverseSynth, boost impact |
| `src/components/Canvas/SequencerCanvas.jsx` | 2x2 grid rendering + hit detection |

---

## Phase 2: Layered Scenes

The "game loop" from BRAINSTORM.md — enables creative expansion without complexity.

### Core Concept: LOCK + BUILD

1. User creates something great
2. Hits LOCK + BUILD button
3. Current lanes freeze as background layer
4. Playback continues seamlessly
5. New fresh lanes appear on top
6. Old layer untouchable unless unlocked

### Constraints (Enforced Invisibly)

- Max 3-4 layers total
- Auto EQ per layer (frequency slotting)
- Auto ducking for bass/kick dominance
- All layers share same tempo, bar length, phase

### Layer Navigation

Simple stack view:
- Play/mute toggle per layer
- Tiny visual preview
- Lock icon
- No timeline, no clips

---

## Phase 3: Recording & Share

**Approach: Record on Play** (not always-on buffer)

Rationale: Simpler implementation, lower battery/memory impact, achieves same goal of capturing moments.

### How It Works

- Recording starts automatically when playback starts
- Recording stops when paused
- One-tap export when satisfied
- No decisions, no dialogs

### Features

- ❤️ save button (exports current recording)
- MP4 output with reactive visuals
- Brand identity baked in
- Instagram/TikTok friendly format

---

## Key Principles (from BRAINSTORM.md)

- **"This is not a tool. It's a toy."**
- Pads trigger musical behaviors, not samples
- Constraints = creativity
- No timeline, no theory exposed
- Game-like addiction loop: Tap → Explore → Great moment → Save → Build → Share

---

## Verification Checklist (Phase 1)

After pad implementation:
- [ ] LASER: Musical pitch-down sweep, satisfying zap
- [ ] IMPACT: Noticeably louder, punchy, no clipping
- [ ] REVERSE: Clear "swell in" effect, good for builds
- [ ] RISER: Still works as before
- [ ] 2x2 grid renders correctly (mobile + desktop)
- [ ] Touch targets large enough on mobile
- [ ] Visual flash feedback on all pads
- [ ] No overlap with play button below
- [ ] Build passes with no errors

---

*This document serves as the development roadmap for the next phase of Onyx Pulse.*
