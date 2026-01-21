# CLAUDE.md — Onyx Pulse Development Guide

> **Project:** Onyx Pulse — A pocket-sized EDM creation toy
> **Stack:** Vite + React 19 · Tone.js · Canvas 2D · Tailwind CSS

---

## 1. Prime Directive

**Every decision must serve the core UX promise:** *Tap once, hear beauty. No tutorials, no friction.*

**The Test:** If someone can't create something they'd genuinely nod their head to within 30 seconds of first open — we've failed.

### Core Principles
1. **Instant gratification** — First touch = music. No tutorials.
2. **Impossible to sound bad** — Every combination bangs. All content locked to C minor.
3. **Disposable creations** — Clear + restart = satisfying. No save anxiety.
4. **Endless novelty** — Pattern cycling ensures every session is different.
5. **Tinkering over composing** — A toy that outputs music, not a simple DAW.

---

## 2. Project Structure

```
onyx-pulse/
├── src/
│   ├── main.jsx                 # Entry point
│   ├── App.jsx                  # Root layout
│   ├── components/
│   │   └── Canvas/
│   │       ├── SequencerCanvas.jsx  # Main sequencer UI + rendering
│   │       └── GlowBurst.jsx        # Hit effect animation
│   ├── engine/
│   │   ├── sequencer.js         # Grid state, pattern state, categories
│   │   ├── clock.js             # Tone.js transport, tempo control
│   │   ├── audio.js             # All synths + stabs + build/drop
│   │   └── constants.js         # All magic numbers live HERE
│   ├── hooks/
│   │   ├── useSequencer.js      # React wrapper for sequencer state
│   │   ├── useAudioEngine.js    # Tone.js lifecycle management
│   │   └── useRecording.js      # Recording state + timer + download
│   ├── utils/
│   │   └── math.js              # clamp, lerp, mapRange
│   └── styles/
│       └── globals.css          # Tailwind base + custom glow vars
├── public/
│   └── manifest.json            # PWA config
├── docs/
│   ├── AUDIO_EDM_SPEC.md        # Audio system documentation
│   └── archive/                 # Historical docs (physics-based version)
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 3. Architecture Overview

### Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [DRUMS] [BASS] [MELODIC]  ● ◆  BUILD ══●══  [DROP] [BPM] │ ← Control strip
├─────────────────────────────────────────────────────────────┤
│   KICK  ● ○ ○ ○ ● ○ ○ ○ ● ○ ○ ○ ● ○ ○ ○   ← Grid lanes   │
│   HAT   ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○ ● ○                   │
│   CLAP  ○ ○ ○ ○ ● ○ ○ ○ ○ ○ ○ ○ ● ○ ○ ○                   │
│   PERC  ○ ○ ● ○ ○ ○ ● ○ ○ ○ ● ○ ○ ○ ● ○                   │
│          ▲                                                  │
│          └── playhead (moves right, loops)                  │
├─────────────────────────────────────────────────────────────┤
│ [LASER] [IMPACT]                        ← Stab buttons     │
│ [REVERSE] [RISER]                         (2x2 grid)       │
│           [LOCK+BUILD]  [▶/❚❚]  [⏺ REC]  ← Bottom controls │
└─────────────────────────────────────────────────────────────┘
```

### Lane Types

| Type | Lanes | Interaction |
|------|-------|-------------|
| **Grid** | kick, hat, clap, perc, sub | 16-step tap-to-toggle |
| **Pattern** | wobble, lead, chord, arp | Tap to cycle pre-made patterns |
| **Stab** | laser, impact, reverse, riser | One-shot buttons (2x2 grid) |

### Category Tabs

| Category | Lanes |
|----------|-------|
| **DRUMS** | kick, hat, clap, perc |
| **BASS** | sub, wobble |
| **MELODIC** | chord, lead, arp |

---

## 4. Core Modules

### 4.1 Sequencer Engine (`src/engine/sequencer.js`)

Manages grid state, pattern state, categories, and lane activation.

**Key exports:**
- `initSequencer()` — Initialize grid for all lanes
- `toggleStep(lane, step)` — Toggle trigger on/off (grid lanes)
- `cyclePattern(lane)` — Cycle to next pattern (pattern lanes)
- `toggleActive(lane)` — Enable/disable a pattern lane
- `getGrid()` / `getPlayhead()` — State getters
- `toggleMute(lane)` — Mute/unmute a lane
- `clearLane(lane)` — Clear all triggers in a lane
- `getCurrentCategory()` / `setCurrentCategory()` — Category navigation

### 4.2 Clock (`src/engine/clock.js`)

Tone.js Transport wrapper for timing.

