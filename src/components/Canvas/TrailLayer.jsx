import { useRef, useCallback } from 'react';
import { TRAIL_DECAY, MARBLE_RADIUS, COLORS } from '../../engine/constants.js';

/**
 * TrailLayer - Manages marble trail effects
 * Tracks marble positions and renders fading trails with exponential decay
 * Ghostly echoes of movement - motion memory
 *
 * OPTIMIZED: Uses circular buffer pattern to avoid O(n) shift operations
 */

const MAX_TRAIL_LENGTH = 12; // Reduced from 18 for performance
const MIN_DISTANCE_FOR_TRAIL = 3; // Increased from 2 to reduce point count

/**
 * Hook to manage marble trail effects
 */
export function useTrailLayer() {
  // Map of marble id -> trail data with circular buffer
  const trailsRef = useRef(new Map());

  // Update trails with current marble positions
  const updateTrails = useCallback((marbles) => {
    const currentIds = new Set();
    const len = marbles.length;

    for (let m = 0; m < len; m++) {
      const marble = marbles[m];
      const id = marble.id;
      currentIds.add(id);

      const { x, y } = marble.position;
      const color = marble.plugin?.color || '#00ffff';

      let trailData = trailsRef.current.get(id);
      if (!trailData) {
        // New marble - initialize with circular buffer
        trailData = {
          points: new Array(MAX_TRAIL_LENGTH),
          head: 0,  // Next write position
          count: 0, // Number of valid points
          color,
        };
        trailsRef.current.set(id, trailData);
      }

      // Get last added point
      const lastIdx = (trailData.head - 1 + MAX_TRAIL_LENGTH) % MAX_TRAIL_LENGTH;
      const lastPoint = trailData.count > 0 ? trailData.points[lastIdx] : null;

      // Only add point if marble has moved enough
      if (!lastPoint ||
          Math.abs(lastPoint.x - x) > MIN_DISTANCE_FOR_TRAIL ||
          Math.abs(lastPoint.y - y) > MIN_DISTANCE_FOR_TRAIL) {

        // Write to circular buffer
        trailData.points[trailData.head] = { x, y, alpha: 1 };
        trailData.head = (trailData.head + 1) % MAX_TRAIL_LENGTH;
        if (trailData.count < MAX_TRAIL_LENGTH) trailData.count++;
      }

      // Update color (in case marble color changed)
      trailData.color = color;

      // Apply decay to all points in buffer
      for (let i = 0; i < trailData.count; i++) {
        const idx = (trailData.head - 1 - i + MAX_TRAIL_LENGTH * 2) % MAX_TRAIL_LENGTH;
        trailData.points[idx].alpha *= TRAIL_DECAY;
      }
    }

    // Remove trails for marbles that no longer exist
    for (const id of trailsRef.current.keys()) {
      if (!currentIds.has(id)) {
        trailsRef.current.delete(id);
      }
    }
  }, []);

  // Render all trails to canvas context
  const renderTrails = useCallback((ctx) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 0; // Disable shadow for trails (performance)

    trailsRef.current.forEach((trailData) => {
      if (trailData.count < 2) return;

      const { points, head, count, color } = trailData;
      ctx.fillStyle = color;

      // Draw trail points (oldest to newest)
      for (let i = count - 1; i >= 1; i--) {
        const idx = (head - 1 - i + MAX_TRAIL_LENGTH * 2) % MAX_TRAIL_LENGTH;
        const point = points[idx];

        if (point.alpha < 0.02) continue;

        // Progress through the trail (0 = oldest, 1 = newest)
        const progress = (count - 1 - i) / count;

        // Size decreases along the trail
        const sizeProgress = 0.5 + progress * 0.5;
        const radius = MARBLE_RADIUS * 0.4 * sizeProgress * point.alpha;

        if (radius < 0.5) continue;

        // Simplified opacity calculation
        const targetOpacity = progress > 0.6 ? COLORS.trail.opacityFresh :
                             progress > 0.3 ? COLORS.trail.opacityMid :
                             COLORS.trail.opacityOld;

        ctx.globalAlpha = targetOpacity * point.alpha;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  }, []);

  // Clear all trails
  const clearTrails = useCallback(() => {
    trailsRef.current.clear();
  }, []);

  return {
    updateTrails,
    renderTrails,
    clearTrails,
  };
}
