/**
 * validityIndicators.ts
 *
 * MMPI-inspired validity and response style indicators for Grayson Baird
 *
 * These indicators help identify response patterns that may qualify interpretation:
 * - HRI (Hasty Review Index): Detects rushed pre-AI reviews
 * - CPI (Conformity Pattern Index): Detects high AI agreement rates
 * - DAI (Documentation Avoidance Index): Detects skipped deviation documentation
 * - ENG (Engagement Index): Measures viewer interaction engagement
 */

import { DerivedMetrics } from './ExportPackZip';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type IndicatorLevel = 'NORMAL' | 'MILD' | 'ELEVATED';

export interface ValidityIndicator {
  code: string;
  name: string;
  value: number;
  level: IndicatorLevel;
  interpretation: string;
  color: string; // For traffic-light display
}

export interface ValidityProfile {
  HRI: ValidityIndicator;
  CPI: ValidityIndicator;
  DAI: ValidityIndicator;
  ENG: ValidityIndicator;
  overallValid: boolean;
  flags: string[];
}

export interface InterpretiveSummary {
  engagementStatement: string;
  responsePatternStatement: string;
  aiInfluenceStatement: string;
  cautionStatement: string | null;
  fullText: string;
}

// ============================================================================
// INDICATOR CALCULATIONS
// ============================================================================

/**
 * HRI (Hasty Review Index)
 * Compares pre-AI time to session median
 *
 * Thresholds:
 * - Green (Normal): >= 75% of median
 * - Yellow (Mild): 50-75% of median
 * - Red (Elevated): < 50% of median
 */
export function calculateHRI(
  preAiTimeMs: number,
  sessionMedianPreAiMs: number
): ValidityIndicator {
  if (sessionMedianPreAiMs <= 0) {
    return {
      code: 'HRI',
      name: 'Hasty Review Index',
      value: 100,
      level: 'NORMAL',
      interpretation: 'Within Normal Limits (insufficient data for comparison)',
      color: '#22c55e',
    };
  }

  const ratio = (preAiTimeMs / sessionMedianPreAiMs) * 100;

  let level: IndicatorLevel;
  let interpretation: string;
  let color: string;

  if (ratio >= 75) {
    level = 'NORMAL';
    interpretation = 'Within Normal Limits';
    color = '#22c55e'; // green
  } else if (ratio >= 50) {
    level = 'MILD';
    interpretation = 'Mildly Elevated';
    color = '#f59e0b'; // yellow/amber
  } else {
    level = 'ELEVATED';
    interpretation = 'Elevated - Hasty Review';
    color = '#ef4444'; // red
  }

  return {
    code: 'HRI',
    name: 'Hasty Review Index',
    value: Math.round(ratio),
    level,
    interpretation,
    color,
  };
}

/**
 * CPI (Conformity Pattern Index)
 * Measures AI agreement rate across cases
 *
 * Thresholds:
 * - Green (Normal): < 80% agreement
 * - Yellow (Mild): 80-90% agreement
 * - Red (Elevated): > 90% agreement
 */
export function calculateCPI(
  aiAgreementCount: number,
  totalCasesWithAiDisagreement: number
): ValidityIndicator {
  if (totalCasesWithAiDisagreement === 0) {
    return {
      code: 'CPI',
      name: 'Conformity Pattern Index',
      value: 0,
      level: 'NORMAL',
      interpretation: 'Within Normal Limits (no AI disagreements to evaluate)',
      color: '#22c55e',
    };
  }

  const rate = (aiAgreementCount / totalCasesWithAiDisagreement) * 100;

  let level: IndicatorLevel;
  let interpretation: string;
  let color: string;

  if (rate < 80) {
    level = 'NORMAL';
    interpretation = 'Within Normal Limits';
    color = '#22c55e';
  } else if (rate <= 90) {
    level = 'MILD';
    interpretation = 'Mildly Elevated';
    color = '#f59e0b';
  } else {
    level = 'ELEVATED';
    interpretation = 'Elevated - High Conformity';
    color = '#ef4444';
  }

  return {
    code: 'CPI',
    name: 'Conformity Pattern Index',
    value: Math.round(rate),
    level,
    interpretation,
    color,
  };
}

/**
 * DAI (Documentation Avoidance Index)
 * Tracks whether overrides are documented
 *
 * Thresholds:
 * - Green (Normal): All overrides documented
 * - Red (Elevated): Any override skipped documentation
 */
export function calculateDAI(
  overridesDocumented: number,
  totalOverrides: number
): ValidityIndicator {
  if (totalOverrides === 0) {
    return {
      code: 'DAI',
      name: 'Documentation Avoidance Index',
      value: 0,
      level: 'NORMAL',
      interpretation: 'Within Normal Limits (no overrides requiring documentation)',
      color: '#22c55e',
    };
  }

  const documented = overridesDocumented === totalOverrides;

  return {
    code: 'DAI',
    name: 'Documentation Avoidance Index',
    value: totalOverrides - overridesDocumented,
    level: documented ? 'NORMAL' : 'ELEVATED',
    interpretation: documented
      ? 'Within Normal Limits'
      : 'Elevated - Override(s) Without Rationale',
    color: documented ? '#22c55e' : '#ef4444',
  };
}

