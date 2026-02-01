/**
 * Wolfe Error Taxonomy Analytics
 *
 * Aggregate analytics and statistical analysis for Wolfe error classifications
 * across multiple sessions and cases. Provides insights into error patterns,
 * correlations, and trends for research and quality improvement.
 *
 * @see Wolfe, J.M. et al. (2022). Normal Blindness. Trends in Cognitive Sciences.
 */

import type {
  WolfeErrorClassification,
  WolfeErrorType,
  LiabilityLevel,
} from './wolfeErrorTypes';

import { EXPECTED_MISS_RATES, ERROR_TYPE_DISPLAY, WOLFE_THRESHOLDS } from './wolfeThresholds';

/**
 * Aggregate analytics for Wolfe error classifications
 */
export interface WolfeAnalytics {
  /** Total number of errors analyzed */
  totalErrors: number;

  /** Number of correct classifications (no error) */
  totalCorrect: number;

  /** Count by error type */
  byType: Record<WolfeErrorType, number>;

  /** Percentage by error type */
  byTypePercent: Record<WolfeErrorType, number>;

  /** Count by liability level */
  byLiability: Record<LiabilityLevel, number>;

  /** Average classification confidence */
  averageConfidence: number;

  /** Confidence distribution */
  confidenceDistribution: {
    low: number;    // < 0.6
    moderate: number; // 0.6-0.85
    high: number;   // > 0.85
  };

  /** Statistical correlations */
  correlations: {
    /** Correlation between search errors and viewport coverage */
    searchErrorsVsCoverage: number;

    /** Correlation between recognition errors and dwell time */
    recognitionErrorsVsDwellTime: number;

    /** Correlation between prevalence effect and study prevalence */
    prevalenceEffectCorrelation: number;

    /** Correlation between decision errors and documentation */
    decisionErrorsVsDocumentation: number;
  };

  /** Comparison to expected rates from research */
  comparisonToExpected: {
    searchErrorDeviation: number;
    recognitionErrorDeviation: number;
    decisionErrorDeviation: number;
    otherErrorDeviation: number;
    overallAlignment: 'HIGH' | 'MODERATE' | 'LOW';
  };

  /** Time-based trends */
  trends?: {
    /** Error rates over time (if timestamps available) */
    errorRateOverTime: { timestamp: string; rate: number }[];

    /** Confidence trend */
    confidenceTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  };
}

/**
 * Per-radiologist analytics
 */
export interface RadiologistAnalytics {
  /** Radiologist identifier */
  radiologistId: string;

  /** Total cases analyzed */
  totalCases: number;

  /** Total errors */
  totalErrors: number;

  /** Error rate */
  errorRate: number;

  /** Error type distribution */
  errorDistribution: Record<WolfeErrorType, number>;

  /** Primary error type (most common) */
  primaryErrorType: WolfeErrorType;

  /** Average viewing time for misses */
  averageMissDwellTimeMs: number;

  /** Liability exposure */
  liabilityProfile: {
    lowCount: number;
    moderateCount: number;
    highCount: number;
    overallRisk: LiabilityLevel;
  };

  /** Comparison to peer group */
  peerComparison?: {
    percentile: number;
    aboveAverageIn: WolfeErrorType[];
    belowAverageIn: WolfeErrorType[];
  };
}

/**
 * Session analytics summary
 */
export interface SessionAnalytics {
  /** Session identifier */
  sessionId: string;

  /** Total findings in session */
  totalFindings: number;

  /** Correctly identified */
  correctlyIdentified: number;

  /** Missed findings */
  missedFindings: number;

  /** Error classifications for misses */
  errorClassifications: WolfeErrorClassification[];

  /** Session-level metrics */
  metrics: {
    accuracyRate: number;
    averageConfidence: number;
    dominantErrorType: WolfeErrorType | null;
    liabilityExposure: LiabilityLevel;
  };
}

/**
 * Computes aggregate analytics from a collection of classifications
 */
