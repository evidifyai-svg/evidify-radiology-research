// Component exports for Evidify Forensic v4.3.0-beta
// Sprint 1-4 features + P0/P1 Forensic Components

// ============================================================================
// SPRINT 1-4: CORE FEATURES
// ============================================================================

// Sprint 1: Voice Scribe UX
export { VoiceScribe } from './VoiceScribe';

// Sprint 1: Offline Mode Indicator
export { ConnectionStatus, OfflineBanner } from './ConnectionStatus';

// Sprint 1: Time Tracking Metrics
export { TimeMetrics, TimerDisplay, useSessionTimer } from './TimeMetrics';

// Sprint 3-4: Supervisor Dashboard
export { SupervisorDashboard } from './SupervisorDashboard';

// Sprint 2: Policy Configuration UI
export { PolicySettings } from './PolicySettings';

// Sprint 4: Beta Onboarding
export { BetaOnboarding } from './BetaOnboarding';

// ============================================================================
// P0: COURT-DEFENSIBILITY COMPONENTS
// ============================================================================

// 7-Gate Defensibility Framework
export { FinalizeGates } from './FinalizeGates';

// Reader Pack Export (Daubert Pack)
export { ReaderPackExport } from './ReaderPackExport';
export { ReaderPackPreview } from './ReaderPackPreview';

// Evidence Chain of Custody
export { EvidenceViewer } from './EvidenceViewer';
export { ExhibitBuilder } from './ExhibitBuilder';

// Opinion-Claim-Citation Chain
export { ClaimLedgerView } from './ClaimLedgerView';
export { ClaimDrawer } from './ClaimDrawer';
export { OpinionChainExplainer } from './OpinionChainExplainer';

// Contradiction Detection
export { ContradictionIntelligence } from './ContradictionIntelligence';

// ============================================================================
// P1: DEFENSIBILITY ENHANCEMENT COMPONENTS
// ============================================================================

// Cross-Examination Readiness
export { CrossExamReadinessMeter } from './CrossExamReadinessMeter';
export { TestimonyMode } from './TestimonyMode';

// Language & Confidence Calibration
export { LanguageDiscipline } from './LanguageDiscipline';
export { ConfidenceLanguagePresets } from './ConfidenceLanguagePresets';
export { ResponseStyleDashboard } from './ResponseStyleDashboard';

// Methodology Documentation
export { MethodologyAppendixGenerator } from './MethodologyAppendixGenerator';
export { ReferralQuestionTracker } from './ReferralQuestionTracker';

// Collateral & Timeline
export { CollateralReliabilityScoring } from './CollateralReliabilityScoring';
export { TimelineBuilder } from './TimelineBuilder';

// Discoverability & Redaction
export { DiscoverabilityPanel } from './DiscoverabilityPanel';
export { RedactionPreview } from './RedactionPreview';

// Document Processing
// The component is exported as OCRVerificationDashboard in OCRVerification.tsx
export { OCRVerificationDashboard as OCRVerification } from './OCRVerification';

// System Management
export { BackupManager } from './BackupManager';

// ============================================================================
// SPIEGELHALTER AI VALIDATION FRAMEWORK
// ============================================================================

// AI Validation Phase Display (4-phase framework)
export { AIValidationBadge, AIValidationInlineBadge, AIValidationPhaseBar } from './research/legal/AIValidationBadge';
export { AIValidationDetails } from './research/legal/AIValidationDetails';
export { ValidationComprehensionCheck, InlineComprehensionCheck } from './research/legal/ValidationComprehensionCheck';

// ============================================================================
// INTEGRATED WORKSPACE
// ============================================================================

// Unified Forensic Interface
export { ForensicWorkspace } from './ForensicWorkspace';

// Unified Educational Assessments (504/IEP) Interface
export { EduWorkspace } from './EduWorkspace';
