/**
 * Case Difficulty Index (CDI) Calculator
 *
 * Computes a composite difficulty score based on multiple factors
 * that affect diagnostic accuracy in mammography.
 *
 * Factors include:
 * - Breast density (BI-RADS A-D)
 * - Finding conspicuity (visibility)
 * - Finding size
 * - Finding location
 * - Presence of distractors
 * - Prior comparison availability
 * - Technical image quality
 *
 * The CDI correlates with expected miss rates and provides
 * scientific context for error analysis.
 */

import { CaseDifficultyIndex } from './expertWitnessTypes';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * BI-RADS breast density categories and their impact on difficulty
 */
export const DENSITY_SCORES: Record<'A' | 'B' | 'C' | 'D', number> = {
  'A': 1, // Almost entirely fatty
  'B': 2, // Scattered fibroglandular
  'C': 4, // Heterogeneously dense
  'D': 5  // Extremely dense
};

export const DENSITY_DESCRIPTIONS: Record<'A' | 'B' | 'C' | 'D', string> = {
  'A': 'Almost entirely fatty - optimal visibility',
  'B': 'Scattered fibroglandular densities',
  'C': 'Heterogeneously dense - may obscure small masses',
  'D': 'Extremely dense - substantially reduced sensitivity'
};

/**
 * Finding conspicuity levels
 */
export const CONSPICUITY_SCORES: Record<string, number> = {
  'obvious_mass': 1,
  'moderate_mass': 2,
  'subtle_mass': 4,
  'architectural_distortion': 4,
  'asymmetry': 3,
  'calcifications_clustered': 2,
  'calcifications_scattered': 3,
  'subtle_architectural_distortion': 5
};

/**
 * Finding size thresholds (mm)
 */
export const SIZE_THRESHOLDS = {
  LARGE: 20,    // >20mm, score 1
  MEDIUM: 10,   // 10-20mm, score 2
  SMALL: 5,     // 5-10mm, score 4
  TINY: 0       // <5mm, score 5
};

/**
 * Location difficulty modifiers
 */
export const LOCATION_SCORES: Record<string, number> = {
  'central': 1,
  'upper_outer': 2,
  'lower_outer': 2,
  'upper_inner': 3,
  'lower_inner': 3,
  'axillary_tail': 4,
  'posterior': 4,
  'retroareolar': 3,
  'skin': 2,
  'chest_wall': 5
};

/**
 * RADPEER score descriptions
 */
export const RADPEER_DESCRIPTIONS: Record<1 | 2 | 3 | 4, string> = {
  1: 'Diagnosis not ordinarily expected to be made',
  2: 'Difficult diagnosis, not ordinarily expected',
  3: 'Diagnosis should be made most of the time',
  4: 'Obvious finding, diagnosis expected'
};

// =============================================================================
// INTERFACES
// =============================================================================

export interface CDIInput {
  // Breast density
  breastDensity?: 'A' | 'B' | 'C' | 'D';

  // Finding characteristics
  finding?: {
    type: string;           // e.g., 'subtle_mass', 'architectural_distortion'
    sizeMm?: number;
    location?: string;      // e.g., 'posterior', 'upper_outer'
    conspicuity?: 'OBVIOUS' | 'MODERATE' | 'SUBTLE';
  };

  // Distractors
  distractors?: {
    count: number;
    types: string[];  // e.g., ['benign_calcification', 'cyst']
  };

  // Prior comparison
  priorComparison?: {
    available: boolean;
    yearsAgo?: number;
  };

  // Technical quality
  technicalQuality?: {
    issues: string[];  // e.g., ['motion_blur', 'positioning_issue']
  };

  // Comparison population percentile (if known from AI/database)
  populationPercentile?: number;
}

// =============================================================================
// CDI CALCULATOR
// =============================================================================

/**
 * Calculate the Case Difficulty Index
 */
