/**
 * Spiegelhalter Uncertainty Disclosure Framework
 *
 * Implementation of David Spiegelhalter's research on communicating
 * risk and uncertainty in clinical decision support systems.
 *
 * Key research citations:
 * - Spiegelhalter, D. (2017). Risk and Uncertainty Communication.
 *   Annual Review of Statistics and Its Application.
 * - Spiegelhalter, D. (2019). The Art of Statistics: Learning from Data.
 * - Hoffrage, U., et al. (2000). Communicating Statistical Information. Science.
 * - Gigerenzer, G. (2002). Calculated Risks. Simon & Schuster.
 *
 * Module exports:
 * 1. Type definitions for disclosure formats
 * 2. Display components for each format
 * 3. Comprehension check component
 * 4. Intelligent Openness scorer (AIUO framework)
 * 5. Randomization hook for research studies
 * 6. Analytics functions for format comparison
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type {
  // Core format types
  SpiegelhalterDisclosureFormat,
  SpiegelhalterDisclosureConfig,
  VerbalProbabilityScale,

  // Metric types
  AIMetrics,
  AIRecommendation,
  AIDisclosure,

  // Formatted output types
  FormattedDisclosure,
  NaturalFrequencyFormat,
  VerbalFormat,
  IconArrayFormat,
  OddsFormat,
  ComparativeFormat,

  // Comprehension check types
  ComprehensionCheck as ComprehensionCheckType,
  ComprehensionCheckConfig,

  // Intelligent Openness types
  IntelligentOpennessScore,

  // Randomization types
  DisclosureRandomization,
  RandomizationMethod,

  // Event payload types
  DisclosurePresentedPayload,
  DisclosureViewedPayload,
  ComprehensionCheckResponsePayload,
  IntelligentOpennessComputedPayload,

  // Analytics types
  FormatAnalytics,
  DisclosureAnalytics,
  DisclosureCondition,
  DisclosureExport,

  // Component prop types
  DisclosureComponentProps,
} from './disclosureTypes';

// ============================================================================
// CONSTANTS
// ============================================================================

export {
  DEFAULT_VERBAL_SCALE,
  DEFAULT_DISCLOSURE_CONFIG,
  DEFAULT_COMPREHENSION_CONFIG,
  COMPARATIVE_RISKS,
} from './disclosureTypes';

// ============================================================================
// DISPLAY COMPONENTS
// ============================================================================

// Main disclosure display with format switching
export {
  SpiegelhalterDisclosureDisplay,
  generateFormattedDisclosure,
} from './SpiegelhalterDisclosureDisplay';

// Individual format components
export { PercentageDisclosure } from './PercentageDisclosure';
export { NaturalFrequencyDisclosure } from './NaturalFrequencyDisclosure';
export { IconArrayDisclosure } from './IconArrayDisclosure';
export { VerbalDisclosure } from './VerbalDisclosure';
export { OddsDisclosure } from './OddsDisclosure';
export { ComparativeDisclosure } from './ComparativeDisclosure';

// ============================================================================
// COMPREHENSION CHECK
// ============================================================================

export {
  ComprehensionCheck,
  COMPREHENSION_QUESTIONS,
} from './ComprehensionCheck';

// ============================================================================
// INTELLIGENT OPENNESS SCORER
// ============================================================================

export {
  IntelligentOpennessScorer,
  computeIntelligentOpenness,
  DEFAULT_SCORER_CONFIG,
  type ScorerInput,
  type ScorerConfig,
} from './IntelligentOpennessScorer';

// ============================================================================
// RANDOMIZATION HOOK
// ============================================================================

export {
  useDisclosureRandomization,
  RANDOMIZATION_PRESETS,
} from './useDisclosureRandomization';

// ============================================================================
// ANALYTICS
// ============================================================================

export {
  computeDisclosureAnalytics,
  compareFormats,
  rankFormats,
  exportAnalyticsAsCSV,
  generateAnalyticsSummary,
  type TrialData,
} from './disclosureAnalytics';