export function computeWolfeAnalytics(
  classifications: WolfeErrorClassification[]
): WolfeAnalytics {
  // Initialize counters
  const byType: Record<WolfeErrorType, number> = {
    SEARCH_ERROR: 0,
    RECOGNITION_ERROR: 0,
    DECISION_ERROR: 0,
    SATISFACTION_OF_SEARCH: 0,
    PREVALENCE_EFFECT: 0,
    INATTENTIONAL_BLINDNESS: 0,
    CORRECT: 0,
    UNCLASSIFIABLE: 0,
  };

  const byLiability: Record<LiabilityLevel, number> = {
    LOW: 0,
    MODERATE: 0,
    HIGH: 0,
  };

  let totalConfidence = 0;
  let confidenceLow = 0;
  let confidenceModerate = 0;
  let confidenceHigh = 0;

  // Data for correlations
  const searchErrorCoverages: number[] = [];
  const recognitionErrorDwellTimes: number[] = [];
  const prevalenceEffectPrevalences: number[] = [];
  const decisionErrorDocumentation: { documented: boolean; error: boolean }[] = [];

  // Process each classification
  classifications.forEach((c) => {
    byType[c.errorType]++;
    byLiability[c.liabilityAssessment.level]++;
    totalConfidence += c.confidence;

    // Confidence distribution
    if (c.confidence < 0.6) {
      confidenceLow++;
    } else if (c.confidence < 0.85) {
      confidenceModerate++;
    } else {
      confidenceHigh++;
    }

    // Collect correlation data
    if (c.errorType === 'SEARCH_ERROR' && c.evidence.viewportData) {
      searchErrorCoverages.push(c.evidence.viewportData.coveragePercent ?? 0);
    }

    if (c.errorType === 'RECOGNITION_ERROR' && c.evidence.viewportData) {
      recognitionErrorDwellTimes.push(c.evidence.viewportData.dwellTimeMs);
    }

    if (c.errorType === 'PREVALENCE_EFFECT' && c.evidence.contextData) {
      prevalenceEffectPrevalences.push(c.evidence.contextData.prevalenceInStudy);
    }

    if (c.evidence.decisionData) {
      decisionErrorDocumentation.push({
        documented: c.evidence.decisionData.deviationDocumented,
        error: c.errorType === 'DECISION_ERROR',
      });
    }
  });

  // Calculate totals
  const totalErrors = classifications.filter(
    (c) => c.errorType !== 'CORRECT' && c.errorType !== 'UNCLASSIFIABLE'
  ).length;
  const totalCorrect = byType.CORRECT;
  const total = classifications.length;

  // Calculate percentages
  const byTypePercent: Record<WolfeErrorType, number> = {} as Record<WolfeErrorType, number>;
  (Object.keys(byType) as WolfeErrorType[]).forEach((type) => {
    byTypePercent[type] = total > 0 ? (byType[type] / total) * 100 : 0;
  });

  // Calculate correlations
  const correlations = {
    searchErrorsVsCoverage: calculateCorrelation(
      searchErrorCoverages,
      searchErrorCoverages.map(() => 1) // Simplified - would need non-error coverage for comparison
    ),
    recognitionErrorsVsDwellTime: calculateNegativeCorrelation(recognitionErrorDwellTimes),
    prevalenceEffectCorrelation: calculateNegativeCorrelation(prevalenceEffectPrevalences),
    decisionErrorsVsDocumentation: calculateDocumentationCorrelation(decisionErrorDocumentation),
  };

  // Compare to expected rates
  const actualSearchRate = totalErrors > 0 ? byType.SEARCH_ERROR / totalErrors : 0;
  const actualRecognitionRate = totalErrors > 0 ? byType.RECOGNITION_ERROR / totalErrors : 0;
  const actualDecisionRate = totalErrors > 0 ? byType.DECISION_ERROR / totalErrors : 0;
  const actualOtherRate = totalErrors > 0
    ? (byType.SATISFACTION_OF_SEARCH + byType.PREVALENCE_EFFECT + byType.INATTENTIONAL_BLINDNESS) / totalErrors
    : 0;

  const searchDeviation = Math.abs(actualSearchRate - EXPECTED_MISS_RATES.SEARCH_ERROR);
  const recognitionDeviation = Math.abs(actualRecognitionRate - EXPECTED_MISS_RATES.RECOGNITION_ERROR);
  const decisionDeviation = Math.abs(actualDecisionRate - EXPECTED_MISS_RATES.DECISION_ERROR);
  const otherDeviation = Math.abs(actualOtherRate - EXPECTED_MISS_RATES.OTHER);

  const totalDeviation = searchDeviation + recognitionDeviation + decisionDeviation + otherDeviation;
  const overallAlignment: 'HIGH' | 'MODERATE' | 'LOW' =
    totalDeviation < 0.15 ? 'HIGH' : totalDeviation < 0.30 ? 'MODERATE' : 'LOW';

  return {
    totalErrors,
    totalCorrect,
    byType,
    byTypePercent,
    byLiability,
    averageConfidence: total > 0 ? totalConfidence / total : 0,
    confidenceDistribution: {
      low: confidenceLow,
      moderate: confidenceModerate,
      high: confidenceHigh,
    },
    correlations,
    comparisonToExpected: {
      searchErrorDeviation: searchDeviation,
      recognitionErrorDeviation: recognitionDeviation,
      decisionErrorDeviation: decisionDeviation,
      otherErrorDeviation: otherDeviation,
      overallAlignment,
    },
  };
}

