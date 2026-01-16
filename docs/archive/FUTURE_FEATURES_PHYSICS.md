# Future Features: Recording & Sharing

This document outlines implementation details for recording and sharing features that were designed but not included in the initial release. Use this as a reference if you decide to add these capabilities later.

---

## 1. State Serialization (Sharing via URL)

### Overview
Allow users to share their creations via URL. The current marble positions, velocities, walls, and gravity are encoded into a Base64 string and appended as a query parameter.

### Implementation Approach

**Create `src/utils/serialize.js`:**

```javascript
import { MARBLE_COLORS } from '../engine/constants.js';

// Map color hex to index for compact serialization
const COLOR_TO_INDEX = MARBLE_COLORS.reduce((map, color, index) => {
  map[color.core] = index;
  return map;
}, {});

// Round to 1 decimal for compact URLs
function round(n) {
  return Math.round(n * 10) / 10;
}

export function serializeState(marbles, walls, gravity, bounds) {
  const state = {
    m: marbles.map(marble => ({
      x: round(marble.position.x),
      y: round(marble.position.y),
      vx: round(marble.velocity.x),
      vy: round(marble.velocity.y),
      c: COLOR_TO_INDEX[marble.plugin?.color] ?? 0,
    })),
    w: walls.map(wall => ({
      x1: round(wall.plugin?.startPoint?.x),
      y1: round(wall.plugin?.startPoint?.y),
      x2: round(wall.plugin?.endPoint?.x),
      y2: round(wall.plugin?.endPoint?.y),
    })),
    g: { x: round(gravity.x), y: round(gravity.y) },
    r: round(bounds.radius),
  };
  return btoa(encodeURIComponent(JSON.stringify(state)));
}

export function deserializeState(encoded) {
  try {
    const state = JSON.parse(decodeURIComponent(atob(encoded)));
    return {
      marbles: (state.m || []).map(m => ({
        x: m.x, y: m.y, vx: m.vx, vy: m.vy, colorIndex: m.c ?? 0,
      })),
      walls: (state.w || []).map(w => ({
        startPoint: { x: w.x1, y: w.y1 },
        endPoint: { x: w.x2, y: w.y2 },
      })),
      gravity: state.g || { x: 0, y: 1 },
      radius: state.r || 300,
    };
  } catch (e) {
    return null;
  }
}

export function loadStateFromURL() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('state');
  return encoded ? deserializeState(encoded) : null;
}

export function generateShareURL(encodedState) {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('state', encodedState);
  return url.toString();
}
```

### Physics Engine Additions

**Add to `src/engine/physics.js`:**

```javascript
// Create marble with specific state (for URL restoration)
export function createMarbleWithState(x, y, vx, vy, colorIndex) {
  const colorObj = MARBLE_COLORS[colorIndex] || MARBLE_COLORS[0];
  const marble = Bodies.circle(x, y, MARBLE_RADIUS, {
    restitution: MARBLE_RESTITUTION,
    friction: MARBLE_FRICTION,
    frictionAir: 0.001,
    label: 'marble',
    plugin: { color: colorObj.core, glowColor: colorObj.glow },
  });
  Body.setVelocity(marble, { x: vx, y: vy });
  return marble;
}
```

**Add to `usePhysicsWorld.js` return object:**

```javascript
// Get snapshot for serialization
const getStateSnapshot = useCallback(() => {
  return {
    marbles: getMarbles(worldRef.current),
    walls: getWalls(worldRef.current),
    gravity: { x: engineRef.current.gravity.x, y: engineRef.current.gravity.y },
    bounds: boundsRef.current,
  };
}, []);

// Restore from deserialized state
const restoreState = useCallback((state) => {
  // Clear existing bodies
  getMarbles(worldRef.current).forEach(m => Matter.Composite.remove(worldRef.current, m));
  getWalls(worldRef.current).forEach(w => Matter.Composite.remove(worldRef.current, w));

  // Restore gravity
  setEngineGravity(engineRef.current, state.gravity.x, state.gravity.y);

  // Restore marbles and walls
  state.marbles.forEach(m => {
    const marble = createMarbleWithState(m.x, m.y, m.vx, m.vy, m.colorIndex);
    Matter.Composite.add(worldRef.current, marble);
  });
  state.walls.forEach(w => {
    const wall = createWall(w.startPoint.x, w.startPoint.y, w.endPoint.x, w.endPoint.y);
    Matter.Composite.add(worldRef.current, wall);
  });
}, []);
```

### UI Component: ShareButton

```jsx
// src/components/UI/ShareButton.jsx
export function ShareButton({ getStateSnapshot }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const snapshot = getStateSnapshot?.();
    if (!snapshot) return;

    const encoded = serializeState(snapshot.marbles, snapshot.walls, snapshot.gravity, snapshot.bounds);
    const shareURL = generateShareURL(encoded);

    // Try Web Share API (mobile), fallback to clipboard
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Onyx Pulse', url: shareURL });
        return;
      } catch (e) { /* fallthrough */ }
    }

    await navigator.clipboard.writeText(shareURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return <button onClick={handleShare}>{copied ? 'Copied!' : 'Share'}</button>;
}
```

