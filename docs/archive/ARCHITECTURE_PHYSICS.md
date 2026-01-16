
# Architecture Overview — Onyx Pulse

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Application                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   App.jsx    │───▶│ PhysicsCanvas│───▶│  TrailLayer  │       │
│  │  (State Hub) │    │  (Renderer)  │    │  GlowBurst   │       │
│  └──────┬───────┘    └──────────────┘    └──────────────┘       │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                    Custom Hooks                       │       │
│  │  ┌────────────────┐  ┌────────────────┐             │       │
│  │  │usePhysicsWorld │  │ useAudioEngine │             │       │
│  │  │   (Matter.js)  │  │   (Tone.js)    │             │       │
│  │  └───────┬────────┘  └───────┬────────┘             │       │
│  └──────────┼───────────────────┼───────────────────────┘       │
│             │                   │                                │
└─────────────┼───────────────────┼────────────────────────────────┘
              │                   │
              ▼                   ▼
┌─────────────────────┐  ┌─────────────────────┐
│   engine/physics.js │  │   engine/audio.js   │
│                     │  │                     │
│  • World creation   │  │  • Synth setup      │
│  • Body spawning    │  │  • Note triggering  │
│  • Collision events │  │  • Gain/filter calc │
│  • Boundary logic   │  │  • Voice management │
└─────────────────────┘  └─────────────────────┘
```

---

## Data Flow

### 1. User Tap → Marble Spawn

```
User Tap Event
    │
    ▼
App.jsx: handleCanvasTap(x, y)
    │
    ├──▶ First tap? → Tone.start() // Unlock audio context
    │
    ▼
usePhysicsWorld.spawnMarble(x, y)
    │
    ▼
physics.js: Matter.Bodies.circle(x, y, radius, options)
    │
    ▼
Matter.Composite.add(world, body)
```

### 2. Collision → Sound

```
Matter.Events.on(engine, 'collisionStart', callback)
    │
    ▼
Calculate impact magnitude:
  velocity = Math.sqrt(vx² + vy²)
  magnitude = clamp(velocity / MAX_VELOCITY, 0.1, 1.0)
    │
    ▼
Map to musical parameters:
  noteIndex = Math.floor(magnitude * SCALE.length)
  frequency = PENTATONIC_SCALE[noteIndex]
  gain = magnitude
  filterCutoff = 200 + (magnitude * 1800)
    │
    ▼
audio.js: triggerNote(frequency, gain, filterCutoff)
    │
    ▼
Tone.PolySynth.triggerAttackRelease(freq, duration, time, velocity)
```

### 3. Render Loop

```
requestAnimationFrame(loop)
    │
    ▼
Matter.Engine.update(engine, delta)  // Physics step
    │
    ▼
Clear canvas (with alpha for trails)
    │
    ▼
For each body in world:
  │
  ├──▶ Draw marble (circle + glow)
  │
  └──▶ Update trail buffer
    │
    ▼
Draw trails (faded positions)
    │
    ▼
Draw user walls
    │
    ▼
Draw collision bursts (if any active)
    │
    ▼
requestAnimationFrame(loop)  // Next frame
```

---

## Module Responsibilities

### `engine/physics.js`

**Exports:**
```javascript
createWorld()        // Returns { engine, world, render }
spawnMarble(x, y)    // Adds marble body to world
spawnWall(points)    // Adds static wall segment
removeBody(body)     // Safely removes from world
setGravity(x, y)     // Updates engine.gravity
getBodies()          // Returns all dynamic bodies
onCollision(cb)      // Registers collision callback
dispose()            // Cleanup for unmount
```

**Internal State:**
- `engine` — Matter.Engine instance
- `world` — Matter.World instance
- `bodyCount` — For enforcing limits

### `engine/audio.js`

**Exports:**
```javascript
initAudio()              // Call on first user gesture
triggerNote(freq, vel)   // Play a note
setMasterVolume(0-1)     // Global volume
startRecording()         // Begin capture
stopRecording()          // Returns Blob
dispose()                // Cleanup
```

**Internal State:**
- `synth` — Tone.PolySynth instance
- `filter` — Tone.Filter instance
- `recorder` — Tone.Recorder instance
- `isInitialized` — Boolean gate

### `engine/constants.js`

```javascript
// Physics
export const MAX_MARBLES = 100;
export const MARBLE_RADIUS = 12;
export const MARBLE_RESTITUTION = 0.85;
export const MARBLE_FRICTION = 0.01;
export const BOUNDARY_SEGMENTS = 36;
export const SPAWN_VELOCITY_VARIANCE = 2;

// Audio
export const PENTATONIC_SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
export const MAX_VELOCITY = 15;
export const NOTE_DURATION = '8n';
export const MAX_VOICES = 32;

