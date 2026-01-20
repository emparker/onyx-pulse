# Onyx Pulse — Next Phase Plan

> **Created:** January 2026
> **Last Updated:** January 2026

## Roadmap Progress

```
Phase 1: Pads ✅ COMPLETE  →  Phase 2: Layered Scenes ✅ COMPLETE  →  Phase 3: Recording/Share
```

---

## Phase 1: Stab Pad Improvements ✅ COMPLETE

### What Was Implemented

| Position | Name | Description |
|----------|------|-------------|
| Top-Left | **LASER** | Clean pitch-down sweep (C5→C2), FM synth |
| Top-Right | **IMPACT** | Boosted volume, punchy membrane + noise |
| Bottom-Left | **REVERSE** | Reverse cymbal swell (fade IN then cut) |
| Bottom-Right | **RISER** | 2-bar filter sweep |

### Layout: 2x2 Grid

```
┌─────────────────────────────────────────────┐
│     [LASER]          [IMPACT]              │  ← Hits (instant)
│     [REVERSE]        [RISER]               │  ← Sweeps (builds)
└─────────────────────────────────────────────┘
```

**STAB_BAR_HEIGHT:** Increased to 100px for 2x2 grid

---

## Phase 2: Layered Scenes ✅ COMPLETE

### What Was Implemented

Users can stack up to **2 layers** of patterns that play simultaneously.

#### Core UX Flow

1. User creates something great on the grid
2. Taps **LOCK + BUILD** button
3. Current layer freezes (locked, still playing)
4. New empty layer appears on top for editing
5. Both layers play together in sync
6. Tap a locked layer's indicator dot to unlock and edit it again

#### UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [DRUMS] [BASS] [MELODIC]  ● ◆  ═══●═══════  [DROP] [BPM] │  ← Unified control strip
├─────────────────────────────────────────────────────────────┤
│   KICK  ● ○ ○ ○ ● ○ ○ ○ ● ○ ○ ○ ● ○ ○ ○   ← Active layer  │
│   HAT   ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○                   │
│   ...                                                       │
├─────────────────────────────────────────────────────────────┤
│ [LASER] [IMPACT]    [LOCK+BUILD]    [▶/❚❚]                 │
│ [REVERSE] [RISER]                                          │
└─────────────────────────────────────────────────────────────┘
```

#### Layer Indicator States (2 dots max)

- `○` Empty slot (no layer)
- `●` Active layer (cyan, currently editing)
- `◆` Locked layer (orange, playing but frozen)

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Max 2 layers** (not 3) | 3 layers caused audio artifacts ("popcorn sound"). 2 layers keeps audio clean. |
| **Single shared tempo** | Per-layer BPM would break "impossible to sound bad" principle. Layers drift out of sync. |
| **Unified control strip** (56px) | Consolidated 3 rows into 1, cleaner UI, more space for lanes. |
| **LOCK+BUILD at bottom** | Near play/pause for easy thumb access on mobile. |
| **Auto-gain: -3dB for 2 layers** | Prevents clipping when layers overlap. |
| **Kick envelope tightened** | Shortened release (1.4s → 0.3s) to prevent overlapping artifacts. |

### Files Modified

| File | Changes |
|------|---------|
| `src/engine/constants.js` | `MAX_LAYERS=2`, `LAYER_GAIN_DB`, `CONTROL_STRIP_HEIGHT`, layer colors |
| `src/engine/sequencer.js` | Refactored to `layers[]` array with lock/unlock/create functions |
| `src/engine/audio.js` | Layer gain node, `updateLayerGains()`, tightened kick envelope |
| `src/hooks/useSequencer.js` | Layer state sync, multi-layer playback with deduplication |
| `src/components/Canvas/SequencerCanvas.jsx` | Unified control strip, layer dots, LOCK+BUILD button |

### Verification Checklist

- [x] Create up to 2 layers without errors
- [x] All layers play simultaneously in sync
- [x] Locked layers show ◆ indicator, can't be edited
- [x] Tap locked layer dot → unlocks and becomes active
- [x] LOCK+BUILD button disabled at 2 layers
- [x] Audio doesn't clip with 2 layers (auto-gain working)
- [x] No "popcorn" sound artifacts with kick
- [x] Tempo/tension/DROP affects all layers
- [x] Stabs work independently of layers
- [x] Category switching works on active layer only
- [x] Clear lane only affects active layer
- [x] Pattern lanes (wobble, chord, lead, arp) work per-layer

---

## Phase 3: Recording & Share (Future)

**Approach: Record on Play** (not always-on buffer)

Rationale: Simpler implementation, lower battery/memory impact, achieves same goal of capturing moments.

### How It Works

- Recording starts automatically when playback starts
- Recording stops when paused
- One-tap export when satisfied
- No decisions, no dialogs

### Planned Features

- Save button (exports current recording)
- MP4 output with reactive visuals
- Brand identity baked in
- Instagram/TikTok friendly format (9:16 vertical)

### Open Questions

- Web Audio recording vs. canvas + audio merge?
- File size limits for social sharing?
- Offline storage before export?

---

## Key Principles (from BRAINSTORM.md)

- **"This is not a tool. It's a toy."**
- Pads trigger musical behaviors, not samples
- Constraints = creativity
- No timeline, no theory exposed
- Game-like addiction loop: Tap → Explore → Great moment → Save → Build → Share

---

*This document serves as the development roadmap for Onyx Pulse.*
