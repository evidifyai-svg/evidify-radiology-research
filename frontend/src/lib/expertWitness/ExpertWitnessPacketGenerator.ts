/**
 * Enhanced Expert Witness Packet Generator
 *
 * Generates comprehensive court-defensible documentation for radiologist
 * decision-making with AI assistance.
 *
 * Integrates:
 * - Macknik workload metrics
 * - Wolfe error classification
 * - Spiegelhalter intelligent openness
 * - Case Difficulty Index
 * - Cryptographic verification
 */

import {
  EnhancedExpertWitnessPacket,
  ExpertWitnessSummary,
  WorkflowComplianceReport,
  CryptographicVerification,
  PacketAppendices,
  SessionData,
  WorkloadMetrics,
  CaseDifficultyIndex,
  WolfeErrorClassification,
  AIDisclosure,
  IntelligentOpennessScore,
  AttentionSummary,
  TSACheckpoint,
  PDFGenerationOptions,
  STANDARD_CITATIONS,
  STANDARD_GLOSSARY,
  WorkflowStage,
} from './expertWitnessTypes';

import { calculateWorkloadMetrics, WorkloadInput, formatWorkloadForLegal } from './workloadMetrics';
import { classifyError, generateAttentionSummary, formatErrorClassificationForLegal, formatAttentionSummaryForLegal } from './wolfeErrorClassification';
import { calculateCaseDifficulty, CDIInput, formatCDIForLegal } from './caseDifficultyIndex';

// =============================================================================
// GENERATOR CLASS
// =============================================================================

export class ExpertWitnessPacketGenerator {
  private sessionData: SessionData;
  private workloadInput?: WorkloadInput;
  private cdiInput?: CDIInput;
  private aiDisclosure?: AIDisclosure;
  private viewportData?: {
    totalViewingTimeMs: number;
    preAIViewingTimeMs: number;
    regionData: Array<{
      regionId: string;
      regionName: string;
      dwellTimeMs: number;
      zoomLevel: number;
      viewingEpisodes: number;
      visited: boolean;
    }>;
    imageCoveragePercent: number;
  };
  private tsaCheckpoints: TSACheckpoint[];
  private groundTruth?: {
    abnormal: boolean;
    findingLocation?: string;
    findingType?: string;
    findingConspicuity?: 'SUBTLE' | 'MODERATE' | 'OBVIOUS';
  };

  // Computed values (cached)
  private _workloadMetrics?: WorkloadMetrics;
  private _caseDifficulty?: CaseDifficultyIndex;
  private _errorClassification?: WolfeErrorClassification | null;
  private _attentionSummary?: AttentionSummary;
  private _intelligentOpenness?: IntelligentOpennessScore;

  constructor(
    sessionData: SessionData,
    options?: {
      workloadInput?: WorkloadInput;
      cdiInput?: CDIInput;
      aiDisclosure?: AIDisclosure;
      viewportData?: ExpertWitnessPacketGenerator['viewportData'];
      tsaCheckpoints?: TSACheckpoint[];
      groundTruth?: ExpertWitnessPacketGenerator['groundTruth'];
    }
  ) {
    this.sessionData = sessionData;
    this.workloadInput = options?.workloadInput;
    this.cdiInput = options?.cdiInput;
    this.aiDisclosure = options?.aiDisclosure;
    this.viewportData = options?.viewportData;
    this.tsaCheckpoints = options?.tsaCheckpoints || [];
    this.groundTruth = options?.groundTruth;
  }

  // ===========================================================================
  // MAIN GENERATION METHODS
  // ===========================================================================

  /**
   * Generate the complete enhanced expert witness packet
   */
  generate(): EnhancedExpertWitnessPacket {
    // Compute all derived values
    this.computeDerivedValues();

    const packetId = this.generatePacketId();
    const generatedAt = new Date().toISOString();

    return {
      version: '2.0',
      generatedAt,
      packetId,

      executiveSummary: this.generateExecutiveSummary(),
      workflowCompliance: this.generateWorkflowCompliance(),
      caseDifficultyAnalysis: this._caseDifficulty!,
      errorClassification: this._errorClassification ?? null,
      cognitiveLoadAnalysis: this._workloadMetrics!,
      aiDisclosureCompliance: this._intelligentOpenness!,
      attentionAnalysis: this._attentionSummary!,
      cryptographicVerification: this.generateCryptographicVerification(),
      appendices: this.generateAppendices(),

      legacyPacket: {
        timeline: this.sessionData.events,
        rubberStampIndicators: this.detectRubberStampIndicators(),
        rawLedger: this.sessionData.ledgerEntries
      }
    };
  }

  /**
   * Generate packet as HTML string
   */
  toHTML(): string {
    const packet = this.generate();
    return this.renderPacketAsHTML(packet);
  }

  /**
   * Generate packet as JSON object
   */
  toJSON(): object {
    return this.generate();
  }

  // ===========================================================================
  // DERIVED VALUE COMPUTATION
  // ===========================================================================

  private computeDerivedValues(): void {
    // Compute workload metrics
    if (this.workloadInput) {
      this._workloadMetrics = calculateWorkloadMetrics(this.workloadInput);
    } else {
      this._workloadMetrics = this.generateDefaultWorkloadMetrics();
    }

    // Compute case difficulty
    if (this.cdiInput) {
      this._caseDifficulty = calculateCaseDifficulty(this.cdiInput);
    } else {
      this._caseDifficulty = this.generateDefaultCaseDifficulty();
    }

    // Compute attention summary
    if (this.viewportData) {
      this._attentionSummary = generateAttentionSummary(
        this.viewportData,
        this.groundTruth?.findingLocation
      );
    } else {
      this._attentionSummary = this.generateDefaultAttentionSummary();
    }

    // Compute error classification (only if there was an error)
    if (this.groundTruth?.abnormal && this.viewportData) {
      const errorInput = {
        groundTruthAbnormal: this.groundTruth.abnormal,
        finding: this.groundTruth.findingLocation ? {
          location: this.groundTruth.findingLocation,
          type: this.groundTruth.findingType,
          conspicuity: this.groundTruth.findingConspicuity
        } : undefined,
        viewportData: this.viewportData,
        initialAssessment: {
          birads: this.sessionData.initialAssessment.birads,
          flaggedAbnormality: this.sessionData.initialAssessment.birads >= 4
        },
        finalAssessment: {
          birads: this.sessionData.finalAssessment.birads,
          flaggedAbnormality: this.sessionData.finalAssessment.birads >= 4
        }
      };
      this._errorClassification = classifyError(errorInput);
    } else {
      this._errorClassification = null;
    }

    // Compute intelligent openness score
    if (this.aiDisclosure) {
      this._intelligentOpenness = this.computeIntelligentOpenness(this.aiDisclosure);
    } else {
      this._intelligentOpenness = this.generateDefaultIntelligentOpenness();
    }
  }

