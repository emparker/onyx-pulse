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
} from '../engine/audio.js';
import {
  LANES,
  GRID_LANES,
  PATTERN_LANES,
  LANES_BY_CATEGORY,
  BUILD_DROP,
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
  const stepUnsubscribeRef = useRef(null);
  const hitLanesRef = useRef([]); // Lanes that were hit this step (for visual feedback)
  const wobbleActiveRef = useRef(false);

  // Initialize sequencer on mount
  useEffect(() => {
    if (!isSequencerReady()) {
      initSequencer();
    }
    setGrid({ ...getGrid() });
    setMutedLanes({ ...getMutedLanes() });
    setUnlockedLanes({ ...getUnlockedLanes() });
    setActiveLanes({ ...getActiveLanes() });
    setPatternIndices({ ...getPatternIndices() });
    setCurrentCategoryState(getCurrentCategory());

    // Subscribe to clock step events
    stepUnsubscribeRef.current = onStep((stepInfo) => {
      const { step, isDownbeat } = stepInfo;
      setPlayhead(step);

      // Get current state
      const currentGrid = getGrid();
      const currentMuted = getMutedLanes();
      const currentActive = getActiveLanes();
      const hitLanes = [];

      // Trigger grid lane sounds
      GRID_LANES.forEach(lane => {
        if (currentGrid[lane] && currentGrid[lane][step] && !currentMuted[lane]) {
          hitLanes.push(lane);
          const playFn = SYNTH_PLAYERS[lane];
          if (playFn) {
            playFn();
          }
        }
      });

      // Handle pattern lanes
      PATTERN_LANES.forEach(lane => {
        if (!currentActive[lane] || currentMuted[lane]) return;

        switch (lane) {
          case 'chord':
            // Chord plays on beat 1 of each bar
            if (isDownbeat) {
              playChord();
              hitLanes.push(lane);
            }
            break;
          case 'lead':
            // Lead plays on every 16th note
            playLead();
            hitLanes.push(lane);
            break;
          case 'arp':
            // Arp plays on every 16th note
            playArp();
            hitLanes.push(lane);
            break;
          // Wobble is continuous, handled separately
        }
      });

      // Store hit lanes for visual feedback
      hitLanesRef.current = hitLanes;

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
  }, []);

  // === GRID LANE FUNCTIONS ===

  // Toggle a step on/off
  const toggleStep = useCallback((lane, step) => {
    toggleStepFn(lane, step);
    setGrid({ ...getGrid() });
    setActiveLanes({ ...getActiveLanes() });
  }, []);

  // Clear a single lane
  const clearLanePattern = useCallback((lane) => {
    clearLane(lane);
    setGrid({ ...getGrid() });
  }, []);

  // Clear entire grid
  const clearAllPatterns = useCallback(() => {
    clearAllFn();
    setGrid({ ...getGrid() });
    setActiveLanes({ ...getActiveLanes() });
    resetSubPattern();
    // Stop wobble if active
    if (wobbleActiveRef.current) {
      stopWobble();
      wobbleActiveRef.current = false;
    }
  }, []);

  // Get lanes that were hit on current step (for visual feedback)
  const getHitLanes = useCallback(() => {
    return hitLanesRef.current;
  }, []);

  // === PATTERN LANE FUNCTIONS ===

  // Cycle pattern for a pattern lane
  const cyclePattern = useCallback((lane) => {
    cyclePatternFn(lane);
    setPatternIndices({ ...getPatternIndices() });
    setActiveLanes({ ...getActiveLanes() });

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
        // Start wobble if not already running
        if (!wobbleActiveRef.current) {
          startWobble();
          wobbleActiveRef.current = true;
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
  }, []);

  // Toggle active state for a pattern lane
  const toggleActive = useCallback((lane) => {
    toggleActiveFn(lane);
    setActiveLanes({ ...getActiveLanes() });

    // Handle wobble special case
    if (lane === 'wobble') {
      if (isActiveFn(lane)) {
        startWobble();
        wobbleActiveRef.current = true;
      } else {
        stopWobble();
        wobbleActiveRef.current = false;
      }
    }
  }, []);

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
    setMutedLanes({ ...getMutedLanes() });

    // Handle wobble mute
    if (lane === 'wobble') {
      if (isMuted(lane) && wobbleActiveRef.current) {
        stopWobble();
      } else if (!isMuted(lane) && isActiveFn(lane)) {
        startWobble();
      }
    }
  }, []);

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
