import {
  STEPS_PER_BAR,
  LANE_ORDER,
  GRID_LANES,
  PATTERN_LANES,
  LANES,
  LANES_BY_CATEGORY,
  CATEGORY_ORDER,
  MAX_LAYERS,
} from './constants.js';

// === LAYER-BASED STATE ===
// Each layer contains its own grid, activeLanes, patternIndices, mutedLanes

let layers = [];
let activeLayerIndex = 0;
let nextLayerId = 0;

// Global state (shared across layers)
let playhead = 0;
let stepListeners = [];
let isInitialized = false;
let currentCategory = 'drums';

// Unlock state (global - applies to all layers)
let unlockedLanes = {};

/**
 * Create a fresh layer object
 * @returns {Object} New layer with empty state
 */
function createEmptyLayer() {
  const layer = {
    id: nextLayerId++,
    grid: {},
    activeLanes: {},
    patternIndices: {},
    mutedLanes: {},
    locked: false,
  };

  // Initialize grid for grid-type lanes
  LANE_ORDER.forEach((lane) => {
    const laneConfig = LANES[lane];

    if (laneConfig.type === 'grid') {
      layer.grid[lane] = new Array(STEPS_PER_BAR).fill(0);
    }

    if (laneConfig.type === 'pattern') {
      layer.patternIndices[lane] = laneConfig.defaultPattern || 0;
    }

    layer.mutedLanes[lane] = false;
    layer.activeLanes[lane] = false;
  });

  return layer;
}

/**
 * Initialize the sequencer with a single layer
 */
export function initSequencer() {
  layers = [createEmptyLayer()];
  activeLayerIndex = 0;
  nextLayerId = 1; // Reset since we created layer 0

  // Initialize global unlock state
  unlockedLanes = {};
  LANE_ORDER.forEach((lane) => {
    unlockedLanes[lane] = true;
  });

  playhead = 0;
  currentCategory = 'drums';
  isInitialized = true;
  console.log('Sequencer initialized with layer system');
}

/**
 * Check if sequencer is ready
 */
export function isSequencerReady() {
  return isInitialized;
}

/**
 * Get the active layer
 * @returns {Object} Current active layer
 */
export function getActiveLayer() {
  return layers[activeLayerIndex] || layers[0];
}

/**
 * Get all layers
 * @returns {Array} All layers
 */
export function getAllLayers() {
  return [...layers];
}

/**
 * Get layer count
 * @returns {number} Number of layers
 */
export function getLayerCount() {
  return layers.length;
}

/**
 * Get active layer index
 * @returns {number} Index of active layer
 */
export function getActiveLayerIndex() {
  return activeLayerIndex;
}

/**
 * Create a new layer
 * @returns {Object|null} New layer object or null if at max
 */
export function createLayer() {
  if (layers.length >= MAX_LAYERS) {
    console.log('Max layers reached');
    return null;
  }

  const newLayer = createEmptyLayer();
  layers.push(newLayer);
  return newLayer;
}

/**
 * Lock a layer (still plays, can't edit)
 * @param {number} layerId - Layer ID to lock
 */
export function lockLayer(layerId) {
  const layer = layers.find(l => l.id === layerId);
  if (layer) {
    layer.locked = true;
  }
}

/**
 * Unlock a layer for editing
 * @param {number} layerId - Layer ID to unlock
 */
export function unlockLayerById(layerId) {
  const layer = layers.find(l => l.id === layerId);
  if (layer) {
    layer.locked = false;
  }
}

/**
 * Delete a layer
 * @param {number} layerId - Layer ID to delete
 * @returns {boolean} Success
 */
export function deleteLayer(layerId) {
  if (layers.length <= 1) {
    console.log('Cannot delete last layer');
    return false;
  }

  const index = layers.findIndex(l => l.id === layerId);
  if (index === -1) return false;

  layers.splice(index, 1);

  // Adjust active layer index if needed
  if (activeLayerIndex >= layers.length) {
    activeLayerIndex = layers.length - 1;
  }

  return true;
}

/**
 * Set active layer by ID
 * @param {number} layerId - Layer ID to make active
 */
