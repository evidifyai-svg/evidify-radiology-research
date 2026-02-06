/**
 * studyConfig.ts
 *
 * Study configuration types and defaults for the Evidify research platform.
 * Controls experimental parameters including accountability notification mode,
 * uncertainty display format, and sham-AI configuration.
 */

import type { UncertaintyDisplayMode } from '../components/research/AIRecommendationDisplay';

// ============================================================================
// Accountability Notification Mode
// ============================================================================

/**
 * Controls the documentation-awareness banner shown during reading sessions.
 *
 * Research basis: Bernstein et al. (European Radiology, 2023) demonstrated that
 * awareness of documentation persistence ("kept" vs "deleted") significantly
 * altered radiologist behavior, reducing false positives (p = 0.03).
 *
 * - 'off'      — No banner displayed (control condition)
 * - 'standard' — Brief quality-assurance framing
 * - 'explicit' — Detailed audit-trail framing with legal context
 */
export type AccountabilityMode = 'off' | 'standard' | 'explicit';

// ============================================================================
// Uncertainty Display Format
// ============================================================================

export type UncertaintyDisplay = UncertaintyDisplayMode;

// ============================================================================
// Sham-AI Configuration
// ============================================================================

export interface ShamAICase {
  caseId: string;
  /** The sham AI suggestion (deliberately wrong or random). */
  shamBirads: number;
  /** Sham confidence score. */
  shamConfidence: number;
  /** What the sham "finding" description says. */
  shamFinding: string;
}

// ============================================================================
// Study Configuration
// ============================================================================

export interface StudyConfig {
  /** Unique study identifier. */
  id: string;
  /** Human-readable study name. */
  name: string;
  /** Accountability notification banner mode. */
  accountabilityMode: AccountabilityMode;
  /** How uncertainty information is displayed alongside AI output. */
  uncertaintyDisplay: UncertaintyDisplay;
  /** Static = always show FDR/FOR; Adaptive = modulate by case difficulty. */
  disclosurePolicy: 'STATIC' | 'ADAPTIVE';
  /** Whether sham-AI cases are enabled for this study. */
  shamAIEnabled: boolean;
  /** If sham-AI is enabled, the manifest of rigged cases. */
  shamAIManifest?: ShamAICase[];
}

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_STUDY_CONFIG: StudyConfig = {
  id: 'demo',
  name: 'Demo Study',
  accountabilityMode: 'standard',
  uncertaintyDisplay: 'confidence',
  disclosurePolicy: 'STATIC',
  shamAIEnabled: false,
};

// ============================================================================
// Human-readable labels for the config UI
// ============================================================================

export const UNCERTAINTY_DISPLAY_OPTIONS: {
  value: UncertaintyDisplayMode;
  label: string;
  description: string;
}[] = [
  {
    value: 'binary',
    label: 'Binary only (control)',
    description: 'AI recommendation without confidence or error-rate information.',
  },
  {
    value: 'confidence',
    label: 'Confidence score',
    description: 'Adds a numeric confidence level and progress bar.',
  },
  {
    value: 'error_rates',
    label: 'Error rates (FDR / FOR)',
    description: 'Shows false discovery and false omission rates.',
  },
  {
    value: 'full',
    label: 'Full context (all metrics)',
    description: 'Confidence, error rates, calibration note, and cohort prevalence.',
  },
];
