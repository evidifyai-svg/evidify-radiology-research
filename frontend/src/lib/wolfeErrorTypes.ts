/**
 * Wolfe Error Taxonomy Type Definitions
 *
 * Based on Jeremy Wolfe's research on visual search and medical image perception,
 * particularly the "Normal Blindness" paper (2022) in Trends in Cognitive Sciences.
 *
 * This module defines types for classifying radiologist errors into scientifically-
 * validated categories that explain WHY errors occurred, supporting both clinical
 * education and medico-legal analysis.
 *
 * @see Wolfe, J.M. et al. (2022). Normal Blindness. Trends in Cognitive Sciences.
 * @see Wolfe, J.M. (2020). Visual Search in Radiology. Cognitive Research: Principles and Implications.
 * @see Drew, T., Vo, M.L.H., & Wolfe, J.M. (2013). The Invisible Gorilla Strikes Again. Psychological Science.
 */

/**
 * The primary error classification types from Wolfe's taxonomy.
 * Each type represents a distinct failure mode in the visual search and
 * interpretation pipeline.
 *
 * @description Error Types:
 * - SEARCH_ERROR: Finding never entered the radiologist's field of attention
 * - RECOGNITION_ERROR: Finding was viewed but not recognized as abnormal
 * - DECISION_ERROR: Abnormality recognized but assessed incorrectly
 * - SATISFACTION_OF_SEARCH: Found one abnormality, stopped looking, missed another
 * - PREVALENCE_EFFECT: Rare target led to elevated detection threshold
 * - INATTENTIONAL_BLINDNESS: Unexpected finding category was filtered out
 * - CORRECT: No error occurred - finding was properly handled
 * - UNCLASSIFIABLE: Insufficient data to determine error type
 */
export type WolfeErrorType =
  | 'SEARCH_ERROR'
  | 'RECOGNITION_ERROR'
  | 'DECISION_ERROR'
  | 'SATISFACTION_OF_SEARCH'
  | 'PREVALENCE_EFFECT'
  | 'INATTENTIONAL_BLINDNESS'
  | 'CORRECT'
  | 'UNCLASSIFIABLE';

/**
 * Liability level assessment for medico-legal analysis
 */
export type LiabilityLevel = 'LOW' | 'MODERATE' | 'HIGH';

/**
 * Viewport tracking data showing how the radiologist viewed the image region
 *
 * @description Critical for distinguishing search errors from recognition errors.
 * Per Wolfe (2020): "The difference between 'looked but didn't see' and
 * 'never looked' has profound implications for understanding and preventing errors."
 */
export interface ViewportEvidence {
  /** Whether the anatomical region containing the finding was ever viewed */
  regionViewed: boolean;

  /** Total dwell time on the region in milliseconds */
  dwellTimeMs: number;

  /** Maximum zoom level used when viewing the region */
  zoomLevel: number;

  /** Number of times the region was visited (saccadic returns) */
  visitCount?: number;

  /** Time of first fixation on the region (ms from session start) */
  firstFixationMs?: number;

  /** Percentage of finding covered by viewport during viewing */
  coveragePercent?: number;
}

/**
 * Decision history data showing assessment progression
 *
 * @description Captures the radiologist's interpretive process for
 * distinguishing decision errors from recognition errors.
 */
export interface DecisionEvidence {
  /** Initial BI-RADS assessment before AI assistance */
  initialAssessment: number;

  /** Final BI-RADS assessment */
  finalAssessment: number;

  /** Ground truth BI-RADS (from biopsy or follow-up) */
  groundTruth: number;

  /** Whether deviation from standard was documented */
  deviationDocumented: boolean;

  /** Any notes or rationale provided by the radiologist */
  rationale?: string;

  /** Whether any abnormality was noted in this region */
  abnormalityNoted?: boolean;

  /** AI BI-RADS suggestion if available */
  aiAssessment?: number;
}

/**
 * Contextual data about the study and finding environment
 *
 * @description Critical for identifying prevalence effects and
 * satisfaction of search patterns.
 */
export interface ContextEvidence {
  /** Prevalence of this finding type in the study population (0-1) */
  prevalenceInStudy: number;

  /** Number of findings already identified in this case */
  findingsAlreadyFound: number;

  /** Whether this finding type is typical for the clinical indication */
  findingTypical: boolean;

  /** Case difficulty index (0-100) */
  caseDifficultyIndex?: number;

  /** Clinical indication/reason for exam */
  clinicalIndication?: string;

  /** Time since last finding was identified (ms) */
  timeSinceLastFinding?: number;

  /** Total session time when this region was viewed */
  sessionTimeMs?: number;
}

/**
 * Evidence bundle supporting the error classification
 */
export interface ClassificationEvidence {
  /** Viewport tracking data if available */
  viewportData?: ViewportEvidence;

  /** Decision history data if available */
  decisionData?: DecisionEvidence;

  /** Study and finding context if available */
  contextData?: ContextEvidence;
}

/**
 * Scientific citation and research basis for the classification
 *
 * @description Connects the classification to peer-reviewed research,
 * supporting expert witness testimony.
 */
export interface ScientificBasis {
  /** Primary research citation */
  citation: string;

  /** Expected miss rate based on research (0-1) */
  expectedMissRate: number;

  /** Actual miss rate if we have study data (0-1) */
  actualMissRate?: number;

  /** Additional supporting citations */
  additionalCitations?: string[];

  /** Key quote from research */
  keyFinding?: string;
}

