# AUDIO_EDM_SPEC.md — Onyx Pulse Audio System

> **Version:** 3.0 (Full EDM Edition)
> **Stack:** Tone.js for Web Audio synthesis

---

## Overview

Onyx Pulse uses a **14-voice synthesizer setup** designed for EDM-style production. All sounds are synthesized in real-time using Tone.js — no audio samples required.

**Voice breakdown:**
- 5 Grid Lane Synths (kick, hat, clap, perc, sub)
- 4 Pattern Lane Synths (wobble, chord, lead, arp)
- 4 Stab FX Synths (laser, impact, reverse, riser)
- 1 Snare Roll (reuses clap synth)

---

## Signal Chain

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           GRID LANES                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────┐                                                             │
│  │  KICK   │─────────────────────────────────────────┐                   │
│  └─────────┘                                         │ (bypasses         │
│                                                      │  sidechain)       │
│  ┌─────────┐    ┌────────────┐                       │                   │
│  │   HAT   │───►│ HP 8000Hz  │───┐                   │                   │
│  └─────────┘    └────────────┘   │                   │                   │
│                                  │                   │                   │
│  ┌─────────┐    ┌────────────┐   │    ┌──────────┐   │                   │
│  │  CLAP   │───►│ BP 2500Hz  │───┼───►│ Sidechain│───┼───┐               │
│  └─────────┘    └────────────┘   │    │   Gain   │   │   │               │
│                                  │    └──────────┘   │   │               │
│  ┌─────────┐                     │         ▲        │   │               │
│  │  PERC   │─────────────────────┤         │        │   │               │
│  └─────────┘                     │    (duck on      │   │               │
│                                  │     kick)        │   │               │
│  ┌─────────┐                     │                   │   │               │
│  │   SUB   │─────────────────────┘                   │   │               │
│  └─────────┘                                         │   │               │
│                                                      │   │               │
├──────────────────────────────────────────────────────┼───┼───────────────┤
│                        PATTERN LANES                 │   │               │
├──────────────────────────────────────────────────────┼───┼───────────────┤
│                                                      │   │               │
│  ┌─────────┐    ┌─────┐                              │   │               │
│  │ WOBBLE  │───►│ LFO │──────────────────────────────┼───┤               │
│  └─────────┘    └─────┘                              │   │               │
│                                                      │   │               │
│  ┌─────────┐                                         │   │               │
│  │  CHORD  │─────────────────────────────────────────┼───┤               │
│  └─────────┘                                         │   │               │
│                                                      │   │               │
│  ┌─────────┐                                         │   │               │
│  │  LEAD   │─────────────────────────────────────────┼───┤               │
│  └─────────┘                                         │   │               │
│                                                      │   │               │
│  ┌─────────┐                                         │   │               │
│  │   ARP   │─────────────────────────────────────────┼───┘               │
│  └─────────┘                                         │                   │
│                                                      │                   │
├──────────────────────────────────────────────────────┼───────────────────┤
│                          STABS                       │                   │
├──────────────────────────────────────────────────────┼───────────────────┤
│                                                      │                   │
│  ┌─────────┐                                         │                   │
│  │  LASER  │─────────────────────────────────────────┼───┐               │
│  └─────────┘ (pitch sweep C5→C2)                     │   │               │
│                                                      │   │               │
│  ┌─────────┐                                         │   │               │
│  │ IMPACT  │ (membrane) ─────────────────────────────┤   │               │
│  │ + noise │─────────────────────────────────────────┼───┤               │
│  └─────────┘ (boosted)                               │   │               │
│                                                      │   │               │
│  ┌─────────┐    ┌────────────┐                       │   │               │
│  │ REVERSE │───►│ LP sweep   │───────────────────────┼───┤               │
│  └─────────┘    └────────────┘ (swell-in effect)     │   │               │
│                                                      │   │               │
│  ┌─────────┐    ┌────────────┐                       │   │               │
│  │  RISER  │───►│ LP sweep   │───────────────────────┼───┘               │
│  └─────────┘    └────────────┘                       │                   │
│                                                      │                   │
└──────────────────────────────────────────────────────┴───────────────────┘
                                                       │
                                                       ▼
                                            ┌──────────────────┐
                                            │ Master Highpass  │
                                            │   (20-2000Hz)    │
                                            │  Build/Drop ctrl │
                                            └────────┬─────────┘
                                                     │
                                                     ▼
                                            ┌──────────────────┐
                                            │     Limiter      │
                                            │      -1dB        │
                                            └────────┬─────────┘
                                                     │
                                                     ▼
                                            ┌──────────────────┐
                                            │   Compressor     │
                                            │  -24dB / 4:1     │
                                            └────────┬─────────┘
                                                     │
                                                     ▼
                                                  OUTPUT
