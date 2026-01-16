# Onyx Pulse

A lane-based step sequencer that makes creating electronic music effortless.

**Tap. Toggle. Groove.**

---

## What Is It?

Onyx Pulse is a visual step sequencer with four instrument lanes:

- **KICK** — Deep 808-style bass drum
- **HAT** — Crisp hi-hat
- **CLAP** — Snappy snare/clap
- **BASS** — Sub bass (F-minor pentatonic)

Tap cells to place triggers. A playhead sweeps across the grid at 128 BPM, playing your pattern on loop. The result: instant EDM beats without any musical knowledge required.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and tap anywhere on the grid to begin.

---

## Features

- **4×16 step grid** — 4 instruments, 16 steps per bar
- **Sidechain pump** — Kick automatically ducks other instruments for that EDM feel
- **Visual feedback** — Glowing triggers, ripple effects, breathing animations
- **Tempo control** — Adjustable from 80-160 BPM
- **Lane mute** — Double-tap lane label to mute/unmute
- **Lane clear** — Long-press lane label to clear all triggers
- **Neon noir aesthetic** — Dark theme with vibrant colored lanes

---

## Controls

| Action | Gesture |
|--------|---------|
| Toggle trigger | Tap grid cell |
| Mute/unmute lane | Double-tap lane label (left side) |
| Clear lane | Long-press lane label (500ms) |
| Play/pause | Tap center button |
| Adjust tempo | Tap +/- buttons (top right) |

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Vite](https://vitejs.dev/) | Build tool and dev server |
| [React 19](https://react.dev/) | UI framework |
| [Tone.js](https://tonejs.github.io/) | Web audio synthesis |
| [Canvas 2D](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) | Custom rendering with glow effects |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |

---

## Project Structure

```
onyx-pulse/
├── src/
│   ├── main.jsx                 # Entry point
│   ├── App.jsx                  # Root component
│   ├── components/Canvas/
│   │   ├── SequencerCanvas.jsx  # Main sequencer UI
│   │   └── GlowBurst.jsx        # Hit effect animations
│   ├── engine/
│   │   ├── sequencer.js         # Grid state and playhead logic
│   │   ├── clock.js             # Tone.js transport timing
│   │   ├── audio.js             # Synth definitions + sidechain
│   │   └── constants.js         # All tunable parameters
│   ├── hooks/
│   │   ├── useSequencer.js      # React state integration
│   │   └── useAudioEngine.js    # Audio lifecycle management
│   └── styles/
│       └── globals.css          # Global styles
├── docs/
│   ├── AUDIO_EDM_SPEC.md        # Audio system documentation
│   └── archive/                 # Historical docs (original physics-based design)
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Configuration

All tunable parameters live in `src/engine/constants.js`:

```javascript
// Timing
TEMPO_BPM: 128           // Default tempo
STEPS_PER_BAR: 16        // 16th notes per bar
TEMPO_MIN: 80            // Minimum BPM
TEMPO_MAX: 160           // Maximum BPM

// Layout
LANE_HEIGHT: 70          // Height of each lane
TRIGGER_RADIUS: 12       // Size of trigger circles
LANE_PADDING: 20         // Grid padding

// Audio
F_MINOR_BASS: [...]      // Bass note scale
```

---

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari (requires tap to enable audio)

**Note:** Audio requires user interaction to start due to browser autoplay policies.

---

## Documentation

- [CLAUDE.md](./CLAUDE.md) — Development guide and architecture
- [docs/AUDIO_EDM_SPEC.md](./docs/AUDIO_EDM_SPEC.md) — Audio system specification

---

## Historical Note

This project was originally designed as a physics-based marble music toy. It was migrated to a lane-based step sequencer for better timing predictability and clearer user mental model. Original design documents are preserved in `docs/archive/`.

---

## License

MIT
