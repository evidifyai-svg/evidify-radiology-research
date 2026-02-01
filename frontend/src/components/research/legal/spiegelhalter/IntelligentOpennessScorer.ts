/**
 * IntelligentOpennessScorer.ts
 *
 * Implementation of Spiegelhalter's AIUO (Accessible, Intelligible, Usable, Assessable)
 * framework for evaluating the quality of AI explanations.
 *
 * Research basis:
 * - Spiegelhalter (2020): "Should we trust algorithms?"
 * - Royal Society (2019): Explainable AI: the basics
 * - Upol Ehsan & Mark Riedl (2020): Human-centered explainable AI
 *
 * The four criteria:
 * 1. ACCESSIBLE: Was the explanation shown/available to the user?
 * 2. INTELLIGIBLE: Did the user understand it? (verified via comprehension check)
 * 3. USABLE: Did it inform/affect the decision?
 * 4. ASSESSABLE: Can the AI's reasoning be audited/verified?
 */

import type {
  IntelligentOpennessScore,
  AIDisclosure,
  ComprehensionCheck,
  DisclosureViewedPayload,
} from './disclosureTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface ScorerInput {
  /** The disclosure that was presented */
  disclosure: AIDisclosure;

  /** View tracking data */
  viewData?: DisclosureViewedPayload;

  /** Comprehension check results (if any) */
  comprehensionChecks?: ComprehensionCheck[];

  /** Decision timing data */
  decisionData?: {
    decisionMadeAfterDisclosure: boolean;
    timeFromDisclosureToDecisionMs: number;
    decisionChangedAfterDisclosure: boolean;
  };

  /** AI system metadata */
  aiSystemData?: {
    reasoningLogged: boolean;
    metricsSourceDocumented: boolean;
    modelVersionTracked: boolean;
    trainingDataDocumented: boolean;
  };
}

export interface ScorerConfig {
  /** Minimum view duration (ms) to count as "accessible" */
  minViewDurationMs: number;

  /** Whether comprehension check is required for "intelligible" */
  requireComprehensionCheck: boolean;

  /** Minimum time between disclosure and decision to count as "usable" */
  minDecisionDelayMs: number;

  /** Whether to require all AI system documentation for "assessable" */
  strictAssessability: boolean;
}

export const DEFAULT_SCORER_CONFIG: ScorerConfig = {
  minViewDurationMs: 3000, // 3 seconds minimum viewing
  requireComprehensionCheck: true,
  minDecisionDelayMs: 1000, // 1 second minimum between disclosure and decision
  strictAssessability: false,
};

// ============================================================================
// SCORER CLASS
// ============================================================================

export class IntelligentOpennessScorer {
  private config: ScorerConfig;

  constructor(config: Partial<ScorerConfig> = {}) {
    this.config = { ...DEFAULT_SCORER_CONFIG, ...config };
  }

