# Onyx Pulse — Next Phase Plan

> **Created:** January 2026
> **Last Updated:** January 2026

## Roadmap Progress

```
Phase 1: Pads ✅ COMPLETE  →  Phase 2: Layered Scenes ✅ COMPLETE  →  Phase 3: Recording/Share ✅ COMPLETE
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

## Phase 3: Recording & Share ✅ COMPLETE

**Approach: Manual Record Mode** (user-initiated, 60 second max)

Rationale: Gives users control over what they capture while keeping it simple. One button, one decision.

### Strategic Decisions

| Decision | Rationale |
|----------|-----------|
| **60 second max** | Aligns with social platforms (Reels, TikTok, Shorts). 32 bars at 128 BPM. |
| **Graceful fade-out** | 2-second fade at end instead of hard cut. Less jarring. |
| **Single record mode** | No "loop export" vs "live record" choice. One mode captures everything. |
| **Stabs stay ephemeral** | Captured at trigger moment, NOT looped or compounded into layers. |
| **Label the tension slider** | Add "BUILD" label - currently unlabeled and confusing. |

### Recording UX Flow

1. User taps **REC** button → recording starts, button pulses red
2. Timer shows remaining time (60 → 0)
3. User performs: plays, hits stabs, builds tension, drops
4. Recording ends when:
   - User taps REC again, OR
   - 60 seconds reached (graceful 2-sec fade-out)
5. **SHARE** button appears → exports audio/video

### What Gets Captured

| Element | Behavior |
|---------|----------|
| Grid lanes (all layers) | Merged stereo audio |
| Pattern lanes (all layers) | Merged stereo audio |
| Stabs | One-shot at exact trigger moment |
| Tension slider | Continuous audio effect (filter sweep) |
| DROP impacts | Captured when triggered |
| Tempo changes | Captured in real-time |

### What Does NOT Loop/Compound

- Stabs are DJ flourishes, not loop elements
- If users want a "clean" loop, they simply don't hit stabs during recording

### UI Changes

```
┌─────────────────────────────────────────────────────────────┐
│  [DRUMS] [BASS] [MELODIC]  ● ◆   BUILD ══●════  [DROP]     │  ← "BUILD" label added
├─────────────────────────────────────────────────────────────┤
│   (lanes...)                                                │
├─────────────────────────────────────────────────────────────┤
│ [LASER] [IMPACT]    [LOCK+BUILD]    [▶/❚❚]  [⏺ REC]       │  ← REC button added
│ [REVERSE] [RISER]                                           │
└─────────────────────────────────────────────────────────────┘
```

### Recording States

| State | REC Button | Timer | Behavior |
|-------|------------|-------|----------|
| **Idle** | White outline | Hidden | Ready to record |
| **Recording** | Pulsing red fill | "0:45" countdown | Capturing audio |
| **Final 10 sec** | Faster pulse | Countdown | Visual warning |
| **Ending** | Fade animation | "Done" | 2-sec graceful fade |
| **Complete** | Hidden | Hidden | GO BACK + DOWNLOAD buttons appear |

### Technical Approach

**Audio Recording:**
- Use `Tone.Recorder` connected to master output
- Records full stereo mix (all layers + stabs + effects)
- Output format: WebM audio (widely supported)

**Export:** Audio-only download (no video for v1)

**Re-record:** User can discard and try again before downloading

### Final Decisions

| Question | Decision |
|----------|----------|
| Video export? | **No** — Audio-only for v1 |
| Share flow? | **Download only** — No share button |
| Re-record? | **Yes** — "GO BACK" button to discard and try again |

### Post-Recording UI

```
┌─────────────────────────────────────────────────────────────┐
│                    Recording complete!                       │
│                                                              │
│              [GO BACK]          [DOWNLOAD]                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

- **GO BACK**: Discards recording, returns to normal playback state
- **DOWNLOAD**: Saves WebM/audio file to device

### Files Modified

| File | Changes |
|------|---------|
| `src/engine/constants.js` | Added `RECORDING` config, `RECORDING_STATE` enum, recording colors |
| `src/engine/audio.js` | Added `Tone.Recorder`, `recordingFadeGain`, recording functions |
| `src/hooks/useRecording.js` | New hook for recording state, timer, actions |
| `src/components/Canvas/SequencerCanvas.jsx` | REC button, timer display, post-recording overlay, BUILD label |

### Verification Checklist

- [x] REC button appears in bottom bar
- [x] Tap REC starts recording, button turns red and pulses
- [x] Timer counts down from 1:00
- [x] Timer pulses faster in last 10 seconds (warning zone)
- [x] Tap REC again stops recording manually
- [x] Auto-stop at 60 seconds with graceful fade-out
- [x] Post-recording overlay shows GO BACK and DOWNLOAD buttons
- [x] GO BACK discards recording and returns to idle
- [x] DOWNLOAD saves WebM audio file
- [x] BUILD label appears above tension slider
- [x] LOCK+BUILD disabled during recording
- [x] Build succeeds with no errors

---

## Key Principles (from BRAINSTORM.md)

- **"This is not a tool. It's a toy."**
- Pads trigger musical behaviors, not samples
- Constraints = creativity
- No timeline, no theory exposed
- Game-like addiction loop: Tap → Explore → Great moment → Save → Build → Share

---

*This document serves as the development roadmap for Onyx Pulse.*
