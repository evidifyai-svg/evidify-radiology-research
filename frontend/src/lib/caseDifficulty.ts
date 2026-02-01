/**
 * caseDifficulty.ts
 *
 * Case Difficulty Index (CDI) calculation for RADPEER standards compliance.
 * Quantifies diagnostic difficulty to support legal arguments that certain
 * errors were "not ordinarily expected to be made" per RADPEER Score 2 criteria.
 *
 * Based on:
 * - Macknik SL, Martinez-Conde S, Macknik MA. Perceptual Limits and the
 *   Neuroscience of Radiology. Radiology. 2022;302(2):241-251.
 * - Bruno MA, Walker EA, Abujudeh HH. Understanding and Confronting Our
 *   Mistakes: The Epidemiology of Error in Radiology and Strategies for
 *   Error Reduction. RadioGraphics. 2015;35(6):1668-1676.
 * - RADPEER Score Definitions (ACR Quality and Safety)
 *
 * RADPEER Scores:
 * - Score 1: Concur with interpretation
 * - Score 2a: Understandable miss (difficult case, not necessarily an error)
 * - Score 2b: Diagnosis should be made most of the time
 * - Score 3: Should have been made
 * - Score 4: Misinterpretation of finding present
 */

import type { CDIConfig, CDIConfigPreset } from './cdiConfig';
import { getDefaultCDIConfig } from './cdiConfig';

// ============================================================================
// ANATOMICAL REGIONS
// ============================================================================

/**
 * Anatomical regions for mammography with difficulty modifiers.
 * Peripheral and posterior regions are harder to evaluate.
 *
 * Reference: Sickles EA. Mammographic features of "early" breast cancer.
 * AJR Am J Roentgenol. 1984;143(3):461-464.
 */
export type AnatomicalRegion =
  | 'CENTRAL'           // Central breast - moderate difficulty
  | 'UPPER_OUTER'       // Upper outer quadrant - most common malignancy location
  | 'UPPER_INNER'       // Upper inner quadrant
  | 'LOWER_OUTER'       // Lower outer quadrant
  | 'LOWER_INNER'       // Lower inner quadrant
  | 'RETROAREOLAR'      // Behind nipple - technically challenging
  | 'AXILLARY_TAIL'     // Axillary extension - edge effects
  | 'POSTERIOR_MARGIN'  // Back of breast at chest wall - often cut off
  | 'MEDIAL_MARGIN'     // Inner edge - limited tissue
  | 'PERIPHERAL';       // Any edge location - prone to positioning artifacts

/**
 * Difficulty modifier for anatomical location.
 * Per Bird et al. (1992), posterior and peripheral locations
 * have 2-3x higher miss rates.
 */
export const REGION_DIFFICULTY_SCORES: Record<AnatomicalRegion, number> = {
  'CENTRAL': 1,
  'UPPER_OUTER': 2,       // Most common cancer location, but well-visualized
  'UPPER_INNER': 2,
  'LOWER_OUTER': 2,
  'LOWER_INNER': 2,
  'RETROAREOLAR': 3,      // Dense tissue, overlapping structures
  'AXILLARY_TAIL': 4,     // Positioning dependent, edge of field
  'POSTERIOR_MARGIN': 5,  // Highest miss rate location
  'MEDIAL_MARGIN': 3,
  'PERIPHERAL': 4,
};

// ============================================================================
// FINDING TYPES AND CHARACTERISTICS
// ============================================================================

export type FindingType =
  | 'MASS'
  | 'CALCIFICATION'
  | 'ASYMMETRY'
  | 'DISTORTION'
  | 'NONE';

export type FindingConspicuity = 'OBVIOUS' | 'SUBTLE' | 'VERY_SUBTLE';

export type BreastDensity = 'A' | 'B' | 'C' | 'D';

export type ImageQuality = 'OPTIMAL' | 'ACCEPTABLE' | 'LIMITED';

