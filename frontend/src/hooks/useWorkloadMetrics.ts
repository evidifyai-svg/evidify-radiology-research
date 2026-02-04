/**
 * useWorkloadMetrics.ts
 *
 * React hook for tracking radiologist workload metrics during reading sessions.
 * Provides real-time calculation of throughput, session duration index, and status.
 *
 * Research basis: Radiologist workload duration research demonstrates performance
 * degradation correlates with case volume and session duration.
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type {
  WorkloadMetrics,
  WorkloadStatus,
  WorkloadThresholds,
  SessionWorkloadSummary,
  WorkloadThresholdCrossedPayload,
  WorkloadAdvisoryShownPayload,
  WorkloadAdvisoryResponsePayload,
} from '../types/workloadTypes';
import { DEFAULT_WORKLOAD_THRESHOLDS } from '../types/workloadTypes';

/**
 * Configuration options for the workload metrics hook.
 */
export interface UseWorkloadMetricsOptions {
  /** Session identifier */
  sessionId: string;
  /** Optional custom thresholds */
  thresholds?: Partial<WorkloadThresholds>;
  /** Callback when workload status changes */
  onStatusChange?: (
    previousStatus: WorkloadStatus,
    newStatus: WorkloadStatus,
    metrics: WorkloadMetrics
  ) => void;
  /** Callback for logging events (integrates with EventLogger) */
  onLogEvent?: (type: string, payload: unknown) => Promise<void>;
}

/**
 * Return value from useWorkloadMetrics hook.
 */
export interface UseWorkloadMetricsReturn {
  /** Current workload metrics */
  metrics: WorkloadMetrics;
  /** Record a case completion */
  recordCaseCompleted: (caseId: string) => void;
  /** Record the start of a case */
  recordCaseStarted: (caseId: string) => void;
  /** Reset session metrics */
  resetSession: (newSessionId?: string) => void;
  /** Get session summary for export */
  getSessionSummary: () => SessionWorkloadSummary;
  /** Record that an advisory was shown */
  recordAdvisoryShown: (level: WorkloadStatus, message: string) => void;
  /** Record user response to advisory */
  recordAdvisoryResponse: (response: 'CONTINUE' | 'TAKE_BREAK', responseTimeMs: number) => void;
  /** Current active case ID if any */
  currentCaseId: string | null;
  /** Whether an advisory should be shown */
  shouldShowAdvisory: boolean;
  /** Mark that advisory has been acknowledged */
  acknowledgeAdvisory: () => void;
}

/**
 * Calculate workload status based on current throughput.
 */
function calculateStatus(
  casesPerHour: number,
  thresholds: WorkloadThresholds
): WorkloadStatus {
  if (casesPerHour >= thresholds.casesPerHourRed) {
    return 'RED';
  }
  if (casesPerHour >= thresholds.casesPerHourYellow) {
    return 'YELLOW';
  }
  return 'GREEN';
}

/**
 * Calculate session duration index (0-100) based on multiple factors.
 * Combines session duration, case count, and throughput rate.
 */
function calculateSessionDurationIndex(
  sessionDurationMinutes: number,
  casesCompleted: number,
  casesPerHour: number,
  thresholds: WorkloadThresholds
): number {
  // Duration factor: percentage of max session time
  const durationFactor = Math.min(
    sessionDurationMinutes / thresholds.maxSessionMinutes,
    1
  );

  // Case count factor: percentage of max cases
  const caseCountFactor = Math.min(
    casesCompleted / thresholds.maxSessionCases,
    1
  );

  // Rate factor: how close to red zone (normalized 0-1)
  const rateFactor = Math.min(
    casesPerHour / thresholds.casesPerHourRed,
    1
  );

  // Weighted combination (duration and case count weighted higher)
  const index = durationFactor * 0.35 + caseCountFactor * 0.35 + rateFactor * 0.3;

  return Math.round(index * 100);
}

/**
 * Hook for tracking workload metrics during a reading session.
 */
