/**
 * Wolfe Error Taxonomy Expert Witness Statement Generator
 *
 * Generates formal statements suitable for use in medico-legal contexts,
 * expert witness testimony, and malpractice defense analysis.
 *
 * All statements are grounded in peer-reviewed research and include
 * appropriate citations for courtroom use.
 *
 * @see Wolfe, J.M. et al. (2022). Normal Blindness. Trends in Cognitive Sciences.
 */

import type {
  WolfeErrorClassification,
  WolfeErrorType,
  ClassificationEvidence,
  LiabilityLevel,
  CaseData,
  FindingCharacteristics,
} from './wolfeErrorTypes';

import {
  SCIENTIFIC_CITATIONS,
  LIABILITY_REASONING,
  ERROR_TYPE_DISPLAY,
  WOLFE_THRESHOLDS,
} from './wolfeThresholds';

/**
 * Options for generating expert witness reports
 */
export interface ExpertWitnessReportOptions {
  /** Include full research citations */
  includeCitations?: boolean;

  /** Include liability analysis */
  includeLiabilityAnalysis?: boolean;

  /** Include recommendations */
  includeRecommendations?: boolean;

  /** Report format */
  format?: 'full' | 'summary' | 'court_ready';

  /** Expert witness name and credentials (if provided, included in header) */
  expertInfo?: {
    name: string;
    credentials: string;
    institution: string;
  };

  /** Case reference number */
  caseReference?: string;

  /** Report date override */
  reportDate?: string;
}

/**
 * Full expert witness report structure
 */
export interface ExpertWitnessReport {
  /** Report header with metadata */
  header: string;

  /** Executive summary */
  executiveSummary: string;

  /** Detailed finding description */
  findingDescription: string;

  /** Classification analysis */
  classificationAnalysis: string;

  /** Scientific foundation */
  scientificFoundation: string;

  /** Evidence analysis */
  evidenceAnalysis: string;

  /** Liability assessment */
  liabilityAssessment: string;

  /** Expert opinion */
  expertOpinion: string;

  /** References */
  references: string[];

  /** Full formatted report */
  fullReport: string;
}

/**
 * Generates a complete expert witness report for a Wolfe error classification
 */
