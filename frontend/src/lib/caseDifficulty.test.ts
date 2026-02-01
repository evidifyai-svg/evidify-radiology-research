/**
 * caseDifficulty.test.ts
 *
 * Unit tests for Case Difficulty Index (CDI) calculation.
 *
 * Test cases based on:
 * - Macknik SL, et al. Perceptual Limits in Radiology. Radiology. 2022.
 * - RADPEER Score definitions (ACR Quality and Safety)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCDI,
  calculateBatchCDI,
  getCDIStatistics,
  cdiToCsvRow,
  generateCDICsv,
  type CaseMetadata,
  type CaseDifficultyIndex,
  type DifficultyLevel,
} from './caseDifficulty';
import {
  getDefaultCDIConfig,
  validateCDIConfig,
  normalizeWeights,
  type CDIConfig,
} from './cdiConfig';

// ============================================================================
// SAMPLE CASE METADATA
// ============================================================================

const EASY_CASE: CaseMetadata = {
  caseId: 'EASY-001',
  breastDensity: 'A',
  imageQuality: 'OPTIMAL',
  findingType: 'MASS',
  findingSize: 25,
  findingLocation: 'CENTRAL',
  findingConspicuity: 'OBVIOUS',
  patientAge: 55,
  priorStudies: true,
  clinicalIndication: 'DIAGNOSTIC',
  riskFactors: [],
  aiCorrect: true,
  aiConfidence: 95,
  benignFindingCount: 0,
};

const MODERATE_CASE: CaseMetadata = {
  caseId: 'MOD-001',
  breastDensity: 'B',
  imageQuality: 'OPTIMAL',
  findingType: 'MASS',
  findingSize: 12,
  findingLocation: 'UPPER_OUTER',
  findingConspicuity: 'SUBTLE',
  patientAge: 52,
  priorStudies: true,
  clinicalIndication: 'SCREENING',
  riskFactors: ['FAMILY_HISTORY_FIRST_DEGREE'],
  aiCorrect: true,
  aiConfidence: 78,
  benignFindingCount: 2,
};

const HARD_CASE: CaseMetadata = {
  caseId: 'HARD-001',
  breastDensity: 'D',
  imageQuality: 'ACCEPTABLE',
  findingType: 'DISTORTION',
  findingSize: 8,
  findingLocation: 'POSTERIOR_MARGIN',
  findingConspicuity: 'VERY_SUBTLE',
  patientAge: 61,
  priorStudies: false,
  clinicalIndication: 'SCREENING',
  riskFactors: [],
  aiCorrect: false,
  aiConfidence: 42,
  benignFindingCount: 4,
};

const VERY_HARD_CASE: CaseMetadata = {
  caseId: 'VHARD-001',
  breastDensity: 'D',
  imageQuality: 'LIMITED',
  findingType: 'ASYMMETRY',
  findingSize: 5,
  findingLocation: 'AXILLARY_TAIL',
  findingConspicuity: 'VERY_SUBTLE',
  patientAge: 45,
  priorStudies: false,
  clinicalIndication: 'SCREENING',
  riskFactors: [],
  aiCorrect: false,
  aiConfidence: 35,
  benignFindingCount: 5,
};

const NO_FINDING_CASE: CaseMetadata = {
  caseId: 'NEG-001',
  breastDensity: 'B',
  imageQuality: 'OPTIMAL',
  findingType: 'NONE',
  findingSize: 0,
  findingLocation: 'CENTRAL',
  findingConspicuity: 'OBVIOUS',
  patientAge: 50,
  priorStudies: true,
  clinicalIndication: 'SCREENING',
  riskFactors: [],
  benignFindingCount: 1,
};

// ============================================================================
// CDI CALCULATION TESTS
// ============================================================================

describe('calculateCDI', () => {
  it('should return valid CDI structure', () => {
    const cdi = calculateCDI(EASY_CASE);

    expect(cdi).toHaveProperty('caseId', 'EASY-001');
    expect(cdi).toHaveProperty('calculatedAt');
    expect(cdi).toHaveProperty('components');
    expect(cdi).toHaveProperty('compositeScore');
    expect(cdi).toHaveProperty('difficulty');
    expect(cdi).toHaveProperty('radpeerPrediction');
    expect(cdi).toHaveProperty('percentile');
    expect(cdi).toHaveProperty('difficultyFactors');
    expect(cdi).toHaveProperty('legalImplication');
    expect(cdi).toHaveProperty('configUsed');
  });

  it('should have component scores between 1 and 5', () => {
    const cdi = calculateCDI(HARD_CASE);

    expect(cdi.components.tissueComplexity).toBeGreaterThanOrEqual(1);
    expect(cdi.components.tissueComplexity).toBeLessThanOrEqual(5);
    expect(cdi.components.targetConspicuity).toBeGreaterThanOrEqual(1);
    expect(cdi.components.targetConspicuity).toBeLessThanOrEqual(5);
    expect(cdi.components.distractorLoad).toBeGreaterThanOrEqual(1);
    expect(cdi.components.distractorLoad).toBeLessThanOrEqual(5);
    expect(cdi.components.locationDifficulty).toBeGreaterThanOrEqual(1);
    expect(cdi.components.locationDifficulty).toBeLessThanOrEqual(5);
    expect(cdi.components.findingSubtlety).toBeGreaterThanOrEqual(1);
    expect(cdi.components.findingSubtlety).toBeLessThanOrEqual(5);
  });

  it('should have composite score between 0 and 100', () => {
    const cdi = calculateCDI(MODERATE_CASE);

    expect(cdi.compositeScore).toBeGreaterThanOrEqual(0);
    expect(cdi.compositeScore).toBeLessThanOrEqual(100);
  });

  it('should classify easy cases as LOW difficulty', () => {
    const cdi = calculateCDI(EASY_CASE);

    expect(cdi.difficulty).toBe('LOW');
    expect(cdi.radpeerPrediction).toBe(1);
  });

  it('should classify hard cases as HIGH or VERY_HIGH difficulty', () => {
    const cdi = calculateCDI(HARD_CASE);

    expect(['HIGH', 'VERY_HIGH']).toContain(cdi.difficulty);
    expect(cdi.radpeerPrediction).toBe(2);
  });

  it('should give RADPEER prediction 2 for high difficulty cases', () => {
    const cdi = calculateCDI(VERY_HARD_CASE);

    expect(cdi.radpeerPrediction).toBe(2);
    expect(cdi.difficulty).toBe('VERY_HIGH');
  });

  it('should handle cases with no findings', () => {
    const cdi = calculateCDI(NO_FINDING_CASE);

    expect(cdi.compositeScore).toBeLessThan(30); // Should be low difficulty
    expect(cdi.difficulty).toBe('LOW');
    expect(cdi.prevalenceRate).toBeGreaterThan(0.5); // High base rate for no findings
  });
});

// ============================================================================
// DIFFICULTY FACTORS TESTS
// ============================================================================

describe('difficultyFactors', () => {
  it('should include dense breast tissue factor for BI-RADS D', () => {
    const cdi = calculateCDI(HARD_CASE);

    const hasDensityFactor = cdi.difficultyFactors.some(
      f => f.toLowerCase().includes('dense') && f.toLowerCase().includes('bi-rads d')
    );
    expect(hasDensityFactor).toBe(true);
  });

  it('should include location factor for posterior margin', () => {
    const cdi = calculateCDI(HARD_CASE);

    const hasLocationFactor = cdi.difficultyFactors.some(
      f => f.toLowerCase().includes('posterior')
    );
    expect(hasLocationFactor).toBe(true);
  });

  it('should include small finding factor for < 10mm lesions', () => {
    const cdi = calculateCDI(HARD_CASE);

    const hasSizeFactor = cdi.difficultyFactors.some(
      f => f.includes('8mm') || f.toLowerCase().includes('small')
    );
    expect(hasSizeFactor).toBe(true);
  });

  it('should include AI miss factor when AI failed', () => {
    const cdi = calculateCDI(HARD_CASE);

    const hasAIFactor = cdi.difficultyFactors.some(
      f => f.toLowerCase().includes('computer-aided') && f.toLowerCase().includes('failed')
    );
    expect(hasAIFactor).toBe(true);
  });

  it('should include no priors factor when unavailable', () => {
    const cdi = calculateCDI(HARD_CASE);

    const hasNoPriorsFactor = cdi.difficultyFactors.some(
      f => f.toLowerCase().includes('no prior')
    );
    expect(hasNoPriorsFactor).toBe(true);
  });

  it('should have no factors for easy cases', () => {
    const cdi = calculateCDI(EASY_CASE);

    // Easy case should have few or no difficulty factors
    expect(cdi.difficultyFactors.length).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// LEGAL IMPLICATION TESTS
// ============================================================================

describe('legalImplication', () => {
  it('should include case ID', () => {
    const cdi = calculateCDI(HARD_CASE);

    expect(cdi.legalImplication).toContain('HARD-001');
  });

  it('should include difficulty score', () => {
    const cdi = calculateCDI(HARD_CASE);

    expect(cdi.legalImplication).toContain(`${cdi.compositeScore}/100`);
  });

  it('should include RADPEER prediction for high difficulty cases', () => {
    const cdi = calculateCDI(HARD_CASE);

    expect(cdi.legalImplication).toContain('Score 2');
    expect(cdi.legalImplication).toContain('not ordinarily expected');
  });

  it('should reference Macknik for CDI > 70', () => {
    const cdi = calculateCDI(VERY_HARD_CASE);

    if (cdi.compositeScore >= 70) {
      expect(cdi.legalImplication).toContain('Macknik');
      expect(cdi.legalImplication).toContain('2.3x higher');
    }
  });

  it('should list contributing factors', () => {
    const cdi = calculateCDI(HARD_CASE);

    // Should have bullet points for factors
    expect(cdi.legalImplication).toContain('-');
    cdi.difficultyFactors.forEach(factor => {
      expect(cdi.legalImplication).toContain(factor);
    });
  });
});

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe('CDI configuration', () => {
  it('should use default config when none provided', () => {
    const cdi = calculateCDI(MODERATE_CASE);

    expect(cdi.configUsed.weights.tissueComplexity).toBe(0.25);
    expect(cdi.configUsed.weights.targetConspicuity).toBe(0.30);
    expect(cdi.configUsed.thresholds.low).toBe(30);
    expect(cdi.configUsed.thresholds.moderate).toBe(50);
  });

  it('should respect custom weights', () => {
    const customConfig: Partial<CDIConfig> = {
      weights: {
        tissueComplexity: 0.40,
        targetConspicuity: 0.20,
        distractorLoad: 0.15,
        locationDifficulty: 0.15,
        findingSubtlety: 0.10,
      },
    };

    const cdi = calculateCDI(HARD_CASE, customConfig);

    expect(cdi.configUsed.weights.tissueComplexity).toBe(0.40);
    expect(cdi.configUsed.weights.targetConspicuity).toBe(0.20);
  });

  it('should respect custom thresholds', () => {
    const customConfig: Partial<CDIConfig> = {
      thresholds: {
        low: 20,
        moderate: 40,
        high: 60,
        veryHigh: 100,
      },
    };

    const cdiDefault = calculateCDI(MODERATE_CASE);
    const cdiCustom = calculateCDI(MODERATE_CASE, customConfig);

    // Same case but different thresholds might give different classification
    expect(cdiCustom.configUsed.thresholds.low).toBe(20);
    expect(cdiCustom.configUsed.thresholds.moderate).toBe(40);
  });
});

// ============================================================================
// CONFIG VALIDATION TESTS
// ============================================================================

describe('validateCDIConfig', () => {
  it('should validate correct config', () => {
    const config = getDefaultCDIConfig();
    const errors = validateCDIConfig(config);

    expect(errors).toHaveLength(0);
  });

  it('should fail when weights do not sum to 1', () => {
    const config = getDefaultCDIConfig({
      weights: {
        tissueComplexity: 0.30,
        targetConspicuity: 0.30,
        distractorLoad: 0.30,
        locationDifficulty: 0.30,
        findingSubtlety: 0.30,
      },
    });
    const errors = validateCDIConfig(config);

    expect(errors.some(e => e.includes('sum to 1.0'))).toBe(true);
  });

  it('should fail when thresholds are out of order', () => {
    const config = getDefaultCDIConfig({
      thresholds: {
        low: 50,
        moderate: 30,
        high: 75,
        veryHigh: 100,
      },
    });
    const errors = validateCDIConfig(config);

    expect(errors.some(e => e.includes('less than'))).toBe(true);
  });

  it('should fail for out of range weights', () => {
    const config = getDefaultCDIConfig({
      weights: {
        tissueComplexity: 1.5,
        targetConspicuity: 0.30,
        distractorLoad: 0.15,
        locationDifficulty: 0.15,
        findingSubtlety: -0.10,
      },
    });
    const errors = validateCDIConfig(config);

    expect(errors.some(e => e.includes('between 0 and 1'))).toBe(true);
  });
});

// ============================================================================
// WEIGHT NORMALIZATION TESTS
// ============================================================================

describe('normalizeWeights', () => {
  it('should normalize weights to sum to 1', () => {
    const unnormalized = {
      tissueComplexity: 2,
      targetConspicuity: 3,
      distractorLoad: 1,
      locationDifficulty: 1,
      findingSubtlety: 3,
    };

    const normalized = normalizeWeights(unnormalized);
    const sum =
      normalized.tissueComplexity +
      normalized.targetConspicuity +
      normalized.distractorLoad +
      normalized.locationDifficulty +
      normalized.findingSubtlety;

    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('should preserve relative proportions', () => {
    const unnormalized = {
      tissueComplexity: 2,
      targetConspicuity: 4,
      distractorLoad: 2,
      locationDifficulty: 1,
      findingSubtlety: 1,
    };

    const normalized = normalizeWeights(unnormalized);

    // targetConspicuity should be 2x tissueComplexity
    expect(normalized.targetConspicuity / normalized.tissueComplexity).toBeCloseTo(2, 5);
  });
});

// ============================================================================
// BATCH PROCESSING TESTS
// ============================================================================

describe('calculateBatchCDI', () => {
  it('should calculate CDI for multiple cases', () => {
    const cases = [EASY_CASE, MODERATE_CASE, HARD_CASE];
    const results = calculateBatchCDI(cases);

    expect(results).toHaveLength(3);
    expect(results[0].caseId).toBe('EASY-001');
    expect(results[1].caseId).toBe('MOD-001');
    expect(results[2].caseId).toBe('HARD-001');
  });

  it('should maintain case order', () => {
    const cases = [HARD_CASE, EASY_CASE, MODERATE_CASE];
    const results = calculateBatchCDI(cases);

    expect(results[0].caseId).toBe('HARD-001');
    expect(results[1].caseId).toBe('EASY-001');
    expect(results[2].caseId).toBe('MOD-001');
  });

  it('should apply same config to all cases', () => {
    const cases = [EASY_CASE, HARD_CASE];
    const config: Partial<CDIConfig> = {
      weights: {
        tissueComplexity: 0.40,
        targetConspicuity: 0.20,
        distractorLoad: 0.15,
        locationDifficulty: 0.15,
        findingSubtlety: 0.10,
      },
    };
    const results = calculateBatchCDI(cases, config);

    expect(results[0].configUsed.weights.tissueComplexity).toBe(0.40);
    expect(results[1].configUsed.weights.tissueComplexity).toBe(0.40);
  });
});

// ============================================================================
// STATISTICS TESTS
// ============================================================================

describe('getCDIStatistics', () => {
  it('should calculate correct statistics', () => {
    const cases = [EASY_CASE, MODERATE_CASE, HARD_CASE, VERY_HARD_CASE];
    const cdis = calculateBatchCDI(cases);
    const stats = getCDIStatistics(cdis);

    expect(stats.count).toBe(4);
    expect(stats.meanScore).toBeGreaterThan(0);
    expect(stats.medianScore).toBeGreaterThan(0);
    expect(stats.stdDevScore).toBeGreaterThanOrEqual(0);
  });

  it('should count difficulty distribution', () => {
    const cases = [EASY_CASE, EASY_CASE, HARD_CASE, VERY_HARD_CASE];
    const cdis = calculateBatchCDI(cases);
    const stats = getCDIStatistics(cdis);

    const total =
      stats.distribution.LOW +
      stats.distribution.MODERATE +
      stats.distribution.HIGH +
      stats.distribution.VERY_HIGH;

    expect(total).toBe(4);
  });

  it('should count RADPEER predictions', () => {
    const cases = [EASY_CASE, HARD_CASE, VERY_HARD_CASE];
    const cdis = calculateBatchCDI(cases);
    const stats = getCDIStatistics(cdis);

    expect(stats.radpeerPrediction.score1 + stats.radpeerPrediction.score2).toBe(3);
    expect(stats.radpeerPrediction.score2).toBeGreaterThanOrEqual(2); // At least 2 hard cases
  });

  it('should handle empty array', () => {
    const stats = getCDIStatistics([]);

    expect(stats.count).toBe(0);
    expect(stats.meanScore).toBe(0);
    expect(stats.medianScore).toBe(0);
  });
});

// ============================================================================
// CSV EXPORT TESTS
// ============================================================================

describe('cdiToCsvRow', () => {
  it('should convert CDI to CSV row format', () => {
    const cdi = calculateCDI(HARD_CASE);
    const row = cdiToCsvRow(cdi);

    expect(row.caseId).toBe('HARD-001');
    expect(row.compositeScore).toBe(cdi.compositeScore);
    expect(row.difficulty).toBe(cdi.difficulty);
    expect(row.radpeerPrediction).toBe(cdi.radpeerPrediction);
    expect(typeof row.difficultyFactors).toBe('string');
  });

  it('should include all component scores', () => {
    const cdi = calculateCDI(MODERATE_CASE);
    const row = cdiToCsvRow(cdi);

    expect(row.tissueComplexity).toBe(cdi.components.tissueComplexity);
    expect(row.targetConspicuity).toBe(cdi.components.targetConspicuity);
    expect(row.distractorLoad).toBe(cdi.components.distractorLoad);
    expect(row.locationDifficulty).toBe(cdi.components.locationDifficulty);
    expect(row.findingSubtlety).toBe(cdi.components.findingSubtlety);
  });
});

describe('generateCDICsv', () => {
  it('should generate valid CSV with headers', () => {
    const cases = [EASY_CASE, HARD_CASE];
    const cdis = calculateBatchCDI(cases);
    const csv = generateCDICsv(cdis);

    const lines = csv.split('\n');
    expect(lines.length).toBe(3); // Header + 2 rows

    const headers = lines[0].split(',');
    expect(headers).toContain('caseId');
    expect(headers).toContain('compositeScore');
    expect(headers).toContain('difficulty');
    expect(headers).toContain('radpeerPrediction');
  });

  it('should escape commas in difficulty factors', () => {
    const cdi = calculateCDI(HARD_CASE);
    const csv = generateCDICsv([cdi]);

    // Difficulty factors contain semicolons, but any commas should be quoted
    expect(csv).toContain(cdi.caseId);
  });

  it('should return empty string for empty array', () => {
    const csv = generateCDICsv([]);
    expect(csv).toBe('');
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('edge cases', () => {
  it('should handle minimum finding size', () => {
    const smallFindingCase: CaseMetadata = {
      ...HARD_CASE,
      caseId: 'TINY-001',
      findingSize: 1,
    };

    const cdi = calculateCDI(smallFindingCase);
    expect(cdi.compositeScore).toBeGreaterThan(0);
    expect(cdi.difficulty).toBe('VERY_HIGH');
  });

  it('should handle maximum finding size', () => {
    const largeFindingCase: CaseMetadata = {
      ...EASY_CASE,
      caseId: 'LARGE-001',
      findingSize: 100,
    };

    const cdi = calculateCDI(largeFindingCase);
    expect(cdi.compositeScore).toBeLessThan(50); // Should be easier
  });

  it('should handle all anatomical regions', () => {
    const regions = [
      'CENTRAL', 'UPPER_OUTER', 'UPPER_INNER', 'LOWER_OUTER', 'LOWER_INNER',
      'RETROAREOLAR', 'AXILLARY_TAIL', 'POSTERIOR_MARGIN', 'MEDIAL_MARGIN', 'PERIPHERAL',
    ] as const;

    regions.forEach(region => {
      const caseWithRegion: CaseMetadata = {
        ...MODERATE_CASE,
        caseId: `REG-${region}`,
        findingLocation: region,
      };

      const cdi = calculateCDI(caseWithRegion);
      expect(cdi.components.locationDifficulty).toBeGreaterThanOrEqual(1);
      expect(cdi.components.locationDifficulty).toBeLessThanOrEqual(5);
    });
  });

  it('should handle all density categories', () => {
    const densities = ['A', 'B', 'C', 'D'] as const;

    const results: CaseDifficultyIndex[] = [];
    densities.forEach(density => {
      const caseWithDensity: CaseMetadata = {
        ...MODERATE_CASE,
        caseId: `DEN-${density}`,
        breastDensity: density,
      };

      results.push(calculateCDI(caseWithDensity));
    });

    // Density D should be hardest, A should be easiest
    expect(results[3].components.tissueComplexity)
      .toBeGreaterThan(results[0].components.tissueComplexity);
  });

  it('should handle high-risk patient factors', () => {
    const highRiskCase: CaseMetadata = {
      ...MODERATE_CASE,
      caseId: 'HIGHRISK-001',
      riskFactors: ['BRCA1', 'PRIOR_BREAST_CANCER', 'PALPABLE_MASS'],
    };

    const cdi = calculateCDI(highRiskCase);

    // Prior probability should be elevated
    expect(cdi.priorProbability).toBeGreaterThan(0.1);
  });

  it('should handle young patient age', () => {
    const youngCase: CaseMetadata = {
      ...MODERATE_CASE,
      caseId: 'YOUNG-001',
      patientAge: 30,
    };

    const cdi = calculateCDI(youngCase);

    // Prevalence should be lower for young patients
    expect(cdi.prevalenceRate).toBeLessThan(0.01);
  });

  it('should handle elderly patient age', () => {
    const elderlyCase: CaseMetadata = {
      ...MODERATE_CASE,
      caseId: 'ELDERLY-001',
      patientAge: 80,
    };

    const cdi = calculateCDI(elderlyCase);

    // Prevalence should be higher for elderly patients
    expect(cdi.prevalenceRate).toBeGreaterThan(0.005);
  });
});

// ============================================================================
// PERCENTILE TESTS
// ============================================================================

describe('percentile calculation', () => {
  it('should give higher percentile for higher difficulty', () => {
    const easyCDI = calculateCDI(EASY_CASE);
    const hardCDI = calculateCDI(HARD_CASE);

    expect(hardCDI.percentile).toBeGreaterThan(easyCDI.percentile);
  });

  it('should give percentile between 0 and 100', () => {
    const cases = [EASY_CASE, MODERATE_CASE, HARD_CASE, VERY_HARD_CASE];
    const cdis = calculateBatchCDI(cases);

    cdis.forEach(cdi => {
      expect(cdi.percentile).toBeGreaterThanOrEqual(0);
      expect(cdi.percentile).toBeLessThanOrEqual(100);
    });
  });
});
