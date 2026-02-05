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
} from './ClinicalReasoningDocumentor';

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

// Expert Witness Export: Research documentation packet
export {
  ExpertWitnessPacketView,
  generateExpertWitnessPacket,
  detectBehavioralPatternIndicators,
  calculatePatternSummaryLevel,
  type ExpertWitnessPacket,
  type BehavioralPatternIndicator,
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

// The Contrast: STI-aware side-by-side case documentation comparison
export {
  default as TheContrast,
  type TheContrastProps,
} from './TheContrast';
