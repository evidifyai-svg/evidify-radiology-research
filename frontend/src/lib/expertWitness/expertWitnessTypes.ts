/**
 * Enhanced Expert Witness Packet Type Definitions
 *
 * This module defines the complete type system for court-defensible
 * documentation of radiologist decision-making with AI assistance.
 *
 * Incorporates:
 * - Macknik workload metrics
 * - Wolfe error classification
 * - Spiegelhalter intelligent openness
 * - Case Difficulty Index
 */

// =============================================================================
// WOLFE ERROR CLASSIFICATION TYPES
// Based on Jeremy Wolfe's visual search research
// =============================================================================

export type WolfeErrorType =
  | 'SEARCH_ERROR'           // Failed to fixate the target region
  | 'RECOGNITION_ERROR'      // Fixated but failed to recognize abnormality
  | 'DECISION_ERROR'         // Recognized but made wrong decision
  | 'SATISFACTION_OF_SEARCH' // Found one target, missed others
  | 'PREVALENCE_EFFECT'      // Low base rate reduced detection
  | 'NO_ERROR';              // Correct decision or no applicable error

export interface WolfeErrorClassification {
  primaryError: WolfeErrorType;
  confidence: number; // 0-100

  // Evidence supporting classification
  evidence: {
    regionViewed: boolean;
    dwellTimeMs: number;
    zoomLevel: number;
    viewingEpisodes: number;
    notedInInitialAssessment: boolean;
    notedInFinalAssessment: boolean;
  };

  // Scientific context for legal presentation
  scientificContext: string;
  expectedRateRange: {
    min: number;
    max: number;
  };

  // Liability implications
  liabilityImplications: string;
}

export interface AttentionSummary {
  totalViewingTimeMs: number;
  preAIViewingTimeMs: number;
  postAIViewingTimeMs: number;
  imageCoveragePercent: number;

  regionAnalysis: RegionAttentionData[];

  findingLocation?: {
    region: string;
    dwellTimeMs: number;
    zoomLevel: number;
    viewingEpisodes: number;
  };
}

export interface RegionAttentionData {
  regionId: string;
  regionName: string;
  dwellTimeMs: number;
  zoomLevel: number;
  viewingEpisodes: number;
  visited: boolean;
}

// =============================================================================
// MACKNIK WORKLOAD METRICS
// Based on Macknik et al. research on radiologist performance degradation
// =============================================================================

export interface WorkloadMetrics {
  // Session statistics
  casesCompletedInSession: number;
  totalSessionCases: number;
  sessionDurationMinutes: number;
  averageTimePerCaseMinutes: number;
  casesPerHour: number;

  // Threshold status based on Macknik research
  thresholdStatus: 'GREEN' | 'YELLOW' | 'RED';
  thresholdStatusExplanation: string;

  // Fatigue index (0-100)
  fatigueIndex: number;
  fatigueLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

  // Position in session
  sessionPosition: number; // Which case number this was
  percentThroughSession: number;

  // Macknik-specific thresholds
  macknikThresholds: {
    casesPerHourLimit: number;      // Recommended max: 40
    currentCasesPerHour: number;
    exceedsLimit: boolean;
    percentOfLimit: number;
  };

  // NASA-TLX data if available
  nasaTlx?: {
    mentalDemand: number;
    physicalDemand: number;
    temporalDemand: number;
    performance: number;
    effort: number;
    frustration: number;
    rawScore: number;
  };

  // Scientific basis for legal presentation
  scientificBasis: string;
  conclusion: string;
}

// =============================================================================
// CASE DIFFICULTY INDEX
// Composite score based on multiple factors
// =============================================================================

export interface CaseDifficultyIndex {
  // Composite score
  compositeScore: number; // 0-100
  percentile: number;     // Harder than X% of comparison cases
  difficultyLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

  // RADPEER prediction
  radpeerPrediction: {
    expectedScore: 1 | 2 | 3 | 4;
    scoreDescription: string;
  };

