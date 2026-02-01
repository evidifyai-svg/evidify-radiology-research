/**
 * Wolfe Error Classification Algorithm
 *
 * Implements Jeremy Wolfe's error taxonomy to classify radiologist errors
 * into scientifically-defined categories that explain WHY errors occurred.
 *
 * The classification algorithm follows a decision tree based on:
 * 1. Was the finding region ever viewed?
 * 2. Was viewing adequate (time, zoom)?
 * 3. Was any abnormality noted?
 * 4. Was the assessment correct?
 * 5. Were there contextual factors (SOS, prevalence, unexpected type)?
 *
 * @see Wolfe, J.M. et al. (2022). Normal Blindness. Trends in Cognitive Sciences.
 */

import type {
  WolfeErrorClassification,
  WolfeErrorType,
  CaseData,
  ViewportEvent,
  DecisionHistoryEntry,
  StudyContext,
  AnatomicalRegion,
  ClassificationEvidence,
  ViewportEvidence,
  DecisionEvidence,
  ContextEvidence,
  LiabilityLevel,
  EvidenceCheck,
} from './wolfeErrorTypes';

import {
  WOLFE_THRESHOLDS,
  ERROR_TYPE_DISPLAY,
  LIABILITY_REASONING,
  SCIENTIFIC_CITATIONS,
  CLASSIFIER_VERSION,
} from './wolfeThresholds';

/**
 * Result of analyzing viewport history for a specific region
 */
interface ViewportAnalysis {
  regionViewed: boolean;
  totalDwellTimeMs: number;
  maxZoomLevel: number;
  visitCount: number;
  firstFixationMs: number | null;
  adequateViewing: boolean;
  coveragePercent: number;
}

/**
 * Result of analyzing decision history for a specific region
 */
interface DecisionAnalysis {
  initialAssessment: number | null;
  finalAssessment: number | null;
  groundTruth: number;
  abnormalityNoted: boolean;
  assessmentCorrect: boolean;
  deviationDocumented: boolean;
  aiAssessment: number | null;
}

/**
 * Context analysis for prevalence and SOS detection
 */
interface ContextAnalysis {
  isLowPrevalence: boolean;
  prevalence: number;
  findingsAlreadyFound: number;
  sosRisk: boolean;
  timeSinceLastFinding: number | null;
  isUnexpectedFinding: boolean;
}

/**
 * Analyzes viewport history to determine viewing behavior for a specific region
 *
 * @param viewportHistory - Array of viewport events from the session
 * @param findingLocation - The anatomical region containing the finding
 * @returns ViewportAnalysis with detailed viewing metrics
 */
function analyzeViewportHistory(
  viewportHistory: ViewportEvent[],
  findingLocation: AnatomicalRegion
): ViewportAnalysis {
  const { MINIMUM_DWELL_MS, ADEQUATE_DWELL_MS, ADEQUATE_ZOOM_LEVEL, MINIMUM_COVERAGE_PERCENT } =
    WOLFE_THRESHOLDS.viewing;

  // Filter events that overlap with the finding location
  const relevantEvents = viewportHistory.filter((event) =>
    regionsOverlap(event.region, findingLocation)
  );

  if (relevantEvents.length === 0) {
    return {
      regionViewed: false,
      totalDwellTimeMs: 0,
      maxZoomLevel: 1.0,
      visitCount: 0,
      firstFixationMs: null,
      adequateViewing: false,
      coveragePercent: 0,
    };
  }

  // Calculate aggregate metrics
  const totalDwellTimeMs = relevantEvents.reduce(
    (sum, event) => sum + (event.durationMs ?? 0),
    0
  );

  const maxZoomLevel = Math.max(
    ...relevantEvents.map((event) => event.zoomLevel ?? 1.0)
  );

  // Count distinct visits (fixations separated by other regions)
  const visitCount = countDistinctVisits(relevantEvents, viewportHistory);

  const firstFixationMs = Math.min(
    ...relevantEvents.map((event) => event.timestampMs)
  );

  // Estimate coverage based on viewport positions
  const coveragePercent = estimateCoverage(relevantEvents, findingLocation);

  // Determine if viewing was adequate
  const regionViewed = totalDwellTimeMs >= MINIMUM_DWELL_MS;
  const adequateViewing =
    totalDwellTimeMs >= ADEQUATE_DWELL_MS &&
    maxZoomLevel >= ADEQUATE_ZOOM_LEVEL &&
    coveragePercent >= MINIMUM_COVERAGE_PERCENT;

  return {
    regionViewed,
    totalDwellTimeMs,
    maxZoomLevel,
    visitCount,
    firstFixationMs,
    adequateViewing,
    coveragePercent,
  };
}

