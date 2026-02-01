/**
 * Wolfe Error Classification System
 *
 * Based on Jeremy Wolfe's research on visual search and attention in radiology.
 * Classifies diagnostic errors into meaningful categories for legal defense.
 *
 * References:
 * - Wolfe, J.M. & Horowitz, T.S. (2022). Five factors that guide attention in visual search.
 * - Drew, T., Vo, M.L., & Wolfe, J.M. (2013). The invisible gorilla strikes again.
 */

import {
  WolfeErrorType,
  WolfeErrorClassification,
  AttentionSummary,
  RegionAttentionData
} from './expertWitnessTypes';

// =============================================================================
// CONSTANTS - WOLFE THRESHOLDS
// =============================================================================

/**
 * Minimum dwell time (ms) to consider a region "viewed"
 * Based on eye-tracking research showing ~200ms minimum for feature extraction
 */
export const MINIMUM_VIEWING_THRESHOLD_MS = 200;

/**
 * Adequate dwell time (ms) for pattern recognition
 * Based on Wolfe's research on visual search fixation durations
 */
export const ADEQUATE_DWELL_TIME_MS = 1500;

/**
 * Adequate zoom level for detecting small findings
 */
export const ADEQUATE_ZOOM_LEVEL = 1.5;

/**
 * Expected error rates by type (for scientific context)
 */
export const EXPECTED_ERROR_RATES: Record<WolfeErrorType, { min: number; max: number }> = {
  SEARCH_ERROR: { min: 5, max: 15 },
  RECOGNITION_ERROR: { min: 12, max: 30 },
  DECISION_ERROR: { min: 3, max: 10 },
  SATISFACTION_OF_SEARCH: { min: 8, max: 20 },
  PREVALENCE_EFFECT: { min: 10, max: 25 },
  NO_ERROR: { min: 0, max: 0 }
};

// =============================================================================
// INTERFACES
// =============================================================================

export interface ErrorClassificationInput {
  // Ground truth: was there actually an abnormality?
  groundTruthAbnormal: boolean;

  // Finding details
  finding?: {
    location: string;        // Region ID where finding was located
    sizeMm?: number;
    type?: string;           // e.g., "architectural distortion", "mass"
    conspicuity?: 'SUBTLE' | 'MODERATE' | 'OBVIOUS';
  };

  // Attention data from viewport tracking
  viewportData: {
    totalViewingTimeMs: number;
    preAIViewingTimeMs: number;
    regionData: RegionAttentionData[];
    imageCoveragePercent: number;
  };

  // Assessment results
  initialAssessment: {
    birads: number;
    flaggedAbnormality: boolean;
    notedRegions?: string[];  // Regions specifically noted
  };

  finalAssessment: {
    birads: number;
    flaggedAbnormality: boolean;
    notedRegions?: string[];
  };

  // Case context
  otherFindingsNoted?: number;  // For satisfaction of search analysis
  casePrevalenceContext?: 'HIGH' | 'NORMAL' | 'LOW'; // Session prevalence
}

// =============================================================================
// ERROR CLASSIFICATION ENGINE
// =============================================================================

/**
 * Classify a diagnostic error using Wolfe's visual search framework
 */
export function classifyError(input: ErrorClassificationInput): WolfeErrorClassification {
  // If no error occurred (correct assessment), return NO_ERROR
  if (!input.groundTruthAbnormal || input.finalAssessment.flaggedAbnormality) {
    return createNoErrorResult(input);
  }

  // Find attention data for the finding location
  const findingRegionData = input.finding
    ? input.viewportData.regionData.find(r => r.regionId === input.finding!.location)
    : null;

  // Classify the error type
  const classification = determineErrorType(input, findingRegionData);

  return {
    primaryError: classification.errorType,
    confidence: classification.confidence,

    evidence: {
      regionViewed: findingRegionData?.visited ?? false,
      dwellTimeMs: findingRegionData?.dwellTimeMs ?? 0,
      zoomLevel: findingRegionData?.zoomLevel ?? 1.0,
      viewingEpisodes: findingRegionData?.viewingEpisodes ?? 0,
      notedInInitialAssessment: input.initialAssessment.flaggedAbnormality,
      notedInFinalAssessment: input.finalAssessment.flaggedAbnormality
    },

    scientificContext: generateScientificContext(classification.errorType),
    expectedRateRange: EXPECTED_ERROR_RATES[classification.errorType],
    liabilityImplications: generateLiabilityImplications(classification.errorType, input)
  };
}

