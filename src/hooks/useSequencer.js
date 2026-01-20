import { useRef, useEffect, useCallback, useState } from 'react';
import {
  initSequencer,
  isSequencerReady,
  toggleStep as toggleStepFn,
  getGrid,
  getPlayhead,
  clearLane,
  clearGrid,
  clearAll as clearAllFn,
  disposeSequencer,
  toggleMute as toggleMuteFn,
  getMutedLanes,
  getUnlockedLanes,
  getActiveLanes,
  isMuted,
  isUnlocked,
  isActive as isActiveFn,
  toggleActive as toggleActiveFn,
  unlockAllLanes as unlockAllFn,
  getCurrentCategory,
  setCurrentCategory as setCurrentCategoryFn,
  cycleCategory as cycleCategoryFn,
  getCurrentCategoryLanes,
  getPatternIndices,
  cyclePattern as cyclePatternFn,
  getPatternName,
  // Layer functions
  getAllLayers,
  getLayerCount,
  getActiveLayerIndex,
  getActiveLayer,
  lockAndBuild as lockAndBuildFn,
  setActiveLayer as setActiveLayerFn,
  deleteLayer as deleteLayerFn,
  isLayerLocked,
} from '../engine/sequencer.js';
import {
  onStep,
  togglePlayPause,
  isClockPlaying,
  getTempo,
  setTempo as setTempoFn,
  increaseTempo,
  decreaseTempo,
} from '../engine/clock.js';
import {
  playKick,
  playHat,
  playClap,
  playPerc,
  playSub,
  resetSubPattern,
  startWobble,
  stopWobble,
  setWobbleRate,
  getWobbleRate,
  playChord,
  setChordProgression,
  getChordProgression,
  playLead,
  setLeadPhrase,
  getLeadPhrase,
  playArp,
  setArpMode,
  getArpMode,
  playImpact,
  playRiser,
  stopRiser,
  playLaser,
  playReverse,
  setMasterHighpass,
  startSnareRoll,
  stopSnareRoll,
  triggerDrop,
  updateLayerGains,
} from '../engine/audio.js';
import {
  LANES,
  GRID_LANES,
  PATTERN_LANES,
  LANES_BY_CATEGORY,
  BUILD_DROP,
  MAX_LAYERS,
} from '../engine/constants.js';

// Map synth names to play functions
const SYNTH_PLAYERS = {
  kick: playKick,
  hat: playHat,
  clap: playClap,
  perc: playPerc,
  sub: playSub,
};

/**
 * React hook for managing the step sequencer
 * Handles initialization, step toggling, and sound triggering
 */
