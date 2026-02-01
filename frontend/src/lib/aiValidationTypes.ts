/**
 * aiValidationTypes.ts
 *
 * Type definitions for Spiegelhalter's 4-phase AI validation framework.
 *
 * SPIEGELHALTER'S CORE ARGUMENT (The Art of Statistics, 2019):
 * "Most medical AI has only achieved Phase 1 or Phase 2 validation - tested on
 * curated datasets or compared to experts - but has NOT been shown to actually
 * improve patient outcomes. Clinicians should be informed of this distinction."
 *
 * Key publications supporting this framework:
 * - Spiegelhalter, D. (2019). The Art of Statistics. Penguin.
 * - Topol, E. (2019). Deep Medicine. Basic Books.
 * - Liu et al. (2019). "How to Read Articles That Use Machine Learning"
 *   JAMA 322(18):1806-1816
 * - FDA (2021). "Artificial Intelligence/Machine Learning (AI/ML)-Based
 *   Software as a Medical Device Action Plan"
 *
 * The 4 Phases represent a hierarchy of evidence quality:
 * 1. Laboratory Validation: AI tested on held-out data (most stop here)
 * 2. Expert Comparison: AI compared to human expert performance
 * 3. Clinical Outcome Evidence: AI shown to improve patient outcomes (rare)
 * 4. Broad Implementation: Validated across diverse real-world settings (very rare)
 *
 * LEGAL SIGNIFICANCE:
 * By documenting which phase an AI system has reached, we create evidence that
 * the clinician was informed of the AI's validation status before relying on it.
 * This is critical for informed consent and malpractice defense.
 */

// ============================================================================
// CORE VALIDATION PHASE TYPES
// ============================================================================

/**
 * The 4 phases of AI validation per Spiegelhalter's framework.
 * Each phase represents a higher level of evidence quality.
 */
export type ValidationPhase = 1 | 2 | 3 | 4;

/**
 * Human-readable names for each validation phase.
 */
export const PHASE_NAMES: Record<ValidationPhase, string> = {
  1: 'Laboratory Validation',
  2: 'Expert Comparison',
  3: 'Clinical Outcome Evidence',
  4: 'Broad Implementation Validation',
};

/**
 * Evidence quality corresponding to each phase.
 * This follows the hierarchy Spiegelhalter describes.
 */
export type EvidenceQuality = 'INSUFFICIENT' | 'LOW' | 'MODERATE' | 'HIGH';

/**
 * Mapping of phases to evidence quality levels.
 * Phase 1-2 represent insufficient evidence for clinical reliance.
 * Phase 3 provides moderate evidence. Phase 4 is the gold standard.
 */
export const PHASE_EVIDENCE_QUALITY: Record<ValidationPhase, EvidenceQuality> = {
  1: 'INSUFFICIENT',
  2: 'LOW',
  3: 'MODERATE',
  4: 'HIGH',
};

/**
 * Colors for visual representation of each phase.
 * Red/Orange indicate caution; Yellow/Green indicate increasing evidence.
 */
export const PHASE_COLORS: Record<ValidationPhase, {
  primary: string;
  background: string;
  text: string;
  border: string;
}> = {
  1: {
    primary: '#dc2626',    // red-600
    background: '#7f1d1d', // red-900
    text: '#fca5a5',       // red-300
    border: '#dc2626',     // red-600
  },
  2: {
    primary: '#ea580c',    // orange-600
    background: '#7c2d12', // orange-900
    text: '#fdba74',       // orange-300
    border: '#ea580c',     // orange-600
  },
  3: {
    primary: '#ca8a04',    // yellow-600
    background: '#713f12', // yellow-900
    text: '#fde047',       // yellow-300
    border: '#ca8a04',     // yellow-600
  },
  4: {
    primary: '#16a34a',    // green-600
    background: '#14532d', // green-900
    text: '#86efac',       // green-300
    border: '#16a34a',     // green-600
  },
};

// ============================================================================
// EVIDENCE STRUCTURES
// ============================================================================

/**
 * Phase 1 Evidence: Laboratory/Dataset Validation
 *
 * Per Spiegelhalter: "Most AI papers report performance on held-out test sets.
 * This tells us nothing about real-world clinical utility."
 */