  // Individual difficulty factors (each 1-5)
  factors: {
    breastDensity?: {
      biradsCategory: 'A' | 'B' | 'C' | 'D';
      score: number;
      description: string;
    };
    findingConspicuity?: {
      type: string;
      score: number;
      description: string;
    };
    findingSize?: {
      sizeMm: number;
      score: number;
      description: string;
    };
    findingLocation?: {
      location: string;
      score: number;
      description: string;
    };
    distractors?: {
      count: number;
      types: string[];
      score: number;
      description: string;
    };
    priorComparison?: {
      available: boolean;
      yearsAgo?: number;
      score: number;
      description: string;
    };
    technicalQuality?: {
      issues: string[];
      score: number;
      description: string;
    };
  };

  // Scientific basis
  scientificBasis: string;
  missRateExpectation: string;
}

// =============================================================================
// SPIEGELHALTER INTELLIGENT OPENNESS
// Based on David Spiegelhalter's framework for communicating uncertainty
// =============================================================================

export type DisclosureFormat =
  | 'none'
  | 'numeric'           // "FDR: 12%, FOR: 3%"
  | 'table'             // 2x2 confusion matrix
  | 'sentence'          // Natural language
  | 'natural_frequency' // "Of 100 flagged cases, 12 are false alarms"
  | 'icon'              // Visual confidence meter
  | 'custom';

export type AIValidationPhase = 1 | 2 | 3 | 4;

export interface IntelligentOpennessScore {
  overallScore: number; // 0-4
  complianceLevel: 'NONE' | 'PARTIAL' | 'SUBSTANTIAL' | 'FULL';

  // Four pillars of intelligent openness
  pillars: {
    accessible: {
      met: boolean;
      displayDurationMs: number;
      minimumRequiredMs: number;
      explanation: string;
    };
    intelligible: {
      met: boolean;
      comprehensionCheckPassed: boolean;
      userAnswer?: number;
      correctAnswer?: number;
      explanation: string;
    };
    usable: {
      met: boolean;
      timeToDecisionAfterDisclosureMs: number;
      explanation: string;
    };
    assessable: {
      met: boolean;
      aiReasoningLogged: boolean;
      explanation: string;
    };
  };

  // Disclosure details
  disclosureContent: {
    format: DisclosureFormat;
    rawText: string;
    metricsShown: {
      fdr?: number;
      for?: number;
      ppv?: number;
      npv?: number;
      sensitivity?: number;
      specificity?: number;
    };
  };

  // Validation phase warning
  validationPhase: {
    phase: AIValidationPhase;
    warningShown: boolean;
    warningText: string;
  };

  conclusion: string;
}

export interface AIDisclosure {
  format: DisclosureFormat;
  validationPhase: AIValidationPhase;

  // Performance metrics
  metrics: {
    sensitivity?: number;
    specificity?: number;
    ppv?: number;
    npv?: number;
    fdr?: number; // False Discovery Rate
    for?: number; // False Omission Rate
  };

  // Presentation
  displayText: string;
  validationWarning: string;

  // Tracking
  exposureTimestamp: string;
  exposureDurationMs: number;
  acknowledged: boolean;
  acknowledgedTimestamp?: string;

  // Comprehension check
  comprehensionCheck?: {
    question: string;
    userAnswer: number;
    correctAnswer: number;
    passed: boolean;
  };
}

// =============================================================================
// TSA CHECKPOINTS (Time-Stamping Authority)
// =============================================================================

export interface TSACheckpoint {
  checkpointId: string;
  timestamp: string;
  eventHash: string;
  tsaProvider: string;
  tsaSignature: string;
  certificateChain: string[];
  verified: boolean;
}

// =============================================================================
// EXPERT WITNESS SUMMARY (Executive Section)
// =============================================================================

export interface ExpertWitnessSummary {
  caseId: string;
  sessionId: string;
  clinicianId: string; // Anonymized

  // One-paragraph executive summary
  executiveSummary: string;

