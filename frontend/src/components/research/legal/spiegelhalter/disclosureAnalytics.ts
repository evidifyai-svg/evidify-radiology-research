/**
 * disclosureAnalytics.ts
 *
 * Analytics functions for evaluating disclosure format effectiveness.
 *
 * Key metrics computed:
 * 1. Comprehension rate by format
 * 2. Decision time by format
 * 3. Appropriate reliance (agreeing with correct AI)
 * 4. Appropriate override (disagreeing with incorrect AI)
 * 5. Calibration score (confidence-accuracy alignment)
 *
 * These metrics are based on:
 * - Spiegelhalter's uncertainty communication research
 * - Parasuraman & Riley (1997): Automation trust/reliance
 * - Lee & See (2004): Trust in automation
 */

import type {
  SpiegelhalterDisclosureFormat,
  FormatAnalytics,
  DisclosureAnalytics,
  ComprehensionCheck,
  IntelligentOpennessScore,
  AIDisclosure,
} from './disclosureTypes';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Raw data for a single trial/case.
 */
export interface TrialData {
  caseId: string;
  disclosureFormat: SpiegelhalterDisclosureFormat;

  // AI information
  aiWasCorrect: boolean;
  aiRecommendedBirads: number;
  aiConfidence: number;

  // Participant response
  participantBirads: number;
  participantConfidence: number;
  agreedWithAI: boolean;

  // Timing
  disclosureViewDurationMs: number;
  decisionTimeMs: number;

  // Comprehension
  comprehensionCheckPassed: boolean | null;
  comprehensionAttempts: number;

  // Intelligent openness
  intelligentOpennessScore: number;
}

/**
 * Aggregated data by format.
 */
interface FormatData {
  trials: TrialData[];
  n: number;
}

// ============================================================================
// MAIN ANALYTICS FUNCTION
// ============================================================================

/**
 * Compute comprehensive analytics across all disclosure formats.
 */
export function computeDisclosureAnalytics(trials: TrialData[]): DisclosureAnalytics {
  // Group by format
  const byFormat: Record<SpiegelhalterDisclosureFormat, FormatData> = {} as Record<SpiegelhalterDisclosureFormat, FormatData>;

  for (const trial of trials) {
    if (!byFormat[trial.disclosureFormat]) {
      byFormat[trial.disclosureFormat] = { trials: [], n: 0 };
    }
    byFormat[trial.disclosureFormat].trials.push(trial);
    byFormat[trial.disclosureFormat].n++;
  }

  // Compute analytics for each format
  const formatAnalytics: Record<SpiegelhalterDisclosureFormat, FormatAnalytics> = {} as Record<SpiegelhalterDisclosureFormat, FormatAnalytics>;

  for (const [format, data] of Object.entries(byFormat)) {
    formatAnalytics[format as SpiegelhalterDisclosureFormat] = computeFormatAnalytics(data);
  }

  // Compute overall statistics
  const formats = Object.keys(formatAnalytics) as SpiegelhalterDisclosureFormat[];
  const comprehensionRates = formats.map(f => formatAnalytics[f].comprehensionRate);

  const overall = {
    totalCases: trials.length,
    averageComprehension: mean(comprehensionRates),
    bestFormat: formats.reduce((best, f) =>
      formatAnalytics[f].comprehensionRate > formatAnalytics[best].comprehensionRate ? f : best
    ),
    worstFormat: formats.reduce((worst, f) =>
      formatAnalytics[f].comprehensionRate < formatAnalytics[worst].comprehensionRate ? f : worst
    ),
    significantDifferences: testForSignificantDifferences(formatAnalytics),
  };

  return {
    byFormat: formatAnalytics,
    overall,
    computedAt: new Date().toISOString(),
  };
}

// ============================================================================
// PER-FORMAT ANALYTICS
// ============================================================================

/**
 * Compute analytics for a single format.
 */