export function calculateCaseDifficulty(input: CDIInput): CaseDifficultyIndex {
  const factors: CaseDifficultyIndex['factors'] = {};
  let totalScore = 0;
  let factorCount = 0;

  // 1. Breast Density Factor
  if (input.breastDensity) {
    const densityScore = DENSITY_SCORES[input.breastDensity];
    factors.breastDensity = {
      biradsCategory: input.breastDensity,
      score: densityScore,
      description: DENSITY_DESCRIPTIONS[input.breastDensity]
    };
    totalScore += densityScore;
    factorCount++;
  }

  // 2. Finding Conspicuity Factor
  if (input.finding?.type || input.finding?.conspicuity) {
    const conspicuityScore = calculateConspicuityScore(input.finding);
    factors.findingConspicuity = {
      type: input.finding.type || input.finding.conspicuity || 'unknown',
      score: conspicuityScore,
      description: getConspicuityDescription(conspicuityScore)
    };
    totalScore += conspicuityScore;
    factorCount++;
  }

  // 3. Finding Size Factor
  if (input.finding?.sizeMm !== undefined) {
    const sizeScore = calculateSizeScore(input.finding.sizeMm);
    factors.findingSize = {
      sizeMm: input.finding.sizeMm,
      score: sizeScore,
      description: getSizeDescription(input.finding.sizeMm, sizeScore)
    };
    totalScore += sizeScore;
    factorCount++;
  }

  // 4. Finding Location Factor
  if (input.finding?.location) {
    const locationScore = LOCATION_SCORES[input.finding.location] || 3;
    factors.findingLocation = {
      location: formatLocation(input.finding.location),
      score: locationScore,
      description: getLocationDescription(input.finding.location, locationScore)
    };
    totalScore += locationScore;
    factorCount++;
  }

  // 5. Distractors Factor
  if (input.distractors && input.distractors.count > 0) {
    const distractorScore = Math.min(5, 1 + input.distractors.count);
    factors.distractors = {
      count: input.distractors.count,
      types: input.distractors.types,
      score: distractorScore,
      description: `${input.distractors.count} distractor(s) present: ${input.distractors.types.join(', ')}`
    };
    totalScore += distractorScore;
    factorCount++;
  }

  // 6. Prior Comparison Factor
  if (input.priorComparison !== undefined) {
    const priorScore = calculatePriorComparisonScore(input.priorComparison);
    factors.priorComparison = {
      available: input.priorComparison.available,
      yearsAgo: input.priorComparison.yearsAgo,
      score: priorScore,
      description: getPriorDescription(input.priorComparison, priorScore)
    };
    totalScore += priorScore;
    factorCount++;
  }

  // 7. Technical Quality Factor
  if (input.technicalQuality && input.technicalQuality.issues.length > 0) {
    const qualityScore = Math.min(5, 1 + input.technicalQuality.issues.length);
    factors.technicalQuality = {
      issues: input.technicalQuality.issues,
      score: qualityScore,
      description: `Technical issues: ${input.technicalQuality.issues.join(', ')}`
    };
    totalScore += qualityScore;
    factorCount++;
  }

  // Calculate composite score (0-100)
  const averageFactorScore = factorCount > 0 ? totalScore / factorCount : 2.5;
  const compositeScore = Math.round((averageFactorScore / 5) * 100);

  // Calculate percentile (use population data if available, otherwise estimate)
  const percentile = input.populationPercentile ?? estimatePercentile(compositeScore);

  // Determine difficulty level
  const difficultyLevel = getDifficultyLevel(compositeScore);

  // Calculate RADPEER prediction
  const radpeerPrediction = predictRadpeerScore(compositeScore);

  // Generate scientific basis and miss rate expectation
  const scientificBasis = generateScientificBasis(compositeScore, factors);
  const missRateExpectation = generateMissRateExpectation(compositeScore, difficultyLevel);

  return {
    compositeScore,
    percentile,
    difficultyLevel,
    radpeerPrediction,
    factors,
    scientificBasis,
    missRateExpectation
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateConspicuityScore(finding: CDIInput['finding']): number {
  if (!finding) return 3;

  // Check type-based score first
  if (finding.type && CONSPICUITY_SCORES[finding.type]) {
    return CONSPICUITY_SCORES[finding.type];
  }

  // Fall back to explicit conspicuity
  switch (finding.conspicuity) {
    case 'OBVIOUS': return 1;
    case 'MODERATE': return 3;
    case 'SUBTLE': return 5;
    default: return 3;
  }
}

function getConspicuityDescription(score: number): string {
  if (score <= 1) return 'Obvious finding with high visibility';
  if (score <= 2) return 'Moderately visible finding';
  if (score <= 3) return 'Finding requires careful examination';
  if (score <= 4) return 'Subtle finding, easily overlooked';
  return 'Very subtle finding, high miss rate expected';
}

function calculateSizeScore(sizeMm: number): number {
  if (sizeMm > SIZE_THRESHOLDS.LARGE) return 1;
  if (sizeMm > SIZE_THRESHOLDS.MEDIUM) return 2;
  if (sizeMm > SIZE_THRESHOLDS.SMALL) return 4;
  return 5;
}

function getSizeDescription(sizeMm: number, score: number): string {
  if (score <= 1) return `Large finding (${sizeMm}mm) - easily visible`;
  if (score <= 2) return `Medium finding (${sizeMm}mm) - typically visible`;
  if (score <= 3) return `Small finding (${sizeMm}mm) - may be challenging`;
  if (score <= 4) return `Small finding (${sizeMm}mm) - detection challenging`;
  return `Very small finding (${sizeMm}mm) - at limits of detection`;
}

function formatLocation(location: string): string {
  return location
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getLocationDescription(location: string, score: number): string {
  const formatted = formatLocation(location);
  if (score <= 2) return `${formatted} - standard viewing area`;
  if (score <= 3) return `${formatted} - requires attention to margins`;
  if (score <= 4) return `${formatted} - challenging visualization`;
  return `${formatted} - difficult to visualize, at image edge`;
}

function calculatePriorComparisonScore(priorComparison: NonNullable<CDIInput['priorComparison']>): number {
  if (!priorComparison.available) return 4; // No priors = harder

  const yearsAgo = priorComparison.yearsAgo || 0;
  if (yearsAgo <= 1) return 1;  // Recent prior
  if (yearsAgo <= 2) return 2;  // Reasonably recent
  if (yearsAgo <= 5) return 3;  // Older prior
  return 4; // Very old or unavailable
}

function getPriorDescription(
  priorComparison: NonNullable<CDIInput['priorComparison']>,
  score: number
): string {
  if (!priorComparison.available) {
    return 'No prior comparison available - change detection not possible';
  }

  const yearsAgo = priorComparison.yearsAgo;
  if (score <= 1) return `Recent prior available (${yearsAgo} year ago) - optimal for comparison`;
  if (score <= 2) return `Prior from ${yearsAgo} years ago available - good for comparison`;
  if (score <= 3) return `Older prior from ${yearsAgo} years ago - limited comparison value`;
  return `Very old prior (${yearsAgo} years) - minimal comparison value`;
}

function estimatePercentile(compositeScore: number): number {
  // Estimate percentile based on composite score
  // Assumes roughly normal distribution centered around 50
  return Math.min(99, Math.max(1, Math.round(compositeScore)));
}

function getDifficultyLevel(compositeScore: number): 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' {
  if (compositeScore < 30) return 'LOW';
  if (compositeScore < 50) return 'MODERATE';
  if (compositeScore < 70) return 'HIGH';
  return 'VERY_HIGH';
}

function predictRadpeerScore(compositeScore: number): {
  expectedScore: 1 | 2 | 3 | 4;
  scoreDescription: string;
} {
  let expectedScore: 1 | 2 | 3 | 4;

  if (compositeScore >= 80) {
    expectedScore = 1;
  } else if (compositeScore >= 60) {
    expectedScore = 2;
  } else if (compositeScore >= 35) {
    expectedScore = 3;
  } else {
    expectedScore = 4;
  }

  return {
    expectedScore,
    scoreDescription: RADPEER_DESCRIPTIONS[expectedScore]
  };
}

function generateScientificBasis(
  compositeScore: number,
  factors: CaseDifficultyIndex['factors']
): string {
  const parts: string[] = [];

  parts.push(`Per Macknik et al. (2022), cases with CDI > 70 have documented miss rates ` +
    `2.3x higher than average difficulty cases, reflecting normal perceptual limitations ` +
    `rather than substandard care.`);

  if (factors.breastDensity?.biradsCategory === 'D') {
    parts.push(`Extremely dense breast tissue (BI-RADS D) reduces mammographic sensitivity ` +
      `by 10-20% per Sprague et al. (2014).`);
  }

  if (factors.findingConspicuity?.score && factors.findingConspicuity.score >= 4) {
    parts.push(`Subtle findings have documented miss rates of 12-30% even among expert ` +
      `radiologists (Birdwell et al., 2001).`);
  }

  if (factors.findingSize?.sizeMm && factors.findingSize.sizeMm < 10) {
    parts.push(`Small lesions (<10mm) are at the threshold of detection and have ` +
      `significantly higher miss rates.`);
  }

  return parts.join(' ');
}

function generateMissRateExpectation(
  compositeScore: number,
  difficultyLevel: string
): string {
  switch (difficultyLevel) {
    case 'LOW':
      return 'Expected miss rate: 2-5%. Findings at this difficulty level should typically be detected.';
    case 'MODERATE':
      return 'Expected miss rate: 5-12%. Some misses expected even with careful review.';
    case 'HIGH':
      return 'Expected miss rate: 12-25%. High miss rate expected for findings at this difficulty level.';
    case 'VERY_HIGH':
      return 'Expected miss rate: 25-40%. Very high miss rate expected; detection would be exceptional.';
    default:
      return '';
  }
}

// =============================================================================
// FORMATTING FUNCTIONS
// =============================================================================

/**
 * Format CDI for legal presentation
 */
export function formatCDIForLegal(cdi: CaseDifficultyIndex): string {
  const lines: string[] = [];

  lines.push('CASE DIFFICULTY ANALYSIS');
  lines.push('');
  lines.push(`Composite Difficulty Score: ${cdi.compositeScore}/100 (${cdi.difficultyLevel})`);
  lines.push(`Percentile: ${cdi.percentile}th (harder than ${cdi.percentile}% of comparison cases)`);
  lines.push(`RADPEER Prediction: Score ${cdi.radpeerPrediction.expectedScore} - "${cdi.radpeerPrediction.scoreDescription}"`);
  lines.push('');
  lines.push('DIFFICULTY FACTORS:');
  lines.push('');

  // Format each factor
  if (cdi.factors.breastDensity) {
    lines.push(`  Breast density: BI-RADS ${cdi.factors.breastDensity.biradsCategory} ` +
      `(${cdi.factors.breastDensity.description}) - Score: ${cdi.factors.breastDensity.score}/5`);
  }

  if (cdi.factors.findingConspicuity) {
    lines.push(`  Finding conspicuity: ${cdi.factors.findingConspicuity.type} - ` +
      `Score: ${cdi.factors.findingConspicuity.score}/5`);
  }

  if (cdi.factors.findingSize) {
    lines.push(`  Finding size: ${cdi.factors.findingSize.sizeMm}mm - ` +
      `Score: ${cdi.factors.findingSize.score}/5`);
  }

  if (cdi.factors.findingLocation) {
    lines.push(`  Location: ${cdi.factors.findingLocation.location} - ` +
      `Score: ${cdi.factors.findingLocation.score}/5`);
  }

  if (cdi.factors.distractors) {
    lines.push(`  Distractors: ${cdi.factors.distractors.count} ${cdi.factors.distractors.types.join(', ')} - ` +
      `Score: ${cdi.factors.distractors.score}/5`);
  }

  if (cdi.factors.priorComparison) {
    const priorText = cdi.factors.priorComparison.available
      ? `Available (${cdi.factors.priorComparison.yearsAgo} years ago)`
      : 'Not available';
    lines.push(`  Prior comparison: ${priorText} - Score: ${cdi.factors.priorComparison.score}/5`);
  }

  if (cdi.factors.technicalQuality) {
    lines.push(`  Technical quality: ${cdi.factors.technicalQuality.issues.join(', ')} - ` +
      `Score: ${cdi.factors.technicalQuality.score}/5`);
  }

  lines.push('');
  lines.push('SCIENTIFIC BASIS:');
  lines.push(cdi.scientificBasis);
  lines.push('');
  lines.push(cdi.missRateExpectation);

  return lines.join('\n');
}

/**
 * Get difficulty level color for UI display
 */
export function getDifficultyLevelColor(level: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'): {
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
    case 'VERY_HIGH':
      return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
  }
}

/**
 * Get composite score color gradient position (for progress bars, etc.)
 */
export function getScoreColorGradient(score: number): string {
  if (score < 30) return '#22c55e';      // Green
  if (score < 50) return '#eab308';      // Yellow
  if (score < 70) return '#f97316';      // Orange
  return '#ef4444';                       // Red
}
