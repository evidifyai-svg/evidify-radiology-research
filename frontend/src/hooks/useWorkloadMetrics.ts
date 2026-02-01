/**
 * useWorkloadMetrics Hook
 *
 * Tracks real-time workload metrics based on session activity.
 * Derives metrics from existing events (case completions, timestamps)
 * without requiring new event types.
 *
 * Feature-flagged: Only active when isWorkloadMonitorEnabled() returns true.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  WorkloadMetrics,
  WorkloadStatus,
  WorkloadThresholds,
  DEFAULT_WORKLOAD_THRESHOLDS,
  isWorkloadMonitorEnabled,
  validateWorkloadMetrics,
} from '../types/workloadTypes';

interface UseWorkloadMetricsOptions {
  sessionId: string;
  thresholds?: Partial<WorkloadThresholds>;
}

interface UseWorkloadMetricsReturn {
  /** Current workload metrics (null if feature disabled) */
  metrics: WorkloadMetrics | null;
  /** Whether workload monitoring is enabled */
  enabled: boolean;
  /** Record a case completion */
  recordCaseComplete: (caseTimeMs: number) => void;
  /** Reset metrics (e.g., after break) */
  resetMetrics: () => void;
  /** Get current status for display */
  getStatusColor: () => string;
}

/**
 * Calculate workload status based on current metrics and thresholds
 */
function calculateWorkloadStatus(
  casesPerHour: number,
  sessionMinutes: number,
  fatigueIndex: number,
  thresholds: WorkloadThresholds
): WorkloadStatus {
  // RED if any metric exceeds red threshold
  if (
    casesPerHour >= thresholds.casesPerHourRed ||
    sessionMinutes >= thresholds.sessionMinutesRed ||
    fatigueIndex >= thresholds.fatigueIndexRed
  ) {
    return 'RED';
  }

  // YELLOW if any metric exceeds yellow threshold
  if (
    casesPerHour >= thresholds.casesPerHourYellow ||
    sessionMinutes >= thresholds.sessionMinutesYellow ||
    fatigueIndex >= thresholds.fatigueIndexYellow
  ) {
    return 'YELLOW';
  }

  return 'GREEN';
}

/**
 * Calculate composite fatigue index (0-100)
 * Combines session duration and case throughput into a single metric
 */
function calculateFatigueIndex(
  sessionMinutes: number,
  casesPerHour: number,
  thresholds: WorkloadThresholds
): number {
  // Duration component: 0-50 based on session length
  const durationRatio = Math.min(sessionMinutes / thresholds.sessionMinutesRed, 1);
  const durationComponent = durationRatio * 50;

  // Throughput component: 0-50 based on case rate
  const throughputRatio = Math.min(casesPerHour / thresholds.casesPerHourRed, 1);
  const throughputComponent = throughputRatio * 50;

  return Math.round(durationComponent + throughputComponent);
}

/**
 * Hook for tracking workload metrics during a reading session
 */
export function useWorkloadMetrics(
  options: UseWorkloadMetricsOptions
): UseWorkloadMetricsReturn {
  const { sessionId, thresholds: customThresholds } = options;

  const enabled = isWorkloadMonitorEnabled();
  const thresholds: WorkloadThresholds = {
    ...DEFAULT_WORKLOAD_THRESHOLDS,
    ...customThresholds,
  };

  const sessionStartRef = useRef<string>(new Date().toISOString());
  const caseTimesRef = useRef<number[]>([]);

  const [metrics, setMetrics] = useState<WorkloadMetrics | null>(() => {
    if (!enabled) return null;

    return {
      sessionId,
      sessionStartTime: sessionStartRef.current,
      casesCompleted: 0,
      totalReadingTimeMs: 0,
      averageTimePerCaseMs: 0,
      casesPerHour: 0,
      workloadStatus: 'GREEN',
      fatigueIndex: 0,
      thresholds,
    };
  });

  // Update metrics periodically to reflect session duration
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setMetrics((prev) => {
        if (!prev) return null;

        const sessionMs = Date.now() - new Date(prev.sessionStartTime).getTime();
        const sessionMinutes = sessionMs / 60000;

        const casesPerHour =
          sessionMinutes > 0 ? (prev.casesCompleted / sessionMinutes) * 60 : 0;

        const fatigueIndex = calculateFatigueIndex(
          sessionMinutes,
          casesPerHour,
          thresholds
        );

        const workloadStatus = calculateWorkloadStatus(
          casesPerHour,
          sessionMinutes,
          fatigueIndex,
          thresholds
        );

        const updated: WorkloadMetrics = {
          ...prev,
          casesPerHour: Math.round(casesPerHour * 10) / 10,
          fatigueIndex,
          workloadStatus,
        };

        // Self-check: validate metrics
        const validation = validateWorkloadMetrics(updated);
        if (!validation.valid) {
          console.warn('[useWorkloadMetrics] Invalid metrics:', validation.errors);
        }

        return updated;
      });
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [enabled, thresholds]);

  const recordCaseComplete = useCallback(
    (caseTimeMs: number) => {
      if (!enabled) return;

      caseTimesRef.current.push(caseTimeMs);

      setMetrics((prev) => {
        if (!prev) return null;

        const casesCompleted = prev.casesCompleted + 1;
        const totalReadingTimeMs = prev.totalReadingTimeMs + caseTimeMs;
        const averageTimePerCaseMs =
          casesCompleted > 0 ? Math.round(totalReadingTimeMs / casesCompleted) : 0;

        const sessionMs = Date.now() - new Date(prev.sessionStartTime).getTime();
        const sessionMinutes = sessionMs / 60000;
        const casesPerHour =
          sessionMinutes > 0 ? (casesCompleted / sessionMinutes) * 60 : 0;

        const fatigueIndex = calculateFatigueIndex(
          sessionMinutes,
          casesPerHour,
          thresholds
        );

        const workloadStatus = calculateWorkloadStatus(
          casesPerHour,
          sessionMinutes,
          fatigueIndex,
          thresholds
        );

        return {
          ...prev,
          casesCompleted,
          totalReadingTimeMs,
          averageTimePerCaseMs,
          casesPerHour: Math.round(casesPerHour * 10) / 10,
          fatigueIndex,
          workloadStatus,
        };
      });
    },
    [enabled, thresholds]
  );

  const resetMetrics = useCallback(() => {
    if (!enabled) return;

    sessionStartRef.current = new Date().toISOString();
    caseTimesRef.current = [];

    setMetrics({
      sessionId,
      sessionStartTime: sessionStartRef.current,
      casesCompleted: 0,
      totalReadingTimeMs: 0,
      averageTimePerCaseMs: 0,
      casesPerHour: 0,
      workloadStatus: 'GREEN',
      fatigueIndex: 0,
      thresholds,
    });
  }, [enabled, sessionId, thresholds]);

  const getStatusColor = useCallback((): string => {
    if (!metrics) return 'gray';
    switch (metrics.workloadStatus) {
      case 'GREEN':
        return 'green';
      case 'YELLOW':
        return 'yellow';
      case 'RED':
        return 'red';
      default:
        return 'gray';
    }
  }, [metrics]);

  return {
    metrics,
    enabled,
    recordCaseComplete,
    resetMetrics,
    getStatusColor,
  };
}

export default useWorkloadMetrics;
