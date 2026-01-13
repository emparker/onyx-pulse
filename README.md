# Onyx Pulse

A generative music physics toy. Tap to create glowing marbles that bounce and make music.

**Tap once, hear beauty. No tutorials, no friction.**

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser and tap anywhere to begin.

## Features

- **Physics-driven music** — Marbles bounce in a circular arena; collisions trigger notes
- **Pentatonic harmony** — Every note belongs to a C-major pentatonic scale, so everything sounds musical
- **Velocity-responsive audio** — Harder collisions are louder and brighter
- **Visual effects** — Neon glow, collision ripples, and fading marble trails
- **Touch-friendly** — Works on desktop and mobile devices

## How It Works

1. **Tap** anywhere inside the circle to spawn a marble
2. **Watch** as gravity pulls marbles down and they bounce off walls
3. **Listen** as collisions create harmonious notes
4. **Experiment** by spawning multiple marbles to create evolving soundscapes

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Vite](https://vitejs.dev/) | Build tool and dev server |
| [React 19](https://react.dev/) | UI framework |
| [Matter.js](https://brm.io/matter-js/) | 2D physics engine |
| [Tone.js](https://tonejs.github.io/) | Web audio synthesis |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |
| [Framer Motion](https://www.framer.com/motion/) | Animations |

## Scripts

```bash
npm run dev      # Start development server (http://localhost:5173)
npm run build    # Build for production (outputs to /dist)
npm run preview  # Preview production build locally
```

## Project Structure

```
onyx-pulse/
├── src/
│   ├── main.jsx                 # Entry point
│   ├── App.jsx                  # Root component
│   ├── components/
│   │   └── Canvas/
│   │       ├── PhysicsCanvas.jsx    # Main canvas renderer
│   │       ├── TrailLayer.jsx       # Marble trail effects
│   │       └── GlowBurst.jsx        # Collision ripple effects
│   ├── engine/
│   │   ├── physics.js           # Matter.js world setup
│   │   ├── audio.js             # Tone.js synth configuration
│   │   └── constants.js         # All tunable parameters
│   ├── hooks/
│   │   ├── usePhysicsWorld.js   # React wrapper for physics
│   │   └── useAudioEngine.js    # React wrapper for audio
│   ├── utils/
│   │   └── math.js              # Utility functions
│   └── styles/
│       └── globals.css          # Global styles
├── docs/
│   ├── ARCHITECTURE.md          # System design documentation
│   └── AUDIO_SPEC.md            # Audio system specification
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## Configuration

All tunable parameters live in `src/engine/constants.js`:

```javascript
// Physics
MARBLE_RADIUS: 12        // Size of marbles
MARBLE_RESTITUTION: 0.85 // Bounciness (0-1)
MAX_MARBLES: 100         // Performance limit

// Audio
PENTATONIC_SCALE: [...]  // Note frequencies (don't modify)
MAX_VELOCITY: 15         // Velocity ceiling for mapping

// Visuals
GLOW_BLUR: 15            // Neon glow intensity
TRAIL_DECAY: 0.92        // Trail fade rate per frame
```

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari (requires tap to enable audio)

**Note:** Audio requires user interaction to start due to browser autoplay policies.

## Development Status

| Phase | Status |
|-------|--------|
| Physics Foundation | Complete |
| Audio Integration | Complete |
| Visual Polish | Complete |
| Interactivity (walls, gravity) | Planned |
| Persistence & Sharing | Planned |
| PWA & Optimization | Planned |

## Documentation

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System design and data flow
- [AUDIO_SPEC.md](./docs/AUDIO_SPEC.md) — Audio engine specification
- [CLAUDE.md](./CLAUDE.md) — Development guidelines

## License

MIT