// Visuals
export const GLOW_BLUR = 15;
export const TRAIL_DECAY = 0.92;
export const BACKGROUND_COLOR = '#0a0a0f';
export const MARBLE_COLORS = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00'];
```

---

## State Management Strategy

### What Lives Where

| State | Location | Why |
|-------|----------|-----|
| Physics engine | `useRef` in hook | Mutable, not React-reactive |
| Marble positions | Matter.js bodies | Source of truth is physics engine |
| Audio context | Module singleton | Shared across components |
| User walls | `useState` array | UI needs to react to changes |
| Recording state | `useState` boolean | UI toggle |
| Gravity vector | `useRef` | Updated frequently, no re-render needed |

### Anti-Pattern: Syncing Physics to React State

```javascript
// ❌ WRONG: Causes 60 re-renders per second
const [marbles, setMarbles] = useState([]);
useEffect(() => {
  const loop = () => {
    setMarbles(getBodies().map(b => ({ x: b.position.x, y: b.position.y })));
    requestAnimationFrame(loop);
  };
  loop();
}, []);

// ✅ CORRECT: Read directly in render
const canvasRef = useRef();
useEffect(() => {
  const ctx = canvasRef.current.getContext('2d');
  const loop = () => {
    getBodies().forEach(body => {
      ctx.drawCircle(body.position.x, body.position.y, MARBLE_RADIUS);
    });
    requestAnimationFrame(loop);
  };
  loop();
}, []);
```

---

## Collision Detection Deep Dive

### Boundary Construction

The circular boundary is approximated with line segments:

```javascript
function createCircularBoundary(cx, cy, radius, segments = 36) {
  const bodies = [];
  const angleStep = (Math.PI * 2) / segments;
  
  for (let i = 0; i < segments; i++) {
    const a1 = i * angleStep;
    const a2 = (i + 1) * angleStep;
    
    const x1 = cx + Math.cos(a1) * radius;
    const y1 = cy + Math.sin(a1) * radius;
    const x2 = cx + Math.cos(a2) * radius;
    const y2 = cy + Math.sin(a2) * radius;
    
    // Create thin rectangle between points
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    
    bodies.push(Matter.Bodies.rectangle(midX, midY, length, 4, {
      isStatic: true,
      angle: angle,
      label: 'boundary',
      render: { visible: false }
    }));
  }
  
  return Matter.Composite.create({ bodies });
}
```

### Collision Filtering

```javascript
Matter.Events.on(engine, 'collisionStart', (event) => {
  event.pairs.forEach(pair => {
    const { bodyA, bodyB } = pair;
    
    // Only trigger audio for marble-boundary or marble-marble
    const isMarbleA = bodyA.label === 'marble';
    const isMarbleB = bodyB.label === 'marble';
    const isBoundary = bodyA.label === 'boundary' || bodyB.label === 'boundary';
    const isWall = bodyA.label === 'wall' || bodyB.label === 'wall';
    
    if ((isMarbleA || isMarbleB) && (isBoundary || isWall || (isMarbleA && isMarbleB))) {
      const velocity = Math.sqrt(
        pair.collision.tangent.x ** 2 + 
        pair.collision.tangent.y ** 2
      );
      const point = pair.collision.supports[0] || bodyA.position;
      
      emitCollision({ velocity, point, bodyA, bodyB });
    }
  });
});
```

---

## Performance Budgets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Frame time | < 16ms | `performance.now()` delta |
| JS Heap | < 50MB | Chrome DevTools Memory |
| Bodies | ≤ 100 | `world.bodies.length` |
| Draw calls | < 200/frame | Canvas operations count |
| Audio latency | < 20ms | Tone.context.lookAhead |

### Performance Monitoring Hook

```javascript
function usePerformanceMonitor() {
  const frameTimesRef = useRef([]);
  
  useEffect(() => {
    let lastTime = performance.now();
    
    const measure = () => {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;
      
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }
      
      if (delta > 20) {
        console.warn(`Frame drop: ${delta.toFixed(1)}ms`);
      }
      
      requestAnimationFrame(measure);
    };
    
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, []);
  
  return {
    getAverageFPS: () => {
      const avg = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      return 1000 / avg;
    }
  };
}
```

---

## Error Boundaries

```jsx
// src/components/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, info) {
    console.error('Onyx Pulse Error:', error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <p>Something went wrong. Tap to restart.</p>
          <button onClick={() => window.location.reload()}>
            Restart
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## Future Considerations (Post-MVP)

1. **WebGL Renderer** — For 500+ marbles, switch to PixiJS or Three.js
2. **Web Workers** — Offload physics to worker thread
3. **MIDI Output** — Connect to external synths
4. **Multiplayer** — WebRTC for shared canvases
5. **Presets** — Curated starting configurations
