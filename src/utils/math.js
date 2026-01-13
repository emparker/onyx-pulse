/**
 * Clamp a value between min and max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between a and b
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Map a value from one range to another
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/**
 * Get a random number between min and max
 */
export function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Clamp a point to stay within a circle
 * If the point is outside the circle, project it onto the circle's edge
 */
export function clampToCircle(x, y, centerX, centerY, radius) {
  const dx = x - centerX;
  const dy = y - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance <= radius) {
    return { x, y };
  }

  // Project point onto circle edge
  const scale = radius / distance;
  return {
    x: centerX + dx * scale,
    y: centerY + dy * scale,
  };
}