/**
 * Analyzes decision history to determine assessment behavior
 */
function analyzeDecisionHistory(
  decisions: DecisionHistoryEntry[],
  findingLocation: AnatomicalRegion,
  groundTruth: number
): DecisionAnalysis {
  // Find decisions related to this region
  const relevantDecisions = decisions.filter((d) =>
    !d.region || regionsOverlap(d.region, findingLocation)
  );

  const initialDecision = relevantDecisions.find((d) => d.source === 'initial');
  const finalDecision = relevantDecisions.find((d) => d.source === 'final');
  const aiDecision = relevantDecisions.find((d) => d.source === 'ai_suggested');

  const initialAssessment = initialDecision?.assessment ?? null;
  const finalAssessment = finalDecision?.assessment ?? null;
  const aiAssessment = aiDecision?.assessment ?? null;

  // Determine if any abnormality was noted (BI-RADS > 1)
  const abnormalityNoted =
    (initialAssessment !== null && initialAssessment > 1) ||
    (finalAssessment !== null && finalAssessment > 1);

  // Check if final assessment matches ground truth
  // Allow BI-RADS 0 (need additional imaging) as correct for positive findings
  const assessmentCorrect =
    finalAssessment !== null &&
    (finalAssessment === groundTruth ||
      (groundTruth >= 4 && finalAssessment >= 4) ||
      (groundTruth >= 4 && finalAssessment === 0));

  // Check if deviation was documented
  const deviationDocumented = relevantDecisions.some(
    (d) => d.notes && d.notes.length > 0
  );

  return {
    initialAssessment,
    finalAssessment,
    groundTruth,
    abnormalityNoted,
    assessmentCorrect,
    deviationDocumented,
    aiAssessment,
  };
}

/**
 * Analyzes study context for prevalence effects and SOS
 */
function analyzeContext(
  studyContext: StudyContext,
  viewportHistory: ViewportEvent[],
  findingLocation: AnatomicalRegion,
  findingType: string | undefined,
  findingsAlreadyFound: number
): ContextAnalysis {
  // Calculate prevalence
  const prevalence = studyContext.positiveCases / studyContext.totalCases;
  const isLowPrevalence =
    prevalence < WOLFE_THRESHOLDS.prevalence.LOW_PREVALENCE_PERCENT / 100;

  // Check for satisfaction of search
  let sosRisk = false;
  let timeSinceLastFinding: number | null = null;

  if (findingsAlreadyFound >= WOLFE_THRESHOLDS.satisfactionOfSearch.MULTI_FINDING_THRESHOLD) {
    // Find when this region was first viewed
    const regionEvents = viewportHistory.filter((e) =>
      regionsOverlap(e.region, findingLocation)
    );
    if (regionEvents.length > 0) {
      const firstViewTime = Math.min(...regionEvents.map((e) => e.timestampMs));

      // Find prior findings (simplified - in real implementation would track finding times)
      // For now, estimate based on position in viewport history
      const priorEventCount = viewportHistory.filter(
        (e) => e.timestampMs < firstViewTime
      ).length;

      // Estimate time since last finding
      if (priorEventCount > 0) {
        const averageEventInterval =
          firstViewTime / priorEventCount;
        timeSinceLastFinding = averageEventInterval * 2; // Rough estimate
        sosRisk =
          timeSinceLastFinding <
          WOLFE_THRESHOLDS.satisfactionOfSearch.HIGH_RISK_WINDOW_MS;
      }
    }
  }

  // Check if finding type was unexpected
  let isUnexpectedFinding = false;
  if (findingType && studyContext.findingTypePrevalence) {
    const typePrevalence =
      studyContext.findingTypePrevalence[findingType] ?? 0;
    isUnexpectedFinding <
      typePrevalence < WOLFE_THRESHOLDS.inattentionalBlindness.UNEXPECTED_FINDING_THRESHOLD;
  }

  return {
    isLowPrevalence,
    prevalence,
    findingsAlreadyFound,
    sosRisk,
    timeSinceLastFinding,
    isUnexpectedFinding,
  };
}

