import Matter from 'matter-js';
import {
  MARBLE_RADIUS,
  MARBLE_RESTITUTION,
  MARBLE_FRICTION,
  BOUNDARY_SEGMENTS,
  BOUNDARY_THICKNESS,
  SPAWN_VELOCITY_VARIANCE,
  MARBLE_COLORS,
  WALL_PHYSICS_THICKNESS,
  WALL_RESTITUTION,
  COLORS,
} from './constants.js';
import { randomRange } from '../utils/math.js';

const { Engine, World, Bodies, Body, Composite, Events } = Matter;

/**
 * Create a circular boundary using line segments
 * The boundary is approximated with BOUNDARY_SEGMENTS static rectangles
 * Thick for reliable collision detection
 */
function createCircularBoundary(centerX, centerY, radius) {
  const segments = [];
  const segmentCount = BOUNDARY_SEGMENTS;
  const angleStep = (Math.PI * 2) / segmentCount;
  const thickness = BOUNDARY_THICKNESS;

  for (let i = 0; i < segmentCount; i++) {
    const angle = i * angleStep;
    const nextAngle = (i + 1) * angleStep;

    // Midpoint of the arc segment
    const midAngle = (angle + nextAngle) / 2;
    const x = centerX + Math.cos(midAngle) * radius;
    const y = centerY + Math.sin(midAngle) * radius;

    // Length of the segment (chord length)
    const segmentLength = 2 * radius * Math.sin(angleStep / 2) + 2;

    const segment = Bodies.rectangle(x, y, segmentLength, thickness, {
      isStatic: true,
      angle: midAngle + Math.PI / 2,
      label: 'boundary',
      render: {
        fillStyle: '#1a1a2e',
      },
      friction: 0,
      restitution: 1,
    });

    segments.push(segment);
  }

  return segments;
}

/**
 * Create and configure the physics engine
 * Configured to prevent tunneling with increased iterations
 */
export function createPhysicsEngine(width, height) {
  const engine = Engine.create({
    gravity: { x: 0, y: 1 },
    // Increase constraint iterations to prevent tunneling
    positionIterations: 10,  // Default is 6
    velocityIterations: 8,   // Default is 4
  });

  const world = engine.world;

  // Calculate boundary dimensions (circular, centered)
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 30;

  // Create circular boundary
  const boundarySegments = createCircularBoundary(centerX, centerY, radius);
  Composite.add(world, boundarySegments);

  return {
    engine,
    world,
    bounds: { centerX, centerY, radius },
  };
}

/**
 * Create a marble at the specified position
 * Uses new Neon Noir color palette
 */
export function createMarble(x, y) {
  const colorObj = MARBLE_COLORS[Math.floor(Math.random() * MARBLE_COLORS.length)];
  const coreColor = colorObj.core;
  const glowColor = colorObj.glow;

  const marble = Bodies.circle(x, y, MARBLE_RADIUS, {
    restitution: MARBLE_RESTITUTION,
    friction: MARBLE_FRICTION,
    frictionAir: 0.001,
    label: 'marble',
    render: {
      fillStyle: coreColor,
    },
    plugin: {
      color: coreColor,
      glowColor: glowColor,
    },
  });

  // Apply slight random horizontal velocity
  const vx = randomRange(-SPAWN_VELOCITY_VARIANCE, SPAWN_VELOCITY_VARIANCE);
  Body.setVelocity(marble, { x: vx, y: 0 });

  return marble;
}

/**
 * Add collision event listener
 */
export function onCollision(engine, callback) {
  Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
      const { bodyA, bodyB } = pair;

      // Calculate collision velocity magnitude
      const velA = bodyA.velocity || { x: 0, y: 0 };
      const velB = bodyB.velocity || { x: 0, y: 0 };
      const relativeVelocity = {
        x: velA.x - velB.x,
        y: velA.y - velB.y,
      };
      const impactMagnitude = Math.sqrt(
        relativeVelocity.x ** 2 + relativeVelocity.y ** 2
      );

      // Get collision point (average of contact points)
      const contacts = pair.activeContacts || [];
      let contactX = 0;
      let contactY = 0;
      if (contacts.length > 0) {
        contacts.forEach((contact) => {
          contactX += contact.vertex.x;
          contactY += contact.vertex.y;
        });
        contactX /= contacts.length;
        contactY /= contacts.length;
      } else {
        // Fallback to average of body positions
        contactX = (bodyA.position.x + bodyB.position.x) / 2;
        contactY = (bodyA.position.y + bodyB.position.y) / 2;
      }

      callback({
        bodyA,
        bodyB,
        impactMagnitude,
        contactPoint: { x: contactX, y: contactY },
      });
    });
  });
}

/**
 * Remove oldest marbles if over the limit
 */
export function enforceMarbleLimit(world, maxMarbles) {
  const marbles = Composite.allBodies(world).filter(
    (body) => body.label === 'marble'
  );

  while (marbles.length > maxMarbles) {
    const oldest = marbles.shift();
    Composite.remove(world, oldest);
  }
}

/**
 * Get all marbles in the world
 */
export function getMarbles(world) {
  return Composite.allBodies(world).filter((body) => body.label === 'marble');
}

/**
 * Create a wall between two points
 * Physics body is thick for reliable collision, visual rendering is thin
 */
export function createWall(startX, startY, endX, endY) {
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const length = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
  const angle = Math.atan2(endY - startY, endX - startX);

  const wall = Bodies.rectangle(midX, midY, length, WALL_PHYSICS_THICKNESS, {
    isStatic: true,
    angle: angle,
    label: 'wall',
    friction: 0,
    restitution: WALL_RESTITUTION,
    render: {
      fillStyle: COLORS.wall.placed,
    },
    plugin: {
      color: COLORS.wall.placed,
      glowColor: COLORS.wall.glow,
      startPoint: { x: startX, y: startY },
      endPoint: { x: endX, y: endY },
    },
  });

  return wall;
}

/**
 * Get all user walls in the world
 */
export function getWalls(world) {
  return Composite.allBodies(world).filter((body) => body.label === 'wall');
}

/**
 * Remove a specific wall from the world
 */
export function removeWall(world, wall) {
  Composite.remove(world, wall);
}

/**
 * Set the gravity vector on the engine
 */
export function setEngineGravity(engine, x, y) {
  engine.gravity.x = x;
  engine.gravity.y = y;
}
