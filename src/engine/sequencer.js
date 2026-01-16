import {
  STEPS_PER_BAR,
  LANE_ORDER,
  GRID_LANES,
  PATTERN_LANES,
  LANES,
  LANES_BY_CATEGORY,
  CATEGORY_ORDER,
  UNLOCK_THRESHOLDS,
} from './constants.js';

// Sequencer state
let grid = {};
let playhead = 0;
let stepListeners = [];
let isInitialized = false;

// Lane states
let mutedLanes = {};      // { laneId: boolean }
let unlockedLanes = {};   // { laneId: boolean }
let activeLanes = {};     // { laneId: boolean } - whether lane is enabled
let patternIndices = {};  // { laneId: number } - current pattern index for pattern lanes

// Category state
let currentCategory = 'drums';

/**
 * Initialize the sequencer with empty grid
 */
export function initSequencer() {
  // Create empty grid for grid-type lanes
  grid = {};
  mutedLanes = {};
  unlockedLanes = {};
  activeLanes = {};
  patternIndices = {};

  LANE_ORDER.forEach((lane) => {
    const laneConfig = LANES[lane];

    // Grid lanes have step data
    if (laneConfig.type === 'grid') {
      grid[lane] = new Array(STEPS_PER_BAR).fill(0);
    }

    // Pattern lanes have pattern index
    if (laneConfig.type === 'pattern') {
      patternIndices[lane] = laneConfig.defaultPattern || 0;
    }

    mutedLanes[lane] = false;
    // All lanes start unlocked
    unlockedLanes[lane] = true;
    // All lanes start inactive (user enables by interacting)
    activeLanes[lane] = false;
  });

  playhead = 0;
  currentCategory = 'drums';
  isInitialized = true;
  console.log('Sequencer initialized');
}

/**
 * Check if sequencer is ready
 */
export function isSequencerReady() {
  return isInitialized;
}

// === GRID LANE FUNCTIONS ===

/**
 * Toggle a step on/off (for grid lanes)
 * @param {string} lane - Lane name
 * @param {number} step - Step index (0-15)
 * @returns {number} New value (0 or 1)
 */
