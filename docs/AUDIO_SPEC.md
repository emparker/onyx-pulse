# Audio Specification — Onyx Pulse

## Philosophy

> "The user is always a musician. The system's job is to make their chaos sound intentional."

Every collision produces a note. Every note belongs to the scale. Dissonance is impossible by design.

---

## The Sacred Scale

**C-Major Pentatonic** — The most universally pleasing scale across cultures.

| Note | Frequency (Hz) | MIDI | Role |
|------|---------------|------|------|
| C4 | 261.63 | 60 | Root |
| D4 | 293.66 | 62 | Tension |
| E4 | 329.63 | 64 | Brightness |
| G4 | 392.00 | 67 | Power |
| A4 | 440.00 | 69 | Standard pitch |
| C5 | 523.25 | 72 | Octave root |
| D5 | 587.33 | 74 | Upper tension |
| E5 | 659.25 | 76 | Upper brightness |

### Why Pentatonic?

- **No semitones** — Eliminates harsh intervals
- **Self-harmonizing** — Any two notes played together sound good
- **Cultural universality** — Found in music worldwide
- **Limited choices** — 8 notes keeps complexity manageable

---

## Synth Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐
│ PolySynth   │────▶│   Filter    │────▶│   Volume    │────▶│ Destination
│ (32 voices) │     │ (Lowpass)   │     │   (Master)  │     │ (Speakers)
└─────────────┘     └─────────────┘     └─────────────┘     └─────────┘
       │
       │ Voice Settings:
       │  • Oscillator: Triangle
       │  • Envelope: Pluck-style
       │  • Partial count: 2
```

### Tone.js Configuration

```javascript
const synth = new Tone.PolySynth(Tone.Synth, {
  maxPolyphony: 32,
  voice: Tone.Synth,
  options: {
    oscillator: {
      type: 'triangle4'  // Triangle with 4 partials (warm, not harsh)
    },
    envelope: {
      attack: 0.005,     // Near-instant onset
      decay: 0.3,        // Quick fade
      sustain: 0.1,      // Minimal sustain
      release: 0.8       // Gentle tail
    }
  }
});

const filter = new Tone.Filter({
  type: 'lowpass',
  frequency: 2000,
  rolloff: -12,
  Q: 1
});

const volume = new Tone.Volume(-6);  // Headroom for mixing

// Signal chain
synth.connect(filter);
filter.connect(volume);
volume.toDestination();
```

---

## Velocity Mapping

Collision energy determines three parameters:

### 1. Note Selection

```javascript
function velocityToNote(velocity) {
  const normalized = clamp(velocity / MAX_VELOCITY, 0, 1);
  
  // Lower velocities = lower notes, higher = higher
  // Using sqrt to make mid-range more accessible
  const index = Math.floor(Math.sqrt(normalized) * (SCALE.length - 1));
  
  return PENTATONIC_SCALE[index];
}
```

### 2. Gain (Loudness)

```javascript
function velocityToGain(velocity) {
  const normalized = clamp(velocity / MAX_VELOCITY, 0, 1);
  
  // Soft collisions still audible, hard collisions don't clip
  // Range: 0.15 to 0.85
  return 0.15 + (normalized * 0.7);
}
```

### 3. Filter Cutoff (Brightness)

```javascript
function velocityToFilter(velocity) {
  const normalized = clamp(velocity / MAX_VELOCITY, 0, 1);
  
  // Soft = muffled (300Hz), hard = bright (3000Hz)
  // Exponential curve for more natural response
  return 300 + (Math.pow(normalized, 1.5) * 2700);
}
```

### Combined Trigger Function

```javascript
function triggerCollisionNote(velocity, time = Tone.now()) {
  const freq = velocityToNote(velocity);
  const gain = velocityToGain(velocity);
  const cutoff = velocityToFilter(velocity);
  
  // Apply filter modulation
  filter.frequency.setValueAtTime(cutoff, time);
  filter.frequency.exponentialRampToValueAtTime(300, time + 0.3);
  
  // Trigger note
  synth.triggerAttackRelease(freq, '8n', time, gain);
}
```

---

## Voice Stealing Strategy

With 32 voices and potentially 100 marbles, voice management is critical:

```javascript
// Tone.js handles this automatically with PolySynth
// But we add additional protection:

let activeNotes = 0;
const MAX_SIMULTANEOUS = 8;  // Practical limit for clarity