function createNoErrorResult(input: ErrorClassificationInput): WolfeErrorClassification {
  const findingRegionData = input.finding
    ? input.viewportData.regionData.find(r => r.regionId === input.finding!.location)
    : null;

  return {
    primaryError: 'NO_ERROR',
    confidence: 100,

    evidence: {
      regionViewed: findingRegionData?.visited ?? true,
      dwellTimeMs: findingRegionData?.dwellTimeMs ?? 0,
      zoomLevel: findingRegionData?.zoomLevel ?? 1.0,
      viewingEpisodes: findingRegionData?.viewingEpisodes ?? 0,
      notedInInitialAssessment: input.initialAssessment.flaggedAbnormality,
      notedInFinalAssessment: input.finalAssessment.flaggedAbnormality
    },

    scientificContext: 'The radiologist correctly identified the finding or the case was truly negative.',
    expectedRateRange: { min: 0, max: 0 },
    liabilityImplications: 'No diagnostic error occurred. The assessment was appropriate.'
  };
}

interface ClassificationResult {
  errorType: WolfeErrorType;
  confidence: number;
  reasoning: string;
}

function determineErrorType(
  input: ErrorClassificationInput,
  findingRegionData: RegionAttentionData | null | undefined
): ClassificationResult {
  // 1. SEARCH ERROR: Region was never viewed
  if (!findingRegionData?.visited || findingRegionData.dwellTimeMs < MINIMUM_VIEWING_THRESHOLD_MS) {
    // Check for satisfaction of search
    if (input.otherFindingsNoted && input.otherFindingsNoted > 0) {
      return {
        errorType: 'SATISFACTION_OF_SEARCH',
        confidence: calculateSatisfactionOfSearchConfidence(input, findingRegionData),
        reasoning: 'Finding location was not adequately viewed after other findings were detected.'
      };
    }

    return {
      errorType: 'SEARCH_ERROR',
      confidence: calculateSearchErrorConfidence(findingRegionData),
      reasoning: 'Finding location was not viewed or received inadequate attention.'
    };
  }

  // 2. Region was viewed - check for recognition error vs decision error
  const adequateViewing = findingRegionData.dwellTimeMs >= ADEQUATE_DWELL_TIME_MS &&
                          findingRegionData.zoomLevel >= ADEQUATE_ZOOM_LEVEL;

  // If the finding was noted initially but not in final assessment, it's a decision error
  if (input.initialAssessment.flaggedAbnormality && !input.finalAssessment.flaggedAbnormality) {
    return {
      errorType: 'DECISION_ERROR',
      confidence: 90,
      reasoning: 'Abnormality was noted initially but dismissed in final assessment.'
    };
  }

  // 3. Check for prevalence effect
  if (input.casePrevalenceContext === 'LOW') {
    const prevalenceConfidence = calculatePrevalenceEffectConfidence(input);
    if (prevalenceConfidence > 60) {
      return {
        errorType: 'PREVALENCE_EFFECT',
        confidence: prevalenceConfidence,
        reasoning: 'Low prevalence context may have reduced detection sensitivity.'
      };
    }
  }

  // 4. Default: Recognition error (viewed but not recognized)
  return {
    errorType: 'RECOGNITION_ERROR',
    confidence: calculateRecognitionErrorConfidence(findingRegionData, input),
    reasoning: 'Region received adequate attention but abnormality was not recognized.'
  };
}

// =============================================================================
// CONFIDENCE CALCULATIONS
// =============================================================================