/**
 * Computes per-radiologist analytics
 */
export function computeRadiologistAnalytics(
  classifications: WolfeErrorClassification[],
  radiologistId: string,
  peerData?: WolfeAnalytics
): RadiologistAnalytics {
  const radiologistCases = classifications.filter(
    (c) => c.caseId.includes(radiologistId) // Simplified - would need actual radiologist ID in data
  );

  if (radiologistCases.length === 0) {
    // Use all classifications if no radiologist-specific filtering
    const analytics = computeWolfeAnalytics(classifications);

    const primaryErrorType = (Object.entries(analytics.byType) as [WolfeErrorType, number][])
      .filter(([type]) => type !== 'CORRECT' && type !== 'UNCLASSIFIABLE')
      .sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'UNCLASSIFIABLE';

    return {
      radiologistId,
      totalCases: classifications.length,
      totalErrors: analytics.totalErrors,
      errorRate: classifications.length > 0 ? analytics.totalErrors / classifications.length : 0,
      errorDistribution: analytics.byType,
      primaryErrorType,
      averageMissDwellTimeMs: calculateAverageDwellTime(classifications),
      liabilityProfile: {
        lowCount: analytics.byLiability.LOW,
        moderateCount: analytics.byLiability.MODERATE,
        highCount: analytics.byLiability.HIGH,
        overallRisk: determineOverallRisk(analytics.byLiability),
      },
      peerComparison: peerData ? computePeerComparison(analytics, peerData) : undefined,
    };
  }

  // Compute radiologist-specific analytics
  const analytics = computeWolfeAnalytics(radiologistCases);

  const primaryErrorType = (Object.entries(analytics.byType) as [WolfeErrorType, number][])
    .filter(([type]) => type !== 'CORRECT' && type !== 'UNCLASSIFIABLE')
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'UNCLASSIFIABLE';

  return {
    radiologistId,
    totalCases: radiologistCases.length,
    totalErrors: analytics.totalErrors,
    errorRate: radiologistCases.length > 0 ? analytics.totalErrors / radiologistCases.length : 0,
    errorDistribution: analytics.byType,
    primaryErrorType,
    averageMissDwellTimeMs: calculateAverageDwellTime(radiologistCases),
    liabilityProfile: {
      lowCount: analytics.byLiability.LOW,
      moderateCount: analytics.byLiability.MODERATE,
      highCount: analytics.byLiability.HIGH,
      overallRisk: determineOverallRisk(analytics.byLiability),
    },
    peerComparison: peerData ? computePeerComparison(analytics, peerData) : undefined,
  };
}

/**
 * Computes session-level analytics
 */