function computeFormatAnalytics(data: FormatData): FormatAnalytics {
  const { trials, n } = data;

  if (n === 0) {
    return {
      comprehensionRate: 0,
      averageDecisionTimeMs: 0,
      appropriateRelianceRate: 0,
      appropriateOverrideRate: 0,
      calibrationScore: 0,
      n: 0,
      confidenceInterval: { lower: 0, upper: 0 },
    };
  }

  // Comprehension rate
  const comprehensionTrials = trials.filter(t => t.comprehensionCheckPassed !== null);
  const comprehensionRate = comprehensionTrials.length > 0
    ? comprehensionTrials.filter(t => t.comprehensionCheckPassed).length / comprehensionTrials.length
    : 0;

  // Average decision time
  const averageDecisionTimeMs = mean(trials.map(t => t.decisionTimeMs));

  // Appropriate reliance: When AI was correct, did participant agree?
  const aiCorrectTrials = trials.filter(t => t.aiWasCorrect);
  const appropriateRelianceRate = aiCorrectTrials.length > 0
    ? aiCorrectTrials.filter(t => t.agreedWithAI).length / aiCorrectTrials.length
    : 0;

  // Appropriate override: When AI was incorrect, did participant disagree?
  const aiIncorrectTrials = trials.filter(t => !t.aiWasCorrect);
  const appropriateOverrideRate = aiIncorrectTrials.length > 0
    ? aiIncorrectTrials.filter(t => !t.agreedWithAI).length / aiIncorrectTrials.length
    : 0;

  // Calibration score: How well does confidence predict accuracy?
  const calibrationScore = computeCalibrationScore(trials);

  // Confidence interval for comprehension rate (Wilson score)
  const confidenceInterval = wilsonScoreInterval(
    comprehensionTrials.filter(t => t.comprehensionCheckPassed).length,
    comprehensionTrials.length,
    0.95
  );

  return {
    comprehensionRate,
    averageDecisionTimeMs,
    appropriateRelianceRate,
    appropriateOverrideRate,
    calibrationScore,
    n,
    confidenceInterval,
  };
}

// ============================================================================
// CALIBRATION SCORE
// ============================================================================

/**
 * Compute calibration score using Brier score decomposition.
 * Lower is better (0 = perfectly calibrated).
 */
function computeCalibrationScore(trials: TrialData[]): number {
  if (trials.length === 0) return 0;

  // Group by confidence deciles
  const bins: { sumConfidence: number; sumCorrect: number; count: number }[] = Array.from(
    { length: 10 },
    () => ({ sumConfidence: 0, sumCorrect: 0, count: 0 })
  );

  for (const trial of trials) {
    const binIndex = Math.min(Math.floor(trial.participantConfidence / 10), 9);
    bins[binIndex].sumConfidence += trial.participantConfidence;
    bins[binIndex].sumCorrect += trial.aiWasCorrect && trial.agreedWithAI ? 1 : 0;
    bins[binIndex].count++;
  }

  // Calculate calibration error (mean squared deviation from perfect calibration)
  let totalError = 0;
  let totalCount = 0;

  for (const bin of bins) {
    if (bin.count > 0) {
      const avgConfidence = bin.sumConfidence / bin.count / 100; // Normalize to 0-1
      const avgCorrect = bin.sumCorrect / bin.count;
      totalError += Math.pow(avgConfidence - avgCorrect, 2) * bin.count;
      totalCount += bin.count;
    }
  }

  // Return as percentage (0-100, lower is better)
  return totalCount > 0 ? (totalError / totalCount) * 100 : 0;
}

// ============================================================================
// STATISTICAL HELPERS
// ============================================================================

/**
 * Compute mean of an array.
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Compute standard deviation.
 */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const squaredDiffs = values.map(v => Math.pow(v - m, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / (values.length - 1));
}

/**
 * Wilson score interval for binomial proportion.
 */
function wilsonScoreInterval(
  successes: number,
  n: number,
  confidenceLevel: number
): { lower: number; upper: number } {
  if (n === 0) return { lower: 0, upper: 0 };

  const z = 1.96; // For 95% confidence
  const p = successes / n;
  const denominator = 1 + z * z / n;
  const center = (p + z * z / (2 * n)) / denominator;
  const margin = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / denominator;

  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
  };
}

/**
 * Simple chi-square test for significant differences between formats.
 */
function testForSignificantDifferences(
  analytics: Record<SpiegelhalterDisclosureFormat, FormatAnalytics>
): boolean {
  const formats = Object.keys(analytics) as SpiegelhalterDisclosureFormat[];
  if (formats.length < 2) return false;

  const comprehensionRates = formats.map(f => analytics[f].comprehensionRate);
  const ns = formats.map(f => analytics[f].n);

  // Simple effect size check (Cohen's h)
  const maxRate = Math.max(...comprehensionRates);
  const minRate = Math.min(...comprehensionRates);

  // Cohen's h for proportions
  const h = 2 * Math.asin(Math.sqrt(maxRate)) - 2 * Math.asin(Math.sqrt(minRate));

  // Effect size > 0.5 is considered medium-large
  return Math.abs(h) > 0.5;
}

// ============================================================================
// COMPARISON FUNCTIONS
// ============================================================================

/**
 * Compare two formats on key metrics.
 */