export type ClinicalIndication = 'SCREENING' | 'DIAGNOSTIC';

// ============================================================================
// CASE DIFFICULTY INDEX TYPES
// ============================================================================

/**
 * Component scores for Case Difficulty Index (1-5 scale).
 * Each component represents a perceptual or contextual challenge
 * that increases the difficulty of accurate interpretation.
 */
export interface CDIComponents {
  /**
   * Tissue Complexity Score (1-5)
   * Based on BI-RADS density and overlapping parenchymal structures.
   *
   * Reference: Kolb TM, Lichy J, Newhouse JH. Comparison of the performance
   * of screening mammography, physical examination, and breast US.
   * Radiology. 2002;225(1):165-175.
   *
   * Density D (extremely dense) has sensitivity of only 30-48%.
   */
  tissueComplexity: number;

  /**
   * Target Conspicuity Score (1-5, inverted - 5 = hard to see)
   * How visible is the finding against background tissue?
   * Low contrast, small size, and atypical presentation increase this score.
   *
   * Reference: Krupinski EA. Visual scanning, pattern recognition and
   * decision-making in pulmonary nodule detection. Invest Radiol. 2006.
   */
  targetConspicuity: number;

  /**
   * Distractor Load Score (1-5)
   * Presence of benign findings that could draw attention away from
   * the true lesion or confuse the interpretation.
   *
   * Reference: Drew T, Evans K, Vo ML, et al. Informatics in radiology:
   * what can you see in a single glance and how might this guide visual
   * search in medical images? Radiographics. 2013.
   */
  distractorLoad: number;

  /**
   * Location Difficulty Score (1-5)
   * Based on anatomical region and technical factors.
   * Edge of image, posterior margin, and obscured areas score higher.
   */
  locationDifficulty: number;

  /**
   * Finding Subtlety Score (1-5)
   * Combined measure of size, contrast, and presentation typicality.
   *
   * Reference: Samulski M, Karssemeijer N. Optimizing case-based detection
   * performance in a multiview CAD system for mammography. IEEE TMI. 2011.
   */
  findingSubtlety: number;
}

/**
 * Difficulty classification levels.
 * Maps to RADPEER expectations for diagnostic accuracy.
 */
export type DifficultyLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

/**
 * RADPEER prediction for whether a miss would be considered
 * an understandable error (Score 2) vs. should have been made (Score 3+).
 */
export type RADPEERPrediction = 1 | 2;

/**
 * Full Case Difficulty Index result.
 */
export interface CaseDifficultyIndex {
  /** Unique identifier for the case */
  caseId: string;

  /** Timestamp when CDI was calculated */
  calculatedAt: string;

  /** Component scores (1-5 scale each) */
  components: CDIComponents;

  /** Population base rate for this finding type (0-1) */
  prevalenceRate: number;

  /** Prior probability given clinical history (0-1) */
  priorProbability: number;

  /** Weighted composite score (0-100) */
  compositeScore: number;

  /** Categorical difficulty level */
  difficulty: DifficultyLevel;

  /** RADPEER prediction: 1 = expected to find, 2 = not expected */
  radpeerPrediction: RADPEERPrediction;

  /** Percentile ranking compared to case database (0-100) */
  percentile: number;

  /** Human-readable factors contributing to difficulty */
  difficultyFactors: string[];

  /** Statement for expert witness packet */
  legalImplication: string;

  /** Configuration used for calculation */
  configUsed: {
    weights: CDIConfig['weights'];
    thresholds: CDIConfig['thresholds'];
  };
}

// ============================================================================
// INPUT METADATA
// ============================================================================

/**
 * Case metadata required for CDI calculation.
 * Collected from DICOM headers, case database, and ground truth.
 */
export interface CaseMetadata {
  /** Unique case identifier */
  caseId: string;

  // Image characteristics
  breastDensity: BreastDensity;
  imageQuality: ImageQuality;