export function toggleStep(lane, step) {
  if (!grid[lane]) return 0;
  if (step < 0 || step >= STEPS_PER_BAR) return grid[lane][step] || 0;
  if (!unlockedLanes[lane]) return 0;

  grid[lane][step] = grid[lane][step] ? 0 : 1;

  // Auto-activate lane when first trigger placed
  if (grid[lane][step] === 1) {
    activeLanes[lane] = true;
  }

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
 * Clear all triggers in a lane
 * @param {string} lane - Lane name
 */
export function clearLane(lane) {
  if (grid[lane]) {
    grid[lane] = new Array(STEPS_PER_BAR).fill(0);
  }
}

/**
 * Clear entire grid
 */
export function clearGrid() {
  GRID_LANES.forEach(lane => {
    if (grid[lane]) {
      grid[lane] = new Array(STEPS_PER_BAR).fill(0);
    }
  });
}

/**
 * Get pattern density (for visual effects)
 * @returns {number} 0-1 representing how full the grid is
 */
export function getGridDensity() {
  let active = 0;
  let total = 0;

  GRID_LANES.forEach(lane => {
    if (grid[lane]) {
      grid[lane].forEach(step => {
        if (step) active++;
        total++;
      });
    }
  });

  return total > 0 ? active / total : 0;
}

// === PATTERN LANE FUNCTIONS ===

/**
 * Get current pattern index for a pattern lane
 * @param {string} lane - Lane name
 * @returns {number} Current pattern index
 */
export function getPatternIndex(lane) {
  return patternIndices[lane] || 0;
}

/**
 * Set pattern index for a pattern lane
 * @param {string} lane - Lane name
 * @param {number} index - Pattern index
 */
export function setPatternIndex(lane, index) {
  const laneConfig = LANES[lane];
  if (!laneConfig || laneConfig.type !== 'pattern') return;

  const patterns = laneConfig.patterns || [];
  if (index >= 0 && index < patterns.length) {
    patternIndices[lane] = index;
  }
}

/**
 * Cycle to next pattern for a pattern lane
 * @param {string} lane - Lane name
 * @returns {number} New pattern index
 */
export function cyclePattern(lane) {
  const laneConfig = LANES[lane];
  if (!laneConfig || laneConfig.type !== 'pattern') return 0;

  const patterns = laneConfig.patterns || [];
  if (patterns.length === 0) return 0;

  const currentIndex = patternIndices[lane] || 0;
  const newIndex = (currentIndex + 1) % patterns.length;
  patternIndices[lane] = newIndex;

  // Auto-activate lane when pattern is cycled
  activeLanes[lane] = true;

  return newIndex;
}

/**
 * Get current pattern name for a pattern lane
 * @param {string} lane - Lane name
 * @returns {string} Current pattern name
 */
export function getPatternName(lane) {
  const laneConfig = LANES[lane];
  if (!laneConfig || laneConfig.type !== 'pattern') return '';

  const patterns = laneConfig.patterns || [];
  const index = patternIndices[lane] || 0;
  return patterns[index] || '';
}

/**
 * Get all pattern indices
 * @returns {Object} Pattern indices for all pattern lanes
 */
export function getPatternIndices() {
  return { ...patternIndices };
}

// === PLAYHEAD FUNCTIONS ===

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

  // Collect which grid lanes are active at this step
  const activeGridLanes = [];
  GRID_LANES.forEach(lane => {
    if (grid[lane] && grid[lane][currentStep] && !mutedLanes[lane]) {
      activeGridLanes.push(lane);
    }
  });

  // Check which pattern lanes are active
  const activePatternLanes = [];
  PATTERN_LANES.forEach(lane => {
    if (activeLanes[lane] && !mutedLanes[lane]) {
      activePatternLanes.push(lane);
    }
  });

  // Advance to next step (loop)
  playhead = (playhead + 1) % STEPS_PER_BAR;

  // Notify listeners
  const stepInfo = {
    step: currentStep,
    activeGridLanes,
    activePatternLanes,
    // Legacy compatibility
    activeLanes: activeGridLanes,
    isDownbeat: currentStep === 0,
    isBeat: currentStep % 4 === 0,
    isBar: currentStep === 0,
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

// === LANE STATE FUNCTIONS ===

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
 * Toggle active state for a lane (especially pattern lanes)
 * @param {string} lane - Lane name
 * @returns {boolean} New active state
 */
export function toggleActive(lane) {
  if (!activeLanes.hasOwnProperty(lane)) return false;
  activeLanes[lane] = !activeLanes[lane];
  return activeLanes[lane];
}

/**
 * Set active state for a lane
 * @param {string} lane - Lane name
 * @param {boolean} active - Active state
 */
export function setActive(lane, active) {
  if (!activeLanes.hasOwnProperty(lane)) return;
  activeLanes[lane] = active;
}

/**
 * Check if a lane is active
 * @param {string} lane - Lane name
 * @returns {boolean} Active state
 */
export function isActive(lane) {
  return activeLanes[lane] || false;
}

/**
 * Get all active lanes
 * @returns {Object} Active lanes object
 */
export function getActiveLanes() {
  return { ...activeLanes };
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
 * Force unlock a lane
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

// === CATEGORY FUNCTIONS ===

/**
 * Get current category
 * @returns {string} Current category name
 */
export function getCurrentCategory() {
  return currentCategory;
}

/**
 * Set current category
 * @param {string} category - Category name ('drums', 'bass', 'melodic')
 */
export function setCurrentCategory(category) {
  if (LANES_BY_CATEGORY[category]) {
    currentCategory = category;
  }
}

/**
 * Cycle to next category
 * @returns {string} New category name
 */
export function cycleCategory() {
  const currentIndex = CATEGORY_ORDER.indexOf(currentCategory);
  const newIndex = (currentIndex + 1) % CATEGORY_ORDER.length;
  currentCategory = CATEGORY_ORDER[newIndex];
  return currentCategory;
}

/**
 * Get lanes for current category
 * @returns {Array} Array of lane IDs for current category
 */
export function getCurrentCategoryLanes() {
  return LANES_BY_CATEGORY[currentCategory] || [];
}

/**
 * Get lanes for a specific category
 * @param {string} category - Category name
 * @returns {Array} Array of lane IDs
 */
export function getLanesForCategory(category) {
  return LANES_BY_CATEGORY[category] || [];
}

// === CLEAR FUNCTIONS ===

/**
 * Clear all - reset grid and pattern lanes
 */
export function clearAll() {
  // Clear grid lanes
  GRID_LANES.forEach(lane => {
    if (grid[lane]) {
      grid[lane] = new Array(STEPS_PER_BAR).fill(0);
    }
  });

  // Deactivate all pattern lanes
  PATTERN_LANES.forEach(lane => {
    activeLanes[lane] = false;
  });

  // Reset all grid lane active states
  GRID_LANES.forEach(lane => {
    activeLanes[lane] = false;
  });
}

// === CLEANUP ===

/**
 * Cleanup sequencer
 */
export function disposeSequencer() {
  grid = {};
  playhead = 0;
  stepListeners = [];
  mutedLanes = {};
  unlockedLanes = {};
  activeLanes = {};
  patternIndices = {};
  currentCategory = 'drums';
  isInitialized = false;
}