export function generateExpertWitnessReport(
  classification: WolfeErrorClassification,
  caseData: CaseData,
  options: ExpertWitnessReportOptions = {}
): ExpertWitnessReport {
  const {
    includeCitations = true,
    includeLiabilityAnalysis = true,
    includeRecommendations = true,
    format = 'full',
    expertInfo,
    caseReference,
    reportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  } = options;

  // Generate each section
  const header = generateHeader(caseReference, reportDate, expertInfo);
  const executiveSummary = generateExecutiveSummary(classification, caseData);
  const findingDescription = generateFindingDescription(classification, caseData);
  const classificationAnalysis = generateClassificationAnalysis(classification);
  const scientificFoundation = generateScientificFoundation(classification.errorType);
  const evidenceAnalysis = generateEvidenceAnalysis(classification);
  const liabilityAssessment = includeLiabilityAnalysis
    ? generateLiabilitySection(classification)
    : '';
  const expertOpinion = generateExpertOpinion(
    classification,
    caseData,
    includeRecommendations
  );
  const references = getReferences(classification.errorType);

  // Assemble full report based on format
  let fullReport: string;

  if (format === 'summary') {
    fullReport = [header, executiveSummary, classificationAnalysis].join('\n\n');
  } else if (format === 'court_ready') {
    fullReport = [
      header,
      executiveSummary,
      findingDescription,
      classificationAnalysis,
      scientificFoundation,
      evidenceAnalysis,
      liabilityAssessment,
      expertOpinion,
      includeCitations ? formatReferences(references) : '',
    ]
      .filter(Boolean)
      .join('\n\n' + '='.repeat(72) + '\n\n');
  } else {
    fullReport = [
      header,
      executiveSummary,
      findingDescription,
      classificationAnalysis,
      scientificFoundation,
      evidenceAnalysis,
      liabilityAssessment,
      expertOpinion,
      includeCitations ? formatReferences(references) : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  return {
    header,
    executiveSummary,
    findingDescription,
    classificationAnalysis,
    scientificFoundation,
    evidenceAnalysis,
    liabilityAssessment,
    expertOpinion,
    references,
    fullReport,
  };
}

/**
 * Generates report header
 */
function generateHeader(
  caseReference?: string,
  reportDate?: string,
  expertInfo?: ExpertWitnessReportOptions['expertInfo']
): string {
  const lines: string[] = [];

  lines.push('═'.repeat(72));
  lines.push('EXPERT WITNESS REPORT');
  lines.push('WOLFE ERROR TAXONOMY CLASSIFICATION ANALYSIS');
  lines.push('═'.repeat(72));
  lines.push('');

  if (caseReference) {
    lines.push(`Case Reference: ${caseReference}`);
  }

  lines.push(`Report Date: ${reportDate}`);
  lines.push(`Classification System: Wolfe Error Taxonomy v${WOLFE_THRESHOLDS.confidence.MINIMUM_RELIABLE}`);
  lines.push('');

  if (expertInfo) {
    lines.push('Prepared By:');
    lines.push(`  ${expertInfo.name}`);
    lines.push(`  ${expertInfo.credentials}`);
    lines.push(`  ${expertInfo.institution}`);
  }

  lines.push('─'.repeat(72));

  return lines.join('\n');
}

/**
 * Generates executive summary
 */
function generateExecutiveSummary(
  classification: WolfeErrorClassification,
  caseData: CaseData
): string {
  const lines: string[] = [];
  const config = ERROR_TYPE_DISPLAY[classification.errorType];

  lines.push('EXECUTIVE SUMMARY');
  lines.push('─'.repeat(40));
  lines.push('');

  lines.push(`Classification: ${classification.errorType}`);
  lines.push(`Confidence Level: ${(classification.confidence * 100).toFixed(0)}%`);
  lines.push(`Liability Assessment: ${classification.liabilityAssessment.level}`);
  lines.push('');

  lines.push('Key Finding:');
  lines.push(config.description);
  lines.push('');

  lines.push('Summary:');
  lines.push(
    wordWrap(
      `This analysis classifies the diagnostic miss as a ${config.label} based on ` +
        `${getEvidenceSummary(classification.evidence)}. ${config.explanation.split('.')[0]}.`,
      72
    )
  );

  return lines.join('\n');
}

/**
 * Generates detailed finding description
 */
function generateFindingDescription(
  classification: WolfeErrorClassification,
  caseData: CaseData
): string {
  const lines: string[] = [];

  lines.push('FINDING DESCRIPTION');
  lines.push('─'.repeat(40));
  lines.push('');

  lines.push(`Case ID: ${classification.caseId}`);
  lines.push(`Finding ID: ${classification.findingId}`);
  lines.push('');

  lines.push('Anatomical Location:');
  lines.push(`  Region: ${caseData.findingLocation.name}`);
  if (caseData.findingLocation.laterality) {
    lines.push(`  Laterality: ${caseData.findingLocation.laterality}`);
  }
  if (caseData.findingLocation.clockPosition) {
    lines.push(`  Clock Position: ${caseData.findingLocation.clockPosition} o'clock`);
  }
  if (caseData.findingLocation.depthCm) {
    lines.push(`  Depth: ${caseData.findingLocation.depthCm} cm from nipple`);
  }
  lines.push('');

  if (caseData.findingCharacteristics) {
    lines.push('Finding Characteristics:');
    const chars = caseData.findingCharacteristics;
    if (chars.sizeMm) {
      lines.push(`  Size: ${chars.sizeMm} mm`);
    }
    if (chars.type) {
      lines.push(`  Type: ${chars.type}`);
    }
    if (chars.conspicuityIndex !== undefined) {
      const level = getConspicuityLevel(chars.conspicuityIndex);
      lines.push(`  Conspicuity Index: ${chars.conspicuityIndex} (${level})`);
    }
    if (chars.surroundingDensity) {
      lines.push(`  Surrounding Density: ${chars.surroundingDensity}`);
    }
    if (chars.typicalPresentation !== undefined) {
      lines.push(
        `  Presentation: ${chars.typicalPresentation ? 'Typical' : 'Atypical'}`
      );
    }
  }

  return lines.join('\n');
}

/**
 * Generates classification analysis section
 */
function generateClassificationAnalysis(
  classification: WolfeErrorClassification
): string {
  const lines: string[] = [];
  const config = ERROR_TYPE_DISPLAY[classification.errorType];

  lines.push('CLASSIFICATION ANALYSIS');
  lines.push('─'.repeat(40));
  lines.push('');

  lines.push(`Primary Classification: ${classification.errorType}`);
  lines.push(`Display Name: ${config.label}`);
  lines.push(`Confidence: ${(classification.confidence * 100).toFixed(0)}%`);
  lines.push('');

  lines.push('Classification Definition:');
  lines.push(wordWrap(config.explanation, 72));
  lines.push('');

  lines.push('Basis for Classification:');
  lines.push(wordWrap(classification.explanation, 72));

  return lines.join('\n');
}

/**
 * Generates scientific foundation section
 */
function generateScientificFoundation(errorType: WolfeErrorType): string {
  const lines: string[] = [];
  const citations = SCIENTIFIC_CITATIONS[errorType];

  lines.push('SCIENTIFIC FOUNDATION');
  lines.push('─'.repeat(40));
  lines.push('');

  lines.push('Primary Research Citation:');
  lines.push(wordWrap(citations.primary, 72));
  lines.push('');

  lines.push('Key Research Finding:');
  lines.push(wordWrap(citations.keyFinding, 72));
  lines.push('');

  if (errorType === 'RECOGNITION_ERROR') {
    lines.push('Research Context:');
    lines.push(
      wordWrap(
        'Wolfe et al. (2022) introduced the concept of "Normal Blindness" to describe the ' +
          'phenomenon where trained observers fail to recognize abnormalities even when directly ' +
          'fixating on them. This research demonstrates that recognition failures are not ' +
          'aberrations but rather reflect fundamental limitations in human visual processing. ' +
          'The expected miss rate for subtle findings ranges from 12-30% even among expert ' +
          'radiologists, and these errors occur across all levels of training and experience.',
        72
      )
    );
  } else if (errorType === 'SEARCH_ERROR') {
    lines.push('Research Context:');
    lines.push(
      wordWrap(
        'Search errors occur when the target region is never brought into foveal vision during ' +
          'the interpretation process. Research by Kundel and colleagues has shown that systematic ' +
          'search patterns can leave gaps in coverage, particularly in complex images or under ' +
          'time pressure. These errors account for approximately 30% of diagnostic misses and ' +
          'often reflect environmental or systemic factors rather than individual negligence.',
        72
      )
    );
  } else if (errorType === 'INATTENTIONAL_BLINDNESS') {
    lines.push('Research Context:');
    lines.push(
      wordWrap(
        'The "Invisible Gorilla" study by Drew, Vo, and Wolfe (2013) demonstrated that 83% of ' +
          'radiologists failed to notice a matchbook-sized gorilla inserted into lung CT scans ' +
          'while searching for lung nodules. This research established that even obvious, unexpected ' +
          'findings can be completely invisible when attention is focused elsewhere. This phenomenon ' +
          'is unconscious and cannot be overcome through effort or training.',
        72
      )
    );
  } else if (errorType === 'PREVALENCE_EFFECT') {
    lines.push('Research Context:');
    lines.push(
      wordWrap(
        'Wolfe et al. (2005) demonstrated that when targets are rare, observers unconsciously ' +
          'shift their response criterion, becoming more conservative and thus missing more targets. ' +
          'This "prevalence effect" is particularly relevant in screening contexts where pathology ' +
          'may be present in only 0.3-0.5% of cases. The effect is not under conscious control and ' +
          'represents a rational adaptation to base rates.',
        72
      )
    );
  } else if (errorType === 'SATISFACTION_OF_SEARCH') {
    lines.push('Research Context:');
    lines.push(
      wordWrap(
        'Berbaum and colleagues documented that finding one abnormality reduces vigilance for ' +
          'subsequent abnormalities. This "satisfaction of search" effect is a well-established ' +
          'cognitive bias that occurs unconsciously. Research shows that the risk is highest ' +
          'immediately after finding the first abnormality and diminishes over time, but ' +
          'significant elevation persists for at least 30-60 seconds.',
        72
      )
    );
  }

  return lines.join('\n');
}

/**
 * Generates evidence analysis section
 */
function generateEvidenceAnalysis(
  classification: WolfeErrorClassification
): string {
  const lines: string[] = [];
  const { evidence } = classification;

  lines.push('EVIDENCE ANALYSIS');
  lines.push('─'.repeat(40));
  lines.push('');

  if (evidence.viewportData) {
    lines.push('Viewport Tracking Analysis:');
    const vp = evidence.viewportData;
    lines.push(`  Region Viewed: ${vp.regionViewed ? 'Yes' : 'No'}`);
    lines.push(`  Total Dwell Time: ${(vp.dwellTimeMs / 1000).toFixed(2)} seconds`);
    lines.push(`  Maximum Zoom Level: ${vp.zoomLevel.toFixed(1)}x`);
    if (vp.visitCount !== undefined) {
      lines.push(`  Number of Visits: ${vp.visitCount}`);
    }
    if (vp.coveragePercent !== undefined) {
      lines.push(`  Region Coverage: ${vp.coveragePercent.toFixed(0)}%`);
    }
    lines.push('');

    // Interpretation
    lines.push('Viewport Interpretation:');
    if (!vp.regionViewed) {
      lines.push(
        wordWrap(
          'The viewport tracking data demonstrates that the region containing the finding was ' +
            'never brought into the field of view during the reading session. This is consistent ' +
            'with a search error classification.',
          72
        )
      );
    } else if (vp.dwellTimeMs < WOLFE_THRESHOLDS.viewing.ADEQUATE_DWELL_MS) {
      lines.push(
        wordWrap(
          `The region was viewed for ${(vp.dwellTimeMs / 1000).toFixed(2)} seconds, which is ` +
            `below the ${(WOLFE_THRESHOLDS.viewing.ADEQUATE_DWELL_MS / 1000).toFixed(0)}-second ` +
            `threshold established in visual search research as adequate for detailed analysis.`,
          72
        )
      );
    } else {
      lines.push(
        wordWrap(
          `The region received ${(vp.dwellTimeMs / 1000).toFixed(2)} seconds of viewing time ` +
            `at ${vp.zoomLevel.toFixed(1)}x magnification, indicating adequate opportunity for ` +
            `visual analysis of the finding.`,
          72
        )
      );
    }
    lines.push('');
  }

  if (evidence.decisionData) {
    lines.push('Decision History Analysis:');
    const dd = evidence.decisionData;
    lines.push(`  Initial Assessment: BI-RADS ${dd.initialAssessment}`);
    lines.push(`  Final Assessment: BI-RADS ${dd.finalAssessment}`);
    lines.push(`  Ground Truth: BI-RADS ${dd.groundTruth}`);
    if (dd.aiAssessment !== undefined) {
      lines.push(`  AI Suggested Assessment: BI-RADS ${dd.aiAssessment}`);
    }
    lines.push(`  Abnormality Noted: ${dd.abnormalityNoted ? 'Yes' : 'No'}`);
    lines.push(`  Deviation Documented: ${dd.deviationDocumented ? 'Yes' : 'No'}`);
    lines.push('');
  }

  if (evidence.contextData) {
    lines.push('Contextual Analysis:');
    const cd = evidence.contextData;
    lines.push(`  Study Prevalence: ${(cd.prevalenceInStudy * 100).toFixed(2)}%`);
    lines.push(`  Prior Findings in Case: ${cd.findingsAlreadyFound}`);
    lines.push(`  Finding Type Typical: ${cd.findingTypical ? 'Yes' : 'No'}`);
    if (cd.caseDifficultyIndex !== undefined) {
      const level = getCaseDifficultyLevel(cd.caseDifficultyIndex);
      lines.push(`  Case Difficulty Index: ${cd.caseDifficultyIndex} (${level})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generates liability assessment section
 */
function generateLiabilitySection(
  classification: WolfeErrorClassification
): string {
  const lines: string[] = [];
  const { liabilityAssessment } = classification;

  lines.push('LIABILITY ASSESSMENT');
  lines.push('─'.repeat(40));
  lines.push('');

  lines.push(`Overall Liability Level: ${liabilityAssessment.level}`);
  lines.push('');

  lines.push('Assessment Rationale:');
  lines.push(wordWrap(liabilityAssessment.reasoning, 72));
  lines.push('');

  if (liabilityAssessment.mitigatingFactors.length > 0) {
    lines.push('Mitigating Factors:');
    liabilityAssessment.mitigatingFactors.forEach((factor) => {
      lines.push(`  • ${factor}`);
    });
    lines.push('');
  }

  if (liabilityAssessment.aggravatingFactors.length > 0) {
    lines.push('Aggravating Factors:');
    liabilityAssessment.aggravatingFactors.forEach((factor) => {
      lines.push(`  • ${factor}`);
    });
    lines.push('');
  }

  // Add standard of care discussion
  lines.push('Standard of Care Analysis:');
  const socAnalysis = getStandardOfCareAnalysis(classification);
  lines.push(wordWrap(socAnalysis, 72));

  return lines.join('\n');
}

/**
 * Generates expert opinion section
 */
function generateExpertOpinion(
  classification: WolfeErrorClassification,
  caseData: CaseData,
  includeRecommendations: boolean
): string {
  const lines: string[] = [];

  lines.push('EXPERT OPINION');
  lines.push('─'.repeat(40));
  lines.push('');

  const opinion = generateOpinionText(classification, caseData);
  lines.push(wordWrap(opinion, 72));
  lines.push('');

  if (includeRecommendations) {
    lines.push('Recommendations:');
    const recommendations = getRecommendations(classification);
    recommendations.forEach((rec) => {
      lines.push(`  ${rec.number}. ${rec.text}`);
    });
  }

  return lines.join('\n');
}

/**
 * Generates the main opinion text
 */
function generateOpinionText(
  classification: WolfeErrorClassification,
  caseData: CaseData
): string {
  const { errorType, liabilityAssessment, evidence } = classification;
  const config = ERROR_TYPE_DISPLAY[errorType];

  let opinion = '';

  opinion +=
    `It is my professional opinion, to a reasonable degree of scientific certainty, that ` +
    `the diagnostic miss in this case is properly classified as a ${config.label}. `;

  switch (errorType) {
    case 'SEARCH_ERROR':
      opinion +=
        `The viewport tracking evidence demonstrates that the anatomical region containing ` +
        `the finding was ${evidence.viewportData?.regionViewed ? 'inadequately' : 'never'} ` +
        `examined during the reading session. `;
      opinion +=
        `Per established visual search literature, search errors represent systematic gaps ` +
        `in image coverage and account for approximately 30% of diagnostic misses in radiology. `;
      opinion +=
        `These errors reflect limitations in search strategy rather than failures of ` +
        `pattern recognition and are often influenced by environmental factors such as ` +
        `time pressure, interruptions, and case complexity.`;
      break;

    case 'RECOGNITION_ERROR':
      opinion +=
        `The viewport tracking evidence demonstrates that the radiologist viewed the region ` +
        `containing the finding for ${((evidence.viewportData?.dwellTimeMs ?? 0) / 1000).toFixed(1)} ` +
        `seconds, yet the abnormality was not recognized. `;
      opinion +=
        `This is consistent with Wolfe's concept of "Normal Blindness" - the well-documented ` +
        `phenomenon where trained observers fail to recognize abnormalities even with direct fixation. `;
      opinion +=
        `Research establishes that recognition errors are the largest category of diagnostic ` +
        `misses (approximately 45%) and occur at rates of 12-30% even among expert radiologists ` +
        `for subtle findings.`;
      break;

    case 'DECISION_ERROR':
      opinion +=
        `The evidence indicates the radiologist detected an abnormality in this region but ` +
        `made an incorrect interpretive judgment, assessing it as BI-RADS ${evidence.decisionData?.finalAssessment} ` +
        `when the ground truth was BI-RADS ${evidence.decisionData?.groundTruth}. `;
      opinion +=
        `Decision errors represent cognitive or reasoning failures rather than perceptual ones, ` +
        `and account for approximately 15% of diagnostic misses. `;
      if (!evidence.decisionData?.deviationDocumented) {
        opinion +=
          `The absence of documented reasoning for this assessment is relevant to the ` +
          `liability analysis.`;
      }
      break;

    case 'SATISFACTION_OF_SEARCH':
      opinion +=
        `The timing evidence suggests this miss may be attributable to satisfaction of search - ` +
        `the well-documented cognitive bias where finding one abnormality reduces vigilance for ` +
        `additional findings. `;
      opinion +=
        `Research by Berbaum and colleagues has established that this effect is unconscious, ` +
        `universal among observers, and cannot be eliminated through training or effort. `;
      opinion +=
        `The presence of ${evidence.contextData?.findingsAlreadyFound ?? 1} prior finding(s) ` +
        `in this case is consistent with this classification.`;
      break;

    case 'PREVALENCE_EFFECT':
      opinion +=
        `The low prevalence of positive findings in the study population ` +
        `(${((evidence.contextData?.prevalenceInStudy ?? 0) * 100).toFixed(2)}%) is consistent with ` +
        `a prevalence effect - the documented phenomenon where rare targets lead to unconscious ` +
        `elevation of detection thresholds. `;
      opinion +=
        `Wolfe's research (2005) established that this effect is a rational adaptation to base ` +
        `rates and is not under conscious control. When prevalence drops below 1%, miss rates ` +
        `increase substantially.`;
      break;

    case 'INATTENTIONAL_BLINDNESS':
      opinion +=
        `The atypical nature of this finding for the clinical context is consistent with ` +
        `inattentional blindness - the phenomenon demonstrated in Drew, Vo, and Wolfe's ` +
        `"Invisible Gorilla" study where 83% of radiologists missed an obvious unexpected ` +
        `finding while searching for expected targets. `;
      opinion +=
        `This research establishes that when attention is focused on expected finding types, ` +
        `even obvious unexpected findings can be completely invisible. This is an unconscious ` +
        `process that cannot be overcome through effort.`;
      break;

    case 'CORRECT':
      opinion +=
        `No error occurred in this case. The finding was correctly identified and assessed.`;
      break;

    case 'UNCLASSIFIABLE':
      opinion +=
        `Insufficient evidence is available to confidently classify the error type. ` +
        `Additional data, particularly viewport tracking information, would be required ` +
        `for a definitive classification.`;
      break;
  }

  opinion += '\n\n';

  // Add liability opinion
  opinion +=
    `Regarding liability: the ${liabilityAssessment.level.toLowerCase()} liability assessment ` +
    `reflects the balance of mitigating and aggravating factors identified in this case. `;

  if (liabilityAssessment.level === 'LOW') {
    opinion +=
      `The error pattern identified is consistent with known limitations in human visual ` +
      `processing that are well-documented in the scientific literature and occur even ` +
      `among highly trained experts.`;
  } else if (liabilityAssessment.level === 'MODERATE') {
    opinion +=
      `While the error pattern falls within documented ranges for radiologist performance, ` +
      `specific factors in this case warrant careful consideration in determining whether ` +
      `the standard of care was met.`;
  } else {
    opinion +=
      `Specific factors in this case, including ${liabilityAssessment.aggravatingFactors.slice(0, 2).join(' and ')}, ` +
      `suggest that the error may represent a departure from the expected standard of care.`;
  }

  return opinion;
}

/**
 * Gets standard of care analysis text
 */
function getStandardOfCareAnalysis(
  classification: WolfeErrorClassification
): string {
  const { errorType, evidence, liabilityAssessment } = classification;

  switch (liabilityAssessment.level) {
    case 'LOW':
      return (
        `The error pattern identified in this case falls within the expected range of ` +
        `performance for radiologists interpreting similar cases. Research establishes ` +
        `that errors of this type occur among all radiologists, including those with ` +
        `exemplary track records, and reflect inherent limitations in human visual ` +
        `processing rather than individual deficiency. The presence of mitigating ` +
        `factors supports a finding that the standard of care was likely met.`
      );

    case 'MODERATE':
      return (
        `The determination of whether the standard of care was met in this case requires ` +
        `careful weighing of competing factors. While the error type is documented in the ` +
        `literature as occurring among competent radiologists, specific aspects of this ` +
        `case - including ${liabilityAssessment.aggravatingFactors[0] ?? 'the viewing conditions'} - ` +
        `warrant scrutiny. Expert testimony regarding the applicable standard of care ` +
        `would be helpful in reaching a definitive conclusion.`
      );

    case 'HIGH':
      return (
        `Several factors in this case suggest a potential departure from the standard of ` +
        `care. In particular, ${liabilityAssessment.aggravatingFactors.slice(0, 2).join(' and ')} ` +
        `indicate that the error may not be attributable solely to inherent limitations in ` +
        `human perception. However, final determination requires consideration of all ` +
        `circumstances, including workload, environmental factors, and clinical context ` +
        `that may not be fully captured in the available data.`
      );

    default:
      return 'Standard of care analysis requires additional information.';
  }
}

/**
 * Gets recommendations based on classification
 */
function getRecommendations(
  classification: WolfeErrorClassification
): { number: number; text: string }[] {
  const recommendations: { number: number; text: string }[] = [];
  const { errorType, liabilityAssessment } = classification;

  let num = 1;

  // Always recommend preserving evidence
  recommendations.push({
    number: num++,
    text:
      'Preserve all viewport tracking data, decision history, and session recordings ' +
      'as evidence supporting this classification.',
  });

  // Error-type-specific recommendations
  switch (errorType) {
    case 'SEARCH_ERROR':
      recommendations.push({
        number: num++,
        text:
          'Review systemic factors that may have contributed to incomplete search, ' +
          'including workload, interruptions, and environmental conditions.',
      });
      break;

    case 'RECOGNITION_ERROR':
      recommendations.push({
        number: num++,
        text:
          'Consider the finding characteristics, particularly conspicuity and tissue ' +
          'density, when evaluating whether the miss was within expected performance ranges.',
      });
      break;

    case 'DECISION_ERROR':
      recommendations.push({
        number: num++,
        text:
          'Review documentation practices to ensure reasoning for assessments is captured, ' +
          'particularly when deviating from AI suggestions.',
      });
      break;

    case 'SATISFACTION_OF_SEARCH':
      recommendations.push({
        number: num++,
        text:
          'Consider implementing structured search protocols or "second look" requirements ' +
          'for cases with identified abnormalities.',
      });
      break;
  }

  // Liability-based recommendations
  if (liabilityAssessment.level === 'HIGH') {
    recommendations.push({
      number: num++,
      text:
        'Given the elevated liability assessment, early case evaluation by defense ' +
        'counsel is recommended.',
    });
  }

  // Standard closing recommendation
  recommendations.push({
    number: num++,
    text:
      'This classification should be considered in conjunction with all available ' +
      'clinical information and the full circumstances of the case.',
  });

  return recommendations;
}

/**
 * Gets reference list for the error type
 */
function getReferences(errorType: WolfeErrorType): string[] {
  const citations = SCIENTIFIC_CITATIONS[errorType];
  const references: string[] = [];

  references.push(citations.primary);
  references.push(...citations.additional);

  // Add foundational references
  references.push(
    'Wolfe, J.M. et al. (2022). Normal Blindness: When We Look But Fail To See. ' +
      'Trends in Cognitive Sciences.'
  );

  // Deduplicate
  return [...new Set(references)];
}

/**
 * Formats references section
 */
function formatReferences(references: string[]): string {
  const lines: string[] = [];

  lines.push('REFERENCES');
  lines.push('─'.repeat(40));
  lines.push('');

  references.forEach((ref, i) => {
    lines.push(`[${i + 1}] ${ref}`);
  });

  return lines.join('\n');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Word wraps text to specified width
 */
function wordWrap(text: string, width: number): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);

  return lines.join('\n');
}

/**
 * Gets evidence summary for executive summary
 */
function getEvidenceSummary(evidence: ClassificationEvidence): string {
  const parts: string[] = [];

  if (evidence.viewportData) {
    parts.push('viewport tracking data');
  }
  if (evidence.decisionData) {
    parts.push('decision history analysis');
  }
  if (evidence.contextData) {
    parts.push('study context review');
  }

  if (parts.length === 0) return 'limited available evidence';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;

  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

/**
 * Gets conspicuity level description
 */
function getConspicuityLevel(index: number): string {
  if (index < 30) return 'SUBTLE';
  if (index < 50) return 'MODERATE';
  if (index < 70) return 'VISIBLE';
  return 'OBVIOUS';
}

/**
 * Gets case difficulty level description
 */
function getCaseDifficultyLevel(index: number): string {
  if (index < WOLFE_THRESHOLDS.caseDifficulty.EASY) return 'LOW';
  if (index < WOLFE_THRESHOLDS.caseDifficulty.MODERATE) return 'MODERATE';
  if (index < WOLFE_THRESHOLDS.caseDifficulty.DIFFICULT) return 'ELEVATED';
  if (index < WOLFE_THRESHOLDS.caseDifficulty.VERY_DIFFICULT) return 'HIGH';
  return 'VERY HIGH';
}

/**
 * Generates a summary statement for quick reference
 */
export function generateSummaryStatement(
  classification: WolfeErrorClassification
): string {
  const config = ERROR_TYPE_DISPLAY[classification.errorType];

  return (
    `Classification: ${classification.errorType} (${(classification.confidence * 100).toFixed(0)}% confidence). ` +
    `${config.description}. ` +
    `Liability: ${classification.liabilityAssessment.level}. ` +
    `Scientific basis: ${classification.scientificBasis.citation.split('.')[0]}.`
  );
}

/**
 * Generates a deposition-ready question and answer summary
 */
export function generateDepositionQA(
  classification: WolfeErrorClassification,
  caseData: CaseData
): { question: string; answer: string }[] {
  const qa: { question: string; answer: string }[] = [];
  const config = ERROR_TYPE_DISPLAY[classification.errorType];

  qa.push({
    question: 'What type of error occurred in this case?',
    answer:
      `This case is classified as a ${config.label}. ${config.description}. ` +
      `The classification confidence is ${(classification.confidence * 100).toFixed(0)}%.`,
  });

  qa.push({
    question: 'What is the scientific basis for this classification?',
    answer:
      `The classification is based on research by ${classification.scientificBasis.citation}. ` +
      `${classification.scientificBasis.keyFinding}`,
  });

  qa.push({
    question: 'What is the liability assessment for this error?',
    answer:
      `The liability assessment is ${classification.liabilityAssessment.level}. ` +
      `${classification.liabilityAssessment.reasoning.split('.')[0]}.`,
  });

  if (classification.liabilityAssessment.mitigatingFactors.length > 0) {
    qa.push({
      question: 'What mitigating factors were identified?',
      answer: classification.liabilityAssessment.mitigatingFactors.join('. ') + '.',
    });
  }

  if (classification.liabilityAssessment.aggravatingFactors.length > 0) {
    qa.push({
      question: 'What aggravating factors were identified?',
      answer: classification.liabilityAssessment.aggravatingFactors.join('. ') + '.',
    });
  }

  return qa;
}