export function useWorkloadMetrics(
  options: UseWorkloadMetricsOptions
): UseWorkloadMetricsReturn {
  const { sessionId, onStatusChange, onLogEvent } = options;

  const thresholds = useMemo<WorkloadThresholds>(
    () => ({
      ...DEFAULT_WORKLOAD_THRESHOLDS,
      ...options.thresholds,
    }),
    [options.thresholds]
  );

  // Session state
  const [sessionStartTime] = useState(() => new Date().toISOString());
  const sessionStartMs = useRef(Date.now());
  const [casesCompleted, setCasesCompleted] = useState(0);
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const caseStartTimeRef = useRef<number | null>(null);
  const totalReadingTimeRef = useRef(0);
  const lastStatusRef = useRef<WorkloadStatus>('GREEN');

  // Advisory state
  const [advisoryAcknowledged, setAdvisoryAcknowledged] = useState(false);
  const advisoriesShownRef = useRef(0);
  const advisoryResponsesRef = useRef<{ continued: number; tookBreak: number }>({
    continued: 0,
    tookBreak: 0,
  });

  // Zone time tracking
  const zoneTimeRef = useRef<{ green: number; yellow: number; red: number }>({
    green: 0,
    yellow: 0,
    red: 0,
  });
  const lastZoneCheckRef = useRef(Date.now());
  const thresholdCrossingsRef = useRef<{ toYellow: number; toRed: number }>({
    toYellow: 0,
    toRed: 0,
  });
  const peakCasesPerHourRef = useRef(0);

  /**
   * Calculate current metrics.
   */
  const calculateMetrics = useCallback((): WorkloadMetrics => {
    const now = Date.now();
    const sessionDurationMs = now - sessionStartMs.current;
    const sessionDurationHours = sessionDurationMs / (1000 * 60 * 60);

    // Calculate cases per hour
    const casesPerHour =
      sessionDurationHours > 0 ? casesCompleted / sessionDurationHours : 0;

    // Calculate average time per case
    const averageTimePerCaseMs =
      casesCompleted > 0 ? totalReadingTimeRef.current / casesCompleted : 0;

    // Calculate status
    const status = calculateStatus(casesPerHour, thresholds);

    // Calculate fatigue index
    const sessionDurationMinutes = sessionDurationMs / (1000 * 60);
    const sessionDurationIndex = calculateSessionDurationIndex(
      sessionDurationMinutes,
      casesCompleted,
      casesPerHour,
      thresholds
    );

    // Update peak
    if (casesPerHour > peakCasesPerHourRef.current) {
      peakCasesPerHourRef.current = casesPerHour;
    }

    // Update zone time
    const timeSinceLastCheck = now - lastZoneCheckRef.current;
    const lastStatus = lastStatusRef.current;
    if (lastStatus === 'GREEN') {
      zoneTimeRef.current.green += timeSinceLastCheck;
    } else if (lastStatus === 'YELLOW') {
      zoneTimeRef.current.yellow += timeSinceLastCheck;
    } else {
      zoneTimeRef.current.red += timeSinceLastCheck;
    }
    lastZoneCheckRef.current = now;

    return {
      sessionId,
      sessionStartTime,
      casesCompleted,
      totalReadingTimeMs: totalReadingTimeRef.current,
      averageTimePerCaseMs,
      casesPerHour,
      workloadStatus: status,
      sessionDurationIndex,
      thresholds,
    };
  }, [sessionId, sessionStartTime, casesCompleted, thresholds]);

  /**
   * Get current metrics.
   */
  const metrics = useMemo(() => calculateMetrics(), [calculateMetrics]);

  /**
   * Record start of a case.
   */
  const recordCaseStarted = useCallback((caseId: string) => {
    setCurrentCaseId(caseId);
    caseStartTimeRef.current = Date.now();
  }, []);

  /**
   * Record completion of a case.
   */
  const recordCaseCompleted = useCallback(
    (caseId: string) => {
      // Calculate reading time for this case
      if (caseStartTimeRef.current !== null) {
        const readingTime = Date.now() - caseStartTimeRef.current;
        totalReadingTimeRef.current += readingTime;
      }

      const previousStatus = lastStatusRef.current;
      setCasesCompleted((prev) => prev + 1);

      // After incrementing, recalculate metrics to check for threshold crossing
      const now = Date.now();
      const sessionDurationMs = now - sessionStartMs.current;
      const sessionDurationHours = sessionDurationMs / (1000 * 60 * 60);
      const newCaseCount = casesCompleted + 1;
      const newCasesPerHour =
        sessionDurationHours > 0 ? newCaseCount / sessionDurationHours : 0;
      const newStatus = calculateStatus(newCasesPerHour, thresholds);

      // Check for threshold crossing
      if (newStatus !== previousStatus) {
        // Track crossings
        if (newStatus === 'YELLOW' && previousStatus === 'GREEN') {
          thresholdCrossingsRef.current.toYellow++;
        } else if (newStatus === 'RED') {
          thresholdCrossingsRef.current.toRed++;
        }

        // Reset advisory acknowledgment on status change
        setAdvisoryAcknowledged(false);

        // Log the threshold crossing
        if (onLogEvent) {
          const payload: WorkloadThresholdCrossedPayload = {
            caseId,
            previousStatus,
            newStatus,
            metrics: {
              casesCompleted: newCaseCount,
              casesPerHour: newCasesPerHour,
              sessionDurationMinutes: sessionDurationMs / (1000 * 60),
              sessionDurationIndex: calculateSessionDurationIndex(
                sessionDurationMs / (1000 * 60),
                newCaseCount,
                newCasesPerHour,
                thresholds
              ),
            },
            timestamp: new Date().toISOString(),
          };
          onLogEvent('WORKLOAD_THRESHOLD_CROSSED', payload);
        }

        // Notify callback
        if (onStatusChange) {
          const updatedMetrics = calculateMetrics();
          onStatusChange(previousStatus, newStatus, updatedMetrics);
        }

        lastStatusRef.current = newStatus;
      }

      setCurrentCaseId(null);
      caseStartTimeRef.current = null;
    },
    [casesCompleted, thresholds, onStatusChange, onLogEvent, calculateMetrics]
  );

  /**
   * Reset session metrics.
   */
  const resetSession = useCallback((newSessionId?: string) => {
    sessionStartMs.current = Date.now();
    setCasesCompleted(0);
    setCurrentCaseId(null);
    caseStartTimeRef.current = null;
    totalReadingTimeRef.current = 0;
    lastStatusRef.current = 'GREEN';
    setAdvisoryAcknowledged(false);
    advisoriesShownRef.current = 0;
    advisoryResponsesRef.current = { continued: 0, tookBreak: 0 };
    zoneTimeRef.current = { green: 0, yellow: 0, red: 0 };
    lastZoneCheckRef.current = Date.now();
    thresholdCrossingsRef.current = { toYellow: 0, toRed: 0 };
    peakCasesPerHourRef.current = 0;
  }, []);

  /**
   * Get session summary for export.
   */
  const getSessionSummary = useCallback((): SessionWorkloadSummary => {
    const currentMetrics = calculateMetrics();
    const sessionDurationMs = Date.now() - sessionStartMs.current;

    return {
      totalSessionDurationMs: sessionDurationMs,
      totalCasesCompleted: casesCompleted,
      overallAverageTimePerCaseMs: currentMetrics.averageTimePerCaseMs,
      peakCasesPerHour: peakCasesPerHourRef.current,
      finalSessionDurationIndex: currentMetrics.sessionDurationIndex,
      timeInZones: { ...zoneTimeRef.current },
      thresholdCrossings: { ...thresholdCrossingsRef.current },
      advisoriesShown: advisoriesShownRef.current,
      advisoryResponses: { ...advisoryResponsesRef.current },
      thresholds,
    };
  }, [calculateMetrics, casesCompleted, thresholds]);

  /**
   * Record that an advisory was shown.
   */
  const recordAdvisoryShown = useCallback(
    (level: WorkloadStatus, message: string) => {
      advisoriesShownRef.current++;
      const currentMetrics = calculateMetrics();

      if (onLogEvent) {
        const payload: WorkloadAdvisoryShownPayload = {
          advisoryLevel: level,
          advisoryMessage: message,
          metrics: {
            casesCompleted: currentMetrics.casesCompleted,
            casesPerHour: currentMetrics.casesPerHour,
            sessionDurationMinutes:
              (Date.now() - sessionStartMs.current) / (1000 * 60),
            sessionDurationIndex: currentMetrics.sessionDurationIndex,
          },
          timestamp: new Date().toISOString(),
        };
        onLogEvent('WORKLOAD_ADVISORY_SHOWN', payload);
      }
    },
    [calculateMetrics, onLogEvent]
  );

  /**
   * Record user response to advisory.
   */
  const recordAdvisoryResponse = useCallback(
    (response: 'CONTINUE' | 'TAKE_BREAK', responseTimeMs: number) => {
      if (response === 'CONTINUE') {
        advisoryResponsesRef.current.continued++;
      } else {
        advisoryResponsesRef.current.tookBreak++;
      }

      const currentMetrics = calculateMetrics();

      if (onLogEvent) {
        const payload: WorkloadAdvisoryResponsePayload = {
          response,
          responseTimeMs,
          metrics: {
            casesCompleted: currentMetrics.casesCompleted,
            casesPerHour: currentMetrics.casesPerHour,
            sessionDurationIndex: currentMetrics.sessionDurationIndex,
          },
          timestamp: new Date().toISOString(),
        };
        onLogEvent('WORKLOAD_ADVISORY_RESPONSE', payload);
      }
    },
    [calculateMetrics, onLogEvent]
  );

  /**
   * Determine if advisory should be shown.
   */
  const shouldShowAdvisory = useMemo(() => {
    // Show advisory if in YELLOW or RED zone and not yet acknowledged
    return (
      (metrics.workloadStatus === 'YELLOW' || metrics.workloadStatus === 'RED') &&
      !advisoryAcknowledged
    );
  }, [metrics.workloadStatus, advisoryAcknowledged]);

  /**
   * Acknowledge the advisory.
   */
  const acknowledgeAdvisory = useCallback(() => {
    setAdvisoryAcknowledged(true);
  }, []);

  return {
    metrics,
    recordCaseCompleted,
    recordCaseStarted,
    resetSession,
    getSessionSummary,
    recordAdvisoryShown,
    recordAdvisoryResponse,
    currentCaseId,
    shouldShowAdvisory,
    acknowledgeAdvisory,
  };
}

export default useWorkloadMetrics;