export interface Phase1Evidence {
  datasets: Array<{
    /** Dataset name (e.g., "ImageNet", "CheXpert", "INbreast") */
    name: string;
    /** Number of samples in dataset */
    size: number;
    /** Year dataset was collected/published */
    year?: number;
    /** AI performance metrics on this dataset */
    performance: {
      /** Area Under ROC Curve (0-1) */
      auc?: number;
      /** Sensitivity/Recall (0-1) */
      sensitivity?: number;
      /** Specificity (0-1) */
      specificity?: number;
      /** Additional metrics */
      [key: string]: number | undefined;
    };
    /** Notable limitations of this dataset */
    limitations?: string[];
  }>;
}

/**
 * Phase 2 Evidence: Expert Comparison Studies
 *
 * Per Spiegelhalter: "Showing AI matches or exceeds human experts is impressive
 * but does not prove clinical utility. Experts may also be wrong."
 */
export interface Phase2Evidence {
  studies: Array<{
    /** Full citation (author, year, journal) */
    citation: string;
    /** DOI or PubMed ID for verification */
    doi?: string;
    pubmedId?: string;
    /** Number of experts in comparison */
    nExperts: number;
    /** Expertise level of comparators */
    expertLevel?: 'RESIDENT' | 'FELLOW' | 'ATTENDING' | 'SUBSPECIALIST';
    /** Result of AI vs human comparison */
    aiVsHuman: 'AI_BETTER' | 'EQUIVALENT' | 'HUMAN_BETTER' | 'MIXED';
    /** Metrics compared */
    metrics: {
      aiAuc?: number;
      humanAuc?: number;
      aiSensitivity?: number;
      humanSensitivity?: number;
      aiSpecificity?: number;
      humanSpecificity?: number;
      [key: string]: number | undefined;
    };
    /** Study limitations */
    limitations?: string[];
  }>;
}

/**
 * Phase 3 Evidence: Patient Outcome Studies
 *
 * Per Spiegelhalter: "The critical question is: Do patients actually do better
 * when this AI is used? Very few AI tools have evidence at this level."
 */
export interface Phase3Evidence {
  trials: Array<{
    /** Full citation */
    citation: string;
    /** DOI or registry ID */
    doi?: string;
    clinicalTrialId?: string;  // e.g., NCT number
    /** Study design - RCT is gold standard */
    design: 'RCT' | 'CLUSTER_RCT' | 'PRAGMATIC_TRIAL' | 'OBSERVATIONAL' | 'RETROSPECTIVE';
    /** Number of patients in study */
    nPatients: number;
    /** Primary outcome measured */
    primaryOutcome: string;
    /** Whether AI improved outcomes */
    outcomeImprovement: boolean;
    /** Effect size (standardized) */
    effectSize?: number;
    /** Confidence interval */
    confidenceInterval?: { lower: number; upper: number };
    /** P-value if applicable */
    pValue?: number;
    /** Number needed to treat/screen if applicable */
    nnt?: number;
    /** Follow-up duration */
    followUpDuration?: string;
    /** Limitations */
    limitations?: string[];
  }>;
}

/**
 * Phase 4 Evidence: Broad Implementation Studies
 *
 * Per Spiegelhalter: "Even if AI improves outcomes in a trial, does it work
 * in diverse real-world settings over time? This is the ultimate test."
 */
export interface Phase4Evidence {
  implementations: Array<{
    /** Implementation setting description */
    setting: string;
    /** Geographic region(s) */
    region?: string;
    /** Type of institution */
    institutionType?: 'ACADEMIC' | 'COMMUNITY' | 'RURAL' | 'URBAN' | 'MIXED';
    /** Duration of implementation */
    duration: string;
    /** Number of patients/cases */
    nPatients?: number;
    /** Whether benefits were sustained */
    sustainedBenefit: boolean;
    /** Any degradation in performance over time */
    performanceDrift?: boolean;
    /** Key findings */
    keyFindings?: string[];
    /** Implementation challenges encountered */
    challenges?: string[];
  }>;
}

/**
 * Combined evidence structure across all phases.
 * An AI system may have evidence at multiple phases.
 */
export interface ValidationEvidence {
  phase1?: Phase1Evidence;
  phase2?: Phase2Evidence;
  phase3?: Phase3Evidence;
  phase4?: Phase4Evidence;
}