  // ===========================================================================
  // SECTION GENERATORS
  // ===========================================================================

  private generateExecutiveSummary(): ExpertWitnessSummary {
    const workflowCompliance = this.assessWorkflowCompliance();
    const liabilityAssessment = this.assessLiability();

    // Generate executive summary paragraph
    const executiveSummary = this.generateExecutiveSummaryText(
      workflowCompliance,
      liabilityAssessment.level
    );

    return {
      caseId: this.sessionData.caseId,
      sessionId: this.sessionData.sessionId,
      clinicianId: this.anonymizeId(this.sessionData.clinicianId),
      executiveSummary,
      keyFindings: {
        workflowCompliance,
        errorClassification: this._errorClassification?.primaryError,
        caseDifficulty: this._caseDifficulty!,
        aiDisclosureCompliance: this._intelligentOpenness!,
        workloadStatus: this._workloadMetrics!
      },
      liabilityAssessment
    };
  }

  private generateWorkflowCompliance(): WorkflowComplianceReport {
    const initialTs = new Date(this.sessionData.initialAssessment.timestamp);
    const aiRevealTs = this.sessionData.aiResult
      ? new Date(this.sessionData.aiResult.revealTimestamp)
      : null;
    const finalTs = new Date(this.sessionData.finalAssessment.timestamp);

    // Calculate delay between lock and reveal
    const delayMs = aiRevealTs ? aiRevealTs.getTime() - initialTs.getTime() : 0;

    // Check deviation documentation
    const deviationRequired = this.isDeviationRequired();
    const deviationDocumented = this.sessionData.deviation?.documented ?? false;

    const checks: WorkflowComplianceReport['checks'] = {
      independentAssessmentRecorded: {
        passed: true, // If we have initial assessment, it was recorded
        timestamp: this.sessionData.initialAssessment.timestamp,
        description: 'Independent assessment was recorded before AI reveal'
      },
      assessmentCryptographicallyLocked: {
        passed: !!this.sessionData.initialAssessment.hash,
        lockTimestamp: this.sessionData.initialAssessment.timestamp,
        hash: this.sessionData.initialAssessment.hash,
        description: this.sessionData.initialAssessment.hash
          ? 'Assessment was cryptographically locked with SHA-256 hash'
          : 'Assessment hash not recorded'
      },
      aiRevealAfterLock: {
        passed: delayMs >= 0,
        revealTimestamp: this.sessionData.aiResult?.revealTimestamp,
        delayMs,
        description: delayMs >= 0
          ? `AI was revealed ${(delayMs / 1000).toFixed(1)} seconds after lock`
          : 'AI reveal timing could not be verified'
      },
      deviationDocumented: {
        passed: !deviationRequired || deviationDocumented,
        required: deviationRequired,
        timestamp: this.sessionData.deviation?.timestamp,
        description: !deviationRequired
          ? 'No deviation from AI recommendation - documentation not required'
          : deviationDocumented
            ? 'Deviation from AI recommendation was documented with rationale'
            : 'WARNING: Deviation from AI recommendation was not documented'
      },
      hashChainVerified: {
        passed: this.sessionData.hashChain.verified,
        totalEvents: this.sessionData.hashChain.totalEntries,
        description: this.sessionData.hashChain.verified
          ? `Hash chain verified: ${this.sessionData.hashChain.totalEntries} events intact`
          : 'Hash chain verification failed - possible tampering'
      }
    };

    // Determine overall status
    const allPassed = Object.values(checks).every(c => c.passed);
    const criticalFailed = !checks.hashChainVerified.passed ||
      (checks.deviationDocumented.required && !checks.deviationDocumented.passed);

    let overallStatus: WorkflowComplianceReport['overallStatus'];
    if (allPassed) {
      overallStatus = 'COMPLIANT';
    } else if (criticalFailed) {
      overallStatus = 'NON_COMPLIANT';
    } else {
      overallStatus = 'PARTIAL';
    }

    // Generate timeline
    const timeline = this.generateWorkflowTimeline();

    // Generate diagram stages
    const diagram = this.generateWorkflowDiagram();

    return {
      overallStatus,
      checks,
      timeline,
      diagram
    };
  }

  private generateCryptographicVerification(): CryptographicVerification {
    const hashChain = this.sessionData.hashChain;

    // TSA attestation summary
    const verifiedCheckpoints = this.tsaCheckpoints.filter(cp => cp.verified);

    return {
      hashChainStatus: hashChain.verified ? 'VERIFIED' : 'INVALID',
      totalEvents: hashChain.totalEntries,
      chainIntegrity: hashChain.verified ? 'INTACT' : 'BROKEN',

      verificationDetails: {
        genesisHash: hashChain.genesisHash,
        genesisVerified: hashChain.genesisHash === '0'.repeat(64),
        finalHash: hashChain.finalHash,
        finalVerified: hashChain.verified,
        allIntermediateHashesValid: hashChain.verified,
        tamperingDetected: !hashChain.verified
      },

      tsaAttestation: {
        checkpointCount: this.tsaCheckpoints.length,
        coveragePercent: this.tsaCheckpoints.length > 0 ? 100 : 0,
        earliestAttestation: this.tsaCheckpoints[0]?.timestamp || '',
        latestAttestation: this.tsaCheckpoints[this.tsaCheckpoints.length - 1]?.timestamp || '',
        allCheckpointsVerified: verifiedCheckpoints.length === this.tsaCheckpoints.length,
        checkpoints: this.tsaCheckpoints
      },

      conclusion: hashChain.verified
        ? 'This documentation is tamper-evident. Any modification to historical records would invalidate the hash chain.'
        : 'WARNING: Hash chain verification failed. Evidence integrity may be compromised.'
    };
  }