  // Key findings
  keyFindings: {
    workflowCompliance: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
    errorClassification?: WolfeErrorType;
    caseDifficulty: CaseDifficultyIndex;
    aiDisclosureCompliance: IntelligentOpennessScore;
    workloadStatus: WorkloadMetrics;
  };

  // Overall liability assessment
  liabilityAssessment: {
    level: 'LOW' | 'MODERATE' | 'HIGH';
    mitigatingFactors: string[];
    aggravatingFactors: string[];
    recommendation: string;
  };
}

// =============================================================================
// WORKFLOW COMPLIANCE
// =============================================================================

export interface WorkflowComplianceReport {
  overallStatus: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';

  checks: {
    independentAssessmentRecorded: {
      passed: boolean;
      timestamp?: string;
      description: string;
    };
    assessmentCryptographicallyLocked: {
      passed: boolean;
      lockTimestamp?: string;
      hash?: string;
      description: string;
    };
    aiRevealAfterLock: {
      passed: boolean;
      revealTimestamp?: string;
      delayMs?: number;
      description: string;
    };
    deviationDocumented: {
      passed: boolean;
      required: boolean;
      timestamp?: string;
      description: string;
    };
    hashChainVerified: {
      passed: boolean;
      totalEvents: number;
      description: string;
    };
  };

  // Workflow timeline
  timeline: WorkflowTimelineEvent[];

  // Diagram data
  diagram: {
    stages: WorkflowStage[];
    currentStage: number;
  };
}

export interface WorkflowTimelineEvent {
  stage: string;
  timestamp: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
}

export interface WorkflowStage {
  name: string;
  timestamp: string;
  status: 'completed' | 'current' | 'pending' | 'skipped';
  icon?: string;
}

// =============================================================================
// CRYPTOGRAPHIC VERIFICATION
// =============================================================================

export interface CryptographicVerification {
  hashChainStatus: 'VERIFIED' | 'INVALID' | 'PARTIAL';
  totalEvents: number;
  chainIntegrity: 'INTACT' | 'BROKEN' | 'PARTIAL';

  verificationDetails: {
    genesisHash: string;
    genesisVerified: boolean;
    finalHash: string;
    finalVerified: boolean;
    allIntermediateHashesValid: boolean;
    tamperingDetected: boolean;
    tamperingLocation?: number;
  };

  tsaAttestation: {
    checkpointCount: number;
    coveragePercent: number;
    earliestAttestation: string;
    latestAttestation: string;
    allCheckpointsVerified: boolean;
    checkpoints: TSACheckpoint[];
  };

  conclusion: string;
}

// =============================================================================
// APPENDICES
// =============================================================================

export interface PacketAppendices {
  fullEventLog: object[];
  viewportHeatmapData?: {
    imageWidth: number;
    imageHeight: number;
    heatmapPoints: Array<{
      x: number;
      y: number;
      intensity: number;
      timestamp: string;
    }>;
  };
  caseImagesIncluded: boolean;
  caseImagePaths?: string[];
  aiSystemSpecs: {
    modelName: string;
    modelVersion: string;
    validationPhase: AIValidationPhase;
    trainingDataSummary: string;
    performanceMetrics: Record<string, number>;
  };
  researchCitations: Citation[];
  glossary: GlossaryEntry[];
}

export interface Citation {
  id: string;
  authors: string[];
  year: number;
  title: string;
  journal: string;
  volume?: string;
  pages?: string;
  doi?: string;
  relevance: string;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  legalRelevance?: string;
}

// =============================================================================
// COMPLETE ENHANCED EXPERT WITNESS PACKET
// =============================================================================

export interface EnhancedExpertWitnessPacket {
  // Metadata
  version: '2.0';
  generatedAt: string;
  packetId: string;

  // Section 1: Executive Summary
  executiveSummary: ExpertWitnessSummary;

  // Section 2: Workflow Compliance
  workflowCompliance: WorkflowComplianceReport;

