/**
 * disclosureTypes.ts
 *
 * Type definitions for Spiegelhalter's uncertainty communication framework.
 *
 * Based on David Spiegelhalter's research on communicating risk and uncertainty:
 * - "Risk and Uncertainty Communication" (Annual Review of Statistics, 2017)
 * - "Visualizing Uncertainty About the Future" (Science, 2011)
 * - "The Art of Statistics" (2019)
 *
 * Key principles implemented:
 * 1. Natural frequencies outperform percentages for understanding
 * 2. Consistent denominators (always "out of 100") reduce errors
 * 3. Verbal + numeric combinations improve accessibility
 * 4. Icon arrays help visual learners
 * 5. Explicit uncertainty acknowledgment builds trust
 */

// ============================================================================
// DISCLOSURE FORMAT TYPES
// ============================================================================

/**
 * Spiegelhalter's validated uncertainty disclosure formats.
 * Each format has different cognitive load and comprehension characteristics.
 *
 * Research citations:
 * - PERCENTAGE: Standard but often misunderstood (Gigerenzer et al., 2007)
 * - NATURAL_FREQUENCY: Best comprehension (Hoffrage et al., 2000)
 * - ICON_ARRAY: Reduces denominator neglect (Galesic et al., 2009)
 * - VERBAL_ONLY: Accessible but imprecise (Budescu et al., 2009)
 * - VERBAL_PLUS_NUMERIC: Best of both worlds (Spiegelhalter, 2017)
 * - ODDS: Familiar to clinicians (Gigerenzer, 2002)
 * - COMPARATIVE: Anchoring effect (Lipkus, 2007)
 */
export type SpiegelhalterDisclosureFormat =
  | 'PERCENTAGE'           // "15% false positive rate"
  | 'NATURAL_FREQUENCY'    // "15 out of 100 flagged cases don't have cancer"
  | 'ICON_ARRAY'           // Visual grid of 100 icons
  | 'VERBAL_ONLY'          // "High likelihood"
  | 'VERBAL_PLUS_NUMERIC'  // "High likelihood (85%)"
  | 'ODDS'                 // "5 to 1 odds"
  | 'COMPARATIVE'          // "Similar to..."
  | 'NONE';                // Control condition (no disclosure)

/**
 * Spiegelhalter's verbal probability scale.
 * Standardized verbal labels with defined numeric ranges.
 *
 * Based on IPCC likelihood scale and medical risk communication literature.
 * Ranges overlap slightly at boundaries to allow flexibility.
 */
export interface VerbalProbabilityScale {
  veryLow: [number, number];      // [0, 0.05]
  low: [number, number];          // [0.05, 0.25]
  intermediate: [number, number]; // [0.25, 0.75]
  high: [number, number];         // [0.75, 0.95]
  veryHigh: [number, number];     // [0.95, 1.0]
}

/**
 * Default Spiegelhalter verbal scale.
 * Calibrated to match clinical intuition.
 */
export const DEFAULT_VERBAL_SCALE: VerbalProbabilityScale = {
  veryLow: [0, 0.05],
  low: [0.05, 0.25],
  intermediate: [0.25, 0.75],
  high: [0.75, 0.95],
  veryHigh: [0.95, 1.0],
};

// ============================================================================
// DISCLOSURE CONFIGURATION
// ============================================================================

/**
 * Configuration for what metrics to display and how.
 */
export interface SpiegelhalterDisclosureConfig {
  /** Primary disclosure format */
  format: SpiegelhalterDisclosureFormat;

  /** Which metrics to show */
  showFDR: boolean;        // False Discovery Rate
  showFOR: boolean;        // False Omission Rate
  showPPV: boolean;        // Positive Predictive Value
  showNPV: boolean;        // Negative Predictive Value
  showConfidence: boolean; // AI confidence score
  showSensitivity: boolean;
  showSpecificity: boolean;

  /** Verbal scale mapping */
  verbalScale: VerbalProbabilityScale;

  /** Display options */
  useColorCoding: boolean;
  showUncertaintyRange: boolean;
  consistentDenominator: number; // Always use this denominator (typically 100)

  /** Interaction requirements */
  requireAcknowledgement: boolean;
  minimumViewDurationMs: number;

  /** Study identification */
  conditionId: string;
  conditionLabel: string;
}

/**
 * Default disclosure configuration.
 */