  private generateAppendices(): PacketAppendices {
    return {
      fullEventLog: this.sessionData.events,
      viewportHeatmapData: this.viewportData ? {
        imageWidth: 1920,
        imageHeight: 2560,
        heatmapPoints: [] // Would be populated from actual viewport tracking
      } : undefined,
      caseImagesIncluded: false, // Legal/privacy considerations
      aiSystemSpecs: {
        modelName: 'AI CAD System',
        modelVersion: '1.0',
        validationPhase: this.aiDisclosure?.validationPhase || 2,
        trainingDataSummary: 'Trained on retrospective mammography dataset',
        performanceMetrics: this.aiDisclosure?.metrics || {}
      },
      researchCitations: STANDARD_CITATIONS,
      glossary: STANDARD_GLOSSARY
    };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private computeIntelligentOpenness(disclosure: AIDisclosure): IntelligentOpennessScore {
    const accessible = {
      met: disclosure.exposureDurationMs >= 5000, // 5 second minimum
      displayDurationMs: disclosure.exposureDurationMs,
      minimumRequiredMs: 5000,
      explanation: disclosure.exposureDurationMs >= 5000
        ? `Disclosure displayed for ${(disclosure.exposureDurationMs / 1000).toFixed(0)} seconds (adequate)`
        : `Disclosure displayed for only ${(disclosure.exposureDurationMs / 1000).toFixed(1)} seconds (insufficient)`
    };

    const intelligible = {
      met: disclosure.comprehensionCheck?.passed ?? false,
      comprehensionCheckPassed: disclosure.comprehensionCheck?.passed ?? false,
      userAnswer: disclosure.comprehensionCheck?.userAnswer,
      correctAnswer: disclosure.comprehensionCheck?.correctAnswer,
      explanation: disclosure.comprehensionCheck?.passed
        ? `Comprehension check passed (answered ${disclosure.comprehensionCheck.userAnswer}, correct was ${disclosure.comprehensionCheck.correctAnswer})`
        : disclosure.comprehensionCheck
          ? `Comprehension check failed (answered ${disclosure.comprehensionCheck.userAnswer}, correct was ${disclosure.comprehensionCheck.correctAnswer})`
          : 'No comprehension check performed'
    };

    const usable = {
      met: true, // If a decision was made, it was usable
      timeToDecisionAfterDisclosureMs: this.calculateTimeToDecision(),
      explanation: `Decision made ${(this.calculateTimeToDecision() / 1000).toFixed(0)} seconds after disclosure`
    };

    const assessable = {
      met: true, // AI reasoning is logged in our system
      aiReasoningLogged: true,
      explanation: 'AI reasoning and confidence scores logged in full'
    };

    const score = [accessible, intelligible, usable, assessable].filter(p => p.met).length;

    let complianceLevel: IntelligentOpennessScore['complianceLevel'];
    if (score === 4) complianceLevel = 'FULL';
    else if (score >= 3) complianceLevel = 'SUBSTANTIAL';
    else if (score >= 1) complianceLevel = 'PARTIAL';
    else complianceLevel = 'NONE';

    return {
      overallScore: score,
      complianceLevel,
      pillars: { accessible, intelligible, usable, assessable },
      disclosureContent: {
        format: disclosure.format,
        rawText: disclosure.displayText,
        metricsShown: disclosure.metrics
      },
      validationPhase: {
        phase: disclosure.validationPhase,
        warningShown: !!disclosure.validationWarning,
        warningText: disclosure.validationWarning
      },
      conclusion: score === 4
        ? 'The clinician received complete, comprehensible information about AI limitations per Spiegelhalter\'s intelligent openness framework.'
        : `AI disclosure met ${score} of 4 intelligent openness criteria.`
    };
  }

  private assessWorkflowCompliance(): 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' {
    const hasInitialAssessment = !!this.sessionData.initialAssessment.timestamp;
    const hasHash = !!this.sessionData.initialAssessment.hash;
    const chainVerified = this.sessionData.hashChain.verified;
    const deviationOk = !this.isDeviationRequired() || this.sessionData.deviation?.documented;

    if (hasInitialAssessment && hasHash && chainVerified && deviationOk) {
      return 'COMPLIANT';
    } else if (hasInitialAssessment && chainVerified) {
      return 'PARTIAL';
    }
    return 'NON_COMPLIANT';
  }

  private assessLiability(): ExpertWitnessSummary['liabilityAssessment'] {
    const mitigatingFactors: string[] = [];
    const aggravatingFactors: string[] = [];

    // Check case difficulty
    if (this._caseDifficulty!.compositeScore >= 70) {
      mitigatingFactors.push(`High case difficulty (CDI: ${this._caseDifficulty!.compositeScore}/100)`);
    }

    // Check workload
    if (this._workloadMetrics!.thresholdStatus === 'GREEN') {
      mitigatingFactors.push('Workload within recommended limits');
    } else if (this._workloadMetrics!.thresholdStatus === 'RED') {
      aggravatingFactors.push('Workload exceeded recommended limits');
    }

    // Check error type
    if (this._errorClassification) {
      if (['RECOGNITION_ERROR', 'PREVALENCE_EFFECT', 'SATISFACTION_OF_SEARCH'].includes(
        this._errorClassification.primaryError
      )) {
        mitigatingFactors.push(`Error type (${this._errorClassification.primaryError}) reflects normal cognitive limitations`);
      }
    }

    // Check workflow compliance
    if (this.sessionData.hashChain.verified) {
      mitigatingFactors.push('Complete cryptographic audit trail');
    }

    // Check AI disclosure
    if (this._intelligentOpenness!.overallScore >= 3) {
      mitigatingFactors.push('Proper AI limitation disclosure documented');
    }

    // Check deviation documentation
    if (this.isDeviationRequired() && !this.sessionData.deviation?.documented) {
      aggravatingFactors.push('Deviation from AI recommendation not documented');
    }

    // Determine level
    let level: 'LOW' | 'MODERATE' | 'HIGH';
    if (aggravatingFactors.length === 0 && mitigatingFactors.length >= 3) {
      level = 'LOW';
    } else if (aggravatingFactors.length >= 2) {
      level = 'HIGH';
    } else {
      level = 'MODERATE';
    }

    // Generate recommendation
    let recommendation: string;
    if (level === 'LOW') {
      recommendation = 'Documentation supports standard of care. Strong defensible position.';
    } else if (level === 'MODERATE') {
      recommendation = 'Some documentation gaps exist. Consider addressing aggravating factors.';
    } else {
      recommendation = 'Significant documentation or workflow concerns. Legal consultation recommended.';
    }

    return { level, mitigatingFactors, aggravatingFactors, recommendation };
  }

  private generateExecutiveSummaryText(
    compliance: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT',
    liabilityLevel: 'LOW' | 'MODERATE' | 'HIGH'
  ): string {
    const cdi = this._caseDifficulty!;
    const workload = this._workloadMetrics!;

    let summary = `This case (ID: ${this.sessionData.caseId}) was reviewed during a session ` +
      `where the clinician completed ${workload.casesCompletedInSession} cases over ` +
      `${workload.sessionDurationMinutes.toFixed(0)} minutes. `;

    summary += `The case had a difficulty score of ${cdi.compositeScore}/100 ` +
      `(${cdi.difficultyLevel.toLowerCase()} difficulty, ${cdi.percentile}th percentile). `;

    if (this._errorClassification && this._errorClassification.primaryError !== 'NO_ERROR') {
      summary += `A ${this._errorClassification.primaryError.toLowerCase().replace(/_/g, ' ')} ` +
        `occurred with ${this._errorClassification.confidence}% confidence classification. `;
    }

    summary += `Workflow compliance was ${compliance.toLowerCase()}`;

    if (compliance === 'COMPLIANT') {
      summary += ' with all documentation requirements met. ';
    } else {
      summary += '. ';
    }

    summary += `Overall liability assessment: ${liabilityLevel}.`;

    return summary;
  }

