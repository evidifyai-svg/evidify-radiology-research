/**
 * Evidify Legal Module
 * 
 * P0 Components for Research-Partner Credibility (Baird Meeting)
 * 
 * This module transforms Evidify from a demo into a research instrument
 * with legal defensibility built in.
 */

// Core Architecture: Immutable three-entry ledger
export {
  ImpressionLedgerProvider,
  useImpressionLedger,
  LedgerTimeline,
  type ImpressionLedgerState,
  type ImpressionLedgerExport,
  type LedgerEntry,
  type IntegrityReport,
  type BIRADSAssessment,
  type AIFinding,
  type DeviationRationale,
} from './ImpressionLedger';

// Deviation Documentation: Structured override rationale
export {
  DeviationBuilder,
  DeviationSummary,
  DEVIATION_REASON_CODES,
  FOLLOWUP_RECOMMENDATIONS,
  type DeviationDocumentation,
  type DeviationReasonCode,
  type FollowupRecommendation,
} from './DeviationBuilder';

// Disclosure Configuration: FDR/FOR as manipulable study factor
export {
  DisclosureDisplay,
  DisclosureConfigEditor,
  useDisclosureTracking,
  DISCLOSURE_CONDITIONS,
  type DisclosureConfig,
  type DisclosureFormat,
  type DisclosureMetrics,
  type DisclosureExposureLog,
} from './DisclosureConfig';

// Expert Witness Export: Court-ready documentation
export {
  ExpertWitnessPacketView,
  generateExpertWitnessPacket,
  detectRubberStampIndicators,
  calculateRubberStampRiskLevel,
  type ExpertWitnessPacket,
  type RubberStampIndicator,
  type TimelineEvent,
} from './ExpertWitnessExport';

// Study Protocol: Research instrument configuration
export {
  StudyProtocolProvider,
  useStudyProtocol,
  ProtocolBuilder,
  generateParticipantAssignment,
  DEFAULT_FACTORS,
  type StudyProtocolConfig,
  type StudyFactor,
  type FactorLevel,
  type StudyArm,
  type CaseAssignment,
  type ParticipantAssignment,
  type CasePoolItem,
} from './StudyProtocol';

// Spiegelhalter Uncertainty Disclosure Framework
// Based on David Spiegelhalter's research on risk communication
export {
  // Type definitions
  type SpiegelhalterDisclosureFormat,
  type SpiegelhalterDisclosureConfig,
  type AIMetrics,
  type AIRecommendation,
  type AIDisclosure,
  type FormattedDisclosure,
  type ComprehensionCheckType,
  type IntelligentOpennessScore,
  type DisclosureRandomization,
  type FormatAnalytics,
  type DisclosureAnalytics,

  // Constants
  DEFAULT_VERBAL_SCALE,
  DEFAULT_DISCLOSURE_CONFIG,
  COMPARATIVE_RISKS,

  // Display components
  SpiegelhalterDisclosureDisplay,
  generateFormattedDisclosure,
  PercentageDisclosure,
  NaturalFrequencyDisclosure,
  IconArrayDisclosure,
  VerbalDisclosure,
  OddsDisclosure,
  ComparativeDisclosure,

  // Comprehension check
  ComprehensionCheck,
  COMPREHENSION_QUESTIONS,

  // Intelligent Openness scorer
  IntelligentOpennessScorer,
  computeIntelligentOpenness,

  // Randomization hook
  useDisclosureRandomization,
  RANDOMIZATION_PRESETS,

  // Analytics
  computeDisclosureAnalytics,
  compareFormats,
  rankFormats,
  exportAnalyticsAsCSV,
  generateAnalyticsSummary,
} from './spiegelhalter';