export function computeSessionAnalytics(
  classifications: WolfeErrorClassification[],
  sessionId: string
): SessionAnalytics {
  // Try to filter by sessionId, but fall back to all classifications if none match
  const filteredClassifications = classifications.filter(
    (c) => c.caseId.includes(sessionId) // Simplified - would need actual session ID
  );
  const sessionClassifications = filteredClassifications.length > 0
    ? filteredClassifications
    : classifications;

  const correctCount = sessionClassifications.filter((c) => c.errorType === 'CORRECT').length;
  const errorClassifications = sessionClassifications.filter(
    (c) => c.errorType !== 'CORRECT' && c.errorType !== 'UNCLASSIFIABLE'
  );

  const totalFindings = sessionClassifications.length;
  const missedFindings = errorClassifications.length;

  // Calculate dominant error type
  const errorCounts: Partial<Record<WolfeErrorType, number>> = {};
  errorClassifications.forEach((c) => {
    errorCounts[c.errorType] = (errorCounts[c.errorType] ?? 0) + 1;
  });

  const dominantErrorType = (Object.entries(errorCounts) as [WolfeErrorType, number][])
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  // Calculate liability exposure
  const liabilityCounts = {
    LOW: 0,
    MODERATE: 0,
    HIGH: 0,
  };
  sessionClassifications.forEach((c) => {
    liabilityCounts[c.liabilityAssessment.level]++;
  });

  return {
    sessionId,
    totalFindings,
    correctlyIdentified: correctCount,
    missedFindings,
    errorClassifications,
    metrics: {
      accuracyRate: totalFindings > 0 ? correctCount / totalFindings : 1,
      averageConfidence:
        sessionClassifications.length > 0
          ? sessionClassifications.reduce((sum, c) => sum + c.confidence, 0) /
            sessionClassifications.length
          : 0,
      dominantErrorType,
      liabilityExposure: determineOverallRisk(liabilityCounts),
    },
  };
}

/**
 * Generates a research-quality summary report
 */
export function generateAnalyticsSummary(analytics: WolfeAnalytics): string {
  const lines: string[] = [];

  lines.push('WOLFE ERROR TAXONOMY ANALYTICS SUMMARY');
  lines.push('═'.repeat(50));
  lines.push('');

  // Overview
  lines.push('OVERVIEW');
  lines.push('─'.repeat(30));
  lines.push(`Total Classifications: ${analytics.totalErrors + analytics.totalCorrect}`);
  lines.push(`Total Errors: ${analytics.totalErrors}`);
  lines.push(`Total Correct: ${analytics.totalCorrect}`);
  lines.push(`Average Confidence: ${(analytics.averageConfidence * 100).toFixed(1)}%`);
  lines.push('');

  // Distribution by type
  lines.push('ERROR TYPE DISTRIBUTION');
  lines.push('─'.repeat(30));
  (Object.entries(analytics.byType) as [WolfeErrorType, number][])
    .filter(([type]) => type !== 'CORRECT' && type !== 'UNCLASSIFIABLE')
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      const percent = analytics.byTypePercent[type];
      const expected = getExpectedRate(type) * 100;
      const bar = '█'.repeat(Math.round(percent / 5));
      lines.push(
        `${type.padEnd(25)} ${count.toString().padStart(4)} (${percent.toFixed(1).padStart(5)}%) ${bar}`
      );
      if (expected > 0) {
        lines.push(`  Expected: ${expected.toFixed(1)}% | Deviation: ${Math.abs(percent - expected).toFixed(1)}%`);
      }
    });
  lines.push('');

  // Liability distribution
  lines.push('LIABILITY DISTRIBUTION');
  lines.push('─'.repeat(30));
  lines.push(`LOW:      ${analytics.byLiability.LOW}`);
  lines.push(`MODERATE: ${analytics.byLiability.MODERATE}`);
  lines.push(`HIGH:     ${analytics.byLiability.HIGH}`);
  lines.push('');

  // Confidence distribution
  lines.push('CONFIDENCE DISTRIBUTION');
  lines.push('─'.repeat(30));
  lines.push(`Low (<60%):       ${analytics.confidenceDistribution.low}`);
  lines.push(`Moderate (60-85%): ${analytics.confidenceDistribution.moderate}`);
  lines.push(`High (>85%):      ${analytics.confidenceDistribution.high}`);
  lines.push('');

  // Comparison to expected
  lines.push('COMPARISON TO WOLFE RESEARCH');
  lines.push('─'.repeat(30));
  lines.push(`Overall Alignment: ${analytics.comparisonToExpected.overallAlignment}`);
  lines.push(
    `Search Error Deviation: ${(analytics.comparisonToExpected.searchErrorDeviation * 100).toFixed(1)}%`
  );
  lines.push(
    `Recognition Error Deviation: ${(analytics.comparisonToExpected.recognitionErrorDeviation * 100).toFixed(1)}%`
  );
  lines.push(
    `Decision Error Deviation: ${(analytics.comparisonToExpected.decisionErrorDeviation * 100).toFixed(1)}%`
  );
  lines.push('');

  // Correlations
  lines.push('STATISTICAL CORRELATIONS');
  lines.push('─'.repeat(30));
  lines.push(
    `Search Errors vs Coverage: ${formatCorrelation(analytics.correlations.searchErrorsVsCoverage)}`
  );
  lines.push(
    `Recognition Errors vs Dwell Time: ${formatCorrelation(analytics.correlations.recognitionErrorsVsDwellTime)}`
  );
  lines.push(
    `Prevalence Effect Correlation: ${formatCorrelation(analytics.correlations.prevalenceEffectCorrelation)}`
  );
  lines.push(
    `Decision Errors vs Documentation: ${formatCorrelation(analytics.correlations.decisionErrorsVsDocumentation)}`
  );

  return lines.join('\n');
}

