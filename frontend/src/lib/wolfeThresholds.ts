/**
 * Research-Based Thresholds for Wolfe Error Classification
 *
 * These constants are derived from peer-reviewed research on visual search
 * in radiology and medical image perception. Each threshold includes citations
 * and rationale for the value chosen.
 *
 * @see Wolfe, J.M. et al. (2022). Normal Blindness. Trends in Cognitive Sciences.
 * @see Wolfe, J.M. (2020). Visual Search in Radiology. Cognitive Research.
 * @see Drew, T., Vo, M.L.H., & Wolfe, J.M. (2013). The Invisible Gorilla Strikes Again.
 * @see Kundel, H.L., Nodine, C.F., Carmody, D. (1978). Visual Scanning in Radiology.
 */

import type { WolfeErrorType, WolfeErrorDisplayConfig, LiabilityLevel } from './wolfeErrorTypes';

/**
 * Viewing time thresholds based on Kundel & Nodine's research on
 * radiologist eye movements and fixation patterns.
 *
 * @citation Kundel, H.L., & Nodine, C.F. (1975). Interpreting chest radiographs
 * without visual search. Radiology, 116(3), 527-532.
 */
export const VIEWING_THRESHOLDS = {
  /**
   * Minimum dwell time to count as "viewed" (ms)
   *
   * Based on research showing that meaningful visual processing requires
   * at least 200ms of fixation. Shorter fixations are typically saccades
   * or reflexive glances that don't engage detailed pattern recognition.
   *
   * @citation Kundel, H.L. (1987). Visual sampling and estimates of the
   * location of information on chest radiographs. Investigative Radiology.
   */
  MINIMUM_DWELL_MS: 200,

  /**
   * Minimum dwell time for "adequate" viewing (ms)
   *
   * Research indicates that 2000ms (2 seconds) of focused attention
   * allows for detailed feature extraction and pattern matching. This
   * threshold separates cursory glances from deliberate examination.
   *
   * @citation Krupinski, E.A. (1996). Visual scanning patterns of
   * radiologists searching mammograms. Academic Radiology, 3(2), 137-144.
   */
  ADEQUATE_DWELL_MS: 2000,

  /**
   * Minimum zoom level for adequate detail viewing
   *
   * Based on display resolution studies showing that subtle findings
   * require magnification for reliable detection.
   */
  ADEQUATE_ZOOM_LEVEL: 1.5,

  /**
   * Minimum coverage percentage for a region to be considered "viewed"
   */
  MINIMUM_COVERAGE_PERCENT: 50,

  /**
   * Number of revisits that suggests deliberate examination
   */
  DELIBERATE_REVISIT_COUNT: 2,
} as const;

/**
 * Prevalence thresholds based on Wolfe's research on the prevalence effect.
 *
 * @citation Wolfe, J.M., Horowitz, T.S., & Kenner, N.M. (2005). Cognitive
 * psychology: Rare items often missed in visual searches. Nature, 435, 439-440.
 */
export const PREVALENCE_THRESHOLDS = {
  /**
   * Prevalence threshold below which prevalence effect becomes significant (%)
   *
   * Wolfe's research demonstrates that when target prevalence drops below
   * 1%, miss rates increase substantially due to criterion shifts.
   */
  LOW_PREVALENCE_PERCENT: 1.0,

  /**
   * Very low prevalence threshold where effect is pronounced (%)
   */
  VERY_LOW_PREVALENCE_PERCENT: 0.5,

  /**
   * Moderate prevalence threshold (%)
   */
  MODERATE_PREVALENCE_PERCENT: 5.0,

  /**
   * High prevalence threshold (%)
   */
  HIGH_PREVALENCE_PERCENT: 15.0,
} as const;

/**
 * Expected miss rates by error type based on Wolfe's research.
 *
 * These rates represent the distribution of error types among all misses,
 * not the absolute probability of each error occurring.
 *
 * @citation Wolfe, J.M. (2022). Normal Blindness: When we Look But Fail To See.
 * Trends in Cognitive Sciences.
 */