### App.jsx Integration

```jsx
// Load state from URL on mount
useEffect(() => {
  const state = loadStateFromURL();
  if (state) {
    setInitialState(state);
    // Clear URL to prevent re-loading
    window.history.replaceState({}, '', window.location.pathname);
  }
}, []);

// Pass to PhysicsCanvas
<PhysicsCanvas initialState={initialState} />
```

### Considerations

- **URL Length**: With many marbles/walls, URLs can get long. Consider compression (e.g., pako/gzip) if this becomes an issue
- **Validation**: Always validate deserialized state before restoring to prevent crashes
- **Version Field**: Consider adding a version field to the serialized state for future compatibility

---

## 2. Audio Recording

### Overview
Record the audio output as a .webm file that users can download and share.

### Implementation Approach

**Add to `src/engine/audio.js`:**

```javascript
let recorder = null;
let recordingStartTime = null;
const MAX_RECORDING_DURATION = 60000; // 60 seconds

export function isRecording() {
  return recorder !== null && recorder.state === 'started';
}

export function getRecordingDuration() {
  return recordingStartTime ? Date.now() - recordingStartTime : 0;
}

export async function startRecording() {
  if (!isInitialized || isRecording()) return false;

  recorder = new Tone.Recorder();
  Tone.Destination.connect(recorder);
  await recorder.start();
  recordingStartTime = Date.now();
  return true;
}

export async function stopRecording() {
  if (!isRecording()) return null;

  const blob = await recorder.stop();
  Tone.Destination.disconnect(recorder);
  recorder.dispose();
  recorder = null;
  recordingStartTime = null;
  return blob; // WebM audio blob
}

export function shouldAutoStopRecording() {
  return isRecording() && getRecordingDuration() >= MAX_RECORDING_DURATION;
}
```

### UI Component: RecordButton

```jsx
// src/components/UI/RecordButton.jsx
export function RecordButton() {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);

  // Poll duration while recording
  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(() => {
      setDuration(getRecordingDuration());
      if (shouldAutoStopRecording()) handleStop();
    }, 100);
    return () => clearInterval(interval);
  }, [recording]);

  const handleStart = async () => {
    await ensureAudioReady();
    if (await startRecording()) {
      setRecording(true);
    }
  };

  const handleStop = async () => {
    const blob = await stopRecording();
    setRecording(false);
    setDuration(0);

    if (blob?.size > 0) {
      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `onyx-pulse-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <button onClick={recording ? handleStop : handleStart}>
      {recording ? `Stop (${Math.floor(duration/1000)}s)` : 'Record'}
    </button>
  );
}
```

### Considerations

- **Browser Support**: Tone.Recorder uses MediaRecorder API. Check browser compatibility
- **Memory**: Long recordings consume memory. The 60s limit prevents issues
- **Format**: WebM is widely supported but not universal. Consider offering format options
- **Audio Context**: Recording requires audio to be initialized first (user gesture)
- **Visual Feedback**: Show recording indicator (pulsing red dot) and duration timer

---

## 3. UI Overlay Container

Both buttons should be contained in a fixed overlay:

```jsx
// src/components/UI/UIOverlay.jsx
export function UIOverlay({ getStateSnapshot }) {
  return (
    <div className="fixed bottom-5 right-5 flex flex-col gap-3 z-50">
      <RecordButton />
      <ShareButton getStateSnapshot={getStateSnapshot} />
    </div>
  );
}
```

### Styling Notes

- Position: Fixed, bottom-right corner
- Buttons: 40x40px circular, semi-transparent dark background
- Colors: Use `COLORS.ui` from constants (iconIdle, recording, success)
- Hover: Scale 1.1, brighten icon
- Recording state: Red glow, pulsing animation

---

## 4. Testing Checklist

Before shipping these features:

- [ ] Share URL works across browsers (Chrome, Safari, Firefox)
- [ ] URL restoration handles edge cases (empty state, invalid data)
- [ ] Recording works on iOS Safari (check permissions)
- [ ] Recording auto-stops at 60s limit
- [ ] Downloaded .webm plays in common media players
- [ ] UI buttons don't interfere with canvas interaction
- [ ] Memory usage stable during long recordings

---

## 5. Dependencies

No additional dependencies required. Uses:
- `Tone.Recorder` (already included in Tone.js)
- `navigator.clipboard` (Web API)
- `navigator.share` (Web Share API, mobile)
- `btoa`/`atob` (Base64, built-in)

---

*Document created during Day 5 implementation, preserved for future reference.*
