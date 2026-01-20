# Onyx Pulse — Brainstorm Document

---

## 🎛️ Core Product Intent

**This is not a tool. It's a toy.**

- Zero musical decisions required
- Zero theory exposed
- Zero "setup"
- Guaranteed beauty
- Infinite replayability

---

## 🧠 Musical Science Principles

These aren't abstract ideas — they justify every UX decision.

### 1. Repetition Creates Groove

EDM relies on cyclic predictability. The brain releases dopamine when expectations are fulfilled and slightly violated.

Loops must be:
- Short (1–4 bars)
- Stable
- Slowly mutated, not replaced

### 2. Layering Beats ≠ Composing Music

Humans hear music as stacked energy bands:

| Band | Elements |
|------|----------|
| Low | Kick, Bass |
| Mid | Snare, Body |
| High | Hats, Air |
| Motion | FX, Movement |

### 3. Flow State Requires Continuity

Anything that kills flow instantly:
- Stops playback
- Forces naming
- Forces saving dialogs
- Forces timeline thinking

---

## 🎚️ The "Oh Sh*t" Moment

When a user loves a beat, they want:
- "Don't lose this"
- "Let me keep going"
- "Let me show someone"

They do NOT want:
- Export settings
- Arrangement views
- Track management
- Musical decisions

---

## 🧩 Part 1: Capturing the Moment (Saving)

### Always Be Recording (Invisibly)

**Background rolling buffer:**
- Constantly record last 2–5 minutes
- When user hits ❤️ or ⭐: freeze buffer, auto-trim to musically clean loop
- No decisions. No dialog.

**Output format: .mp4**

Why MP4:
- Universal
- Shareable
- Instagram/TikTok friendly
- Audio-only still works

**Add:**
- Subtle reactive visual
- Waveform or pulsing lanes
- Brand identity baked in

Sharing becomes part of the toy.

---

## 🧱 Part 2: Building on a Beat (Layered Scenes)

**Do NOT spawn infinite lanes. That becomes a DAW.**

### The Right Model: Layered Scenes

Mental model for user:
> "I liked that layer — now I'll add another flavor."

Under the hood:
- Each "layer" = a locked 4-lane snapshot
- Perfectly time-aligned
- Key, tempo, groove remain fixed

### UX Flow (The Magic)

**Step 1: User creates something great**

They hit: `LOCK + BUILD`

What happens:
- Current 4 lanes freeze
- Playback continues seamlessly
- Visual shrinks slightly (background layer)
- New fresh 4 lanes appear on top
- No pause. No reset. No decision.

**Step 2: User builds "Layer 2"**

- Same rules
- Same constraints
- New sounds, new FX
- Old layer untouchable unless unlocked

This mirrors how EDM producers think: Foundation → Movement → Ear Candy

**Step 3: Layer Navigation (Keep It Stupid Simple)**

One button: `Layers (2)`

Tap opens stack of layer cards, each with:
- Play/mute
- Tiny visual preview
- Lock icon

No timeline. No bars. No clips.

### Why This Works Musically

All layers share:
- Same tempo
- Same bar length
- Same phase alignment

Therefore: No flam. No drift. No rhythmic conflict.

Effectively quantized additive synthesis at the macro level.

---

## 🧪 Part 3: Preventing Chaos

### Silent Rules to Enforce

- Max 3–4 layers total
- Auto EQ per layer (frequency slotting)
- Auto ducking for bass/kick dominance
- FX layers auto high-pass

**Guarantee:** No matter what, it sounds mixed.

---

## 🧠 Advanced Users (Without Exposing Complexity)

**Let them:**
- Re-enter a layer
- Swap one pad group
- Add micro-variation

**Never let them:**
- Change tempo
- Change key
- Change grid

**Constraints = Creativity.**

---

## 🎮 Game-Like Addiction Loop

```
Tap → Instant groove
    ↓
Explore → Variation
    ↓
Accidentally great moment
    ↓
❤️ Save
    ↓
"What if I add one more thing…"
    ↓
LOCK + BUILD
    ↓
Repeat
    ↓
Share → Validation → Repeat
```

That's a game loop, not a music workflow.

---

## 🔒 What You Should NOT Do

- ❌ Piano rolls
- ❌ Note names
- ❌ Timelines
- ❌ Export menus
- ❌ Sound browsers
- ❌ BPM numbers
- ❌ Theory terms

**If it looks like learning, users bounce.**

---

## 🧭 Final Summary

| Decision | Recommendation |
|----------|----------------|
| Lane count | 4 lanes is ideal |
| Pads | Trigger musical behaviors, not samples |
| Bass | Handled globally |
| Wubs | Motion, not pitch |
| FX lane | Emotional control |
| Recording | Always-on buffer |
| Sharing | One-tap MP4 |
| Architecture | Layered scenes, max 3–4 |
| Core interaction | Lock + Build flow |
| Philosophy | Constraints enforced invisibly |
