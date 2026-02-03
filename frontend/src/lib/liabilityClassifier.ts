/**
 * liabilityClassifier.ts
 *
 * Liability Risk Classification based on Baird et al. 22-condition framework
 * For Brian Shepard (Tort Attorney)
 *
 * Classifies each case into liability risk categories based on:
 * - Initial assessment
 * - AI recommendation
 * - Final assessment
 * - Documentation quality
 */

import { DerivedMetrics } from './ExportPackZip';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type LiabilityRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface LiabilityClassification {
  level: LiabilityRiskLevel;
  color: string;
  bgColor: string;
  scenario: string;
  description: string;
  logic: string;
}

export interface CrossExamVulnerability {
  type: 'ATTACK' | 'DEFENSE';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  text: string;
  metric?: string;
}

export interface CrossExamAnalysis {
  vulnerabilities: CrossExamVulnerability[];
  defenseStrengths: CrossExamVulnerability[];
  overallRisk: 'HIGH' | 'MODERATE' | 'LOW';
  recommendedFocus: string;
}

export interface HashBlock {
  index: number;
  eventType: string;
  timestamp: string;
  hash: string;
  prevHash: string | null;
}

// ============================================================================
// LIABILITY RISK CLASSIFICATION
// ============================================================================

/**
 * Classify liability risk for a single case
 * Based on Baird et al. 22-condition liability study framework
 */
export function classifyLiabilityRisk(caseResult: DerivedMetrics): LiabilityClassification {
  const { initialBirads, finalBirads, aiBirads, deviationDocumented, deviationRationale } = caseResult;

  // Determine positive (actionable) vs negative (non-actionable) thresholds
  // BI-RADS 0,3,4,5 = actionable (positive findings)
  // BI-RADS 1,2 = non-actionable (negative/benign)
  const isPositive = (birads: number | null): boolean =>
    birads !== null && (birads === 0 || birads >= 3);

  const isNegative = (birads: number | null): boolean =>
    birads !== null && (birads === 1 || birads === 2);

  const initialPositive = isPositive(initialBirads);
  const initialNegative = isNegative(initialBirads);
  const aiPositive = isPositive(aiBirads);
  const aiNegative = isNegative(aiBirads);
  const finalPositive = isPositive(finalBirads);
  const finalNegative = isNegative(finalBirads);

  const changed = initialBirads !== finalBirads;
  const agreedWithAi = finalBirads === aiBirads;
  const hasDocumentation = deviationDocumented && deviationRationale && deviationRationale.length > 20;

  // CRITICAL RISK: Changed positive→negative after AI disagreed
  // The "crucified in court" scenario
  if (initialPositive && finalNegative && aiNegative && changed) {
    return {
      level: 'CRITICAL',
      color: '#dc2626',
      bgColor: '#7f1d1d',
      scenario: 'Downgraded Finding After AI',
      description: 'Changed from actionable to non-actionable after AI suggested benign',
      logic: `Initial: BI-RADS ${initialBirads} (actionable) → AI: BI-RADS ${aiBirads} (benign) → Final: BI-RADS ${finalBirads} (benign)`,
    };
  }

  // HIGH RISK: Maintained negative despite AI positive, limited documentation
  if (initialNegative && finalNegative && aiPositive && !agreedWithAi && !hasDocumentation) {
    return {
      level: 'HIGH',
      color: '#f97316',
      bgColor: '#9a3412',
      scenario: 'AI Override Without Documentation',
      description: 'Maintained non-actionable assessment despite AI flagging finding, without adequate rationale',
      logic: `Initial: BI-RADS ${initialBirads} → AI: BI-RADS ${aiBirads} (flagged) → Final: BI-RADS ${finalBirads} (override without documentation)`,
    };
  }

  // MODERATE RISK: Changed negative→positive after AI flagged finding
  if (initialNegative && finalPositive && aiPositive && changed) {
    return {
      level: 'MODERATE',
      color: '#eab308',
      bgColor: '#854d0e',
      scenario: 'Upgraded After AI Detection',
      description: 'Changed to actionable after AI flagged finding - suggests AI dependency',
      logic: `Initial: BI-RADS ${initialBirads} (missed) → AI: BI-RADS ${aiBirads} (flagged) → Final: BI-RADS ${finalBirads} (corrected)`,
    };
  }

  // LOW RISK scenarios:
  // 1. AI agreed with final assessment
  // 2. Maintained positive finding despite AI negative (conservative)
  // 3. Changed with proper documentation
  if (agreedWithAi) {
    return {
      level: 'LOW',
      color: '#22c55e',
      bgColor: '#166534',
      scenario: 'AI Concordance',
      description: 'Final assessment agrees with AI recommendation',
      logic: `Initial: BI-RADS ${initialBirads} → AI: BI-RADS ${aiBirads} → Final: BI-RADS ${finalBirads} (concordant)`,
    };
  }

  if (initialPositive && finalPositive && aiNegative) {
    return {
      level: 'LOW',
      color: '#22c55e',
      bgColor: '#166534',
      scenario: 'Conservative Override',
      description: 'Maintained actionable finding despite AI suggesting benign - demonstrates clinical judgment',
      logic: `Initial: BI-RADS ${initialBirads} (actionable) → AI: BI-RADS ${aiBirads} (benign) → Final: BI-RADS ${finalBirads} (maintained)`,
    };
  }

  if (changed && hasDocumentation) {
    return {
      level: 'LOW',
      color: '#22c55e',
      bgColor: '#166534',
      scenario: 'Documented Change',
      description: 'Assessment changed with proper documentation',
      logic: `Initial: BI-RADS ${initialBirads} → AI: BI-RADS ${aiBirads} → Final: BI-RADS ${finalBirads} (documented rationale)`,
    };
  }

  // Default: MODERATE for unclear scenarios
  return {
    level: 'MODERATE',
    color: '#eab308',
    bgColor: '#854d0e',
    scenario: 'Requires Review',
    description: 'Case pattern requires individual review',
    logic: `Initial: BI-RADS ${initialBirads} → AI: BI-RADS ${aiBirads ?? 'N/A'} → Final: BI-RADS ${finalBirads}`,
  };
}