**Key exports:**
- `initClock()` — Start transport at 128 BPM
- `onStep(callback)` — Subscribe to 16th note events
- `getTempo()` / `setTempo(bpm)` — Tempo control (80-160 BPM)
- `togglePlayPause()` — Play/pause transport

### 4.3 Audio Engine (`src/engine/audio.js`)

Nine synthesizers + four stabs + build/drop system.

#### Grid Lane Synths

| Instrument | Synth Type | Character |
|------------|------------|-----------|
| **KICK** | MembraneSynth | Deep 808-style thump |
| **HAT** | NoiseSynth + HP filter | Crisp hi-hat tick |
| **CLAP** | NoiseSynth + BP filter | Snare-like burst |
| **PERC** | MembraneSynth | Tuned percussion (cycles F3, C3, G3, D3) |
| **SUB** | MonoSynth | Sub bass (C-minor pentatonic cycle) |

#### Pattern Lane Synths

| Instrument | Synth Type | Patterns |
|------------|------------|----------|
| **WOBBLE** | MonoSynth + LFO | 1/4, 1/8, 1/16 rates |
| **CHORD** | PolySynth | i-VI-III-VII, i-VII-VI-VII, i-i-VI-VII |
| **LEAD** | MonoSynth | Hook 1, Hook 2, Hook 3 |
| **ARP** | MonoSynth | Up, Down, Random (Cm7 arpeggio) |

#### Stab FX (2x2 grid)

| Stab | Sound |
|------|-------|
| **LASER** | FM synth pitch-down sweep (C5→C2) |
| **IMPACT** | Pink noise sweep + membrane thump |
| **REVERSE** | Reverse cymbal swell (fade IN then cut) |
| **RISER** | White noise with 2-bar filter sweep |

#### Build/Drop System

- **Tension slider (0-100%):** Controls master highpass filter (20Hz → 2kHz)
- **Snare roll:** Auto-triggers at thresholds (40%=1/8, 65%=1/16, 85%=1/32)
- **DROP button:** Resets filter, stops roll, plays impact

**Sidechain:** When kick fires, other instruments duck via gain automation.

### 4.4 Recording (`src/hooks/useRecording.js`)

60-second audio recording with graceful fade-out.

**Key exports:**
- `startRecording()` — Begin recording (Tone.Recorder)
- `stopRecording()` — Stop with optional fade-out
- `toggleRecording()` — Single button control
- `redoRecording()` — Discard and return to idle
- `download()` — Save WebM audio file

**Recording States:**
- `IDLE` — Ready to record
- `RECORDING` — Capturing audio, timer counting down
- `ENDING` — Graceful 2-second fade-out
- `COMPLETE` — Showing GO BACK / DOWNLOAD overlay

**Constants:**
```javascript
RECORDING = {
  maxDurationMs: 60000,       // 60 seconds max
  fadeOutDurationMs: 2000,    // 2 second graceful fade
  warningThresholdMs: 10000,  // Flash faster at 10 seconds remaining
}
```

### 4.5 Constants (`src/engine/constants.js`)

All magic numbers in one place:

```javascript
// Timing
TEMPO_BPM = 128
STEPS_PER_BAR = 16
TEMPO_MIN = 80
TEMPO_MAX = 160

// Layout
LANE_HEIGHT = 55
TRIGGER_RADIUS = 10
LANE_PADDING = 20
HEADER_WIDTH = 60
STAB_BAR_HEIGHT = 100  // 2x2 stab grid

// Categories
CATEGORIES = { drums, bass, melodic }
CATEGORY_ORDER = ['drums', 'bass', 'melodic']
LANES_BY_CATEGORY = {
  drums: ['kick', 'hat', 'clap', 'perc'],
  bass: ['sub', 'wobble'],
  melodic: ['chord', 'lead', 'arp']
}

// Lane Types
GRID_LANES = ['kick', 'hat', 'clap', 'perc', 'sub']
PATTERN_LANES = ['wobble', 'chord', 'lead', 'arp']

// Scale (C Minor)
C_MINOR_BASS = ['C2', 'Eb2', 'F2', 'G2', 'Bb2']
ARP_NOTES = ['C3', 'Eb3', 'G3', 'Bb3', 'C4']

// Stabs (2x2 grid: top-left, top-right, bottom-left, bottom-right)
STAB_ORDER = ['laser', 'impact', 'reverse', 'riser']

// Build/Drop
BUILD_DROP = {
  filterMinHz: 20,
  filterMaxHz: 2000,
  kickMuteThreshold: 75,
  snareRollThresholds: { 0: null, 40: '8n', 65: '16n', 85: '32n' }
}
```

---

## 5. User Interactions

### Grid Lane Interactions