function calculateSearchErrorConfidence(regionData: RegionAttentionData | null | undefined): number {
  if (!regionData || !regionData.visited) {
    return 95; // Very confident it's a search error
  }

  if (regionData.dwellTimeMs < MINIMUM_VIEWING_THRESHOLD_MS) {
    return 85; // High confidence - minimal viewing
  }

  return 70; // Moderate confidence
}

function calculateRecognitionErrorConfidence(
  regionData: RegionAttentionData,
  input: ErrorClassificationInput
): number {
  let confidence = 70; // Base confidence

  // Higher confidence if viewing was adequate
  if (regionData.dwellTimeMs >= ADEQUATE_DWELL_TIME_MS) {
    confidence += 10;
  }

  if (regionData.zoomLevel >= ADEQUATE_ZOOM_LEVEL) {
    confidence += 5;
  }

  if (regionData.viewingEpisodes >= 2) {
    confidence += 5; // Multiple looks suggests recognition failure
  }

  // Adjust for finding subtlety
  if (input.finding?.conspicuity === 'SUBTLE') {
    confidence += 5; // Subtle findings support recognition error
  }

  return Math.min(95, confidence);
}

function calculateSatisfactionOfSearchConfidence(
  input: ErrorClassificationInput,
  regionData: RegionAttentionData | null | undefined
): number {
  let confidence = 60; // Base confidence

  // More findings noted = higher SOS confidence
  if (input.otherFindingsNoted) {
    confidence += Math.min(20, input.otherFindingsNoted * 10);
  }

  // If region was partially viewed, more likely SOS
  if (regionData && regionData.dwellTimeMs > 0 && regionData.dwellTimeMs < ADEQUATE_DWELL_TIME_MS) {
    confidence += 10;
  }

  return Math.min(90, confidence);
}

function calculatePrevalenceEffectConfidence(input: ErrorClassificationInput): number {
  let confidence = 50; // Base confidence

  if (input.casePrevalenceContext === 'LOW') {
    confidence += 20;
  }

  // Subtle findings more susceptible to prevalence effect
  if (input.finding?.conspicuity === 'SUBTLE') {
    confidence += 15;
  }

  return Math.min(85, confidence);
}

// =============================================================================
// TEXT GENERATION
// =============================================================================

function generateScientificContext(errorType: WolfeErrorType): string {
  switch (errorType) {
    case 'SEARCH_ERROR':
      return 'Search errors occur when visual search fails to bring the target region to foveal ' +
        'vision. Per Wolfe (2022), this typically reflects time pressure, distractors, or ' +
        'suboptimal search strategy rather than negligence.';

    case 'RECOGNITION_ERROR':
      return 'Recognition errors represent the largest category of diagnostic misses ' +
        '(Wolfe, 2022). These occur when visual search successfully brings a target to ' +
        'foveal vision, but pattern recognition fails to flag it as abnormal. Expected ' +
        'rate for subtle findings: 12-30%.';

    case 'DECISION_ERROR':
      return 'Decision errors occur when an abnormality is detected but incorrectly ' +
        'classified or dismissed. These errors involve cognitive rather than perceptual ' +
        'processes and may reflect uncertainty in the clinical context.';

    case 'SATISFACTION_OF_SEARCH':
      return 'Satisfaction of Search (SOS) is a well-documented phenomenon where detection ' +
        'of one abnormality reduces the likelihood of detecting additional abnormalities ' +
        '(Tuddenham, 1962; Berbaum et al., 1990). This is a known limitation of human ' +
        'visual attention.';

    case 'PREVALENCE_EFFECT':
      return 'The prevalence effect describes how rare targets are missed more often than ' +
        'common targets (Wolfe et al., 2005). In low-prevalence screening contexts, miss ' +
        'rates for subtle findings can increase by 10-25%.';

    case 'NO_ERROR':
      return 'The assessment was consistent with the clinical findings.';
  }
}

