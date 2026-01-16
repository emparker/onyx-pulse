# CLAUDE.md — Onyx Pulse Development Guide

> **Project:** Onyx Pulse — A lane-based step sequencer music toy
> **Stack:** Vite + React 19 · Tone.js · Canvas 2D · Tailwind CSS

---

## 1. Prime Directive

**Every decision must serve the core UX promise:** *Tap once, hear beauty. No tutorials, no friction.*

When in doubt, ask: "Does this make the first 5 seconds more magical?"

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
│   │   ├── sequencer.js         # Grid state, playhead, mute/unlock logic
│   │   ├── clock.js             # Tone.js transport, tempo control
│   │   ├── audio.js             # Synths (kick, hat, clap, bass) + sidechain
│   │   └── constants.js         # All magic numbers live HERE
│   ├── hooks/
│   │   ├── useSequencer.js      # React wrapper for sequencer state
│   │   └── useAudioEngine.js    # Tone.js lifecycle management
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

### Sequencer Model

```
User Tap on Grid
       ↓
Toggle Cell (lane + step)
       ↓
Clock Tick (16th notes at 128 BPM)
       ↓
Check Grid → Trigger Sounds (perfect timing)
       ↓
Visual Feedback (flash, ripple, playhead trail)
```

### Mental Model

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

## 4. Core Modules

### 4.1 Sequencer Engine (`src/engine/sequencer.js`)

Manages grid state, playhead position, mute/unlock status.

**Key exports:**
- `initSequencer()` — Initialize empty 4×16 grid
- `toggleStep(lane, step)` — Toggle trigger on/off
- `getGrid()` / `getPlayhead()` — State getters
- `toggleMute(lane)` — Mute/unmute a lane
- `clearLane(lane)` — Clear all triggers in a lane

### 4.2 Clock (`src/engine/clock.js`)

Tone.js Transport wrapper for timing.

**Key exports:**
- `initClock()` — Start transport at 128 BPM
- `onStep(callback)` — Subscribe to 16th note events
- `getTempo()` / `setTempo(bpm)` — Tempo control (80-160 BPM)
- `togglePlayPause()` — Play/pause transport

### 4.3 Audio Engine (`src/engine/audio.js`)

Four synthesizers with sidechain compression.

| Instrument | Synth Type | Character |
|------------|------------|-----------|
| **KICK** | MembraneSynth | Deep 808-style thump |
| **HAT** | NoiseSynth + HP filter | Crisp hi-hat tick |
| **CLAP** | NoiseSynth + BP filter | Snare-like burst |
| **BASS** | MonoSynth | Sub bass (F-minor pentatonic) |

**Sidechain:** When kick fires, other instruments duck via gain automation.

### 4.4 Constants (`src/engine/constants.js`)

All magic numbers in one place:

```javascript
// Timing
TEMPO_BPM = 128
STEPS_PER_BAR = 16
TEMPO_MIN = 80
TEMPO_MAX = 160

// Layout
LANE_HEIGHT = 70
TRIGGER_RADIUS = 12
LANE_PADDING = 20
PLAYHEAD_WIDTH = 4

// Lanes
LANE_ORDER = ['kick', 'hat', 'clap', 'bass']
LANES = { kick: {...}, hat: {...}, clap: {...}, bass: {...} }

// Scale
F_MINOR_BASS = ['F2', 'Ab2', 'Bb2', 'C3', 'Eb3']
```

---

## 5. User Interactions

### Grid Interactions (SequencerCanvas)

| Gesture | Target | Action |
|---------|--------|--------|
| Tap | Grid cell | Toggle trigger on/off |
| Double-tap | Lane header (left 60px) | Toggle mute |
| Long-press (500ms) | Lane header | Clear all triggers in lane |

### UI Controls

| Control | Location | Action |
|---------|----------|--------|
| Play/Pause | Bottom center | Toggle clock |
| Tempo +/- | Top right | Adjust BPM (±4) |

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
| **Mute Overlay** | Dimmed lane with `[M]` prefix | Alpha overlay + label change |

### Color Palette ("Neon Noir")

```javascript
COLORS = {
  background: { core: '#030308', mid: '#050510', edge: '#0a1628' },
  playhead: { line: '#ffffff', glow: '#00ffff' },
  // Lane colors defined in LANES constant
}

// Lane colors:
kick: '#f97316' (orange)
hat:  '#00ffff' (cyan)
clap: '#f8fafc' (white)
bass: '#a855f7' (purple)
```

---

## 7. Audio Engine Rules

| Rule | Rationale |
|------|-----------|
| **Initialize Tone.js ONLY on first user gesture** | Browser autoplay policies |
| **Use `Tone.start()` inside tap handler** | Required for iOS Safari |
| **Sidechain on kick only** | Creates the "pump" feel |
| **Bass cycles through F-minor pentatonic** | Always sounds musical |

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
2. **All 4 lanes** — Visible and interactive
3. **Double-tap mute** — Toggles on/off correctly
4. **Long-press clear** — Clears lane triggers
5. **Tempo control** — +/- buttons work (80-160 range)
6. **60fps** — Smooth playhead, no stuttering
7. **Mobile** — Touch interactions work

---

## 11. Troubleshooting

### "Audio Won't Start"
1. Check: Is `Tone.start()` inside user gesture handler?
2. Check: Is `ensureAudioReady()` called before playback?
3. iOS: Ensure audio context resumes: `Tone.context.resume()`

### "Lanes Not Showing"
1. Check: `unlockedLanes` state in sequencer.js
2. Check: `unlockProgress` in render loop (should be > 0.01)

### "Mute Not Toggling"
1. Check browser console for double-tap detection logs
2. Verify tap is within header area (left 60px of lane)

### "Performance Issues"
1. Reduce `shadowBlur` in constants
2. Check for memory leaks (ripples/trails not cleaning up)
3. Profile with Chrome DevTools

---

## 12. Reference Links

- [Tone.js Docs](https://tonejs.github.io/)
- [Vite Config Reference](https://vitejs.dev/config/)
- [Canvas 2D API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

---

## 13. Definition of Done

The project is complete when:

- [x] 4-lane step sequencer working
- [x] Tap to toggle triggers
- [x] Playhead loops at 128 BPM (adjustable 80-160)
- [x] Kick, hat, clap, bass sounds distinct
- [x] Sidechain pump on kick
- [x] Visual feedback (flash, ripple, breathing)
- [x] Mute/clear lane gestures
- [x] Tempo control UI
- [ ] 60fps on mobile
- [ ] PWA offline support
- [ ] Zero console errors in production

---

## 14. Historical Context

This project was originally designed as a physics-based marble toy (see `docs/archive/`).
It was migrated to a lane-based step sequencer for:

- **Predictable timing** — Music plays exactly on beat
- **Simpler mental model** — Clear grid instead of chaotic physics
- **Reduced complexity** — ~73% less code (no Matter.js)
- **Better UX** — Intentional patterns vs random collisions

The archived docs preserve the original vision for reference.

---

*Last Updated: January 2026 (Post-Sequencer Migration)*