export function useSequencer() {
  const [playhead, setPlayhead] = useState(0);
  const [grid, setGrid] = useState({});
  const [isPlaying, setIsPlaying] = useState(true);
  const [mutedLanes, setMutedLanes] = useState({});
  const [unlockedLanes, setUnlockedLanes] = useState({});
  const [activeLanes, setActiveLanes] = useState({});
  const [patternIndices, setPatternIndices] = useState({});
  const [currentCategory, setCurrentCategoryState] = useState('drums');
  const [tempo, setTempo] = useState(getTempo());
  const [tension, setTensionState] = useState(0);

  // Layer state
  const [layers, setLayers] = useState([]);
  const [activeLayerIndex, setActiveLayerIndex] = useState(0);

  const stepUnsubscribeRef = useRef(null);
  const hitLanesRef = useRef([]); // Lanes that were hit this step (for visual feedback)
  const wobbleActiveRef = useRef({}); // Track wobble state per layer: { layerId: boolean }

  // Sync layer state from sequencer
  const syncLayerState = useCallback(() => {
    const allLayers = getAllLayers();
    setLayers(allLayers);
    setActiveLayerIndex(getActiveLayerIndex());

    // Update audio layer gains based on layer count
    updateLayerGains(allLayers.length);

    // Sync active layer's state to React
    const activeLayer = getActiveLayer();
    if (activeLayer) {
      setGrid({ ...activeLayer.grid });
      setMutedLanes({ ...activeLayer.mutedLanes });
      setActiveLanes({ ...activeLayer.activeLanes });
      setPatternIndices({ ...activeLayer.patternIndices });
    }
  }, []);

  // Initialize sequencer on mount
  useEffect(() => {
    if (!isSequencerReady()) {
      initSequencer();
    }

    // Initial sync
    syncLayerState();
    setUnlockedLanes({ ...getUnlockedLanes() });
    setCurrentCategoryState(getCurrentCategory());

    // Subscribe to clock step events
    stepUnsubscribeRef.current = onStep((stepInfo) => {
      const { step, isDownbeat } = stepInfo;
      setPlayhead(step);

      // Get all layers
      const allLayers = getAllLayers();

      // Collect which lanes should play (deduplicated across all layers)
      // This prevents triggering the same synth multiple times on the same step
      const gridLanesToPlay = new Set();
      const patternLanesToPlay = new Set();

      allLayers.forEach(layer => {
        const { id: layerId, grid: layerGrid, activeLanes: layerActiveLanes, mutedLanes: layerMutedLanes } = layer;

        // Collect grid lanes that should play
        GRID_LANES.forEach(lane => {
          if (layerGrid[lane] && layerGrid[lane][step] && !layerMutedLanes[lane]) {
            gridLanesToPlay.add(lane);
          }
        });

        // Collect pattern lanes that should play
        PATTERN_LANES.forEach(lane => {
          if (layerActiveLanes[lane] && !layerMutedLanes[lane]) {
            patternLanesToPlay.add(lane);
          }
        });

        // Handle wobble state per layer
        const wobbleKey = `layer_${layerId}`;
        const wobbleIsActive = layerActiveLanes['wobble'] && !layerMutedLanes['wobble'];
        if (wobbleIsActive && !wobbleActiveRef.current[wobbleKey]) {
          wobbleActiveRef.current[wobbleKey] = true;
        } else if (!wobbleIsActive && wobbleActiveRef.current[wobbleKey]) {
          wobbleActiveRef.current[wobbleKey] = false;
        }
      });

      // Now play each unique grid lane once
      gridLanesToPlay.forEach(lane => {
        const playFn = SYNTH_PLAYERS[lane];
        if (playFn) {
          playFn();
        }
      });

      // Play pattern lanes (each only once)
      patternLanesToPlay.forEach(lane => {
        switch (lane) {
          case 'chord':
            // Chord plays on beat 1 of each bar
            if (isDownbeat) {
              playChord();
            }
            break;
          case 'lead':
            // Lead plays on every 16th note
            playLead();
            break;
          case 'arp':
            // Arp plays on every 16th note
            playArp();
            break;
          case 'wobble':
            // Start wobble if any layer has it active
            if (!Object.values(wobbleActiveRef.current).some(v => v)) {
              // Wobble wasn't active before, start it now
            }
            break;
        }
      });

      // Handle wobble start/stop based on collective state
      const anyWobbleActive = allLayers.some(l =>
        l.activeLanes['wobble'] && !l.mutedLanes['wobble']
      );
      const wasWobbleActive = Object.values(wobbleActiveRef.current).some(v => v);

      if (anyWobbleActive && !wasWobbleActive) {
        startWobble();
      } else if (!anyWobbleActive && wasWobbleActive) {
        stopWobble();
        // Clear all wobble states
        Object.keys(wobbleActiveRef.current).forEach(key => {
          wobbleActiveRef.current[key] = false;
        });
      }

      // Store hit lanes for visual feedback
      hitLanesRef.current = [...gridLanesToPlay, ...patternLanesToPlay];

      // Reset sub pattern on downbeat
      if (isDownbeat) {
        resetSubPattern();
      }
    });

    return () => {
      if (stepUnsubscribeRef.current) {
        stepUnsubscribeRef.current();
      }
      disposeSequencer();
    };
  }, [syncLayerState]);

  // === LAYER FUNCTIONS ===

  // Lock current layer and create a new one
  const lockAndBuild = useCallback(() => {
    const newLayer = lockAndBuildFn();
    if (newLayer) {
      syncLayerState();
    }
    return newLayer;
  }, [syncLayerState]);

  // Select a layer (tapping on its indicator)
  const selectLayer = useCallback((layerId) => {
    setActiveLayerFn(layerId);
    syncLayerState();
  }, [syncLayerState]);

  // Delete a layer
  const deleteLayerById = useCallback((layerId) => {
    const success = deleteLayerFn(layerId);
    if (success) {
      syncLayerState();
    }
    return success;
  }, [syncLayerState]);

  // Check if at max layers
  const canAddLayer = useCallback(() => {
    return getLayerCount() < MAX_LAYERS;
  }, []);

  // === GRID LANE FUNCTIONS ===

  // Toggle a step on/off
  const toggleStep = useCallback((lane, step) => {
    toggleStepFn(lane, step);
    syncLayerState();
  }, [syncLayerState]);

  // Clear a single lane
  const clearLanePattern = useCallback((lane) => {
    clearLane(lane);
    syncLayerState();
  }, [syncLayerState]);

  // Clear entire grid
  const clearAllPatterns = useCallback(() => {
    clearAllFn();
    syncLayerState();
    resetSubPattern();
    // Stop wobble if active for current layer
    const activeLayer = getActiveLayer();
    if (activeLayer) {
      const wobbleKey = `layer_${activeLayer.id}`;
      if (wobbleActiveRef.current[wobbleKey]) {
        stopWobble();
        wobbleActiveRef.current[wobbleKey] = false;
      }
    }
  }, [syncLayerState]);

  // Get lanes that were hit on current step (for visual feedback)
  const getHitLanes = useCallback(() => {
    return hitLanesRef.current;
  }, []);

  // === PATTERN LANE FUNCTIONS ===

  // Cycle pattern for a pattern lane
  const cyclePattern = useCallback((lane) => {
    cyclePatternFn(lane);
    syncLayerState();

    // Apply pattern change to audio
    const laneConfig = LANES[lane];
    if (!laneConfig || laneConfig.type !== 'pattern') return;

    const patternName = getPatternName(lane);

    switch (lane) {
      case 'wobble':
        // Convert pattern name to rate
        const rateMap = { '1/4': '4n', '1/8': '8n', '1/16': '16n' };
        const rate = rateMap[patternName] || '8n';
        setWobbleRate(rate);
        // Start wobble if not already running for this layer
        const activeLayer = getActiveLayer();
        if (activeLayer) {
          const wobbleKey = `layer_${activeLayer.id}`;
          if (!wobbleActiveRef.current[wobbleKey]) {
            startWobble();
            wobbleActiveRef.current[wobbleKey] = true;
          }
        }
        break;
      case 'chord':
        setChordProgression(patternName);
        break;
      case 'lead':
        setLeadPhrase(patternName);
        break;
      case 'arp':
        setArpMode(patternName);
        break;
    }
  }, [syncLayerState]);

  // Toggle active state for a pattern lane
  const toggleActive = useCallback((lane) => {
    toggleActiveFn(lane);
    syncLayerState();

    // Handle wobble special case
    if (lane === 'wobble') {
      const activeLayer = getActiveLayer();
      if (activeLayer) {
        const wobbleKey = `layer_${activeLayer.id}`;
        if (isActiveFn(lane)) {
          startWobble();
          wobbleActiveRef.current[wobbleKey] = true;
        } else {
          // Only stop if no other layer has wobble active
          const allLayers = getAllLayers();
          const anyWobbleActive = allLayers.some(l =>
            l.id !== activeLayer.id && l.activeLanes['wobble'] && !l.mutedLanes['wobble']
          );
          if (!anyWobbleActive) {
            stopWobble();
          }
          wobbleActiveRef.current[wobbleKey] = false;
        }
      }
    }
  }, [syncLayerState]);

  // === PLAYBACK FUNCTIONS ===

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    const newState = togglePlayPause();
    setIsPlaying(newState);
    return newState;
  }, []);

  // === MUTE FUNCTIONS ===

  // Toggle mute for a lane
  const toggleMute = useCallback((lane) => {
    toggleMuteFn(lane);
    syncLayerState();

    // Handle wobble mute
    if (lane === 'wobble') {
      const activeLayer = getActiveLayer();
      if (activeLayer) {
        const wobbleKey = `layer_${activeLayer.id}`;
        if (isMuted(lane) && wobbleActiveRef.current[wobbleKey]) {
          // Only stop if no other layer has wobble active
          const allLayers = getAllLayers();
          const anyWobbleActive = allLayers.some(l =>
            l.id !== activeLayer.id && l.activeLanes['wobble'] && !l.mutedLanes['wobble']
          );
          if (!anyWobbleActive) {
            stopWobble();
          }
        } else if (!isMuted(lane) && isActiveFn(lane)) {
          startWobble();
        }
      }
    }
  }, [syncLayerState]);

  // Unlock all lanes
  const unlockAll = useCallback(() => {
    unlockAllFn();
    setUnlockedLanes({ ...getUnlockedLanes() });
  }, []);

  // === CATEGORY FUNCTIONS ===

  // Set current category
  const setCurrentCategory = useCallback((category) => {
    setCurrentCategoryFn(category);
    setCurrentCategoryState(category);
  }, []);

  // Cycle to next category
  const cycleCategory = useCallback(() => {
    const newCategory = cycleCategoryFn();
    setCurrentCategoryState(newCategory);
    return newCategory;
  }, []);

  // === TEMPO FUNCTIONS ===

  const handleIncreaseTempo = useCallback(() => {
    const newTempo = increaseTempo();
    setTempo(newTempo);
    return newTempo;
  }, []);

  const handleDecreaseTempo = useCallback(() => {
    const newTempo = decreaseTempo();
    setTempo(newTempo);
    return newTempo;
  }, []);

  const handleSetTempo = useCallback((bpm) => {
    const newTempo = setTempoFn(bpm);
    setTempo(newTempo);
    return newTempo;
  }, []);

  // === BUILD/DROP FUNCTIONS ===

  // Set tension (0-100)
  const setTension = useCallback((value) => {
    const clampedValue = Math.max(0, Math.min(100, value));
    setTensionState(clampedValue);

    // Calculate filter frequency (20Hz - 2000Hz)
    const filterFreq = BUILD_DROP.filterMinHz +
      (clampedValue / 100) * (BUILD_DROP.filterMaxHz - BUILD_DROP.filterMinHz);
    setMasterHighpass(filterFreq);

    // Handle kick mute at high tension
    if (clampedValue >= BUILD_DROP.kickMuteThreshold) {
      if (!isMuted('kick')) {
        // Auto-mute kick at high tension
      }
    }

    // Handle snare roll based on tension thresholds
    const thresholds = Object.entries(BUILD_DROP.snareRollThresholds)
      .map(([t, r]) => [parseInt(t), r])
      .sort((a, b) => b[0] - a[0]); // Sort descending

    let rollRate = null;
    for (const [threshold, rate] of thresholds) {
      if (clampedValue >= threshold) {
        rollRate = rate;
        break;
      }
    }

    if (rollRate) {
      startSnareRoll(rollRate);
    } else {
      stopSnareRoll();
    }
  }, []);

  // Trigger drop
  const handleDrop = useCallback(() => {
    setTensionState(0);
    triggerDrop();
  }, []);

  // === STAB FUNCTIONS ===

  const playStab = useCallback((stabId) => {
    switch (stabId) {
      case 'impact':
        playImpact();
        break;
      case 'riser':
        playRiser();
        break;
      case 'laser':
        playLaser();
        break;
      case 'reverse':
        playReverse();
        break;
    }
  }, []);

  return {
    // State
    grid,
    playhead,
    isPlaying,
    mutedLanes,
    unlockedLanes,
    activeLanes,
    patternIndices,
    currentCategory,
    tempo,
    tension,

    // Layer state
    layers,
    activeLayerIndex,
    layerCount: layers.length,
    canAddLayer: layers.length < MAX_LAYERS,
    maxLayers: MAX_LAYERS,

    // Playback
    togglePlay,

    // Grid lanes
    toggleStep,
    clearLane: clearLanePattern,
    clearAll: clearAllPatterns,
    getHitLanes,

    // Pattern lanes
    cyclePattern,
    toggleActive,
    getPatternName,

    // Layer management
    lockAndBuild,
    selectLayer,
    deleteLayer: deleteLayerById,
    isLayerLocked,

    // Mute/Unlock
    toggleMute,
    unlockAll,
    isReady: isSequencerReady,
    isLaneUnlocked: isUnlocked,
    isLaneMuted: isMuted,
    isLaneActive: isActiveFn,

    // Categories
    setCurrentCategory,
    cycleCategory,
    getCurrentCategoryLanes,

    // Tempo
    increaseTempo: handleIncreaseTempo,
    decreaseTempo: handleDecreaseTempo,
    setTempo: handleSetTempo,

    // Build/Drop
    setTension,
    triggerDrop: handleDrop,

    // Stabs
    playStab,
  };
}
