/**
 * wolfeClassification.ts
 *
 * Error classification logic based on visual attention research.
 *
 * This module implements error taxonomy that distinguishes between:
 * 1. SEARCH_ERROR: The finding was in a region that was never examined.
 *    This represents a failure in systematic image coverage.
 *
 * 2. RECOGNITION_ERROR: The region containing the finding was examined,
 *    but the finding was not detected. This represents a perceptual miss.
 *
 * 3. DECISION_ERROR: The finding was detected and recognized, but the
 *    assessment was incorrect. This represents a cognitive/judgment error.
 *
 * 4. CORRECT: No error occurred - the finding was detected and correctly assessed.
 *
 * Research Basis:
 * This taxonomy is derived from decades of research on radiologist errors.
 * Studies have shown that approximately:
 * - 30% of errors are search errors (never looked at the area)
 * - 25% are recognition errors (looked but didn't perceive)
 * - 45% are decision errors (perceived but misinterpreted)
 *
 * This classification has implications for:
 * - Training interventions (search errors suggest systematic coverage training)
 * - Legal defensibility (documenting that regions were examined)
 * - Quality improvement (identifying patterns in error types)
 */

import type {
  AnatomicalRegion,
  ErrorType,
  ErrorClassification,
  CaseErrorAnalysis,
  RegionCoverage,
  AttentionSummary,
} from '../types/viewportAttentionTypes';
import { getRegionDisplayName } from './anatomicalRegions';

/**
 * Minimum dwell time (ms) to consider a region as "meaningfully viewed".
 * Regions viewed for less than this are treated as not viewed for
 * classification purposes.
 */
const MINIMUM_MEANINGFUL_DWELL_MS = 500;

/**
 * Minimum zoom level to consider a region as "adequately examined".
 * At zoom < 1, the view is minified and may miss subtle findings.
 */
const MINIMUM_ADEQUATE_ZOOM = 1.0;

/**
 * Finding information from ground truth.
 */
export interface FindingInfo {
  /** Unique finding identifier */
  findingId: string;
  /** Region containing the finding */
  region: AnatomicalRegion;
  /** Ground truth diagnosis/pathology */
  groundTruth: string;
  /** BI-RADS category from ground truth */
  groundTruthBirads: number;
  /** Finding type (mass, calcification, etc.) */
  findingType?: string;
  /** Finding subtlety rating (1-5, with 5 being most subtle) */
  subtlety?: number;
}

/**
 * Radiologist assessment for comparison.
 */
export interface RadiologistAssessment {
  /** BI-RADS assessment given */
  birads: number;
  /** Confidence level (0-100) */
  confidence: number;
  /** Whether a finding was reported in this region */
  findingReported: boolean;
  /** Description of reported finding (if any) */
  findingDescription?: string;
}

/**
 * Determine if a finding was recognized based on assessment.
 *
 * A finding is considered "recognized" if:
 * 1. A finding was explicitly reported in the same region, OR
 * 2. The BI-RADS assessment suggests awareness of abnormality (>= 3)
 */
function wasFindingRecognized(
  finding: FindingInfo,
  assessment: RadiologistAssessment
): boolean {
  // If an explicit finding was reported, it was recognized
  if (assessment.findingReported) {
    return true;
  }

  // If BI-RADS >= 3, the radiologist recognized something abnormal
  // (BI-RADS 1-2 = negative/benign, 3+ = probably benign or higher suspicion)
  return assessment.birads >= 3;
}

/**
 * Determine if the assessment was correct.
 *
 * For this classification:
 * - Correct if finding was recognized AND assessment was appropriate
 * - "Appropriate" depends on ground truth:
 *   - Malignant findings should get BI-RADS 4 or 5
 *   - Benign findings getting BI-RADS 2 is correct
 *   - BI-RADS 3 (probably benign) is acceptable for some cases
 */
function wasAssessmentCorrect(
  finding: FindingInfo,
  assessment: RadiologistAssessment
): boolean {
  const isMalignant = finding.groundTruth.toLowerCase().includes('malignant');
  const isBenign = finding.groundTruth.toLowerCase().includes('benign');

  if (isMalignant) {
    // Malignant should be BI-RADS 4 or 5 (4A, 4B, 4C, or 5)
    return assessment.birads >= 4;
  }

  if (isBenign) {
    // Benign should be BI-RADS 1, 2, or 3
    return assessment.birads <= 3;
  }

  // Unknown ground truth - consider correct if finding was reported
  return assessment.findingReported;
}

/**
 * Classify a single finding error.
 *
 * Decision tree:
 * 1. Was the region containing the finding viewed?
 *    - NO → SEARCH_ERROR
 *    - YES → Continue
 * 2. Was the finding recognized (something abnormal noted)?
 *    - NO → RECOGNITION_ERROR
 *    - YES → Continue
 * 3. Was the assessment correct?
 *    - NO → DECISION_ERROR
 *    - YES → CORRECT
 */
