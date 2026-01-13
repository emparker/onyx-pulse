import { useRef, useCallback } from 'react';
import { TRAIL_DECAY, MARBLE_RADIUS, COLORS } from '../../engine/constants.js';

/**
 * TrailLayer - Manages marble trail effects
 * Tracks marble positions and renders fading trails with exponential decay
 * Ghostly echoes of movement - motion memory
 */

const MAX_TRAIL_LENGTH = 18;
const MIN_DISTANCE_FOR_TRAIL = 2; // Minimum movement to add trail point

/**
 * Hook to manage marble trail effects
 */
export function useTrailLayer() {
  // Map of marble id -> array of trail points
  const trailsRef = useRef(new Map());

  // Update trails with current marble positions
  const updateTrails = useCallback((marbles) => {
    const currentIds = new Set();

    marbles.forEach((marble) => {
      const id = marble.id;
      currentIds.add(id);

      const { x, y } = marble.position;
      const color = marble.plugin?.color || '#00ffff';

      if (!trailsRef.current.has(id)) {
        // New marble, initialize trail
        trailsRef.current.set(id, []);
      }

      const trail = trailsRef.current.get(id);
      const lastPoint = trail[trail.length - 1];

      // Only add point if marble has moved enough
      if (!lastPoint ||
          Math.abs(lastPoint.x - x) > MIN_DISTANCE_FOR_TRAIL ||
          Math.abs(lastPoint.y - y) > MIN_DISTANCE_FOR_TRAIL) {
        trail.push({
          x,
          y,
          color,
          alpha: 1,
        });

        // Limit trail length
        if (trail.length > MAX_TRAIL_LENGTH) {
          trail.shift();
        }
      }
    });

    // Remove trails for marbles that no longer exist
    for (const id of trailsRef.current.keys()) {
      if (!currentIds.has(id)) {
        trailsRef.current.delete(id);
      }
    }

    // Apply decay to all trail points
    trailsRef.current.forEach((trail) => {
      trail.forEach((point) => {
        point.alpha *= TRAIL_DECAY;
      });

      // Remove fully faded points
      while (trail.length > 0 && trail[0].alpha < 0.02) {
        trail.shift();
      }
    });
  }, []);

  // Render all trails to canvas context
  const renderTrails = useCallback((ctx) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    trailsRef.current.forEach((trail) => {
      if (trail.length < 2) return;

      // Draw trail as connected segments with decreasing size and alpha
      for (let i = 0; i < trail.length - 1; i++) {
        const point = trail[i];

        // Progress through the trail (0 = oldest, 1 = newest)
        const progress = i / trail.length;

        // Size decreases along the trail (older = smaller)
        const sizeProgress = 0.5 + progress * 0.5; // 50% to 100%
        const radius = MARBLE_RADIUS * 0.5 * sizeProgress * point.alpha;

        if (radius < 0.5) continue;

        // Calculate opacity based on age (using design system values)
        let targetOpacity;
        if (progress > 0.7) {
          targetOpacity = COLORS.trail.opacityFresh;
        } else if (progress > 0.3) {
          targetOpacity = COLORS.trail.opacityMid;
        } else {
          targetOpacity = COLORS.trail.opacityOld;
        }

        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = point.color;
        ctx.globalAlpha = targetOpacity * point.alpha;
        ctx.shadowColor = point.color;
        ctx.shadowBlur = 6 * point.alpha;
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