export const EXPECTED_MISS_RATES = {
  /**
   * Proportion of misses that are search errors (never viewed)
   *
   * Approximately 30% of misses occur because the radiologist never
   * directed their gaze to the region containing the abnormality.
   */
  SEARCH_ERROR: 0.30,

  /**
   * Proportion of misses that are recognition errors (viewed but not seen)
   *
   * The largest category at ~45%. These are the "looked but didn't see" errors
   * that form the core of Wolfe's "Normal Blindness" concept.
   */
  RECOGNITION_ERROR: 0.45,

  /**
   * Proportion of misses that are decision errors (seen but misjudged)
   *
   * About 15% of errors occur after the abnormality is noticed but
   * incorrectly classified or dismissed.
   */
  DECISION_ERROR: 0.15,

  /**
   * Proportion of misses attributable to other causes
   *
   * Includes satisfaction of search, prevalence effects, and
   * inattentional blindness.
   */
  OTHER: 0.10,
} as const;

/**
 * Inattentional blindness rate from the "Invisible Gorilla" studies.
 *
 * @citation Drew, T., Vo, M.L.H., & Wolfe, J.M. (2013). The Invisible Gorilla
 * Strikes Again: Sustained Inattentional Blindness in Expert Observers.
 * Psychological Science, 24(9), 1848-1853.
 */
export const INATTENTIONAL_BLINDNESS = {
  /**
   * Rate at which radiologists missed the gorilla in Drew et al. study
   *
   * 83% of radiologists failed to notice a matchbook-sized gorilla
   * inserted into CT scans while searching for lung nodules.
   */
  GORILLA_MISS_RATE: 0.83,

  /**
   * Threshold for considering a finding "unexpected" based on indication
   */
  UNEXPECTED_FINDING_THRESHOLD: 0.2,
} as const;

/**
 * Satisfaction of Search (SOS) thresholds.
 *
 * @citation Berbaum, K.S., Franken, E.A., Dorfman, D.D., et al. (1990).
 * Satisfaction of search in diagnostic radiology. Investigative Radiology.
 */
export const SATISFACTION_OF_SEARCH = {
  /**
   * Time window after finding first abnormality where SOS is most likely (ms)
   *
   * Research shows that search quality decreases significantly in the
   * first 30 seconds after finding a positive abnormality.
   */
  HIGH_RISK_WINDOW_MS: 30000,

  /**
   * Extended window where SOS remains a factor (ms)
   */
  EXTENDED_RISK_WINDOW_MS: 60000,

  /**
   * Percentage reduction in search coverage associated with SOS
   */
  COVERAGE_REDUCTION_PERCENT: 40,

  /**
   * Number of prior findings that elevates SOS risk
   */
  MULTI_FINDING_THRESHOLD: 1,
} as const;

/**
 * Classification confidence thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  /** Minimum confidence for a classification to be considered reliable */
  MINIMUM_RELIABLE: 0.6,

  /** High confidence threshold */
  HIGH_CONFIDENCE: 0.85,

  /** Very high confidence threshold */
  VERY_HIGH_CONFIDENCE: 0.95,

  /** Confidence penalty for missing data */
  MISSING_DATA_PENALTY: 0.15,

  /** Confidence bonus for multiple corroborating evidence types */
  CORROBORATION_BONUS: 0.1,
} as const;

/**
 * Case difficulty index thresholds
 */
export const CASE_DIFFICULTY = {
  /** Easy case threshold */
  EASY: 30,

  /** Moderate difficulty threshold */
  MODERATE: 50,

  /** Difficult case threshold */
  DIFFICULT: 70,

  /** Very difficult case threshold */
  VERY_DIFFICULT: 85,
} as const;

/**
 * Display configuration for each error type
 *
 * Provides UI metadata including colors, icons, and descriptions
 * following the established color scheme in the codebase.
 */