function generateLiabilityImplications(
  errorType: WolfeErrorType,
  input: ErrorClassificationInput
): string {
  const subtleFinding = input.finding?.conspicuity === 'SUBTLE';

  switch (errorType) {
    case 'SEARCH_ERROR':
      if (input.viewportData.imageCoveragePercent >= 90) {
        return 'Despite thorough overall image coverage, this specific region received ' +
          'insufficient attention. This may reflect the challenging location of the finding ' +
          'rather than inadequate search methodology.';
      }
      return 'The region containing the finding was not adequately examined. However, ' +
        'search patterns are influenced by numerous factors including distractors, ' +
        'time constraints, and finding location.';

    case 'RECOGNITION_ERROR':
      if (subtleFinding) {
        return 'This error type reflects limitations in human pattern recognition rather ' +
          'than inadequate search strategy. The high case difficulty places this case in ' +
          'the expected miss range for subtle findings.';
      }
      return 'Recognition errors occur even with adequate viewing and represent ' +
        'fundamental limitations in human visual processing that affect all practitioners.';

    case 'DECISION_ERROR':
      return 'While the finding was detected, the clinical decision was inconsistent with ' +
        'the final diagnosis. Decision errors may reflect legitimate clinical uncertainty ' +
        'or competing interpretations at the time of assessment.';

    case 'SATISFACTION_OF_SEARCH':
      return 'The detection of other findings in this case may have contributed to reduced ' +
        'vigilance for additional abnormalities. SOS is a documented cognitive phenomenon ' +
        'that is not indicative of substandard care.';

    case 'PREVALENCE_EFFECT':
      return 'The low prevalence of abnormalities in the screening context may have ' +
        'contributed to this miss. This is a well-documented effect of base rate on ' +
        'detection performance.';

    case 'NO_ERROR':
      return 'No diagnostic error occurred. The assessment was appropriate.';
  }
}

// =============================================================================
// ATTENTION SUMMARY GENERATION
// =============================================================================

/**
 * Generate an attention summary from viewport tracking data
 */
export function generateAttentionSummary(
  viewportData: ErrorClassificationInput['viewportData'],
  findingLocation?: string
): AttentionSummary {
  const visitedRegions = viewportData.regionData.filter(r => r.visited);
  const totalDwellTime = viewportData.regionData.reduce((sum, r) => sum + r.dwellTimeMs, 0);

  let findingLocationData: AttentionSummary['findingLocation'] | undefined;
  if (findingLocation) {
    const findingRegion = viewportData.regionData.find(r => r.regionId === findingLocation);
    if (findingRegion) {
      findingLocationData = {
        region: findingRegion.regionName,
        dwellTimeMs: findingRegion.dwellTimeMs,
        zoomLevel: findingRegion.zoomLevel,
        viewingEpisodes: findingRegion.viewingEpisodes
      };
    }
  }

  return {
    totalViewingTimeMs: viewportData.totalViewingTimeMs,
    preAIViewingTimeMs: viewportData.preAIViewingTimeMs,
    postAIViewingTimeMs: viewportData.totalViewingTimeMs - viewportData.preAIViewingTimeMs,
    imageCoveragePercent: viewportData.imageCoveragePercent,
    regionAnalysis: viewportData.regionData,
    findingLocation: findingLocationData
  };
}

/**
 * Format error classification for legal presentation
 */
export function formatErrorClassificationForLegal(classification: WolfeErrorClassification): string {
  if (classification.primaryError === 'NO_ERROR') {
    return 'WOLFE ERROR CLASSIFICATION\n\nNo diagnostic error occurred.';
  }

  const lines: string[] = [];

  lines.push('WOLFE ERROR CLASSIFICATION');
  lines.push('');
  lines.push(`Classification: ${classification.primaryError.replace(/_/g, ' ')}`);
  lines.push(`Confidence: ${classification.confidence}%`);
  lines.push('');
  lines.push('EVIDENCE SUPPORTING CLASSIFICATION:');
  lines.push('');
  lines.push(`  Viewport tracking confirms region was ${classification.evidence.regionViewed ? 'viewed' : 'NOT viewed'}`);
  lines.push(`  Dwell time: ${(classification.evidence.dwellTimeMs / 1000).toFixed(1)} seconds ${classification.evidence.dwellTimeMs >= ADEQUATE_DWELL_TIME_MS ? '(adequate)' : '(brief)'}`);
  lines.push(`  Zoom level: ${classification.evidence.zoomLevel.toFixed(1)}x ${classification.evidence.zoomLevel >= ADEQUATE_ZOOM_LEVEL ? '(appropriate for finding size)' : '(minimal magnification)'}`);
  lines.push(`  Finding was ${classification.evidence.notedInInitialAssessment ? '' : 'not '}noted in initial assessment`);
  lines.push('');
  lines.push('SCIENTIFIC CONTEXT:');
  lines.push(classification.scientificContext);
  lines.push('');
  lines.push('LIABILITY IMPLICATIONS:');
  lines.push(classification.liabilityImplications);

  return lines.join('\n');
}

