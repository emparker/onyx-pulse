import { useRef, useEffect, useCallback } from 'react';
import Matter from 'matter-js';
import {
  createPhysicsEngine,
  createMarble,
  createWall,
  onCollision,
  enforceMarbleLimit,
  getMarbles,
  getWalls,
  removeWall,
  setEngineGravity,
} from '../engine/physics.js';
import { MAX_MARBLES, MAX_WALLS, WALL_MIN_LENGTH } from '../engine/constants.js';

/**
 * React hook for managing the Matter.js physics world
 * Physics state lives in refs, not React state (per CLAUDE.md)
 */
export function usePhysicsWorld(width, height, onCollisionCallback) {
  const engineRef = useRef(null);
  const worldRef = useRef(null);
  const boundsRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);

  // Initialize physics engine
  useEffect(() => {
    if (width === 0 || height === 0) return;

    const { engine, world, bounds } = createPhysicsEngine(width, height);
    engineRef.current = engine;
    worldRef.current = world;
    boundsRef.current = bounds;

    // Set up collision listener
    if (onCollisionCallback) {
      onCollision(engine, onCollisionCallback);
    }

    // Physics update loop (in rAF, not React render cycle)
    // Uses fixed time step with substeps for reliable collision detection
    const FIXED_DELTA = 16.667; // 60fps equivalent
    const MAX_SUBSTEPS = 3;

    const update = (time) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
      }

      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      // Cap delta to prevent spiral of death
      const cappedDelta = Math.min(delta, FIXED_DELTA * MAX_SUBSTEPS);

      // Run multiple smaller steps for better collision detection
      const steps = Math.ceil(cappedDelta / FIXED_DELTA);
      const stepDelta = cappedDelta / steps;

      for (let i = 0; i < steps; i++) {
        Matter.Engine.update(engine, stepDelta);
      }

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    // Cleanup
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      Matter.Engine.clear(engine);
      Matter.World.clear(world, false);
    };
  }, [width, height, onCollisionCallback]);

  // Spawn marble at position
  const spawnMarble = useCallback((x, y) => {
    if (!worldRef.current || !boundsRef.current) return;

    const { centerX, centerY, radius } = boundsRef.current;

    // Check if spawn point is inside the circular boundary
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > radius - 20) {
      // Outside boundary, don't spawn
      return;
    }

    const marble = createMarble(x, y);
    Matter.Composite.add(worldRef.current, marble);

    // Enforce marble limit
    enforceMarbleLimit(worldRef.current, MAX_MARBLES);
  }, []);

  // Get current marbles for rendering
  const getMarblesForRender = useCallback(() => {
    if (!worldRef.current) return [];
    return getMarbles(worldRef.current);
  }, []);

  // Get boundary info
  const getBounds = useCallback(() => {
    return boundsRef.current;
  }, []);

  // Add a wall between two points
  const addWall = useCallback((startX, startY, endX, endY) => {
    if (!worldRef.current || !boundsRef.current) return null;

    // Check minimum length
    const length = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
    if (length < WALL_MIN_LENGTH) return null;

    // Check wall limit
    const currentWalls = getWalls(worldRef.current);
    if (currentWalls.length >= MAX_WALLS) {
      // Remove oldest wall
      const oldest = currentWalls[0];
      Matter.Composite.remove(worldRef.current, oldest);
    }

    const wall = createWall(startX, startY, endX, endY);
    Matter.Composite.add(worldRef.current, wall);
    return wall;
  }, []);

  // Remove a specific wall
  const deleteWall = useCallback((wall) => {
    if (!worldRef.current || !wall) return;
    removeWall(worldRef.current, wall);
  }, []);

  // Get all walls for rendering
  const getWallsForRender = useCallback(() => {
    if (!worldRef.current) return [];
    return getWalls(worldRef.current);
  }, []);

  // Find wall at a point (for double-tap to delete)
  const findWallAtPoint = useCallback((x, y) => {
    if (!worldRef.current) return null;

    const walls = getWalls(worldRef.current);
    for (const wall of walls) {
      // Check if point is within wall bounds (with some tolerance)
      const bounds = wall.bounds;
      const tolerance = 15;
      if (
        x >= bounds.min.x - tolerance &&
        x <= bounds.max.x + tolerance &&
        y >= bounds.min.y - tolerance &&
        y <= bounds.max.y + tolerance
      ) {
        // More precise check using Matter.js
        if (Matter.Bounds.contains(wall.bounds, { x, y }) ||
            Matter.Query.point([wall], { x, y }).length > 0) {
          return wall;
        }
        // Fallback: distance to wall center
        const dist = Math.sqrt(
          (wall.position.x - x) ** 2 + (wall.position.y - y) ** 2
        );
        if (dist < 30) return wall;
      }
    }
    return null;
  }, []);

  // Set gravity vector
  const setGravity = useCallback((x, y) => {
    if (!engineRef.current) return;
    setEngineGravity(engineRef.current, x, y);
  }, []);

  return {
    spawnMarble,
    getMarbles: getMarblesForRender,
    getBounds,
    addWall,
    deleteWall,
    getWalls: getWallsForRender,
    findWallAtPoint,
    setGravity,
    isReady: engineRef.current !== null,
  };
}
