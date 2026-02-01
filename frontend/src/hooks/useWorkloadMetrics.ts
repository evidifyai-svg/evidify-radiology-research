/**
 * useWorkloadMetrics.ts
 *
 * React hook for tracking radiologist workload metrics in real-time
 * Implements Dr. Stephen Macknik's research on fatigue and performance degradation
 *
 * Usage:
 * const { metrics, recordCaseCompleted, shouldShowAdvisory } = useWorkloadMetrics({
 *   sessionId: 'session-123',
 *   eventLogger: myEventLogger,
 * });
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  WorkloadMetrics,
  MacknikStatus,
  WorkloadThresholds,
  SessionWorkloadSummaryPayload,
  UseWorkloadMetricsReturn,
} from '../types/workloadTypes';
import { DEFAULT_WORKLOAD_THRESHOLDS } from '../types/workloadTypes';

// ============================================================================
// HOOK OPTIONS
// ============================================================================

interface UseWorkloadMetricsOptions {
  /** Session identifier */
  sessionId: string;
  /** Optional custom thresholds */
  thresholds?: Partial<WorkloadThresholds>;
  /** Callback when status changes */
  onStatusChange?: (previousStatus: MacknikStatus, newStatus: MacknikStatus, metrics: WorkloadMetrics) => void;
  /** Callback when advisory should be shown */
  onAdvisoryShouldShow?: (metrics: WorkloadMetrics) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate Macknik status based on cases per hour
 */
function calculateMacknikStatus(casesPerHour: number, thresholds: WorkloadThresholds): MacknikStatus {
  if (casesPerHour >= thresholds.casesPerHourRed) {
    return 'RED';
  }
  if (casesPerHour >= thresholds.casesPerHourYellow) {
    return 'YELLOW';
  }
  return 'GREEN';
}

/**
 * Calculate fatigue index (0-100) based on session metrics
 * Factors: time in session, cases completed, rate of work
 */
function calculateFatigueIndex(
  sessionMinutes: number,
  casesCompleted: number,
  casesPerHour: number,
  thresholds: WorkloadThresholds
): number {
  // Time factor: 0-40 points based on session duration
  const timeFactor = Math.min((sessionMinutes / thresholds.maxSessionMinutes) * 40, 40);

  // Case count factor: 0-30 points based on total cases
  const caseFactor = Math.min((casesCompleted / thresholds.maxSessionCases) * 30, 30);

  // Rate factor: 0-30 points based on current pace
  const rateFactor = Math.min((casesPerHour / thresholds.casesPerHourRed) * 30, 30);

  return Math.round(timeFactor + caseFactor + rateFactor);
}

/**
 * Calculate current cases per hour based on session duration and completed cases
 */
