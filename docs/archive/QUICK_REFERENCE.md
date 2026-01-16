# Quick Reference — Onyx Pulse

> Print this. Tape it to your monitor.

---

## Magic Numbers

```javascript
// Copy-paste ready
const MARBLE_RADIUS = 12;
const MARBLE_RESTITUTION = 0.85;
const MARBLE_FRICTION = 0.01;
const MAX_MARBLES = 100;
const MAX_WALLS = 10;
const MAX_VELOCITY = 15;
const BOUNDARY_SEGMENTS = 36;
const GLOW_BLUR = 15;
const TRAIL_DECAY = 0.92;
```

---

## Pentatonic Scale (Hz)

```
C4: 261.63  |  D4: 293.66  |  E4: 329.63  |  G4: 392.00
A4: 440.00  |  C5: 523.25  |  D5: 587.33  |  E5: 659.25
```

---

## Color Palette

| Use | Hex | RGB |
|-----|-----|-----|
| Background | `#0a0a0f` | 10, 10, 15 |
| Marble 1 (Cyan) | `#00ffff` | 0, 255, 255 |
| Marble 2 (Magenta) | `#ff00ff` | 255, 0, 255 |
| Marble 3 (Yellow) | `#ffff00` | 255, 255, 0 |
| Marble 4 (Green) | `#00ff00` | 0, 255, 0 |
| Glow | `rgba(0,255,255,0.5)` | — |

---

## Matter.js Cheatsheet

```javascript
// Create marble
Matter.Bodies.circle(x, y, 12, {
  restitution: 0.85,
  friction: 0.01,
  label: 'marble'
});

// Create wall
Matter.Bodies.rectangle(x, y, width, height, {
  isStatic: true,
  angle: radians,
  label: 'wall'
});

// Add to world
Matter.Composite.add(world, body);

// Remove
Matter.Composite.remove(world, body);

// Collision listener
Matter.Events.on(engine, 'collisionStart', (e) => {
  e.pairs.forEach(pair => { /* ... */ });
});

// Update physics (in rAF)
Matter.Engine.update(engine, delta);

// Change gravity
engine.gravity.x = 0;
engine.gravity.y = 1;
```

---

## Tone.js Cheatsheet

```javascript
// Init (MUST be in user gesture)
await Tone.start();

// Create synth
const synth = new Tone.PolySynth(Tone.Synth).toDestination();

// Play note
synth.triggerAttackRelease(440, '8n');

// With velocity
synth.triggerAttackRelease(440, '8n', Tone.now(), 0.7);

// Filter
const filter = new Tone.Filter(2000, 'lowpass');
synth.connect(filter);
filter.toDestination();

// Record
const recorder = new Tone.Recorder();
synth.connect(recorder);
await recorder.start();
const blob = await recorder.stop();
```

---

## Canvas Glow Effect

```javascript
ctx.shadowColor = '#00ffff';
ctx.shadowBlur = 15;
ctx.globalCompositeOperation = 'lighter';

// Draw glowing circle
ctx.beginPath();
ctx.arc(x, y, radius, 0, Math.PI * 2);
ctx.fillStyle = '#00ffff';
ctx.fill();

// Reset
ctx.shadowBlur = 0;
ctx.globalCompositeOperation = 'source-over';
```

---

## Velocity Formulas

```javascript
// Normalize collision velocity
normalized = clamp(velocity / 15, 0, 1);

// Velocity → Note index
noteIndex = Math.floor(Math.sqrt(normalized) * 7);

// Velocity → Gain
gain = 0.15 + (normalized * 0.7);

// Velocity → Filter cutoff
cutoff = 300 + (Math.pow(normalized, 1.5) * 2700);
```

---

## Common Bugs & Fixes

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| No audio | Context not started | `await Tone.start()` in click handler |
| Audio pops | Instant gain changes | Use `rampTo()` instead of `setValueAtTime()` |
| Physics explosion | Bodies spawning inside each other | Add spawn position validation |
| Canvas blank | Zero dimensions | Set explicit width/height on canvas |
| Choppy animation | Using `setTimeout` | Switch to `requestAnimationFrame` |
| Memory leak | Bodies not removed | Track and limit body count |

---

## Dev Commands

```bash
npm run dev       # Start Vite (port 5173)
npm run build     # Production build
npm run preview   # Test production locally
```

---

## Files to Touch Per Day

| Day | Primary Files |
|-----|---------------|
| 1 | `physics.js`, `PhysicsCanvas.jsx`, `usePhysicsWorld.js` |
| 2 | `audio.js`, `useAudioEngine.js`, `constants.js` |
| 3 | `TrailLayer.jsx`, `GlowBurst.jsx`, `globals.css` |
| 4 | `WallDrawer.jsx`, `GravityController.jsx`, `useDeviceMotion.js` |
| 5 | `serialize.js`, `ShareButton.jsx`, `RecordButton.jsx` |
| 6 | All (optimization pass) |
| 7 | `manifest.json`, `README.md`, deployment config |

---

## Definition of Done Checklist

```
[ ] Tap produces marble + sound
[ ] 60fps with 50 marbles
[ ] Works offline
[ ] Shareable via URL
[ ] No console errors
[ ] Generates "wow" reaction
```