// ============================================================================
// REGULATORY STATUS
// ============================================================================

/**
 * FDA clearance types for medical AI.
 *
 * 510(k): Most common - device is "substantially equivalent" to predicate
 * De Novo: Novel device, low-to-moderate risk, new product classification
 * PMA: Pre-market approval, highest level of scrutiny
 *
 * IMPORTANT: FDA clearance does NOT mean clinical validation per Spiegelhalter.
 * 510(k) in particular only requires substantial equivalence, not clinical evidence.
 */
export type FDAClearanceType = '510k' | 'DeNovo' | 'PMA';

/**
 * Regulatory status of an AI system.
 */
export interface RegulatoryStatus {
  /** FDA cleared for marketing in US */
  fdaCleared: boolean;
  /** Type of FDA clearance if cleared */
  fdaClearanceType?: FDAClearanceType;
  /** FDA clearance/approval number */
  fdaNumber?: string;
  /** Date of FDA clearance */
  fdaClearanceDate?: string;
  /** CE marked for EU */
  ceMarked: boolean;
  /** CE marking class (I, IIa, IIb, III) */
  ceClass?: string;
  /** Other regulatory approvals (e.g., Health Canada, TGA) */
  otherApprovals: string[];
  /** Whether device is marketed as "AI" or "CAD" */
  marketedAs?: 'AI' | 'CAD' | 'CDSS' | 'OTHER';
  /** Any FDA warnings or recalls */
  warnings?: string[];
}

// ============================================================================
// AI VALIDATION STATUS
// ============================================================================

/**
 * Complete validation status for an AI system.
 * This is the primary interface displayed to clinicians.
 */
export interface AIValidationStatus {
  /** Current highest validated phase (1-4) */
  phase: ValidationPhase;

  /** Human-readable phase name */
  phaseName: string;

  /** Detailed description of what this phase means */
  description: string;

  /** Evidence quality assessment */
  evidenceQuality: EvidenceQuality;

  /** Supporting evidence for the validation claims */
  evidence: {
    datasets?: string[];           // Phase 1 - dataset names
    comparisonStudies?: string[];  // Phase 2 - study citations
    outcomeTrials?: string[];      // Phase 3 - trial citations
    implementationStudies?: string[]; // Phase 4 - implementation citations
  };

  /** Detailed evidence when available */
  detailedEvidence?: ValidationEvidence;

  /** Known limitations of this AI system */
  limitations: string[];

  /** Date when validation status was last assessed */
  lastValidated: string;

  /** Who performed the validation assessment */
  assessedBy?: string;

  /** Regulatory approvals */
  regulatory: RegulatoryStatus;

  /**
   * Spiegelhalter-style recommendation for clinical use.
   * This is the KEY disclosure text shown to clinicians.
   */
  recommendation: string;

  /** Whether this AI requires human oversight */
  requiresHumanOversight: boolean;

  /** Specific populations where AI was NOT validated */
  excludedPopulations?: string[];

  /** Specific use cases where AI should NOT be used */
  contraindications?: string[];
}

// ============================================================================
// AI SYSTEM CONFIGURATION
// ============================================================================

/**
 * Complete configuration for an AI system including validation status.
 */
export interface AISystemConfig {
  /** Unique identifier for this AI system */
  systemId: string;

  /** Human-readable name */
  name: string;

  /** Vendor/manufacturer name */
  vendor: string;

  /** Version string */
  version: string;

  /** Type of AI system */
  type: 'CAD' | 'TRIAGE' | 'DETECTION' | 'DIAGNOSIS' | 'PROGNOSIS' | 'OTHER';

  /** Clinical domain */
  domain: string;  // e.g., "Mammography", "Chest X-Ray"

  /** Complete validation status */
  validation: AIValidationStatus;

  /**
   * Override phase for experimental/study conditions.
   * Allows testing different disclosure levels.
   */
  simulatedPhase?: ValidationPhase;

  /** Whether to display validation info by default */
  showValidationByDefault: boolean;

  /** Minimum viewing time before proceeding (ms) */
  minimumViewingTimeMs?: number;

  /** Whether to require acknowledgment */
  requireAcknowledgment: boolean;
}

// ============================================================================
// COMPREHENSION CHECK TYPES
// ============================================================================

/**
 * Comprehension check question format.
 * Used to verify clinician understands the validation status.
 */
