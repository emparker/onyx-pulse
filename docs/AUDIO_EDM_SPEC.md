# AUDIO_EDM_SPEC.md — Onyx Pulse Audio System

> **Version:** 2.0 (Sequencer Edition)
> **Stack:** Tone.js for Web Audio synthesis

---

## Overview

Onyx Pulse uses a four-voice synthesizer setup designed for EDM-style beats. All sounds are synthesized in real-time using Tone.js — no audio samples required.

---

## Signal Chain

```
┌─────────┐
│  KICK   │────────────────────────────┐
└─────────┘                            │
                                       ▼
┌─────────┐    ┌────────────┐    ┌──────────┐    ┌────────────┐    ┌─────────┐
│   HAT   │───►│ Highpass   │───►│          │    │   Master   │    │ Master  │
└─────────┘    │  8000Hz    │    │ Sidechain│───►│ Compressor │───►│ Limiter │───► OUTPUT
               └────────────┘    │   Gain   │    │            │    │  -1dB   │
┌─────────┐    ┌────────────┐    │          │    └────────────┘    └─────────┘
│  CLAP   │───►│ Bandpass   │───►│          │
└─────────┘    │  2500Hz    │    └──────────┘
               └────────────┘         ▲
┌─────────┐                           │
│  BASS   │───────────────────────────┘
└─────────┘
```

**Key Design:** Kick bypasses sidechain and triggers the "pump" effect on all other instruments.

---

## Instrument Specifications

### Kick (808-Style)

| Parameter | Value |
|-----------|-------|
| Synth Type | `MembraneSynth` |
| Pitch Decay | 0.05s |
| Octaves | 6 |
| Oscillator | Sine |
| Attack | 0.001s |
| Decay | 0.4s |
| Sustain | 0.01 |
| Release | 1.4s |
| Volume | -3dB |
| Note | C1 |
| Duration | 8n |

### Hi-Hat (High-passed Noise)

| Parameter | Value |
|-----------|-------|
| Synth Type | `NoiseSynth` |
| Noise Type | White |
| Filter | Highpass @ 8000Hz (Q: 1) |
| Attack | 0.001s |
| Decay | 0.06s |
| Sustain | 0 |
| Release | 0.03s |
| Volume | -4dB |
| Duration | 32n |

### Clap/Snare (Bandpass Noise)

| Parameter | Value |
|-----------|-------|
| Synth Type | `NoiseSynth` |
| Noise Type | White |
| Filter | Bandpass @ 2500Hz (Q: 2) |
| Attack | 0.005s |
| Decay | 0.15s |
| Sustain | 0 |
| Release | 0.1s |
| Volume | -8dB |
| Duration | 16n |

### Bass (Sub Bass MonoSynth)

| Parameter | Value |
|-----------|-------|
| Synth Type | `MonoSynth` |
| Oscillator | Square |
| Filter | Lowpass -24dB/oct (Q: 2) |
| Envelope Attack | 0.005s |
| Envelope Decay | 0.2s |
| Envelope Sustain | 0.4 |
| Envelope Release | 0.3s |
| Filter Base Freq | 100Hz |
| Filter Octaves | 2 |
| Volume | -6dB |
| Duration | 8n |
| Scale | F Minor Pentatonic |

**Bass Notes (cyclic):** `F2 → Ab2 → Bb2 → C3 → Eb3`

The bass cycles through the F Minor Pentatonic scale with each trigger, resetting to F2 on every downbeat (step 0).

---

## Sidechain Compression

The signature "pump" effect is achieved via gain automation on all non-kick instruments:

```javascript
// On kick trigger:
sidechainGain.gain.setValueAtTime(1, now);                    // Start at full
sidechainGain.gain.linearRampToValueAtTime(0.3, now + 0.01);  // Duck to 30%
sidechainGain.gain.linearRampToValueAtTime(1, now + 0.15);    // Recover over 150ms
```

| Parameter | Value |
|-----------|-------|
| Duck Depth | 70% (gain drops to 0.3) |
| Attack | 10ms |
| Release | 150ms |

The visual "pump" effect in the UI mirrors this timing, dimming non-kick lanes when kick fires.

