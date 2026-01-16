import { useRef, useEffect, useCallback, useState } from 'react';
import {
  initSequencer,
  isSequencerReady,
  toggleStep as toggleStepFn,
  getGrid,
  getPlayhead,
  clearLane,
  clearGrid,
  disposeSequencer,
  toggleMute as toggleMuteFn,
  getMutedLanes,
  getUnlockedLanes,
  isMuted,
  isUnlocked,
  unlockAllLanes as unlockAllFn,
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
import { playKick, playHat, playClap, playBass, resetBassPattern } from '../engine/audio.js';
import { LANE_ORDER, TEMPO_MIN, TEMPO_MAX } from '../engine/constants.js';

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
  const [tempo, setTempo] = useState(getTempo());
  const stepUnsubscribeRef = useRef(null);
  const hitLanesRef = useRef([]); // Lanes that were hit this step (for visual feedback)

  // Initialize sequencer on mount
  useEffect(() => {
    if (!isSequencerReady()) {
      initSequencer();
    }
    setGrid({ ...getGrid() });
    setMutedLanes({ ...getMutedLanes() });
    setUnlockedLanes({ ...getUnlockedLanes() });

    // Subscribe to clock step events
    stepUnsubscribeRef.current = onStep((stepInfo) => {
      const { step } = stepInfo;
      setPlayhead(step);

      // Check which lanes are active at this step
      const currentGrid = getGrid();
      const currentMuted = getMutedLanes();
      const hitLanes = [];

      LANE_ORDER.forEach(lane => {
        if (currentGrid[lane] && currentGrid[lane][step]) {
          hitLanes.push(lane);

          // Only trigger sound if lane is not muted
          if (!currentMuted[lane]) {
            switch (lane) {
              case 'kick':
                playKick();
                break;
              case 'hat':
                playHat();
                break;
              case 'clap':
                playClap();
                break;
              case 'bass':
                playBass();
                break;
            }
          }
        }
      });

      // Store hit lanes for visual feedback
      hitLanesRef.current = hitLanes;

      // Reset bass pattern on downbeat
      if (stepInfo.isDownbeat) {
        resetBassPattern();
      }
    });

    return () => {
      if (stepUnsubscribeRef.current) {
        stepUnsubscribeRef.current();
      }
      disposeSequencer();
    };
  }, []);

  // Toggle a step on/off
  const toggleStep = useCallback((lane, step) => {
    toggleStepFn(lane, step);
    setGrid({ ...getGrid() });
    // Update unlocked lanes (may have changed after adding triggers)
    setUnlockedLanes({ ...getUnlockedLanes() });
  }, []);

  // Clear a single lane
  const clearLanePattern = useCallback((lane) => {
    clearLane(lane);
    setGrid({ ...getGrid() });
  }, []);

  // Clear entire grid
  const clearAllPatterns = useCallback(() => {
    clearGrid();
    setGrid({ ...getGrid() });
    resetBassPattern();
  }, []);

  // Get lanes that were hit on current step (for visual feedback)
  const getHitLanes = useCallback(() => {
    return hitLanesRef.current;
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    const newState = togglePlayPause();
    setIsPlaying(newState);
    return newState;
  }, []);

  // Toggle mute for a lane
  const toggleMute = useCallback((lane) => {
    toggleMuteFn(lane);
    setMutedLanes({ ...getMutedLanes() });
  }, []);

  // Unlock all lanes (for power users)
  const unlockAll = useCallback(() => {
    unlockAllFn();
    setUnlockedLanes({ ...getUnlockedLanes() });
  }, []);

  // Tempo control
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

  return {
    grid,
    playhead,
    isPlaying,
    mutedLanes,
    unlockedLanes,
    tempo,
    togglePlay,
    toggleStep,
    toggleMute,
    clearLane: clearLanePattern,
    clearAll: clearAllPatterns,
    getHitLanes,
    unlockAll,
    increaseTempo: handleIncreaseTempo,
    decreaseTempo: handleDecreaseTempo,
    setTempo: handleSetTempo,
    isReady: isSequencerReady,
    isLaneUnlocked: isUnlocked,
    isLaneMuted: isMuted,
  };
}