/**
 * Generates data for visualization
 */
export function generateVisualizationData(analytics: WolfeAnalytics): {
  pieChartData: { name: string; value: number; color: string }[];
  barChartData: { type: string; actual: number; expected: number }[];
  liabilityData: { level: string; count: number; color: string }[];
} {
  // Pie chart data for error distribution
  const pieChartData = (Object.entries(analytics.byType) as [WolfeErrorType, number][])
    .filter(([type, count]) => count > 0 && type !== 'CORRECT' && type !== 'UNCLASSIFIABLE')
    .map(([type, count]) => ({
      name: ERROR_TYPE_DISPLAY[type].label,
      value: count,
      color: ERROR_TYPE_DISPLAY[type].color,
    }));

  // Bar chart comparing actual vs expected
  const errorTotal = analytics.totalErrors || 1; // Avoid division by zero
  const barChartData = [
    {
      type: 'Search',
      actual: (analytics.byType.SEARCH_ERROR / errorTotal) * 100,
      expected: EXPECTED_MISS_RATES.SEARCH_ERROR * 100,
    },
    {
      type: 'Recognition',
      actual: (analytics.byType.RECOGNITION_ERROR / errorTotal) * 100,
      expected: EXPECTED_MISS_RATES.RECOGNITION_ERROR * 100,
    },
    {
      type: 'Decision',
      actual: (analytics.byType.DECISION_ERROR / errorTotal) * 100,
      expected: EXPECTED_MISS_RATES.DECISION_ERROR * 100,
    },
    {
      type: 'Other',
      actual:
        ((analytics.byType.SATISFACTION_OF_SEARCH +
          analytics.byType.PREVALENCE_EFFECT +
          analytics.byType.INATTENTIONAL_BLINDNESS) /
          errorTotal) *
        100,
      expected: EXPECTED_MISS_RATES.OTHER * 100,
    },
  ];

  // Liability distribution
  const liabilityData = [
    { level: 'LOW', count: analytics.byLiability.LOW, color: '#22c55e' },
    { level: 'MODERATE', count: analytics.byLiability.MODERATE, color: '#f59e0b' },
    { level: 'HIGH', count: analytics.byLiability.HIGH, color: '#ef4444' },
  ];

  return { pieChartData, barChartData, liabilityData };
}

/**
 * Tracks error classification for a session export
 */
