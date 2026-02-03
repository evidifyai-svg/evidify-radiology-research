/**
 * workloadTypes.ts
 *
 * Type definitions for radiologist workload monitoring based on
 * research showing performance degradation with increased case volume.
 *
 * Note: Thresholds are configurable per institutional or study-defined
 * standards. Published evidence-based thresholds for radiologist workload
 * limits have not been established (Waite et al., Radiology 2022).
 */

/**
 * Workload status categories based on cases-per-hour thresholds.
 * GREEN: Normal workload, no performance concerns
 * YELLOW: Elevated workload, potential accuracy decline
 * RED: High workload, documented performance degradation risk
 */
export type WorkloadStatus = 'GREEN' | 'YELLOW' | 'RED';

/**
 * Configurable thresholds for workload monitoring.
 * These values can be adjusted based on institutional policies
 * or research protocol requirements.
 */
export interface WorkloadThresholds {
  /** Cases per hour threshold for YELLOW status (default: 30) */
  casesPerHourYellow: number;
  /** Cases per hour threshold for RED status (default: 40) */
  casesPerHourRed: number;
  /** Maximum recommended cases per session (default: 50) */
  maxSessionCases: number;
  /** Maximum recommended session duration in minutes (default: 180) */
  maxSessionMinutes: number;
}

/**
 * Default thresholds - configurable per study protocol or institutional standards.
 * These are starting parameters and should be adjusted based on specific study requirements.
 */
export const DEFAULT_WORKLOAD_THRESHOLDS: WorkloadThresholds = {
  casesPerHourYellow: 30,
  casesPerHourRed: 40,
  maxSessionCases: 50,
  maxSessionMinutes: 180,
};

/**
 * Real-time workload metrics for the current reading session.
 */
export interface WorkloadMetrics {
  /** Unique identifier for this session */
  sessionId: string;
  /** ISO 8601 timestamp when session began */
  sessionStartTime: string;
  /** Number of cases completed in this session */
  casesCompleted: number;
  /** Total accumulated reading time in milliseconds */
  totalReadingTimeMs: number;
  /** Average time per case in milliseconds */
  averageTimePerCaseMs: number;
  /** Current throughput rate (cases per hour) */
  casesPerHour: number;
  /** Current workload status based on thresholds */
  workloadStatus: WorkloadStatus;
  /**
   * Fatigue index from 0-100 based on combined factors:
   * - Session duration relative to max
   * - Cases completed relative to max
   * - Current throughput rate
   */
  fatigueIndex: number;
  /** Active threshold configuration */
  thresholds: WorkloadThresholds;
}

/**
 * Payload for WORKLOAD_THRESHOLD_CROSSED event.
 * Logged when radiologist transitions between workload zones.
 */
export interface WorkloadThresholdCrossedPayload {
  /** Case ID when threshold was crossed */
  caseId: string;
  /** Previous workload status */
  previousStatus: WorkloadStatus;
  /** New workload status */
  newStatus: WorkloadStatus;
  /** Current workload metrics at time of crossing */
  metrics: {
    casesCompleted: number;
    casesPerHour: number;
    sessionDurationMinutes: number;
    fatigueIndex: number;
  };
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * Payload for WORKLOAD_ADVISORY_SHOWN event.
 * Logged when a workload warning is displayed to the user.
 */
export interface WorkloadAdvisoryShownPayload {
  /** Advisory severity level */
  advisoryLevel: WorkloadStatus;
  /** Message displayed to user */
  advisoryMessage: string;
  /** Current workload metrics */
  metrics: {
    casesCompleted: number;
    casesPerHour: number;
    sessionDurationMinutes: number;
    fatigueIndex: number;
  };
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * Payload for WORKLOAD_ADVISORY_RESPONSE event.
 * Logged when user responds to a workload advisory.
 */
export interface WorkloadAdvisoryResponsePayload {
  /** User's choice */
  response: 'CONTINUE' | 'TAKE_BREAK';
  /** How long advisory was displayed before response (ms) */
  responseTimeMs: number;
  /** Metrics at time of response */
  metrics: {
    casesCompleted: number;
    casesPerHour: number;
    fatigueIndex: number;
  };
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * Comprehensive workload summary for session export.
 * Included in trial_manifest.json.
 */
export interface SessionWorkloadSummary {
  /** Total session duration in milliseconds */
  totalSessionDurationMs: number;
  /** Total cases completed in session */
  totalCasesCompleted: number;
  /** Overall average time per case in milliseconds */
  overallAverageTimePerCaseMs: number;
  /** Peak cases per hour achieved */
  peakCasesPerHour: number;
  /** Final fatigue index at session end */
  finalFatigueIndex: number;
  /** Time spent in each workload zone (ms) */
  timeInZones: {
    green: number;
    yellow: number;
    red: number;
  };
  /** Number of threshold crossings */
  thresholdCrossings: {
    toYellow: number;
    toRed: number;
  };
  /** Number of advisories shown */
  advisoriesShown: number;
  /** User responses to advisories */
  advisoryResponses: {
    continued: number;
    tookBreak: number;
  };
  /** Active thresholds used */
  thresholds: WorkloadThresholds;
}

/**
 * Props for WorkloadMonitor display component.
 */
export interface WorkloadMonitorProps {
  /** Current workload metrics */
  metrics: WorkloadMetrics | null;
  /** Optional compact mode for header bar */
  compact?: boolean;
  /** Optional click handler */
  onClick?: () => void;
  /** Optional className override */
  className?: string;
}

/**
 * Props for WorkloadAdvisory modal component.
 */
export interface WorkloadAdvisoryProps {
  /** Whether advisory is visible */
  isOpen: boolean;
  /** Advisory level determining message severity */
  level: WorkloadStatus;
  /** Current metrics to display */
  metrics: WorkloadMetrics;
  /** Callback when user chooses to continue */
  onContinue: () => void;
  /** Callback when user chooses to take a break */
  onTakeBreak: () => void;
}