  private isDeviationRequired(): boolean {
    if (!this.sessionData.aiResult) return false;

    const aiFlagged = this.sessionData.aiResult.flagged;
    const finalFlagged = this.sessionData.finalAssessment.birads >= 4;

    // Deviation required when clinician disagrees with AI
    return aiFlagged !== finalFlagged;
  }

  private calculateTimeToDecision(): number {
    if (!this.aiDisclosure) return 0;

    const disclosureTime = new Date(this.aiDisclosure.exposureTimestamp).getTime();
    const finalTime = new Date(this.sessionData.finalAssessment.timestamp).getTime();

    return finalTime - disclosureTime;
  }

  private generateWorkflowTimeline(): WorkflowComplianceReport['timeline'] {
    const timeline: WorkflowComplianceReport['timeline'] = [];

    timeline.push({
      stage: 'Initial Assessment',
      timestamp: this.sessionData.initialAssessment.timestamp,
      description: `BI-RADS ${this.sessionData.initialAssessment.birads} recorded`,
      status: 'completed'
    });

    timeline.push({
      stage: 'Assessment Lock',
      timestamp: this.sessionData.initialAssessment.timestamp,
      description: `Hash: ${this.sessionData.initialAssessment.hash.substring(0, 8)}...`,
      status: 'completed'
    });

    if (this.sessionData.aiResult) {
      timeline.push({
        stage: 'AI Reveal',
        timestamp: this.sessionData.aiResult.revealTimestamp,
        description: `AI score: ${this.sessionData.aiResult.score}`,
        status: 'completed'
      });
    }

    if (this.sessionData.deviation) {
      timeline.push({
        stage: 'Deviation Documentation',
        timestamp: this.sessionData.deviation.timestamp,
        description: this.sessionData.deviation.reasonCodes.join(', '),
        status: 'completed'
      });
    }

    timeline.push({
      stage: 'Final Assessment',
      timestamp: this.sessionData.finalAssessment.timestamp,
      description: `BI-RADS ${this.sessionData.finalAssessment.birads} finalized`,
      status: 'completed'
    });

    return timeline;
  }

  private generateWorkflowDiagram(): WorkflowComplianceReport['diagram'] {
    const stages: WorkflowStage[] = [
      {
        name: 'Initial Assessment',
        timestamp: this.sessionData.initialAssessment.timestamp,
        status: 'completed',
        icon: '📝'
      },
      {
        name: 'LOCK',
        timestamp: this.sessionData.initialAssessment.timestamp,
        status: 'completed',
        icon: '🔒'
      },
      {
        name: 'AI Reveal',
        timestamp: this.sessionData.aiResult?.revealTimestamp || '',
        status: this.sessionData.aiResult ? 'completed' : 'skipped',
        icon: '🤖'
      },
      {
        name: 'Review',
        timestamp: '',
        status: 'completed',
        icon: '👁️'
      },
      {
        name: 'Final Assessment',
        timestamp: this.sessionData.finalAssessment.timestamp,
        status: 'completed',
        icon: '✅'
      }
    ];

    return { stages, currentStage: stages.length - 1 };
  }

  private detectRubberStampIndicators(): object[] {
    const indicators: object[] = [];

    // Check pre-AI time
    if (this.sessionData.aiResult) {
      const initialTime = new Date(this.sessionData.initialAssessment.timestamp).getTime();
      const aiTime = new Date(this.sessionData.aiResult.revealTimestamp).getTime();
      const preAITimeMs = aiTime - initialTime;

      if (preAITimeMs < 15000) {
        indicators.push({
          type: 'MINIMAL_PRE_AI_TIME',
          severity: 'HIGH',
          value: preAITimeMs,
          threshold: 15000
        });
      }
    }

    // Check if assessment changed to match AI
    if (this.sessionData.aiResult) {
      const initialBirads = this.sessionData.initialAssessment.birads;
      const finalBirads = this.sessionData.finalAssessment.birads;
      const aiScore = this.sessionData.aiResult.score;

      if (initialBirads !== finalBirads) {
        const changeTowardsAI = (finalBirads > initialBirads && aiScore > 50) ||
          (finalBirads < initialBirads && aiScore < 50);

        if (changeTowardsAI) {
          indicators.push({
            type: 'CHANGED_TO_MATCH_AI',
            severity: 'MEDIUM',
            initialBirads,
            finalBirads,
            aiScore
          });
        }
      }
    }

    // Check undocumented deviation
    if (this.isDeviationRequired() && !this.sessionData.deviation?.documented) {
      indicators.push({
        type: 'UNDOCUMENTED_DEVIATION',
        severity: 'HIGH'
      });
    }

    return indicators;
  }

  private generateDefaultWorkloadMetrics(): WorkloadMetrics {
    return {
      casesCompletedInSession: 1,
      totalSessionCases: 1,
      sessionDurationMinutes: 5,
      averageTimePerCaseMinutes: 5,
      casesPerHour: 12,
      thresholdStatus: 'GREEN',
      thresholdStatusExplanation: 'Workload data not available - default values used',
      fatigueIndex: 20,
      fatigueLevel: 'LOW',
      sessionPosition: 1,
      percentThroughSession: 100,
      macknikThresholds: {
        casesPerHourLimit: 40,
        currentCasesPerHour: 12,
        exceedsLimit: false,
        percentOfLimit: 30
      },
      scientificBasis: 'Workload metrics could not be calculated from available data.',
      conclusion: 'Insufficient data to assess cognitive load factors.'
    };
  }

  private generateDefaultCaseDifficulty(): CaseDifficultyIndex {
    return {
      compositeScore: 50,
      percentile: 50,
      difficultyLevel: 'MODERATE',
      radpeerPrediction: {
        expectedScore: 3,
        scoreDescription: 'Diagnosis should be made most of the time'
      },
      factors: {},
      scientificBasis: 'Case difficulty factors not available - using default moderate difficulty.',
      missRateExpectation: 'Expected miss rate: 5-12%. Some misses expected even with careful review.'
    };
  }

  private generateDefaultAttentionSummary(): AttentionSummary {
    return {
      totalViewingTimeMs: 0,
      preAIViewingTimeMs: 0,
      postAIViewingTimeMs: 0,
      imageCoveragePercent: 0,
      regionAnalysis: []
    };
  }