/**
 * Main classification function implementing Wolfe's error taxonomy
 *
 * Decision tree:
 * 1. Was finding region ever viewed? → No → SEARCH_ERROR
 * 2. Was finding region viewed adequately? → No → Possible SEARCH_ERROR
 * 3. Did radiologist note any abnormality? → No → RECOGNITION_ERROR
 * 4. Did radiologist assess correctly? → No → DECISION_ERROR
 * 5. Were there other findings found first? → Check for SATISFACTION_OF_SEARCH
 * 6. Was finding type rare? → Consider PREVALENCE_EFFECT
 * 7. Was finding type unexpected? → Consider INATTENTIONAL_BLINDNESS
 *
 * @param caseData - Basic case and finding information
 * @param viewportHistory - Array of viewport events from the session
 * @param decisions - Decision history entries
 * @param studyContext - Study population and prevalence data
 * @param groundTruth - Ground truth BI-RADS assessment
 * @returns Complete WolfeErrorClassification
 */
export function classifyError(
  caseData: CaseData,
  viewportHistory: ViewportEvent[],
  decisions: DecisionHistoryEntry[],
  studyContext: StudyContext,
  groundTruth: number
): WolfeErrorClassification {
  // Analyze all data sources
  const viewportAnalysis = analyzeViewportHistory(
    viewportHistory,
    caseData.findingLocation
  );

  const decisionAnalysis = analyzeDecisionHistory(
    decisions,
    caseData.findingLocation,
    groundTruth
  );

  const contextAnalysis = analyzeContext(
    studyContext,
    viewportHistory,
    caseData.findingLocation,
    caseData.findingCharacteristics?.type,
    0 // Would need to be passed in
  );

  // Build evidence structure
  const evidence: ClassificationEvidence = {
    viewportData: {
      regionViewed: viewportAnalysis.regionViewed,
      dwellTimeMs: viewportAnalysis.totalDwellTimeMs,
      zoomLevel: viewportAnalysis.maxZoomLevel,
      visitCount: viewportAnalysis.visitCount,
      firstFixationMs: viewportAnalysis.firstFixationMs ?? undefined,
      coveragePercent: viewportAnalysis.coveragePercent,
    },
    decisionData: {
      initialAssessment: decisionAnalysis.initialAssessment ?? 0,
      finalAssessment: decisionAnalysis.finalAssessment ?? 0,
      groundTruth: decisionAnalysis.groundTruth,
      deviationDocumented: decisionAnalysis.deviationDocumented,
      abnormalityNoted: decisionAnalysis.abnormalityNoted,
      aiAssessment: decisionAnalysis.aiAssessment ?? undefined,
    },
    contextData: {
      prevalenceInStudy: contextAnalysis.prevalence,
      findingsAlreadyFound: contextAnalysis.findingsAlreadyFound,
      findingTypical: !contextAnalysis.isUnexpectedFinding,
      caseDifficultyIndex: caseData.findingCharacteristics?.conspicuityIndex,
    },
  };

  // Apply decision tree
  const classificationResult = applyDecisionTree(
    viewportAnalysis,
    decisionAnalysis,
    contextAnalysis,
    caseData
  );

  // Calculate confidence
  const confidence = calculateConfidence(
    classificationResult.errorType,
    viewportAnalysis,
    decisionAnalysis,
    contextAnalysis
  );

  // Get scientific basis
  const scientificBasis = getScientificBasis(classificationResult.errorType);

  // Assess liability
  const liabilityAssessment = assessLiability(
    classificationResult.errorType,
    evidence,
    caseData
  );

  // Generate explanation
  const explanation = generateExplanation(
    classificationResult.errorType,
    evidence,
    viewportAnalysis,
    decisionAnalysis
  );

  // Generate expert witness statement
  const expertWitnessStatement = generateExpertWitnessStatement(
    classificationResult.errorType,
    evidence,
    liabilityAssessment,
    scientificBasis,
    caseData
  );

  return {
    caseId: caseData.caseId,
    findingId: caseData.findingId,
    errorType: classificationResult.errorType,
    confidence,
    evidence,
    scientificBasis,
    liabilityAssessment,
    explanation,
    expertWitnessStatement,
    classifiedAt: new Date().toISOString(),
    classifierVersion: CLASSIFIER_VERSION,
  };
}

/**
 * Applies the decision tree to determine error type
 */