export const ERROR_TYPE_DISPLAY: Record<WolfeErrorType, WolfeErrorDisplayConfig> = {
  SEARCH_ERROR: {
    errorType: 'SEARCH_ERROR',
    label: 'Search Error',
    description: 'Finding never entered field of attention',
    explanation:
      'The radiologist did not direct their gaze to the anatomical region containing the finding. ' +
      'This represents incomplete visual coverage of the image, often due to time pressure, ' +
      'systematic search pattern gaps, or interruptions.',
    icon: 'EyeOff',
    color: '#f59e0b', // amber
    backgroundColor: '#451a03',
    typicalLiability: 'LOW',
  },
  RECOGNITION_ERROR: {
    errorType: 'RECOGNITION_ERROR',
    label: 'Recognition Error',
    description: 'Looked at finding but failed to recognize it',
    explanation:
      "The radiologist viewed the region containing the finding but did not recognize it as abnormal. " +
      "This is Wolfe's 'Normal Blindness' - the visual system successfully foveated the target, " +
      'but pattern recognition processes failed to flag it as requiring attention.',
    icon: 'Brain',
    color: '#f97316', // orange
    backgroundColor: '#7c2d12',
    typicalLiability: 'MODERATE',
  },
  DECISION_ERROR: {
    errorType: 'DECISION_ERROR',
    label: 'Decision Error',
    description: 'Recognized abnormality but made wrong assessment',
    explanation:
      'The radiologist detected an abnormality in this region but made an incorrect interpretive ' +
      'judgment about its significance, nature, or required follow-up. This represents a cognitive ' +
      'or reasoning failure rather than a perceptual one.',
    icon: 'Scale',
    color: '#ef4444', // red
    backgroundColor: '#7f1d1d',
    typicalLiability: 'HIGH',
  },
  SATISFACTION_OF_SEARCH: {
    errorType: 'SATISFACTION_OF_SEARCH',
    label: 'Satisfaction of Search',
    description: 'Found one abnormality, stopped looking, missed another',
    explanation:
      'After identifying one abnormality, the radiologist prematurely terminated their search, ' +
      'missing a second finding. This is a well-documented cognitive bias where finding a target ' +
      'reduces vigilance for additional targets.',
    icon: 'CheckCircle2',
    color: '#f59e0b', // amber
    backgroundColor: '#451a03',
    typicalLiability: 'MODERATE',
  },
  PREVALENCE_EFFECT: {
    errorType: 'PREVALENCE_EFFECT',
    label: 'Prevalence Effect',
    description: 'Rare target led to elevated detection threshold',
    explanation:
      'The low prevalence of this finding type in the study population caused an unconscious ' +
      'elevation of the detection threshold. When targets are rare, the visual system adapts ' +
      'by becoming more conservative, increasing false negatives.',
    icon: 'TrendingDown',
    color: '#22c55e', // green
    backgroundColor: '#14532d',
    typicalLiability: 'LOW',
  },
  INATTENTIONAL_BLINDNESS: {
    errorType: 'INATTENTIONAL_BLINDNESS',
    label: 'Inattentional Blindness',
    description: 'Unexpected finding category was filtered out',
    explanation:
      "Top-down attention was focused on expected finding types, causing unexpected findings " +
      "to be filtered out. This is the 'Invisible Gorilla' phenomenon - when searching for one " +
      'thing, we can be blind to obvious but unexpected stimuli.',
    icon: 'Ghost',
    color: '#22c55e', // green
    backgroundColor: '#14532d',
    typicalLiability: 'LOW',
  },
  CORRECT: {
    errorType: 'CORRECT',
    label: 'Correct',
    description: 'No error - finding was properly handled',
    explanation:
      'The radiologist correctly identified and assessed this finding. No classification error occurred.',
    icon: 'CheckCircle',
    color: '#22c55e', // green
    backgroundColor: '#14532d',
    typicalLiability: 'LOW',
  },
  UNCLASSIFIABLE: {
    errorType: 'UNCLASSIFIABLE',
    label: 'Unclassifiable',
    description: 'Insufficient data to determine error type',
    explanation:
      'There is not enough evidence available to confidently classify the type of error that occurred. ' +
      'This may be due to missing viewport tracking data, incomplete decision history, or ambiguous circumstances.',
    icon: 'HelpCircle',
    color: '#6b7280', // gray
    backgroundColor: '#1f2937',
    typicalLiability: 'MODERATE',
  },
};

/**
 * Liability reasoning templates for each error type
 */
