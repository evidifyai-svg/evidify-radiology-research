/**
 * adaptiveDisclosure.ts
 *
 * Integration between Case Difficulty Index (CDI) and Adaptive AI Disclosure.
 * Maps CDI difficulty levels to disclosure intensity levels for the adaptive
 * disclosure policy system.
 *
 * Disclosure Policy:
 * - STATIC: Same disclosure for all cases (standard FDR/FOR display)
 * - ADAPTIVE: Disclosure intensity varies based on case difficulty
 *
 * Adaptive Disclosure Levels:
 * - MINIMAL: Suppress FDR/FOR for easy cases (reduce cognitive load)
 * - STANDARD: Show FDR/FOR for moderate cases
 * - FULL_DEBIAS: Full FDR/FOR + debiasing prompts for hard cases
 *
 * Reference: Macknik SL, et al. Perceptual Limits in Radiology. Radiology. 2022.
 */

import type { CaseDifficultyIndex, DifficultyLevel, CaseMetadata } from './caseDifficulty';
import { calculateCDI } from './caseDifficulty';
import type { CDIConfig } from './cdiConfig';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Simplified difficulty level for adaptive disclosure system.
 * Maps to the 3-tier system used in the UI.
 */
export type AdaptiveDifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

/**
 * Disclosure intensity levels.
 */
export type DisclosureIntensity = 'MINIMAL' | 'STANDARD' | 'FULL_DEBIAS';

/**
 * Disclosure policy options.
 */
export type DisclosurePolicy = 'STATIC' | 'ADAPTIVE';

/**
 * Adaptive disclosure configuration for a case.
 */
export interface AdaptiveDisclosureConfig {
  /** The disclosure policy in effect */
  policy: DisclosurePolicy;

  /** Case difficulty level (3-tier for UI) */
  caseDifficulty: AdaptiveDifficultyLevel;

  /** Computed disclosure intensity */
  disclosureIntensity: DisclosureIntensity;

  /** Whether to show FDR/FOR metrics */
  showFdrFor: boolean;

  /** Whether to show debiasing prompt */
  showDebiasPrompt: boolean;

  /** Whether to show uncertainty visualization */
  showUncertaintyViz: boolean;

  /** CDI data if available */
  cdi?: CaseDifficultyIndex;

  /** Source of difficulty determination */
  difficultySource: 'CASE_METADATA' | 'CDI_COMPUTED' | 'FALLBACK';
}

/**
 * Adaptive disclosure decision event payload.
 */
export interface AdaptiveDisclosureDecisionPayload {
  policy: DisclosurePolicy;
  caseDifficulty: AdaptiveDifficultyLevel;
  disclosureIntensity: DisclosureIntensity;
  showFdrFor: boolean;
  showDebiasPrompt: boolean;
  showUncertaintyViz: boolean;
  difficultySource: 'CASE_METADATA' | 'CDI_COMPUTED' | 'FALLBACK';
  cdiScore?: number;
  cdiDifficulty?: DifficultyLevel;
  cdiPercentile?: number;
  cdiRadpeerPrediction?: 1 | 2;
}

// ============================================================================
// MAPPING FUNCTIONS
// ============================================================================

/**
 * Map CDI 4-level difficulty to adaptive disclosure 3-level difficulty.
 *
 * Mapping:
 * - LOW → EASY (minimal disclosure)
 * - MODERATE → MEDIUM (standard disclosure)
 * - HIGH, VERY_HIGH → HARD (full disclosure + debias)
 *
 * The rationale is that RADPEER Score 2 cases (HIGH/VERY_HIGH) warrant
 * maximum disclosure to ensure the radiologist has all available
 * decision support for difficult cases.
 */
export function mapCDIToAdaptiveDifficulty(
  cdiDifficulty: DifficultyLevel
): AdaptiveDifficultyLevel {
  switch (cdiDifficulty) {
    case 'LOW':
      return 'EASY';
    case 'MODERATE':
      return 'MEDIUM';
    case 'HIGH':
    case 'VERY_HIGH':
      return 'HARD';
  }
}

/**
 * Map composite CDI score directly to adaptive difficulty.
 * Uses thresholds for more granular control.
 *
 * @param score - CDI composite score (0-100)
 * @param easyThreshold - Below this is EASY (default: 30)
 * @param hardThreshold - Above this is HARD (default: 60)
 */