  /**
   * Compute the Intelligent Openness score for a disclosure instance.
   */
  score(input: ScorerInput): IntelligentOpennessScore {
    const accessible = this.scoreAccessible(input);
    const intelligible = this.scoreIntelligible(input);
    const usable = this.scoreUsable(input);
    const assessable = this.scoreAssessable(input);

    const scores = [accessible, intelligible, usable, assessable];
    const totalScore = scores.filter(s => s.score).length;
    const meetsSpiegelhalterStandard = totalScore === 4;

    return {
      accessible,
      intelligible,
      usable,
      assessable,
      totalScore,
      meetsSpiegelhalterStandard,
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * ACCESSIBLE: Was the disclosure shown to the user for sufficient time?
   */
  private scoreAccessible(input: ScorerInput): IntelligentOpennessScore['accessible'] {
    const { viewData } = input;

    if (!viewData) {
      return {
        score: false,
        evidence: 'No view tracking data available',
        viewDurationMs: 0,
        wasDisplayed: false,
      };
    }

    const wasDisplayed = viewData.durationMs > 0;
    const sufficientDuration = viewData.durationMs >= this.config.minViewDurationMs;
    const score = wasDisplayed && sufficientDuration;

    let evidence: string;
    if (!wasDisplayed) {
      evidence = 'Disclosure was not displayed to user';
    } else if (!sufficientDuration) {
      evidence = `Disclosure was viewed for ${viewData.durationMs}ms (minimum: ${this.config.minViewDurationMs}ms)`;
    } else {
      evidence = `Disclosure was displayed for ${viewData.durationMs}ms (acknowledged: ${viewData.acknowledged})`;
    }

    return {
      score,
      evidence,
      viewDurationMs: viewData.durationMs,
      wasDisplayed,
    };
  }

  /**
   * INTELLIGIBLE: Did the user understand the disclosure?
   */
  private scoreIntelligible(input: ScorerInput): IntelligentOpennessScore['intelligible'] {
    const { comprehensionChecks } = input;

    if (!comprehensionChecks || comprehensionChecks.length === 0) {
      if (this.config.requireComprehensionCheck) {
        return {
          score: false,
          evidence: 'No comprehension check was administered',
          comprehensionCheckPassed: false,
          comprehensionAttempts: 0,
        };
      } else {
        return {
          score: true,
          evidence: 'Comprehension check not required; assumed intelligible',
          comprehensionCheckPassed: true,
          comprehensionAttempts: 0,
        };
      }
    }

    // Check if any comprehension check passed
    const passedChecks = comprehensionChecks.filter(c => c.isCorrect);
    const totalAttempts = comprehensionChecks.length;
    const passed = passedChecks.length > 0;

    let evidence: string;
    if (passed) {
      evidence = `Comprehension check passed (${passedChecks.length}/${totalAttempts} correct)`;
    } else {
      evidence = `Comprehension check failed after ${totalAttempts} attempts`;
    }

    return {
      score: passed,
      evidence,
      comprehensionCheckPassed: passed,
      comprehensionAttempts: totalAttempts,
    };
  }

  /**
   * USABLE: Did the disclosure inform the decision?
   */
  private scoreUsable(input: ScorerInput): IntelligentOpennessScore['usable'] {
    const { decisionData } = input;

    if (!decisionData) {
      return {
        score: false,
        evidence: 'No decision tracking data available',
        decisionMadeAfterDisclosure: false,
        timeFromDisclosureToDecisionMs: 0,
      };
    }

    const { decisionMadeAfterDisclosure, timeFromDisclosureToDecisionMs } = decisionData;

    if (!decisionMadeAfterDisclosure) {
      return {
        score: false,
        evidence: 'Decision was made before disclosure was presented',
        decisionMadeAfterDisclosure: false,
        timeFromDisclosureToDecisionMs: 0,
      };
    }

    const sufficientDelay = timeFromDisclosureToDecisionMs >= this.config.minDecisionDelayMs;
    const score = decisionMadeAfterDisclosure && sufficientDelay;

    let evidence: string;
    if (score) {
      evidence = `Decision made ${timeFromDisclosureToDecisionMs}ms after disclosure (changed: ${decisionData.decisionChangedAfterDisclosure})`;
    } else {
      evidence = `Decision made too quickly after disclosure (${timeFromDisclosureToDecisionMs}ms < ${this.config.minDecisionDelayMs}ms minimum)`;
    }

    return {
      score,
      evidence,
      decisionMadeAfterDisclosure,
      timeFromDisclosureToDecisionMs,
    };
  }

  /**
   * ASSESSABLE: Can the AI's reasoning be audited?
   */
  private scoreAssessable(input: ScorerInput): IntelligentOpennessScore['assessable'] {
    const { aiSystemData, disclosure } = input;

    // Check if metrics are provided in the disclosure
    const hasMetrics = disclosure.metrics.confidence !== undefined &&
                       (disclosure.metrics.fdr !== undefined || disclosure.metrics.for !== undefined);

    if (!aiSystemData) {
      return {
        score: hasMetrics,
        evidence: hasMetrics
          ? 'AI metrics are documented in disclosure; no additional system data available'
          : 'No AI system documentation available',
        aiReasoningLogged: false,
        metricsSourceDocumented: hasMetrics,
      };
    }

    const { reasoningLogged, metricsSourceDocumented, modelVersionTracked, trainingDataDocumented } = aiSystemData;

    if (this.config.strictAssessability) {
      // Require all documentation
      const score = reasoningLogged && metricsSourceDocumented && modelVersionTracked && trainingDataDocumented;
      return {
        score,
        evidence: score
          ? 'Full AI system documentation available (reasoning, metrics source, model version, training data)'
          : 'Incomplete AI system documentation for strict assessability',
        aiReasoningLogged: reasoningLogged,
        metricsSourceDocumented,
      };
    }

    // Basic assessability: at least reasoning and metrics source
    const score = reasoningLogged && metricsSourceDocumented;
    let evidence: string;
    if (score) {
      evidence = 'AI reasoning logged and metrics source documented';
    } else if (reasoningLogged) {
      evidence = 'AI reasoning logged but metrics source not documented';
    } else if (metricsSourceDocumented) {
      evidence = 'Metrics source documented but AI reasoning not logged';
    } else {
      evidence = 'Neither AI reasoning nor metrics source documented';
    }

    return {
      score,
      evidence,
      aiReasoningLogged: reasoningLogged,
      metricsSourceDocumented,
    };
  }

  /**
   * Generate a summary report for the Intelligent Openness score.
   */
  generateReport(score: IntelligentOpennessScore): string {
    const lines: string[] = [
      '# Intelligent Openness Score Report',
      '',
      `Computed at: ${score.computedAt}`,
      `Total Score: ${score.totalScore}/4`,
      `Meets Spiegelhalter Standard: ${score.meetsSpiegelhalterStandard ? 'YES' : 'NO'}`,
      '',
      '## Criteria Breakdown',
      '',
      `### 1. Accessible (${score.accessible.score ? 'PASS' : 'FAIL'})`,
      `- Evidence: ${score.accessible.evidence}`,
      `- View Duration: ${score.accessible.viewDurationMs}ms`,
      `- Was Displayed: ${score.accessible.wasDisplayed}`,
      '',
      `### 2. Intelligible (${score.intelligible.score ? 'PASS' : 'FAIL'})`,
      `- Evidence: ${score.intelligible.evidence}`,
      `- Comprehension Passed: ${score.intelligible.comprehensionCheckPassed}`,
      `- Attempts: ${score.intelligible.comprehensionAttempts}`,
      '',
      `### 3. Usable (${score.usable.score ? 'PASS' : 'FAIL'})`,
      `- Evidence: ${score.usable.evidence}`,
      `- Decision After Disclosure: ${score.usable.decisionMadeAfterDisclosure}`,
      `- Time to Decision: ${score.usable.timeFromDisclosureToDecisionMs}ms`,
      '',
      `### 4. Assessable (${score.assessable.score ? 'PASS' : 'FAIL'})`,
      `- Evidence: ${score.assessable.evidence}`,
      `- AI Reasoning Logged: ${score.assessable.aiReasoningLogged}`,
      `- Metrics Source Documented: ${score.assessable.metricsSourceDocumented}`,
    ];

    return lines.join('\n');
  }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Quick score computation with default config.
 */
export function computeIntelligentOpenness(input: ScorerInput): IntelligentOpennessScore {
  const scorer = new IntelligentOpennessScorer();
  return scorer.score(input);
}

export default IntelligentOpennessScorer;