export const DEFAULT_DISCLOSURE_CONFIG: SpiegelhalterDisclosureConfig = {
  format: 'NATURAL_FREQUENCY',
  showFDR: true,
  showFOR: true,
  showPPV: false,
  showNPV: false,
  showConfidence: true,
  showSensitivity: false,
  showSpecificity: false,
  verbalScale: DEFAULT_VERBAL_SCALE,
  useColorCoding: true,
  showUncertaintyRange: false,
  consistentDenominator: 100,
  requireAcknowledgement: false,
  minimumViewDurationMs: 0,
  conditionId: 'default',
  conditionLabel: 'Default Configuration',
};

// ============================================================================
// AI METRICS
// ============================================================================

/**
 * Raw metrics from the AI system.
 * These are the inputs to the disclosure formatting.
 */
export interface AIMetrics {
  /** AI's confidence in its prediction (0-1) */
  confidence: number;

  /** False Discovery Rate: P(no disease | AI flagged) */
  fdr: number;

  /** False Omission Rate: P(disease | AI cleared) */
  for: number;

  /** Positive Predictive Value: P(disease | AI flagged) = 1 - FDR */
  ppv: number;

  /** Negative Predictive Value: P(no disease | AI cleared) = 1 - FOR */
  npv: number;

  /** Sensitivity: P(AI flags | disease) */
  sensitivity: number;

  /** Specificity: P(AI clears | no disease) */
  specificity: number;

  /** Confidence interval bounds (optional) */
  confidenceInterval?: {
    lower: number;
    upper: number;
    level: number; // e.g., 0.95 for 95% CI
  };
}

/**
 * AI's recommendation for this case.
 */
export interface AIRecommendation {
  /** BI-RADS assessment (0-6) */
  birads: number;

  /** Description of finding */
  finding: string;

  /** Location in breast */
  location: string;

  /** Whether AI flagged this as suspicious (BI-RADS >= 3) */
  isFlagged: boolean;
}

// ============================================================================
// FORMATTED DISCLOSURE
// ============================================================================

/**
 * Natural frequency representation.
 * Spiegelhalter recommends this as the primary format.
 */
export interface NaturalFrequencyFormat {
  numerator: number;
  denominator: number;
  statement: string;
  complementNumerator: number;
  complementStatement: string;
}

/**
 * Verbal representation with standardized labels.
 */
export interface VerbalFormat {
  label: 'Very Low' | 'Low' | 'Intermediate' | 'High' | 'Very High';
  description: string;
  /** The underlying probability for transparency */
  underlyingProbability?: number;
}

/**
 * Icon array configuration.
 */
export interface IconArrayFormat {
  total: number;
  highlighted: number;
  highlightColor: string;
  defaultColor: string;
  /** Layout: 10x10 for 100 icons recommended */
  rows: number;
  cols: number;
  /** Icon type */
  iconType: 'person' | 'dot' | 'square';
}

/**
 * Odds representation.
 */
export interface OddsFormat {
  /** e.g., "5 to 1" */
  statement: string;
  /** Numerator of odds ratio */
  for: number;
  /** Denominator of odds ratio */
  against: number;
}

/**
 * Comparative risk representation.
 */
export interface ComparativeFormat {
  /** The anchor comparison */
  comparison: string;
  /** e.g., "Similar to the risk of..." */
  statement: string;
  /** Whether this case is higher or lower than anchor */
  direction: 'higher' | 'lower' | 'similar';
}

/**
 * Fully formatted disclosure for display.
 */
export interface FormattedDisclosure {
  format: SpiegelhalterDisclosureFormat;

  /** Percentage format: "15%" */
  percentage?: string;

  /** Natural frequency format */
  naturalFrequency?: NaturalFrequencyFormat;

  /** Verbal format */
  verbal?: VerbalFormat;

  /** Icon array format */
  iconArray?: IconArrayFormat;

  /** Odds format */
  odds?: OddsFormat;

  /** Comparative format */
  comparative?: ComparativeFormat;

  /** Full disclosure statement for accessibility */
  fullStatement: string;

  /** Short statement for compact display */
  shortStatement: string;

  /** Whether this disclosure is for a flagged or cleared case */
  contextType: 'FLAGGED' | 'CLEARED';

  /** The primary metric being disclosed */
  primaryMetric: 'FDR' | 'FOR' | 'PPV' | 'NPV' | 'CONFIDENCE';