export function setActiveLayer(layerId) {
  const index = layers.findIndex(l => l.id === layerId);
  if (index !== -1) {
    activeLayerIndex = index;
    // Auto-unlock if locked
    if (layers[index].locked) {
      layers[index].locked = false;
    }
  }
}

/**
 * Lock current layer and create a new one (main UX action)
 * @returns {Object|null} New layer or null if at max
 */
export function lockAndBuild() {
  if (layers.length >= MAX_LAYERS) {
    return null;
  }

  // Lock current layer
  const currentLayer = getActiveLayer();
  currentLayer.locked = true;

  // Create new layer
  const newLayer = createLayer();
  if (newLayer) {
    // Make new layer active
    activeLayerIndex = layers.length - 1;
  }

  return newLayer;
}

/**
 * Check if a layer is locked
 * @param {number} layerId - Layer ID
 * @returns {boolean} Lock state
 */
export function isLayerLocked(layerId) {
  const layer = layers.find(l => l.id === layerId);
  return layer ? layer.locked : false;
}

// === GRID LANE FUNCTIONS (operate on active layer) ===

/**
 * Toggle a step on/off (for grid lanes)
 * @param {string} lane - Lane name
 * @param {number} step - Step index (0-15)
 * @param {number} [layerId] - Optional layer ID (defaults to active)
 * @returns {number} New value (0 or 1)
 */
export function toggleStep(lane, step, layerId) {
  const layer = layerId !== undefined
    ? layers.find(l => l.id === layerId)
    : getActiveLayer();

  if (!layer || layer.locked) return 0;
  if (!layer.grid[lane]) return 0;
  if (step < 0 || step >= STEPS_PER_BAR) return layer.grid[lane][step] || 0;
  if (!unlockedLanes[lane]) return 0;

  layer.grid[lane][step] = layer.grid[lane][step] ? 0 : 1;

  // Auto-activate lane when first trigger placed
  if (layer.grid[lane][step] === 1) {
    layer.activeLanes[lane] = true;
  }

  return layer.grid[lane][step];
}

/**
 * Set a step to a specific value
 * @param {string} lane - Lane name
 * @param {number} step - Step index
 * @param {number} value - 0 or 1
 * @param {number} [layerId] - Optional layer ID
 */
export function setStep(lane, step, value, layerId) {
  const layer = layerId !== undefined
    ? layers.find(l => l.id === layerId)
    : getActiveLayer();

  if (!layer || layer.locked) return;
  if (!layer.grid[lane]) return;
  if (step < 0 || step >= STEPS_PER_BAR) return;

  layer.grid[lane][step] = value ? 1 : 0;
}

/**
 * Get the current grid state (active layer)
 * @returns {Object} Grid object with lane arrays
 */
export function getGrid() {
  return getActiveLayer().grid;
}

/**
 * Get a specific lane's pattern (active layer)
 * @param {string} lane - Lane name
 * @returns {Array} Array of step values
 */
export function getLane(lane) {
  return getActiveLayer().grid[lane] || [];
}

/**
 * Clear all triggers in a lane (active layer)
 * @param {string} lane - Lane name
 */
export function clearLane(lane) {
  const layer = getActiveLayer();
  if (layer.locked) return;

  if (layer.grid[lane]) {
    layer.grid[lane] = new Array(STEPS_PER_BAR).fill(0);
  }
}

/**
 * Clear entire grid (active layer)
 */
export function clearGrid() {
  const layer = getActiveLayer();
  if (layer.locked) return;

  GRID_LANES.forEach(lane => {
    if (layer.grid[lane]) {
      layer.grid[lane] = new Array(STEPS_PER_BAR).fill(0);
    }
  });
}

/**
 * Get pattern density (for visual effects, active layer)
 * @returns {number} 0-1 representing how full the grid is
 */
export function getGridDensity() {
  const layer = getActiveLayer();
  let active = 0;
  let total = 0;

  GRID_LANES.forEach(lane => {
    if (layer.grid[lane]) {
      layer.grid[lane].forEach(step => {
        if (step) active++;
        total++;
      });
    }
  });

  return total > 0 ? active / total : 0;
}

