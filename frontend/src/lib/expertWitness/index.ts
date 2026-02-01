/**
 * Enhanced Expert Witness Packet Generator Module
 *
 * This module provides comprehensive court-defensible documentation
 * for radiologist decision-making with AI assistance.
 *
 * Components:
 * - ExpertWitnessPacketGenerator: Main generator class
 * - Type definitions for all packet sections
 * - Macknik workload metrics calculator
 * - Wolfe error classification engine
 * - Case Difficulty Index calculator
 * - PDF generation utilities
 * - Sample output for demonstration
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  // Core packet types
  EnhancedExpertWitnessPacket,
  ExpertWitnessSummary,
  SessionData,
  PDFGenerationOptions,

  // Section types
  WorkflowComplianceReport,
  WorkflowTimelineEvent,
  WorkflowStage,
  CryptographicVerification,
  PacketAppendices,

  // Wolfe error classification
  WolfeErrorType,
  WolfeErrorClassification,
  AttentionSummary,
  RegionAttentionData,

  // Macknik workload
  WorkloadMetrics,

  // Case difficulty
  CaseDifficultyIndex,

  // Spiegelhalter disclosure
  DisclosureFormat,
  AIValidationPhase,
  IntelligentOpennessScore,
  AIDisclosure,

  // TSA checkpoints
  TSACheckpoint,

  // Citations and glossary
  Citation,
  GlossaryEntry,
} from './expertWitnessTypes';

// =============================================================================
// CONSTANT EXPORTS
// =============================================================================

export {
  STANDARD_CITATIONS,
  STANDARD_GLOSSARY,
} from './expertWitnessTypes';

// =============================================================================
// GENERATOR EXPORTS
// =============================================================================

export {
  ExpertWitnessPacketGenerator,
  createPacketGenerator,
} from './ExpertWitnessPacketGenerator';

// =============================================================================
// WORKLOAD METRICS EXPORTS
// =============================================================================

export type {
  WorkloadInput,
} from './workloadMetrics';

export {
  calculateWorkloadMetrics,
  formatWorkloadForLegal,
  getWorkloadStatusColor,
  getFatigueLevelColor,
  MACKNIK_MAX_CASES_PER_HOUR,
  MAX_CONTINUOUS_SESSION_MINUTES,
  RECOMMENDED_BREAK_INTERVAL,
  FATIGUE_THRESHOLDS,
} from './workloadMetrics';

// =============================================================================
// WOLFE ERROR CLASSIFICATION EXPORTS
// =============================================================================

export type {
  ErrorClassificationInput,
} from './wolfeErrorClassification';

export {
  classifyError,
  generateAttentionSummary,
  formatErrorClassificationForLegal,
  formatAttentionSummaryForLegal,
  getErrorTypeSeverity,
  getErrorTypeColor,
  MINIMUM_VIEWING_THRESHOLD_MS,
  ADEQUATE_DWELL_TIME_MS,
  ADEQUATE_ZOOM_LEVEL,
  EXPECTED_ERROR_RATES,
} from './wolfeErrorClassification';

// =============================================================================
// CASE DIFFICULTY INDEX EXPORTS
// =============================================================================

export type {
  CDIInput,
} from './caseDifficultyIndex';

export {
  calculateCaseDifficulty,
  formatCDIForLegal,
  getDifficultyLevelColor,
  getScoreColorGradient,
  DENSITY_SCORES,
  DENSITY_DESCRIPTIONS,
  CONSPICUITY_SCORES,
  SIZE_THRESHOLDS,
  LOCATION_SCORES,
  RADPEER_DESCRIPTIONS,
} from './caseDifficultyIndex';

// =============================================================================
// PDF GENERATION EXPORTS
// =============================================================================

export {
  ExpertWitnessPDFGenerator,
  generateExpertWitnessPDF,
  DEFAULT_PDF_OPTIONS,
} from './expertWitnessPDF';

// =============================================================================
// SAMPLE DATA EXPORTS
// =============================================================================

export {
  SAMPLE_SESSION_DATA,
  SAMPLE_WORKLOAD_INPUT,
  SAMPLE_CDI_INPUT,
  SAMPLE_AI_DISCLOSURE,
  SAMPLE_VIEWPORT_DATA,
  SAMPLE_TSA_CHECKPOINTS,
  generateSamplePacket,
  generateSampleHTML,
  SAMPLE_PLAIN_TEXT_OUTPUT,
} from './sampleOutput';