// ============================================================================
// CROSS-EXAMINATION ANALYSIS
// ============================================================================

/**
 * Analyze cross-examination vulnerabilities and defense strengths
 */
export function analyzeCrossExamination(
  caseResults: DerivedMetrics[],
  sessionMedianPreAiMs: number,
  verifierPassed: boolean,
  ledgerIntact: boolean
): CrossExamAnalysis {
  const vulnerabilities: CrossExamVulnerability[] = [];
  const defenseStrengths: CrossExamVulnerability[] = [];

  const nonCalibrationCases = caseResults.filter(r => !(r.caseId ?? '').includes('CALIB'));

  if (nonCalibrationCases.length === 0) {
    return {
      vulnerabilities: [],
      defenseStrengths: [],
      overallRisk: 'LOW',
      recommendedFocus: 'Complete session to generate analysis',
    };
  }

  // ============================================================================
  // VULNERABILITIES (Attack Vectors)
  // ============================================================================

  // 1. Fast pre-AI review times
  const fastReviews = nonCalibrationCases.filter(r => {
    const preAiTime = r.preAiReadMs ?? r.timeToLockMs ?? 0;
    return preAiTime < sessionMedianPreAiMs * 0.75;
  });

  if (fastReviews.length > 0) {
    const avgFast = Math.round(
      fastReviews.reduce((sum, r) => sum + (r.preAiReadMs ?? r.timeToLockMs ?? 0), 0) /
      fastReviews.length / 1000
    );
    const pctBelowMedian = Math.round(
      (1 - (fastReviews[0].preAiReadMs ?? fastReviews[0].timeToLockMs ?? 0) / sessionMedianPreAiMs) * 100
    );

    vulnerabilities.push({
      type: 'ATTACK',
      severity: fastReviews.length > 1 ? 'HIGH' : 'MEDIUM',
      text: `Pre-AI review time (${avgFast}s) was ${pctBelowMedian}% below session median - may be characterized as rushed`,
      metric: `${fastReviews.length}/${nonCalibrationCases.length} cases below threshold`,
    });
  }

  // 2. High AI agreement rate
  const changedToMatchAi = nonCalibrationCases.filter(r =>
    r.changeOccurred && r.finalBirads === r.aiBirads
  ).length;
  const changedCases = nonCalibrationCases.filter(r => r.changeOccurred).length;

  if (changedToMatchAi > 1) {
    vulnerabilities.push({
      type: 'ATTACK',
      severity: changedToMatchAi >= 3 ? 'HIGH' : 'MEDIUM',
      text: `Changed assessment after AI in ${changedToMatchAi} of ${nonCalibrationCases.length} cases - pattern of AI deference`,
      metric: `${Math.round((changedToMatchAi / nonCalibrationCases.length) * 100)}% AI-concordant changes`,
    });
  }

  // 3. Brief rationales
  const briefRationales = nonCalibrationCases.filter(r =>
    r.changeOccurred && r.deviationRationale && r.deviationRationale.length < 30
  );

  if (briefRationales.length > 0) {
    const avgLength = Math.round(
      briefRationales.reduce((sum, r) => sum + (r.deviationRationale?.length ?? 0), 0) /
      briefRationales.length
    );
    vulnerabilities.push({
      type: 'ATTACK',
      severity: 'MEDIUM',
      text: `Override rationale was brief (${avgLength} words) - may be challenged as insufficient`,
      metric: `${briefRationales.length} brief rationales`,
    });
  }

  // 4. Critical risk classifications
  const criticalCases = nonCalibrationCases.filter(r =>
    classifyLiabilityRisk(r).level === 'CRITICAL'
  );

  if (criticalCases.length > 0) {
    vulnerabilities.push({
      type: 'ATTACK',
      severity: 'HIGH',
      text: `${criticalCases.length} case(s) with critical risk pattern (downgraded actionable finding after AI)`,
      metric: criticalCases.map(c => c.caseId).join(', '),
    });
  }

  // ============================================================================
  // DEFENSE STRENGTHS
  // ============================================================================

  // 1. Independent first read (always present in HUMAN_FIRST)
  defenseStrengths.push({
    type: 'DEFENSE',
    severity: 'HIGH',
    text: 'Initial assessment was recorded before AI consultation - proves independent review',
    metric: 'Protocol: HUMAN_FIRST',
  });

  // 2. Hash chain integrity
  if (verifierPassed && ledgerIntact) {
    defenseStrengths.push({
      type: 'DEFENSE',
      severity: 'HIGH',
      text: 'Hash chain intact - tamper-evident audit trail verified',
      metric: 'Verification: PASS',
    });
  }

  // 3. Post-AI deliberation time
  const avgPostAiTime = nonCalibrationCases.reduce((sum, r) =>
    sum + (r.postAiReadMs ?? r.aiExposureMs ?? 0), 0
  ) / nonCalibrationCases.length;

  if (avgPostAiTime > 15000) {
    defenseStrengths.push({
      type: 'DEFENSE',
      severity: 'MEDIUM',
      text: `Time spent reconsidering after AI (${Math.round(avgPostAiTime / 1000)}s avg) shows due diligence`,
      metric: `Average: ${Math.round(avgPostAiTime / 1000)}s post-AI`,
    });
  }

  // 4. Documented deviations
  const documentedDeviations = nonCalibrationCases.filter(r =>
    r.changeOccurred && r.deviationDocumented && r.deviationRationale && r.deviationRationale.length >= 30
  ).length;

  if (documentedDeviations > 0 && documentedDeviations === changedCases) {
    defenseStrengths.push({
      type: 'DEFENSE',
      severity: 'MEDIUM',
      text: 'All assessment changes were documented with rationale',
      metric: `${documentedDeviations}/${changedCases} documented`,
    });
  }

  // 5. Conservative overrides
  const conservativeOverrides = nonCalibrationCases.filter(r => {
    const classification = classifyLiabilityRisk(r);
    return classification.scenario === 'Conservative Override';
  }).length;

  if (conservativeOverrides > 0) {
    defenseStrengths.push({
      type: 'DEFENSE',
      severity: 'MEDIUM',
      text: `Maintained actionable findings despite AI suggesting benign in ${conservativeOverrides} case(s) - demonstrates clinical judgment`,
      metric: `${conservativeOverrides} conservative override(s)`,
    });
  }

  // Determine overall risk
  const highVulnerabilities = vulnerabilities.filter(v => v.severity === 'HIGH').length;
  const highDefenses = defenseStrengths.filter(d => d.severity === 'HIGH').length;

  let overallRisk: 'HIGH' | 'MODERATE' | 'LOW';
  let recommendedFocus: string;

  if (highVulnerabilities >= 2 && highDefenses < 2) {
    overallRisk = 'HIGH';
    recommendedFocus = 'Focus on documenting clinical reasoning and review time adequacy';
  } else if (highVulnerabilities >= 1 || vulnerabilities.length > 2) {
    overallRisk = 'MODERATE';
    recommendedFocus = 'Emphasize independent judgment and tamper-evident documentation';
  } else {
    overallRisk = 'LOW';
    recommendedFocus = 'Strong defensible position - maintain documentation quality';
  }

  return {
    vulnerabilities,
    defenseStrengths,
    overallRisk,
    recommendedFocus,
  };
}

