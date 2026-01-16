import { STEPS_PER_BAR, LANE_ORDER, UNLOCK_THRESHOLDS } from './constants.js';

// Sequencer state
let grid = {};
let playhead = 0;
let stepListeners = [];
let isInitialized = false;

// Lane states
let mutedLanes = {};      // { laneId: boolean }
let unlockedLanes = {};   // { laneId: boolean }

/**
 * Initialize the sequencer with empty grid
 */
export function initSequencer() {
  // Create empty grid for each lane
  grid = {};
  mutedLanes = {};
  unlockedLanes = {};

  LANE_ORDER.forEach((lane, index) => {
    grid[lane] = new Array(STEPS_PER_BAR).fill(0);
    mutedLanes[lane] = false;
    // All lanes start unlocked (progressive unlock disabled for better UX)
    unlockedLanes[lane] = true;
  });

  playhead = 0;
  isInitialized = true;
  console.log('Sequencer initialized');
}

/**
 * Check and update lane unlock status based on total triggers placed
 */
function checkUnlocks() {
  const totalTriggers = getTotalTriggers();

  LANE_ORDER.forEach((lane, index) => {
    if (index === 0) return; // First lane always unlocked

    const threshold = UNLOCK_THRESHOLDS[lane];
    if (threshold && totalTriggers >= threshold && !unlockedLanes[lane]) {
      unlockedLanes[lane] = true;
      console.log(`Lane ${lane} unlocked at ${totalTriggers} triggers`);
    }
  });
}

/**
 * Get total number of triggers across all unlocked lanes
 */
function getTotalTriggers() {
  let total = 0;
  LANE_ORDER.forEach(lane => {
    if (unlockedLanes[lane] && grid[lane]) {
      total += grid[lane].filter(v => v > 0).length;
    }
  });
  return total;
}

/**
 * Check if sequencer is ready
 */
export function isSequencerReady() {
  return isInitialized;
}

/**
 * Toggle a step on/off
 * @param {string} lane - Lane name (kick, hat, clap, bass)
 * @param {number} step - Step index (0-15)
 * @returns {number} New value (0 or 1)
 */
export function toggleStep(lane, step) {
  if (!grid[lane]) return 0;
  if (step < 0 || step >= STEPS_PER_BAR) return grid[lane][step] || 0;
  if (!unlockedLanes[lane]) return 0; // Can't toggle locked lanes

  grid[lane][step] = grid[lane][step] ? 0 : 1;

  // Check if this toggle unlocks new lanes
  checkUnlocks();

  return grid[lane][step];
}

/**
 * Set a step to a specific value
 * @param {string} lane - Lane name
 * @param {number} step - Step index
 * @param {number} value - 0 or 1
 */
export function setStep(lane, step, value) {
  if (!grid[lane]) return;
  if (step < 0 || step >= STEPS_PER_BAR) return;

  grid[lane][step] = value ? 1 : 0;
}

/**
 * Get the current grid state
 * @returns {Object} Grid object with lane arrays
 */
export function getGrid() {
  return grid;
}

/**
 * Get a specific lane's pattern
 * @param {string} lane - Lane name
 * @returns {Array} Array of step values
 */
export function getLane(lane) {
  return grid[lane] || [];
}

/**
 * Get current playhead position
 * @returns {number} Current step (0-15)
 */
export function getPlayhead() {
  return playhead;
}

/**
 * Advance playhead to next step
 * Called by clock on each 16th note
 * @returns {Object} Info about current step for triggering sounds
 */
export function advancePlayhead() {
  const currentStep = playhead;

  // Collect which lanes are active at this step
  const activeLanes = [];
  LANE_ORDER.forEach(lane => {
    if (grid[lane] && grid[lane][currentStep]) {
      activeLanes.push(lane);
    }
  });

  // Advance to next step (loop)
  playhead = (playhead + 1) % STEPS_PER_BAR;

  // Notify listeners
  const stepInfo = {
    step: currentStep,
    activeLanes,
    isDownbeat: currentStep === 0,
    isBeat: currentStep % 4 === 0, // Quarter note beats
  };

  stepListeners.forEach(cb => cb(stepInfo));

  return stepInfo;
}

/**
 * Subscribe to step events
 * @param {Function} callback - Called on each step with stepInfo
 * @returns {Function} Unsubscribe function
 */
export function onStep(callback) {
  stepListeners.push(callback);
  return () => {
    stepListeners = stepListeners.filter(cb => cb !== callback);
  };
}

/**
 * Clear all triggers in a lane
 * @param {string} lane - Lane name
 */
export function clearLane(lane) {
  if (!grid[lane]) return;
  grid[lane] = new Array(STEPS_PER_BAR).fill(0);
}

/**
 * Clear entire grid
 */
export function clearGrid() {
  LANE_ORDER.forEach(lane => {
    grid[lane] = new Array(STEPS_PER_BAR).fill(0);
  });
}

/**
 * Get pattern density (for visual effects)
 * @returns {number} 0-1 representing how full the grid is
 */
export function getGridDensity() {
  let active = 0;
  let total = 0;

  LANE_ORDER.forEach(lane => {
    if (grid[lane]) {
      grid[lane].forEach(step => {
        if (step) active++;
        total++;
      });
    }
  });

  return total > 0 ? active / total : 0;
}

/**
 * Toggle mute state for a lane
 * @param {string} lane - Lane name
 * @returns {boolean} New mute state
 */
export function toggleMute(lane) {
  if (!mutedLanes.hasOwnProperty(lane)) return false;
  mutedLanes[lane] = !mutedLanes[lane];
  return mutedLanes[lane];
}

/**
 * Set mute state for a lane
 * @param {string} lane - Lane name
 * @param {boolean} muted - Mute state
 */
export function setMute(lane, muted) {
  if (!mutedLanes.hasOwnProperty(lane)) return;
  mutedLanes[lane] = muted;
}

/**
 * Check if a lane is muted
 * @param {string} lane - Lane name
 * @returns {boolean} Mute state
 */
export function isMuted(lane) {
  return mutedLanes[lane] || false;
}

/**
 * Get all muted lanes
 * @returns {Object} Muted lanes object
 */
export function getMutedLanes() {
  return { ...mutedLanes };
}

/**
 * Check if a lane is unlocked
 * @param {string} lane - Lane name
 * @returns {boolean} Unlocked state
 */
export function isUnlocked(lane) {
  return unlockedLanes[lane] || false;
}

/**
 * Get all unlocked lanes
 * @returns {Object} Unlocked lanes object
 */
export function getUnlockedLanes() {
  return { ...unlockedLanes };
}

/**
 * Force unlock a lane (for testing or manual override)
 * @param {string} lane - Lane name
 */
export function unlockLane(lane) {
  if (unlockedLanes.hasOwnProperty(lane)) {
    unlockedLanes[lane] = true;
  }
}

/**
 * Unlock all lanes
 */
export function unlockAllLanes() {
  LANE_ORDER.forEach(lane => {
    unlockedLanes[lane] = true;
  });
}

/**
 * Cleanup sequencer
 */
export function disposeSequencer() {
  grid = {};
  playhead = 0;
  stepListeners = [];
  mutedLanes = {};
  unlockedLanes = {};
  isInitialized = false;
}