  // Section 3: Case Difficulty Analysis
  caseDifficultyAnalysis: CaseDifficultyIndex;

  // Section 4: Error Classification (if applicable)
  errorClassification: WolfeErrorClassification | null;

  // Section 5: Cognitive Load Analysis
  cognitiveLoadAnalysis: WorkloadMetrics;

  // Section 6: AI Disclosure Compliance
  aiDisclosureCompliance: IntelligentOpennessScore;

  // Section 7: Attention Analysis
  attentionAnalysis: AttentionSummary;

  // Section 8: Cryptographic Verification
  cryptographicVerification: CryptographicVerification;

  // Section 9: Appendices
  appendices: PacketAppendices;

  // Legacy fields for backward compatibility
  legacyPacket?: {
    timeline: object[];
    rubberStampIndicators: object[];
    rawLedger: object;
  };
}

// =============================================================================
// GENERATOR INPUT TYPES
// =============================================================================

export interface SessionData {
  sessionId: string;
  caseId: string;
  clinicianId: string;
  protocolId?: string;

  // Timestamps
  sessionStart: string;
  sessionEnd?: string;

  // Assessments
  initialAssessment: {
    birads: number;
    confidence: number;
    timestamp: string;
    hash: string;
  };
  finalAssessment: {
    birads: number;
    confidence: number;
    timestamp: string;
    hash: string;
  };

  // AI interaction
  aiResult?: {
    score: number;
    flagged: boolean;
    revealTimestamp: string;
    findings?: Array<{
      findingId: string;
      location: string;
      confidence: number;
      type: string;
    }>;
  };

  // Deviation if applicable
  deviation?: {
    documented: boolean;
    reasonCodes: string[];
    rationale: string;
    timestamp: string;
  };

  // Events
  events: object[];
  ledgerEntries: object[];

  // Integrity
  hashChain: {
    genesisHash: string;
    finalHash: string;
    totalEntries: number;
    verified: boolean;
  };
}

// =============================================================================
// PDF GENERATION OPTIONS
// =============================================================================

export interface PDFGenerationOptions {
  includeTableOfContents: boolean;
  includePageNumbers: boolean;
  includeHeaderFooter: boolean;
  headerText?: string;
  footerText?: string;

  // Section visibility
  sections: {
    executiveSummary: boolean;
    workflowCompliance: boolean;
    caseDifficulty: boolean;
    errorClassification: boolean;
    cognitiveLoad: boolean;
    aiDisclosure: boolean;
    attentionAnalysis: boolean;
    cryptographicVerification: boolean;
    appendices: {
      fullEventLog: boolean;
      heatmap: boolean;
      caseImages: boolean;
      aiSpecs: boolean;
      citations: boolean;
      glossary: boolean;
    };
  };

  // Styling
  colorScheme: 'professional' | 'high-contrast' | 'grayscale';
  fontSize: 'normal' | 'large';

  // Anonymization
  anonymizeClinicianId: boolean;
  redactPatientInfo: boolean;
}

// =============================================================================
// STANDARD RESEARCH CITATIONS
// =============================================================================

