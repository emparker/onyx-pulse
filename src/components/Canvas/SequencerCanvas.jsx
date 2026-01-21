import { useRef, useEffect, useCallback, useState } from 'react';
import { useSequencer } from '../../hooks/useSequencer.js';
import { useAudioEngine } from '../../hooks/useAudioEngine.js';
import { useRecording } from '../../hooks/useRecording.js';
import {
  LANES,
  LANE_HEIGHT,
  STEPS_PER_BAR,
  TRIGGER_RADIUS,
  LANE_PADDING,
  PLAYHEAD_WIDTH,
  HEADER_WIDTH,
  STAB_BAR_HEIGHT,
  GLOW_BLUR,
  COLORS,
  CATEGORIES,
  CATEGORY_ORDER,
  LANES_BY_CATEGORY,
  STABS,
  STAB_ORDER,
  MAX_LAYERS,
  LAYER_INDICATOR_RADIUS,
  LAYER_INDICATOR_SPACING,
  CONTROL_STRIP_HEIGHT,
  RECORDING_STATE,
} from '../../engine/constants.js';
import { getPatternName } from '../../engine/sequencer.js';
import { getPerfSettings } from '../../utils/performance.js';

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
    activeLanes,
    patternIndices,
    currentCategory,
    tempo,
    tension,
    toggleMute,
    clearLane,
    toggleActive,
    cyclePattern,
    setCurrentCategory,
    increaseTempo,
    decreaseTempo,
    setTension,
    triggerDrop,
    playStab,
    // Layer state
    layers,
    activeLayerIndex,
    canAddLayer,
    lockAndBuild,
    selectLayer,
    isLayerLocked,
  } = useSequencer();

  // Audio engine
  const { ensureAudioReady, subscribeToSidechain, subscribeToBeat } = useAudioEngine();

  // Recording
  const {
    recordingState,
    remainingTimeFormatted,
    isRecording: isRecordingAudio,
    isEnding,
    isComplete,
    isIdle: isRecordingIdle,
    isInWarningZone,
    toggleRecording,
    redoRecording,
    download,
  } = useRecording();

  // Visual effect state
  const sidechainRef = useRef(0);
  const hitFlashRef = useRef({}); // { laneIndex_step: flashIntensity }
  const rippleRef = useRef([]); // Array of { x, y, radius, alpha, color }
  const playheadTrailRef = useRef([]); // Array of { x, alpha, color }
  const breathePhaseRef = useRef(0); // For lane breathing animation
  const downbeatPulseRef = useRef(0); // For background pulse on beat 1
  const lastPlayheadRef = useRef(-1); // Track playhead changes
  const laneUnlockAnimRef = useRef({}); // { laneId: animProgress 0-1 }
  const stabFlashRef = useRef({}); // { stabId: flashIntensity }
  const dropFlashRef = useRef(0); // Flash intensity for drop
  const lockBuildFlashRef = useRef(0); // Flash intensity for lock+build button
  const newLayerPulseRef = useRef(0); // Pulse for newly created layer
  const recordingPulseRef = useRef(0); // Pulse for recording button

  // Interaction state for double-tap and long-press
  const lastTapRef = useRef({ laneId: null, time: 0 });
  const longPressTimerRef = useRef(null);
  const longPressLaneRef = useRef(null);

  // Tension slider drag state
  const isDraggingTensionRef = useRef(false);

  // Performance optimization: cached gradients and settings
  const perfSettingsRef = useRef(getPerfSettings());
  const cachedGradientsRef = useRef({
    background: null,
    tension: null,
    lastWidth: 0,
    lastHeight: 0,
  });

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

  // Calculate layout - unified control strip design
  const getLayout = useCallback(() => {
    const categoryLanes = LANES_BY_CATEGORY[currentCategory] || [];
    const numLanes = categoryLanes.length;

    // Reserve space for: control strip (56px) + lanes + stab bar + play button area (80px)
    const controlStripHeight = CONTROL_STRIP_HEIGHT;
    const playButtonAreaHeight = 80;

    const availableLaneSpace = dimensions.height - controlStripHeight - STAB_BAR_HEIGHT - playButtonAreaHeight;
    const totalLaneHeight = numLanes * LANE_HEIGHT;
    const topOffset = controlStripHeight + Math.max(0, (availableLaneSpace - totalLaneHeight) / 2);
    const stepWidth = (dimensions.width - LANE_PADDING * 2 - HEADER_WIDTH) / STEPS_PER_BAR;

    // Control strip zone calculations
    const categoryZoneWidth = Math.min(dimensions.width * 0.32, 200);
    const layerDotsZoneWidth = 70;
    const tempoZoneWidth = 80;
    const dropButtonWidth = 56;
    const tensionZoneWidth = dimensions.width - categoryZoneWidth - layerDotsZoneWidth - tempoZoneWidth - dropButtonWidth - 40; // 40px padding

    return {
      topOffset,
      stepWidth,
      laneHeight: LANE_HEIGHT,
      gridLeft: LANE_PADDING + HEADER_WIDTH,
      gridRight: dimensions.width - LANE_PADDING,
      gridWidth: dimensions.width - LANE_PADDING * 2 - HEADER_WIDTH,
      headerWidth: HEADER_WIDTH,
      // Unified control strip
      controlStripTop: 0,
      controlStripHeight,
      // Zone positions within control strip
      categoryZoneX: 0,
      categoryZoneWidth,
      layerDotsZoneX: categoryZoneWidth,
      layerDotsZoneWidth,
      tensionZoneX: categoryZoneWidth + layerDotsZoneWidth,
      tensionZoneWidth,
      dropButtonX: categoryZoneWidth + layerDotsZoneWidth + tensionZoneWidth + 8,
      dropButtonWidth,
      tempoZoneX: dimensions.width - tempoZoneWidth - 8,
      tempoZoneWidth,
      // Other areas
      stabBarTop: dimensions.height - STAB_BAR_HEIGHT - playButtonAreaHeight,
      categoryLanes,
      numLanes,
    };
  }, [dimensions, currentCategory]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    let animationId;

    const render = () => {
      const layout = getLayout();
      const perf = perfSettingsRef.current;

      // === DECAY EFFECTS ===
      sidechainRef.current *= 0.92;
      downbeatPulseRef.current *= 0.95;
      dropFlashRef.current *= 0.9;
      lockBuildFlashRef.current *= 0.88;
      newLayerPulseRef.current *= 0.92;

      // Recording pulse (continuous sine wave when recording)
      if (isRecordingAudio) {
        recordingPulseRef.current += isInWarningZone ? 0.15 : 0.08; // Faster pulse in warning zone
      }
      if (perf.breathingEnabled) {
        breathePhaseRef.current += 0.02;
      }

      // Decay hit flashes (optimized: for...in instead of Object.keys)
      for (const key in hitFlashRef.current) {
        hitFlashRef.current[key] *= 0.82;
        if (hitFlashRef.current[key] < 0.01) {
          delete hitFlashRef.current[key];
        }
      }

      // Decay stab flashes (optimized: for...in)
      for (const key in stabFlashRef.current) {
        stabFlashRef.current[key] *= 0.85;
        if (stabFlashRef.current[key] < 0.01) {
          delete stabFlashRef.current[key];
        }
      }

      // Update ripples (optimized: mutate in-place, limit count)
      let rippleWriteIdx = 0;
      for (let i = 0; i < rippleRef.current.length; i++) {
        const r = rippleRef.current[i];
        r.radius += 3;
        r.alpha *= 0.92;
        if (r.alpha > 0.02) {
          rippleRef.current[rippleWriteIdx++] = r;
        }
      }
      rippleRef.current.length = Math.min(rippleWriteIdx, perf.maxRipples);

      // Update playhead trail (optimized: mutate in-place)
      let trailWriteIdx = 0;
      for (let i = 0; i < playheadTrailRef.current.length; i++) {
        const t = playheadTrailRef.current[i];
        t.alpha *= 0.88;
        if (t.alpha > 0.02) {
          playheadTrailRef.current[trailWriteIdx++] = t;
        }
      }
      playheadTrailRef.current.length = Math.min(trailWriteIdx, perf.maxTrailLength);

      // === CLEAR CANVAS ===
      ctx.fillStyle = COLORS.background.mid;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // === BACKGROUND WITH PULSE ===
      const pulseIntensity = downbeatPulseRef.current * 0.15 + dropFlashRef.current * 0.3;

      if (perf.gradientQuality === 'none') {
        // Low-power: solid color with simple pulse
        const coreR = parseInt(COLORS.background.core.slice(1, 3), 16);
        const coreG = parseInt(COLORS.background.core.slice(3, 5), 16);
        const coreB = parseInt(COLORS.background.core.slice(5, 7), 16);
        ctx.fillStyle = `rgb(${Math.min(255, coreR + pulseIntensity * 40)}, ${Math.min(255, coreG + pulseIntensity * 50)}, ${Math.min(255, coreB + pulseIntensity * 60)})`;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      } else {
        // Cache gradient if dimensions changed
        const cache = cachedGradientsRef.current;
        if (cache.lastWidth !== dimensions.width || cache.lastHeight !== dimensions.height) {
          cache.background = ctx.createRadialGradient(
            dimensions.width / 2, dimensions.height / 2, 0,
            dimensions.width / 2, dimensions.height / 2, dimensions.width / 2
          );
          cache.background.addColorStop(0, COLORS.background.core);
          cache.background.addColorStop(1, COLORS.background.edge);
          cache.lastWidth = dimensions.width;
          cache.lastHeight = dimensions.height;
        }

        // Apply pulse as overlay for better performance
        ctx.fillStyle = cache.background;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        if (pulseIntensity > 0.01) {
          ctx.fillStyle = `rgba(100, 150, 200, ${pulseIntensity * 0.3})`;
          ctx.fillRect(0, 0, dimensions.width, dimensions.height);
        }
      }

      // === DRAW UNIFIED CONTROL STRIP ===
      const stripCenterY = layout.controlStripHeight / 2;

      // Control strip background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, dimensions.width, layout.controlStripHeight);

      // Bottom border line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, layout.controlStripHeight);
      ctx.lineTo(dimensions.width, layout.controlStripHeight);
      ctx.stroke();

      // --- ZONE 1: Category Tabs ---
      const tabWidth = layout.categoryZoneWidth / CATEGORY_ORDER.length;
      CATEGORY_ORDER.forEach((catId, index) => {
        const cat = CATEGORIES[catId];
        const isActive = catId === currentCategory;
        const tabX = index * tabWidth;

        // Active tab indicator (bottom border)
        if (isActive) {
          ctx.fillStyle = cat.color;
          ctx.fillRect(tabX + 4, layout.controlStripHeight - 3, tabWidth - 8, 3);
        }

        // Tab text
        ctx.save();
        ctx.fillStyle = isActive ? cat.color : '#555555';
        ctx.font = `bold 11px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (isActive && perf.glowEnabled) {
          ctx.shadowColor = cat.color;
          ctx.shadowBlur = perf.shadowBlur * 0.5;
        }
        ctx.fillText(cat.name, tabX + tabWidth / 2, stripCenterY);
        ctx.restore();
      });

      // Vertical divider after categories
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(layout.categoryZoneWidth, 10);
      ctx.lineTo(layout.categoryZoneWidth, layout.controlStripHeight - 10);
      ctx.stroke();

      // --- ZONE 2: Layer Indicator Dots ---
      const dotsStartX = layout.layerDotsZoneX + 15;
      for (let i = 0; i < MAX_LAYERS; i++) {
        const dotX = dotsStartX + i * LAYER_INDICATOR_SPACING;
        const layer = layers[i];

        ctx.save();

        if (layer) {
          const isActive = i === activeLayerIndex;
          const isLocked = layer.locked;

          let dotColor;
          if (isActive) {
            dotColor = COLORS.layer.active;
            if (newLayerPulseRef.current > 0.1) {
              ctx.shadowColor = COLORS.layer.active;
              ctx.shadowBlur = perf.shadowBlur * 2 * newLayerPulseRef.current;
            } else if (perf.glowEnabled) {
              ctx.shadowColor = COLORS.layer.active;
              ctx.shadowBlur = perf.shadowBlur * 0.5;
            }
          } else if (isLocked) {
            dotColor = COLORS.layer.locked;
          } else {
            dotColor = COLORS.layer.empty;
          }

          ctx.fillStyle = dotColor;
          ctx.beginPath();

          if (isLocked) {
            // Diamond shape for locked
            const r = LAYER_INDICATOR_RADIUS;
            ctx.moveTo(dotX, stripCenterY - r);
            ctx.lineTo(dotX + r, stripCenterY);
            ctx.lineTo(dotX, stripCenterY + r);
            ctx.lineTo(dotX - r, stripCenterY);
            ctx.closePath();
          } else {
            ctx.arc(dotX, stripCenterY, LAYER_INDICATOR_RADIUS, 0, Math.PI * 2);
          }
          ctx.fill();

          // Layer number
          ctx.shadowBlur = 0;
          ctx.fillStyle = isActive || isLocked ? '#000000' : '#ffffff';
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(i + 1), dotX, stripCenterY + 1);
        } else {
          // Empty slot
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(dotX, stripCenterY, LAYER_INDICATOR_RADIUS - 1, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }

      // Vertical divider after layer dots
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(layout.layerDotsZoneX + layout.layerDotsZoneWidth, 10);
      ctx.lineTo(layout.layerDotsZoneX + layout.layerDotsZoneWidth, layout.controlStripHeight - 10);
      ctx.stroke();

      // --- ZONE 3: Tension Slider ---
      // BUILD label
      ctx.save();
      ctx.fillStyle = '#666666';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('BUILD', layout.tensionZoneX + 4, stripCenterY - 16);
      ctx.restore();

      const tensionBarX = layout.tensionZoneX + 12;
      const tensionBarWidth = layout.tensionZoneWidth - 24;
      const tensionBarHeight = 10;
      const tensionBarY = stripCenterY - tensionBarHeight / 2;

      // Tension bar background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(tensionBarX, tensionBarY, tensionBarWidth, tensionBarHeight, 5);
      ctx.fill();

      // Tension bar fill with gradient
      const tensionFillWidth = (tension / 100) * tensionBarWidth;
      if (tensionFillWidth > 2) {
        const tensionGradient = ctx.createLinearGradient(tensionBarX, 0, tensionBarX + tensionBarWidth, 0);
        tensionGradient.addColorStop(0, '#22d3ee');
        tensionGradient.addColorStop(0.5, '#f97316');
        tensionGradient.addColorStop(1, '#ef4444');
        ctx.fillStyle = tensionGradient;
        ctx.beginPath();
        ctx.roundRect(tensionBarX, tensionBarY, tensionFillWidth, tensionBarHeight, 5);
        ctx.fill();
      }

      // Tension handle
      const handleX = tensionBarX + tensionFillWidth;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(Math.max(tensionBarX + 6, Math.min(handleX, tensionBarX + tensionBarWidth - 6)), stripCenterY, 7, 0, Math.PI * 2);
      ctx.fill();

      // --- ZONE 4: DROP Button ---
      const dropButtonY = stripCenterY - 14;
      const dropButtonHeight = 28;
      const dropFlash = dropFlashRef.current;

      ctx.save();
      ctx.fillStyle = dropFlash > 0.1 ? '#ffffff' : '#ef4444';
      if (perf.glowEnabled) {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = perf.shadowBlur * 0.5 + (dropFlash * perf.shadowBlur * 2);
      }
      ctx.beginPath();
      ctx.roundRect(layout.dropButtonX, dropButtonY, layout.dropButtonWidth, dropButtonHeight, 4);
      ctx.fill();
      ctx.fillStyle = dropFlash > 0.1 ? '#ef4444' : '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0;
      ctx.fillText('DROP', layout.dropButtonX + layout.dropButtonWidth / 2, stripCenterY);
      ctx.restore();

      // --- ZONE 5: Tempo Display ---
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(tempo), layout.tempoZoneX + layout.tempoZoneWidth / 2, stripCenterY - 4);
      ctx.fillStyle = '#666666';
      ctx.font = '8px monospace';
      ctx.fillText('BPM', layout.tempoZoneX + layout.tempoZoneWidth / 2, stripCenterY + 12);
      ctx.restore();

      // Tempo +/- buttons
      const tempoBtnSize = 18;
      const tempoBtnY = stripCenterY - tempoBtnSize / 2;

      // Minus button
      ctx.save();
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(layout.tempoZoneX + 4, tempoBtnY, tempoBtnSize, tempoBtnSize, 3);
      ctx.stroke();
      ctx.fillStyle = '#888888';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('-', layout.tempoZoneX + 4 + tempoBtnSize / 2, stripCenterY);
      ctx.restore();

      // Plus button
      ctx.save();
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(layout.tempoZoneX + layout.tempoZoneWidth - tempoBtnSize - 4, tempoBtnY, tempoBtnSize, tempoBtnSize, 3);
      ctx.stroke();
      ctx.fillStyle = '#888888';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', layout.tempoZoneX + layout.tempoZoneWidth - tempoBtnSize / 2 - 4, stripCenterY);
      ctx.restore();

      // === DRAW PLAYHEAD TRAIL (behind everything) ===
      playheadTrailRef.current.forEach(trail => {
        ctx.save();
        ctx.strokeStyle = trail.color;
        ctx.globalAlpha = trail.alpha * 0.5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(trail.x, layout.topOffset - 5);
        ctx.lineTo(trail.x, layout.topOffset + layout.numLanes * layout.laneHeight + 5);
        ctx.stroke();
        ctx.restore();
      });

      // === DRAW LANES ===
      layout.categoryLanes.forEach((laneId, laneIndex) => {
        const lane = LANES[laneId];
        const laneY = layout.topOffset + laneIndex * layout.laneHeight;
        const lanePattern = grid[laneId] || [];
        const isLaneUnlocked = unlockedLanes[laneId];
        const isLaneMuted = mutedLanes[laneId];
        const isLaneActive = activeLanes[laneId];
        const isPatternLane = lane.type === 'pattern';

        // Animate unlock progress
        if (!laneUnlockAnimRef.current[laneId]) {
          laneUnlockAnimRef.current[laneId] = isLaneUnlocked ? 1 : 0;
        }
        const targetUnlock = isLaneUnlocked ? 1 : 0;
        laneUnlockAnimRef.current[laneId] += (targetUnlock - laneUnlockAnimRef.current[laneId]) * 0.08;
        const unlockProgress = laneUnlockAnimRef.current[laneId];

        if (unlockProgress < 0.01) return;

        ctx.save();
        ctx.globalAlpha = unlockProgress;

        // Calculate breathing glow for this lane (simplified on mobile)
        const breatheOffset = laneIndex * 0.5;
        const breatheValue = perf.breathingEnabled
          ? Math.sin(breathePhaseRef.current + breatheOffset) * 0.5 + 0.5
          : 0.5; // Static value when breathing disabled

        // Lane background with breathing glow (dimmed if muted)
        const muteDim = isLaneMuted ? 0.3 : 1;
        const bgAlpha = (0.02 + breatheValue * 0.02) * muteDim;
        ctx.fillStyle = `rgba(255, 255, 255, ${bgAlpha})`;
        ctx.fillRect(LANE_PADDING, laneY, dimensions.width - LANE_PADDING * 2, layout.laneHeight);

        // Subtle colored glow at lane edges (breathing) - skip on low-power
        if (perf.gradientQuality !== 'none') {
          const edgeGlow = ctx.createLinearGradient(LANE_PADDING, laneY, LANE_PADDING, laneY + layout.laneHeight);
          const laneGlowAlpha = (0.03 + breatheValue * 0.04) * muteDim;
          edgeGlow.addColorStop(0, `${lane.color.core}${Math.round(laneGlowAlpha * 255).toString(16).padStart(2, '0')}`);
          edgeGlow.addColorStop(0.5, 'transparent');
          edgeGlow.addColorStop(1, `${lane.color.core}${Math.round(laneGlowAlpha * 255).toString(16).padStart(2, '0')}`);
          ctx.fillStyle = edgeGlow;
          ctx.fillRect(LANE_PADDING, laneY, dimensions.width - LANE_PADDING * 2, layout.laneHeight);
        }

        // Apply sidechain visual compression to non-kick lanes
        let laneVisualScale = 1;
        if (laneId !== 'kick' && sidechainRef.current > 0.05) {
          laneVisualScale = 1 - sidechainRef.current * 0.15;
          ctx.fillStyle = `rgba(0, 0, 0, ${sidechainRef.current * 0.3})`;
          ctx.fillRect(LANE_PADDING, laneY, dimensions.width - LANE_PADDING * 2, layout.laneHeight);
        }

        // Muted overlay
        if (isLaneMuted) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(LANE_PADDING, laneY, dimensions.width - LANE_PADDING * 2, layout.laneHeight);
        }

        // Lane divider line
        ctx.strokeStyle = COLORS.grid.laneDivider;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(LANE_PADDING, laneY + layout.laneHeight);
        ctx.lineTo(dimensions.width - LANE_PADDING, laneY + layout.laneHeight);
        ctx.stroke();

        // Draw lane name/header
        ctx.save();
        ctx.fillStyle = isLaneMuted ? '#666666' : lane.color.core;
        ctx.globalAlpha = (0.5 + breatheValue * 0.3) * (isLaneMuted ? 0.5 : 1);
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        if (perf.glowEnabled) {
          ctx.shadowColor = isLaneMuted ? '#333333' : lane.color.core;
          ctx.shadowBlur = isLaneMuted ? perf.shadowBlur * 0.25 : perf.shadowBlur * 0.5 + breatheValue * perf.shadowBlur * 0.5;
        }

        let displayName = lane.name;
        if (isLaneMuted) {
          displayName = `[M] ${lane.name}`;
        } else if (isPatternLane && isLaneActive) {
          const patternName = getPatternName(laneId);
          displayName = `${lane.name}: ${patternName}`;
        } else if (isPatternLane) {
          displayName = `${lane.name} [tap]`;
        }

        ctx.fillText(displayName, LANE_PADDING + 4, laneY + layout.laneHeight / 2);
        ctx.restore();

        // Draw steps (grid lanes) or pattern indicator (pattern lanes)
        if (isPatternLane) {
          // Pattern lane: show active indicator
          const centerX = layout.gridLeft + layout.gridWidth / 2;
          const centerY = laneY + layout.laneHeight / 2;

          if (isLaneActive) {
            // Animated pulse for active pattern
            const pulseRadius = 20 + Math.sin(breathePhaseRef.current * 3) * 5;
            ctx.save();
            ctx.strokeStyle = lane.color.core;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.3 + breatheValue * 0.4;
            ctx.beginPath();
            ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner filled circle
            ctx.fillStyle = lane.color.core;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else {
            // Inactive pattern lane
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        } else {
          // Grid lane: draw step circles
          for (let step = 0; step < STEPS_PER_BAR; step++) {
            const stepX = layout.gridLeft + step * layout.stepWidth + layout.stepWidth / 2;
            const stepY = laneY + layout.laneHeight / 2;
            const isActive = lanePattern[step] === 1;
            const flashKey = `${laneId}_${step}`;
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
              const color = lane.color.core;
              let radius = TRIGGER_RADIUS * laneVisualScale;
              const triggerBreathe = perf.breathingEnabled
                ? Math.sin(breathePhaseRef.current * 2 + step * 0.3) * 0.08 + 1
                : 1;
              radius *= triggerBreathe;

              if (perf.glowEnabled) {
                if (flashIntensity > 0) {
                  ctx.shadowColor = '#ffffff';
                  ctx.shadowBlur = perf.shadowBlur + flashIntensity * perf.shadowBlur * 2;
                  radius += flashIntensity * 6;
                } else {
                  ctx.shadowColor = color;
                  ctx.shadowBlur = perf.shadowBlur + breatheValue * perf.shadowBlur * 0.5;
                }
              } else if (flashIntensity > 0) {
                radius += flashIntensity * 6;
              }

              ctx.fillStyle = flashIntensity > 0.5 ? '#ffffff' : color;
              ctx.beginPath();
              ctx.arc(stepX, stepY, radius, 0, Math.PI * 2);
              ctx.fill();

              ctx.shadowBlur = 0;
              const highlightAlpha = 0.4 + flashIntensity * 0.4;
              ctx.fillStyle = `rgba(255, 255, 255, ${highlightAlpha})`;
              ctx.beginPath();
              ctx.arc(stepX, stepY, radius * 0.35, 0, Math.PI * 2);
              ctx.fill();

              if (flashIntensity < 0.3 && perf.glowEnabled) {
                ctx.strokeStyle = `${color}40`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(stepX, stepY, radius + 3, 0, Math.PI * 2);
                ctx.stroke();
              }
            } else {
              const inactiveRadius = TRIGGER_RADIUS * 0.5 * laneVisualScale;
              const inactiveAlpha = 0.12 + breatheValue * 0.05;
              ctx.fillStyle = `rgba(255, 255, 255, ${inactiveAlpha})`;
              ctx.beginPath();
              ctx.arc(stepX, stepY, inactiveRadius, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.restore();
          }
        }

        ctx.restore();
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

      // === DRAW PLAYHEAD (only for grid lanes) ===
      const gridLanesInCategory = layout.categoryLanes.filter(id => LANES[id].type === 'grid');
      if (gridLanesInCategory.length > 0) {
        const playheadX = layout.gridLeft + playhead * layout.stepWidth + layout.stepWidth / 2;
        const playheadJustMoved = lastPlayheadRef.current !== playhead;

        if (playheadJustMoved) {
          let trailColor = COLORS.playhead.glow;

          layout.categoryLanes.forEach((laneId, laneIndex) => {
            const lanePattern = grid[laneId] || [];
            if (lanePattern[playhead] === 1) {
              trailColor = LANES[laneId].color.core;

              const flashKey = `${laneId}_${playhead}`;
              hitFlashRef.current[flashKey] = 1;

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

          playheadTrailRef.current.push({
            x: playheadX,
            alpha: 0.6,
            color: trailColor,
          });

          if (playheadTrailRef.current.length > perf.maxTrailLength) {
            playheadTrailRef.current.shift();
          }

          lastPlayheadRef.current = playhead;
        }

        // Draw playhead line
        const firstGridLaneIndex = layout.categoryLanes.findIndex(id => LANES[id].type === 'grid');
        const lastGridLaneIndex = layout.categoryLanes.length - 1 - [...layout.categoryLanes].reverse().findIndex(id => LANES[id].type === 'grid');

        if (firstGridLaneIndex !== -1) {
          const playheadTop = layout.topOffset + firstGridLaneIndex * layout.laneHeight - 5;
          const playheadBottom = layout.topOffset + (lastGridLaneIndex + 1) * layout.laneHeight + 5;

          ctx.save();
          ctx.strokeStyle = COLORS.playhead.line;
          ctx.lineWidth = PLAYHEAD_WIDTH;
          if (perf.glowEnabled) {
            ctx.shadowColor = COLORS.playhead.glow;
            ctx.shadowBlur = perf.shadowBlur * 1.5;
          }
          ctx.beginPath();
          ctx.moveTo(playheadX, playheadTop);
          ctx.lineTo(playheadX, playheadBottom);
          ctx.stroke();
          if (perf.glowEnabled) {
            ctx.shadowBlur = perf.shadowBlur * 0.5;
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // === DRAW STAB BUTTONS (2x2 grid) ===
      const stabCols = 2;
      const stabRows = 2;
      const stabGap = 8;
      const stabGridWidth = dimensions.width - LANE_PADDING * 2;
      const stabButtonWidth = (stabGridWidth - stabGap) / stabCols;
      const stabButtonHeight = (STAB_BAR_HEIGHT - stabGap * 3) / stabRows;

      STAB_ORDER.forEach((stabId, index) => {
        const stab = STABS[stabId];
        const col = index % stabCols;  // 0 or 1
        const row = Math.floor(index / stabCols);  // 0 or 1
        const stabX = LANE_PADDING + col * (stabButtonWidth + stabGap);
        const stabY = layout.stabBarTop + stabGap + row * (stabButtonHeight + stabGap);
        const flash = stabFlashRef.current[stabId] || 0;

        ctx.save();

        // Button background
        ctx.fillStyle = flash > 0.1 ? stab.color : 'rgba(255, 255, 255, 0.1)';
        if (perf.glowEnabled && flash > 0.1) {
          ctx.shadowColor = stab.color;
          ctx.shadowBlur = perf.shadowBlur * 1.5;
        }
        ctx.beginPath();
        ctx.roundRect(stabX, stabY, stabButtonWidth, stabButtonHeight, 8);
        ctx.fill();

        // Button border
        ctx.shadowBlur = 0;
        ctx.strokeStyle = stab.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(stabX, stabY, stabButtonWidth, stabButtonHeight, 8);
        ctx.stroke();

        // Button text
        ctx.fillStyle = flash > 0.1 ? '#000000' : stab.color;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(stab.name, stabX + stabButtonWidth / 2, stabY + stabButtonHeight / 2);

        ctx.restore();
      });

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [dimensions, grid, playhead, getLayout, mutedLanes, unlockedLanes, activeLanes, currentCategory, tension, layers, activeLayerIndex, canAddLayer, isRecordingAudio, isInWarningZone]);

  // Handle tap interactions
  const handlePointerDown = useCallback(async (event) => {
    event.preventDefault();
    await ensureAudioReady();

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const layout = getLayout();

    // === UNIFIED CONTROL STRIP INTERACTIONS ===
    if (y >= 0 && y < layout.controlStripHeight) {
      const stripCenterY = layout.controlStripHeight / 2;

      // Zone 1: Category tabs
      if (x < layout.categoryZoneWidth) {
        const tabWidth = layout.categoryZoneWidth / CATEGORY_ORDER.length;
        const tabIndex = Math.floor(x / tabWidth);
        if (tabIndex >= 0 && tabIndex < CATEGORY_ORDER.length) {
          setCurrentCategory(CATEGORY_ORDER[tabIndex]);
        }
        return;
      }

      // Zone 2: Layer dots
      if (x >= layout.layerDotsZoneX && x < layout.layerDotsZoneX + layout.layerDotsZoneWidth) {
        const dotsStartX = layout.layerDotsZoneX + 15;
        for (let i = 0; i < MAX_LAYERS; i++) {
          const dotX = dotsStartX + i * LAYER_INDICATOR_SPACING;
          const distance = Math.sqrt(Math.pow(x - dotX, 2) + Math.pow(y - stripCenterY, 2));

          if (distance <= LAYER_INDICATOR_RADIUS + 8) {
            const layer = layers[i];
            if (layer) {
              selectLayer(layer.id);
            }
            return;
          }
        }
        return;
      }

      // Zone 3: Tension slider
      const tensionBarX = layout.tensionZoneX + 12;
      const tensionBarWidth = layout.tensionZoneWidth - 24;
      if (x >= tensionBarX - 10 && x <= tensionBarX + tensionBarWidth + 10) {
        isDraggingTensionRef.current = true;
        const newTension = Math.max(0, Math.min(100, ((x - tensionBarX) / tensionBarWidth) * 100));
        setTension(newTension);
        return;
      }

      // Zone 4: DROP button
      const dropButtonY = stripCenterY - 14;
      const dropButtonHeight = 28;
      if (x >= layout.dropButtonX && x <= layout.dropButtonX + layout.dropButtonWidth &&
          y >= dropButtonY && y <= dropButtonY + dropButtonHeight) {
        triggerDrop();
        dropFlashRef.current = 1;
        return;
      }

      // Zone 5: Tempo controls
      if (x >= layout.tempoZoneX) {
        const tempoBtnSize = 18;
        const tempoBtnY = stripCenterY - tempoBtnSize / 2;

        // Minus button
        if (x >= layout.tempoZoneX + 4 && x <= layout.tempoZoneX + 4 + tempoBtnSize &&
            y >= tempoBtnY && y <= tempoBtnY + tempoBtnSize) {
          decreaseTempo();
          return;
        }

        // Plus button
        if (x >= layout.tempoZoneX + layout.tempoZoneWidth - tempoBtnSize - 4 &&
            x <= layout.tempoZoneX + layout.tempoZoneWidth - 4 &&
            y >= tempoBtnY && y <= tempoBtnY + tempoBtnSize) {
          increaseTempo();
          return;
        }
      }

      return;
    }

    // Check for stab button tap (2x2 grid)
    const stabCols = 2;
    const stabRows = 2;
    const stabGap = 8;
    const stabGridWidth = dimensions.width - LANE_PADDING * 2;
    const stabButtonWidth = (stabGridWidth - stabGap) / stabCols;
    const stabButtonHeight = (STAB_BAR_HEIGHT - stabGap * 3) / stabRows;

    if (y >= layout.stabBarTop && y <= layout.stabBarTop + STAB_BAR_HEIGHT) {
      STAB_ORDER.forEach((stabId, index) => {
        const col = index % stabCols;
        const row = Math.floor(index / stabCols);
        const stabX = LANE_PADDING + col * (stabButtonWidth + stabGap);
        const stabY = layout.stabBarTop + stabGap + row * (stabButtonHeight + stabGap);
        if (x >= stabX && x <= stabX + stabButtonWidth &&
            y >= stabY && y <= stabY + stabButtonHeight) {
          playStab(stabId);
          stabFlashRef.current[stabId] = 1;
        }
      });
      return;
    }

    // Check for lane interactions
    const laneIndex = Math.floor((y - layout.topOffset) / layout.laneHeight);
    if (laneIndex < 0 || laneIndex >= layout.categoryLanes.length) return;

    const laneId = layout.categoryLanes[laneIndex];
    const lane = LANES[laneId];
    const isPatternLane = lane.type === 'pattern';

    // Check if tap is on lane header
    const isOnHeader = x < layout.gridLeft;

    if (isOnHeader || isPatternLane) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current.time;
      const isSameLane = lastTapRef.current.laneId === laneId;

      // Double-tap = mute toggle
      if (isSameLane && timeSinceLastTap < 400) {
        toggleMute(laneId);
        lastTapRef.current = { laneId: null, time: 0 };

        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        return;
      }

      lastTapRef.current = { laneId, time: now };

      // For pattern lanes, single tap cycles pattern
      if (isPatternLane && !isOnHeader) {
        cyclePattern(laneId);
        return;
      }

      // Long-press = clear lane (grid) or deactivate (pattern)
      longPressLaneRef.current = laneId;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      longPressTimerRef.current = setTimeout(() => {
        if (longPressLaneRef.current === laneId) {
          if (isPatternLane) {
            toggleActive(laneId);
          } else {
            clearLane(laneId);
          }
          longPressLaneRef.current = null;
        }
      }, 500);

      return;
    }

    // Grid lane step toggle
    const step = Math.floor((x - layout.gridLeft) / layout.stepWidth);
    if (step < 0 || step >= STEPS_PER_BAR) return;
    if (!unlockedLanes[laneId]) return;

    toggleStep(laneId, step);
  }, [ensureAudioReady, getLayout, dimensions, toggleStep, toggleMute, clearLane, cyclePattern, toggleActive, unlockedLanes, setCurrentCategory, setTension, triggerDrop, playStab, layers, selectLayer, lockAndBuild, canAddLayer]);

  // Handle pointer move for tension slider
  const handlePointerMove = useCallback((event) => {
    if (!isDraggingTensionRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const layout = getLayout();

    const tensionBarX = layout.tensionZoneX + 12;
    const tensionBarWidth = layout.tensionZoneWidth - 24;

    const newTension = Math.max(0, Math.min(100, ((x - tensionBarX) / tensionBarWidth) * 100));
    setTension(newTension);
  }, [getLayout, setTension]);

  // Handle pointer up
  const handlePointerUp = useCallback(() => {
    isDraggingTensionRef.current = false;

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

  // Handle LOCK+BUILD button click
  const handleLockBuild = useCallback(async () => {
    await ensureAudioReady();
    if (canAddLayer) {
      const newLayer = lockAndBuild();
      if (newLayer) {
        lockBuildFlashRef.current = 1;
        newLayerPulseRef.current = 1;
      }
    }
  }, [ensureAudioReady, canAddLayer, lockAndBuild]);

  // Handle REC button click
  const handleRecord = useCallback(async () => {
    await ensureAudioReady();
    toggleRecording();
  }, [ensureAudioReady, toggleRecording]);

  // Handle RE-DO button click
  const handleRedo = useCallback(() => {
    redoRecording();
  }, [redoRecording]);

  // Handle DOWNLOAD button click
  const handleDownload = useCallback(() => {
    download();
  }, [download]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ display: 'block', touchAction: 'none' }}
      />

      {/* Post-Recording Overlay */}
      {isComplete && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
          <p className="text-white font-mono text-lg mb-8">Recording complete!</p>
          <div className="flex items-center gap-6">
            <button
              onClick={handleRedo}
              className="h-12 px-6 rounded-lg font-mono text-sm font-bold bg-gray-700 text-white hover:bg-gray-600 active:scale-95 transition-all"
              aria-label="Discard recording and go back"
            >
              GO BACK
            </button>
            <button
              onClick={handleDownload}
              className="h-12 px-6 rounded-lg font-mono text-sm font-bold bg-green-600 text-white hover:bg-green-500 active:scale-95 transition-all"
              aria-label="Download recording"
            >
              DOWNLOAD
            </button>
          </div>
        </div>
      )}

      {/* Recording Timer Display */}
      {(isRecordingAudio || isEnding) && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10">
          <div className={`px-4 py-2 rounded-lg font-mono text-lg font-bold ${
            isInWarningZone ? 'bg-red-600/90 text-white' : 'bg-red-500/80 text-white'
          } ${isInWarningZone ? 'animate-pulse' : ''}`}>
            {isEnding ? 'Finishing...' : `REC ${remainingTimeFormatted}`}
          </div>
        </div>
      )}

      {/* Bottom Controls: LOCK+BUILD, Play/Pause, and REC */}
      {!isComplete && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
          {/* LOCK+BUILD Button */}
          <button
            onClick={handleLockBuild}
            disabled={!canAddLayer || isRecordingAudio}
            className={`h-10 px-4 rounded-lg font-mono text-xs font-bold transition-all active:scale-95 ${
              canAddLayer && !isRecordingAudio
                ? 'bg-cyan-500 text-black hover:bg-cyan-400'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
            aria-label="Lock current layer and build new one"
          >
            {canAddLayer ? 'LOCK + BUILD' : 'MAX LAYERS'}
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            className="w-14 h-14 rounded-full bg-gray-800/80 border border-gray-600 flex items-center justify-center hover:bg-gray-700/80 active:scale-95 transition-all"
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

          {/* REC Button */}
          <button
            onClick={handleRecord}
            disabled={isEnding}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${
              isRecordingAudio
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-gray-800/80 border-2 border-red-500 hover:bg-gray-700/80'
            } ${isEnding ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={isRecordingAudio ? 'Stop recording' : 'Start recording'}
            style={{
              boxShadow: isRecordingAudio
                ? `0 0 ${8 + Math.sin(recordingPulseRef.current) * 8}px ${COLORS.recording.active}`
                : 'none',
            }}
          >
            {isRecordingAudio ? (
              // Stop icon (square)
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              // Record icon (circle)
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444">
                <circle cx="12" cy="12" r="8" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