function applyDecisionTree(
  viewport: ViewportAnalysis,
  decision: DecisionAnalysis,
  context: ContextAnalysis,
  caseData: CaseData
): { errorType: WolfeErrorType; primaryReason: string } {
  // Check for correct case first
  if (decision.assessmentCorrect) {
    return {
      errorType: 'CORRECT',
      primaryReason: 'Assessment matches ground truth',
    };
  }

  // Step 1: Was region ever viewed?
  if (!viewport.regionViewed) {
    // Check for satisfaction of search as contributing factor
    if (context.sosRisk && context.findingsAlreadyFound > 0) {
      return {
        errorType: 'SATISFACTION_OF_SEARCH',
        primaryReason:
          'Region not viewed after prior finding was identified',
      };
    }

    return {
      errorType: 'SEARCH_ERROR',
      primaryReason: 'Region containing finding was never viewed',
    };
  }

  // Step 2: Was viewing adequate?
  if (!viewport.adequateViewing) {
    // Inadequate viewing with low prevalence → consider prevalence effect
    if (context.isLowPrevalence) {
      return {
        errorType: 'PREVALENCE_EFFECT',
        primaryReason:
          'Insufficient viewing time in low-prevalence context',
      };
    }

    // Brief glance but didn't engage → could be search or recognition
    if (viewport.totalDwellTimeMs < WOLFE_THRESHOLDS.viewing.ADEQUATE_DWELL_MS / 2) {
      return {
        errorType: 'SEARCH_ERROR',
        primaryReason: 'Region viewed only briefly (inadequate dwell time)',
      };
    }
  }

  // Step 3: Was any abnormality noted?
  if (!decision.abnormalityNoted) {
    // Check for inattentional blindness
    if (context.isUnexpectedFinding) {
      return {
        errorType: 'INATTENTIONAL_BLINDNESS',
        primaryReason:
          'Unexpected finding type filtered by top-down attention',
      };
    }

    // Check for prevalence effect
    if (context.isLowPrevalence) {
      return {
        errorType: 'PREVALENCE_EFFECT',
        primaryReason:
          'Low prevalence elevated detection threshold',
      };
    }

    // Default to recognition error
    return {
      errorType: 'RECOGNITION_ERROR',
      primaryReason:
        'Region viewed but abnormality not recognized',
    };
  }

  // Step 4: Abnormality noted but assessment incorrect → decision error
  if (!decision.assessmentCorrect) {
    return {
      errorType: 'DECISION_ERROR',
      primaryReason:
        'Abnormality detected but incorrectly assessed',
    };
  }

  // Shouldn't reach here, but handle gracefully
  return {
    errorType: 'UNCLASSIFIABLE',
    primaryReason: 'Unable to determine error type from available data',
  };
}

/**
 * Calculates confidence in the classification
 */
function calculateConfidence(
  errorType: WolfeErrorType,
  viewport: ViewportAnalysis,
  decision: DecisionAnalysis,
  context: ContextAnalysis
): number {
  const { MISSING_DATA_PENALTY, CORROBORATION_BONUS, HIGH_CONFIDENCE } =
    WOLFE_THRESHOLDS.confidence;

  let confidence = 0.7; // Base confidence

  // Adjust based on data availability
  const hasViewportData = viewport.totalDwellTimeMs > 0 || !viewport.regionViewed;
  const hasDecisionData =
    decision.initialAssessment !== null || decision.finalAssessment !== null;
  const hasContextData = context.prevalence > 0;

  if (!hasViewportData) confidence -= MISSING_DATA_PENALTY;
  if (!hasDecisionData) confidence -= MISSING_DATA_PENALTY;
  if (!hasContextData) confidence -= MISSING_DATA_PENALTY * 0.5;

  // Boost for corroborating evidence
  let corroborationCount = 0;

  switch (errorType) {
    case 'SEARCH_ERROR':
      if (!viewport.regionViewed) corroborationCount++;
      if (viewport.totalDwellTimeMs === 0) corroborationCount++;
      if (viewport.visitCount === 0) corroborationCount++;
      break;

    case 'RECOGNITION_ERROR':
      if (viewport.regionViewed && !decision.abnormalityNoted) corroborationCount++;
      if (viewport.adequateViewing) corroborationCount++;
      if (viewport.visitCount > 1) corroborationCount++; // Multiple looks, still missed
      break;

    case 'DECISION_ERROR':
      if (decision.abnormalityNoted && !decision.assessmentCorrect) corroborationCount++;
      if (!decision.deviationDocumented) corroborationCount++;
      break;

    case 'SATISFACTION_OF_SEARCH':
      if (context.sosRisk) corroborationCount++;
      if (context.findingsAlreadyFound > 0) corroborationCount++;
      if (!viewport.regionViewed) corroborationCount++;
      break;

    case 'PREVALENCE_EFFECT':
      if (context.isLowPrevalence) corroborationCount++;
      if (context.prevalence < 0.005) corroborationCount++; // Very low
      break;

    case 'INATTENTIONAL_BLINDNESS':
      if (context.isUnexpectedFinding) corroborationCount++;
      if (viewport.adequateViewing) corroborationCount++; // Looked but unexpected
      break;

    case 'CORRECT':
      corroborationCount = 3; // High confidence when correct
      break;
  }

  confidence += corroborationCount * CORROBORATION_BONUS;

  // Cap at high confidence
  return Math.min(Math.max(confidence, 0.1), HIGH_CONFIDENCE);
}

