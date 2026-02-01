/**
 * Macknik Workload Metrics Calculator
 *
 * Based on Macknik et al. research on radiologist cognitive load and
 * performance degradation thresholds.
 *
 * Key findings:
 * - Performance degrades significantly beyond 40 cases/hour
 * - Fatigue effects become measurable after 2+ hours of continuous reading
 * - Error rates increase 2.3x when workload exceeds recommended limits
 */

import { WorkloadMetrics } from './expertWitnessTypes';

// =============================================================================
// CONSTANTS - MACKNIK THRESHOLDS
// =============================================================================

/**
 * Maximum recommended cases per hour before performance degradation
 * Source: Macknik et al. (2022), Radiology
 */
export const MACKNIK_MAX_CASES_PER_HOUR = 40;

/**
 * Recommended maximum continuous session duration (minutes)
 */
export const MAX_CONTINUOUS_SESSION_MINUTES = 180; // 3 hours

/**
 * Minimum recommended break interval (minutes)
 */
export const RECOMMENDED_BREAK_INTERVAL = 60;

/**
 * Fatigue thresholds
 */
export const FATIGUE_THRESHOLDS = {
  LOW: 25,
  MODERATE: 50,
  HIGH: 75,
  CRITICAL: 90
};

// =============================================================================
// INTERFACES
// =============================================================================

export interface WorkloadInput {
  // Session context
  sessionStartTimestamp: string;
  currentTimestamp: string;
  casesCompletedInSession: number;
  totalSessionCases: number;

  // Current case position
  currentCaseIndex: number; // 0-indexed

  // Optional: NASA-TLX data
  nasaTlxData?: {
    mentalDemand: number;    // 0-100
    physicalDemand: number;  // 0-100
    temporalDemand: number;  // 0-100
    performance: number;     // 0-100 (inverted: higher = worse)
    effort: number;          // 0-100
    frustration: number;     // 0-100
  };

  // Optional: Break information
  breaks?: Array<{
    startTimestamp: string;
    endTimestamp: string;
    durationMinutes: number;
  }>;
}

// =============================================================================
// WORKLOAD CALCULATOR
// =============================================================================

/**
 * Calculate comprehensive workload metrics based on Macknik research
 */