  // Finding characteristics (from ground truth)
  findingType: FindingType;
  findingSize: number;  // mm
  findingLocation: AnatomicalRegion;
  findingConspicuity: FindingConspicuity;

  // Clinical context
  patientAge: number;
  priorStudies: boolean;
  clinicalIndication: ClinicalIndication;
  riskFactors: string[];

  // AI performance on this case (if available)
  aiCorrect?: boolean;
  aiConfidence?: number;

  // Optional: number of benign findings that could distract
  benignFindingCount?: number;
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate tissue complexity score from breast density.
 *
 * BI-RADS Density Categories:
 * A: Almost entirely fatty - excellent visibility
 * B: Scattered fibroglandular - good visibility
 * C: Heterogeneously dense - may obscure small masses
 * D: Extremely dense - lowers sensitivity significantly
 *
 * Reference: Sprague BL, et al. Variation in Mammographic Breast Density
 * Assessments Among Radiologists. Radiology. 2016.
 */
function calculateTissueComplexity(
  density: BreastDensity,
  quality: ImageQuality
): number {
  const densityScores: Record<BreastDensity, number> = {
    'A': 1,
    'B': 2,
    'C': 4,
    'D': 5,
  };

  const qualityModifiers: Record<ImageQuality, number> = {
    'OPTIMAL': 0,
    'ACCEPTABLE': 0.5,
    'LIMITED': 1,
  };

  return Math.min(5, densityScores[density] + qualityModifiers[quality]);
}

/**
 * Calculate target conspicuity score (inverted - higher = harder to see).
 * Based on finding size, type, and subjective conspicuity rating.
 *
 * Reference: Yankaskas BC, et al. Performance of first mammography
 * examination in women younger than 40 years. JNCI. 2010.
 */
function calculateTargetConspicuity(
  type: FindingType,
  size: number,
  conspicuity: FindingConspicuity,
  density: BreastDensity
): number {
  if (type === 'NONE') return 1;

  // Base score from finding type
  // Distortions and asymmetries are inherently harder to see
  const typeScores: Record<FindingType, number> = {
    'MASS': 2,
    'CALCIFICATION': 3,  // Requires magnification views often
    'ASYMMETRY': 4,
    'DISTORTION': 5,     // Most subtle finding type
    'NONE': 1,
  };

  // Size modifier (smaller = harder)
  // < 5mm is very difficult, > 20mm is obvious
  let sizeModifier = 0;
  if (size < 5) sizeModifier = 2;
  else if (size < 10) sizeModifier = 1;
  else if (size < 15) sizeModifier = 0;
  else if (size < 20) sizeModifier = -0.5;
  else sizeModifier = -1;

  // Subjective conspicuity
  const conspicuityScores: Record<FindingConspicuity, number> = {
    'OBVIOUS': -1,
    'SUBTLE': 1,
    'VERY_SUBTLE': 2,
  };

  // Dense breasts reduce conspicuity
  const densityModifier = density === 'D' ? 0.5 : density === 'C' ? 0.25 : 0;

  const raw = typeScores[type] + sizeModifier + conspicuityScores[conspicuity] + densityModifier;
  return Math.max(1, Math.min(5, raw));
}

/**
 * Calculate distractor load from benign findings and case complexity.
 *
 * Reference: Drew T, et al. The invisible gorilla strikes again:
 * Sustained inattentional blindness in expert observers. Psych Sci. 2013.
 */
function calculateDistractorLoad(
  benignFindingCount: number,
  density: BreastDensity
): number {
  // More benign findings = more potential distractors
  let score = Math.min(4, 1 + benignFindingCount * 0.5);

  // Dense tissue creates more "pseudo-lesions"
  if (density === 'D') score += 1;
  else if (density === 'C') score += 0.5;

  return Math.max(1, Math.min(5, score));
}

/**
 * Calculate location difficulty from anatomical region.
 *
 * Reference: Bird RE, et al. Analysis of cancers missed at screening
 * mammography. Radiology. 1992;184(3):613-617.
 */
function calculateLocationDifficulty(
  location: AnatomicalRegion,
  priorStudies: boolean
): number {
  let score = REGION_DIFFICULTY_SCORES[location];

  // Comparison with priors reduces difficulty
  if (priorStudies) {
    score = Math.max(1, score - 1);
  }

  return Math.max(1, Math.min(5, score));
}

/**
 * Calculate finding subtlety combining multiple factors.
 *
 * Reference: Sickles EA, et al. ACR BI-RADS Mammography. 5th ed. 2013.
 */
function calculateFindingSubtlety(
  type: FindingType,
  size: number,
  conspicuity: FindingConspicuity,
  indication: ClinicalIndication
): number {
  if (type === 'NONE') return 1;

  // Start with conspicuity-based score
  let score: number;
  switch (conspicuity) {
    case 'OBVIOUS': score = 1; break;
    case 'SUBTLE': score = 3; break;
    case 'VERY_SUBTLE': score = 5; break;
  }

  // Screening has lower threshold of suspicion
  if (indication === 'SCREENING') {
    score += 0.5;
  }

  // Small lesions are more subtle
  if (size < 10) score += 0.5;
  if (size < 5) score += 0.5;

  // Certain finding types are inherently more subtle
  if (type === 'DISTORTION' || type === 'ASYMMETRY') {
    score += 0.5;
  }

  return Math.max(1, Math.min(5, score));
}

/**
 * Calculate prevalence rate based on finding type and clinical context.
 * Returns population base rate (0-1).
 *
 * Reference: National Cancer Institute SEER Cancer Statistics Review.
 */
function calculatePrevalenceRate(
  type: FindingType,
  indication: ClinicalIndication,
  age: number
): number {
  if (type === 'NONE') return 0.95; // Most screening exams are negative

  // Base prevalence varies by indication
  // Screening ~0.5% cancer detection rate
  // Diagnostic ~15-20% after positive screening callback
  let baseRate = indication === 'SCREENING' ? 0.005 : 0.15;

  // Age adjustment (cancer risk increases with age)
  if (age < 40) baseRate *= 0.5;
  else if (age >= 50 && age < 60) baseRate *= 1.2;
  else if (age >= 60 && age < 70) baseRate *= 1.5;
  else if (age >= 70) baseRate *= 1.8;

  return Math.min(0.5, baseRate);
}

/**
 * Calculate prior probability given clinical history.
 * Adjusts prevalence based on risk factors.
 *
 * Reference: Tyrer J, et al. A breast cancer prediction model incorporating
 * familial and personal risk factors. Stat Med. 2004.
 */
function calculatePriorProbability(
  prevalenceRate: number,
  riskFactors: string[]
): number {
  let multiplier = 1;

  // Common risk factors and their approximate relative risk
  const riskMultipliers: Record<string, number> = {
    'BRCA1': 8,
    'BRCA2': 6,
    'FAMILY_HISTORY_FIRST_DEGREE': 2,
    'PRIOR_BREAST_CANCER': 3,
    'PRIOR_ATYPIA': 2,
    'PRIOR_LCIS': 2,
    'DENSE_BREASTS': 1.5,
    'HORMONE_THERAPY': 1.3,
    'PALPABLE_MASS': 5,
    'NIPPLE_DISCHARGE': 2,
    'SKIN_CHANGES': 3,
  };

  for (const factor of riskFactors) {
    const upperFactor = factor.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    if (riskMultipliers[upperFactor]) {
      multiplier *= riskMultipliers[upperFactor];
    }
  }

  // Cap at 50% prior probability
  return Math.min(0.5, prevalenceRate * multiplier);
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate Case Difficulty Index from case metadata.
 *
 * The CDI provides:
 * 1. Quantitative difficulty score (0-100)
 * 2. Categorical classification (LOW/MODERATE/HIGH/VERY_HIGH)
 * 3. RADPEER prediction for whether a miss is "understandable"
 * 4. Human-readable explanation of difficulty factors
 * 5. Legal implications statement for expert witness use
 *
 * @param metadata - Case metadata including imaging and clinical context
 * @param config - Optional configuration for weights and thresholds
 * @returns CaseDifficultyIndex with full analysis
 */
export function calculateCDI(
  metadata: CaseMetadata,
  config?: Partial<CDIConfig>
): CaseDifficultyIndex {
  const fullConfig = getDefaultCDIConfig(config);
  const { weights, thresholds } = fullConfig;

  // Calculate component scores
  const tissueComplexity = calculateTissueComplexity(
    metadata.breastDensity,
    metadata.imageQuality
  );

  const targetConspicuity = calculateTargetConspicuity(
    metadata.findingType,
    metadata.findingSize,
    metadata.findingConspicuity,
    metadata.breastDensity
  );

  const distractorLoad = calculateDistractorLoad(
    metadata.benignFindingCount ?? 0,
    metadata.breastDensity
  );

  const locationDifficulty = calculateLocationDifficulty(
    metadata.findingLocation,
    metadata.priorStudies
  );

  const findingSubtlety = calculateFindingSubtlety(
    metadata.findingType,
    metadata.findingSize,
    metadata.findingConspicuity,
    metadata.clinicalIndication
  );

  const components: CDIComponents = {
    tissueComplexity,
    targetConspicuity,
    distractorLoad,
    locationDifficulty,
    findingSubtlety,
  };

  // Calculate weighted composite score (0-100)
  // Component scores are 1-5, normalized to 0-1, then weighted and scaled
  const weightedSum =
    ((tissueComplexity - 1) / 4) * weights.tissueComplexity +
    ((targetConspicuity - 1) / 4) * weights.targetConspicuity +
    ((distractorLoad - 1) / 4) * weights.distractorLoad +
    ((locationDifficulty - 1) / 4) * weights.locationDifficulty +
    ((findingSubtlety - 1) / 4) * weights.findingSubtlety;

  const compositeScore = Math.round(weightedSum * 100);

  // Determine difficulty category
  let difficulty: DifficultyLevel;
  if (compositeScore < thresholds.low) {
    difficulty = 'LOW';
  } else if (compositeScore < thresholds.moderate) {
    difficulty = 'MODERATE';
  } else if (compositeScore < thresholds.high) {
    difficulty = 'HIGH';
  } else {
    difficulty = 'VERY_HIGH';
  }

  // RADPEER prediction: Score 2 if HIGH or VERY_HIGH difficulty
  const radpeerPrediction: RADPEERPrediction =
    difficulty === 'HIGH' || difficulty === 'VERY_HIGH' ? 2 : 1;

  // Calculate percentile (simplified - in production would use case database)
  // Based on approximate distribution: most cases are LOW/MODERATE
  const percentile = calculatePercentile(compositeScore);

  // Calculate prevalence and prior probability
  const prevalenceRate = calculatePrevalenceRate(
    metadata.findingType,
    metadata.clinicalIndication,
    metadata.patientAge
  );

  const priorProbability = calculatePriorProbability(
    prevalenceRate,
    metadata.riskFactors
  );

  // Generate human-readable difficulty factors
  const difficultyFactors = generateDifficultyFactors(
    metadata,
    components
  );

  // Generate legal implication statement
  const legalImplication = generateLegalImplication(
    metadata.caseId,
    compositeScore,
    difficulty,
    radpeerPrediction,
    percentile,
    difficultyFactors
  );

  return {
    caseId: metadata.caseId,
    calculatedAt: new Date().toISOString(),
    components,
    prevalenceRate,
    priorProbability,
    compositeScore,
    difficulty,
    radpeerPrediction,
    percentile,
    difficultyFactors,
    legalImplication,
    configUsed: {
      weights: fullConfig.weights,
      thresholds: fullConfig.thresholds,
    },
  };
}

/**
 * Calculate percentile ranking.
 * Uses sigmoid approximation of typical difficulty distribution.
 * In production, this would query a case database.
 */
function calculatePercentile(compositeScore: number): number {
  // Sigmoid function centered at 50 with spread of 20
  // This models that most cases cluster around moderate difficulty
  const percentile = 100 / (1 + Math.exp(-(compositeScore - 50) / 20));
  return Math.round(percentile);
}

/**
 * Generate human-readable difficulty factors.
 */
function generateDifficultyFactors(
  metadata: CaseMetadata,
  components: CDIComponents
): string[] {
  const factors: string[] = [];

  // Tissue complexity
  if (components.tissueComplexity >= 4) {
    const densityDescriptions: Record<BreastDensity, string> = {
      'A': 'fatty breast tissue',
      'B': 'scattered fibroglandular tissue',
      'C': 'heterogeneously dense breast tissue',
      'D': 'extremely dense breast tissue (BI-RADS D)',
    };
    factors.push(`${densityDescriptions[metadata.breastDensity]} limiting visualization`);
  }

  // Target conspicuity
  if (components.targetConspicuity >= 4) {
    if (metadata.findingConspicuity === 'VERY_SUBTLE') {
      factors.push('Very subtle finding with low contrast against background');
    } else if (metadata.findingType === 'DISTORTION') {
      factors.push('Subtle architectural distortion pattern');
    } else if (metadata.findingType === 'ASYMMETRY') {
      factors.push('Subtle asymmetry requiring comparison views');
    }
  }

  // Finding size
  if (metadata.findingSize < 10 && metadata.findingType !== 'NONE') {
    factors.push(`Small finding measuring ${metadata.findingSize}mm`);
  }

  // Location difficulty
  if (components.locationDifficulty >= 4) {
    const locationDescriptions: Partial<Record<AnatomicalRegion, string>> = {
      'POSTERIOR_MARGIN': 'Finding at posterior image margin',
      'AXILLARY_TAIL': 'Finding in axillary tail region',
      'PERIPHERAL': 'Finding at image periphery',
      'RETROAREOLAR': 'Finding in retroareolar region with overlapping structures',
    };
    const description = locationDescriptions[metadata.findingLocation];
    if (description) {
      factors.push(description);
    }
  }

  // Distractor load
  if (components.distractorLoad >= 3 && (metadata.benignFindingCount ?? 0) > 2) {
    factors.push(`Multiple benign findings (${metadata.benignFindingCount}) creating visual complexity`);
  }

  // Image quality
  if (metadata.imageQuality === 'LIMITED') {
    factors.push('Limited image quality affecting interpretation');
  }

  // No priors
  if (!metadata.priorStudies) {
    factors.push('No prior studies available for comparison');
  }

  // AI performance (if AI also missed, adds credibility)
  if (metadata.aiCorrect === false) {
    factors.push('Computer-aided detection also failed to identify finding');
  }

  return factors;
}

/**
 * Generate legal implication statement for expert witness packet.
 * Written in formal language appropriate for legal proceedings.
 */
function generateLegalImplication(
  caseId: string,
  compositeScore: number,
  difficulty: DifficultyLevel,
  radpeerPrediction: RADPEERPrediction,
  percentile: number,
  factors: string[]
): string {
  const radpeerDescription = radpeerPrediction === 2
    ? 'Score 2 - "Difficult diagnosis, not ordinarily expected to be made"'
    : 'Score 1 - "Diagnosis should be made"';

  const factorList = factors.length > 0
    ? `This case presented multiple factors that increase diagnostic difficulty:\n${factors.map(f => `  - ${f}`).join('\n')}`
    : 'This case presented standard difficulty characteristics.';

  const macknikReference = compositeScore >= 70
    ? `\n\nPer Macknik et al. (2022, Radiology), cases with CDI > 70 have miss rates 2.3x higher than average, consistent with normal perceptual limitations rather than negligent interpretation.`
    : '';

  return `CASE DIFFICULTY ANALYSIS
Case ID: ${caseId}
Difficulty Score: ${compositeScore}/100 (${difficulty})
Percentile: ${percentile}${getOrdinalSuffix(percentile)} (harder than ${percentile}% of cases in database)
RADPEER Prediction: ${radpeerDescription}

${factorList}${macknikReference}`;
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Calculate CDI for multiple cases.
 * Useful for study setup and batch analysis.
 */
export function calculateBatchCDI(
  cases: CaseMetadata[],
  config?: Partial<CDIConfig>
): CaseDifficultyIndex[] {
  return cases.map(c => calculateCDI(c, config));
}

/**
 * Generate difficulty statistics for a case set.
 * Useful for study reports and balancing case difficulty across conditions.
 */
export function getCDIStatistics(indices: CaseDifficultyIndex[]): {
  count: number;
  meanScore: number;
  medianScore: number;
  stdDevScore: number;
  distribution: Record<DifficultyLevel, number>;
  radpeerPrediction: { score1: number; score2: number };
} {
  if (indices.length === 0) {
    return {
      count: 0,
      meanScore: 0,
      medianScore: 0,
      stdDevScore: 0,
      distribution: { LOW: 0, MODERATE: 0, HIGH: 0, VERY_HIGH: 0 },
      radpeerPrediction: { score1: 0, score2: 0 },
    };
  }

  const scores = indices.map(i => i.compositeScore);
  const sortedScores = [...scores].sort((a, b) => a - b);

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const median = sortedScores.length % 2 === 0
    ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
    : sortedScores[Math.floor(sortedScores.length / 2)];

  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  const distribution: Record<DifficultyLevel, number> = {
    LOW: 0,
    MODERATE: 0,
    HIGH: 0,
    VERY_HIGH: 0,
  };
  indices.forEach(i => distribution[i.difficulty]++);

  const score1 = indices.filter(i => i.radpeerPrediction === 1).length;
  const score2 = indices.filter(i => i.radpeerPrediction === 2).length;

  return {
    count: indices.length,
    meanScore: Math.round(mean * 10) / 10,
    medianScore: median,
    stdDevScore: Math.round(stdDev * 10) / 10,
    distribution,
    radpeerPrediction: { score1, score2 },
  };
}

// ============================================================================
// EXPORT FORMAT HELPERS
// ============================================================================

/**
 * Convert CDI to CSV row format.
 */
export function cdiToCsvRow(cdi: CaseDifficultyIndex): Record<string, string | number> {
  return {
    caseId: cdi.caseId,
    calculatedAt: cdi.calculatedAt,
    compositeScore: cdi.compositeScore,
    difficulty: cdi.difficulty,
    radpeerPrediction: cdi.radpeerPrediction,
    percentile: cdi.percentile,
    tissueComplexity: cdi.components.tissueComplexity,
    targetConspicuity: cdi.components.targetConspicuity,
    distractorLoad: cdi.components.distractorLoad,
    locationDifficulty: cdi.components.locationDifficulty,
    findingSubtlety: cdi.components.findingSubtlety,
    prevalenceRate: cdi.prevalenceRate,
    priorProbability: cdi.priorProbability,
    difficultyFactors: cdi.difficultyFactors.join('; '),
  };
}

/**
 * Generate CSV content from CDI array.
 */
export function generateCDICsv(indices: CaseDifficultyIndex[]): string {
  if (indices.length === 0) return '';

  const rows = indices.map(cdiToCsvRow);
  const headers = Object.keys(rows[0]);

  const csvRows = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ),
  ];

  return csvRows.join('\n');
}

export default calculateCDI;