export function mapCDIScoreToAdaptiveDifficulty(
  score: number,
  easyThreshold: number = 30,
  hardThreshold: number = 60
): AdaptiveDifficultyLevel {
  if (score < easyThreshold) return 'EASY';
  if (score >= hardThreshold) return 'HARD';
  return 'MEDIUM';
}

/**
 * Determine disclosure intensity from difficulty level.
 */
export function getDisclosureIntensity(
  difficulty: AdaptiveDifficultyLevel,
  policy: DisclosurePolicy
): DisclosureIntensity {
  // Static policy always uses standard disclosure
  if (policy === 'STATIC') return 'STANDARD';

  // Adaptive policy varies by difficulty
  switch (difficulty) {
    case 'EASY':
      return 'MINIMAL';
    case 'MEDIUM':
      return 'STANDARD';
    case 'HARD':
      return 'FULL_DEBIAS';
  }
}

// ============================================================================
// MAIN INTEGRATION FUNCTION
// ============================================================================

/**
 * Get adaptive disclosure configuration for a case.
 *
 * Priority for difficulty determination:
 * 1. CDI computed difficulty (if CDI provided or metadata available)
 * 2. Case metadata difficulty field (EASY/MEDIUM/HARD)
 * 3. Fallback to MEDIUM
 *
 * @param policy - Current disclosure policy (STATIC or ADAPTIVE)
 * @param caseMetadataDifficulty - Difficulty from CaseDefinition (optional)
 * @param cdi - Pre-computed CDI (optional)
 * @param caseMetadata - Full case metadata for CDI computation (optional)
 * @param cdiConfig - CDI configuration (optional)
 */
export function getAdaptiveDisclosureConfig(
  policy: DisclosurePolicy,
  caseMetadataDifficulty?: AdaptiveDifficultyLevel,
  cdi?: CaseDifficultyIndex | null,
  caseMetadata?: CaseMetadata | null,
  cdiConfig?: Partial<CDIConfig>
): AdaptiveDisclosureConfig {
  let caseDifficulty: AdaptiveDifficultyLevel;
  let difficultySource: 'CASE_METADATA' | 'CDI_COMPUTED' | 'FALLBACK';
  let computedCDI: CaseDifficultyIndex | undefined;

  // Determine difficulty source and value
  if (cdi) {
    // Use provided CDI
    caseDifficulty = mapCDIToAdaptiveDifficulty(cdi.difficulty);
    difficultySource = 'CDI_COMPUTED';
    computedCDI = cdi;
  } else if (caseMetadata) {
    // Compute CDI from metadata
    computedCDI = calculateCDI(caseMetadata, cdiConfig);
    caseDifficulty = mapCDIToAdaptiveDifficulty(computedCDI.difficulty);
    difficultySource = 'CDI_COMPUTED';
  } else if (caseMetadataDifficulty) {
    // Use case definition difficulty
    caseDifficulty = caseMetadataDifficulty;
    difficultySource = 'CASE_METADATA';
  } else {
    // Fallback to medium
    caseDifficulty = 'MEDIUM';
    difficultySource = 'FALLBACK';
  }

  // Calculate disclosure settings
  const disclosureIntensity = getDisclosureIntensity(caseDifficulty, policy);

  // Determine what to show based on intensity
  const showFdrFor = policy === 'STATIC' || caseDifficulty !== 'EASY';
  const showDebiasPrompt = policy === 'ADAPTIVE' && caseDifficulty === 'HARD';
  const showUncertaintyViz = policy === 'ADAPTIVE' && caseDifficulty !== 'EASY';

  return {
    policy,
    caseDifficulty,
    disclosureIntensity,
    showFdrFor,
    showDebiasPrompt,
    showUncertaintyViz,
    cdi: computedCDI,
    difficultySource,
  };
}

/**
 * Build event payload for adaptive disclosure decision logging.
 */
export function buildAdaptiveDisclosureEventPayload(
  config: AdaptiveDisclosureConfig
): AdaptiveDisclosureDecisionPayload {
  const payload: AdaptiveDisclosureDecisionPayload = {
    policy: config.policy,
    caseDifficulty: config.caseDifficulty,
    disclosureIntensity: config.disclosureIntensity,
    showFdrFor: config.showFdrFor,
    showDebiasPrompt: config.showDebiasPrompt,
    showUncertaintyViz: config.showUncertaintyViz,
    difficultySource: config.difficultySource,
  };

  // Add CDI data if available
  if (config.cdi) {
    payload.cdiScore = config.cdi.compositeScore;
    payload.cdiDifficulty = config.cdi.difficulty;
    payload.cdiPercentile = config.cdi.percentile;
    payload.cdiRadpeerPrediction = config.cdi.radpeerPrediction;
  }

  return payload;
}

