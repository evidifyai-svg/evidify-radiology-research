/**
 * cdiConfig.ts
 *
 * Configuration management for Case Difficulty Index (CDI).
 * Allows researchers to customize weights, thresholds, and display settings
 * for different study protocols.
 *
 * Based on:
 * - Macknik SL, Martinez-Conde S. Perceptual Limits in Radiology. 2022.
 * - RADPEER Score definitions (ACR Quality and Safety)
 */

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Component weights for CDI calculation.
 * Must sum to 1.0 for proper normalization.
 */
export interface CDIWeights {
  /**
   * Weight for tissue complexity (breast density, image quality)
   * Default: 0.25
   * Range: 0.0 - 1.0
   */
  tissueComplexity: number;

  /**
   * Weight for target conspicuity (how visible is the finding)
   * Default: 0.30 - highest weight as most predictive of miss rate
   * Range: 0.0 - 1.0
   */
  targetConspicuity: number;

  /**
   * Weight for distractor load (benign findings that confuse)
   * Default: 0.15
   * Range: 0.0 - 1.0
   */
  distractorLoad: number;

  /**
   * Weight for location difficulty (edge, posterior, etc.)
   * Default: 0.15
   * Range: 0.0 - 1.0
   */
  locationDifficulty: number;

  /**
   * Weight for finding subtlety (size, contrast, presentation)
   * Default: 0.15
   * Range: 0.0 - 1.0
   */
  findingSubtlety: number;
}

/**
 * Thresholds for difficulty categories.
 * Values are composite score cutoffs (0-100).
 */
export interface CDIThresholds {
  /**
   * Score below this is LOW difficulty
   * Default: 30
   */
  low: number;

  /**
   * Score below this (but >= low) is MODERATE difficulty
   * Default: 50
   */
  moderate: number;

  /**
   * Score below this (but >= moderate) is HIGH difficulty
   * Default: 75
   */
  high: number;

  /**
   * Score >= high is VERY_HIGH difficulty (veryHigh not used as threshold)
   * Default: 100 (max)
   */
  veryHigh: number;
}

/**
 * Display timing options for CDI presentation.
 */
export type CDIDisplayTiming =
  | 'BEFORE_INTERPRETATION'  // Show before radiologist sees case
  | 'AFTER_LOCK'             // Show after first impression is locked
  | 'AFTER_FINAL'            // Show after final assessment
  | 'NEVER';                 // Don't show to participant (research only)

/**
 * Full CDI configuration for a study protocol.
 */
export interface CDIConfig {
  /** Whether CDI feature is enabled */
  enabled: boolean;

  /** Component weights (must sum to 1.0) */
  weights: CDIWeights;

  /** Difficulty category thresholds */
  thresholds: CDIThresholds;

  /** Whether to show CDI to study participants */
  showToParticipant: boolean;

  /** When to display CDI (if showToParticipant is true) */
  showBeforeOrAfter: CDIDisplayTiming;

  /** Whether to include percentile ranking */
  showPercentile: boolean;

  /** Whether to show RADPEER prediction */
  showRadpeerPrediction: boolean;

  /** Whether to show contributing factors */
  showFactors: boolean;

  /** Minimum score to show warning indicator */
  warningThreshold: number;

  /** Custom label for the CDI display */
  displayLabel?: string;
}

/**
 * Named configuration preset.
 */