```

**Key Design Principles:**
- Kick bypasses sidechain to stay punchy
- Kick triggers the "pump" effect on all other instruments
- Master highpass enables build/drop tension control
- All content locked to C minor for guaranteed musical results

---

## Lane Categories

| Category | Lanes | Type |
|----------|-------|------|
| **DRUMS** | kick, hat, clap, perc | Grid (16-step) |
| **BASS** | sub, wobble | Grid + Pattern |
| **MELODIC** | chord, lead, arp | Pattern |

---

## Grid Lane Instruments

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
| Routing | Direct to master (bypasses sidechain) |

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

### Perc (Tuned Percussion)

| Parameter | Value |
|-----------|-------|
| Synth Type | `MembraneSynth` |
| Pitch Decay | 0.02s |
| Octaves | 2 |
| Oscillator | Sine |
| Attack | 0.001s |
| Decay | 0.15s |
| Sustain | 0 |
| Release | 0.1s |
| Volume | -8dB |
| Duration | 16n |
| Notes (cycling) | F3 → C3 → G3 → D3 |

### Sub (Sub Bass)

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
| Scale | C Minor Pentatonic |

**Sub Notes (cycling):** `C2 → Eb2 → F2 → G2 → Bb2`

---

## Pattern Lane Instruments

### Wobble (Dubstep Bass)

| Parameter | Value |
|-----------|-------|
| Synth Type | `MonoSynth` |
| Oscillator | Sawtooth |
| Filter | Lowpass -24dB/oct (Q: 6) |
| LFO Type | Sine |
| LFO Range | 100Hz - 2000Hz |
| Volume | -8dB |
| Note | C2 (sustained) |

**Patterns (LFO rates):**
| Pattern | LFO Rate |
|---------|----------|
| 1/4 | Quarter notes |
| 1/8 | Eighth notes (default) |
| 1/16 | Sixteenth notes |

**Behavior:** Wobble plays continuously when active. Tap to cycle LFO rate.

### Chord (Pad Synth)

| Parameter | Value |
|-----------|-------|
| Synth Type | `PolySynth` (Synth voices) |
| Oscillator | Triangle |
| Attack | 0.1s |
| Decay | 0.3s |
| Sustain | 0.5 |
| Release | 0.8s |
| Volume | -12dB |
| Duration | 2n (half note) |
| Trigger | On downbeat (step 0) only |

**Chord Progressions (C minor):**

| Pattern | Chords |
|---------|--------|
| i-VI-III-VII | Cm → Ab → Eb → Bb |
| i-VII-VI-VII | Cm → Bb → Ab → Bb |
| i-i-VI-VII | Cm → Cm → Ab → Bb |

**Voicings:**
- Cm (i): C3, Eb3, G3
- Ab (VI): Ab2, C3, Eb3
- Eb (III): Eb3, G3, Bb3
- Bb (VII): Bb2, D3, F3

### Lead (Hook Synth)

| Parameter | Value |
|-----------|-------|
| Synth Type | `MonoSynth` |
| Oscillator | Square |
| Filter | Lowpass -12dB/oct (Q: 3) |
| Filter Base Freq | 500Hz |
| Filter Octaves | 2.5 |
| Attack | 0.005s |
| Decay | 0.1s |
| Sustain | 0.3 |
| Release | 0.2s |
| Volume | -10dB |
| Duration | 16n |

**Lead Phrases (C minor pentatonic):**

| Pattern | Notes |
|---------|-------|
| Hook 1 | C4, Eb4, G4, Eb4, C4, G4, F4, Eb4 |
| Hook 2 | G4, F4, Eb4, C4, Eb4, F4, G4, Bb4 |
| Hook 3 | Eb4, G4, Bb4, G4, F4, Eb4, C4, Eb4 |

### Arp (Arpeggiator)

| Parameter | Value |
|-----------|-------|
| Synth Type | `MonoSynth` |
| Oscillator | Sawtooth |
| Filter | Lowpass -24dB/oct (Q: 2) |
| Filter Base Freq | 800Hz |
| Filter Octaves | 2 |
| Attack | 0.001s |
| Decay | 0.15s |
| Sustain | 0.1 |
| Release | 0.1s |
| Volume | -10dB |
| Duration | 16n |

**Arp Notes (Cm7 arpeggio):** `C3 → Eb3 → G3 → Bb3 → C4`

**Arp Modes:**
| Mode | Behavior |
|------|----------|
| Up | Ascending through notes |
| Down | Descending through notes |
| Random | Random note selection |

---

## Stab FX

One-shot effects triggered by dedicated buttons (not sequenced).

**Layout:** 2x2 grid
- Top row: LASER (instant hit), IMPACT (instant hit)
- Bottom row: REVERSE (swell/build), RISER (swell/build)

### Laser (Pitch-Down Sweep)

| Parameter | Value |
|-----------|-------|
| Synth Type | `FMSynth` |
| Harmonicity | 4 (more musical) |
| Modulation Index | 12 |
| Oscillator | Sine |
| Modulation | Sine |
| Attack | 0.001s |
| Decay | 0.15s |
| Sustain | 0 |
| Release | 0.1s |
| Volume | -6dB |
| Pitch Sweep | C5 → C2 (exponential, 150ms) |
| Duration | 16n |

### Impact (Drop Hit)

| Parameter | Value |
|-----------|-------|
| Components | MembraneSynth + NoiseSynth |
| Noise Type | Pink |
| Membrane Note | C1 |
| Membrane Octaves | 8 |
| Membrane Pitch Decay | 0.1s |
| Membrane Decay | 0.8s |
| Noise Decay | 0.6s |
| Volume (membrane) | 0dB (boosted) |
| Volume (noise) | -4dB (boosted) |
| Routing | Membrane direct, noise through sidechain |
| Side Effect | Triggers sidechain pump |

### Reverse (Swell-In Effect)

| Parameter | Value |
|-----------|-------|
| Synth Type | `NoiseSynth` |
| Noise Type | White |
| Filter | Lowpass -24dB/oct (Q: 2) |
| Filter Sweep | 200Hz → 6000Hz over attack time |
| Attack | 0.4s (fade IN) |
| Decay | 0.05s (quick cut) |
| Sustain | 0 |
| Release | 0.05s |
| Volume | -8dB |
| Duration | 8n |
| Character | "Sucking in" effect, great for builds |

### Riser (Build Sweep)

| Parameter | Value |
|-----------|-------|
| Synth Type | `NoiseSynth` |
| Noise Type | White |
| Filter | Lowpass -24dB/oct (Q: 4) |
| Filter Sweep | 200Hz → 8000Hz over 2 bars |
| Attack | 0.01s |
| Sustain | 1 |
| Release | 0.5s |
| Volume | -12dB |
| Duration | 2 bars (tempo-synced) |

---

## Build/Drop System

The tension control system enables classic EDM build-up and drop moments.

### Tension Slider (0-100%)

Controls the master highpass filter frequency:

| Tension | Filter Freq | Effect |
|---------|-------------|--------|
| 0% | 20Hz | Full frequency range |
| 50% | ~450Hz | Low-mid removal |
| 100% | 2000Hz | Only highs remain |

### Auto Snare Roll

Automatically triggers based on tension level:

| Tension Threshold | Snare Rate |
|-------------------|------------|
| 0-39% | No roll |
| 40-64% | 1/8 notes |
| 65-84% | 1/16 notes |
| 85-100% | 1/32 notes |

### Kick Mute

Kick is automatically muted above 75% tension for cleaner builds.

### DROP Button

Triggers the following sequence:
1. Reset master highpass to 20Hz
2. Stop any active riser
3. Stop snare roll
4. Play impact stab
5. Trigger sidechain pump

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

### Highpass Filter (Build/Drop)

| Parameter | Value |
|-----------|-------|
| Type | Highpass |
| Rolloff | -24dB/oct |
| Range | 20Hz - 2000Hz |
| Control | Tension slider |

### Limiter

| Parameter | Value |
|-----------|-------|
| Ceiling | -1dB |

### Compressor

| Parameter | Value |
|-----------|-------|
| Threshold | -24dB |
| Ratio | 4:1 |
| Attack | 3ms |
| Release | 250ms |

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

The clock uses `Tone.Transport.scheduleRepeat()` at 16th note intervals for sample-accurate timing.

---

## Lane Configuration Reference

| Lane | Display | Core Color | Glow Color | Type | Category |
|------|---------|------------|------------|------|----------|
| kick | KICK | #f97316 (orange) | #7c2d12 | grid | drums |
| hat | HAT | #00ffff (cyan) | #0a3d4a | grid | drums |
| clap | CLAP | #f8fafc (white) | #64748b | grid | drums |
| perc | PERC | #fbbf24 (amber) | #78350f | grid | drums |
| sub | SUB | #a855f7 (purple) | #581c87 | grid | bass |
| wobble | WOBBLE | #ec4899 (pink) | #831843 | pattern | bass |
| chord | CHORD | #22d3ee (cyan) | #164e63 | pattern | melodic |
| lead | LEAD | #4ade80 (green) | #14532d | pattern | melodic |
| arp | ARP | #f472b6 (pink) | #831843 | pattern | melodic |

### Stab Colors

| Stab | Color |
|------|-------|
| laser | #facc15 (yellow) |
| impact | #ef4444 (red) |
| reverse | #8b5cf6 (violet) |
| riser | #06b6d4 (cyan) |

---

## Volume Balance Reference

| Instrument | Volume | Rationale |
|------------|--------|-----------|
| Kick | -3dB | Foundation, needs punch |
| Hat | -4dB | Bright but not piercing |
| Clap | -8dB | Cuts through on backbeat |
| Perc | -8dB | Supporting rhythm element |
| Sub | -6dB | Fills low end without masking kick |
| Wobble | -8dB | Texture layer, not dominant |
| Chord | -12dB | Pad sits in background |
| Lead | -10dB | Melody cuts through |
| Arp | -10dB | Rhythmic texture |
| Laser | -6dB | FX hit, pitch sweep |
| Impact (membrane) | 0dB | Needs punch for drops (boosted) |
| Impact (noise) | -4dB | Supporting layer (boosted) |
| Reverse | -8dB | Swell-in build effect |
| Riser | -12dB | Background build texture |

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

## Sound Trigger Flow

### Grid Lanes
1. Clock emits step event at 16th note intervals
2. `useSequencer` hook receives step info
3. For each active lane at current step:
   - Check if lane is muted
   - If not muted, call appropriate play function
4. Kick triggers sidechain pump

### Pattern Lanes
1. Pattern lanes run independently when active
2. Wobble: Continuous sustained note with LFO modulation
3. Chord: Triggers on downbeat (step 0), cycles through progression
4. Lead: Triggers on each step, cycles through phrase notes
5. Arp: Triggers on each step, follows current mode pattern

### Stabs
1. User taps stab button
2. Corresponding stab function called immediately
3. Impact also triggers sidechain pump

---

## Files

| File | Purpose |
|------|---------|
| `src/engine/audio.js` | All synth definitions, stabs, build/drop, sidechain |
| `src/engine/clock.js` | Tone.Transport timing, step scheduling |
| `src/engine/constants.js` | Scales, patterns, colors, build/drop thresholds |
| `src/engine/sequencer.js` | Grid state, pattern state, categories |
| `src/hooks/useAudioEngine.js` | React lifecycle wrapper |
| `src/hooks/useSequencer.js` | Triggers sounds on step events |

---

## Disposal

All Tone.js nodes are explicitly disposed on unmount to prevent memory leaks:

**Synths:**
- Grid: kickSynth, hatSynth, clapSynth, percSynth, subSynth
- Pattern: wobbleSynth, chordSynth, leadSynth, arpSynth
- Stabs: impactSynth, impactNoise, riserSynth, laserSynth, reverseSynth

**Filters:**
- hatFilter, clapFilter, riserFilter, reverseFilter, masterHighpass

**Other:**
- wobbleLFO, sidechainGain, masterCompressor, masterLimiter, snareRollLoop

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

// Loops (for snare roll)
new Tone.Loop(callback, interval).start(0);
```

---

*Last Updated: January 2026 (Full EDM Edition - v3.0)*