// ============================================================================
// DISCLOSURE CONTENT HELPERS
// ============================================================================

/**
 * Get disclosure content based on intensity level.
 */
export interface DisclosureContent {
  showFdrForMetrics: boolean;
  fdrLabel: string;
  forLabel: string;
  showNaturalFrequency: boolean;
  showDebiasPrompt: boolean;
  debiasPromptText: string | null;
  showUncertaintyBadge: boolean;
  borderColor: string;
  headerText: string | null;
}

export function getDisclosureContent(
  intensity: DisclosureIntensity,
  fdrValue: number = 4,
  forValue: number = 12
): DisclosureContent {
  const baseContent: DisclosureContent = {
    showFdrForMetrics: true,
    fdrLabel: `False Discovery Rate: ${fdrValue}%`,
    forLabel: `False Omission Rate: ${forValue}%`,
    showNaturalFrequency: false,
    showDebiasPrompt: false,
    debiasPromptText: null,
    showUncertaintyBadge: false,
    borderColor: '#f59e0b', // Orange for standard
    headerText: null,
  };

  switch (intensity) {
    case 'MINIMAL':
      return {
        ...baseContent,
        showFdrForMetrics: false,
        showNaturalFrequency: false,
        showUncertaintyBadge: false,
        borderColor: '#22c55e', // Green
        headerText: 'AI assessment available - low complexity case',
      };

    case 'STANDARD':
      return {
        ...baseContent,
        showFdrForMetrics: true,
        showNaturalFrequency: false,
        showUncertaintyBadge: true,
        borderColor: '#f59e0b', // Orange
        headerText: null,
      };

    case 'FULL_DEBIAS':
      return {
        ...baseContent,
        showFdrForMetrics: true,
        showNaturalFrequency: true,
        showDebiasPrompt: true,
        debiasPromptText: 'This is a difficult case. Consider: Would you have reached ' +
          'the same conclusion without AI? What findings support or contradict the AI assessment?',
        showUncertaintyBadge: true,
        borderColor: '#ef4444', // Red
        headerText: 'HIGH DIFFICULTY CASE - Enhanced disclosure active',
      };
  }
}

// ============================================================================
// REACT HOOK HELPER
// ============================================================================

/**
 * Configuration for useAdaptiveDisclosure hook.
 */
export interface UseAdaptiveDisclosureOptions {
  policy: DisclosurePolicy;
  caseMetadataDifficulty?: AdaptiveDifficultyLevel;
  cdi?: CaseDifficultyIndex | null;
  caseMetadata?: CaseMetadata | null;
  cdiConfig?: Partial<CDIConfig>;
  fdrValue?: number;
  forValue?: number;
}

/**
 * Result from useAdaptiveDisclosure hook.
 */
export interface UseAdaptiveDisclosureResult {
  config: AdaptiveDisclosureConfig;
  content: DisclosureContent;
  eventPayload: AdaptiveDisclosureDecisionPayload;
}

/**
 * Get all adaptive disclosure data for a case.
 * Can be used as basis for a React hook or directly.
 */
export function getAdaptiveDisclosureData(
  options: UseAdaptiveDisclosureOptions
): UseAdaptiveDisclosureResult {
  const config = getAdaptiveDisclosureConfig(
    options.policy,
    options.caseMetadataDifficulty,
    options.cdi,
    options.caseMetadata,
    options.cdiConfig
  );

  const content = getDisclosureContent(
    config.disclosureIntensity,
    options.fdrValue ?? 4,
    options.forValue ?? 12
  );

  const eventPayload = buildAdaptiveDisclosureEventPayload(config);

  return { config, content, eventPayload };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  mapCDIToAdaptiveDifficulty,
  mapCDIScoreToAdaptiveDifficulty,
  getDisclosureIntensity,
  getAdaptiveDisclosureConfig,
  buildAdaptiveDisclosureEventPayload,
  getDisclosureContent,
  getAdaptiveDisclosureData,
};