/**
 * ENG (Engagement Index)
 * Based on viewer interactions + time
 * Combines zoom/pan counts with viewing time
 *
 * Scoring:
 * - High engagement: Many interactions + adequate time
 * - Low engagement: Few interactions or rushed time
 */
export function calculateENG(
  zoomCount: number,
  panCount: number,
  totalViewingTimeMs: number,
  casesCompleted: number
): ValidityIndicator {
  if (casesCompleted === 0) {
    return {
      code: 'ENG',
      name: 'Engagement Index',
      value: 0,
      level: 'NORMAL',
      interpretation: 'Pending (no cases completed)',
      color: '#64748b',
    };
  }

  // Calculate interactions per case
  const totalInteractions = zoomCount + panCount;
  const interactionsPerCase = totalInteractions / casesCompleted;

  // Calculate average time per case in seconds
  const avgTimePerCaseS = (totalViewingTimeMs / casesCompleted) / 1000;

  // Engagement score: combination of interactions and time
  // Target: ~2+ interactions per case, ~30+ seconds per case
  const interactionScore = Math.min(100, (interactionsPerCase / 2) * 50);
  const timeScore = Math.min(100, (avgTimePerCaseS / 30) * 50);
  const engagementScore = interactionScore + timeScore;

  let level: IndicatorLevel;
  let interpretation: string;
  let color: string;

  if (engagementScore >= 60) {
    level = 'NORMAL';
    interpretation = 'Adequate Engagement';
    color = '#22c55e';
  } else if (engagementScore >= 30) {
    level = 'MILD';
    interpretation = 'Limited Engagement';
    color = '#f59e0b';
  } else {
    level = 'ELEVATED';
    interpretation = 'Minimal Engagement';
    color = '#ef4444';
  }

  return {
    code: 'ENG',
    name: 'Engagement Index',
    value: Math.round(engagementScore),
    level,
    interpretation,
    color,
  };
}

// ============================================================================
// PROFILE COMPUTATION
// ============================================================================

/**
 * Compute full validity profile from case results
 */
export function computeValidityProfile(
  caseResults: DerivedMetrics[],
  currentCasePreAiMs?: number,
  interactionCounts?: { zooms: number; pans: number },
  totalViewingTimeMs?: number
): ValidityProfile {
  // Calculate session median pre-AI time (excluding calibration)
  const nonCalibrationCases = caseResults.filter(r => !(r.caseId ?? '').includes('CALIB'));
  const preAiTimes = nonCalibrationCases
    .map(r => r.preAiReadMs ?? r.timeToLockMs ?? 0)
    .filter(t => t > 0)
    .sort((a, b) => a - b);

  const sessionMedianPreAiMs = preAiTimes.length > 0
    ? preAiTimes[Math.floor(preAiTimes.length / 2)]
    : 30000; // Default 30s if no data

  // HRI: Use current case time if provided, otherwise use last case
  const preAiTime = currentCasePreAiMs ??
    (nonCalibrationCases.length > 0
      ? (nonCalibrationCases[nonCalibrationCases.length - 1].preAiReadMs ??
         nonCalibrationCases[nonCalibrationCases.length - 1].timeToLockMs ?? 0)
      : 0);

  const HRI = calculateHRI(preAiTime, sessionMedianPreAiMs);

  // CPI: Calculate AI agreement rate
  // Cases where AI disagreed with initial assessment but reader changed to match AI
  const casesWithAiDisagreement = nonCalibrationCases.filter(r =>
    r.aiBirads !== null && r.initialBirads !== r.aiBirads
  );
  const aiAgreements = casesWithAiDisagreement.filter(r =>
    r.finalBirads === r.aiBirads
  ).length;

  const CPI = calculateCPI(aiAgreements, casesWithAiDisagreement.length);

  // DAI: Documentation tracking
  const overridesRequired = nonCalibrationCases.filter(r => r.changeOccurred).length;
  const overridesDocumented = nonCalibrationCases.filter(r =>
    r.changeOccurred && r.deviationDocumented
  ).length;

  const DAI = calculateDAI(overridesDocumented, overridesRequired);

  // ENG: Engagement tracking
  const totalInteractions = interactionCounts ?? { zooms: 0, pans: 0 };
  const viewingTime = totalViewingTimeMs ??
    nonCalibrationCases.reduce((sum, r) => sum + (r.totalTimeMs ?? 0), 0);

  const ENG = calculateENG(
    totalInteractions.zooms,
    totalInteractions.pans,
    viewingTime,
    nonCalibrationCases.length
  );

  // Determine overall validity
  const flags: string[] = [];
  if (HRI.level === 'ELEVATED') flags.push('Elevated HRI (Hasty Review)');
  if (CPI.level === 'ELEVATED') flags.push('Elevated CPI (High Conformity)');
  if (DAI.level === 'ELEVATED') flags.push('Elevated DAI (Documentation Avoidance)');
  if (ENG.level === 'ELEVATED') flags.push('Elevated ENG (Minimal Engagement)');

  return {
    HRI,
    CPI,
    DAI,
    ENG,
    overallValid: flags.length === 0,
    flags,
  };
}

