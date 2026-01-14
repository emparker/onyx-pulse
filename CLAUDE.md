# CLAUDE.md — Onyx Pulse Development Guide

> **Project:** Onyx Pulse — A generative music physics toy  
> **Stack:** Vite + React 19 · Matter.js · Tone.js · Tailwind CSS · Framer Motion

---

## 1. Prime Directive

**Every decision must serve the core UX promise:** *Tap once, hear beauty. No tutorials, no friction.*

When in doubt, ask: "Does this make the first 5 seconds more magical?"

---

## 2. Project Structure (Strict)

```
onyx-pulse/
├── src/
│   ├── main.jsx                 # Entry point (Tone.js context init)
│   ├── App.jsx                  # Root layout, state orchestration
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── PhysicsCanvas.jsx    # Matter.js renderer + glow effects
│   │   │   ├── TrailLayer.jsx       # Marble trail decay logic
│   │   │   └── GlowBurst.jsx        # Collision ripple animation
│   │   ├── Controls/
│   │   │   ├── WallDrawer.jsx       # Touch/mouse wall creation
│   │   │   └── GravityController.jsx # Device orientation handler
│   │   └── UI/
│   │       ├── RecordButton.jsx
│   │       └── ShareButton.jsx
│   ├── engine/
│   │   ├── physics.js           # Matter.js world setup + collision events
│   │   ├── audio.js             # Tone.js synth + scale mapping
│   │   └── constants.js         # All magic numbers live HERE
│   ├── hooks/
│   │   ├── usePhysicsWorld.js   # React wrapper for Matter.Engine
│   │   ├── useAudioEngine.js    # Tone.js lifecycle management
│   │   └── useDeviceMotion.js   # Accelerometer abstraction
│   ├── utils/
│   │   ├── math.js              # clamp, lerp, mapRange
│   │   └── serialize.js         # State → Base64 URL encoding
│   └── styles/
│       └── globals.css          # Tailwind base + custom glow vars
├── public/
│   └── manifest.json            # PWA config
├── index.html
├── vite.config.js
├── tailwind.config.js
├── package.json
└── docs/
    ├── ARCHITECTURE.md
    └── AUDIO_SPEC.md
```

**Rule:** Never create files outside this structure without explicit approval.

---

## 3. Immutable Constraints

### 3.1 Audio Engine Rules

| Rule | Rationale |
|------|-----------|
| **Initialize Tone.js ONLY on first user gesture** | Browser autoplay policies block audio until interaction |
| **Use `Tone.start()` inside a click/tap handler** | Required for iOS Safari and Chrome |
| **Never exceed 32 simultaneous voices** | CPU protection; use voice stealing |
| **All frequencies from `constants.js`** | Pentatonic scale is sacred — no accidentals |

```javascript
// constants.js — THE scale (do not modify)
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
```

### 3.2 Physics Engine Rules

| Rule | Rationale |
|------|-----------|
| **Matter.Engine.update() in rAF loop only** | Never in React render cycle |
| **Max 100 bodies in world** | Performance ceiling; oldest marbles despawn |
| **Restitution: 0.85** | Bouncy but not chaotic |
| **Friction: 0.01** | Marbles should feel "slick" |
| **Boundary is a composite of static arc segments** | Circle approximation via 36 segments |

### 3.3 Rendering Rules

| Rule | Rationale |
|------|-----------|
| **Canvas 2D only** (no WebGL for MVP) | Simpler debugging, sufficient perf |
| **Use `globalCompositeOperation: 'lighter'`** | Additive blending for neon glow |
| **shadowBlur ≤ 20px** | Performance; higher values tank FPS |
| **Trail decay: 0.92 alpha per frame** | Persist ~50 frames visually |

---

## 4. Development Commands

```bash
# Initial setup
npm create vite@latest onyx-pulse -- --template react
cd onyx-pulse
npm install matter-js tone framer-motion
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Development
npm run dev          # Vite dev server (port 5173)

# Production
npm run build        # Output to /dist
npm run preview      # Test production build locally
```

---

## 5. Implementation Checklist (By Day)

### Day 1: Physics Foundation
- [ ] Vite + React scaffold complete
- [ ] Matter.js world with circular boundary (36-segment polygon)
- [ ] Tap anywhere → spawn marble at touch point
- [ ] Marbles have slight random x-velocity variance (±2)
- [ ] Boundary collision detection working
- [ ] Console logs collision events (verify before audio)

**Exit Criteria:** 10 marbles bouncing smoothly at 60fps

### Day 2: Audio Integration
- [ ] Tone.js PolySynth initialized on first tap
- [ ] Collision → frequency mapping via impact energy
- [ ] Gain scales with collision velocity (0.1–1.0)
- [ ] Filter cutoff responds to velocity (200Hz–2000Hz)
- [ ] No audio pops or clicks on rapid collisions

**Exit Criteria:** Collisions produce harmonious, velocity-responsive tones