// === PATTERN LANE FUNCTIONS ===

/**
 * Get current pattern index for a pattern lane (active layer)
 * @param {string} lane - Lane name
 * @returns {number} Current pattern index
 */
export function getPatternIndex(lane) {
  return getActiveLayer().patternIndices[lane] || 0;
}

/**
 * Set pattern index for a pattern lane
 * @param {string} lane - Lane name
 * @param {number} index - Pattern index
 * @param {number} [layerId] - Optional layer ID
 */
export function setPatternIndex(lane, index, layerId) {
  const layer = layerId !== undefined
    ? layers.find(l => l.id === layerId)
    : getActiveLayer();

  if (!layer || layer.locked) return;

  const laneConfig = LANES[lane];
  if (!laneConfig || laneConfig.type !== 'pattern') return;

  const patterns = laneConfig.patterns || [];
  if (index >= 0 && index < patterns.length) {
    layer.patternIndices[lane] = index;
  }
}

/**
 * Cycle to next pattern for a pattern lane (active layer)
 * @param {string} lane - Lane name
 * @returns {number} New pattern index
 */
export function cyclePattern(lane) {
  const layer = getActiveLayer();
  if (layer.locked) return getPatternIndex(lane);

  const laneConfig = LANES[lane];
  if (!laneConfig || laneConfig.type !== 'pattern') return 0;

  const patterns = laneConfig.patterns || [];
  if (patterns.length === 0) return 0;

  const currentIndex = layer.patternIndices[lane] || 0;
  const newIndex = (currentIndex + 1) % patterns.length;
  layer.patternIndices[lane] = newIndex;

  // Auto-activate lane when pattern is cycled
  layer.activeLanes[lane] = true;

  return newIndex;
}

/**
 * Get current pattern name for a pattern lane (active layer)
 * @param {string} lane - Lane name
 * @returns {string} Current pattern name
 */
export function getPatternName(lane) {
  const laneConfig = LANES[lane];
  if (!laneConfig || laneConfig.type !== 'pattern') return '';

  const patterns = laneConfig.patterns || [];
  const index = getActiveLayer().patternIndices[lane] || 0;
  return patterns[index] || '';
}

/**
 * Get all pattern indices (active layer)
 * @returns {Object} Pattern indices for all pattern lanes
 */