export function calculateWorkloadMetrics(input: WorkloadInput): WorkloadMetrics {
  const sessionStart = new Date(input.sessionStartTimestamp);
  const currentTime = new Date(input.currentTimestamp);

  // Calculate session duration
  const sessionDurationMs = currentTime.getTime() - sessionStart.getTime();
  const sessionDurationMinutes = sessionDurationMs / (1000 * 60);

  // Calculate effective working time (subtract breaks)
  let breakTimeMinutes = 0;
  if (input.breaks) {
    breakTimeMinutes = input.breaks.reduce((sum, b) => sum + b.durationMinutes, 0);
  }
  const effectiveWorkingMinutes = Math.max(1, sessionDurationMinutes - breakTimeMinutes);

  // Calculate cases per hour
  const casesPerHour = input.casesCompletedInSession > 0
    ? (input.casesCompletedInSession / effectiveWorkingMinutes) * 60
    : 0;

  // Calculate average time per case
  const averageTimePerCaseMinutes = input.casesCompletedInSession > 0
    ? effectiveWorkingMinutes / input.casesCompletedInSession
    : 0;

  // Determine threshold status
  const thresholdResult = determineThresholdStatus(casesPerHour, sessionDurationMinutes);

  // Calculate fatigue index
  const fatigueResult = calculateFatigueIndex(
    sessionDurationMinutes,
    input.casesCompletedInSession,
    input.currentCaseIndex,
    input.nasaTlxData
  );

  // Calculate Macknik-specific thresholds
  const percentOfLimit = (casesPerHour / MACKNIK_MAX_CASES_PER_HOUR) * 100;

  // Process NASA-TLX if available
  let nasaTlx: WorkloadMetrics['nasaTlx'] | undefined;
  if (input.nasaTlxData) {
    nasaTlx = {
      mentalDemand: input.nasaTlxData.mentalDemand,
      physicalDemand: input.nasaTlxData.physicalDemand,
      temporalDemand: input.nasaTlxData.temporalDemand,
      performance: input.nasaTlxData.performance,
      effort: input.nasaTlxData.effort,
      frustration: input.nasaTlxData.frustration,
      rawScore: calculateNasaTlxScore(input.nasaTlxData)
    };
  }

  // Generate conclusion
  const conclusion = generateWorkloadConclusion(
    thresholdResult.status,
    fatigueResult.level,
    casesPerHour
  );

  return {
    casesCompletedInSession: input.casesCompletedInSession,
    totalSessionCases: input.totalSessionCases,
    sessionDurationMinutes: Math.round(sessionDurationMinutes * 10) / 10,
    averageTimePerCaseMinutes: Math.round(averageTimePerCaseMinutes * 10) / 10,
    casesPerHour: Math.round(casesPerHour * 10) / 10,

    thresholdStatus: thresholdResult.status,
    thresholdStatusExplanation: thresholdResult.explanation,

    fatigueIndex: fatigueResult.index,
    fatigueLevel: fatigueResult.level,

    sessionPosition: input.currentCaseIndex + 1,
    percentThroughSession: input.totalSessionCases > 0
      ? Math.round((input.currentCaseIndex / input.totalSessionCases) * 100)
      : 0,

    macknikThresholds: {
      casesPerHourLimit: MACKNIK_MAX_CASES_PER_HOUR,
      currentCasesPerHour: Math.round(casesPerHour * 10) / 10,
      exceedsLimit: casesPerHour > MACKNIK_MAX_CASES_PER_HOUR,
      percentOfLimit: Math.round(percentOfLimit)
    },

    nasaTlx,

    scientificBasis: generateScientificBasis(casesPerHour, sessionDurationMinutes),
    conclusion
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function determineThresholdStatus(
  casesPerHour: number,
  sessionDurationMinutes: number
): { status: 'GREEN' | 'YELLOW' | 'RED'; explanation: string } {
  // RED conditions: Exceeds Macknik limits or extended session without break
  if (casesPerHour > MACKNIK_MAX_CASES_PER_HOUR) {
    return {
      status: 'RED',
      explanation: `Case rate of ${casesPerHour.toFixed(1)} cases/hour exceeds Macknik threshold of ${MACKNIK_MAX_CASES_PER_HOUR} cases/hour.`
    };
  }

  if (sessionDurationMinutes > MAX_CONTINUOUS_SESSION_MINUTES) {
    return {
      status: 'RED',
      explanation: `Session duration of ${sessionDurationMinutes.toFixed(0)} minutes exceeds recommended maximum of ${MAX_CONTINUOUS_SESSION_MINUTES} minutes.`
    };
  }

  // YELLOW conditions: Approaching limits
  if (casesPerHour > MACKNIK_MAX_CASES_PER_HOUR * 0.8) {
    return {
      status: 'YELLOW',
      explanation: `Case rate of ${casesPerHour.toFixed(1)} cases/hour is approaching Macknik threshold of ${MACKNIK_MAX_CASES_PER_HOUR} cases/hour.`
    };
  }

  if (sessionDurationMinutes > RECOMMENDED_BREAK_INTERVAL) {
    return {
      status: 'YELLOW',
      explanation: `Session duration of ${sessionDurationMinutes.toFixed(0)} minutes exceeds recommended break interval of ${RECOMMENDED_BREAK_INTERVAL} minutes.`
    };
  }

  // GREEN: Within all recommended limits
  return {
    status: 'GREEN',
    explanation: `Workload is within recommended limits (${casesPerHour.toFixed(1)} cases/hour, ${sessionDurationMinutes.toFixed(0)} minutes).`
  };
}

function calculateFatigueIndex(
  sessionDurationMinutes: number,
  casesCompleted: number,
  currentCaseIndex: number,
  nasaTlxData?: WorkloadInput['nasaTlxData']
): { index: number; level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' } {
  // Base fatigue from session duration (increases with time)
  const durationFatigue = Math.min(40, (sessionDurationMinutes / MAX_CONTINUOUS_SESSION_MINUTES) * 40);

  // Case load fatigue
  const caseLoadFatigue = Math.min(30, (casesCompleted / 50) * 30);

  // Position in session fatigue (later cases are harder)
  const positionFatigue = Math.min(15, (currentCaseIndex / 50) * 15);

  // NASA-TLX contribution if available
  let tlxFatigue = 0;
  if (nasaTlxData) {
    const tlxScore = calculateNasaTlxScore(nasaTlxData);
    tlxFatigue = Math.min(15, (tlxScore / 100) * 15);
  }

  const totalFatigue = Math.round(durationFatigue + caseLoadFatigue + positionFatigue + tlxFatigue);
  const clampedFatigue = Math.min(100, Math.max(0, totalFatigue));

  let level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  if (clampedFatigue >= FATIGUE_THRESHOLDS.CRITICAL) {
    level = 'CRITICAL';
  } else if (clampedFatigue >= FATIGUE_THRESHOLDS.HIGH) {
    level = 'HIGH';
  } else if (clampedFatigue >= FATIGUE_THRESHOLDS.MODERATE) {
    level = 'MODERATE';
  } else {
    level = 'LOW';
  }

  return { index: clampedFatigue, level };
}

function calculateNasaTlxScore(nasaTlxData: NonNullable<WorkloadInput['nasaTlxData']>): number {
  // Raw TLX is the average of all six dimensions
  // Note: Performance is inverted (lower is better), so we invert it for the score
  const invertedPerformance = 100 - nasaTlxData.performance;
  const sum = nasaTlxData.mentalDemand +
              nasaTlxData.physicalDemand +
              nasaTlxData.temporalDemand +
              invertedPerformance +
              nasaTlxData.effort +
              nasaTlxData.frustration;
  return Math.round(sum / 6);
}

function generateScientificBasis(casesPerHour: number, sessionDurationMinutes: number): string {
  const parts: string[] = [];

  parts.push(`Macknik et al. (2022) established that radiologist performance degrades ` +
    `significantly beyond ${MACKNIK_MAX_CASES_PER_HOUR} cases/hour.`);

  if (casesPerHour <= MACKNIK_MAX_CASES_PER_HOUR) {
    parts.push(`At ${casesPerHour.toFixed(1)} cases/hour, this session was well within recommended workload limits.`);
  } else {
    parts.push(`At ${casesPerHour.toFixed(1)} cases/hour, this session exceeded the recommended limit, ` +
      `which is associated with a 2.3x increase in error rates.`);
  }

  if (sessionDurationMinutes > 120) {
    parts.push(`Extended session duration (${Math.round(sessionDurationMinutes)} minutes) may contribute ` +
      `to cognitive fatigue per sustained attention research.`);
  }

  return parts.join(' ');
}

function generateWorkloadConclusion(
  thresholdStatus: 'GREEN' | 'YELLOW' | 'RED',
  fatigueLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL',
  casesPerHour: number
): string {
  if (thresholdStatus === 'GREEN' && (fatigueLevel === 'LOW' || fatigueLevel === 'MODERATE')) {
    return 'Cognitive fatigue was not a contributing factor to this error.';
  }

  if (thresholdStatus === 'RED' || fatigueLevel === 'CRITICAL') {
    return `Workload exceeded recommended limits. Cognitive fatigue may have been ` +
      `a contributing factor and warrants consideration in error analysis.`;
  }

  if (thresholdStatus === 'YELLOW' || fatigueLevel === 'HIGH') {
    return `Workload was approaching recommended limits. Cognitive fatigue is unlikely ` +
      `to be a primary contributing factor but should be considered.`;
  }

  return 'Workload was within acceptable parameters.';
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format workload metrics for legal presentation
 */
export function formatWorkloadForLegal(metrics: WorkloadMetrics): string {
  const lines: string[] = [];

  lines.push('COGNITIVE LOAD ANALYSIS');
  lines.push('');
  lines.push('Session Workload at Time of Error:');
  lines.push('');
  lines.push(`  Cases completed: ${metrics.casesCompletedInSession} of ${metrics.totalSessionCases}`);
  lines.push(`  Session duration: ${formatDuration(metrics.sessionDurationMinutes)}`);
  lines.push(`  Average time per case: ${metrics.averageTimePerCaseMinutes.toFixed(1)} minutes`);
  lines.push(`  Cases per hour: ${metrics.casesPerHour.toFixed(1)}`);
  lines.push('');
  lines.push(`MACKNIK THRESHOLD STATUS: ${metrics.thresholdStatus} (${metrics.thresholdStatusExplanation})`);
  lines.push(`FATIGUE INDEX: ${metrics.fatigueIndex}/100 (${metrics.fatigueLevel})`);
  lines.push('');
  lines.push('SCIENTIFIC BASIS:');
  lines.push(metrics.scientificBasis);
  lines.push('');
  lines.push('CONCLUSION:');
  lines.push(metrics.conclusion);

  return lines.join('\n');
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) {
    return `${mins} min`;
  }
  return `${hours}h ${mins}min`;
}

/**
 * Get status color for UI display
 */
export function getWorkloadStatusColor(status: 'GREEN' | 'YELLOW' | 'RED'): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'GREEN':
      return { bg: '#dcfce7', text: '#166534', border: '#22c55e' };
    case 'YELLOW':
      return { bg: '#fef9c3', text: '#854d0e', border: '#eab308' };
    case 'RED':
      return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
  }
}

/**
 * Get fatigue level color for UI display
 */
export function getFatigueLevelColor(level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'): {
  bg: string;
  text: string;
  border: string;
} {
  switch (level) {
    case 'LOW':
      return { bg: '#dcfce7', text: '#166534', border: '#22c55e' };
    case 'MODERATE':
      return { bg: '#fef9c3', text: '#854d0e', border: '#eab308' };
    case 'HIGH':
      return { bg: '#fed7aa', text: '#9a3412', border: '#f97316' };
    case 'CRITICAL':
      return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
  }
}