export function classifyFindingError(
  finding: FindingInfo,
  regionCoverage: RegionCoverage,
  assessment: RadiologistAssessment
): ErrorClassification {
  const regionWasViewed =
    regionCoverage.viewCount > 0 &&
    regionCoverage.totalDwellTimeMs >= MINIMUM_MEANINGFUL_DWELL_MS;

  let errorType: ErrorType;
  let explanation: string;

  if (!regionWasViewed) {
    // SEARCH ERROR: Region was never examined
    errorType = 'SEARCH_ERROR';
    explanation =
      `The ${getRegionDisplayName(finding.region)} was not examined during this reading. ` +
      `The finding (${finding.groundTruth}) was located in this region. ` +
      `This represents an incomplete systematic search of the image.`;
  } else {
    const recognized = wasFindingRecognized(finding, assessment);

    if (!recognized) {
      // RECOGNITION ERROR: Region viewed but finding not detected
      errorType = 'RECOGNITION_ERROR';
      explanation =
        `The ${getRegionDisplayName(finding.region)} was examined ` +
        `(${Math.round(regionCoverage.totalDwellTimeMs / 1000)}s dwell time, ` +
        `${regionCoverage.viewCount} views, max zoom ${regionCoverage.maxZoomLevel.toFixed(1)}x), ` +
        `but the finding (${finding.groundTruth}) was not detected. ` +
        `This represents a perceptual miss despite visual examination.`;
    } else {
      const correct = wasAssessmentCorrect(finding, assessment);

      if (!correct) {
        // DECISION ERROR: Recognized but incorrectly assessed
        errorType = 'DECISION_ERROR';
        explanation =
          `The ${getRegionDisplayName(finding.region)} was examined and a finding was recognized, ` +
          `but the assessment (BI-RADS ${assessment.birads}) was incorrect. ` +
          `Ground truth: ${finding.groundTruth}. ` +
          `This represents a cognitive/judgment error rather than a perceptual miss.`;
      } else {
        // CORRECT: No error
        errorType = 'CORRECT';
        explanation =
          `The ${getRegionDisplayName(finding.region)} was examined ` +
          `and the finding (${finding.groundTruth}) was correctly identified ` +
          `with appropriate assessment (BI-RADS ${assessment.birads}).`;
      }
    }
  }

  return {
    findingId: finding.findingId,
    findingRegion: finding.region,
    groundTruth: finding.groundTruth,
    radiologistAssessment: `BI-RADS ${assessment.birads}`,
    regionWasViewed,
    dwellTimeOnRegion: regionCoverage.totalDwellTimeMs,
    zoomLevelUsed: regionCoverage.maxZoomLevel,
    errorType,
    explanation,
  };
}

/**
 * Perform complete error analysis for a case.
 *
 * @param caseId - Case identifier
 * @param findings - List of ground truth findings
 * @param attentionSummary - Attention data from viewport tracking
 * @param assessment - Radiologist's overall assessment
 * @param perRegionAssessments - Optional per-region assessments for detailed analysis
 */
export function analyzeCase(
  caseId: string,
  findings: FindingInfo[],
  attentionSummary: AttentionSummary,
  assessment: RadiologistAssessment,
  perRegionAssessments?: Map<AnatomicalRegion, RadiologistAssessment>
): CaseErrorAnalysis {
  const classifications: ErrorClassification[] = [];
  let searchErrors = 0;
  let recognitionErrors = 0;
  let decisionErrors = 0;
  let correctFindings = 0;

  for (const finding of findings) {
    // Get coverage data for this finding's region
    const regionCoverage = attentionSummary.regionCoverage.find(
      (rc) => rc.region === finding.region
    );

    if (!regionCoverage) {
      // Region not in coverage data - treat as not viewed
      const classification: ErrorClassification = {
        findingId: finding.findingId,
        findingRegion: finding.region,
        groundTruth: finding.groundTruth,
        radiologistAssessment: `BI-RADS ${assessment.birads}`,
        regionWasViewed: false,
        dwellTimeOnRegion: 0,
        zoomLevelUsed: 0,
        errorType: 'SEARCH_ERROR',
        explanation:
          `The ${getRegionDisplayName(finding.region)} was not included in the attention tracking data. ` +
          `This suggests the region was never examined.`,
      };
      classifications.push(classification);
      searchErrors++;
      continue;
    }

    // Use per-region assessment if available, otherwise use overall assessment
    const regionAssessment =
      perRegionAssessments?.get(finding.region) || assessment;

    const classification = classifyFindingError(
      finding,
      regionCoverage,
      regionAssessment
    );

    classifications.push(classification);

    // Count by error type
    switch (classification.errorType) {
      case 'SEARCH_ERROR':
        searchErrors++;
        break;
      case 'RECOGNITION_ERROR':
        recognitionErrors++;
        break;
      case 'DECISION_ERROR':
        decisionErrors++;
        break;
      case 'CORRECT':
        correctFindings++;
        break;
    }
  }

  return {
    caseId,
    totalFindings: findings.length,
    correctFindings,
    searchErrors,
    recognitionErrors,
    decisionErrors,
    classifications,
    analysisTimestamp: new Date().toISOString(),
  };
}

