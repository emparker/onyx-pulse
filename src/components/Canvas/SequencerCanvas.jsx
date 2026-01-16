import { useRef, useEffect, useCallback, useState } from 'react';
import { useSequencer } from '../../hooks/useSequencer.js';
import { useAudioEngine } from '../../hooks/useAudioEngine.js';
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
} from '../../engine/constants.js';
import { getPatternName } from '../../engine/sequencer.js';

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
  const stabFlashRef = useRef({}); // { stabId: flashIntensity }
  const dropFlashRef = useRef(0); // Flash intensity for drop

  // Interaction state for double-tap and long-press
  const lastTapRef = useRef({ laneId: null, time: 0 });
  const longPressTimerRef = useRef(null);
  const longPressLaneRef = useRef(null);

  // Tension slider drag state
  const isDraggingTensionRef = useRef(false);

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
    const categoryLanes = LANES_BY_CATEGORY[currentCategory] || [];
    const numLanes = categoryLanes.length;

    // Reserve space for: tabs (50px) + tension bar (50px) + lanes + stab bar (70px) + play button area (80px)
    const tabsHeight = 50;
    const tensionBarHeight = 50;
    const playButtonAreaHeight = 80;

    const availableLaneSpace = dimensions.height - tabsHeight - tensionBarHeight - STAB_BAR_HEIGHT - playButtonAreaHeight;
    const totalLaneHeight = numLanes * LANE_HEIGHT;
    const topOffset = tensionBarHeight + tabsHeight + Math.max(0, (availableLaneSpace - totalLaneHeight) / 2);
    const stepWidth = (dimensions.width - LANE_PADDING * 2 - HEADER_WIDTH) / STEPS_PER_BAR;

    return {
      topOffset,
      stepWidth,
      laneHeight: LANE_HEIGHT,
      gridLeft: LANE_PADDING + HEADER_WIDTH,
      gridRight: dimensions.width - LANE_PADDING,
      gridWidth: dimensions.width - LANE_PADDING * 2 - HEADER_WIDTH,
      headerWidth: HEADER_WIDTH,
      tabsTop: 0,
      tabsHeight,
      tensionTop: tabsHeight,
      tensionHeight: tensionBarHeight,
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

      // === DECAY EFFECTS ===
      sidechainRef.current *= 0.92;
      downbeatPulseRef.current *= 0.95;
      dropFlashRef.current *= 0.9;
      breathePhaseRef.current += 0.02;

      // Decay hit flashes
      Object.keys(hitFlashRef.current).forEach(key => {
        hitFlashRef.current[key] *= 0.82;
        if (hitFlashRef.current[key] < 0.01) {
          delete hitFlashRef.current[key];
        }
      });

      // Decay stab flashes
      Object.keys(stabFlashRef.current).forEach(key => {
        stabFlashRef.current[key] *= 0.85;
        if (stabFlashRef.current[key] < 0.01) {
          delete stabFlashRef.current[key];
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
      const pulseIntensity = downbeatPulseRef.current * 0.15 + dropFlashRef.current * 0.3;
      const gradient = ctx.createRadialGradient(
        dimensions.width / 2, dimensions.height / 2, 0,
        dimensions.width / 2, dimensions.height / 2, dimensions.width / 2
      );

      const coreR = parseInt(COLORS.background.core.slice(1, 3), 16);
      const coreG = parseInt(COLORS.background.core.slice(3, 5), 16);
      const coreB = parseInt(COLORS.background.core.slice(5, 7), 16);
      const pulseCore = `rgb(${Math.min(255, coreR + pulseIntensity * 60)}, ${Math.min(255, coreG + pulseIntensity * 80)}, ${Math.min(255, coreB + pulseIntensity * 100)})`;

      gradient.addColorStop(0, pulseCore);
      gradient.addColorStop(1, COLORS.background.edge);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // === DRAW CATEGORY TABS ===
      const tabWidth = dimensions.width / CATEGORY_ORDER.length;
      CATEGORY_ORDER.forEach((catId, index) => {
        const cat = CATEGORIES[catId];
        const isActive = catId === currentCategory;
        const tabX = index * tabWidth;

        // Tab background
        ctx.fillStyle = isActive ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(tabX, layout.tabsTop, tabWidth, layout.tabsHeight);

        // Tab border
        if (isActive) {
          ctx.fillStyle = cat.color;
          ctx.fillRect(tabX, layout.tabsTop + layout.tabsHeight - 3, tabWidth, 3);
        }

        // Tab text
        ctx.save();
        ctx.fillStyle = isActive ? cat.color : '#666666';
        ctx.font = `bold 14px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (isActive) {
          ctx.shadowColor = cat.color;
          ctx.shadowBlur = 8;
        }
        ctx.fillText(cat.name, tabX + tabWidth / 2, layout.tabsTop + layout.tabsHeight / 2);
        ctx.restore();
      });

      // === DRAW TENSION BAR ===
      const tensionBarPadding = 20;
      const tensionBarWidth = dimensions.width - tensionBarPadding * 2 - 100; // Reserve space for DROP button
      const tensionBarHeight = 12;
      const tensionBarX = tensionBarPadding;
      const tensionBarY = layout.tensionTop + (layout.tensionHeight - tensionBarHeight) / 2;

      // Tension label
      ctx.fillStyle = '#666666';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('TENSION', tensionBarX, tensionBarY - 12);

      // Tension bar background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(tensionBarX, tensionBarY, tensionBarWidth, tensionBarHeight, 6);
      ctx.fill();

      // Tension bar fill
      const tensionFillWidth = (tension / 100) * tensionBarWidth;
      if (tensionFillWidth > 0) {
        const tensionGradient = ctx.createLinearGradient(tensionBarX, 0, tensionBarX + tensionBarWidth, 0);
        tensionGradient.addColorStop(0, '#22d3ee');
        tensionGradient.addColorStop(0.5, '#f97316');
        tensionGradient.addColorStop(1, '#ef4444');
        ctx.fillStyle = tensionGradient;
        ctx.beginPath();
        ctx.roundRect(tensionBarX, tensionBarY, tensionFillWidth, tensionBarHeight, 6);
        ctx.fill();
      }

      // Tension handle
      const handleX = tensionBarX + tensionFillWidth;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(handleX, tensionBarY + tensionBarHeight / 2, 8, 0, Math.PI * 2);
      ctx.fill();

      // DROP button
      const dropButtonX = dimensions.width - tensionBarPadding - 70;
      const dropButtonY = tensionBarY - 6;
      const dropButtonWidth = 60;
      const dropButtonHeight = 24;
      const dropFlash = dropFlashRef.current;

      ctx.save();
      ctx.fillStyle = dropFlash > 0.1 ? '#ffffff' : '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8 + dropFlash * 20;
      ctx.beginPath();
      ctx.roundRect(dropButtonX, dropButtonY, dropButtonWidth, dropButtonHeight, 4);
      ctx.fill();
      ctx.fillStyle = dropFlash > 0.1 ? '#ef4444' : '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0;
      ctx.fillText('DROP', dropButtonX + dropButtonWidth / 2, dropButtonY + dropButtonHeight / 2);
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

        // Calculate breathing glow for this lane
        const breatheOffset = laneIndex * 0.5;
        const breatheValue = Math.sin(breathePhaseRef.current + breatheOffset) * 0.5 + 0.5;

        // Lane background with breathing glow (dimmed if muted)
        const muteDim = isLaneMuted ? 0.3 : 1;
        const bgAlpha = (0.02 + breatheValue * 0.02) * muteDim;
        ctx.fillStyle = `rgba(255, 255, 255, ${bgAlpha})`;
        ctx.fillRect(LANE_PADDING, laneY, dimensions.width - LANE_PADDING * 2, layout.laneHeight);

        // Subtle colored glow at lane edges (breathing)
        const edgeGlow = ctx.createLinearGradient(LANE_PADDING, laneY, LANE_PADDING, laneY + layout.laneHeight);
        const laneGlowAlpha = (0.03 + breatheValue * 0.04) * muteDim;
        edgeGlow.addColorStop(0, `${lane.color.core}${Math.round(laneGlowAlpha * 255).toString(16).padStart(2, '0')}`);
        edgeGlow.addColorStop(0.5, 'transparent');
        edgeGlow.addColorStop(1, `${lane.color.core}${Math.round(laneGlowAlpha * 255).toString(16).padStart(2, '0')}`);
        ctx.fillStyle = edgeGlow;
        ctx.fillRect(LANE_PADDING, laneY, dimensions.width - LANE_PADDING * 2, layout.laneHeight);

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
        ctx.shadowColor = isLaneMuted ? '#333333' : lane.color.core;
        ctx.shadowBlur = isLaneMuted ? 2 : 4 + breatheValue * 4;

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
              const triggerBreathe = Math.sin(breathePhaseRef.current * 2 + step * 0.3) * 0.08 + 1;
              radius *= triggerBreathe;

              if (flashIntensity > 0) {
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = GLOW_BLUR + flashIntensity * 25;
                radius += flashIntensity * 6;
              } else {
                ctx.shadowColor = color;
                ctx.shadowBlur = GLOW_BLUR + breatheValue * 4;
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

              if (flashIntensity < 0.3) {
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

          if (playheadTrailRef.current.length > 8) {
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
          ctx.shadowColor = COLORS.playhead.glow;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.moveTo(playheadX, playheadTop);
          ctx.lineTo(playheadX, playheadBottom);
          ctx.stroke();
          ctx.shadowBlur = 5;
          ctx.stroke();
          ctx.restore();
        }
      }

      // === DRAW STAB BUTTONS ===
      const stabButtonWidth = (dimensions.width - LANE_PADDING * 2 - 30) / STAB_ORDER.length;
      const stabButtonHeight = 44;
      const stabButtonY = layout.stabBarTop + (STAB_BAR_HEIGHT - stabButtonHeight) / 2;

      STAB_ORDER.forEach((stabId, index) => {
        const stab = STABS[stabId];
        const stabX = LANE_PADDING + index * (stabButtonWidth + 10);
        const flash = stabFlashRef.current[stabId] || 0;

        ctx.save();

        // Button background
        ctx.fillStyle = flash > 0.1 ? stab.color : 'rgba(255, 255, 255, 0.1)';
        ctx.shadowColor = stab.color;
        ctx.shadowBlur = flash > 0.1 ? 15 : 0;
        ctx.beginPath();
        ctx.roundRect(stabX, stabButtonY, stabButtonWidth, stabButtonHeight, 8);
        ctx.fill();

        // Button border
        ctx.strokeStyle = stab.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(stabX, stabButtonY, stabButtonWidth, stabButtonHeight, 8);
        ctx.stroke();

        // Button text
        ctx.fillStyle = flash > 0.1 ? '#000000' : stab.color;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText(stab.name, stabX + stabButtonWidth / 2, stabButtonY + stabButtonHeight / 2);

        ctx.restore();
      });

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [dimensions, grid, playhead, getLayout, mutedLanes, unlockedLanes, activeLanes, currentCategory, tension]);

  // Handle tap interactions
  const handlePointerDown = useCallback(async (event) => {
    event.preventDefault();
    await ensureAudioReady();

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const layout = getLayout();

    // Check for category tab tap
    if (y >= layout.tabsTop && y < layout.tabsTop + layout.tabsHeight) {
      const tabWidth = dimensions.width / CATEGORY_ORDER.length;
      const tabIndex = Math.floor(x / tabWidth);
      if (tabIndex >= 0 && tabIndex < CATEGORY_ORDER.length) {
        setCurrentCategory(CATEGORY_ORDER[tabIndex]);
      }
      return;
    }

    // Check for tension bar drag
    const tensionBarPadding = 20;
    const tensionBarWidth = dimensions.width - tensionBarPadding * 2 - 100;
    const tensionBarHeight = 12;
    const tensionBarX = tensionBarPadding;
    const tensionBarY = layout.tensionTop + (layout.tensionHeight - tensionBarHeight) / 2;

    if (y >= tensionBarY - 15 && y <= tensionBarY + tensionBarHeight + 15 &&
        x >= tensionBarX && x <= tensionBarX + tensionBarWidth) {
      isDraggingTensionRef.current = true;
      const newTension = Math.max(0, Math.min(100, ((x - tensionBarX) / tensionBarWidth) * 100));
      setTension(newTension);
      return;
    }

    // Check for DROP button tap
    const dropButtonX = dimensions.width - tensionBarPadding - 70;
    const dropButtonY = tensionBarY - 6;
    const dropButtonWidth = 60;
    const dropButtonHeight = 24;

    if (x >= dropButtonX && x <= dropButtonX + dropButtonWidth &&
        y >= dropButtonY && y <= dropButtonY + dropButtonHeight) {
      triggerDrop();
      dropFlashRef.current = 1;
      return;
    }

    // Check for stab button tap
    const stabButtonWidth = (dimensions.width - LANE_PADDING * 2 - 30) / STAB_ORDER.length;
    const stabButtonHeight = 44;
    const stabButtonY = layout.stabBarTop + (STAB_BAR_HEIGHT - stabButtonHeight) / 2;

    if (y >= stabButtonY && y <= stabButtonY + stabButtonHeight) {
      STAB_ORDER.forEach((stabId, index) => {
        const stabX = LANE_PADDING + index * (stabButtonWidth + 10);
        if (x >= stabX && x <= stabX + stabButtonWidth) {
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
  }, [ensureAudioReady, getLayout, dimensions, toggleStep, toggleMute, clearLane, cyclePattern, toggleActive, unlockedLanes, setCurrentCategory, setTension, triggerDrop, playStab]);

  // Handle pointer move for tension slider
  const handlePointerMove = useCallback((event) => {
    if (!isDraggingTensionRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;

    const tensionBarPadding = 20;
    const tensionBarWidth = dimensions.width - tensionBarPadding * 2 - 100;
    const tensionBarX = tensionBarPadding;

    const newTension = Math.max(0, Math.min(100, ((x - tensionBarX) / tensionBarWidth) * 100));
    setTension(newTension);
  }, [dimensions, setTension]);

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

      {/* Tempo Control */}
      <div className="absolute top-[108px] right-4 flex items-center gap-2 bg-gray-900/80 rounded-lg px-3 py-2 border border-gray-700">
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

      {/* Play/Pause Button */}
      <button
        onClick={handlePlayPause}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-gray-800/80 border border-gray-600 flex items-center justify-center hover:bg-gray-700/80 active:scale-95 transition-all"
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
