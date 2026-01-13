import { useRef, useEffect, useCallback, useState } from 'react';
import { usePhysicsWorld } from '../../hooks/usePhysicsWorld.js';
import { useAudioEngine } from '../../hooks/useAudioEngine.js';
import { useGlowBurst } from './GlowBurst.jsx';
import { useTrailLayer } from './TrailLayer.jsx';
import { useWallDrawer, renderWalls } from '../Controls/WallDrawer.jsx';
import { useGravityController } from '../Controls/GravityController.jsx';
import {
  MARBLE_RADIUS,
  GLOW_BLUR,
  COLORS,
} from '../../engine/constants.js';

export function PhysicsCanvas() {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Audio engine hook
  const { ensureAudioReady, triggerCollisionSound } = useAudioEngine();

  // Visual effects hooks
  const { addRipple, renderRipples } = useGlowBurst();
  const { updateTrails, renderTrails } = useTrailLayer();

  // Handle collision events - trigger audio and visual effects
  const handleCollision = useCallback((collision) => {
    const { impactMagnitude, contactPoint, bodyA, bodyB } = collision;

    // Trigger sound for meaningful collisions
    if (impactMagnitude > 0.5) {
      triggerCollisionSound(impactMagnitude);

      // Determine collision type and burst color
      const isMarbleA = bodyA.label === 'marble';
      const isMarbleB = bodyB.label === 'marble';
      const isBoundary = bodyA.label === 'boundary' || bodyB.label === 'boundary';
      const isWall = bodyA.label === 'wall' || bodyB.label === 'wall';

      let burstColor;
      if (isBoundary) {
        // Marble ↔ Boundary: cyan flash
        burstColor = COLORS.burst.boundary;
      } else if (isWall) {
        // Marble ↔ Wall: white flash
        burstColor = COLORS.burst.wall;
      } else if (isMarbleA && isMarbleB) {
        // Marble ↔ Marble: blend of both colors
        const colorA = bodyA.plugin?.color || '#00ffff';
        const colorB = bodyB.plugin?.color || '#00ffff';
        burstColor = colorA; // Use first marble's color for now
      } else {
        burstColor = COLORS.burst.core;
      }

      // Add ripple effect at collision point
      const intensity = Math.min(impactMagnitude / 10, 1);
      addRipple(contactPoint.x, contactPoint.y, burstColor, intensity);
    }
  }, [triggerCollisionSound, addRipple]);

  const {
    spawnMarble,
    getMarbles,
    getBounds,
    addWall,
    deleteWall,
    getWalls,
    findWallAtPoint,
    setGravity,
  } = usePhysicsWorld(dimensions.width, dimensions.height, handleCollision);

  // Wall drawing hook - pass bounds to constrain walls inside the circle
  const bounds = getBounds();
  const {
    isDrawing,
    handleDrawStart,
    handleDrawMove,
    handleDrawEnd,
    renderPreview,
  } = useWallDrawer(addWall, deleteWall, findWallAtPoint, bounds);

  // Gravity controller (device motion + desktop fallback)
  useGravityController(setGravity);

  // Track if pointer moved significantly (to distinguish tap from drag)
  const pointerStartRef = useRef(null);

  // Set canvas dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    let animationId;

    const render = () => {
      // Clear canvas with deep space color
      ctx.fillStyle = COLORS.background.mid;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Draw the Void - multi-layer gradient background
      const bounds = getBounds();
      if (bounds) {
        // Outer atmosphere gradient (full canvas)
        const outerGradient = ctx.createRadialGradient(
          bounds.centerX,
          bounds.centerY,
          bounds.radius * 0.5,
          bounds.centerX,
          bounds.centerY,
          bounds.radius * 1.5
        );
        outerGradient.addColorStop(0, COLORS.background.mid);
        outerGradient.addColorStop(0.7, COLORS.background.edge);
        outerGradient.addColorStop(1, COLORS.background.atmosphere);
        ctx.fillStyle = outerGradient;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        // Inner abyss gradient (center vignette)
        const innerGradient = ctx.createRadialGradient(
          bounds.centerX,
          bounds.centerY,
          0,
          bounds.centerX,
          bounds.centerY,
          bounds.radius * 0.8
        );
        innerGradient.addColorStop(0, COLORS.background.core);
        innerGradient.addColorStop(0.5, COLORS.background.mid);
        innerGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = innerGradient;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        // Draw boundary containment field (cyan glow)
        ctx.save();
        ctx.strokeStyle = COLORS.boundary.idle;
        ctx.lineWidth = 3;
        ctx.shadowColor = COLORS.boundary.idle;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(bounds.centerX, bounds.centerY, bounds.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Get current marbles
      const marbles = getMarbles();

      // Update and render trails (behind marbles)
      updateTrails(marbles);
      renderTrails(ctx);

      // Draw marbles with glow effect
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      marbles.forEach((marble) => {
        const { x, y } = marble.position;
        const coreColor = marble.plugin?.color || '#00ffff';
        const glowColor = marble.plugin?.glowColor || coreColor;

        // Outer glow aura
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = GLOW_BLUR;

        // Draw marble body
        ctx.beginPath();
        ctx.arc(x, y, MARBLE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = coreColor;
        ctx.fill();

        // Inner bright core
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(x, y, MARBLE_RADIUS * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
      });

      ctx.restore();

      // Render collision ripples (on top of marbles)
      renderRipples(ctx);

      // Render user walls
      const walls = getWalls();
      renderWalls(ctx, walls);

      // Render wall preview if drawing
      renderPreview(ctx);

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationId);
  }, [dimensions, getMarbles, getBounds, getWalls, updateTrails, renderTrails, renderRipples, renderPreview]);

  // Handle pointer down - start potential wall draw or marble spawn
  const handlePointerDown = useCallback(
    async (event) => {
      event.preventDefault();

      // Initialize audio on first user gesture (required by browser policies)
      await ensureAudioReady();

      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      pointerStartRef.current = { x, y, time: Date.now() };

      // Start wall drawing (also handles double-tap detection for delete)
      const wasDeleted = handleDrawStart(x, y);
      if (wasDeleted) {
        pointerStartRef.current = null;
      }
    },
    [ensureAudioReady, handleDrawStart]
  );

  // Handle pointer move - update wall preview
  const handlePointerMove = useCallback(
    (event) => {
      if (!pointerStartRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      handleDrawMove(x, y);
    },
    [handleDrawMove]
  );

  // Handle pointer up - create wall or spawn marble
  const handlePointerUp = useCallback(
    (event) => {
      if (!pointerStartRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const start = pointerStartRef.current;
      const distance = Math.sqrt((x - start.x) ** 2 + (y - start.y) ** 2);
      const duration = Date.now() - start.time;

      // Try to finish wall drawing
      const wallCreated = handleDrawEnd(x, y);

      // If no wall was created and it was a short tap, spawn marble
      if (!wallCreated && distance < 20 && duration < 300) {
        spawnMarble(start.x, start.y);
      }

      pointerStartRef.current = null;
    },
    [handleDrawEnd, spawnMarble]
  );

  // Handle pointer cancel/leave
  const handlePointerCancel = useCallback(() => {
    pointerStartRef.current = null;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      style={{ display: 'block', touchAction: 'none' }}
    />
  );
}