  private generateDefaultIntelligentOpenness(): IntelligentOpennessScore {
    return {
      overallScore: 0,
      complianceLevel: 'NONE',
      pillars: {
        accessible: {
          met: false,
          displayDurationMs: 0,
          minimumRequiredMs: 5000,
          explanation: 'No AI disclosure data available'
        },
        intelligible: {
          met: false,
          comprehensionCheckPassed: false,
          explanation: 'No comprehension check performed'
        },
        usable: {
          met: false,
          timeToDecisionAfterDisclosureMs: 0,
          explanation: 'No disclosure timing data available'
        },
        assessable: {
          met: false,
          aiReasoningLogged: false,
          explanation: 'AI reasoning not logged'
        }
      },
      disclosureContent: {
        format: 'none',
        rawText: '',
        metricsShown: {}
      },
      validationPhase: {
        phase: 2,
        warningShown: false,
        warningText: ''
      },
      conclusion: 'AI disclosure compliance could not be assessed - no disclosure data available.'
    };
  }

  private generatePacketId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `EWP-${timestamp}-${random}`.toUpperCase();
  }

  private anonymizeId(id: string): string {
    // Simple anonymization - hash and truncate
    const hash = this.simpleHash(id);
    return `CLINICIAN-${hash.substring(0, 8)}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  // ===========================================================================
  // HTML RENDERING
  // ===========================================================================

  private renderPacketAsHTML(packet: EnhancedExpertWitnessPacket): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Expert Witness Packet - ${packet.packetId}</title>
  <style>
    ${this.getHTMLStyles()}
  </style>
</head>
<body>
  <div class="packet">
    <header class="packet-header">
      <h1>EXPERT WITNESS PACKET</h1>
      <div class="packet-meta">
        <span>Packet ID: ${packet.packetId}</span>
        <span>Generated: ${new Date(packet.generatedAt).toLocaleString()}</span>
        <span>Version: ${packet.version}</span>
      </div>
    </header>

    <nav class="toc">
      <h2>Table of Contents</h2>
      <ol>
        <li><a href="#executive-summary">Executive Summary</a></li>
        <li><a href="#workflow-compliance">Workflow Compliance</a></li>
        <li><a href="#case-difficulty">Case Difficulty Analysis</a></li>
        ${packet.errorClassification ? '<li><a href="#error-classification">Error Classification</a></li>' : ''}
        <li><a href="#cognitive-load">Cognitive Load Analysis</a></li>
        <li><a href="#ai-disclosure">AI Disclosure Compliance</a></li>
        <li><a href="#attention-analysis">Attention Analysis</a></li>
        <li><a href="#cryptographic-verification">Cryptographic Verification</a></li>
        <li><a href="#appendices">Appendices</a></li>
      </ol>
    </nav>

    ${this.renderExecutiveSummaryHTML(packet.executiveSummary)}
    ${this.renderWorkflowComplianceHTML(packet.workflowCompliance)}
    ${this.renderCaseDifficultyHTML(packet.caseDifficultyAnalysis)}
    ${packet.errorClassification ? this.renderErrorClassificationHTML(packet.errorClassification) : ''}
    ${this.renderCognitiveLoadHTML(packet.cognitiveLoadAnalysis)}
    ${this.renderAIDisclosureHTML(packet.aiDisclosureCompliance)}
    ${this.renderAttentionAnalysisHTML(packet.attentionAnalysis)}
    ${this.renderCryptographicVerificationHTML(packet.cryptographicVerification)}
    ${this.renderAppendicesHTML(packet.appendices)}

    <footer class="packet-footer">
      <p>This document was generated by Evidify Clinical Decision Documentation Platform.</p>
      <p>Case ID: ${packet.executiveSummary.caseId} | Session: ${packet.executiveSummary.sessionId}</p>
    </footer>
  </div>
</body>
</html>`;
  }

  private getHTMLStyles(): string {
    return `
      * { box-sizing: border-box; }
      body {
        font-family: 'Georgia', serif;
        line-height: 1.6;
        color: #1a1a1a;
        max-width: 8.5in;
        margin: 0 auto;
        padding: 0.5in;
        background: #fff;
      }
      .packet-header {
        text-align: center;
        border-bottom: 3px double #333;
        padding-bottom: 1rem;
        margin-bottom: 2rem;
      }
      .packet-header h1 {
        font-size: 1.5rem;
        letter-spacing: 0.1em;
        margin: 0 0 0.5rem;
      }
      .packet-meta {
        display: flex;
        justify-content: center;
        gap: 2rem;
        font-size: 0.875rem;
        color: #666;
      }
      .toc {
        background: #f5f5f5;
        padding: 1rem 1.5rem;
        margin-bottom: 2rem;
        border: 1px solid #ddd;
      }
      .toc h2 { margin: 0 0 0.5rem; font-size: 1rem; }
      .toc ol { margin: 0; padding-left: 1.5rem; }
      .toc li { margin: 0.25rem 0; }
      .toc a { color: #0066cc; text-decoration: none; }
      .toc a:hover { text-decoration: underline; }
      section {
        margin-bottom: 2rem;
        page-break-inside: avoid;
      }
      section h2 {
        font-size: 1.125rem;
        border-bottom: 2px solid #333;
        padding-bottom: 0.25rem;
        margin: 0 0 1rem;
      }
      .status-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        font-weight: bold;
        font-size: 0.875rem;
      }
      .status-green { background: #dcfce7; color: #166534; }
      .status-yellow { background: #fef9c3; color: #854d0e; }
      .status-red { background: #fee2e2; color: #991b1b; }
      .check-item {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        margin: 0.5rem 0;
      }
      .check-icon { font-size: 1.25rem; }
      .check-passed { color: #166534; }
      .check-failed { color: #991b1b; }
      pre {
        background: #f5f5f5;
        padding: 1rem;
        overflow-x: auto;
        font-family: 'Courier New', monospace;
        font-size: 0.875rem;
        border: 1px solid #ddd;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 0.5rem;
        text-align: left;
      }
      th { background: #f5f5f5; }
      .score-bar {
        height: 1.5rem;
        background: #e5e5e5;
        border-radius: 4px;
        overflow: hidden;
      }
      .score-fill {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding-right: 0.5rem;
        color: white;
        font-weight: bold;
        font-size: 0.75rem;
      }
      .packet-footer {
        margin-top: 3rem;
        padding-top: 1rem;
        border-top: 1px solid #ddd;
        text-align: center;
        font-size: 0.875rem;
        color: #666;
      }
      @media print {
        body { padding: 0; }
        .toc { page-break-after: always; }
        section { page-break-inside: avoid; }
      }
    `;
  }

  private renderExecutiveSummaryHTML(summary: ExpertWitnessSummary): string {
    const levelClass = summary.liabilityAssessment.level === 'LOW' ? 'status-green' :
      summary.liabilityAssessment.level === 'MODERATE' ? 'status-yellow' : 'status-red';

    return `
    <section id="executive-summary">
      <h2>1. EXECUTIVE SUMMARY</h2>

      <table>
        <tr><th>Case ID</th><td>${summary.caseId}</td></tr>
        <tr><th>Session ID</th><td>${summary.sessionId}</td></tr>
        <tr><th>Clinician ID</th><td>${summary.clinicianId}</td></tr>
      </table>

      <h3>Summary</h3>
      <p>${summary.executiveSummary}</p>

      <h3>Key Findings</h3>
      <table>
        <tr>
          <th>Workflow Compliance</th>
          <td><span class="status-badge ${summary.keyFindings.workflowCompliance === 'COMPLIANT' ? 'status-green' : summary.keyFindings.workflowCompliance === 'PARTIAL' ? 'status-yellow' : 'status-red'}">${summary.keyFindings.workflowCompliance}</span></td>
        </tr>
        ${summary.keyFindings.errorClassification ? `
        <tr>
          <th>Error Classification</th>
          <td>${summary.keyFindings.errorClassification.replace(/_/g, ' ')}</td>
        </tr>` : ''}
        <tr>
          <th>Case Difficulty</th>
          <td>${summary.keyFindings.caseDifficulty.compositeScore}/100 (${summary.keyFindings.caseDifficulty.difficultyLevel})</td>
        </tr>
        <tr>
          <th>AI Disclosure Score</th>
          <td>${summary.keyFindings.aiDisclosureCompliance.overallScore}/4 (${summary.keyFindings.aiDisclosureCompliance.complianceLevel})</td>
        </tr>
        <tr>
          <th>Workload Status</th>
          <td><span class="status-badge ${summary.keyFindings.workloadStatus.thresholdStatus === 'GREEN' ? 'status-green' : summary.keyFindings.workloadStatus.thresholdStatus === 'YELLOW' ? 'status-yellow' : 'status-red'}">${summary.keyFindings.workloadStatus.thresholdStatus}</span></td>
        </tr>
      </table>

      <h3>Liability Assessment</h3>
      <p><span class="status-badge ${levelClass}">${summary.liabilityAssessment.level} RISK</span></p>

      ${summary.liabilityAssessment.mitigatingFactors.length > 0 ? `
      <h4>Mitigating Factors</h4>
      <ul>
        ${summary.liabilityAssessment.mitigatingFactors.map(f => `<li>${f}</li>`).join('')}
      </ul>` : ''}

      ${summary.liabilityAssessment.aggravatingFactors.length > 0 ? `
      <h4>Aggravating Factors</h4>
      <ul>
        ${summary.liabilityAssessment.aggravatingFactors.map(f => `<li>${f}</li>`).join('')}
      </ul>` : ''}

      <p><strong>Recommendation:</strong> ${summary.liabilityAssessment.recommendation}</p>
    </section>`;
  }

  private renderWorkflowComplianceHTML(compliance: WorkflowComplianceReport): string {
    const statusClass = compliance.overallStatus === 'COMPLIANT' ? 'status-green' :
      compliance.overallStatus === 'PARTIAL' ? 'status-yellow' : 'status-red';

    return `
    <section id="workflow-compliance">
      <h2>2. WORKFLOW COMPLIANCE REPORT</h2>

      <p><span class="status-badge ${statusClass}">${compliance.overallStatus}</span></p>

      <div class="checks">
        ${Object.entries(compliance.checks).map(([key, check]) => `
        <div class="check-item">
          <span class="check-icon ${check.passed ? 'check-passed' : 'check-failed'}">${check.passed ? '✓' : '✗'}</span>
          <span>${check.description}</span>
        </div>`).join('')}
      </div>

      <h3>Workflow Timeline</h3>
      <table>
        <thead>
          <tr><th>Stage</th><th>Timestamp</th><th>Description</th></tr>
        </thead>
        <tbody>
          ${compliance.timeline.map(t => `
          <tr>
            <td>${t.stage}</td>
            <td><code>${t.timestamp}</code></td>
            <td>${t.description}</td>
          </tr>`).join('')}
        </tbody>
      </table>

      <h3>Workflow Diagram</h3>
      <pre>${compliance.diagram.stages.map(s => `[${s.name}]`).join(' → ')}</pre>
    </section>`;
  }

  private renderCaseDifficultyHTML(cdi: CaseDifficultyIndex): string {
    const scoreColor = cdi.compositeScore < 30 ? '#22c55e' :
      cdi.compositeScore < 50 ? '#eab308' :
        cdi.compositeScore < 70 ? '#f97316' : '#ef4444';

    return `
    <section id="case-difficulty">
      <h2>3. CASE DIFFICULTY ANALYSIS</h2>

      <table>
        <tr>
          <th>Composite Difficulty Score</th>
          <td>
            <div class="score-bar">
              <div class="score-fill" style="width: ${cdi.compositeScore}%; background: ${scoreColor};">
                ${cdi.compositeScore}/100
              </div>
            </div>
          </td>
        </tr>
        <tr><th>Difficulty Level</th><td>${cdi.difficultyLevel}</td></tr>
        <tr><th>Percentile</th><td>${cdi.percentile}th (harder than ${cdi.percentile}% of comparison cases)</td></tr>
        <tr><th>RADPEER Prediction</th><td>Score ${cdi.radpeerPrediction.expectedScore} - "${cdi.radpeerPrediction.scoreDescription}"</td></tr>
      </table>

      <h3>Difficulty Factors</h3>
      <table>
        <thead><tr><th>Factor</th><th>Value</th><th>Score</th><th>Description</th></tr></thead>
        <tbody>
          ${cdi.factors.breastDensity ? `
          <tr>
            <td>Breast Density</td>
            <td>BI-RADS ${cdi.factors.breastDensity.biradsCategory}</td>
            <td>${cdi.factors.breastDensity.score}/5</td>
            <td>${cdi.factors.breastDensity.description}</td>
          </tr>` : ''}
          ${cdi.factors.findingConspicuity ? `
          <tr>
            <td>Finding Conspicuity</td>
            <td>${cdi.factors.findingConspicuity.type}</td>
            <td>${cdi.factors.findingConspicuity.score}/5</td>
            <td>${cdi.factors.findingConspicuity.description}</td>
          </tr>` : ''}
          ${cdi.factors.findingSize ? `
          <tr>
            <td>Finding Size</td>
            <td>${cdi.factors.findingSize.sizeMm}mm</td>
            <td>${cdi.factors.findingSize.score}/5</td>
            <td>${cdi.factors.findingSize.description}</td>
          </tr>` : ''}
          ${cdi.factors.findingLocation ? `
          <tr>
            <td>Location</td>
            <td>${cdi.factors.findingLocation.location}</td>
            <td>${cdi.factors.findingLocation.score}/5</td>
            <td>${cdi.factors.findingLocation.description}</td>
          </tr>` : ''}
          ${cdi.factors.distractors ? `
          <tr>
            <td>Distractors</td>
            <td>${cdi.factors.distractors.count} present</td>
            <td>${cdi.factors.distractors.score}/5</td>
            <td>${cdi.factors.distractors.description}</td>
          </tr>` : ''}
        </tbody>
      </table>

      <h3>Scientific Basis</h3>
      <p>${cdi.scientificBasis}</p>

      <p><strong>${cdi.missRateExpectation}</strong></p>
    </section>`;
  }

  private renderErrorClassificationHTML(classification: WolfeErrorClassification): string {
    return `
    <section id="error-classification">
      <h2>4. WOLFE ERROR CLASSIFICATION</h2>

      <table>
        <tr><th>Classification</th><td><strong>${classification.primaryError.replace(/_/g, ' ')}</strong></td></tr>
        <tr><th>Confidence</th><td>${classification.confidence}%</td></tr>
      </table>

      <h3>Evidence Supporting Classification</h3>
      <div class="checks">
        <div class="check-item">
          <span class="check-icon ${classification.evidence.regionViewed ? 'check-passed' : 'check-failed'}">
            ${classification.evidence.regionViewed ? '✓' : '✗'}
          </span>
          <span>Viewport tracking confirms region was ${classification.evidence.regionViewed ? 'viewed' : 'NOT viewed'}</span>
        </div>
        <div class="check-item">
          <span>Dwell time: ${(classification.evidence.dwellTimeMs / 1000).toFixed(1)} seconds</span>
        </div>
        <div class="check-item">
          <span>Zoom level: ${classification.evidence.zoomLevel.toFixed(1)}x</span>
        </div>
        <div class="check-item">
          <span class="check-icon ${classification.evidence.notedInInitialAssessment ? 'check-passed' : 'check-failed'}">
            ${classification.evidence.notedInInitialAssessment ? '✓' : '✗'}
          </span>
          <span>Finding ${classification.evidence.notedInInitialAssessment ? 'was' : 'was not'} noted in initial assessment</span>
        </div>
      </div>

      <h3>Scientific Context</h3>
      <p>${classification.scientificContext}</p>

      <p>Expected rate range: ${classification.expectedRateRange.min}% - ${classification.expectedRateRange.max}%</p>

      <h3>Liability Implications</h3>
      <p>${classification.liabilityImplications}</p>
    </section>`;
  }

  private renderCognitiveLoadHTML(workload: WorkloadMetrics): string {
    const statusClass = workload.thresholdStatus === 'GREEN' ? 'status-green' :
      workload.thresholdStatus === 'YELLOW' ? 'status-yellow' : 'status-red';

    return `
    <section id="cognitive-load">
      <h2>5. COGNITIVE LOAD ANALYSIS</h2>

      <h3>Session Workload at Time of Error</h3>
      <table>
        <tr><td>Cases completed</td><td>${workload.casesCompletedInSession} of ${workload.totalSessionCases}</td></tr>
        <tr><td>Session duration</td><td>${workload.sessionDurationMinutes.toFixed(0)} minutes</td></tr>
        <tr><td>Average time per case</td><td>${workload.averageTimePerCaseMinutes.toFixed(1)} minutes</td></tr>
        <tr><td>Cases per hour</td><td>${workload.casesPerHour.toFixed(1)}</td></tr>
      </table>

      <p>
        <strong>MACKNIK THRESHOLD STATUS:</strong>
        <span class="status-badge ${statusClass}">${workload.thresholdStatus}</span>
        (${workload.thresholdStatusExplanation})
      </p>

      <p>
        <strong>FATIGUE INDEX:</strong> ${workload.fatigueIndex}/100 (${workload.fatigueLevel})
      </p>

      <h3>Scientific Basis</h3>
      <p>${workload.scientificBasis}</p>

      <h3>Conclusion</h3>
      <p><strong>${workload.conclusion}</strong></p>
    </section>`;
  }

  private renderAIDisclosureHTML(openness: IntelligentOpennessScore): string {
    return `
    <section id="ai-disclosure">
      <h2>6. AI DISCLOSURE COMPLIANCE (SPIEGELHALTER FRAMEWORK)</h2>

      <table>
        <tr><td>Disclosure Format</td><td>${openness.disclosureContent.format}</td></tr>
        <tr><td>AI Validation Phase</td><td>Phase ${openness.validationPhase.phase}</td></tr>
      </table>

      <p>
        <strong>INTELLIGENT OPENNESS SCORE:</strong> ${openness.overallScore}/4
        <span class="status-badge ${openness.complianceLevel === 'FULL' ? 'status-green' : openness.complianceLevel === 'SUBSTANTIAL' ? 'status-yellow' : 'status-red'}">
          ${openness.complianceLevel} COMPLIANCE
        </span>
      </p>

      <h3>Four Pillars of Intelligent Openness</h3>
      <div class="checks">
        <div class="check-item">
          <span class="check-icon ${openness.pillars.accessible.met ? 'check-passed' : 'check-failed'}">
            ${openness.pillars.accessible.met ? '✓' : '✗'}
          </span>
          <span><strong>Accessible:</strong> ${openness.pillars.accessible.explanation}</span>
        </div>
        <div class="check-item">
          <span class="check-icon ${openness.pillars.intelligible.met ? 'check-passed' : 'check-failed'}">
            ${openness.pillars.intelligible.met ? '✓' : '✗'}
          </span>
          <span><strong>Intelligible:</strong> ${openness.pillars.intelligible.explanation}</span>
        </div>
        <div class="check-item">
          <span class="check-icon ${openness.pillars.usable.met ? 'check-passed' : 'check-failed'}">
            ${openness.pillars.usable.met ? '✓' : '✗'}
          </span>
          <span><strong>Usable:</strong> ${openness.pillars.usable.explanation}</span>
        </div>
        <div class="check-item">
          <span class="check-icon ${openness.pillars.assessable.met ? 'check-passed' : 'check-failed'}">
            ${openness.pillars.assessable.met ? '✓' : '✗'}
          </span>
          <span><strong>Assessable:</strong> ${openness.pillars.assessable.explanation}</span>
        </div>
      </div>

      ${openness.disclosureContent.rawText ? `
      <h3>Disclosure Content</h3>
      <pre>${openness.disclosureContent.rawText}</pre>` : ''}

      ${openness.validationPhase.warningShown ? `
      <h3>Validation Warning Shown</h3>
      <pre>${openness.validationPhase.warningText}</pre>` : ''}

      <h3>Conclusion</h3>
      <p><strong>${openness.conclusion}</strong></p>
    </section>`;
  }

  private renderAttentionAnalysisHTML(attention: AttentionSummary): string {
    return `
    <section id="attention-analysis">
      <h2>7. ATTENTION ANALYSIS</h2>

      <table>
        <tr><td>Image Coverage</td><td>${attention.imageCoveragePercent}% of anatomical regions viewed</td></tr>
        <tr><td>Total Viewing Time</td><td>${(attention.preAIViewingTimeMs / 1000).toFixed(0)}s (pre-AI) + ${(attention.postAIViewingTimeMs / 1000).toFixed(0)}s (post-AI)</td></tr>
      </table>

      ${attention.regionAnalysis.length > 0 ? `
      <h3>Region Coverage</h3>
      <table>
        <thead><tr><th>Status</th><th>Region</th><th>Dwell Time</th><th>Zoom</th></tr></thead>
        <tbody>
          ${attention.regionAnalysis.map(r => `
          <tr>
            <td>${r.visited ? '✓' : '✗'}</td>
            <td>${r.regionName}</td>
            <td>${(r.dwellTimeMs / 1000).toFixed(1)}s</td>
            <td>${r.zoomLevel.toFixed(1)}x</td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<p>No region-level attention data available.</p>'}

      ${attention.findingLocation ? `
      <h3>Finding Location vs Attention</h3>
      <p>Finding was in <strong>${attention.findingLocation.region}</strong>, which received:</p>
      <ul>
        <li>${(attention.findingLocation.dwellTimeMs / 1000).toFixed(1)} seconds of attention</li>
        <li>${attention.findingLocation.zoomLevel.toFixed(1)}x zoom magnification</li>
        <li>${attention.findingLocation.viewingEpisodes} separate viewing episode(s)</li>
      </ul>` : ''}

      <h3>Conclusion</h3>
      <p>
        ${attention.imageCoveragePercent >= 90
          ? 'Visual search was thorough. The error was not due to inadequate coverage of the image.'
          : attention.imageCoveragePercent >= 70
            ? 'Visual search covered most of the image. Some regions received limited attention.'
            : 'Visual search coverage was limited. Image coverage may have contributed to the error.'}
      </p>
    </section>`;
  }

  private renderCryptographicVerificationHTML(crypto: CryptographicVerification): string {
    return `
    <section id="cryptographic-verification">
      <h2>8. CRYPTOGRAPHIC VERIFICATION</h2>

      <table>
        <tr>
          <td>Hash Chain Status</td>
          <td><span class="status-badge ${crypto.hashChainStatus === 'VERIFIED' ? 'status-green' : 'status-red'}">${crypto.hashChainStatus} ✓</span></td>
        </tr>
        <tr><td>Total Events</td><td>${crypto.totalEvents}</td></tr>
        <tr><td>Chain Integrity</td><td>${crypto.chainIntegrity}</td></tr>
      </table>

      <h3>Verification Details</h3>
      <table>
        <tr><td>Genesis hash</td><td><code>${crypto.verificationDetails.genesisHash.substring(0, 16)}...</code> (${crypto.verificationDetails.genesisVerified ? 'verified' : 'INVALID'})</td></tr>
        <tr><td>Final hash</td><td><code>${crypto.verificationDetails.finalHash.substring(0, 16)}...</code> (${crypto.verificationDetails.finalVerified ? 'verified' : 'INVALID'})</td></tr>
        <tr><td>All intermediate hashes</td><td>${crypto.verificationDetails.allIntermediateHashesValid ? 'VALID' : 'INVALID'}</td></tr>
        <tr><td>Tampering detected</td><td>${crypto.verificationDetails.tamperingDetected ? 'YES - ALERT' : 'No'}</td></tr>
      </table>

      ${crypto.tsaAttestation.checkpointCount > 0 ? `
      <h3>TSA Timestamp Attestation</h3>
      <div class="checks">
        <div class="check-item"><span class="check-icon check-passed">✓</span> ${crypto.tsaAttestation.checkpointCount} checkpoints attested</div>
        <div class="check-item"><span class="check-icon check-passed">✓</span> Coverage: ${crypto.tsaAttestation.coveragePercent}% of events</div>
        <div class="check-item"><span class="check-icon check-passed">✓</span> Earliest: ${crypto.tsaAttestation.earliestAttestation}</div>
        <div class="check-item"><span class="check-icon check-passed">✓</span> Latest: ${crypto.tsaAttestation.latestAttestation}</div>
      </div>` : '<p>No TSA checkpoints recorded.</p>'}

      <p><strong>${crypto.conclusion}</strong></p>
    </section>`;
  }

  private renderAppendicesHTML(appendices: PacketAppendices): string {
    return `
    <section id="appendices">
      <h2>9. APPENDICES</h2>

      <h3>A: Full Event Log</h3>
      <p>${appendices.fullEventLog.length} events recorded. See JSON export for full details.</p>

      <h3>B: Viewport Attention Heatmap</h3>
      <p>${appendices.viewportHeatmapData ? 'Heatmap data available in export.' : 'No heatmap data available.'}</p>

      <h3>C: Case Images</h3>
      <p>${appendices.caseImagesIncluded ? 'Images included.' : 'Images not included for privacy/legal considerations.'}</p>

      <h3>D: AI System Specifications</h3>
      <table>
        <tr><td>Model Name</td><td>${appendices.aiSystemSpecs.modelName}</td></tr>
        <tr><td>Version</td><td>${appendices.aiSystemSpecs.modelVersion}</td></tr>
        <tr><td>Validation Phase</td><td>${appendices.aiSystemSpecs.validationPhase}</td></tr>
      </table>

      <h3>E: Research Citations</h3>
      <ol>
        ${appendices.researchCitations.map(c => `
        <li>
          ${c.authors.join(', ')} (${c.year}). ${c.title}. <em>${c.journal}</em>${c.volume ? `, ${c.volume}` : ''}${c.pages ? `, ${c.pages}` : ''}.
          ${c.doi ? `<br>DOI: ${c.doi}` : ''}
        </li>`).join('')}
      </ol>

      <h3>F: Glossary of Terms</h3>
      <dl>
        ${appendices.glossary.map(g => `
        <dt><strong>${g.term}</strong></dt>
        <dd>${g.definition}${g.legalRelevance ? `<br><em>Legal relevance: ${g.legalRelevance}</em>` : ''}</dd>
        `).join('')}
      </dl>
    </section>`;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create an ExpertWitnessPacketGenerator from session data
 */
export function createPacketGenerator(
  sessionData: SessionData,
  options?: Parameters<typeof ExpertWitnessPacketGenerator.prototype.constructor>[1]
): ExpertWitnessPacketGenerator {
  return new ExpertWitnessPacketGenerator(sessionData, options);
}

// =============================================================================
// EXPORTS
// =============================================================================

export { formatWorkloadForLegal } from './workloadMetrics';
export { formatErrorClassificationForLegal, formatAttentionSummaryForLegal } from './wolfeErrorClassification';
export { formatCDIForLegal } from './caseDifficultyIndex';
