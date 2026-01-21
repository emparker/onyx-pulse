import { useState, useRef, useCallback, useEffect } from 'react';
import {
  startRecording as startAudioRecording,
  stopRecording as stopAudioRecording,
  clearRecording,
  downloadRecording,
} from '../engine/audio.js';
import { RECORDING, RECORDING_STATE } from '../engine/constants.js';

/**
 * React hook for managing recording state and UI
 * Handles recording lifecycle, timer, and download
 */
export function useRecording() {
  const [recordingState, setRecordingState] = useState(RECORDING_STATE.IDLE);
  const [remainingTime, setRemainingTime] = useState(RECORDING.maxDurationMs);
  const [recordingBlob, setRecordingBlob] = useState(null);

  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const autoStopTimeoutRef = useRef(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
      }
    };
  }, []);

  // Start recording
  const startRecording = useCallback(() => {
    if (recordingState !== RECORDING_STATE.IDLE) {
      console.warn('Cannot start recording: not in idle state');
      return false;
    }

    const success = startAudioRecording();
    if (!success) return false;

    setRecordingState(RECORDING_STATE.RECORDING);
    setRemainingTime(RECORDING.maxDurationMs);
    setRecordingBlob(null);
    startTimeRef.current = Date.now();

    // Start countdown timer (updates every 100ms for smooth display)
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, RECORDING.maxDurationMs - elapsed);
      setRemainingTime(remaining);
    }, 100);

    // Auto-stop at max duration (accounting for fade-out time)
    const autoStopDelay = RECORDING.maxDurationMs - RECORDING.fadeOutDurationMs;
    autoStopTimeoutRef.current = setTimeout(() => {
      stopRecording(true); // Auto-stop with fade
    }, autoStopDelay);

    return true;
  }, [recordingState]);

  // Stop recording
  const stopRecording = useCallback(async (autoFade = false) => {
    if (recordingState !== RECORDING_STATE.RECORDING) {
      console.warn('Cannot stop recording: not recording');
      return null;
    }

    // Clear timers
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }

    // Check if we should fade (auto-stop at limit always fades)
    const shouldFade = autoFade || remainingTime <= RECORDING.warningThresholdMs;

    setRecordingState(RECORDING_STATE.ENDING);

    // Stop audio recording (with optional fade)
    const blob = await stopAudioRecording(shouldFade);

    if (blob) {
      setRecordingBlob(blob);
      setRecordingState(RECORDING_STATE.COMPLETE);
    } else {
      // Recording failed, reset to idle
      setRecordingState(RECORDING_STATE.IDLE);
    }

    return blob;
  }, [recordingState, remainingTime]);

  // Toggle recording (for single button control)
  const toggleRecording = useCallback(async () => {
    if (recordingState === RECORDING_STATE.IDLE) {
      return startRecording();
    } else if (recordingState === RECORDING_STATE.RECORDING) {
      return await stopRecording(false); // Manual stop, no auto-fade unless near end
    }
    return null;
  }, [recordingState, startRecording, stopRecording]);

  // RE-DO: discard recording and return to idle
  const redoRecording = useCallback(() => {
    clearRecording();
    setRecordingBlob(null);
    setRecordingState(RECORDING_STATE.IDLE);
    setRemainingTime(RECORDING.maxDurationMs);
  }, []);

  // DOWNLOAD: save the recording
  const download = useCallback(() => {
    if (recordingBlob) {
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadRecording(`onyx-pulse-${timestamp}.webm`);
    }
  }, [recordingBlob]);

  // Format remaining time for display (e.g., "0:45")
  const formatTime = useCallback((ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Check if in warning zone (last 10 seconds)
  const isInWarningZone = remainingTime <= RECORDING.warningThresholdMs &&
                          recordingState === RECORDING_STATE.RECORDING;

  return {
    // State
    recordingState,
    remainingTime,
    remainingTimeFormatted: formatTime(remainingTime),
    isRecording: recordingState === RECORDING_STATE.RECORDING,
    isEnding: recordingState === RECORDING_STATE.ENDING,
    isComplete: recordingState === RECORDING_STATE.COMPLETE,
    isIdle: recordingState === RECORDING_STATE.IDLE,
    isInWarningZone,
    hasRecording: !!recordingBlob,

    // Actions
    startRecording,
    stopRecording,
    toggleRecording,
    redoRecording,
    download,
  };
}
