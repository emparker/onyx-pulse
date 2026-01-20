// Performance utilities for mobile optimization

/**
 * Detect if running on a mobile device
 */
export function isMobileDevice() {
  if (typeof window === 'undefined') return false;

  // Check for touch capability + small screen (most reliable combo)
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;

  // Also check user agent for mobile keywords
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  return (hasTouch && isSmallScreen) || mobileUA;
}

/**
 * Detect if device is likely low-powered
 * (older phones, budget devices)
 */
export function isLowPowerDevice() {
  if (typeof window === 'undefined') return false;

  // Check hardware concurrency (CPU cores)
  const lowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;

  // Check device memory if available (Chrome only)
  const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 4;

  // Mobile + low specs = low power
  return isMobileDevice() && (lowCores || lowMemory);
}

/**
 * Performance settings based on device capability
 */
export function getPerformanceSettings() {
  const mobile = isMobileDevice();
  const lowPower = isLowPowerDevice();

  if (lowPower) {
    // Minimal effects for low-power devices
    return {
      shadowBlur: 0,
      glowEnabled: false,
      breathingEnabled: false,
      maxRipples: 3,
      maxTrailLength: 3,
      gradientQuality: 'none', // Use solid colors
      reduceMotion: true,
    };
  }

  if (mobile) {
    // Reduced effects for mobile
    return {
      shadowBlur: 2,
      glowEnabled: true,
      breathingEnabled: true,
      maxRipples: 5,
      maxTrailLength: 4,
      gradientQuality: 'simple', // Fewer gradient stops
      reduceMotion: false,
    };
  }

  // Full effects for desktop
  return {
    shadowBlur: 8,
    glowEnabled: true,
    breathingEnabled: true,
    maxRipples: 10,
    maxTrailLength: 8,
    gradientQuality: 'full',
    reduceMotion: false,
  };
}

/**
 * Singleton performance settings (cached on first call)
 */
let cachedSettings = null;

export function getPerfSettings() {
  if (!cachedSettings) {
    cachedSettings = getPerformanceSettings();
  }
  return cachedSettings;
}

/**
 * Reset cached settings (useful if window resizes significantly)
 */
export function resetPerfSettings() {
  cachedSettings = null;
}
