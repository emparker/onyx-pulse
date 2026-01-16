# Onyx Pulse: The World That Breathes Music

> *"What if making EDM was as easy as dropping marbles?"*

---

## The Promise

**Onyx Pulse** is a physics-powered music toy that turns anyone into an electronic music producer. No tutorials. No piano lessons. No understanding of BPM, sidechain compression, or synthesis required.

You tap. Marbles fall. Music happens.

And somehow—magically—it sounds *good*.

---

## The Problem We're Solving

Making music has a brutal learning curve. DAWs have hundreds of buttons. Instruments take years to master. Even "simple" music apps require understanding concepts like tempo, scales, and rhythm.

**The result?** Millions of people who *feel* music deeply but never *make* it.

Onyx Pulse changes that by hiding all the complexity inside physics and clever constraints. The user plays with a toy. The toy makes the music.

---

## The Magic (How It Actually Works)

### 1. The World Has a Heartbeat

The moment the app opens, it's alive. A dark circular void pulses gently at 128 BPM—the sweet spot of house music. The boundary breathes. The background subtly throbs. Before a single interaction, users *feel* the tempo.

They don't know it's 128 BPM. They just feel the vibe.

### 2. Everything Snaps to the Grid (Invisibly)

Here's the secret: every sound is quantized to musical time. When a marble hits a wall and triggers a sound, that sound actually plays on the nearest 16th note—not at the exact moment of collision.

The user sees organic, chaotic physics. They hear tight, professional rhythm.

This is the same trick used in every modern DAW, but we've hidden it completely. Users think they have rhythm. They're right—we just helped.

### 3. The Scale Is Always Right

Every melodic sound is locked to **F minor pentatonic**—a scale that literally cannot sound bad. There are no wrong notes. Users draw lines, marbles bounce across them, and melodies emerge that sound intentional.

It's musical training wheels, but invisible ones.

### 4. The Kick Makes Everything Pump

In professional EDM, the kick drum triggers "sidechain compression"—everything else ducks in volume momentarily, creating that pumping, breathing feel.

We do this visually AND sonically. When a kick marble hits:
- All other sounds briefly quiet
- All other marbles visually compress (shrink slightly)
- The background dims for a heartbeat
- Then everything releases

Users don't know the term "sidechain." They just feel the track *pump*. And they made it happen.

---

## The Experience

### First 10 Seconds
User opens the app. A dark void pulses with potential energy. They tap. A marble drops—glowing electric orange. It falls, hits the boundary, and **BOOM**—a deep kick drum rattles their phone. The whole world flinches with the impact.

*They're hooked.*

### First Minute
They tap more. Different marbles: tiny rapid hi-hats that scatter like fireflies, bass marbles that growl through the low end, lead synths that sparkle across the midrange. Chaos becomes groove. Physics becomes rhythm.

### First Five Minutes
They discover they can draw. Lines appear under their finger—glowing instruments suspended in space. Marbles bounce off them, triggering notes. They draw a staircase of lines and suddenly there's a melody. They box in some marbles and create a loop that repeats forever.

They've made a beat. A real one. And they have no idea how.

### The Drop
Two fingers. Hold. The world tenses—BPM rises, colors wash out, gravity weakens, marbles float higher, collisions intensify. Tension builds unbearably.

Release.

**EVERYTHING HITS AT ONCE.**

The kick fires. Color explodes back. The boundary blasts outward. They just experienced—and created—their first EDM drop.

They'll chase that feeling forever.

---

## The Marble Ensemble

Six instruments, each a different marble type:

| Marble | What It Sounds Like | What It Feels Like |
|--------|---------------------|-------------------|
| **KICK** | Deep 808 thump | The heartbeat. The anchor. Makes everything else pump. |
| **CLAP** | Crisp snare/clap | The backbeat. Lands on 2 and 4 naturally. |
| **HAT** | Ticky hi-hat | Texture and energy. Tiny and rapid. Fills the gaps. |
| **BASS** | Growly sub-bass | The foundation. Follows the scale based on where it hits. |
| **LEAD** | Bright synth stab | The melody. Sparkles across drawn lines. |
| **PAD** | Atmospheric swell | The depth. Sustains while touching surfaces. Adds emotion. |