// ============================================================================
// HASH CHAIN VISUALIZATION DATA
// ============================================================================

/**
 * Generate hash chain visualization data from ledger
 */
export function generateHashChainBlocks(
  ledger: any[],
  maxBlocks: number = 4
): HashBlock[] {
  if (!ledger || ledger.length === 0) {
    return [];
  }

  // Select key events for visualization
  const keyEventTypes = [
    'SESSION_STARTED',
    'FIRST_IMPRESSION_LOCKED',
    'AI_REVEALED',
    'FINAL_ASSESSMENT',
    'CASE_COMPLETED',
  ];

  const keyEvents = ledger.filter(e =>
    keyEventTypes.includes(e.type)
  ).slice(0, maxBlocks);

  // If not enough key events, fill with any events
  const allEvents = keyEvents.length >= maxBlocks
    ? keyEvents
    : [...keyEvents, ...ledger.filter(e =>
        !keyEventTypes.includes(e.type)
      )].slice(0, maxBlocks);

  return allEvents.map((event, index) => ({
    index,
    eventType: event.type,
    timestamp: event.timestamp,
    hash: event.eventHash || event.hash || 'pending...',
    prevHash: index > 0 ? allEvents[index - 1].eventHash || allEvents[index - 1].hash || null : null,
  }));
}

// ============================================================================
// SUMMARY STATISTICS
// ============================================================================

/**
 * Get liability summary statistics
 */
export function getLiabilitySummary(caseResults: DerivedMetrics[]): {
  low: number;
  moderate: number;
  high: number;
  critical: number;
  worstCase: LiabilityClassification | null;
} {
  const nonCalibrationCases = caseResults.filter(r => !(r.caseId ?? '').includes('CALIB'));

  if (nonCalibrationCases.length === 0) {
    return { low: 0, moderate: 0, high: 0, critical: 0, worstCase: null };
  }

  const classifications = nonCalibrationCases.map(classifyLiabilityRisk);

  const low = classifications.filter(c => c.level === 'LOW').length;
  const moderate = classifications.filter(c => c.level === 'MODERATE').length;
  const high = classifications.filter(c => c.level === 'HIGH').length;
  const critical = classifications.filter(c => c.level === 'CRITICAL').length;

  // Find worst case
  const worstCase = classifications.find(c => c.level === 'CRITICAL') ||
    classifications.find(c => c.level === 'HIGH') ||
    classifications.find(c => c.level === 'MODERATE') ||
    classifications[0];

  return { low, moderate, high, critical, worstCase };
}