  /** Raw value being disclosed (0-1) */
  rawValue: number;
}

// ============================================================================
// FULL DISCLOSURE DATA STRUCTURE
// ============================================================================

/**
 * Complete AI disclosure for a case.
 */
export interface AIDisclosure {
  /** Unique identifier for this disclosure instance */
  disclosureId: string;

  /** Timestamp when disclosure was generated */
  generatedAt: string;

  /** Raw AI metrics */
  metrics: AIMetrics;

  /** AI's recommendation for this case */
  recommendation: AIRecommendation;

  /** Formatted for display based on config */
  formatted: FormattedDisclosure;

  /** The config used to generate this disclosure */
  config: SpiegelhalterDisclosureConfig;
}

// ============================================================================
// COMPREHENSION CHECK
// ============================================================================

/**
 * Comprehension check to verify understanding.
 * Based on Spiegelhalter's recommendation to test statistical literacy.
 */
export interface ComprehensionCheck {
  /** Unique identifier */
  checkId: string;

  /** The question to ask */
  question: string;

  /** Alternative phrasing (for natural frequency) */
  alternativeQuestion?: string;

  /** Correct numeric answer */
  correctAnswer: number;

  /** Accept answers within this tolerance */
  tolerance: number;

  /** Participant's answer */
  participantAnswer: number | null;

  /** Whether answer was correct (within tolerance) */
  isCorrect: boolean | null;

  /** Time taken to answer (ms) */
  responseTimeMs: number | null;

  /** The metric being tested */
  metric: 'FDR' | 'FOR' | 'PPV' | 'NPV' | 'CONFIDENCE';

  /** The format that was shown */
  format: SpiegelhalterDisclosureFormat;
}

/**
 * Generate comprehension check questions based on format.
 */
export interface ComprehensionCheckConfig {
  /** Number of checks to require */
  numChecks: number;

  /** Tolerance for correct answers */
  tolerance: number;

  /** Whether to allow retries */
  allowRetry: boolean;

  /** Maximum attempts */
  maxAttempts: number;

  /** Whether to show feedback */
  showFeedback: boolean;
}

export const DEFAULT_COMPREHENSION_CONFIG: ComprehensionCheckConfig = {
  numChecks: 1,
  tolerance: 5, // Accept within ±5%
  allowRetry: true,
  maxAttempts: 2,
  showFeedback: true,
};

// ============================================================================
// INTELLIGENT OPENNESS (SPIEGELHALTER'S AIUO FRAMEWORK)
// ============================================================================

/**
 * Spiegelhalter's AIUO framework for good explanations.
 * Four criteria: Accessible, Intelligible, Usable, Assessable.
 */
export interface IntelligentOpennessScore {
  /** Was disclosure accessible (shown to user)? */
  accessible: {
    score: boolean;
    evidence: string;
    viewDurationMs: number;
    wasDisplayed: boolean;
  };

  /** Was it intelligible (user understood)? */
  intelligible: {
    score: boolean;
    evidence: string;
    comprehensionCheckPassed: boolean;
    comprehensionAttempts: number;
  };

  /** Was it usable (affected decision)? */
  usable: {
    score: boolean;
    evidence: string;
    decisionMadeAfterDisclosure: boolean;
    timeFromDisclosureToDecisionMs: number;
  };

  /** Was it assessable (reasoning documented)? */
  assessable: {
    score: boolean;
    evidence: string;
    aiReasoningLogged: boolean;
    metricsSourceDocumented: boolean;
  };

  /** Total score (0-4) */
  totalScore: number;

  /** All four criteria met */
  meetsSpiegelhalterStandard: boolean;

  /** Computed at */
  computedAt: string;
}

// ============================================================================
// RANDOMIZATION
// ============================================================================

/**
 * Randomization method for format assignment.
 */
export type RandomizationMethod = 'BLOCK' | 'SIMPLE' | 'LATIN_SQUARE';

/**
 * Format randomization state.
 */
export interface DisclosureRandomization {
  /** Random seed for reproducibility */
  seed: string;

  /** Randomization method */
  method: RandomizationMethod;

  /** Formats being randomized */
  formats: SpiegelhalterDisclosureFormat[];

  /** Current assigned format */
  currentFormat: SpiegelhalterDisclosureFormat;

  /** Counts per format (for balance checking) */
  formatCounts: Record<SpiegelhalterDisclosureFormat, number>;