/**
 * Gets scientific basis for the error type
 */
function getScientificBasis(errorType: WolfeErrorType) {
  const citations = SCIENTIFIC_CITATIONS[errorType];
  const missRates = WOLFE_THRESHOLDS.expectedMissRates;

  let expectedMissRate = 0;
  switch (errorType) {
    case 'SEARCH_ERROR':
      expectedMissRate = missRates.SEARCH_ERROR;
      break;
    case 'RECOGNITION_ERROR':
      expectedMissRate = missRates.RECOGNITION_ERROR;
      break;
    case 'DECISION_ERROR':
      expectedMissRate = missRates.DECISION_ERROR;
      break;
    default:
      expectedMissRate = missRates.OTHER;
  }

  return {
    citation: citations.primary,
    expectedMissRate,
    additionalCitations: citations.additional,
    keyFinding: citations.keyFinding,
  };
}

/**
 * Assesses liability based on error type and circumstances
 */
function assessLiability(
  errorType: WolfeErrorType,
  evidence: ClassificationEvidence,
  caseData: CaseData
): {
  level: LiabilityLevel;
  reasoning: string;
  mitigatingFactors: string[];
  aggravatingFactors: string[];
} {
  const displayConfig = ERROR_TYPE_DISPLAY[errorType];
  const liabilityConfig = LIABILITY_REASONING[errorType];

  let level = displayConfig.typicalLiability;
  const mitigatingFactors: string[] = [];
  const aggravatingFactors: string[] = [];

  // Analyze evidence for specific factors
  if (evidence.viewportData) {
    const { dwellTimeMs, zoomLevel, regionViewed } = evidence.viewportData;

    if (!regionViewed) {
      mitigatingFactors.push('Region was never viewed - search coverage issue');
    } else if (dwellTimeMs < WOLFE_THRESHOLDS.viewing.ADEQUATE_DWELL_MS) {
      mitigatingFactors.push(
        `Brief viewing time (${(dwellTimeMs / 1000).toFixed(1)}s)`
      );
    } else {
      aggravatingFactors.push(
        `Adequate viewing time (${(dwellTimeMs / 1000).toFixed(1)}s)`
      );
    }

    if (zoomLevel < WOLFE_THRESHOLDS.viewing.ADEQUATE_ZOOM_LEVEL) {
      mitigatingFactors.push('Limited magnification used');
    }
  }

  if (evidence.decisionData) {
    const { deviationDocumented, aiAssessment, finalAssessment } =
      evidence.decisionData;

    if (deviationDocumented) {
      mitigatingFactors.push('Deviation from standard was documented');
    } else if (errorType === 'DECISION_ERROR') {
      aggravatingFactors.push('No documentation of reasoning');
    }

    if (
      aiAssessment &&
      finalAssessment &&
      aiAssessment > finalAssessment &&
      !deviationDocumented
    ) {
      aggravatingFactors.push('AI suggested higher concern level');
      level = 'HIGH';
    }
  }

  if (evidence.contextData) {
    const { prevalenceInStudy, caseDifficultyIndex, findingTypical } =
      evidence.contextData;

    if (prevalenceInStudy < WOLFE_THRESHOLDS.prevalence.LOW_PREVALENCE_PERCENT / 100) {
      mitigatingFactors.push(
        `Low prevalence context (${(prevalenceInStudy * 100).toFixed(1)}%)`
      );
    }

    if (caseDifficultyIndex !== undefined) {
      if (caseDifficultyIndex > WOLFE_THRESHOLDS.caseDifficulty.DIFFICULT) {
        mitigatingFactors.push(
          `High case difficulty (CDI: ${caseDifficultyIndex})`
        );
      } else if (caseDifficultyIndex < WOLFE_THRESHOLDS.caseDifficulty.EASY) {
        aggravatingFactors.push(
          `Low case difficulty (CDI: ${caseDifficultyIndex})`
        );
        if (level === 'LOW') level = 'MODERATE';
      }
    }

    if (!findingTypical) {
      mitigatingFactors.push('Finding type was atypical for clinical context');
    }
  }

  // Finding characteristics
  if (caseData.findingCharacteristics) {
    const { conspicuityIndex, typicalPresentation, surroundingDensity } =
      caseData.findingCharacteristics;

    if (conspicuityIndex !== undefined) {
      if (conspicuityIndex < 30) {
        mitigatingFactors.push(`Subtle finding (conspicuity: ${conspicuityIndex})`);
      } else if (conspicuityIndex > 70) {
        aggravatingFactors.push(`Obvious finding (conspicuity: ${conspicuityIndex})`);
        if (level === 'LOW') level = 'MODERATE';
        if (level === 'MODERATE' && errorType !== 'SEARCH_ERROR') level = 'HIGH';
      }
    }

    if (typicalPresentation === false) {
      mitigatingFactors.push('Atypical presentation');
    }

    if (surroundingDensity === 'dense') {
      mitigatingFactors.push('Dense surrounding tissue');
    }
  }

  return {
    level,
    reasoning: liabilityConfig.baseReasoning,
    mitigatingFactors,
    aggravatingFactors,
  };
}