/**
 * Format attention summary for legal presentation
 */
export function formatAttentionSummaryForLegal(summary: AttentionSummary): string {
  const lines: string[] = [];

  lines.push('ATTENTION ANALYSIS');
  lines.push('');
  lines.push(`Image Coverage: ${summary.imageCoveragePercent}% of anatomical regions viewed`);
  lines.push(`Total Viewing Time: ${(summary.preAIViewingTimeMs / 1000).toFixed(0)} seconds (pre-AI) + ` +
             `${(summary.postAIViewingTimeMs / 1000).toFixed(0)} seconds (post-AI)`);
  lines.push('');
  lines.push('REGION COVERAGE:');

  for (const region of summary.regionAnalysis) {
    const status = region.visited ? '✓' : '✗';
    lines.push(`  ${status} ${region.regionName}: ${(region.dwellTimeMs / 1000).toFixed(1)}s dwell, ${region.zoomLevel.toFixed(1)}x zoom`);
  }

  if (summary.findingLocation) {
    lines.push('');
    lines.push('FINDING LOCATION vs ATTENTION:');
    lines.push(`Finding was in ${summary.findingLocation.region}, which received:`);
    lines.push('');
    lines.push(`  - ${(summary.findingLocation.dwellTimeMs / 1000).toFixed(1)} seconds of attention`);
    lines.push(`  - ${summary.findingLocation.zoomLevel.toFixed(1)}x zoom magnification`);
    lines.push(`  - ${summary.findingLocation.viewingEpisodes} separate viewing episode(s)`);
  }

  lines.push('');
  lines.push('CONCLUSION:');
  if (summary.imageCoveragePercent >= 90) {
    lines.push('Visual search was thorough. The error was not due to inadequate coverage of the image.');
  } else if (summary.imageCoveragePercent >= 70) {
    lines.push('Visual search covered most of the image. Some regions received limited attention.');
  } else {
    lines.push('Visual search coverage was limited. Image coverage may have contributed to the error.');
  }

  return lines.join('\n');
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get error type severity for UI display
 */
export function getErrorTypeSeverity(errorType: WolfeErrorType): 'low' | 'medium' | 'high' {
  switch (errorType) {
    case 'NO_ERROR':
      return 'low';
    case 'PREVALENCE_EFFECT':
    case 'SATISFACTION_OF_SEARCH':
      return 'low'; // These are well-understood cognitive phenomena
    case 'RECOGNITION_ERROR':
      return 'medium'; // Common and expected
    case 'DECISION_ERROR':
    case 'SEARCH_ERROR':
      return 'high'; // May be more scrutinized
  }
}

/**
 * Get error type color for UI display
 */
export function getErrorTypeColor(errorType: WolfeErrorType): {
  bg: string;
  text: string;
  border: string;
} {
  const severity = getErrorTypeSeverity(errorType);

  switch (severity) {
    case 'low':
      return { bg: '#dcfce7', text: '#166534', border: '#22c55e' };
    case 'medium':
      return { bg: '#fef9c3', text: '#854d0e', border: '#eab308' };
    case 'high':
      return { bg: '#fed7aa', text: '#9a3412', border: '#f97316' };
  }
}
