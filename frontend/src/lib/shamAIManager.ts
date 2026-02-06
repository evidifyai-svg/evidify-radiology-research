/**
 * shamAIManager.ts
 *
 * Sham AI Manager for automation bias research studies.
 * Implements the "sham AI" methodology (Dratsch et al., Radiology 2023;
 * Bernstein et al., European Radiology 2023) by injecting deliberately
 * incorrect AI suggestions at controlled rates to measure how often
 * radiologists follow incorrect AI advice.
 *
 * This module is research-only and must never be used in clinical workflows.
 */

// ============================================================================
// Types
// ============================================================================

export type ShamType = 'FALSE_POSITIVE' | 'FALSE_NEGATIVE' | 'CORRECT';

export interface ShamAICase {
  caseId: string;
  groundTruth: 'NORMAL' | 'ABNORMAL';
  shamAIRecommendation: 'NORMAL' | 'ABNORMAL';
  shamType: ShamType;
  /** False finding description for FALSE_POSITIVE cases */
  shamFinding?: string;
  /** Manipulated confidence value */
  shamConfidence?: number;
}

export interface ShamAIManifest {
  studyId: string;
  description: string;
  totalCases: number;
  shamCaseCount: number;
  shamDistribution: {
    falsePositives: number;
    falseNegatives: number;
  };
  /** Target AUC for the sham AI system, e.g. 0.87 to match Bernstein */
  targetAUC: number;
  cases: ShamAICase[];
}

export interface ShamAIEventLog {
  caseId: string;
  shamType: ShamType;
  shamAIDisplayed: boolean;
  radiologistAssessment: 'NORMAL' | 'ABNORMAL';
  /** Did the radiologist match the sham recommendation? */
  followedShamAI: boolean;
  timestamp: string;
}

/** Shape returned to the reading flow when retrieving sham AI output */
export interface ShamAIRecommendation {
  recommendation: 'NORMAL' | 'ABNORMAL';
  finding?: string;
  confidence: number;
}

// ============================================================================
// Manager
// ============================================================================

export class ShamAIManager {
  private manifest: ShamAIManifest | null = null;
  private shamCaseMap: Map<string, ShamAICase> = new Map();
  private eventLog: ShamAIEventLog[] = [];

  // --------------------------------------------------------------------------
  // Manifest lifecycle
  // --------------------------------------------------------------------------

  loadManifest(manifest: ShamAIManifest): void {
    this.manifest = manifest;
    this.shamCaseMap.clear();
    this.eventLog = [];
    manifest.cases.forEach((c) => this.shamCaseMap.set(c.caseId, c));
  }

  unloadManifest(): void {
    this.manifest = null;
    this.shamCaseMap.clear();
    this.eventLog = [];
  }

  isActive(): boolean {
    return this.manifest !== null;
  }

  getManifest(): ShamAIManifest | null {
    return this.manifest;
  }

  // --------------------------------------------------------------------------
  // Case queries
  // --------------------------------------------------------------------------

  /** Returns true if the case exists in the manifest AND is a sham (not CORRECT). */
  isShamCase(caseId: string): boolean {
    const shamCase = this.shamCaseMap.get(caseId);
    return shamCase !== undefined && shamCase.shamType !== 'CORRECT';
  }

  /** Returns true if the case exists in the manifest at all. */
  hasCaseInManifest(caseId: string): boolean {
    return this.shamCaseMap.has(caseId);
  }

  getShamType(caseId: string): ShamType | null {
    return this.shamCaseMap.get(caseId)?.shamType ?? null;
  }

  /**
   * Retrieve the sham AI recommendation for a case.
   * Returns null if the case is not in the manifest.
   */
  getShamAIRecommendation(caseId: string): ShamAIRecommendation | null {
    const shamCase = this.shamCaseMap.get(caseId);
    if (!shamCase) return null;

    return {
      recommendation: shamCase.shamAIRecommendation,
      finding: shamCase.shamFinding,
      confidence: shamCase.shamConfidence ?? 85, // Default high confidence for sham
    };
  }

  // --------------------------------------------------------------------------
  // Interaction logging
  // --------------------------------------------------------------------------

  logShamInteraction(
    caseId: string,
    radiologistAssessment: 'NORMAL' | 'ABNORMAL',
  ): ShamAIEventLog {
    const shamCase = this.shamCaseMap.get(caseId);
    if (!shamCase) throw new Error(`Case ${caseId} not in sham manifest`);

    const entry: ShamAIEventLog = {
      caseId,
      shamType: shamCase.shamType,
      shamAIDisplayed: true,
      radiologistAssessment,
      followedShamAI: radiologistAssessment === shamCase.shamAIRecommendation,
      timestamp: new Date().toISOString(),
    };

    this.eventLog.push(entry);
    return entry;
  }

  getEventLog(): ShamAIEventLog[] {
    return [...this.eventLog];
  }

  // --------------------------------------------------------------------------
  // Summary / analytics
  // --------------------------------------------------------------------------

  getManifestSummary(): {
    totalCases: number;
    shamCases: number;
    falsePositives: number;
    falseNegatives: number;
    targetAUC: number;
  } | null {
    if (!this.manifest) return null;
    return {
      totalCases: this.manifest.totalCases,
      shamCases: this.manifest.shamCaseCount,
      falsePositives: this.manifest.shamDistribution.falsePositives,
      falseNegatives: this.manifest.shamDistribution.falseNegatives,
      targetAUC: this.manifest.targetAUC,
    };
  }

  /**
   * Compute automation bias metrics from logged interactions so far.
   * - compliance rate: proportion of sham cases where radiologist followed the sham AI
   * - falsePositiveCompliance: proportion of FALSE_POSITIVE sham cases followed
   * - falseNegativeCompliance: proportion of FALSE_NEGATIVE sham cases followed
   */
  computeAutomationBiasMetrics(): {
    totalShamDisplayed: number;
    shamFollowed: number;
    complianceRate: number;
    falsePositiveCompliance: number;
    falseNegativeCompliance: number;
  } | null {
    const shamEvents = this.eventLog.filter(
      (e) => e.shamType !== 'CORRECT',
    );
    if (shamEvents.length === 0) return null;

    const followed = shamEvents.filter((e) => e.followedShamAI);
    const fpEvents = shamEvents.filter((e) => e.shamType === 'FALSE_POSITIVE');
    const fnEvents = shamEvents.filter((e) => e.shamType === 'FALSE_NEGATIVE');
    const fpFollowed = fpEvents.filter((e) => e.followedShamAI);
    const fnFollowed = fnEvents.filter((e) => e.followedShamAI);

    return {
      totalShamDisplayed: shamEvents.length,
      shamFollowed: followed.length,
      complianceRate: followed.length / shamEvents.length,
      falsePositiveCompliance: fpEvents.length > 0
        ? fpFollowed.length / fpEvents.length
        : 0,
      falseNegativeCompliance: fnEvents.length > 0
        ? fnFollowed.length / fnEvents.length
        : 0,
    };
  }
}

/** Singleton instance for app-wide sham AI state */
export const shamAIManager = new ShamAIManager();