---

## Master Bus

### Compressor

| Parameter | Value |
|-----------|-------|
| Threshold | -24dB |
| Ratio | 4:1 |
| Attack | 3ms |
| Release | 250ms |

### Limiter

| Parameter | Value |
|-----------|-------|
| Ceiling | -1dB |

---

## Timing

| Parameter | Value |
|-----------|-------|
| Default Tempo | 128 BPM |
| Tempo Range | 80-160 BPM |
| Tempo Step | 4 BPM |
| Resolution | 16th notes |
| Steps per Bar | 16 |
| Transport | `Tone.Transport` with `scheduleRepeat` |

The clock uses `Tone.Transport.scheduleRepeat()` at 16th note intervals for sample-accurate timing. BPM changes are applied directly to `Tone.Transport.bpm.value`.

---

## Clock System

### Step Scheduling

```javascript
// Initialize transport
Tone.Transport.bpm.value = TEMPO_BPM;

// Schedule 16th note callback
Tone.Transport.scheduleRepeat((time) => {
  // Notify listeners for visual sync
  Tone.Draw.schedule(() => {
    const stepInfo = advancePlayhead();
    // stepInfo contains which lanes are active at this step
  }, time);
}, '16n');

Tone.Transport.start();
```

### Step Info Structure

Each step tick emits:
- `step`: Current step index (0-15)
- `activeLanes`: Array of lane IDs with triggers at this step
- `isDownbeat`: True when step === 0
- `isBeat`: True on quarter notes (step % 4 === 0)

---

## Lane Configuration

| Lane | Display Name | Core Color | Glow Color |
|------|-------------|------------|------------|
| kick | KICK | #f97316 (orange) | #7c2d12 |
| hat | HAT | #00ffff (cyan) | #0a3d4a |
| clap | CLAP | #f8fafc (white) | #64748b |
| bass | BASS | #a855f7 (purple) | #581c87 |

---

## Initialization Requirements

**Browser Autoplay Policy:** Audio context must be started inside a user gesture (click/tap):

```javascript
// Inside click/tap handler:
await Tone.start();
// Then initialize synths...
```

This is enforced in `initAudio()` and wrapped by `useAudioEngine.js`.

---

## Volume Balance Reference

| Instrument | Volume | Rationale |
|------------|--------|-----------|
| Kick | -3dB | Foundation, needs punch |
| Hat | -4dB | Bright but not piercing |
| Clap | -8dB | Cuts through on backbeat |
| Bass | -6dB | Fills low end without masking kick |

---

## Sound Trigger Flow

1. Clock emits step event at 16th note intervals
2. `useSequencer` hook receives step info
3. For each active lane at current step:
   - Check if lane is muted
   - If not muted, call appropriate play function:
     - `playKick()` → triggers sidechain
     - `playHat()`
     - `playClap()`
     - `playBass()` → cycles through scale
4. On downbeat (step 0), reset bass note index to F2

---

## Files

| File | Purpose |
|------|---------|
| `src/engine/audio.js` | Synth definitions, sidechain, master bus |
| `src/engine/clock.js` | Tone.Transport timing, step scheduling |
| `src/engine/constants.js` | Scale, tempo range, lane colors |
| `src/hooks/useAudioEngine.js` | React lifecycle wrapper |
| `src/hooks/useSequencer.js` | Triggers sounds on step events |

---

## Disposal

All Tone.js nodes are explicitly disposed on unmount to prevent memory leaks:

- Synths (kick, hat, clap, bass)
- Filters (hatFilter, clapFilter)
- Gain nodes (sidechainGain)
- Master chain (compressor, limiter)

---

## Tone.js Quick Reference

```javascript
// Start audio context (required before any sound)
await Tone.start();

// Transport controls
Tone.Transport.start();
Tone.Transport.stop();
Tone.Transport.bpm.value = 128;

// Scheduling
Tone.Transport.scheduleRepeat(callback, interval);

// Visual sync (run callback in animation frame synced to audio time)
Tone.Draw.schedule(callback, time);

// Current time
Tone.now();  // Audio context time in seconds
```

---

*Last Updated: January 2026*
