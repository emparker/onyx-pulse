import { useRef, useCallback } from 'react';

/**
 * GlowBurst - Manages collision ripple effects
 * Creates expanding rings that fade out at collision points
 */

const MAX_RIPPLES = 20;
const RIPPLE_DURATION = 500; // ms
const RIPPLE_MAX_RADIUS = 60;

/**
 * Hook to manage collision ripple effects
 */
export function useGlowBurst() {
  const ripplesRef = useRef([]);

  // Add a new ripple at the collision point
  const addRipple = useCallback((x, y, color, intensity = 1) => {
    const ripple = {
      x,
      y,
      color,
      intensity: Math.min(intensity, 1),
      startTime: performance.now(),
      id: Math.random(),
    };

    ripplesRef.current.push(ripple);

    // Enforce ripple limit
    if (ripplesRef.current.length > MAX_RIPPLES) {
      ripplesRef.current.shift();
    }
  }, []);

  // Render all active ripples to canvas context
  const renderRipples = useCallback((ctx) => {
    const now = performance.now();
    const activeRipples = [];

    ripplesRef.current.forEach((ripple) => {
      const elapsed = now - ripple.startTime;
      const progress = elapsed / RIPPLE_DURATION;

      if (progress >= 1) return; // Ripple has finished

      activeRipples.push(ripple);

      // Eased progress for smoother animation
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      // Current radius expands over time
      const radius = easedProgress * RIPPLE_MAX_RADIUS * ripple.intensity;

      // Alpha fades out (starts strong, ends at 0)
      const alpha = (1 - easedProgress) * 0.7 * ripple.intensity;

      // Draw ripple ring
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // Outer glow ring
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = ripple.color;
      ctx.lineWidth = 3 * (1 - easedProgress) + 1;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = ripple.color;
      ctx.shadowBlur = 15 * (1 - easedProgress);
      ctx.stroke();

      // Inner brighter ring
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = alpha * 0.5;
      ctx.shadowBlur = 0;
      ctx.stroke();

      ctx.restore();
    });

    // Update refs with only active ripples
    ripplesRef.current = activeRipples;
  }, []);

  // Clear all ripples
  const clearRipples = useCallback(() => {
    ripplesRef.current = [];
  }, []);

  return {
    addRipple,
    renderRipples,
    clearRipples,
  };
}
