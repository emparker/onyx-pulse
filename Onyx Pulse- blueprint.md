# **Project Blueprint: Onyx Pulse**

**Vision:** A "Zen-Tool" that bridges the gap between a physics toy and a generative musical instrument. Minimalist, tactile, and addictive.

---

## **1\. Executive Summary & Goals**

* **Simplicity:** Zero-learning curve. The first interaction produces immediate beauty.  
* **Attraction:** A high-contrast "Neon-Noir" aesthetic using Canvas-based glow effects.  
* **Addiction:** Leveraging "Emergent Complexity"—the user starts with a single beat and ends with a self-evolving polyphonic symphony.  
* **The Effect:** A "flow state" generator that functions as both a creative outlet and a secondary-focus (lo-fi) background tool.

---

## **2\. The Tech Stack (2026 Standard)**

| Layer | Technology | Reason |
| :---- | :---- | :---- |
| **Framework** | **Vite \+ React 19** | Ultra-fast HMR (Hot Module Replacement) for rapid UI iteration. |
| **Physics Engine** | **Matter.js** | Lightweight, robust 2D rigid body physics for marble/wall collisions. |
| **Audio Engine** | **Tone.js** | Advanced Web Audio wrapper for low-latency scheduling and synthesis. |
| **Development** | **VS Code \+ Claude Code (CLI)** | Using Claude Code for multi-step architectural refactors and CLI-based scaffolding. |
| **Styling** | **Tailwind CSS \+ Framer Motion** | For smooth UI transitions and layout. |
| **Deployment** | **Vercel (PWA)** | Instant global edge delivery with offline support capabilities. |

---

## **3\. Core Mechanics & User Flow**

### **Phase A: Silence to Symphony (The Onboarding)**

1. **Silence:** The app loads to a dark, empty circular void with a subtle pulsing center.  
2. **The Spark:** User taps. A marble is born. It falls, hits the rim, and triggers a $440Hz$ (C4) sine-wave pluck with a visual ripple.  
3. **The Groove:** User taps 3 more times. The marbles interact, bouncing off one another and the walls, creating a rhythmic loop.  
4. **The Symphony:** With 10+ marbles, the overlapping frequencies create a generative ambient soundscape.

### **Phase B: Interaction Design**

* **Tap-to-Drop:** Spawns a Matter.Body.circle. Physics logic applies a random slight horizontal variance to ensure no two paths are identical.  
* **Gesture-Based Gravity:** Uses window.addEventListener('deviceorientation').  
  * *Logic:* $\\vec{g} \= (x \\cdot scale, y \\cdot scale)$.  
  * *Result:* Tilting the phone slides all marbles to one side, increasing collision frequency (tempo).  
* **Tactile Wall Drawing:**  
  * User drags a finger/mouse to create "Glass Bridges" (isStatic: true).  
  * Marbles bounce off these custom paths, allowing users to "trap" rhythms in geometric pockets.

---

## **4\. Engineering Specifications**

### **The Secret Sauce: The Scale**

To ensure "everyone is a musician," the engine is locked to a **C-Major Pentatonic Scale**.

* **Frequencies:** $C, D, E, G, A$.  
* **Implementation:** An array of notes mapped to the marble's "Impact Energy."  
* **Dynamic Velocity:**  
   $$Gain \= \\text{clamp}(\\frac{\\text{collision.velocity}}{max\\\_v}, 0.1, 1.0)$$  
  $$Filter\\\_Cutoff \= \\text{velocity} \\times 1000Hz$$  
  (Faster hits \= Louder and Brighter sound).

### **Implementation: Collision Data**

In the Matter.Events.on(engine, 'collisionStart') listener:

1. Identify the pair.  
2. Calculate the impactMagnitude using the relative velocity of the marble.  
3. Trigger the Tone.Sampler or Tone.PolySynth.  
4. Emit a CustomEvent to the Canvas layer to draw a glow-expansion at the $(x, y)$ coordinates of the contact point.

---

## **5\. Development Roadmap (7-Day Sprint)**

### **Day 1: The Void (Physics)**

* Scaffold React project via Claude Code: claude dev "init vite-react project with matter-js and tonejs".  
* Implement the central circular boundary.  
* Setup basic "tap to spawn" marble logic.

### **Day 2: The Voice (Audio)**

* Initialize Tone.PolySynth with a "Pluck" profile.  
* Connect Matter.js collision events to Audio triggers.  
* Implement the Pentatonic Scale mapping.

### **Day 3: The Aura (Visuals)**

* Add Canvas shadowBlur and globalCompositeOperation \= 'lighter' for neon glow.  
* Implement "Trail" logic (marbles leave faint, decaying paths).

### **Day 4: The Control (Interactivity)**

* Build the "Wall Drawing" tool.  
* Integrate Accelerometer/Gyroscope for gravity shifting.

### **Day 5: The Loop (Persistence)**

* Add a "Seed Share" feature: Serialize the marble positions and wall coordinates into a URL Base64 string.  
* Build the "Record" button (using Tone.Recorder).

### **Day 6: Optimization & Polish**

* Performance audit: Ensure 60fps with 50+ marbles. Use requestAnimationFrame for all visual updates.  
* Add PWA manifest for "Add to Home Screen" support.

### **Day 7: Deployment**

* Deploy to Vercel.  
* Final "Vibe Check" on mobile devices.