  /** Participant index in study */
  participantIndex: number;

  /** Block size (for BLOCK method) */
  blockSize?: number;

  /** Current block position */
  blockPosition?: number;
}

// ============================================================================
// EVENT LOGGING
// ============================================================================

/**
 * Disclosure-related event payloads.
 */
export interface DisclosurePresentedPayload {
  disclosureId: string;
  caseId: string;
  format: SpiegelhalterDisclosureFormat;
  conditionId: string;
  metrics: {
    fdr?: number;
    for?: number;
    ppv?: number;
    npv?: number;
    confidence?: number;
  };
  formattedStatement: string;
  recommendation: AIRecommendation;
  timestamp: string;
}

export interface DisclosureViewedPayload {
  disclosureId: string;
  caseId: string;
  durationMs: number;
  acknowledged: boolean;
  acknowledgedAt?: string;
  scrolledToBottom: boolean;
  interactionCount: number;
}

export interface ComprehensionCheckResponsePayload {
  disclosureId: string;
  caseId: string;
  checkId: string;
  question: string;
  correctAnswer: number;
  participantAnswer: number;
  isCorrect: boolean;
  responseTimeMs: number;
  attempt: number;
}

export interface IntelligentOpennessComputedPayload {
  disclosureId: string;
  caseId: string;
  scores: IntelligentOpennessScore;
  meetsStandard: boolean;
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Per-format analytics.
 */
export interface FormatAnalytics {
  /** Comprehension rate (% passing check) */
  comprehensionRate: number;

  /** Average decision time after disclosure */
  averageDecisionTimeMs: number;

  /** When AI was right, did participant agree? */
  appropriateRelianceRate: number;

  /** When AI was wrong, did participant override? */
  appropriateOverrideRate: number;

  /** Confidence vs accuracy alignment */
  calibrationScore: number;

  /** Sample size */
  n: number;

  /** Confidence interval */
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

/**
 * Full disclosure analytics across formats.
 */
export interface DisclosureAnalytics {
  /** Analytics by format */
  byFormat: Record<SpiegelhalterDisclosureFormat, FormatAnalytics>;

  /** Overall statistics */
  overall: {
    totalCases: number;
    averageComprehension: number;
    bestFormat: SpiegelhalterDisclosureFormat;
    worstFormat: SpiegelhalterDisclosureFormat;
    significantDifferences: boolean;
  };

  /** Computed at */
  computedAt: string;
}

// ============================================================================
// EXPORT INTEGRATION
// ============================================================================

/**
 * Disclosure condition for trial manifest.
 */
export interface DisclosureCondition {
  format: SpiegelhalterDisclosureFormat;
  conditionId: string;
  randomizationSeed: string;
  randomizationMethod: RandomizationMethod;
  comprehensionRequired: boolean;
  comprehensionPassed: boolean;
  intelligentOpennessScore: number;
}

/**
 * Full disclosure export for a session.
 */
export interface DisclosureExport {
  /** All disclosures shown in session */
  disclosures: AIDisclosure[];

  /** All comprehension checks */
  comprehensionChecks: ComprehensionCheck[];

  /** Intelligent openness scores per case */
  intelligentOpennessScores: Record<string, IntelligentOpennessScore>;

  /** Analytics computed at export */
  analytics: DisclosureAnalytics | null;

  /** Condition assignment */
  condition: DisclosureCondition;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Props for disclosure components.
 */
export interface DisclosureComponentProps {
  disclosure: AIDisclosure;
  onAcknowledge?: () => void;
  onComprehensionComplete?: (passed: boolean) => void;
  className?: string;
}

/**
 * Common comparative risks for context.
 * Spiegelhalter recommends anchoring to familiar risks.
 */
export const COMPARATIVE_RISKS: Record<string, { probability: number; description: string }> = {
  coinFlip: { probability: 0.5, description: 'flipping heads on a fair coin' },
  airTravel: { probability: 0.00001, description: 'dying in an airplane accident' },
  carAccident: { probability: 0.01, description: 'being in a car accident this year' },
  mammoFalsePositive: { probability: 0.10, description: 'a typical screening mammogram false positive' },
  breastCancerLifetime: { probability: 0.13, description: 'developing breast cancer over a lifetime' },
  lightningStrike: { probability: 0.0000005, description: 'being struck by lightning' },
};
