/**
 * wolfeClassification.ts
 *
 * Error classification logic based on Dr. Jeremy Wolfe's visual attention research.
 *
 * This module implements Wolfe's taxonomy of visual search errors:
 *
 * 1. SEARCH ERROR (Sampling Error)
 *    - The target region was never fixated/viewed
 *    - "Eyes never landed on the target"
 *    - Corresponds to incomplete visual coverage
 *    Reference: Kundel, H. L., & Nodine, C. F. (1975). "Interpreting chest radiographs
 *    without visual search." Radiology, 116(3), 527-532.
 *
 * 2. RECOGNITION ERROR (Perceptual Error)
 *    - The target region was viewed but the finding was not detected
 *    - "Eyes looked at target but it wasn't recognized"
 *    - Fixation occurred but perception failed
 *    Reference: Drew, T., Vo, M. L. H., & Wolfe, J. M. (2013). "The invisible gorilla
 *    strikes again." Psychological Science, 24(9), 1848-1853.
 *
 * 3. DECISION ERROR (Cognitive Error)
 *    - The finding was detected but incorrectly classified
 *    - "Saw it, recognized it, but made wrong call"
 *    - Perception succeeded but decision-making failed
 *    Reference: Nodine, C. F., & Kundel, H. L. (1987). "Using eye movements to study
 *    visual search and to improve tumor detection." RadioGraphics, 7(6), 1241-1250.
 *
 * This classification is critical for:
 * - Understanding why findings are missed
 * - Designing targeted training interventions
 * - Legal documentation of reading patterns
 * - AI integration research (does AI help with search or recognition?)
 */

import {
  AnatomicalRegion,
  mapLocationToRegions,
  getRegionDisplayName,
  getRegionCode,
} from './anatomicalRegions';
import { RegionCoverage, AttentionSummary } from './useViewportTracking';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Wolfe error type taxonomy.
 */
export type WolfeErrorType =
  | 'SEARCH_ERROR'      // Finding region never viewed
  | 'RECOGNITION_ERROR' // Viewed region but missed finding
  | 'DECISION_ERROR'    // Recognized but wrong assessment
  | 'CORRECT';          // No error

/**
 * Ground truth finding from reference standard.
 */
export interface GroundTruthFinding {
  findingId: string;
  /** Which view the finding appears in */
  viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO';
  /** Normalized location (0-1) */
  location: { x: number; y: number };
  /** Size of finding (for determining required zoom) */
  sizeNormalized?: { width: number; height: number };
  /** Type of finding */
  findingType: 'mass' | 'calcification' | 'asymmetry' | 'distortion' | 'other';
  /** Ground truth assessment */
  groundTruthBirads: number;
  /** Is this finding the main actionable finding? */
  isPrimary: boolean;
  /** Pathology result if available */
  pathology?: 'benign' | 'malignant' | 'unknown';
}

/**
 * Reader's assessment for comparison.
 */
export interface ReaderAssessment {
  caseId: string;
  /** Initial BI-RADS before AI */
  initialBirads: number;
  /** Final BI-RADS after AI (if applicable) */
  finalBirads: number;
  /** Did reader mark any findings? */
  findingsMarked: Array<{
    viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO';
    location: { x: number; y: number };
    confidence: number;
  }>;
  /** Reader's overall confidence */
  confidence: number;
}

/**
 * Complete error classification for a finding.
 */
export interface ErrorClassification {
  findingId: string;
  findingRegion: AnatomicalRegion;
  regionWasViewed: boolean;
  dwellTimeOnRegion: number;
  zoomLevelUsed: number;
  errorType: WolfeErrorType;
  wolfeExplanation: string;
  /** Whether the finding was detected by reader */
  findingDetected: boolean;
  /** Whether reader's assessment matched ground truth */
  assessmentCorrect: boolean;
  /** Metadata for analysis */
  metadata: {
    viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO';
    findingType: string;
    groundTruthBirads: number;
    readerBirads: number;
    coveragePercent: number;
    viewCount: number;
  };
}