export interface ValidationComprehensionQuestion {
  /** Unique question ID */
  questionId: string;

  /** The question text */
  question: string;

  /** Answer options */
  options: string[];

  /** Index of correct answer (0-based) */
  correctIndex: number;

  /** Explanation shown after answer */
  explanation: string;

  /** Which phase this question tests understanding of */
  testingPhase: ValidationPhase;
}

/**
 * Pre-defined comprehension check questions per phase.
 */
export const PHASE_COMPREHENSION_QUESTIONS: Record<ValidationPhase, ValidationComprehensionQuestion> = {
  1: {
    questionId: 'phase1-comprehension',
    question: 'This AI has been validated to Phase 1. What does this mean?',
    options: [
      'The AI has been shown to improve patient outcomes',
      'The AI has been tested on curated datasets only',
      'The AI is FDA approved for standalone diagnosis',
      'The AI has been tested in multiple clinical settings',
    ],
    correctIndex: 1,
    explanation: 'Phase 1 validation means the AI was tested on curated digital datasets only. No comparison to human experts and no evidence of patient outcome improvement.',
    testingPhase: 1,
  },
  2: {
    questionId: 'phase2-comprehension',
    question: 'This AI has been validated to Phase 2. What does this mean?',
    options: [
      'The AI has been shown to improve patient outcomes',
      'The AI performs comparably to expert radiologists',
      'The AI is FDA approved for standalone diagnosis',
      'The AI has been tested in multiple clinical settings',
    ],
    correctIndex: 1,
    explanation: 'Phase 2 validation means the AI has been compared to human experts and may match or exceed their performance, but there is NO evidence that using this AI improves actual patient outcomes.',
    testingPhase: 2,
  },
  3: {
    questionId: 'phase3-comprehension',
    question: 'This AI has been validated to Phase 3. What does this mean?',
    options: [
      'The AI has been shown to improve patient outcomes in trials',
      'The AI performs comparably to expert radiologists only',
      'The AI is FDA approved for standalone diagnosis',
      'The AI has been tested on curated datasets only',
    ],
    correctIndex: 0,
    explanation: 'Phase 3 validation means there is clinical trial evidence that using this AI improves actual patient outcomes. This is a significant level of evidence, though broader implementation data may still be limited.',
    testingPhase: 3,
  },
  4: {
    questionId: 'phase4-comprehension',
    question: 'This AI has been validated to Phase 4. What does this mean?',
    options: [
      'The AI has been tested on curated datasets only',
      'The AI performs comparably to expert radiologists only',
      'The AI has been validated across diverse real-world settings with sustained benefits',
      'The AI is pending FDA approval',
    ],
    correctIndex: 2,
    explanation: 'Phase 4 is the highest level of validation, indicating the AI has been implemented across diverse clinical settings with sustained, long-term evidence of improved outcomes. Very few AI tools reach this level.',
    testingPhase: 4,
  },
};

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Events related to AI validation disclosure.
 */
export type AIValidationEventType =
  | 'AI_VALIDATION_DISPLAYED'
  | 'AI_VALIDATION_EXPANDED'
  | 'AI_VALIDATION_ACKNOWLEDGED'
  | 'AI_VALIDATION_COMPREHENSION_RESPONSE';

/**
 * Payload for AI_VALIDATION_DISPLAYED event.
 */
export interface AIValidationDisplayedPayload {
  systemId: string;
  systemName: string;
  phase: ValidationPhase;
  evidenceQuality: EvidenceQuality;
  timestamp: string;
  displayDurationMs?: number;  // Filled in when component unmounts
}

/**
 * Payload for AI_VALIDATION_EXPANDED event.
 */
export interface AIValidationExpandedPayload {
  systemId: string;
  phase: ValidationPhase;
  timestamp: string;
  sectionsViewed: string[];  // Which detail sections were viewed
  viewDurationMs: number;
}

/**
 * Payload for AI_VALIDATION_ACKNOWLEDGED event.
 */
export interface AIValidationAcknowledgedPayload {
  systemId: string;
  phase: ValidationPhase;
  timestamp: string;
  displayToAckMs: number;  // Time from display to acknowledgment
  comprehensionRequired: boolean;
  comprehensionPassed?: boolean;
}