export function getPatternIndices() {
  return { ...getActiveLayer().patternIndices };
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

  // Collect active lanes from ALL layers (for playback)
  const layerStepInfo = layers.map(layer => {
    const activeGridLanes = [];
    GRID_LANES.forEach(lane => {
      if (layer.grid[lane] && layer.grid[lane][currentStep] && !layer.mutedLanes[lane]) {
        activeGridLanes.push(lane);
      }
    });

    const activePatternLanes = [];
    PATTERN_LANES.forEach(lane => {
      if (layer.activeLanes[lane] && !layer.mutedLanes[lane]) {
        activePatternLanes.push(lane);
      }
    });

    return {
      layerId: layer.id,
      activeGridLanes,
      activePatternLanes,
    };
  });

  // Advance to next step (loop)
  playhead = (playhead + 1) % STEPS_PER_BAR;

  // Build combined step info for backwards compatibility
  const allActiveGridLanes = new Set();
  const allActivePatternLanes = new Set();
  layerStepInfo.forEach(info => {
    info.activeGridLanes.forEach(l => allActiveGridLanes.add(l));
    info.activePatternLanes.forEach(l => allActivePatternLanes.add(l));
  });

  const stepInfo = {
    step: currentStep,
    activeGridLanes: Array.from(allActiveGridLanes),
    activePatternLanes: Array.from(allActivePatternLanes),
    layerStepInfo, // Per-layer info for multi-layer playback
    // Legacy compatibility
    activeLanes: Array.from(allActiveGridLanes),
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

// === LANE STATE FUNCTIONS (operate on active layer) ===

/**
 * Toggle mute state for a lane (active layer)
 * @param {string} lane - Lane name
 * @returns {boolean} New mute state
 */
export function toggleMute(lane) {
  const layer = getActiveLayer();
  if (!layer.mutedLanes.hasOwnProperty(lane)) return false;
  layer.mutedLanes[lane] = !layer.mutedLanes[lane];
  return layer.mutedLanes[lane];
}

/**
 * Set mute state for a lane (active layer)
 * @param {string} lane - Lane name
 * @param {boolean} muted - Mute state
 */
export function setMute(lane, muted) {
  const layer = getActiveLayer();
  if (!layer.mutedLanes.hasOwnProperty(lane)) return;
  layer.mutedLanes[lane] = muted;
}

/**
 * Check if a lane is muted (active layer)
 * @param {string} lane - Lane name
 * @returns {boolean} Mute state
 */
export function isMuted(lane) {
  return getActiveLayer().mutedLanes[lane] || false;
}

/**
 * Get all muted lanes (active layer)
 * @returns {Object} Muted lanes object
 */
export function getMutedLanes() {
  return { ...getActiveLayer().mutedLanes };
}

/**
 * Toggle active state for a lane (especially pattern lanes)
 * @param {string} lane - Lane name
 * @returns {boolean} New active state
 */
export function toggleActive(lane) {
  const layer = getActiveLayer();
  if (layer.locked) return layer.activeLanes[lane] || false;
  if (!layer.activeLanes.hasOwnProperty(lane)) return false;
  layer.activeLanes[lane] = !layer.activeLanes[lane];
  return layer.activeLanes[lane];
}

/**
 * Set active state for a lane
 * @param {string} lane - Lane name
 * @param {boolean} active - Active state
 * @param {number} [layerId] - Optional layer ID
 */
export function setActive(lane, active, layerId) {
  const layer = layerId !== undefined
    ? layers.find(l => l.id === layerId)
    : getActiveLayer();

  if (!layer || layer.locked) return;
  if (!layer.activeLanes.hasOwnProperty(lane)) return;
  layer.activeLanes[lane] = active;
}

/**
 * Check if a lane is active (active layer)
 * @param {string} lane - Lane name
 * @returns {boolean} Active state
 */
export function isActive(lane) {
  return getActiveLayer().activeLanes[lane] || false;
}

/**
 * Get all active lanes (active layer)
 * @returns {Object} Active lanes object
 */
export function getActiveLanes() {
  return { ...getActiveLayer().activeLanes };
}

/**
 * Check if a lane is unlocked (global)
 * @param {string} lane - Lane name
 * @returns {boolean} Unlocked state
 */
export function isUnlocked(lane) {
  return unlockedLanes[lane] || false;
}

/**
 * Get all unlocked lanes (global)
 * @returns {Object} Unlocked lanes object
 */
export function getUnlockedLanes() {
  return { ...unlockedLanes };
}

/**
 * Force unlock a lane (global)
 * @param {string} lane - Lane name
 */
export function unlockLane(lane) {
  if (unlockedLanes.hasOwnProperty(lane)) {
    unlockedLanes[lane] = true;
  }
}

/**
 * Unlock all lanes (global)
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
 * Clear all - reset grid and pattern lanes (active layer only)
 */
export function clearAll() {
  const layer = getActiveLayer();
  if (layer.locked) return;

  // Clear grid lanes
  GRID_LANES.forEach(lane => {
    if (layer.grid[lane]) {
      layer.grid[lane] = new Array(STEPS_PER_BAR).fill(0);
    }
  });

  // Deactivate all pattern lanes
  PATTERN_LANES.forEach(lane => {
    layer.activeLanes[lane] = false;
  });

  // Reset all grid lane active states
  GRID_LANES.forEach(lane => {
    layer.activeLanes[lane] = false;
  });
}

/**
 * Clear all layers and reset to single empty layer
 */
export function clearAllLayers() {
  layers = [createEmptyLayer()];
  activeLayerIndex = 0;
}

// === CLEANUP ===

/**
 * Cleanup sequencer
 */
export function disposeSequencer() {
  layers = [];
  activeLayerIndex = 0;
  nextLayerId = 0;
  playhead = 0;
  stepListeners = [];
  unlockedLanes = {};
  currentCategory = 'drums';
  isInitialized = false;
}