Users don't need to know what an 808 is. They just know the big orange marble makes the room shake.

---

## The Tools

### Drawn Lines = Instruments
Users draw lines with their finger. These aren't just walls—they're instruments:
- **Melodic Lines** trigger notes based on vertical position (low = bass notes, high = treble)
- **Drum Lines** trigger percussion hits
- **Bounce Pads** amplify velocity for accent patterns

A staircase of lines becomes an arpeggio. A horizontal line becomes a rhythmic gate. Users compose by drawing.

### Loop Regions = Song Structure
Draw a rectangle. Marbles inside it loop—returning to their entry point every 1, 2, 4, or 8 bars. Suddenly that chaotic phrase repeats. Layer multiple loops at different lengths for polyrhythmic complexity.

Users build songs by capturing happy accidents.

### The Build & Drop = Climax on Demand
Two-finger hold triggers a build: tempo rises, tension mounts, the world constricts. Release triggers the drop: explosive release, maximum impact, pure euphoria.

Users create emotional arcs with a single gesture.

---

## Why It Works

### 1. Zero Learning Curve
The first tap produces sound. The first sound is satisfying. There's no loading screen tutorial, no "here's how to use the app" modal. Touch the screen → magic happens.

### 2. No Wrong Moves
The scale is pentatonic. The timing is quantized. The mix is auto-balanced. Every random action produces something that sounds... intentional. Users can't fail.

### 3. Emergent Complexity
Start with one marble: a simple beat. Add more: rhythms emerge. Draw lines: melodies appear. Add loops: song structure develops. The complexity grows organically from simple interactions.

### 4. Visceral Feedback
Every collision has visual and sonic impact. The world reacts. The screen shakes. Colors pulse. Users *feel* their music in their hands.

### 5. Shareable Pride
That beat they made? They can export it. Share it. The URL encodes their creation. Their friends can remix it. They made something real.

---

## The Feeling We're Creating

Onyx Pulse is a **flow state generator**.

It's the app you open when you need to decompress. The toy you fidget with during calls. The instrument you play when you're "not musical." The thing you show friends at parties.

It sits in the space between:
- **Meditation app** and **music production software**
- **Fidget toy** and **creative instrument**  
- **Lo-fi background generator** and **shareable art maker**

Users will say: *"I made this."*

And they'll be right.

---

## Technical Foundation

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Vite + React 19 | Instant hot reload, modern DX |
| Physics | Matter.js | Deterministic 2D rigid body simulation |
| Audio | Tone.js | Low-latency Web Audio synthesis |
| Visuals | Canvas 2D + glow compositing | Neon-noir aesthetic, 60fps |
| Styling | Tailwind + Framer Motion | Fluid UI transitions |
| Deployment | Vercel (PWA) | Offline support, instant global delivery |

See `AUDIO_EDM_SPEC.md` for detailed implementation specifications.

---

## The North Star

> *Anyone can make music that sounds good in under 30 seconds.*

Every design decision flows from this. If a feature requires explanation, simplify it. If an interaction feels clunky, smooth it. If a sound can be wrong, constrain it.

The user is always the musician.
The app is just the instrument that plays itself.

---

## One Last Thing

Close your eyes. Imagine:

A teenager on the bus, headphones in, tapping marbles into a glowing void. A beat emerges. They smile.

A designer on a deadline, procrastinating productively, watching physics create generative ambient music in the background.

A group of friends at a party, passing a phone around, each adding to a chaotic, beautiful, evolving track.

A kid who's been told they're "not musical" finally making something they're proud of.

That's Onyx Pulse.

**The world that breathes music.**