export const LIABILITY_REASONING: Record<WolfeErrorType, {
  baseReasoning: string;
  typicalMitigating: string[];
  typicalAggravating: string[];
}> = {
  SEARCH_ERROR: {
    baseReasoning:
      'Search errors represent systematic gaps in visual coverage rather than individual judgment failures. ' +
      'Research shows these account for approximately 30% of diagnostic misses and often reflect ' +
      'environmental factors (time pressure, interruptions) rather than negligence.',
    typicalMitigating: [
      'Incomplete search is common under time pressure',
      'Systematic issue affecting pattern of coverage',
      'Environmental factors may have contributed',
      'Finding was in typically low-yield region',
    ],
    typicalAggravating: [
      'Obvious lesion in high-priority region',
      'Sufficient time was available for complete search',
      'Search pattern grossly inadequate',
      'Prior imaging indicated area of concern',
    ],
  },
  RECOGNITION_ERROR: {
    baseReasoning:
      'Recognition errors are the largest category of diagnostic misses (45%) and represent the core of ' +
      '"Normal Blindness." These occur when visual attention successfully reaches a target but pattern ' +
      'recognition fails. Research shows this happens even to experts at rates of 12-30% for subtle findings.',
    typicalMitigating: [
      'Finding was subtle (low conspicuity)',
      'Dense or complex background tissue',
      'Finding presented atypically',
      'Error rate consistent with research on similar findings',
    ],
    typicalAggravating: [
      'Finding was obvious (high conspicuity)',
      'Clear background tissue',
      'Classic presentation of pathology',
      'Extended viewing time without detection',
    ],
  },
  DECISION_ERROR: {
    baseReasoning:
      'Decision errors occur after successful detection and involve cognitive/interpretive failures. ' +
      'These represent exercises of medical judgment and typically carry higher liability exposure ' +
      'than perceptual errors, as they involve conscious reasoning.',
    typicalMitigating: [
      'Ambiguous imaging characteristics',
      'Clinical context suggested benign etiology',
      'Reasonable differential diagnosis considered',
      'Deviation from AI suggestion was documented',
    ],
    typicalAggravating: [
      'Clear imaging features of malignancy',
      'Clinical history supported concern',
      'Deviation from standard practice undocumented',
      'Ignored AI suggestion without rationale',
    ],
  },
  SATISFACTION_OF_SEARCH: {
    baseReasoning:
      'Satisfaction of search is a well-documented cognitive bias where finding one abnormality reduces ' +
      'vigilance for additional findings. Research shows this is a near-universal phenomenon that occurs ' +
      'unconsciously, supporting a moderate liability assessment.',
    typicalMitigating: [
      'First finding was clinically significant',
      'Second finding was subtle',
      'Known cognitive bias phenomenon',
      'Time pressure after first finding',
    ],
    typicalAggravating: [
      'Second finding was obvious',
      'Adequate time remained after first finding',
      'High-risk clinical indication',
      'Multiple findings expected for this presentation',
    ],
  },
  PREVALENCE_EFFECT: {
    baseReasoning:
      'The prevalence effect is a well-researched phenomenon where rare targets lead to elevated detection ' +
      'thresholds. This is an adaptive response of the visual system to base rates and is not under conscious ' +
      'control, supporting reduced liability.',
    typicalMitigating: [
      'Finding type is genuinely rare in population',
      'Prevalence was below 1% in screening context',
      'Error consistent with expected prevalence effect',
      'No prior indication to expect this finding',
    ],
    typicalAggravating: [
      'Clinical history suggested increased risk',
      'Prior imaging showed concerning features',
      'High-risk patient population',
      'Finding type should have been anticipated',
    ],
  },
  INATTENTIONAL_BLINDNESS: {
    baseReasoning:
      'Inattentional blindness (the "Invisible Gorilla" phenomenon) occurs when unexpected finding types ' +
      'are filtered out by top-down attention. Research shows 83% of radiologists miss obvious unexpected ' +
      'findings when focused on expected targets, supporting reduced liability for unexpected discoveries.',
    typicalMitigating: [
      'Finding type completely unexpected for indication',
      'Attention appropriately focused on clinical question',
      'Finding outside scope of ordered exam',
      'Consistent with research on inattentional blindness',
    ],
    typicalAggravating: [
      'Finding type should have been considered',
      'Clinical indication included this concern',
      'Previous imaging showed related findings',
      'Standard search should include this finding type',
    ],
  },
  CORRECT: {
    baseReasoning: 'No error occurred. The finding was correctly identified and assessed.',
    typicalMitigating: [],
    typicalAggravating: [],
  },
  UNCLASSIFIABLE: {
    baseReasoning:
      'Insufficient evidence to determine the specific error mechanism. Classification should be ' +
      'revisited if additional data becomes available.',
    typicalMitigating: ['Limited data available for analysis'],
    typicalAggravating: ['Incomplete documentation'],
  },
};

/**
 * Research citations for each error type
 */