// ============================================================================
// INTERPRETIVE SUMMARY GENERATION
// ============================================================================

/**
 * Generate auto-generated interpretive summary text
 * MMPI-style narrative interpretation
 */
export function generateInterpretiveSummary(
  profile: ValidityProfile,
  caseResults: DerivedMetrics[]
): InterpretiveSummary {
  const nonCalibrationCases = caseResults.filter(r => !(r.caseId ?? '').includes('CALIB'));

  if (nonCalibrationCases.length === 0) {
    return {
      engagementStatement: 'No study cases completed.',
      responsePatternStatement: 'Insufficient data for response pattern analysis.',
      aiInfluenceStatement: 'AI influence cannot be assessed without completed cases.',
      cautionStatement: null,
      fullText: 'No study cases completed. Insufficient data for interpretation.',
    };
  }

  // Engagement statement
  const engagementLevel = profile.ENG.level === 'NORMAL'
    ? 'adequate'
    : profile.ENG.level === 'MILD'
      ? 'limited'
      : 'minimal';

  const hasHashyReview = profile.HRI.level !== 'NORMAL';
  const engagementStatement = `Response patterns suggest ${engagementLevel} task engagement${
    hasHashyReview ? '' : ' with no evidence of hasty review'
  }.`;

  // Response pattern statement
  const responsePatternStatement = "The reader's initial classification was recorded prior to AI exposure, supporting interpretability of pre/post influence analyses.";

  // AI influence statement
  const changedCases = nonCalibrationCases.filter(r => r.changeOccurred);
  const changedTowardAi = changedCases.filter(r => r.finalBirads === r.aiBirads).length;
  const changedAwayFromAi = changedCases.filter(r =>
    r.finalBirads !== r.aiBirads && r.aiBirads !== null
  ).length;

  let aiInfluencePattern: string;
  if (changedCases.length === 0) {
    aiInfluencePattern = 'no change';
  } else if (changedTowardAi > changedAwayFromAi) {
    aiInfluencePattern = 'shift toward AI';
  } else if (changedAwayFromAi > changedTowardAi) {
    aiInfluencePattern = 'shift away from AI';
  } else {
    aiInfluencePattern = 'mixed pattern';
  }

  let consistencyInterpretation: string;
  if (aiInfluencePattern === 'no change') {
    consistencyInterpretation = 'independent judgment';
  } else if (aiInfluencePattern === 'shift toward AI') {
    consistencyInterpretation = profile.CPI.level === 'ELEVATED'
      ? 'elevated reliance'
      : 'corrective updating';
  } else if (aiInfluencePattern === 'shift away from AI') {
    consistencyInterpretation = 'independent override';
  } else {
    consistencyInterpretation = 'varied response pattern';
  }

  const aiInfluenceStatement = `Following AI disclosure, the reader's final decision showed ${aiInfluencePattern}, consistent with ${consistencyInterpretation}.`;

  // Caution statement (if flags present)
  let cautionStatement: string | null = null;
  if (profile.flags.length > 0) {
    const flagsText = profile.flags
      .map(f => {
        if (f.includes('HRI')) return 'elevated HRI';
        if (f.includes('CPI')) return 'high conformity pattern';
        if (f.includes('DAI')) return 'documentation avoidance';
        if (f.includes('ENG')) return 'limited engagement';
        return f;
      })
      .join(', ');
    cautionStatement = `Interpretation should be qualified by ${flagsText}.`;
  }

  // Full text
  const fullText = [
    engagementStatement,
    responsePatternStatement,
    aiInfluenceStatement,
    cautionStatement,
  ].filter(Boolean).join(' ');

  return {
    engagementStatement,
    responsePatternStatement,
    aiInfluenceStatement,
    cautionStatement,
    fullText,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get color for indicator level
 */
export function getIndicatorColor(level: IndicatorLevel): string {
  switch (level) {
    case 'NORMAL': return '#22c55e';
    case 'MILD': return '#f59e0b';
    case 'ELEVATED': return '#ef4444';
    default: return '#64748b';
  }
}

/**
 * Get background color for indicator level (lighter shade)
 */
export function getIndicatorBgColor(level: IndicatorLevel): string {
  switch (level) {
    case 'NORMAL': return '#166534';
    case 'MILD': return '#92400e';
    case 'ELEVATED': return '#991b1b';
    default: return '#334155';
  }
}