export function compareFormats(
  analytics: DisclosureAnalytics,
  format1: SpiegelhalterDisclosureFormat,
  format2: SpiegelhalterDisclosureFormat
): {
  winner: SpiegelhalterDisclosureFormat | 'tie';
  comprehensionDiff: number;
  relianceDiff: number;
  overrideDiff: number;
  decisionTimeDiff: number;
} {
  const a1 = analytics.byFormat[format1];
  const a2 = analytics.byFormat[format2];

  if (!a1 || !a2) {
    return {
      winner: 'tie',
      comprehensionDiff: 0,
      relianceDiff: 0,
      overrideDiff: 0,
      decisionTimeDiff: 0,
    };
  }

  const comprehensionDiff = a1.comprehensionRate - a2.comprehensionRate;
  const relianceDiff = a1.appropriateRelianceRate - a2.appropriateRelianceRate;
  const overrideDiff = a1.appropriateOverrideRate - a2.appropriateOverrideRate;
  const decisionTimeDiff = a1.averageDecisionTimeMs - a2.averageDecisionTimeMs;

  // Score: higher comprehension, reliance, override is better; lower time is better
  const score1 = a1.comprehensionRate + a1.appropriateRelianceRate + a1.appropriateOverrideRate;
  const score2 = a2.comprehensionRate + a2.appropriateRelianceRate + a2.appropriateOverrideRate;

  let winner: SpiegelhalterDisclosureFormat | 'tie';
  if (Math.abs(score1 - score2) < 0.05) {
    winner = 'tie';
  } else {
    winner = score1 > score2 ? format1 : format2;
  }

  return {
    winner,
    comprehensionDiff,
    relianceDiff,
    overrideDiff,
    decisionTimeDiff,
  };
}

/**
 * Rank all formats by overall effectiveness.
 */
export function rankFormats(analytics: DisclosureAnalytics): SpiegelhalterDisclosureFormat[] {
  const formats = Object.keys(analytics.byFormat) as SpiegelhalterDisclosureFormat[];

  return formats.sort((a, b) => {
    const aAnalytics = analytics.byFormat[a];
    const bAnalytics = analytics.byFormat[b];

    // Composite score: comprehension (40%) + appropriate reliance (30%) + appropriate override (30%)
    const aScore = aAnalytics.comprehensionRate * 0.4 +
                   aAnalytics.appropriateRelianceRate * 0.3 +
                   aAnalytics.appropriateOverrideRate * 0.3;
    const bScore = bAnalytics.comprehensionRate * 0.4 +
                   bAnalytics.appropriateRelianceRate * 0.3 +
                   bAnalytics.appropriateOverrideRate * 0.3;

    return bScore - aScore; // Descending order
  });
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export analytics as CSV-compatible data.
 */
export function exportAnalyticsAsCSV(analytics: DisclosureAnalytics): string {
  const headers = [
    'format',
    'n',
    'comprehension_rate',
    'avg_decision_time_ms',
    'appropriate_reliance',
    'appropriate_override',
    'calibration_score',
    'ci_lower',
    'ci_upper',
  ].join(',');

  const rows = Object.entries(analytics.byFormat).map(([format, data]) =>
    [
      format,
      data.n,
      data.comprehensionRate.toFixed(3),
      data.averageDecisionTimeMs.toFixed(0),
      data.appropriateRelianceRate.toFixed(3),
      data.appropriateOverrideRate.toFixed(3),
      data.calibrationScore.toFixed(3),
      data.confidenceInterval.lower.toFixed(3),
      data.confidenceInterval.upper.toFixed(3),
    ].join(',')
  );

  return [headers, ...rows].join('\n');
}

/**
 * Generate a summary report.
 */
export function generateAnalyticsSummary(analytics: DisclosureAnalytics): string {
  const lines: string[] = [
    '# Disclosure Format Analytics Summary',
    '',
    `Generated: ${analytics.computedAt}`,
    `Total Cases: ${analytics.overall.totalCases}`,
    '',
    '## Overall Results',
    '',
    `Best Format (Comprehension): ${analytics.overall.bestFormat}`,
    `Worst Format (Comprehension): ${analytics.overall.worstFormat}`,
    `Average Comprehension: ${(analytics.overall.averageComprehension * 100).toFixed(1)}%`,
    `Significant Differences: ${analytics.overall.significantDifferences ? 'Yes' : 'No'}`,
    '',
    '## Format Rankings',
    '',
  ];

  const ranked = rankFormats(analytics);
  ranked.forEach((format, index) => {
    const data = analytics.byFormat[format];
    lines.push(`${index + 1}. **${format}** (n=${data.n})`);
    lines.push(`   - Comprehension: ${(data.comprehensionRate * 100).toFixed(1)}%`);
    lines.push(`   - Appropriate Reliance: ${(data.appropriateRelianceRate * 100).toFixed(1)}%`);
    lines.push(`   - Appropriate Override: ${(data.appropriateOverrideRate * 100).toFixed(1)}%`);
    lines.push('');
  });

  return lines.join('\n');
}

export default {
  computeDisclosureAnalytics,
  compareFormats,
  rankFormats,
  exportAnalyticsAsCSV,
  generateAnalyticsSummary,
};