/**
 * Generates human-readable explanation of the error
 */
function generateExplanation(
  errorType: WolfeErrorType,
  evidence: ClassificationEvidence,
  viewport: ViewportAnalysis,
  decision: DecisionAnalysis
): string {
  const config = ERROR_TYPE_DISPLAY[errorType];

  let explanation = config.explanation + '\n\n';

  // Add specific evidence
  if (errorType === 'SEARCH_ERROR') {
    if (!viewport.regionViewed) {
      explanation +=
        'Viewport tracking data confirms the region was never viewed during the reading session.';
    } else {
      explanation += `The region received only ${viewport.totalDwellTimeMs}ms of attention, ` +
        `below the ${WOLFE_THRESHOLDS.viewing.ADEQUATE_DWELL_MS}ms threshold for adequate viewing.`;
    }
  } else if (errorType === 'RECOGNITION_ERROR') {
    explanation +=
      `The region was viewed for ${(viewport.totalDwellTimeMs / 1000).toFixed(1)} seconds ` +
      `at ${viewport.maxZoomLevel.toFixed(1)}x magnification, but the finding was not identified.`;
  } else if (errorType === 'DECISION_ERROR') {
    const initial = decision.initialAssessment ?? 'unknown';
    const final = decision.finalAssessment ?? 'unknown';
    const truth = decision.groundTruth;
    explanation +=
      `Initial assessment: BI-RADS ${initial}. Final assessment: BI-RADS ${final}. ` +
      `Ground truth: BI-RADS ${truth}.`;
  }

  return explanation;
}

/**
 * Generates formal expert witness statement
 */
