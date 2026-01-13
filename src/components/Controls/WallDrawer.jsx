import { useRef, useCallback, useState } from 'react';
import { WALL_VISUAL_THICKNESS, WALL_MIN_LENGTH, COLORS } from '../../engine/constants.js';
import { clampToCircle } from '../../utils/math.js';

/**
 * Hook for wall drawing functionality
 * Manages drawing state and provides canvas rendering
 * @param {Function} addWall - Function to add a wall to the physics world
 * @param {Function} deleteWall - Function to delete a wall
 * @param {Function} findWallAtPoint - Function to find wall at coordinates
 * @param {Object} bounds - Circle bounds { centerX, centerY, radius }
 */
export function useWallDrawer(addWall, deleteWall, findWallAtPoint, bounds) {
  const [isDrawing, setIsDrawing] = useState(false);
  const startPointRef = useRef(null);
  const currentPointRef = useRef(null);
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });

  // Start drawing a wall
  const handleDrawStart = useCallback((x, y) => {
    // Check for double-tap to delete
    const now = Date.now();
    const lastTap = lastTapRef.current;
    const timeDiff = now - lastTap.time;
    const distance = Math.sqrt((x - lastTap.x) ** 2 + (y - lastTap.y) ** 2);

    if (timeDiff < 300 && distance < 30) {
      // Double-tap detected - try to delete wall
      const wall = findWallAtPoint(x, y);
      if (wall) {
        deleteWall(wall);
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        return true; // Consumed by delete
      }
    }

    // Clamp start point to boundary
    const clamped = bounds
      ? clampToCircle(x, y, bounds.centerX, bounds.centerY, bounds.radius)
      : { x, y };

    lastTapRef.current = { time: now, x, y };
    startPointRef.current = clamped;
    currentPointRef.current = clamped;
    setIsDrawing(true);
    return false; // Not consumed, allow other handlers
  }, [findWallAtPoint, deleteWall, bounds]);

  // Update wall preview while drawing
  const handleDrawMove = useCallback((x, y) => {
    if (!isDrawing) return;
    // Clamp point to boundary
    const clamped = bounds
      ? clampToCircle(x, y, bounds.centerX, bounds.centerY, bounds.radius)
      : { x, y };
    currentPointRef.current = clamped;
  }, [isDrawing, bounds]);

  // Finish drawing and create wall
  const handleDrawEnd = useCallback((x, y) => {
    if (!isDrawing || !startPointRef.current) {
      setIsDrawing(false);
      return false;
    }

    // Clamp end point to boundary
    const end = bounds
      ? clampToCircle(x, y, bounds.centerX, bounds.centerY, bounds.radius)
      : { x, y };

    const start = startPointRef.current;
    const length = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);

    // Only create wall if drag distance is significant
    if (length >= WALL_MIN_LENGTH) {
      addWall(start.x, start.y, end.x, end.y);
      setIsDrawing(false);
      startPointRef.current = null;
      currentPointRef.current = null;
      return true; // Wall was created
    }

    setIsDrawing(false);
    startPointRef.current = null;
    currentPointRef.current = null;
    return false; // No wall created (was a tap, not a drag)
  }, [isDrawing, addWall, bounds]);

  // Cancel drawing
  const cancelDraw = useCallback(() => {
    setIsDrawing(false);
    startPointRef.current = null;
    currentPointRef.current = null;
  }, []);

  // Render wall preview on canvas (ghost white)
  const renderPreview = useCallback((ctx) => {
    if (!isDrawing || !startPointRef.current || !currentPointRef.current) return;

    const start = startPointRef.current;
    const current = currentPointRef.current;
    const length = Math.sqrt(
      (current.x - start.x) ** 2 + (current.y - start.y) ** 2
    );

    // Determine if wall is long enough
    const isValid = length >= WALL_MIN_LENGTH;
    const alpha = isValid ? COLORS.wall.previewOpacity : COLORS.wall.previewOpacity * 0.5;

    ctx.save();

    // Ghost white preview
    ctx.strokeStyle = COLORS.wall.preview;
    ctx.lineWidth = WALL_VISUAL_THICKNESS;
    ctx.lineCap = 'round';
    ctx.globalAlpha = alpha;
    ctx.shadowColor = COLORS.wall.preview;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();

    ctx.restore();
  }, [isDrawing]);

  return {
    isDrawing,
    handleDrawStart,
    handleDrawMove,
    handleDrawEnd,
    cancelDraw,
    renderPreview,
    startPoint: startPointRef,
    currentPoint: currentPointRef,
  };
}

/**
 * Render existing walls on canvas
 * Steel blue with subtle glow - structural, cold, force field aesthetic
 */
export function renderWalls(ctx, walls) {
  if (!walls || walls.length === 0) return;

  ctx.save();

  walls.forEach((wall) => {
    const { startPoint, endPoint } = wall.plugin || {};
    if (!startPoint || !endPoint) return;

    // Outer glow layer
    ctx.strokeStyle = COLORS.wall.glow;
    ctx.lineWidth = WALL_VISUAL_THICKNESS + 6;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.stroke();

    // Main wall line (steel blue)
    ctx.strokeStyle = COLORS.wall.placed;
    ctx.lineWidth = WALL_VISUAL_THICKNESS;
    ctx.globalAlpha = 1;
    ctx.shadowColor = COLORS.wall.glow;
    ctx.shadowBlur = 6;

    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.stroke();

    // End caps
    ctx.fillStyle = COLORS.wall.placed;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(startPoint.x, startPoint.y, WALL_VISUAL_THICKNESS / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(endPoint.x, endPoint.y, WALL_VISUAL_THICKNESS / 2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}