/**
 * Legal liability assessment based on error type and circumstances
 *
 * @description Provides structured analysis for medico-legal contexts,
 * identifying factors that increase or decrease potential liability.
 */
export interface LiabilityAssessment {
  /** Overall liability level */
  level: LiabilityLevel;

  /** Reasoning behind the assessment */
  reasoning: string;

  /** Factors that reduce liability exposure */
  mitigatingFactors: string[];

  /** Factors that increase liability exposure */
  aggravatingFactors: string[];

  /** Specific legal standards that may apply */
  applicableStandards?: string[];
}

/**
 * Complete Wolfe error classification for a finding
 *
 * @description The primary output of the classification system, providing
 * comprehensive analysis of an error including scientific basis, evidence,
 * and legal implications.
 */
export interface WolfeErrorClassification {
  /** Case identifier */
  caseId: string;

  /** Finding identifier within the case */
  findingId: string;

  /** Primary error classification */
  errorType: WolfeErrorType;

  /** Classification confidence (0-1) */
  confidence: number;

  /** Evidence supporting the classification */
  evidence: ClassificationEvidence;

  /** Research basis for classification */
  scientificBasis: ScientificBasis;

  /** Legal liability assessment */
  liabilityAssessment: LiabilityAssessment;

  /** Human-readable explanation of the error */
  explanation: string;

  /** Formal statement suitable for expert witness use */
  expertWitnessStatement: string;

  /** Timestamp of classification */
  classifiedAt: string;

  /** Classifier version for reproducibility */
  classifierVersion: string;
}

/**
 * Input data for the classification algorithm
 */
export interface CaseData {
  caseId: string;
  findingId: string;

  /** Location of the finding */
  findingLocation: AnatomicalRegion;

  /** Finding characteristics */
  findingCharacteristics?: FindingCharacteristics;
}

/**
 * Anatomical region specification
 */
export interface AnatomicalRegion {
  /** Region name (e.g., "UOQ", "LIQ", "Central", "Axilla") */
  name: string;

  /** Laterality if applicable */
  laterality?: 'left' | 'right' | 'bilateral';

  /** Bounding box in image coordinates (normalized 0-1) */
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  /** Clock position (1-12) for breast imaging */
  clockPosition?: number;

  /** Depth from nipple (cm) for breast imaging */
  depthCm?: number;
}

/**
 * Characteristics of the finding that affect detectability
 */
export interface FindingCharacteristics {
  /** Size in mm */
  sizeMm?: number;

  /** Conspicuity index (0-100, higher = more visible) */
  conspicuityIndex?: number;

  /** Finding type (e.g., "mass", "calcification", "distortion") */
  type?: string;

  /** Whether finding is typical presentation for its type */
  typicalPresentation?: boolean;

  /** Tissue density surrounding the finding */
  surroundingDensity?: 'fatty' | 'scattered' | 'heterogeneous' | 'dense';
}

/**
 * Viewport event from eye tracking or interaction logging
 */
export interface ViewportEvent {
  /** Event timestamp (ms from session start) */
  timestampMs: number;

  /** Event type */
  type: 'fixation' | 'saccade' | 'zoom' | 'pan' | 'focus';

  /** Region being viewed */
  region: AnatomicalRegion;

  /** Duration if applicable (ms) */
  durationMs?: number;

  /** Zoom level (1.0 = no zoom) */
  zoomLevel?: number;

  /** Viewport center coordinates (normalized 0-1) */
  viewportCenter?: { x: number; y: number };
}

/**
 * Decision history entry
 */
export interface DecisionHistoryEntry {
  /** Timestamp of decision */
  timestampMs: number;

  /** Assessment value (BI-RADS 0-6) */
  assessment: number;

  /** Decision source */
  source: 'initial' | 'ai_suggested' | 'final';

  /** Region the decision applies to */
  region?: AnatomicalRegion;

  /** Any notes or rationale */
  notes?: string;
}

/**
 * Study context for prevalence and expectation analysis
 */
export interface StudyContext {
  /** Total cases in study */
  totalCases: number;

  /** Number of positive cases in study */
  positiveCases: number;

  /** Prevalence of specific finding types */
  findingTypePrevalence: Record<string, number>;

  /** Clinical indication for this exam */
  clinicalIndication?: string;

  /** Patient risk factors */
  riskFactors?: string[];

  /** Prior exams available */
  priorExamsAvailable?: boolean;
}

/**
 * Display configuration for error type cards
 */
export interface WolfeErrorDisplayConfig {
  /** Error type */
  errorType: WolfeErrorType;

  /** Display label */
  label: string;

  /** Short description */
  description: string;

  /** Detailed explanation */
  explanation: string;

  /** Icon name (Lucide icon) */
  icon: string;

  /** Primary color for display */
  color: string;

  /** Background color for cards */
  backgroundColor: string;

  /** Typical liability level for this error type */
  typicalLiability: LiabilityLevel;
}

/**
 * Evidence check result for display
 */
export interface EvidenceCheck {
  /** Check label */
  label: string;

  /** Whether check passed */
  passed: boolean;

  /** Value if applicable */
  value?: string | number;

  /** Threshold used */
  threshold?: string | number;

  /** Additional context */
  context?: string;
}

/**
 * Classification event for audit logging
 */
export interface WolfeClassificationEvent {
  type: 'WOLFE_CLASSIFICATION_COMPUTED';
  timestamp: string;
  payload: {
    classification: WolfeErrorClassification;
    inputData: {
      caseId: string;
      findingId: string;
      viewportEventsCount: number;
      decisionHistoryCount: number;
    };
  };
}