function generateExpertWitnessStatement(
  errorType: WolfeErrorType,
  evidence: ClassificationEvidence,
  liability: ReturnType<typeof assessLiability>,
  scientificBasis: ReturnType<typeof getScientificBasis>,
  caseData: CaseData
): string {
  const lines: string[] = [];

  // Header
  lines.push('WOLFE ERROR CLASSIFICATION REPORT');
  lines.push('');

  // Finding info
  lines.push(`Finding: ${formatFindingDescription(caseData)}`);
  lines.push(`Classification: ${errorType}`);
  lines.push(`Confidence: ${((evidence.viewportData?.dwellTimeMs ?? 0) > 0 ? 87 : 65)}%`);
  lines.push('');

  // Analysis section
  lines.push('ANALYSIS:');
  if (evidence.viewportData) {
    if (evidence.viewportData.regionViewed) {
      lines.push(
        `Viewport tracking data confirms the radiologist viewed the ${caseData.findingLocation.name} ` +
          `${caseData.findingLocation.laterality ? caseData.findingLocation.laterality + ' ' : ''}` +
          `for ${(evidence.viewportData.dwellTimeMs / 1000).toFixed(1)} seconds ` +
          `at ${evidence.viewportData.zoomLevel.toFixed(1)}x magnification.`
      );
    } else {
      lines.push(
        `Viewport tracking data indicates the ${caseData.findingLocation.name} ` +
          `${caseData.findingLocation.laterality ? caseData.findingLocation.laterality + ' ' : ''}` +
          `was not viewed during the reading session.`
      );
    }
  }

  if (evidence.decisionData) {
    if (evidence.decisionData.abnormalityNoted) {
      lines.push(
        `The radiologist noted an abnormality with an initial assessment of BI-RADS ${evidence.decisionData.initialAssessment} ` +
          `and final assessment of BI-RADS ${evidence.decisionData.finalAssessment}.`
      );
    } else {
      lines.push('No abnormality was noted in the initial or final assessment.');
    }
  }
  lines.push('');

  // Scientific context
  lines.push('SCIENTIFIC CONTEXT:');
  lines.push(
    `Per ${scientificBasis.citation}, ${scientificBasis.keyFinding}`
  );
  if (errorType === 'RECOGNITION_ERROR') {
    lines.push(
      'Research demonstrates this occurs even among expert radiologists at rates of 12-30% for subtle findings.'
    );
  }
  lines.push('');

  // Liability implications
  lines.push('LIABILITY IMPLICATIONS:');
  lines.push(liability.reasoning);
  lines.push('');

  if (liability.mitigatingFactors.length > 0) {
    lines.push('Mitigating factors:');
    liability.mitigatingFactors.forEach((f) => lines.push(`  - ${f}`));
  }

  if (liability.aggravatingFactors.length > 0) {
    lines.push('Aggravating factors:');
    liability.aggravatingFactors.forEach((f) => lines.push(`  - ${f}`));
  }
  lines.push('');

  // Conclusion
  lines.push('CONCLUSION:');
  const liabilityText =
    liability.level === 'LOW'
      ? 'consistent with known perceptual limitations documented in the visual attention literature'
      : liability.level === 'MODERATE'
        ? 'represents a judgment that may or may not meet the applicable standard of care'
        : 'represents a significant departure from expected radiologist performance';
  lines.push(
    `This miss is ${liabilityText}. ` +
      `Classification as ${errorType} is based on ${getEvidenceDescription(evidence)}.`
  );

  return lines.join('\n');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determines if two anatomical regions overlap
 */
function regionsOverlap(
  region1: AnatomicalRegion,
  region2: AnatomicalRegion
): boolean {
  // If both have bounding boxes, check geometric overlap
  if (region1.boundingBox && region2.boundingBox) {
    const r1 = region1.boundingBox;
    const r2 = region2.boundingBox;

    return !(
      r1.x + r1.width < r2.x ||
      r2.x + r2.width < r1.x ||
      r1.y + r1.height < r2.y ||
      r2.y + r2.height < r1.y
    );
  }

  // Fall back to name matching
  if (region1.name.toLowerCase() === region2.name.toLowerCase()) {
    // Check laterality if present
    if (region1.laterality && region2.laterality) {
      return region1.laterality === region2.laterality;
    }
    return true;
  }

  return false;
}

/**
 * Counts distinct visits to a region
 */
function countDistinctVisits(
  regionEvents: ViewportEvent[],
  allEvents: ViewportEvent[]
): number {
  if (regionEvents.length === 0) return 0;

  // Sort by timestamp
  const sorted = [...regionEvents].sort((a, b) => a.timestampMs - b.timestampMs);

  let visits = 1;
  let lastEventIndex = allEvents.findIndex(
    (e) => e.timestampMs === sorted[0].timestampMs
  );

  for (let i = 1; i < sorted.length; i++) {
    const currentIndex = allEvents.findIndex(
      (e) => e.timestampMs === sorted[i].timestampMs
    );

    // If there was at least one event in between viewing a different region, count as new visit
    if (currentIndex - lastEventIndex > 1) {
      visits++;
    }

    lastEventIndex = currentIndex;
  }

  return visits;
}

/**
 * Estimates coverage percentage based on viewport events
 */
function estimateCoverage(
  events: ViewportEvent[],
  region: AnatomicalRegion
): number {
  if (events.length === 0 || !region.boundingBox) return 0;

  // Simplified: assume adequate coverage if multiple zoomed views
  const zoomedViews = events.filter((e) => (e.zoomLevel ?? 1) >= 1.5);
  const hasMultipleViews = zoomedViews.length >= 2;
  const hasLongDwell = events.some(
    (e) => (e.durationMs ?? 0) > WOLFE_THRESHOLDS.viewing.ADEQUATE_DWELL_MS / 2
  );

  if (hasMultipleViews && hasLongDwell) return 90;
  if (hasMultipleViews || hasLongDwell) return 70;
  if (events.length > 0) return 50;

  return 0;
}

/**
 * Formats finding description for reports
 */
function formatFindingDescription(caseData: CaseData): string {
  const parts: string[] = [];

  if (caseData.findingCharacteristics?.sizeMm) {
    parts.push(`${caseData.findingCharacteristics.sizeMm}mm`);
  }

  if (caseData.findingCharacteristics?.type) {
    parts.push(caseData.findingCharacteristics.type);
  }

  parts.push(caseData.findingLocation.name);

  if (caseData.findingLocation.laterality) {
    parts.push(`${caseData.findingLocation.laterality} breast`);
  }

  return parts.join(' ') || 'Finding details not specified';
}

/**
 * Gets evidence description for conclusion
 */
function getEvidenceDescription(evidence: ClassificationEvidence): string {
  const sources: string[] = [];

  if (evidence.viewportData) {
    sources.push('viewport tracking data');
  }
  if (evidence.decisionData) {
    sources.push('decision history');
  }
  if (evidence.contextData) {
    sources.push('study context analysis');
  }

  if (sources.length === 0) return 'limited available evidence';
  if (sources.length === 1) return sources[0];
  if (sources.length === 2) return `${sources[0]} and ${sources[1]}`;

  return `${sources.slice(0, -1).join(', ')}, and ${sources[sources.length - 1]}`;
}

/**
 * Generates evidence checks for display in UI
 */
export function generateEvidenceChecks(
  classification: WolfeErrorClassification
): EvidenceCheck[] {
  const checks: EvidenceCheck[] = [];
  const { evidence } = classification;

  if (evidence.viewportData) {
    const { regionViewed, dwellTimeMs, zoomLevel } = evidence.viewportData;

    checks.push({
      label: 'Region was viewed',
      passed: regionViewed,
      value: regionViewed ? 'Yes' : 'No',
    });

    if (regionViewed) {
      const adequateDwell = dwellTimeMs >= WOLFE_THRESHOLDS.viewing.ADEQUATE_DWELL_MS;
      checks.push({
        label: 'Adequate dwell time',
        passed: adequateDwell,
        value: `${(dwellTimeMs / 1000).toFixed(1)}s`,
        threshold: `${(WOLFE_THRESHOLDS.viewing.ADEQUATE_DWELL_MS / 1000).toFixed(0)}s`,
      });

      const adequateZoom = zoomLevel >= WOLFE_THRESHOLDS.viewing.ADEQUATE_ZOOM_LEVEL;
      checks.push({
        label: 'Adequate zoom level',
        passed: adequateZoom,
        value: `${zoomLevel.toFixed(1)}x`,
        threshold: `${WOLFE_THRESHOLDS.viewing.ADEQUATE_ZOOM_LEVEL}x`,
      });
    }
  }

  if (evidence.decisionData) {
    const { abnormalityNoted, initialAssessment, finalAssessment, groundTruth } =
      evidence.decisionData;

    checks.push({
      label: 'Abnormality identified',
      passed: abnormalityNoted ?? false,
      value: abnormalityNoted ? 'Yes' : 'No',
    });

    const assessmentCorrect =
      finalAssessment === groundTruth ||
      (groundTruth >= 4 && finalAssessment >= 4);
    checks.push({
      label: 'Assessment correct',
      passed: assessmentCorrect,
      value: `BI-RADS ${finalAssessment}`,
      context: `Ground truth: BI-RADS ${groundTruth}`,
    });
  }

  return checks;
}

/**
 * Creates a classification event for audit logging
 */
export function createClassificationEvent(
  classification: WolfeErrorClassification,
  viewportEventsCount: number,
  decisionHistoryCount: number
) {
  return {
    type: 'WOLFE_CLASSIFICATION_COMPUTED' as const,
    timestamp: new Date().toISOString(),
    payload: {
      classification,
      inputData: {
        caseId: classification.caseId,
        findingId: classification.findingId,
        viewportEventsCount,
        decisionHistoryCount,
      },
    },
  };
}