/**
 * Summary of error classifications for a case.
 */
export interface WolfeClassificationSummary {
  caseId: string;
  totalFindings: number;
  correctDetections: number;
  searchErrors: number;
  recognitionErrors: number;
  decisionErrors: number;
  overallAccuracy: number;
  classifications: ErrorClassification[];
  /** Recommendations based on error patterns */
  recommendations: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Thresholds for classification decisions.
 */
export interface ClassificationThresholds {
  /** Minimum dwell time (ms) to count as "viewed" */
  minDwellMs: number;
  /** Minimum zoom level for adequate examination of small findings */
  minZoomForSmallFindings: number;
  /** Minimum visibility percentage for region to count as "seen" */
  minVisibilityPercent: number;
  /** Distance threshold for matching marked findings (normalized 0-1) */
  findingMatchDistance: number;
}

const DEFAULT_THRESHOLDS: ClassificationThresholds = {
  minDwellMs: 200,
  minZoomForSmallFindings: 1.5,
  minVisibilityPercent: 30,
  findingMatchDistance: 0.1, // 10% of image dimension
};

// ============================================================================
// CLASSIFICATION FUNCTIONS
// ============================================================================

/**
 * Classify a single finding based on attention data and reader assessment.
 *
 * @param finding - Ground truth finding
 * @param coverage - Region coverage data from viewport tracking
 * @param assessment - Reader's assessment
 * @param thresholds - Classification thresholds
 * @returns Error classification with Wolfe taxonomy
 *
 * Classification logic:
 * 1. Map finding location to anatomical region
 * 2. Check if region was viewed (dwell time >= threshold)
 * 3. Check if finding was detected (reader marked something near it)
 * 4. Check if assessment was correct (BI-RADS matches ground truth threshold)
 */
export function classifyFinding(
  finding: GroundTruthFinding,
  coverage: Map<AnatomicalRegion, RegionCoverage>,
  assessment: ReaderAssessment,
  thresholds: ClassificationThresholds = DEFAULT_THRESHOLDS
): ErrorClassification {
  // Step 1: Map finding to anatomical region
  const regions = mapLocationToRegions(finding.viewKey, finding.location);
  const findingRegion = regions[0] || ('UOQ_' + (finding.viewKey.startsWith('R') ? 'R' : 'L')) as AnatomicalRegion;

  // Step 2: Get coverage for this region
  const regionCoverage = coverage.get(findingRegion);
  const dwellTime = regionCoverage?.totalDwellTimeMs || 0;
  const zoomLevel = regionCoverage?.maxZoomLevel || 1;
  const viewCount = regionCoverage?.viewCount || 0;
  const percentViewed = regionCoverage?.percentageViewed || 0;

  // Determine if region was adequately viewed
  const regionWasViewed = dwellTime >= thresholds.minDwellMs && percentViewed >= thresholds.minVisibilityPercent;

  // Check if small finding required higher zoom
  const findingIsSmall = finding.sizeNormalized &&
    (finding.sizeNormalized.width < 0.05 || finding.sizeNormalized.height < 0.05);
  const adequateZoom = !findingIsSmall || zoomLevel >= thresholds.minZoomForSmallFindings;

  // Step 3: Check if reader detected this finding
  const findingDetected = assessment.findingsMarked.some((marked) => {
    if (marked.viewKey !== finding.viewKey) return false;
    const distance = Math.sqrt(
      Math.pow(marked.location.x - finding.location.x, 2) +
      Math.pow(marked.location.y - finding.location.y, 2)
    );
    return distance <= thresholds.findingMatchDistance;
  });

  // Step 4: Check if assessment was correct
  // For actionable findings (BI-RADS >= 3), reader should have elevated assessment
  const isActionableFinding = finding.groundTruthBirads >= 3;
  const readerActionedCase = assessment.finalBirads >= 3;
  const assessmentCorrect = isActionableFinding === readerActionedCase;

  // Step 5: Classify the error
  let errorType: WolfeErrorType;
  let wolfeExplanation: string;

  if (assessmentCorrect && (!isActionableFinding || findingDetected)) {
    // Correct - either no finding to detect, or finding was detected and actioned appropriately
    errorType = 'CORRECT';
    wolfeExplanation = isActionableFinding
      ? `Finding correctly detected and classified. Reader examined ${getRegionDisplayName(findingRegion)} ` +
        `for ${formatMs(dwellTime)} and correctly elevated assessment to BI-RADS ${assessment.finalBirads}.`
      : `Case correctly assessed as non-actionable (BI-RADS ${assessment.finalBirads}). ` +
        `No actionable findings were present.`;
  } else if (!regionWasViewed || !adequateZoom) {
    // Search Error - region wasn't viewed or zoom was inadequate
    errorType = 'SEARCH_ERROR';
    wolfeExplanation = !regionWasViewed
      ? `SEARCH ERROR (Wolfe): The finding in ${getRegionDisplayName(findingRegion)} was never examined. ` +
        `Region dwell time was only ${formatMs(dwellTime)} (threshold: ${formatMs(thresholds.minDwellMs)}). ` +
        `This represents a sampling failure - the eyes never adequately fixated on the target region.`
      : `SEARCH ERROR (Wolfe): Although ${getRegionDisplayName(findingRegion)} was viewed, ` +
        `zoom level (${zoomLevel.toFixed(1)}x) was insufficient for this ${finding.findingType}. ` +
        `Small findings require at least ${thresholds.minZoomForSmallFindings}x magnification for detection.`;
  } else if (!findingDetected) {
    // Recognition Error - looked but didn't see
    errorType = 'RECOGNITION_ERROR';
    wolfeExplanation = `RECOGNITION ERROR (Wolfe): The finding in ${getRegionDisplayName(findingRegion)} ` +
      `was examined (dwell: ${formatMs(dwellTime)}, zoom: ${zoomLevel.toFixed(1)}x, ${viewCount} view(s)) ` +
      `but was not detected. This represents a perceptual failure - the eyes viewed the target ` +
      `but the ${finding.findingType} was not recognized. Per Drew et al. (2013), this is analogous ` +
      `to "inattentional blindness."`;
  } else {
    // Decision Error - detected but wrong assessment
    errorType = 'DECISION_ERROR';
    wolfeExplanation = `DECISION ERROR (Wolfe): The finding in ${getRegionDisplayName(findingRegion)} ` +
      `was detected and marked by the reader, but the assessment (BI-RADS ${assessment.finalBirads}) ` +
      `does not match the ground truth (BI-RADS ${finding.groundTruthBirads}). ` +
      `This represents a cognitive/decision-making failure - the target was perceived but incorrectly classified.`;
  }

  return {
    findingId: finding.findingId,
    findingRegion,
    regionWasViewed,
    dwellTimeOnRegion: dwellTime,
    zoomLevelUsed: zoomLevel,
    errorType,
    wolfeExplanation,
    findingDetected,
    assessmentCorrect,
    metadata: {
      viewKey: finding.viewKey,
      findingType: finding.findingType,
      groundTruthBirads: finding.groundTruthBirads,
      readerBirads: assessment.finalBirads,
      coveragePercent: percentViewed,
      viewCount,
    },
  };
}

/**
 * Classify all findings for a case and generate summary.
 */
export function classifyCase(
  caseId: string,
  findings: GroundTruthFinding[],
  coverageByView: Map<string, Map<AnatomicalRegion, RegionCoverage>>,
  assessment: ReaderAssessment,
  thresholds: ClassificationThresholds = DEFAULT_THRESHOLDS
): WolfeClassificationSummary {
  const classifications: ErrorClassification[] = [];

  for (const finding of findings) {
    const viewCoverage = coverageByView.get(finding.viewKey);
    if (!viewCoverage) continue;

    const classification = classifyFinding(finding, viewCoverage, assessment, thresholds);
    classifications.push(classification);
  }

  // Aggregate statistics
  const searchErrors = classifications.filter((c) => c.errorType === 'SEARCH_ERROR').length;
  const recognitionErrors = classifications.filter((c) => c.errorType === 'RECOGNITION_ERROR').length;
  const decisionErrors = classifications.filter((c) => c.errorType === 'DECISION_ERROR').length;
  const correctDetections = classifications.filter((c) => c.errorType === 'CORRECT').length;
  const totalFindings = classifications.length;
  const overallAccuracy = totalFindings > 0 ? (correctDetections / totalFindings) * 100 : 100;

  // Generate recommendations
  const recommendations: string[] = [];

  if (searchErrors > 0) {
    recommendations.push(
      `Search pattern training recommended: ${searchErrors} finding(s) were in regions that were not adequately examined. ` +
        `Consider systematic search pattern (e.g., clockwise from 12 o'clock) to ensure complete coverage.`
    );
  }

  if (recognitionErrors > 0) {
    recommendations.push(
      `Perception training recommended: ${recognitionErrors} finding(s) were viewed but not detected. ` +
        `Consider case-based training focused on ${getCommonMissedTypes(classifications)}.`
    );
  }

  if (decisionErrors > 0) {
    recommendations.push(
      `Decision-making calibration recommended: ${decisionErrors} finding(s) were detected but incorrectly classified. ` +
        `Consider BI-RADS lexicon review and calibration exercises.`
    );
  }

  if (recommendations.length === 0 && overallAccuracy >= 90) {
    recommendations.push('Performance meets clinical standards. Continue current reading patterns.');
  }

  return {
    caseId,
    totalFindings,
    correctDetections,
    searchErrors,
    recognitionErrors,
    decisionErrors,
    overallAccuracy,
    classifications,
    recommendations,
  };
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Generate attention heatmap data for export.
 */
export interface AttentionHeatmapExport {
  caseId: string;
  viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO';
  regions: Array<{
    regionId: AnatomicalRegion;
    regionCode: string;
    regionName: string;
    totalDwellMs: number;
    viewCount: number;
    maxZoomLevel: number;
    percentageViewed: number;
    firstViewedAt: string | null;
    lastViewedAt: string | null;
    isHighPriority: boolean;
    attentionLevel: 'NOT_VIEWED' | 'BRIEF' | 'ADEQUATE' | 'EXTENSIVE';
  }>;
  summary: {
    totalRegions: number;
    regionsViewed: number;
    coveragePercent: number;
    averageDwellMs: number;
    clinicalCoverageScore: number;
  };
}

/**
 * Export attention heatmap for a case.
 */
export function exportAttentionHeatmap(
  caseId: string,
  coverageByView: Map<string, Map<AnatomicalRegion, RegionCoverage>>,
  summaryByView: Map<string, AttentionSummary>,
  adequateThreshold: number = 500
): AttentionHeatmapExport[] {
  const exports: AttentionHeatmapExport[] = [];

  coverageByView.forEach((coverage, viewKey) => {
    const summary = summaryByView.get(viewKey);
    const regions: AttentionHeatmapExport['regions'] = [];

    coverage.forEach((regionCoverage, regionId) => {
      const attentionLevel = getAttentionLevel(regionCoverage.totalDwellTimeMs, adequateThreshold);

      regions.push({
        regionId,
        regionCode: getRegionCode(regionId),
        regionName: getRegionDisplayName(regionId),
        totalDwellMs: regionCoverage.totalDwellTimeMs,
        viewCount: regionCoverage.viewCount,
        maxZoomLevel: regionCoverage.maxZoomLevel,
        percentageViewed: regionCoverage.percentageViewed,
        firstViewedAt: regionCoverage.firstViewedAt,
        lastViewedAt: regionCoverage.lastViewedAt,
        isHighPriority: isHighPriorityRegion(regionId),
        attentionLevel,
      });
    });

    exports.push({
      caseId,
      viewKey: viewKey as 'RCC' | 'LCC' | 'RMLO' | 'LMLO',
      regions,
      summary: {
        totalRegions: summary?.totalRegions || regions.length,
        regionsViewed: summary?.regionsViewed || regions.filter((r) => r.viewCount > 0).length,
        coveragePercent: summary?.coveragePercent || 0,
        averageDwellMs: summary?.averageDwellTimeMs || 0,
        clinicalCoverageScore: summary?.clinicalCoverageScore || 0,
      },
    });
  });

  return exports;
}

/**
 * Export Wolfe classification for a case.
 */
export interface WolfeClassificationExport {
  schema: 'evidify.wolfe_classification.v1';
  caseId: string;
  timestamp: string;
  summary: {
    totalFindings: number;
    correctDetections: number;
    searchErrors: number;
    recognitionErrors: number;
    decisionErrors: number;
    overallAccuracy: number;
  };
  classifications: ErrorClassification[];
  recommendations: string[];
  methodology: {
    reference: string;
    thresholds: ClassificationThresholds;
  };
}

/**
 * Export Wolfe classification to JSON format.
 */
export function exportWolfeClassification(
  summary: WolfeClassificationSummary,
  thresholds: ClassificationThresholds = DEFAULT_THRESHOLDS
): WolfeClassificationExport {
  return {
    schema: 'evidify.wolfe_classification.v1',
    caseId: summary.caseId,
    timestamp: new Date().toISOString(),
    summary: {
      totalFindings: summary.totalFindings,
      correctDetections: summary.correctDetections,
      searchErrors: summary.searchErrors,
      recognitionErrors: summary.recognitionErrors,
      decisionErrors: summary.decisionErrors,
      overallAccuracy: summary.overallAccuracy,
    },
    classifications: summary.classifications,
    recommendations: summary.recommendations,
    methodology: {
      reference: 'Wolfe, J. M. (2020). Visual Search. In Attention (2nd ed.). ' +
        'Drew, T., Vo, M. L. H., & Wolfe, J. M. (2013). The invisible gorilla strikes again.',
      thresholds,
    },
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format milliseconds to readable string.
 */
function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Get attention level string.
 */
function getAttentionLevel(
  dwellMs: number,
  adequateThreshold: number
): 'NOT_VIEWED' | 'BRIEF' | 'ADEQUATE' | 'EXTENSIVE' {
  if (dwellMs === 0) return 'NOT_VIEWED';
  if (dwellMs < adequateThreshold * 0.5) return 'BRIEF';
  if (dwellMs < adequateThreshold * 2) return 'ADEQUATE';
  return 'EXTENSIVE';
}

/**
 * Check if region is high priority.
 */
function isHighPriorityRegion(region: AnatomicalRegion): boolean {
  const highPriority = ['UOQ_R', 'UOQ_L', 'AXILLA_R', 'AXILLA_L', 'NIPPLE_R', 'NIPPLE_L'];
  return highPriority.includes(region);
}

/**
 * Get common missed finding types from classifications.
 */
function getCommonMissedTypes(classifications: ErrorClassification[]): string {
  const missed = classifications.filter(
    (c) => c.errorType === 'RECOGNITION_ERROR' || c.errorType === 'SEARCH_ERROR'
  );

  const typeCounts = new Map<string, number>();
  missed.forEach((c) => {
    const type = c.metadata.findingType;
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  });

  if (typeCounts.size === 0) return 'various finding types';

  const sorted = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1]);
  return sorted.map(([type]) => type).join(', ');
}

export default {
  classifyFinding,
  classifyCase,
  exportAttentionHeatmap,
  exportWolfeClassification,
};