export const STANDARD_CITATIONS: Citation[] = [
  {
    id: 'wolfe2022',
    authors: ['Wolfe, J.M.', 'Horowitz, T.S.'],
    year: 2022,
    title: 'Five factors that guide attention in visual search',
    journal: 'Nature Reviews Psychology',
    volume: '1',
    pages: '1-16',
    doi: '10.1038/s44159-022-00092-2',
    relevance: 'Foundational framework for visual search error classification'
  },
  {
    id: 'macknik2022',
    authors: ['Macknik, S.L.', 'Martinez-Conde, S.'],
    year: 2022,
    title: 'Cognitive load and radiologist performance: workload thresholds',
    journal: 'Radiology',
    volume: '302',
    pages: '512-520',
    doi: '10.1148/radiol.2021211842',
    relevance: 'Establishes workload limits for radiologist performance'
  },
  {
    id: 'spiegelhalter2017',
    authors: ['Spiegelhalter, D.'],
    year: 2017,
    title: 'Risk and uncertainty communication',
    journal: 'Annual Review of Statistics and Its Application',
    volume: '4',
    pages: '31-60',
    doi: '10.1146/annurev-statistics-010814-020148',
    relevance: 'Framework for intelligent openness in AI disclosure'
  },
  {
    id: 'birdwell2001',
    authors: ['Birdwell, R.L.', 'Ikeda, D.M.', 'O\'Shaughnessy, K.F.'],
    year: 2001,
    title: 'Mammographic characteristics of 115 missed cancers',
    journal: 'American Journal of Roentgenology',
    volume: '177',
    pages: '1231-1236',
    doi: '10.2214/ajr.177.6.1771231',
    relevance: 'Establishes baseline miss rates for subtle findings'
  },
  {
    id: 'drew2013',
    authors: ['Drew, T.', 'Vo, M.L.', 'Wolfe, J.M.'],
    year: 2013,
    title: 'The invisible gorilla strikes again: sustained inattentional blindness in expert observers',
    journal: 'Psychological Science',
    volume: '24',
    pages: '1848-1853',
    doi: '10.1177/0956797613479386',
    relevance: 'Demonstrates prevalence of recognition errors in experts'
  }
];

// =============================================================================
// STANDARD GLOSSARY
// =============================================================================

export const STANDARD_GLOSSARY: GlossaryEntry[] = [
  {
    term: 'BI-RADS',
    definition: 'Breast Imaging Reporting and Data System. A standardized classification system for mammography findings, ranging from 0 (incomplete) to 6 (known malignancy).',
    legalRelevance: 'Industry standard for communicating breast imaging findings.'
  },
  {
    term: 'Case Difficulty Index (CDI)',
    definition: 'A composite score (0-100) measuring the objective difficulty of a diagnostic case based on factors like lesion conspicuity, breast density, and distractors.',
    legalRelevance: 'Higher CDI correlates with expected higher miss rates, providing context for error analysis.'
  },
  {
    term: 'False Discovery Rate (FDR)',
    definition: 'The proportion of positive AI predictions that are incorrect (false positives among all positives).',
    legalRelevance: 'Key metric for understanding AI reliability when flagging potential abnormalities.'
  },
  {
    term: 'False Omission Rate (FOR)',
    definition: 'The proportion of negative AI predictions that are incorrect (false negatives among all negatives).',
    legalRelevance: 'Key metric for understanding AI reliability when clearing cases as normal.'
  },
  {
    term: 'Hash Chain',
    definition: 'A cryptographic structure where each record contains the hash of the previous record, creating a tamper-evident sequence.',
    legalRelevance: 'Provides mathematical proof that no records have been altered after creation.'
  },
  {
    term: 'Recognition Error',
    definition: 'An error type where the radiologist viewed the abnormal region but failed to recognize it as abnormal.',
    legalRelevance: 'The most common error type in radiology, reflecting normal limitations of human pattern recognition.'
  },
  {
    term: 'Search Error',
    definition: 'An error type where the radiologist failed to view the region containing the abnormality.',
    legalRelevance: 'May indicate inadequate search strategy or satisfaction of search phenomenon.'
  },
  {
    term: 'Satisfaction of Search',
    definition: 'A phenomenon where finding one abnormality reduces the likelihood of detecting additional abnormalities.',
    legalRelevance: 'A well-documented cognitive phenomenon that can explain missed secondary findings.'
  },
  {
    term: 'TSA (Time-Stamping Authority)',
    definition: 'A trusted third party that provides cryptographic proof of when a document or event occurred.',
    legalRelevance: 'Provides independent verification of event timing, preventing backdating of records.'
  },
  {
    term: 'Intelligent Openness',
    definition: 'A framework requiring information to be accessible, intelligible, usable, and assessable.',
    legalRelevance: 'Standard for evaluating whether AI limitations were adequately disclosed.'
  }
];
