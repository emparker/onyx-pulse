import { useEffect, useCallback, useRef } from 'react';
import { useDeviceMotion } from '../../hooks/useDeviceMotion.js';

/**
 * Hook for controlling gravity based on device orientation
 * Includes mouse/keyboard fallback for desktop
 */
export function useGravityController(setGravity) {
  const {
    isSupported,
    needsPermission,
    hasPermission,
    requestPermission,
    getSmoothedGravity,
  } = useDeviceMotion();

  const mouseGravityRef = useRef({ x: 0, y: 1 });
  const isMouseControlRef = useRef(false);
  const rafRef = useRef(null);

  // Request permission handler (for iOS)
  const enableMotionControl = useCallback(async () => {
    if (needsPermission && !hasPermission) {
      return await requestPermission();
    }
    return hasPermission;
  }, [needsPermission, hasPermission, requestPermission]);

  // Mouse-based gravity control for desktop
  const handleMouseMove = useCallback((event) => {
    if (!isMouseControlRef.current) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const deltaX = (event.clientX - centerX) / centerX;
    const deltaY = (event.clientY - centerY) / centerY;

    mouseGravityRef.current = {
      x: deltaX * 0.5,
      y: 0.5 + deltaY * 0.5,
    };
  }, []);

  // Keyboard controls for desktop testing
  const handleKeyDown = useCallback((event) => {
    const strength = 0.3;
    switch (event.key) {
      case 'ArrowLeft':
        mouseGravityRef.current.x = -strength;
        isMouseControlRef.current = true;
        break;
      case 'ArrowRight':
        mouseGravityRef.current.x = strength;
        isMouseControlRef.current = true;
        break;
      case 'ArrowUp':
        mouseGravityRef.current.y = -strength;
        isMouseControlRef.current = true;
        break;
      case 'ArrowDown':
        mouseGravityRef.current.y = strength;
        isMouseControlRef.current = true;
        break;
    }
  }, []);

  const handleKeyUp = useCallback((event) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      // Reset to default gravity
      mouseGravityRef.current = { x: 0, y: 1 };
    }
  }, []);

  // Enable mouse control on right-click
  const handleContextMenu = useCallback((event) => {
    event.preventDefault();
    isMouseControlRef.current = !isMouseControlRef.current;
  }, []);

  // Set up event listeners for desktop fallback
  useEffect(() => {
    if (isSupported && hasPermission) return; // Device motion available

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isSupported, hasPermission, handleMouseMove, handleKeyDown, handleKeyUp, handleContextMenu]);

  // Update gravity in animation frame
  const updateGravity = useCallback(() => {
    let gravity;

    if (isSupported && hasPermission) {
      // Use device motion
      gravity = getSmoothedGravity();
    } else if (isMouseControlRef.current) {
      // Use mouse-based control
      gravity = mouseGravityRef.current;
    } else {
      // Default gravity
      gravity = { x: 0, y: 1 };
    }

    setGravity(gravity.x, gravity.y);
  }, [isSupported, hasPermission, getSmoothedGravity, setGravity]);

  // Start gravity update loop
  useEffect(() => {
    const loop = () => {
      updateGravity();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [updateGravity]);

  return {
    isMotionSupported: isSupported,
    needsPermission,
    hasPermission,
    enableMotionControl,
    isMouseControl: isMouseControlRef.current,
  };
}
