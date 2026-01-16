import { useRef, useEffect, useCallback, useState } from 'react';
import { useSequencer } from '../../hooks/useSequencer.js';
import { useAudioEngine } from '../../hooks/useAudioEngine.js';
import {
  LANES,
  LANE_ORDER,
  LANE_HEIGHT,
  STEPS_PER_BAR,
  TRIGGER_RADIUS,
  LANE_PADDING,
  PLAYHEAD_WIDTH,
  GLOW_BLUR,
  COLORS,
} from '../../engine/constants.js';

export function SequencerCanvas() {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Sequencer state
  const {
    grid,
    playhead,
    isPlaying,
    togglePlay,
    toggleStep,
    getHitLanes,
    mutedLanes,
    unlockedLanes,
    tempo,
    toggleMute,
    clearLane,
    increaseTempo,
    decreaseTempo,
  } = useSequencer();

  // Audio engine
  const { ensureAudioReady, subscribeToSidechain, subscribeToBeat } = useAudioEngine();

  // Visual effect state
  const sidechainRef = useRef(0);
  const hitFlashRef = useRef({}); // { laneIndex_step: flashIntensity }
  const rippleRef = useRef([]); // Array of { x, y, radius, alpha, color }
  const playheadTrailRef = useRef([]); // Array of { x, alpha, color }
  const breathePhaseRef = useRef(0); // For lane breathing animation
  const downbeatPulseRef = useRef(0); // For background pulse on beat 1
  const lastPlayheadRef = useRef(-1); // Track playhead changes
  const laneUnlockAnimRef = useRef({}); // { laneId: animProgress 0-1 }

  // Interaction state for double-tap and long-press
  const lastTapRef = useRef({ laneId: null, time: 0 });
  const longPressTimerRef = useRef(null);
  const longPressLaneRef = useRef(null);

  // Set dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Subscribe to sidechain for visual pump
  useEffect(() => {
    const unsubscribe = subscribeToSidechain((event) => {
      sidechainRef.current = event.intensity;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribeToSidechain]);

  // Subscribe to beat events for downbeat pulse
  useEffect(() => {
    const unsubscribe = subscribeToBeat((beatInfo) => {
      if (beatInfo.isDownbeat) {
        downbeatPulseRef.current = 1;
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribeToBeat]);

  // Calculate layout
  const getLayout = useCallback(() => {
    const totalLaneHeight = LANE_ORDER.length * LANE_HEIGHT;
    const topOffset = (dimensions.height - totalLaneHeight) / 2;
    const stepWidth = (dimensions.width - LANE_PADDING * 2) / STEPS_PER_BAR;

    return {
      topOffset,
      stepWidth,
      laneHeight: LANE_HEIGHT,
      gridLeft: LANE_PADDING,
      gridRight: dimensions.width - LANE_PADDING,
      gridWidth: dimensions.width - LANE_PADDING * 2,
    };
  }, [dimensions]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    let animationId;

    const render = () => {
      const layout = getLayout();

      // === DECAY EFFECTS ===
      sidechainRef.current *= 0.92;
      downbeatPulseRef.current *= 0.95;
      breathePhaseRef.current += 0.02; // Breathing animation speed

      // Decay hit flashes
      Object.keys(hitFlashRef.current).forEach(key => {
        hitFlashRef.current[key] *= 0.82;
        if (hitFlashRef.current[key] < 0.01) {
          delete hitFlashRef.current[key];
        }
      });

      // Update ripples
      rippleRef.current = rippleRef.current
        .map(r => ({ ...r, radius: r.radius + 3, alpha: r.alpha * 0.92 }))
        .filter(r => r.alpha > 0.02);

      // Update playhead trail
      playheadTrailRef.current = playheadTrailRef.current
        .map(t => ({ ...t, alpha: t.alpha * 0.88 }))
        .filter(t => t.alpha > 0.02);

      // === CLEAR CANVAS ===
      ctx.fillStyle = COLORS.background.mid;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // === BACKGROUND WITH PULSE ===
      const pulseIntensity = downbeatPulseRef.current * 0.15;
      const gradient = ctx.createRadialGradient(
        dimensions.width / 2, dimensions.height / 2, 0,
        dimensions.width / 2, dimensions.height / 2, dimensions.width / 2
      );

      // Brighten core on downbeat
      const coreR = parseInt(COLORS.background.core.slice(1, 3), 16);
      const coreG = parseInt(COLORS.background.core.slice(3, 5), 16);
      const coreB = parseInt(COLORS.background.core.slice(5, 7), 16);
      const pulseCore = `rgb(${Math.min(255, coreR + pulseIntensity * 40)}, ${Math.min(255, coreG + pulseIntensity * 60)}, ${Math.min(255, coreB + pulseIntensity * 80)})`;

      gradient.addColorStop(0, pulseCore);
      gradient.addColorStop(1, COLORS.background.edge);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // === DRAW PLAYHEAD TRAIL (behind everything) ===
      playheadTrailRef.current.forEach(trail => {
        ctx.save();
        ctx.strokeStyle = trail.color;
        ctx.globalAlpha = trail.alpha * 0.5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(trail.x, layout.topOffset - 5);
        ctx.lineTo(trail.x, layout.topOffset + LANE_ORDER.length * layout.laneHeight + 5);
        ctx.stroke();
        ctx.restore();
      });

      // === DRAW LANES ===
      LANE_ORDER.forEach((laneId, laneIndex) => {
        const lane = LANES[laneId];
        const laneY = layout.topOffset + laneIndex * layout.laneHeight;
        const lanePattern = grid[laneId] || [];
        const isLaneUnlocked = unlockedLanes[laneId];
        const isLaneMuted = mutedLanes[laneId];

        // Animate unlock progress
        if (!laneUnlockAnimRef.current[laneId]) {
          laneUnlockAnimRef.current[laneId] = isLaneUnlocked ? 1 : 0;
        }
        const targetUnlock = isLaneUnlocked ? 1 : 0;
        laneUnlockAnimRef.current[laneId] += (targetUnlock - laneUnlockAnimRef.current[laneId]) * 0.08;
        const unlockProgress = laneUnlockAnimRef.current[laneId];

        // Skip drawing if lane is completely locked (not even fading in)
        if (unlockProgress < 0.01) return;

        ctx.save();
        ctx.globalAlpha = unlockProgress;

        // Calculate breathing glow for this lane
        const breatheOffset = laneIndex * 0.5; // Phase offset per lane
        const breatheValue = Math.sin(breathePhaseRef.current + breatheOffset) * 0.5 + 0.5;

        // Lane background with breathing glow (dimmed if muted)
        const muteDim = isLaneMuted ? 0.3 : 1;
        const bgAlpha = (0.02 + breatheValue * 0.02) * muteDim;
        ctx.fillStyle = `rgba(255, 255, 255, ${bgAlpha})`;
        ctx.fillRect(layout.gridLeft, laneY, layout.gridWidth, layout.laneHeight);

        // Subtle colored glow at lane edges (breathing)
        const edgeGlow = ctx.createLinearGradient(layout.gridLeft, laneY, layout.gridLeft, laneY + layout.laneHeight);
        const laneGlowAlpha = (0.03 + breatheValue * 0.04) * muteDim;
        edgeGlow.addColorStop(0, `${lane.color.core}${Math.round(laneGlowAlpha * 255).toString(16).padStart(2, '0')}`);
        edgeGlow.addColorStop(0.5, 'transparent');
        edgeGlow.addColorStop(1, `${lane.color.core}${Math.round(laneGlowAlpha * 255).toString(16).padStart(2, '0')}`);
        ctx.fillStyle = edgeGlow;
        ctx.fillRect(layout.gridLeft, laneY, layout.gridWidth, layout.laneHeight);

        // Apply sidechain visual compression to non-kick lanes
        let laneVisualScale = 1;
        if (laneId !== 'kick' && sidechainRef.current > 0.05) {
          laneVisualScale = 1 - sidechainRef.current * 0.15;
          // Dim lane slightly
          ctx.fillStyle = `rgba(0, 0, 0, ${sidechainRef.current * 0.3})`;
          ctx.fillRect(layout.gridLeft, laneY, layout.gridWidth, layout.laneHeight);
        }

        // Muted overlay
        if (isLaneMuted) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(layout.gridLeft, laneY, layout.gridWidth, layout.laneHeight);
        }

        // Lane divider line
        ctx.strokeStyle = COLORS.grid.laneDivider;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(layout.gridLeft, laneY + layout.laneHeight);
        ctx.lineTo(layout.gridRight, laneY + layout.laneHeight);
        ctx.stroke();

        // Draw lane name with glow (and mute indicator)
        ctx.save();
        ctx.fillStyle = isLaneMuted ? '#666666' : lane.color.core;
        ctx.globalAlpha = (0.4 + breatheValue * 0.3) * (isLaneMuted ? 0.5 : 1);
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = isLaneMuted ? '#333333' : lane.color.core;
        ctx.shadowBlur = isLaneMuted ? 2 : 4 + breatheValue * 4;
        const displayName = isLaneMuted ? `[M] ${lane.name}` : lane.name;
        ctx.fillText(displayName, 8, laneY + layout.laneHeight / 2);
        ctx.restore();

        // Draw steps
        for (let step = 0; step < STEPS_PER_BAR; step++) {
          const stepX = layout.gridLeft + step * layout.stepWidth + layout.stepWidth / 2;
          const stepY = laneY + layout.laneHeight / 2;
          const isActive = lanePattern[step] === 1;
          const flashKey = `${laneIndex}_${step}`;
          const flashIntensity = hitFlashRef.current[flashKey] || 0;

          // Draw beat lines (every 4 steps)
          if (step % 4 === 0) {
            ctx.strokeStyle = COLORS.grid.beatLine;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(layout.gridLeft + step * layout.stepWidth, laneY);
            ctx.lineTo(layout.gridLeft + step * layout.stepWidth, laneY + layout.laneHeight);
            ctx.stroke();
          }

          // Draw trigger circle
          ctx.save();

          if (isActive) {
            // Active trigger - use lane color with glow
            const color = lane.color.core;

            // Base radius with sidechain and breathing
            let radius = TRIGGER_RADIUS * laneVisualScale;
            const triggerBreathe = Math.sin(breathePhaseRef.current * 2 + step * 0.3) * 0.08 + 1;
            radius *= triggerBreathe;

            // Add flash effect if this was just hit
            if (flashIntensity > 0) {
              ctx.shadowColor = '#ffffff';
              ctx.shadowBlur = GLOW_BLUR + flashIntensity * 25;
              radius += flashIntensity * 6;
            } else {
              ctx.shadowColor = color;
              ctx.shadowBlur = GLOW_BLUR + breatheValue * 4;
            }

            // Main trigger circle
            ctx.fillStyle = flashIntensity > 0.5 ? '#ffffff' : color;
            ctx.beginPath();
            ctx.arc(stepX, stepY, radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner highlight
            ctx.shadowBlur = 0;
            const highlightAlpha = 0.4 + flashIntensity * 0.4;
            ctx.fillStyle = `rgba(255, 255, 255, ${highlightAlpha})`;
            ctx.beginPath();
            ctx.arc(stepX, stepY, radius * 0.35, 0, Math.PI * 2);
            ctx.fill();

            // Outer ring (subtle)
            if (flashIntensity < 0.3) {
              ctx.strokeStyle = `${color}40`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(stepX, stepY, radius + 3, 0, Math.PI * 2);
              ctx.stroke();
            }
          } else {
            // Inactive trigger - dim circle with subtle pulse
            const inactiveRadius = TRIGGER_RADIUS * 0.5 * laneVisualScale;
            const inactiveAlpha = 0.12 + breatheValue * 0.05;
            ctx.fillStyle = `rgba(255, 255, 255, ${inactiveAlpha})`;
            ctx.beginPath();
            ctx.arc(stepX, stepY, inactiveRadius, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }

        ctx.restore(); // Restore unlock alpha
      });

      // === DRAW RIPPLES (hit effects) ===
      rippleRef.current.forEach(ripple => {
        ctx.save();
        ctx.strokeStyle = ripple.color;
        ctx.globalAlpha = ripple.alpha;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // === DRAW PLAYHEAD ===
      const playheadX = layout.gridLeft + playhead * layout.stepWidth + layout.stepWidth / 2;
      const playheadJustMoved = lastPlayheadRef.current !== playhead;

      // Add to trail and create ripples when playhead moves
      if (playheadJustMoved) {
        // Determine trail color from most recent hit
        let trailColor = COLORS.playhead.glow;

        // Create ripples for active triggers at this step
        LANE_ORDER.forEach((laneId, laneIndex) => {
          const lanePattern = grid[laneId] || [];
          if (lanePattern[playhead] === 1) {
            trailColor = LANES[laneId].color.core;

            // Flash effect
            const flashKey = `${laneIndex}_${playhead}`;
            hitFlashRef.current[flashKey] = 1;

            // Create ripple at hit location
            const stepX = layout.gridLeft + playhead * layout.stepWidth + layout.stepWidth / 2;
            const stepY = layout.topOffset + laneIndex * layout.laneHeight + layout.laneHeight / 2;
            rippleRef.current.push({
              x: stepX,
              y: stepY,
              radius: TRIGGER_RADIUS,
              alpha: 0.8,
              color: LANES[laneId].color.core,
            });
          }
        });

        // Add playhead trail
        playheadTrailRef.current.push({
          x: playheadX,
          alpha: 0.6,
          color: trailColor,
        });

        // Limit trail length
        if (playheadTrailRef.current.length > 8) {
          playheadTrailRef.current.shift();
        }

        lastPlayheadRef.current = playhead;
      }

      // Draw playhead glow
      ctx.save();
      ctx.strokeStyle = COLORS.playhead.line;
      ctx.lineWidth = PLAYHEAD_WIDTH;
      ctx.shadowColor = COLORS.playhead.glow;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(playheadX, layout.topOffset - 10);
      ctx.lineTo(playheadX, layout.topOffset + LANE_ORDER.length * layout.laneHeight + 10);
      ctx.stroke();

      // Second pass for brighter center
      ctx.shadowBlur = 5;
      ctx.stroke();
      ctx.restore();

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [dimensions, grid, playhead, getLayout, mutedLanes, unlockedLanes]);

  // Handle tap to toggle step or lane header actions
  const handlePointerDown = useCallback(async (event) => {
    event.preventDefault();

    // Initialize audio on first gesture
    await ensureAudioReady();

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const layout = getLayout();

    // Determine which lane was tapped
    const laneIndex = Math.floor((y - layout.topOffset) / layout.laneHeight);
    if (laneIndex < 0 || laneIndex >= LANE_ORDER.length) return;

    const laneId = LANE_ORDER[laneIndex];

    // Check if tap is on lane header (left side - expanded area for easier tapping)
    // Use 60px or gridLeft, whichever is larger, for a comfortable tap target
    const headerWidth = Math.max(60, layout.gridLeft);
    const isOnHeader = x < headerWidth;

    if (isOnHeader) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current.time;
      const isSameLane = lastTapRef.current.laneId === laneId;

      console.log(`Header tap on ${laneId}, last tap: ${lastTapRef.current.laneId}, time diff: ${timeSinceLastTap}ms`);

      // Check for double-tap (mute toggle) - within 400ms on same lane
      if (isSameLane && timeSinceLastTap < 400) {
        console.log(`Double-tap detected on ${laneId} - toggling mute`);
        toggleMute(laneId);
        lastTapRef.current = { laneId: null, time: 0 };

        // Cancel any pending long-press
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        return;
      }

      // Record this tap for potential double-tap detection
      lastTapRef.current = { laneId, time: now };

      // Start long-press timer for clear (500ms)
      longPressLaneRef.current = laneId;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      longPressTimerRef.current = setTimeout(() => {
        if (longPressLaneRef.current === laneId) {
          console.log(`Long press detected on ${laneId} - clearing lane`);
          clearLane(laneId);
          longPressLaneRef.current = null;
        }
      }, 500);

      return;
    }

    // Determine which step was tapped
    const step = Math.floor((x - layout.gridLeft) / layout.stepWidth);
    if (step < 0 || step >= STEPS_PER_BAR) return;

    // Only toggle if lane is unlocked
    if (!unlockedLanes[laneId]) return;

    toggleStep(laneId, step);
  }, [ensureAudioReady, getLayout, toggleStep, toggleMute, clearLane, unlockedLanes]);

  // Cancel long press on pointer up/cancel
  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressLaneRef.current = null;
  }, []);

  // Handle play/pause button click
  const handlePlayPause = useCallback(async () => {
    await ensureAudioReady();
    togglePlay();
  }, [ensureAudioReady, togglePlay]);

  // Handle tempo button clicks
  const handleTempoUp = useCallback(async () => {
    await ensureAudioReady();
    increaseTempo();
  }, [ensureAudioReady, increaseTempo]);

  const handleTempoDown = useCallback(async () => {
    await ensureAudioReady();
    decreaseTempo();
  }, [ensureAudioReady, decreaseTempo]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ display: 'block', touchAction: 'none' }}
      />

      {/* Tempo Control */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-gray-900/80 rounded-lg px-3 py-2 border border-gray-700">
        <button
          onClick={handleTempoDown}
          className="w-8 h-8 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 active:scale-95 transition-all"
          aria-label="Decrease tempo"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13H5v-2h14v2z" />
          </svg>
        </button>
        <div className="text-center min-w-[60px]">
          <div className="text-white font-mono text-lg">{tempo}</div>
          <div className="text-gray-500 text-xs">BPM</div>
        </div>
        <button
          onClick={handleTempoUp}
          className="w-8 h-8 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 active:scale-95 transition-all"
          aria-label="Increase tempo"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>
      </div>

      {/* Hint text for interactions */}
      <div className="absolute top-4 left-4 text-gray-500 text-xs font-mono">
        <div>Tap left side:</div>
        <div className="ml-2">• double-tap = mute/unmute</div>
        <div className="ml-2">• hold 0.5s = clear lane</div>
      </div>

      {/* Play/Pause Button */}
      <button
        onClick={handlePlayPause}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-gray-800/80 border border-gray-600 flex items-center justify-center hover:bg-gray-700/80 active:scale-95 transition-all"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}