function safeNoteOn(freq, gain, duration) {
  if (activeNotes >= MAX_SIMULTANEOUS) {
    // Skip this note rather than queue
    return;
  }
  
  activeNotes++;
  synth.triggerAttackRelease(freq, duration, Tone.now(), gain);
  
  // Decrement after note ends
  setTimeout(() => {
    activeNotes = Math.max(0, activeNotes - 1);
  }, Tone.Time(duration).toMilliseconds());
}
```

---

## Audio Context Initialization

**Critical:** Browser security requires user gesture to start audio.

```javascript
let isInitialized = false;

async function initAudio() {
  if (isInitialized) return;
  
  // Resume suspended context (required for iOS)
  await Tone.start();
  
  // Wait for any samples to load (if using Sampler)
  await Tone.loaded();
  
  // Warm up the synth with a silent note
  synth.triggerAttackRelease(440, 0.001, Tone.now(), 0);
  
  isInitialized = true;
  console.log('Audio initialized');
}

// Must be called from user gesture handler
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('touchstart', initAudio, { once: true });
```

---

## Latency Optimization

### Target: < 20ms perceived latency

```javascript
// Set context settings before any audio
Tone.context.lookAhead = 0.01;  // 10ms buffer (lower = less latency, more CPU)

// Use immediate scheduling
synth.triggerAttackRelease(freq, '8n', undefined, gain);  // 'undefined' = now

// Avoid this (adds latency):
// synth.triggerAttackRelease(freq, '8n', '+0.1', gain);
```

### Audio Worklet Consideration

For sub-10ms latency in future versions:
```javascript
// Future: Custom AudioWorklet for direct sample output
// Not needed for MVP, but noted for optimization phase
```

---

## Recording Implementation

```javascript
const recorder = new Tone.Recorder();
volume.connect(recorder);  // Tap the signal chain

let recordingBlob = null;

async function startRecording() {
  await recorder.start();
}

async function stopRecording() {
  recordingBlob = await recorder.stop();
  return recordingBlob;
}

function downloadRecording() {
  if (!recordingBlob) return;
  
  const url = URL.createObjectURL(recordingBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `onyx-pulse-${Date.now()}.webm`;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## Debug Mode

For development, add visual audio debugging:

```javascript
const DEBUG_AUDIO = import.meta.env.DEV;

function debugNoteOn(freq, gain, velocity) {
  if (!DEBUG_AUDIO) return;
  
  const noteNames = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'];
  const noteIndex = PENTATONIC_SCALE.indexOf(freq);
  const noteName = noteNames[noteIndex] || 'Unknown';
  
  console.log(`🎵 ${noteName} | vel: ${velocity.toFixed(2)} | gain: ${gain.toFixed(2)}`);
}
```

---

## Known Gotchas

### 1. iOS Silent Mode
Even with audio initialized, iOS silent mode mutes web audio. No workaround — inform users.

### 2. Tab Backgrounding
Chrome throttles audio in background tabs:
```javascript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    Tone.Transport.pause();
  } else {
    Tone.Transport.start();
  }
});
```

### 3. Bluetooth Latency
Bluetooth headphones add 100-300ms latency. Can't fix, but could detect and warn:
```javascript
// Rough detection (not reliable)
navigator.mediaDevices.enumerateDevices().then(devices => {
  const hasBluetooth = devices.some(d => d.label.toLowerCase().includes('bluetooth'));
  if (hasBluetooth) {
    console.info('Bluetooth audio detected — expect latency');
  }
});
```

### 4. Sample Rate Mismatch
Some devices run at 44.1kHz, others at 48kHz. Tone.js handles this, but be aware during testing.

---

## Testing Checklist

- [ ] First tap produces sound
- [ ] Soft collisions = quiet, muffled
- [ ] Hard collisions = loud, bright
- [ ] No audio pops/clicks on rapid notes
- [ ] Recording captures full session
- [ ] Audio stops when tab closes
- [ ] Works in Safari (most restrictive)
- [ ] Works with screen off (mobile)

---

## Future Audio Features (Post-MVP)

1. **Instrument Selection** — Pluck, Bell, Pad, Bass
2. **Scale Selection** — Minor Pentatonic, Blues, Japanese
3. **Reverb/Delay** — Spatial effects
4. **Tempo Sync** — Quantize notes to grid
5. **MIDI Export** — Generate .mid file from session
