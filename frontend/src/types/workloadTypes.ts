/**
 * workloadTypes.ts
 *
 * TypeScript types for Workload Monitor feature
 * Based on Dr. Stephen Macknik's research on radiologist fatigue and performance degradation
 *
 * References:
 * - Macknik, S.L. et al. Radiologist workload and diagnostic accuracy
 * - Waite, S. et al. Interpretive error in radiology
 */

// ============================================================================
// WORKLOAD METRICS
// ============================================================================

/**
 * Macknik status thresholds for workload assessment
 * GREEN: Normal operating range, minimal fatigue risk
 * YELLOW: Elevated workload, performance degradation may begin
 * RED: High workload, significant risk of diagnostic errors
 */
export type MacknikStatus = 'GREEN' | 'YELLOW' | 'RED';

/**
 * Workload thresholds based on Macknik research
 */
export interface WorkloadThresholds {
  /** Cases per hour threshold for yellow (30) */
  casesPerHourYellow: number;
  /** Cases per hour threshold for red (40) */
  casesPerHourRed: number;
  /** Maximum recommended cases per session (50) */
  maxSessionCases: number;
  /** Maximum recommended session duration in minutes (180) */
  maxSessionMinutes: number;
}

/**
 * Default Macknik thresholds
 */
export const DEFAULT_WORKLOAD_THRESHOLDS: WorkloadThresholds = {
  casesPerHourYellow: 30,
  casesPerHourRed: 40,
  maxSessionCases: 50,
  maxSessionMinutes: 180,
};

/**
 * Complete workload metrics for a reading session
 */
export interface WorkloadMetrics {
  /** Session identifier */
  sessionId: string;
  /** ISO timestamp when session started */
  sessionStartTime: string;
  /** Number of cases completed in this session */
  casesCompleted: number;
  /** Total reading time in milliseconds */
  totalReadingTimeMs: number;
  /** Average time spent per case in milliseconds */
  averageTimePerCaseMs: number;
  /** Current rate of cases per hour */
  casesPerHour: number;
  /** Macknik status indicator */
  macknikStatus: MacknikStatus;
  /** Fatigue index 0-100, computed from time + cases */
  fatigueIndex: number;
  /** Applied thresholds */
  thresholds: WorkloadThresholds;
}

// ============================================================================
// WORKLOAD EVENTS
// ============================================================================

/**
 * Workload-specific event types for event logging
 */
export type WorkloadEventType =
  | 'WORKLOAD_THRESHOLD_YELLOW'
  | 'WORKLOAD_THRESHOLD_RED'
  | 'WORKLOAD_ADVISORY_SHOWN'
  | 'WORKLOAD_ADVISORY_RESPONSE'
  | 'SESSION_WORKLOAD_SUMMARY';

/**
 * Payload for threshold crossing events
 */
export interface WorkloadThresholdPayload {
  sessionId: string;
  timestamp: string;
  casesCompleted: number;
  casesPerHour: number;
  fatigueIndex: number;
  totalSessionMinutes: number;
  previousStatus: MacknikStatus;
  newStatus: MacknikStatus;
}

/**
 * Payload when workload advisory is shown to user
 */
export interface WorkloadAdvisoryShownPayload {
  sessionId: string;
  timestamp: string;
  casesCompleted: number;
  casesPerHour: number;
  fatigueIndex: number;
  macknikStatus: MacknikStatus;
  advisoryType: 'CASE_RATE' | 'SESSION_DURATION' | 'FATIGUE_INDEX';
  message: string;
}

/**
 * Payload for user response to workload advisory
 */
export interface WorkloadAdvisoryResponsePayload {
  sessionId: string;
  timestamp: string;
  advisoryType: 'CASE_RATE' | 'SESSION_DURATION' | 'FATIGUE_INDEX';
  response: 'CONTINUE' | 'TAKE_BREAK';
  responseTimeMs: number;
  casesAtResponse: number;
  fatigueIndexAtResponse: number;
}

/**
 * Session-end summary of workload metrics
 */
export interface SessionWorkloadSummaryPayload {
  sessionId: string;
  sessionStartTime: string;
  sessionEndTime: string;
  totalSessionMs: number;
  totalSessionMinutes: number;
  totalCasesCompleted: number;
  averageCasesPerHour: number;
  averageTimePerCaseMs: number;
  peakCasesPerHour: number;
  peakFatigueIndex: number;
  thresholdCrossings: {
    yellowCrossings: number;
    redCrossings: number;
    timeInYellowMs: number;
    timeInRedMs: number;
  };
  advisoriesShown: number;
  advisoryResponses: {
    continued: number;
    tookBreak: number;
  };
  finalMacknikStatus: MacknikStatus;
  workloadProfile: 'LOW' | 'MODERATE' | 'HIGH' | 'EXCESSIVE';
}

// ============================================================================
// DISPLAY TYPES
// ============================================================================

/**
 * Props for WorkloadMonitor component
 */
export interface WorkloadMonitorProps {
  metrics: WorkloadMetrics;
  compact?: boolean;
  showProgressBar?: boolean;
  onAdvisoryDismiss?: () => void;
}

/**
 * Props for WorkloadAdvisory modal
 */
export interface WorkloadAdvisoryProps {
  isOpen: boolean;
  advisoryType: 'CASE_RATE' | 'SESSION_DURATION' | 'FATIGUE_INDEX';
  metrics: WorkloadMetrics;
  onContinue: () => void;
  onTakeBreak: () => void;
}

// ============================================================================
// HOOK TYPES
// ============================================================================

/**
 * Return type for useWorkloadMetrics hook
 */
export interface UseWorkloadMetricsReturn {
  /** Current workload metrics */
  metrics: WorkloadMetrics;
  /** Record a completed case */
  recordCaseCompleted: () => void;
  /** Get current metrics (for logging) */
  getCurrentMetrics: () => WorkloadMetrics;
  /** Check if advisory should be shown */
  shouldShowAdvisory: () => boolean;
  /** Mark advisory as shown */
  markAdvisoryShown: () => void;
  /** Reset metrics (new session) */
  resetMetrics: (sessionId: string) => void;
  /** Get session summary for export */
  getSessionSummary: () => SessionWorkloadSummaryPayload;
}