| Gesture | Target | Action |
|---------|--------|--------|
| Tap | Grid cell | Toggle trigger on/off |
| Double-tap | Lane header | Toggle mute |
| Long-press (500ms) | Lane header | Clear all triggers |

### Pattern Lane Interactions

| Gesture | Target | Action |
|---------|--------|--------|
| Tap | Pattern lane area | Cycle to next pattern |
| Double-tap | Lane header | Toggle mute |
| Long-press (500ms) | Lane header | Deactivate pattern |

### UI Controls

| Control | Location | Action |
|---------|----------|--------|
| Category tabs | Control strip (left) | Switch between DRUMS/BASS/MELODIC |
| Layer dots | Control strip | ● active, ◆ locked — tap to select |
| BUILD slider | Control strip | Drag to build tension (0-100%) |
| DROP button | Control strip | Trigger the drop |
| Tempo +/- | Control strip (right) | Adjust BPM (±4) |
| Stab buttons | Middle (2x2 grid) | Tap for one-shot FX |
| LOCK+BUILD | Bottom bar | Lock layer and create new one |
| Play/Pause | Bottom bar (center) | Toggle clock |
| REC button | Bottom bar (right) | Start/stop 60-second recording |

---

## 6. Visual Effects

### Implemented Effects

| Effect | Description | Implementation |
|--------|-------------|----------------|
| **Breathing** | Lanes/triggers pulse gently | Sine wave on `breathePhaseRef` |
| **Hit Flash** | Triggers flash white when hit | `hitFlashRef` with decay |
| **Ripple** | Expanding rings on hit | `rippleRef` array with radius growth |
| **Sidechain Pump** | Non-kick lanes dim on kick | `sidechainRef` from audio engine |
| **Playhead Trail** | Fading trail behind playhead | `playheadTrailRef` array |
| **Downbeat Pulse** | Background brightens on beat 1 | `downbeatPulseRef` |
| **Drop Flash** | Screen flashes on DROP | `dropFlashRef` |
| **Stab Flash** | Buttons flash when triggered | `stabFlashRef` |
| **Mute Overlay** | Dimmed lane with `[M]` prefix | Alpha overlay + label change |
| **Pattern Pulse** | Active pattern lanes pulse | Animated arc with breathing |

### Color Palette ("Neon Noir")

```javascript
// Background
background: { core: '#030308', mid: '#050510', edge: '#0a1628' }

// Lane colors
kick:   '#f97316' (orange)
hat:    '#00ffff' (cyan)
clap:   '#f8fafc' (white)
perc:   '#fbbf24' (amber)
sub:    '#a855f7' (purple)
wobble: '#ec4899' (pink)
chord:  '#22d3ee' (cyan)
lead:   '#4ade80' (green)
arp:    '#f472b6' (pink)

// Stab colors
laser:   '#facc15' (yellow)
impact:  '#ef4444' (red)
reverse: '#8b5cf6' (violet)
riser:   '#06b6d4' (cyan)

// Category colors
drums:   '#f97316' (orange)
bass:    '#a855f7' (purple)
melodic: '#22d3ee' (cyan)
```

---

## 7. Audio Engine Rules

| Rule | Rationale |
|------|-----------|
| **Initialize Tone.js ONLY on first user gesture** | Browser autoplay policies |
| **Use `Tone.start()` inside tap handler** | Required for iOS Safari |
| **Sidechain on kick only** | Creates the "pump" feel |
| **All content in C minor** | Any combination sounds musical |
| **Pattern lanes auto-activate on interaction** | Instant gratification |
| **Wobble runs continuously when active** | Signature EDM texture |

---

## 8. Development Commands

```bash
# Development
npm run dev          # Vite dev server (port 5173)

# Production
npm run build        # Output to /dist
npm run preview      # Test production build locally
```

---

## 9. Code Style

### React Components

```jsx
// ✅ Correct: Functional, hooks at top, early returns
export function SequencerCanvas() {
  const canvasRef = useRef(null);
  const { grid, playhead, toggleStep } = useSequencer();

  if (!grid) return null;

  return <canvas ref={canvasRef} />;
}
```

### State Management

- **Local state only** — No Redux/Zustand
- Sequencer/audio state in singleton modules
- React state for UI reactivity via hooks

### Animation

- Use `requestAnimationFrame` exclusively
- Decay-based animations (multiply by 0.85-0.95 per frame)
- Never use `setInterval` for visuals

---

## 10. Testing Protocol

Before any commit:

1. **Fresh browser** — Audio starts on first tap
2. **Category tabs** — All three categories switch correctly
3. **Grid lanes** — Tap to toggle, sounds play
4. **Pattern lanes** — Tap to cycle patterns, patterns play
5. **Double-tap mute** — Toggles on/off correctly
6. **Long-press clear** — Clears grid lanes / deactivates pattern lanes
7. **BUILD slider** — Drag works, filter sweeps audibly
8. **DROP button** — Impact plays, filter resets
9. **Stab buttons** — All four play distinct sounds (2x2 grid)
10. **Tempo control** — +/- buttons work (80-160 range)
11. **Layer system** — LOCK+BUILD creates layers, dots switch between them
12. **Recording** — REC starts/stops, timer counts down, download works
13. **60fps** — Smooth playhead, no stuttering
14. **Mobile** — Touch interactions work

Full integration test:
- Enable all lane types across categories
- Create 2 layers with LOCK+BUILD
- Drag tension to 100%, hit DROP
- Tap stabs during playback
- Start recording, perform for 30 seconds, stop
- Download recording and verify audio

---

## 11. Troubleshooting

### "Audio Won't Start"
1. Check: Is `Tone.start()` inside user gesture handler?
2. Check: Is `ensureAudioReady()` called before playback?
3. iOS: Ensure audio context resumes: `Tone.context.resume()`

### "Pattern Lane Not Playing"
1. Check: Is `activeLanes[lane]` true?
2. Check: Is the lane muted? (`mutedLanes[lane]`)
3. Check: For chord, is it a downbeat? (step === 0)

### "Wobble Not Working"
1. Check: Is wobble lane active?
2. Check: Is `startWobble()` being called?
3. Check: LFO connection to filter frequency

### "Tension Not Affecting Sound"
1. Check: Is `masterHighpass` initialized?
2. Check: Is `setMasterHighpass()` being called with correct frequency?

### "Performance Issues"
1. Reduce `shadowBlur` in constants
2. Check for memory leaks (ripples/trails not cleaning up)
3. Profile with Chrome DevTools

### "Recording Not Working"
1. Check: Is audio initialized? (`ensureAudioReady()` called)
2. Check: Is `recorder` connected to `recordingFadeGain`?
3. Check: Recording state — should be `IDLE` to start
4. Browser: Some browsers may not support MediaRecorder WebM

### "Downloaded File Empty/Silent"
1. Check: Was audio playing during recording?
2. Check: Did recording stop properly? (state should be `COMPLETE`)
3. Check: `recordingBlob` should have non-zero size

---

## 12. Reference Links

- [Tone.js Docs](https://tonejs.github.io/)
- [Vite Config Reference](https://vitejs.dev/config/)
- [Canvas 2D API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

---

## 13. Definition of Done

The project is complete when:

- [x] Category-based lane system (DRUMS/BASS/MELODIC)
- [x] 5 grid lanes (kick, hat, clap, perc, sub)
- [x] 4 pattern lanes (wobble, chord, lead, arp)
- [x] 4 stab buttons (laser, impact, reverse, riser) — 2x2 grid
- [x] BUILD slider + DROP button
- [x] Tap to toggle grid triggers
- [x] Tap to cycle pattern lanes
- [x] Playhead loops at 128 BPM (adjustable 80-160)
- [x] All sounds distinct and musical
- [x] Sidechain pump on kick
- [x] Visual feedback (flash, ripple, breathing, drop flash)
- [x] Mute/clear lane gestures
- [x] Tempo control UI
- [x] Layer system (2 layers max, LOCK+BUILD)
- [x] Recording (60 sec, graceful fade, download)
- [ ] 60fps on mobile
- [ ] PWA offline support
- [ ] Zero console errors in production

---

## 14. Historical Context

This project was originally designed as a physics-based marble toy (see `docs/archive/`).
It evolved through multiple phases:

**Phase 1 (Sequencer Migration):**
- Predictable timing — Music plays exactly on beat
- Simpler mental model — Clear grid instead of chaotic physics
- Reduced complexity — ~73% less code (no Matter.js)

**Phase 2 (EDM Expansion):**
- Category tabs — Organized 9 lanes into 3 categories
- Pattern lanes — Pre-made musical patterns (wobble, chord, lead, arp)
- Stab buttons — Renamed to LASER/IMPACT/REVERSE/RISER, 2x2 grid layout
- Build/Drop system — BUILD slider for tension + DROP button
- Layered scenes — 2-layer system with LOCK+BUILD
- C minor lock — All content harmonically compatible

**Phase 3 (Recording & Share):**
- 60-second recording with graceful 2-second fade-out
- REC button with pulsing animation and countdown timer
- Post-recording overlay with GO BACK / DOWNLOAD buttons
- WebM audio export

The archived docs preserve the original vision for reference.

---

*Last Updated: January 2026 (Post-Recording Feature)*