### Day 3: Visual Polish
- [ ] Neon glow on marbles (cyan/magenta palette)
- [ ] Collision ripple effect (expanding ring, fade out)
- [ ] Marble trails with exponential decay
- [ ] Dark background (#0a0a0f) with subtle radial gradient

**Exit Criteria:** Screenshot looks like concept art

### Day 4: Interactivity
- [ ] Wall drawing: touch-drag creates static segments
- [ ] Wall limit: max 10 user walls
- [ ] Double-tap wall to delete
- [ ] Accelerometer gravity (with fallback for desktop)
- [ ] Smooth gravity transitions (lerp, not snap)

**Exit Criteria:** User can trap marbles in custom shapes

### Day 5: Persistence & Sharing (DEFERRED)
> **Status:** Deferred. Implementation design documented in `docs/FUTURE_FEATURES.md`

Features planned but not yet implemented:
- State serialization to Base64 URL
- URL parsing on load → restore state
- Tone.Recorder integration
- Export as .webm audio file

**Exit Criteria:** Shareable links produce identical playback

### Day 6: Optimization
- [ ] Performance profiling (Chrome DevTools)
- [ ] 60fps with 50 marbles + 10 walls verified
- [ ] Memory leak audit (no orphaned bodies)
- [ ] PWA manifest + service worker
- [ ] Touch responsiveness < 16ms

**Exit Criteria:** Lighthouse PWA score ≥ 90

### Day 7: Ship It
- [ ] Vercel deployment
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] OG image + meta tags for social sharing
- [ ] Final README.md

---

## 6. Code Style Mandates

### React Components
```jsx
// ✅ Correct: Functional, hooks at top, early returns
export function PhysicsCanvas({ onCollision }) {
  const canvasRef = useRef(null);
  const engine = usePhysicsWorld();

  if (!engine) return null;

  return <canvas ref={canvasRef} />;
}

// ❌ Wrong: Class components, inline styles, business logic in JSX
```

### State Management
- **Local state only** — No Redux, Zustand, or context for MVP
- Physics world state lives in `useRef`, not `useState`
- Audio engine is a singleton module, not React state

### Event Handling
```javascript
// ✅ Correct: Throttled, passive listeners
canvas.addEventListener('touchmove', handleDraw, { passive: true });

// ❌ Wrong: Unthrottled mousemove, missing passive flag
```

### Error Handling
```javascript
// ✅ Correct: Graceful degradation
const motionSupported = 'DeviceOrientationEvent' in window;
if (!motionSupported) {
  console.info('Motion controls unavailable, using mouse fallback');
}

// ❌ Wrong: Crashing on missing API
```

---

## 7. Forbidden Patterns

| Anti-Pattern | Why It's Banned |
|--------------|-----------------|
| `setInterval` for animation | Use `requestAnimationFrame` exclusively |
| Audio files / samples | Synthesis only (bundle size, licensing) |
| npm packages > 50kb | Bundle bloat; find lighter alternatives |
| `!important` in CSS | Specificity wars destroy maintainability |
| `any` type if using TS | Defeats the purpose |
| `console.log` in production | Use structured logging or remove |
| Synchronous localStorage | Blocks main thread; use async if needed |

---

## 8. Testing Requirements

### Manual Testing Protocol
Before any PR/commit:
1. Fresh browser (incognito) — verify audio starts on first tap
2. Spam-tap 50 marbles — no frame drops
3. Draw 10 walls — no input lag
4. Leave running 5 min — no memory growth
5. Test on throttled CPU (4x slowdown)

### Automated (Stretch Goal)
- Vitest for utility functions (`math.js`, `serialize.js`)
- No E2E for MVP (audio testing is brittle)

---

## 9. Git Workflow

```bash
# Branch naming
feature/day-1-physics
feature/day-2-audio
fix/collision-detection-edge-case

# Commit format
feat(physics): implement circular boundary collision
fix(audio): prevent click on rapid note triggers
perf(canvas): reduce trail render overhead
```

**Rule:** Atomic commits. One feature/fix per commit.

---

## 10. Emergency Procedures

### "Audio Won't Start"
1. Check: Is `Tone.start()` inside a user gesture handler?
2. Check: Is there a `await Tone.loaded()` before playing?
3. Check: iOS requires unmuting: `Tone.context.resume()`

### "Physics Exploding"
1. Check: Is `timeScale` set to 1.0?
2. Check: Are bodies spawning inside other bodies?
3. Fix: Add spawn position validation

### "Canvas Blank"
1. Check: Is `canvas.getContext('2d')` returning null?
2. Check: Is canvas size set (not 0x0)?
3. Check: Is the render loop actually running?

### "Mobile Performance Tank"
1. Reduce `shadowBlur` to 10
2. Cap marbles at 30
3. Disable trails on low-end devices (check `navigator.hardwareConcurrency`)

---

## 11. Reference Links

- [Matter.js Docs](https://brm.io/matter-js/docs/)
- [Tone.js Docs](https://tonejs.github.io/)
- [Vite Config Reference](https://vitejs.dev/config/)
- [Framer Motion](https://www.framer.com/motion/)

---

## 12. Definition of Done

The project is complete when:
- [ ] A non-technical user can create music in < 5 seconds
- [ ] Works offline (PWA)
- [ ] Shareable via URL
- [ ] 60fps on iPhone 12 / Pixel 6 equivalent
- [ ] Zero console errors in production
- [ ] Generates genuine "wow" reaction on first use

---

*Last Updated: Project Kickoff*