export function trackClassificationForExport(
  classification: WolfeErrorClassification
): object {
  return {
    eventType: 'WOLFE_CLASSIFICATION_COMPUTED',
    timestamp: classification.classifiedAt,
    caseId: classification.caseId,
    findingId: classification.findingId,
    errorType: classification.errorType,
    confidence: classification.confidence,
    liabilityLevel: classification.liabilityAssessment.level,
    hasViewportData: !!classification.evidence.viewportData,
    hasDecisionData: !!classification.evidence.decisionData,
    hasContextData: !!classification.evidence.contextData,
    classifierVersion: classification.classifierVersion,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculates simplified correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * Calculates negative correlation indicator
 * (Higher values should correlate with fewer errors)
 */
function calculateNegativeCorrelation(values: number[]): number {
  if (values.length < 2) return 0;

  // Calculate mean and check if values tend to be low (suggesting negative correlation)
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const expectedMean = 2000; // Expected dwell time for adequate viewing

  // Return normalized difference from expected (negative if below expected)
  const normalized = (mean - expectedMean) / expectedMean;
  return Math.max(-1, Math.min(1, normalized));
}

/**
 * Calculates documentation correlation
 */
function calculateDocumentationCorrelation(
  data: { documented: boolean; error: boolean }[]
): number {
  if (data.length < 2) return 0;

  const documentedErrors = data.filter((d) => d.documented && d.error).length;
  const undocumentedErrors = data.filter((d) => !d.documented && d.error).length;
  const documentedCorrect = data.filter((d) => d.documented && !d.error).length;
  const undocumentedCorrect = data.filter((d) => !d.documented && !d.error).length;

  const totalDocumented = documentedErrors + documentedCorrect;
  const totalUndocumented = undocumentedErrors + undocumentedCorrect;

  if (totalDocumented === 0 || totalUndocumented === 0) return 0;

  const documentedErrorRate = documentedErrors / totalDocumented;
  const undocumentedErrorRate = undocumentedErrors / totalUndocumented;

  // Positive correlation if undocumented has higher error rate
  return undocumentedErrorRate - documentedErrorRate;
}

/**
 * Gets expected miss rate for error type
 */
function getExpectedRate(type: WolfeErrorType): number {
  switch (type) {
    case 'SEARCH_ERROR':
      return EXPECTED_MISS_RATES.SEARCH_ERROR;
    case 'RECOGNITION_ERROR':
      return EXPECTED_MISS_RATES.RECOGNITION_ERROR;
    case 'DECISION_ERROR':
      return EXPECTED_MISS_RATES.DECISION_ERROR;
    default:
      return EXPECTED_MISS_RATES.OTHER / 3; // Split among SOS, prevalence, inattentional
  }
}

/**
 * Formats correlation value for display
 */
function formatCorrelation(value: number): string {
  const strength =
    Math.abs(value) < 0.3
      ? 'weak'
      : Math.abs(value) < 0.7
        ? 'moderate'
        : 'strong';
  const direction = value >= 0 ? 'positive' : 'negative';
  return `${value.toFixed(2)} (${strength} ${direction})`;
}

/**
 * Calculates average dwell time for classifications
 */
function calculateAverageDwellTime(classifications: WolfeErrorClassification[]): number {
  const dwellTimes = classifications
    .filter((c) => c.evidence.viewportData?.dwellTimeMs)
    .map((c) => c.evidence.viewportData!.dwellTimeMs);

  if (dwellTimes.length === 0) return 0;
  return dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length;
}

/**
 * Determines overall risk level from liability counts
 */
function determineOverallRisk(
  counts: Record<LiabilityLevel, number>
): LiabilityLevel {
  const total = counts.LOW + counts.MODERATE + counts.HIGH;
  if (total === 0) return 'LOW';

  // High risk if any HIGH liability cases
  if (counts.HIGH > 0) return 'HIGH';

  // Moderate if significant MODERATE cases
  if (counts.MODERATE / total > 0.3) return 'MODERATE';

  return 'LOW';
}

/**
 * Computes peer comparison
 */
function computePeerComparison(
  individual: WolfeAnalytics,
  peer: WolfeAnalytics
): { percentile: number; aboveAverageIn: WolfeErrorType[]; belowAverageIn: WolfeErrorType[] } {
  const aboveAverageIn: WolfeErrorType[] = [];
  const belowAverageIn: WolfeErrorType[] = [];

  (Object.keys(individual.byTypePercent) as WolfeErrorType[]).forEach((type) => {
    if (type === 'CORRECT' || type === 'UNCLASSIFIABLE') return;

    const indivRate = individual.byTypePercent[type];
    const peerRate = peer.byTypePercent[type];

    if (indivRate > peerRate * 1.1) {
      aboveAverageIn.push(type);
    } else if (indivRate < peerRate * 0.9) {
      belowAverageIn.push(type);
    }
  });

  // Simplified percentile calculation
  const errorRate =
    individual.totalErrors / (individual.totalErrors + individual.totalCorrect);
  const peerErrorRate = peer.totalErrors / (peer.totalErrors + peer.totalCorrect);

  const percentile = errorRate <= peerErrorRate ? 75 : 25; // Simplified

  return { percentile, aboveAverageIn, belowAverageIn };
}