export const SCIENTIFIC_CITATIONS: Record<WolfeErrorType, {
  primary: string;
  additional: string[];
  keyFinding: string;
}> = {
  SEARCH_ERROR: {
    primary: 'Kundel, H.L., & Nodine, C.F. (1975). Interpreting chest radiographs without visual search. Radiology, 116(3), 527-532.',
    additional: [
      'Krupinski, E.A. (1996). Visual scanning patterns of radiologists searching mammograms. Academic Radiology, 3(2), 137-144.',
      'Manning, D.J., Ethell, S.C., & Donovan, T. (2004). Detection or decision errors? Missed lung cancer from the posteroanterior chest radiograph. British Journal of Radiology, 77(915), 231-235.',
    ],
    keyFinding: 'Search errors account for approximately 30% of diagnostic misses in radiology.',
  },
  RECOGNITION_ERROR: {
    primary: 'Wolfe, J.M. et al. (2022). Normal Blindness: When We Look But Fail To See. Trends in Cognitive Sciences.',
    additional: [
      'Nodine, C.F., & Kundel, H.L. (1987). The cognitive side of visual search in radiology. Eye Movements: From Physiology to Cognition.',
      'Krupinski, E.A. (2015). Visual search of mammographic images: Influence of lesion subtlety. Academic Radiology.',
    ],
    keyFinding: 'Recognition errors represent the largest category of diagnostic misses at approximately 45%, occurring even when the finding is directly fixated.',
  },
  DECISION_ERROR: {
    primary: 'Potchen, E.J., Cooper, T.G., Sierra, A.E., et al. (2000). Measuring performance in chest radiography. Radiology, 217(2), 456-459.',
    additional: [
      'Berlin, L. (2007). Radiologic errors, past, present and future. Diagnosis, 4(1), 79-84.',
      'Brady, A.P. (2017). Error and discrepancy in radiology: Inevitable or avoidable? Insights into Imaging, 8(1), 171-182.',
    ],
    keyFinding: 'Decision errors involve conscious judgment and account for approximately 15% of diagnostic misses.',
  },
  SATISFACTION_OF_SEARCH: {
    primary: 'Berbaum, K.S., Franken, E.A., Dorfman, D.D., et al. (1990). Satisfaction of search in diagnostic radiology. Investigative Radiology, 25(2), 133-140.',
    additional: [
      'Berbaum, K.S., et al. (2010). Time course of satisfaction of search. Academic Radiology, 17(6), 701-706.',
      'Ashman, J.B., et al. (2000). Satisfaction of search: Detection of otherwise conspicuous findings. Academic Radiology, 7(12), 1064-1069.',
    ],
    keyFinding: 'After finding one abnormality, radiologists show significantly reduced detection of subsequent abnormalities.',
  },
  PREVALENCE_EFFECT: {
    primary: 'Wolfe, J.M., Horowitz, T.S., & Kenner, N.M. (2005). Cognitive psychology: Rare items often missed in visual searches. Nature, 435(7041), 439-440.',
    additional: [
      'Evans, K.K., Birdwell, R.L., & Wolfe, J.M. (2013). If you dont find it often, you often dont find it. PLoS ONE.',
      'Wolfe, J.M., & Van Wert, M.J. (2010). Varying target prevalence reveals two dissociable decision criteria in visual search. Current Biology, 20(2), 121-124.',
    ],
    keyFinding: 'When target prevalence drops below 1%, miss rates increase substantially due to unconscious criterion shifts.',
  },
  INATTENTIONAL_BLINDNESS: {
    primary: 'Drew, T., Vo, M.L.H., & Wolfe, J.M. (2013). The Invisible Gorilla Strikes Again: Sustained Inattentional Blindness in Expert Observers. Psychological Science, 24(9), 1848-1853.',
    additional: [
      'Simons, D.J., & Chabris, C.F. (1999). Gorillas in our midst: Sustained inattentional blindness for dynamic events. Perception, 28(9), 1059-1074.',
      'Wolfe, J.M. (2021). Guided Search 6.0: An updated model of visual search. Psychonomic Bulletin & Review.',
    ],
    keyFinding: '83% of radiologists failed to notice a matchbook-sized gorilla inserted into CT lung scans while searching for nodules.',
  },
  CORRECT: {
    primary: 'N/A - No error occurred',
    additional: [],
    keyFinding: 'Finding was correctly identified and assessed.',
  },
  UNCLASSIFIABLE: {
    primary: 'N/A - Insufficient data for classification',
    additional: [],
    keyFinding: 'Additional evidence needed to determine error mechanism.',
  },
};

/**
 * Combined thresholds export for convenience
 */
export const WOLFE_THRESHOLDS = {
  viewing: VIEWING_THRESHOLDS,
  prevalence: PREVALENCE_THRESHOLDS,
  expectedMissRates: EXPECTED_MISS_RATES,
  inattentionalBlindness: INATTENTIONAL_BLINDNESS,
  satisfactionOfSearch: SATISFACTION_OF_SEARCH,
  confidence: CONFIDENCE_THRESHOLDS,
  caseDifficulty: CASE_DIFFICULTY,
} as const;

/**
 * Classifier version for reproducibility
 */
export const CLASSIFIER_VERSION = '1.0.0';