/**
 * Payload for AI_VALIDATION_COMPREHENSION_RESPONSE event.
 */
export interface AIValidationComprehensionPayload {
  systemId: string;
  questionId: string;
  phase: ValidationPhase;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  responseTimeMs: number;
  timestamp: string;
}

// ============================================================================
// PHASE DESCRIPTIONS
// ============================================================================

/**
 * Detailed descriptions for each phase, suitable for display.
 */
export const PHASE_DESCRIPTIONS: Record<ValidationPhase, {
  short: string;
  long: string;
  clinicalImplication: string;
  spiegelhalterQuote: string;
}> = {
  1: {
    short: 'Tested on curated digital datasets only',
    long: 'This AI system has been tested on held-out datasets from curated collections. It has NOT been compared to human experts and has NOT been shown to improve patient outcomes. Most medical AI tools remain at this level of validation.',
    clinicalImplication: 'Use with extreme caution. This AI has not been tested in clinical conditions.',
    spiegelhalterQuote: 'Performance on test sets tells us nothing about real-world clinical utility.',
  },
  2: {
    short: 'Compared to human experts, but no outcome data',
    long: 'This AI system has been compared to human expert performance and may match or exceed radiologists on certain metrics. However, there is NO evidence that using this AI actually improves patient outcomes. Being as good as an expert does not mean patients benefit.',
    clinicalImplication: 'May be used as a second reader, but should not replace clinical judgment.',
    spiegelhalterQuote: 'Showing AI matches or exceeds human experts is impressive but does not prove clinical utility.',
  },
  3: {
    short: 'Evidence of improved patient outcomes',
    long: 'This AI system has been tested in clinical trials and there is evidence it improves actual patient outcomes (e.g., earlier detection, reduced callbacks, improved survival). This is a significant level of evidence that most AI tools have not achieved.',
    clinicalImplication: 'Stronger evidence supports clinical use, but local validation is still recommended.',
    spiegelhalterQuote: 'The critical question is: Do patients actually do better when this AI is used?',
  },
  4: {
    short: 'Validated across diverse real-world settings',
    long: 'This AI system has been implemented across diverse clinical settings with long-term data showing sustained benefit. Performance has been validated across different populations, institutions, and time periods. This is the highest level of evidence, achieved by very few AI tools.',
    clinicalImplication: 'Strong evidence supports clinical integration with appropriate oversight.',
    spiegelhalterQuote: 'Even if AI improves outcomes in a trial, does it work in diverse real-world settings over time?',
  },
};

/**
 * Recommended clinical actions per phase.
 */
export const PHASE_RECOMMENDATIONS: Record<ValidationPhase, string> = {
  1: 'Phase 1 validation is INSUFFICIENT for clinical reliance. This AI should be used for research purposes only. Do not base clinical decisions on this output.',
  2: 'Phase 2 validation is insufficient for standalone clinical reliance. Use as a second reader only. Your clinical judgment should take precedence over AI suggestions.',
  3: 'Phase 3 validation provides moderate evidence of benefit. Consider AI output alongside clinical judgment. Document any decisions that deviate from AI suggestions.',
  4: 'Phase 4 validation provides strong evidence of sustained clinical benefit. AI may be integrated into clinical workflow with appropriate human oversight.',
};

// ============================================================================
// EXPORT TYPES
// ============================================================================

export interface AIValidationExportData {
  /** System identification */
  systemId: string;
  systemName: string;
  vendor: string;
  version: string;

  /** Validation status at time of use */
  validationPhase: ValidationPhase;
  validationPhaseName: string;
  evidenceQuality: EvidenceQuality;

  /** Regulatory status at time of use */
  regulatoryStatus: {
    fdaCleared: boolean;
    fdaClearanceType?: string;
    ceMarked: boolean;
  };

  /** Disclosure events */
  disclosureDisplayed: boolean;
  disclosureDisplayedAt?: string;
  disclosureViewDurationMs?: number;

  /** Acknowledgment */
  acknowledged: boolean;
  acknowledgedAt?: string;

  /** Comprehension check */
  comprehensionCheckCompleted: boolean;
  comprehensionCheckPassed?: boolean;

  /** The recommendation shown to clinician */
  recommendationDisplayed: string;

  /** Legal statement */
  legalStatement: string;
}

export default AIValidationStatus;