/**
 * Generate a human-readable summary of error analysis.
 */
export function generateErrorSummary(analysis: CaseErrorAnalysis): string {
  const lines: string[] = [];

  lines.push(`Error Analysis for Case ${analysis.caseId}`);
  lines.push(`Analysis performed: ${analysis.analysisTimestamp}`);
  lines.push('');
  lines.push(`Total findings: ${analysis.totalFindings}`);
  lines.push(`Correct: ${analysis.correctFindings} (${Math.round((analysis.correctFindings / analysis.totalFindings) * 100)}%)`);
  lines.push('');
  lines.push('Error Breakdown:');
  lines.push(`  Search Errors: ${analysis.searchErrors} (region never examined)`);
  lines.push(`  Recognition Errors: ${analysis.recognitionErrors} (examined but missed)`);
  lines.push(`  Decision Errors: ${analysis.decisionErrors} (recognized but wrong assessment)`);
  lines.push('');

  if (analysis.classifications.some((c) => c.errorType !== 'CORRECT')) {
    lines.push('Detailed Classifications:');
    for (const classification of analysis.classifications) {
      if (classification.errorType !== 'CORRECT') {
        lines.push('');
        lines.push(`  Finding: ${classification.findingId}`);
        lines.push(`  Region: ${classification.findingRegion}`);
        lines.push(`  Error Type: ${classification.errorType}`);
        lines.push(`  ${classification.explanation}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Get intervention recommendations based on error patterns.
 */
export function getInterventionRecommendations(
  analyses: CaseErrorAnalysis[]
): string[] {
  const recommendations: string[] = [];

  // Aggregate error counts
  let totalSearchErrors = 0;
  let totalRecognitionErrors = 0;
  let totalDecisionErrors = 0;
  let totalFindings = 0;

  for (const analysis of analyses) {
    totalSearchErrors += analysis.searchErrors;
    totalRecognitionErrors += analysis.recognitionErrors;
    totalDecisionErrors += analysis.decisionErrors;
    totalFindings += analysis.totalFindings;
  }

  if (totalFindings === 0) {
    return ['Insufficient data for recommendations.'];
  }

  const searchErrorRate = totalSearchErrors / totalFindings;
  const recognitionErrorRate = totalRecognitionErrors / totalFindings;
  const decisionErrorRate = totalDecisionErrors / totalFindings;

  // Generate recommendations based on error patterns

  if (searchErrorRate > 0.1) {
    recommendations.push(
      'HIGH SEARCH ERROR RATE: Consider implementing systematic search pattern training. ' +
      'Ensure complete coverage of all anatomical regions using a structured viewing protocol.'
    );
  }

  if (recognitionErrorRate > 0.15) {
    recommendations.push(
      'ELEVATED RECOGNITION ERRORS: Review perceptual training modules. ' +
      'Consider increasing dwell time in regions of interest and using appropriate zoom levels.'
    );
  }

  if (decisionErrorRate > 0.2) {
    recommendations.push(
      'HIGH DECISION ERROR RATE: Review diagnostic criteria and classification training. ' +
      'Consider case review sessions focusing on differential diagnosis.'
    );
  }

  // Check for region-specific patterns
  const regionErrorCounts = new Map<AnatomicalRegion, number>();
  for (const analysis of analyses) {
    for (const classification of analysis.classifications) {
      if (classification.errorType !== 'CORRECT') {
        const count = regionErrorCounts.get(classification.findingRegion) || 0;
        regionErrorCounts.set(classification.findingRegion, count + 1);
      }
    }
  }

  // Find problematic regions
  for (const [region, count] of regionErrorCounts) {
    if (count >= 3) {
      recommendations.push(
        `REGION-SPECIFIC PATTERN: Multiple errors in ${getRegionDisplayName(region)}. ` +
        'Consider targeted review of findings commonly occurring in this region.'
      );
    }
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'Error rates are within acceptable ranges. Continue current reading practices.'
    );
  }

  return recommendations;
}

export default {
  classifyFindingError,
  analyzeCase,
  generateErrorSummary,
  getInterventionRecommendations,
};