function calculateCasesPerHour(casesCompleted: number, sessionDurationMs: number): number {
  if (sessionDurationMs <= 0 || casesCompleted === 0) {
    return 0;
  }
  const hoursElapsed = sessionDurationMs / (1000 * 60 * 60);
  return Math.round((casesCompleted / hoursElapsed) * 10) / 10;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useWorkloadMetrics(options: UseWorkloadMetricsOptions): UseWorkloadMetricsReturn {
  const { sessionId, thresholds: customThresholds, onStatusChange, onAdvisoryShouldShow } = options;

  // Merge custom thresholds with defaults
  const thresholds: WorkloadThresholds = {
    ...DEFAULT_WORKLOAD_THRESHOLDS,
    ...customThresholds,
  };

  // Session start time (immutable after initialization)
  const sessionStartTime = useRef<Date>(new Date());
  const sessionStartIso = useRef<string>(sessionStartTime.current.toISOString());

  // Core state
  const [casesCompleted, setCasesCompleted] = useState<number>(0);
  const [previousStatus, setPreviousStatus] = useState<MacknikStatus>('GREEN');

  // Advisory tracking
  const advisoryShownRef = useRef<boolean>(false);
  const lastAdvisoryTimeRef = useRef<number>(0);
  const advisoryCountRef = useRef<number>(0);

  // Threshold crossing tracking
  const thresholdCrossingsRef = useRef<{
    yellowCrossings: number;
    redCrossings: number;
    timeInYellowMs: number;
    timeInRedMs: number;
    lastStatusChangeTime: number;
    lastStatus: MacknikStatus;
  }>({
    yellowCrossings: 0,
    redCrossings: 0,
    timeInYellowMs: 0,
    timeInRedMs: 0,
    lastStatusChangeTime: Date.now(),
    lastStatus: 'GREEN',
  });

  // Peak values tracking
  const peakCasesPerHourRef = useRef<number>(0);
  const peakFatigueIndexRef = useRef<number>(0);

  // Advisory response tracking
  const advisoryResponsesRef = useRef<{ continued: number; tookBreak: number }>({
    continued: 0,
    tookBreak: 0,
  });

  /**
   * Compute current metrics
   */
  const computeMetrics = useCallback((): WorkloadMetrics => {
    const now = Date.now();
    const sessionDurationMs = now - sessionStartTime.current.getTime();
    const sessionMinutes = sessionDurationMs / (1000 * 60);

    const casesPerHour = calculateCasesPerHour(casesCompleted, sessionDurationMs);
    const averageTimePerCaseMs = casesCompleted > 0 ? sessionDurationMs / casesCompleted : 0;
    const macknikStatus = calculateMacknikStatus(casesPerHour, thresholds);
    const fatigueIndex = calculateFatigueIndex(sessionMinutes, casesCompleted, casesPerHour, thresholds);

    // Track peak values
    if (casesPerHour > peakCasesPerHourRef.current) {
      peakCasesPerHourRef.current = casesPerHour;
    }
    if (fatigueIndex > peakFatigueIndexRef.current) {
      peakFatigueIndexRef.current = fatigueIndex;
    }

    return {
      sessionId,
      sessionStartTime: sessionStartIso.current,
      casesCompleted,
      totalReadingTimeMs: sessionDurationMs,
      averageTimePerCaseMs: Math.round(averageTimePerCaseMs),
      casesPerHour,
      macknikStatus,
      fatigueIndex,
      thresholds,
    };
  }, [sessionId, casesCompleted, thresholds]);

  /**
   * Current metrics (computed on each render for real-time display)
   */
  const [metrics, setMetrics] = useState<WorkloadMetrics>(() => computeMetrics());

  // Update metrics periodically for real-time display
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(computeMetrics());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [computeMetrics]);

  /**
   * Update threshold crossing tracking
   */
  const updateThresholdTracking = useCallback((newStatus: MacknikStatus) => {
    const now = Date.now();
    const tracking = thresholdCrossingsRef.current;
    const elapsed = now - tracking.lastStatusChangeTime;

    // Accumulate time in previous status
    if (tracking.lastStatus === 'YELLOW') {
      tracking.timeInYellowMs += elapsed;
    } else if (tracking.lastStatus === 'RED') {
      tracking.timeInRedMs += elapsed;
    }

    // Count threshold crossings
    if (newStatus === 'YELLOW' && tracking.lastStatus === 'GREEN') {
      tracking.yellowCrossings++;
    } else if (newStatus === 'RED' && tracking.lastStatus !== 'RED') {
      tracking.redCrossings++;
    }

    // Update tracking state
    tracking.lastStatusChangeTime = now;
    tracking.lastStatus = newStatus;
  }, []);

  /**
   * Record a completed case
   */
  const recordCaseCompleted = useCallback(() => {
    setCasesCompleted(prev => prev + 1);

    // Compute new metrics
    const newMetrics = computeMetrics();
    const newStatus = newMetrics.macknikStatus;

    // Check for status change
    if (newStatus !== previousStatus) {
      updateThresholdTracking(newStatus);
      setPreviousStatus(newStatus);
      onStatusChange?.(previousStatus, newStatus, newMetrics);
    }

    // Check if advisory should be triggered
    const shouldTrigger = (
      newStatus === 'RED' ||
      (newStatus === 'YELLOW' && !advisoryShownRef.current) ||
      newMetrics.fatigueIndex >= 80
    );

    if (shouldTrigger && (Date.now() - lastAdvisoryTimeRef.current) > 300000) {
      // Don't show more than once per 5 minutes
      onAdvisoryShouldShow?.(newMetrics);
    }
  }, [computeMetrics, previousStatus, updateThresholdTracking, onStatusChange, onAdvisoryShouldShow]);

  /**
   * Get current metrics (for external use)
   */
  const getCurrentMetrics = useCallback((): WorkloadMetrics => {
    return computeMetrics();
  }, [computeMetrics]);

  /**
   * Check if advisory should be shown
   */
  const shouldShowAdvisory = useCallback((): boolean => {
    const currentMetrics = computeMetrics();
    const timeSinceLastAdvisory = Date.now() - lastAdvisoryTimeRef.current;

    // Don't show more than once per 5 minutes
    if (timeSinceLastAdvisory < 300000 && advisoryShownRef.current) {
      return false;
    }

    return (
      currentMetrics.macknikStatus === 'RED' ||
      currentMetrics.fatigueIndex >= 80 ||
      (currentMetrics.totalReadingTimeMs / 60000) >= currentMetrics.thresholds.maxSessionMinutes
    );
  }, [computeMetrics]);

  /**
   * Mark advisory as shown
   */
  const markAdvisoryShown = useCallback(() => {
    advisoryShownRef.current = true;
    lastAdvisoryTimeRef.current = Date.now();
    advisoryCountRef.current++;
  }, []);

  /**
   * Reset metrics for a new session
   */
  const resetMetrics = useCallback((newSessionId: string) => {
    sessionStartTime.current = new Date();
    sessionStartIso.current = sessionStartTime.current.toISOString();
    setCasesCompleted(0);
    setPreviousStatus('GREEN');
    advisoryShownRef.current = false;
    lastAdvisoryTimeRef.current = 0;
    advisoryCountRef.current = 0;
    thresholdCrossingsRef.current = {
      yellowCrossings: 0,
      redCrossings: 0,
      timeInYellowMs: 0,
      timeInRedMs: 0,
      lastStatusChangeTime: Date.now(),
      lastStatus: 'GREEN',
    };
    peakCasesPerHourRef.current = 0;
    peakFatigueIndexRef.current = 0;
    advisoryResponsesRef.current = { continued: 0, tookBreak: 0 };
  }, []);

  /**
   * Get session summary for export
   */
  const getSessionSummary = useCallback((): SessionWorkloadSummaryPayload => {
    const now = new Date();
    const currentMetrics = computeMetrics();
    const tracking = thresholdCrossingsRef.current;
    const responses = advisoryResponsesRef.current;

    // Finalize time tracking
    const elapsed = Date.now() - tracking.lastStatusChangeTime;
    let finalTimeInYellow = tracking.timeInYellowMs;
    let finalTimeInRed = tracking.timeInRedMs;
    if (tracking.lastStatus === 'YELLOW') {
      finalTimeInYellow += elapsed;
    } else if (tracking.lastStatus === 'RED') {
      finalTimeInRed += elapsed;
    }

    // Determine workload profile
    let workloadProfile: 'LOW' | 'MODERATE' | 'HIGH' | 'EXCESSIVE' = 'LOW';
    if (peakFatigueIndexRef.current >= 80 || tracking.redCrossings > 2) {
      workloadProfile = 'EXCESSIVE';
    } else if (peakFatigueIndexRef.current >= 60 || tracking.redCrossings > 0) {
      workloadProfile = 'HIGH';
    } else if (peakFatigueIndexRef.current >= 40 || tracking.yellowCrossings > 0) {
      workloadProfile = 'MODERATE';
    }

    return {
      sessionId,
      sessionStartTime: sessionStartIso.current,
      sessionEndTime: now.toISOString(),
      totalSessionMs: currentMetrics.totalReadingTimeMs,
      totalSessionMinutes: Math.round(currentMetrics.totalReadingTimeMs / 60000),
      totalCasesCompleted: currentMetrics.casesCompleted,
      averageCasesPerHour: currentMetrics.casesPerHour,
      averageTimePerCaseMs: currentMetrics.averageTimePerCaseMs,
      peakCasesPerHour: peakCasesPerHourRef.current,
      peakFatigueIndex: peakFatigueIndexRef.current,
      thresholdCrossings: {
        yellowCrossings: tracking.yellowCrossings,
        redCrossings: tracking.redCrossings,
        timeInYellowMs: finalTimeInYellow,
        timeInRedMs: finalTimeInRed,
      },
      advisoriesShown: advisoryCountRef.current,
      advisoryResponses: {
        continued: responses.continued,
        tookBreak: responses.tookBreak,
      },
      finalMacknikStatus: currentMetrics.macknikStatus,
      workloadProfile,
    };
  }, [sessionId, computeMetrics]);

  return {
    metrics,
    recordCaseCompleted,
    getCurrentMetrics,
    shouldShowAdvisory,
    markAdvisoryShown,
    resetMetrics,
    getSessionSummary,
  };
}

export default useWorkloadMetrics;
