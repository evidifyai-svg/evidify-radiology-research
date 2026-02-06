/**
 * studyConfig.ts
 *
 * Centralised study configuration for Evidify research sessions.
 * Each field maps to a condition variable that can be manipulated
 * across studies without code changes.
 */

import type { UncertaintyDisplayMode } from '../components/research/AIRecommendationDisplay';

// ---------------------------------------------------------------------------
// Study configuration interface
// ---------------------------------------------------------------------------

export interface StudyConfig {
  /** Which AI uncertainty metrics are visible to the radiologist. */
  uncertaintyDisplay: UncertaintyDisplayMode;

  /** Static = always show FDR/FOR; Adaptive = modulate by case difficulty. */
  disclosurePolicy: 'STATIC' | 'ADAPTIVE';
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_STUDY_CONFIG: StudyConfig = {
  uncertaintyDisplay: 'binary',
  disclosurePolicy: 'STATIC',
};

// ---------------------------------------------------------------------------
// Human-readable labels for the config UI
// ---------------------------------------------------------------------------

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
