import { useRef, useEffect, useCallback, useState } from 'react';
import { lerp, clamp } from '../utils/math.js';
import { GRAVITY_STRENGTH, GRAVITY_LERP_FACTOR } from '../engine/constants.js';

/**
 * Hook for accessing device motion/orientation data
 * Provides smoothed gravity vector based on device tilt
 * Falls back gracefully on desktop (no-op)
 */
export function useDeviceMotion() {
  const [isSupported, setIsSupported] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  // Current raw orientation values
  const orientationRef = useRef({ beta: 0, gamma: 0 });
  // Smoothed gravity vector
  const gravityRef = useRef({ x: 0, y: GRAVITY_STRENGTH });
  // Target gravity (before lerp)
  const targetGravityRef = useRef({ x: 0, y: GRAVITY_STRENGTH });

  // Check for device orientation support
  useEffect(() => {
    // Only consider truly supported on mobile devices with the API
    const hasOrientation = 'DeviceOrientationEvent' in window;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // On desktop, DeviceOrientationEvent exists but doesn't work
    const actuallySupported = hasOrientation && isMobile;
    setIsSupported(actuallySupported);

    // iOS 13+ requires permission
    if (actuallySupported && typeof DeviceOrientationEvent.requestPermission === 'function') {
      setNeedsPermission(true);
    } else if (actuallySupported) {
      // Android and older iOS - no permission needed
      setHasPermission(true);
    }
  }, []);

  // Request permission (iOS 13+)
  const requestPermission = useCallback(async () => {
    if (typeof DeviceOrientationEvent.requestPermission !== 'function') {
      setHasPermission(true);
      return true;
    }

    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      const granted = permission === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Failed to request motion permission:', error);
      return false;
    }
  }, []);

  // Handle orientation updates
  useEffect(() => {
    if (!isSupported || !hasPermission) return;

    const handleOrientation = (event) => {
      // beta: front-to-back tilt (-180 to 180)
      // gamma: left-to-right tilt (-90 to 90)
      const beta = event.beta || 0;
      const gamma = event.gamma || 0;

      orientationRef.current = { beta, gamma };

      // Convert orientation to gravity vector
      // gamma controls x-axis (left/right tilt)
      // beta controls y-axis (forward/back tilt)
      // Normalize to -1 to 1 range, then scale by gravity strength
      const normalizedX = clamp(gamma / 45, -1, 1);
      const normalizedY = clamp((beta - 45) / 45, -1, 1);

      targetGravityRef.current = {
        x: normalizedX * GRAVITY_STRENGTH,
        y: normalizedY * GRAVITY_STRENGTH,
      };
    };

    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isSupported, hasPermission]);

  // Get smoothed gravity vector (call this in animation loop)
  const getSmoothedGravity = useCallback(() => {
    // Lerp toward target for smooth transitions
    gravityRef.current = {
      x: lerp(gravityRef.current.x, targetGravityRef.current.x, GRAVITY_LERP_FACTOR),
      y: lerp(gravityRef.current.y, targetGravityRef.current.y, GRAVITY_LERP_FACTOR),
    };

    return gravityRef.current;
  }, []);

  // Reset gravity to default (pointing down)
  const resetGravity = useCallback(() => {
    targetGravityRef.current = { x: 0, y: GRAVITY_STRENGTH };
  }, []);

  return {
    isSupported,
    needsPermission,
    hasPermission,
    requestPermission,
    getSmoothedGravity,
    resetGravity,
    orientation: orientationRef,
  };
}
