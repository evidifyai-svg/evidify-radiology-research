/**
 * Workload Monitoring Types
 *
 * Based on radiologist fatigue research (Macknik et al.), these types support
 * tracking cognitive load indicators during reading sessions.
 *
 * Feature-flagged: Only active when URL has ?workload=1 or localStorage.workloadMonitor=1
 */

/**
 * Workload status thresholds based on cases-per-hour and session duration
 */
export type WorkloadStatus = 'GREEN' | 'YELLOW' | 'RED';

/**
 * Threshold configuration for workload status transitions
 */
export interface WorkloadThresholds {
  /** Cases per hour threshold for YELLOW status */
  casesPerHourYellow: number;
  /** Cases per hour threshold for RED status */
  casesPerHourRed: number;
  /** Session duration (minutes) threshold for YELLOW status */
  sessionMinutesYellow: number;
  /** Session duration (minutes) threshold for RED status */
  sessionMinutesRed: number;
  /** Fatigue index threshold for YELLOW status (0-100) */
  fatigueIndexYellow: number;
  /** Fatigue index threshold for RED status (0-100) */
  fatigueIndexRed: number;
}

/**
 * Default thresholds based on literature values
 */
export const DEFAULT_WORKLOAD_THRESHOLDS: WorkloadThresholds = {
  casesPerHourYellow: 12,   // ~5 min/case average becoming concerning
  casesPerHourRed: 18,      // ~3.3 min/case average - high throughput risk
  sessionMinutesYellow: 90, // 1.5 hours continuous
  sessionMinutesRed: 150,   // 2.5 hours continuous
  fatigueIndexYellow: 40,   // Moderate fatigue
  fatigueIndexRed: 70,      // High fatigue
};

/**
 * Real-time workload metrics derived from session events
 */
export interface WorkloadMetrics {
  /** Session identifier */
  sessionId: string;
  /** Session start time (ISO string) */
  sessionStartTime: string;
  /** Number of cases completed in this session */
  casesCompleted: number;
  /** Total reading time in milliseconds */
  totalReadingTimeMs: number;
  /** Average time per case in milliseconds */
  averageTimePerCaseMs: number;
  /** Current cases per hour rate */
  casesPerHour: number;
  /** Current workload status */
  workloadStatus: WorkloadStatus;
  /** Composite fatigue index (0-100) */
  fatigueIndex: number;
  /** Active threshold configuration */
  thresholds: WorkloadThresholds;
}

/**
 * Check if workload monitoring is enabled via URL or localStorage
 */
export function isWorkloadMonitorEnabled(): boolean {
  // Check URL parameter
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('workload') === '1') return true;

    // Check localStorage
    try {
      if (localStorage.getItem('workloadMonitor') === '1') return true;
    } catch {
      // localStorage may be unavailable
    }
  }
  return false;
}

/**
 * Simple invariant check for workload metrics
 */
export function validateWorkloadMetrics(metrics: WorkloadMetrics): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (metrics.casesCompleted < 0) {
    errors.push('casesCompleted cannot be negative');
  }
  if (metrics.totalReadingTimeMs < 0) {
    errors.push('totalReadingTimeMs cannot be negative');
  }
  if (metrics.fatigueIndex < 0 || metrics.fatigueIndex > 100) {
    errors.push('fatigueIndex must be between 0 and 100');
  }
  if (!['GREEN', 'YELLOW', 'RED'].includes(metrics.workloadStatus)) {
    errors.push('workloadStatus must be GREEN, YELLOW, or RED');
  }

  return { valid: errors.length === 0, errors };
}