export interface CDIConfigPreset {
  id: string;
  name: string;
  description: string;
  config: CDIConfig;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/**
 * Default CDI weights based on literature review.
 *
 * Target conspicuity is weighted highest because it's the
 * strongest predictor of detection failure (Macknik 2022).
 */
export const DEFAULT_CDI_WEIGHTS: CDIWeights = {
  tissueComplexity: 0.25,
  targetConspicuity: 0.30,
  distractorLoad: 0.15,
  locationDifficulty: 0.15,
  findingSubtlety: 0.15,
};

/**
 * Default thresholds based on typical case distributions.
 *
 * Calibrated so ~60% of cases are LOW/MODERATE and ~40% are HIGH/VERY_HIGH.
 * RADPEER Score 2 prediction starts at HIGH (>= 50).
 */
export const DEFAULT_CDI_THRESHOLDS: CDIThresholds = {
  low: 30,
  moderate: 50,
  high: 75,
  veryHigh: 100,
};

/**
 * Default CDI configuration.
 */
export const DEFAULT_CDI_CONFIG: CDIConfig = {
  enabled: true,
  weights: DEFAULT_CDI_WEIGHTS,
  thresholds: DEFAULT_CDI_THRESHOLDS,
  showToParticipant: false,
  showBeforeOrAfter: 'NEVER',
  showPercentile: true,
  showRadpeerPrediction: true,
  showFactors: true,
  warningThreshold: 70,
  displayLabel: 'Case Difficulty',
};

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/**
 * Preset configurations for common study designs.
 */
export const CDI_PRESETS: CDIConfigPreset[] = [
  {
    id: 'standard',
    name: 'Standard (Hidden)',
    description: 'Calculate CDI for research/export but do not show to participants',
    config: {
      ...DEFAULT_CDI_CONFIG,
      showToParticipant: false,
      showBeforeOrAfter: 'NEVER',
    },
  },
  {
    id: 'prospective_disclosure',
    name: 'Prospective Disclosure',
    description: 'Show CDI to participants before they interpret the case',
    config: {
      ...DEFAULT_CDI_CONFIG,
      showToParticipant: true,
      showBeforeOrAfter: 'BEFORE_INTERPRETATION',
      showPercentile: true,
      showRadpeerPrediction: true,
      showFactors: true,
    },
  },
  {
    id: 'retrospective_only',
    name: 'Retrospective Feedback',
    description: 'Show CDI to participants after they complete the case',
    config: {
      ...DEFAULT_CDI_CONFIG,
      showToParticipant: true,
      showBeforeOrAfter: 'AFTER_FINAL',
      showPercentile: true,
      showRadpeerPrediction: false,
      showFactors: true,
    },
  },
  {
    id: 'conspicuity_weighted',
    name: 'Conspicuity-Weighted',
    description: 'Higher weight on target conspicuity (per Macknik 2022)',
    config: {
      ...DEFAULT_CDI_CONFIG,
      weights: {
        tissueComplexity: 0.20,
        targetConspicuity: 0.40,
        distractorLoad: 0.15,
        locationDifficulty: 0.10,
        findingSubtlety: 0.15,
      },
    },
  },
  {
    id: 'density_focused',
    name: 'Density-Focused',
    description: 'Higher weight on tissue complexity for dense breast studies',
    config: {
      ...DEFAULT_CDI_CONFIG,
      weights: {
        tissueComplexity: 0.35,
        targetConspicuity: 0.25,
        distractorLoad: 0.15,
        locationDifficulty: 0.10,
        findingSubtlety: 0.15,
      },
    },
  },
  {
    id: 'legal_documentation',
    name: 'Legal Documentation Mode',
    description: 'Optimized for expert witness packet generation',
    config: {
      ...DEFAULT_CDI_CONFIG,
      showToParticipant: false,
      showBeforeOrAfter: 'NEVER',
      showPercentile: true,
      showRadpeerPrediction: true,
      showFactors: true,
      warningThreshold: 60,
    },
  },
];

// ============================================================================
// CONFIGURATION HELPERS
// ============================================================================

/**
 * Get default CDI configuration, optionally merged with overrides.
 */
export function getDefaultCDIConfig(overrides?: Partial<CDIConfig>): CDIConfig {
  if (!overrides) return { ...DEFAULT_CDI_CONFIG };

  return {
    ...DEFAULT_CDI_CONFIG,
    ...overrides,
    weights: {
      ...DEFAULT_CDI_CONFIG.weights,
      ...(overrides.weights || {}),
    },
    thresholds: {
      ...DEFAULT_CDI_CONFIG.thresholds,
      ...(overrides.thresholds || {}),
    },
  };
}

/**
 * Get a preset configuration by ID.
 */
export function getCDIPreset(presetId: string): CDIConfigPreset | undefined {
  return CDI_PRESETS.find(p => p.id === presetId);
}

/**
 * Validate CDI configuration.
 * Returns array of validation errors (empty if valid).
 */
export function validateCDIConfig(config: CDIConfig): string[] {
  const errors: string[] = [];

  // Validate weights sum to 1.0
  const weightSum =
    config.weights.tissueComplexity +
    config.weights.targetConspicuity +
    config.weights.distractorLoad +
    config.weights.locationDifficulty +
    config.weights.findingSubtlety;

  if (Math.abs(weightSum - 1.0) > 0.001) {
    errors.push(`Weights must sum to 1.0, got ${weightSum.toFixed(3)}`);
  }

  // Validate individual weights are in range
  for (const [key, value] of Object.entries(config.weights)) {
    if (value < 0 || value > 1) {
      errors.push(`Weight ${key} must be between 0 and 1, got ${value}`);
    }
  }

  // Validate threshold ordering
  if (config.thresholds.low >= config.thresholds.moderate) {
    errors.push('Threshold "low" must be less than "moderate"');
  }
  if (config.thresholds.moderate >= config.thresholds.high) {
    errors.push('Threshold "moderate" must be less than "high"');
  }
  if (config.thresholds.high >= config.thresholds.veryHigh) {
    errors.push('Threshold "high" must be less than "veryHigh"');
  }

  // Validate threshold ranges
  for (const [key, value] of Object.entries(config.thresholds)) {
    if (value < 0 || value > 100) {
      errors.push(`Threshold ${key} must be between 0 and 100, got ${value}`);
    }
  }

  // Validate warning threshold
  if (config.warningThreshold < 0 || config.warningThreshold > 100) {
    errors.push(`Warning threshold must be between 0 and 100, got ${config.warningThreshold}`);
  }

  return errors;
}

/**
 * Normalize weights to sum to 1.0.
 * Useful when adjusting individual weights.
 */
export function normalizeWeights(weights: CDIWeights): CDIWeights {
  const sum =
    weights.tissueComplexity +
    weights.targetConspicuity +
    weights.distractorLoad +
    weights.locationDifficulty +
    weights.findingSubtlety;

  if (sum === 0) return DEFAULT_CDI_WEIGHTS;

  return {
    tissueComplexity: weights.tissueComplexity / sum,
    targetConspicuity: weights.targetConspicuity / sum,
    distractorLoad: weights.distractorLoad / sum,
    locationDifficulty: weights.locationDifficulty / sum,
    findingSubtlety: weights.findingSubtlety / sum,
  };
}

/**
 * Create a CDI configuration with modified weights.
 * Automatically normalizes weights to sum to 1.0.
 */
export function createCDIConfigWithWeights(
  baseConfig: CDIConfig,
  newWeights: Partial<CDIWeights>
): CDIConfig {
  const mergedWeights = {
    ...baseConfig.weights,
    ...newWeights,
  };

  return {
    ...baseConfig,
    weights: normalizeWeights(mergedWeights),
  };
}

/**
 * Serialize CDI configuration to JSON for storage.
 */
export function serializeCDIConfig(config: CDIConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Deserialize CDI configuration from JSON.
 */
export function deserializeCDIConfig(json: string): CDIConfig {
  try {
    const parsed = JSON.parse(json);
    return getDefaultCDIConfig(parsed);
  } catch {
    console.warn('Failed to parse CDI config, using defaults');
    return DEFAULT_CDI_CONFIG;
  }
}

// ============================================================================
// STUDY PROTOCOL INTEGRATION
// ============================================================================

/**
 * CDI settings for inclusion in StudyProtocolConfig.
 */
export interface CDIProtocolSettings {
  /** Whether CDI is enabled for this protocol */
  enabled: boolean;

  /** Preset ID or 'custom' */
  presetId: string | 'custom';

  /** Custom configuration (used if presetId is 'custom') */
  customConfig?: CDIConfig;

  /** Whether CDI is an experimental condition */
  isExperimentalFactor: boolean;

  /** Condition groups for CDI display (if experimental) */
  conditionGroups?: {
    control: CDIDisplayTiming;
    treatment: CDIDisplayTiming;
  };
}

/**
 * Default CDI protocol settings.
 */
export const DEFAULT_CDI_PROTOCOL_SETTINGS: CDIProtocolSettings = {
  enabled: true,
  presetId: 'standard',
  isExperimentalFactor: false,
};

/**
 * Get CDI configuration from protocol settings.
 */
export function getCDIConfigFromProtocol(
  settings: CDIProtocolSettings,
  condition?: 'control' | 'treatment'
): CDIConfig {
  if (!settings.enabled) {
    return { ...DEFAULT_CDI_CONFIG, enabled: false };
  }

  let baseConfig: CDIConfig;

  if (settings.presetId === 'custom' && settings.customConfig) {
    baseConfig = settings.customConfig;
  } else {
    const preset = getCDIPreset(settings.presetId);
    baseConfig = preset?.config ?? DEFAULT_CDI_CONFIG;
  }

  // Apply experimental condition if applicable
  if (settings.isExperimentalFactor && settings.conditionGroups && condition) {
    return {
      ...baseConfig,
      showBeforeOrAfter: settings.conditionGroups[condition],
      showToParticipant: settings.conditionGroups[condition] !== 'NEVER',
    };
  }

  return baseConfig;
}

export default {
  DEFAULT_CDI_CONFIG,
  DEFAULT_CDI_WEIGHTS,
  DEFAULT_CDI_THRESHOLDS,
  CDI_PRESETS,
  getDefaultCDIConfig,
  getCDIPreset,
  validateCDIConfig,
  normalizeWeights,
  createCDIConfigWithWeights,
  serializeCDIConfig,
  deserializeCDIConfig,
  getCDIConfigFromProtocol,
};
