/**
 * studyConfig.ts
 *
 * Study configuration types and defaults for the Evidify research platform.
 * Controls experimental parameters including accountability notification mode,
 * uncertainty display format, and sham-AI configuration.
 */

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

/**
 * How AI confidence / error-rate information is presented to the clinician.
 *
 * - 'binary'      — Positive / Negative only
 * - 'confidence'  — AI confidence score (e.g., 87%)
 * - 'error_rates' — FDR / FOR at operating threshold
 * - 'full'        — Confidence + error rates + sample-size context
 */
export type UncertaintyDisplay = 'binary' | 'confidence' | 'error_rates' | 'full';

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
  shamAIEnabled: false,
};
