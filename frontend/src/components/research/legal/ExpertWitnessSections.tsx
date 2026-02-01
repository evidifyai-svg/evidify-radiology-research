/**
 * Expert Witness Packet Section Components
 *
 * React components for rendering each section of the enhanced
 * expert witness packet with professional legal styling.
 */

import React from 'react';
import {
  EnhancedExpertWitnessPacket,
  ExpertWitnessSummary,
  WorkflowComplianceReport,
  CaseDifficultyIndex,
  WolfeErrorClassification,
  WorkloadMetrics,
  IntelligentOpennessScore,
  AttentionSummary,
  CryptographicVerification,
  PacketAppendices,
} from '../../../lib/expertWitness/expertWitnessTypes';
import styles from './expertWitnessStyles.module.css';

// =============================================================================
// SHARED COMPONENTS
// =============================================================================

interface StatusBadgeProps {
  status: 'green' | 'yellow' | 'red';
  children: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, children }) => (
  <span className={`${styles.statusBadge} ${styles[`status${status.charAt(0).toUpperCase() + status.slice(1)}`]}`}>
    {children}
  </span>
);

interface CheckItemProps {
  passed: boolean;
  children: React.ReactNode;
}

export const CheckItem: React.FC<CheckItemProps> = ({ passed, children }) => (
  <div className={styles.checkItem}>
    <span className={`${styles.checkIcon} ${passed ? styles.checkPassed : styles.checkFailed}`}>
      {passed ? '✓' : '✗'}
    </span>
    <span>{children}</span>
  </div>
);

interface ScoreBarProps {
  score: number;
  max?: number;
  color?: string;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({ score, max = 100, color }) => {
  const percentage = (score / max) * 100;
  const defaultColor = percentage < 30 ? '#22c55e' :
    percentage < 50 ? '#eab308' :
      percentage < 70 ? '#f97316' : '#ef4444';

  return (
    <div className={styles.scoreBar}>
      <div
        className={styles.scoreFill}
        style={{
          width: `${percentage}%`,
          backgroundColor: color || defaultColor
        }}
      >
        {score}/{max}
      </div>
    </div>
  );
};

// =============================================================================
// SECTION 1: EXECUTIVE SUMMARY
// =============================================================================

interface ExecutiveSummarySectionProps {
  summary: ExpertWitnessSummary;
}

export const ExecutiveSummarySection: React.FC<ExecutiveSummarySectionProps> = ({ summary }) => {
  const getLevelStatus = (level: string): 'green' | 'yellow' | 'red' => {
    if (level === 'LOW' || level === 'COMPLIANT') return 'green';
    if (level === 'MODERATE' || level === 'PARTIAL') return 'yellow';
    return 'red';
  };

  return (
    <section id="executive-summary" className={styles.section}>
      <h2 className={styles.sectionTitle}>1. EXECUTIVE SUMMARY</h2>

      <table className={styles.table}>
        <tbody>
          <tr><th>Case ID</th><td>{summary.caseId}</td></tr>
          <tr><th>Session ID</th><td>{summary.sessionId}</td></tr>
          <tr><th>Clinician ID</th><td>{summary.clinicianId}</td></tr>
        </tbody>
      </table>

      <h3>Summary</h3>
      <p className={styles.summaryText}>{summary.executiveSummary}</p>

      <h3>Key Findings</h3>
      <table className={styles.table}>
        <tbody>
          <tr>
            <th>Workflow Compliance</th>
            <td>
              <StatusBadge status={getLevelStatus(summary.keyFindings.workflowCompliance)}>
                {summary.keyFindings.workflowCompliance}
              </StatusBadge>
            </td>
          </tr>
          {summary.keyFindings.errorClassification && (
            <tr>
              <th>Error Classification</th>
              <td>{summary.keyFindings.errorClassification.replace(/_/g, ' ')}</td>
            </tr>
          )}
          <tr>
            <th>Case Difficulty</th>
            <td>
              {summary.keyFindings.caseDifficulty.compositeScore}/100
              ({summary.keyFindings.caseDifficulty.difficultyLevel})
            </td>
          </tr>
          <tr>
            <th>AI Disclosure Score</th>
            <td>
              {summary.keyFindings.aiDisclosureCompliance.overallScore}/4
              ({summary.keyFindings.aiDisclosureCompliance.complianceLevel})
            </td>
          </tr>
          <tr>
            <th>Workload Status</th>
            <td>
              <StatusBadge status={getLevelStatus(summary.keyFindings.workloadStatus.thresholdStatus)}>
                {summary.keyFindings.workloadStatus.thresholdStatus}
              </StatusBadge>
            </td>
          </tr>
        </tbody>
      </table>

      <h3>Liability Assessment</h3>
      <p>
        <StatusBadge status={getLevelStatus(summary.liabilityAssessment.level)}>
          {summary.liabilityAssessment.level} RISK
        </StatusBadge>
      </p>

      {summary.liabilityAssessment.mitigatingFactors.length > 0 && (
        <>
          <h4>Mitigating Factors</h4>
          <ul className={styles.factorList}>
            {summary.liabilityAssessment.mitigatingFactors.map((f, i) => (
              <li key={i} className={styles.mitigatingFactor}>{f}</li>
            ))}
          </ul>
        </>
      )}

      {summary.liabilityAssessment.aggravatingFactors.length > 0 && (
        <>
          <h4>Aggravating Factors</h4>
          <ul className={styles.factorList}>
            {summary.liabilityAssessment.aggravatingFactors.map((f, i) => (
              <li key={i} className={styles.aggravatingFactor}>{f}</li>
            ))}
          </ul>
        </>
      )}

      <p className={styles.recommendation}>
        <strong>Recommendation:</strong> {summary.liabilityAssessment.recommendation}
      </p>
    </section>
  );
};

// =============================================================================
// SECTION 2: WORKFLOW COMPLIANCE
// =============================================================================

interface WorkflowComplianceSectionProps {
  compliance: WorkflowComplianceReport;
}

export const WorkflowComplianceSection: React.FC<WorkflowComplianceSectionProps> = ({ compliance }) => {
  const getStatus = (): 'green' | 'yellow' | 'red' => {
    if (compliance.overallStatus === 'COMPLIANT') return 'green';
    if (compliance.overallStatus === 'PARTIAL') return 'yellow';
    return 'red';
  };

  return (
    <section id="workflow-compliance" className={styles.section}>
      <h2 className={styles.sectionTitle}>2. WORKFLOW COMPLIANCE REPORT</h2>

      <p>
        <StatusBadge status={getStatus()}>{compliance.overallStatus}</StatusBadge>
      </p>

      <div className={styles.checksContainer}>
        <CheckItem passed={compliance.checks.independentAssessmentRecorded.passed}>
          {compliance.checks.independentAssessmentRecorded.description}
        </CheckItem>
        <CheckItem passed={compliance.checks.assessmentCryptographicallyLocked.passed}>
          {compliance.checks.assessmentCryptographicallyLocked.description}
        </CheckItem>
        <CheckItem passed={compliance.checks.aiRevealAfterLock.passed}>
          {compliance.checks.aiRevealAfterLock.description}
        </CheckItem>
        <CheckItem passed={compliance.checks.deviationDocumented.passed}>
          {compliance.checks.deviationDocumented.description}
        </CheckItem>
        <CheckItem passed={compliance.checks.hashChainVerified.passed}>
          {compliance.checks.hashChainVerified.description}
        </CheckItem>
      </div>

      <h3>Workflow Timeline</h3>
      <table className={styles.table}>
        <thead>
          <tr><th>Stage</th><th>Timestamp</th><th>Description</th></tr>
        </thead>
        <tbody>
          {compliance.timeline.map((t, i) => (
            <tr key={i}>
              <td>{t.stage}</td>
              <td><code className={styles.timestamp}>{t.timestamp}</code></td>
              <td>{t.description}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Workflow Diagram</h3>
      <div className={styles.workflowDiagram}>
        {compliance.diagram.stages.map((stage, i) => (
          <React.Fragment key={i}>
            <div className={`${styles.workflowStage} ${styles[`stage${stage.status.charAt(0).toUpperCase() + stage.status.slice(1)}`]}`}>
              <span className={styles.stageIcon}>{stage.icon}</span>
              <span className={styles.stageName}>{stage.name}</span>
              {stage.timestamp && (
                <span className={styles.stageTime}>
                  {new Date(stage.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
            {i < compliance.diagram.stages.length - 1 && (
              <div className={styles.workflowArrow}>→</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
};

// =============================================================================
// SECTION 3: CASE DIFFICULTY
// =============================================================================

interface CaseDifficultySectionProps {
  difficulty: CaseDifficultyIndex;
}

export const CaseDifficultySection: React.FC<CaseDifficultySectionProps> = ({ difficulty }) => {
  return (
    <section id="case-difficulty" className={styles.section}>
      <h2 className={styles.sectionTitle}>3. CASE DIFFICULTY ANALYSIS</h2>

      <div className={styles.difficultyHeader}>
        <div className={styles.difficultyScore}>
          <span className={styles.scoreLabel}>Composite Difficulty Score</span>
          <ScoreBar score={difficulty.compositeScore} />
        </div>
        <div className={styles.difficultyMeta}>
          <div><strong>Level:</strong> {difficulty.difficultyLevel}</div>
          <div><strong>Percentile:</strong> {difficulty.percentile}th</div>
          <div><strong>RADPEER:</strong> Score {difficulty.radpeerPrediction.expectedScore}</div>
        </div>
      </div>

      <p className={styles.radpeerDescription}>
        "{difficulty.radpeerPrediction.scoreDescription}"
      </p>

      <h3>Difficulty Factors</h3>
      <table className={styles.table}>
        <thead>
          <tr><th>Factor</th><th>Value</th><th>Score</th><th>Description</th></tr>
        </thead>
        <tbody>
          {difficulty.factors.breastDensity && (
            <tr>
              <td>Breast Density</td>
              <td>BI-RADS {difficulty.factors.breastDensity.biradsCategory}</td>
              <td>{difficulty.factors.breastDensity.score}/5</td>
              <td>{difficulty.factors.breastDensity.description}</td>
            </tr>
          )}
          {difficulty.factors.findingConspicuity && (
            <tr>
              <td>Finding Conspicuity</td>
              <td>{difficulty.factors.findingConspicuity.type}</td>
              <td>{difficulty.factors.findingConspicuity.score}/5</td>
              <td>{difficulty.factors.findingConspicuity.description}</td>
            </tr>
          )}
          {difficulty.factors.findingSize && (
            <tr>
              <td>Finding Size</td>
              <td>{difficulty.factors.findingSize.sizeMm}mm</td>
              <td>{difficulty.factors.findingSize.score}/5</td>
              <td>{difficulty.factors.findingSize.description}</td>
            </tr>
          )}
          {difficulty.factors.findingLocation && (
            <tr>
              <td>Location</td>
              <td>{difficulty.factors.findingLocation.location}</td>
              <td>{difficulty.factors.findingLocation.score}/5</td>
              <td>{difficulty.factors.findingLocation.description}</td>
            </tr>
          )}
          {difficulty.factors.distractors && (
            <tr>
              <td>Distractors</td>
              <td>{difficulty.factors.distractors.count} present</td>
              <td>{difficulty.factors.distractors.score}/5</td>
              <td>{difficulty.factors.distractors.description}</td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>Scientific Basis</h3>
      <p className={styles.scientificBasis}>{difficulty.scientificBasis}</p>

      <p className={styles.missRate}><strong>{difficulty.missRateExpectation}</strong></p>
    </section>
  );
};

// =============================================================================
// SECTION 4: ERROR CLASSIFICATION
// =============================================================================

interface ErrorClassificationSectionProps {
  classification: WolfeErrorClassification;
}

export const ErrorClassificationSection: React.FC<ErrorClassificationSectionProps> = ({ classification }) => {
  if (classification.primaryError === 'NO_ERROR') {
    return (
      <section id="error-classification" className={styles.section}>
        <h2 className={styles.sectionTitle}>4. WOLFE ERROR CLASSIFICATION</h2>
        <p className={styles.noError}>No diagnostic error occurred.</p>
      </section>
    );
  }

  return (
    <section id="error-classification" className={styles.section}>
      <h2 className={styles.sectionTitle}>4. WOLFE ERROR CLASSIFICATION</h2>

      <div className={styles.errorHeader}>
        <div className={styles.errorType}>
          <span className={styles.errorLabel}>Classification:</span>
          <span className={styles.errorValue}>
            {classification.primaryError.replace(/_/g, ' ')}
          </span>
        </div>
        <div className={styles.errorConfidence}>
          <span className={styles.confidenceLabel}>Confidence:</span>
          <span className={styles.confidenceValue}>{classification.confidence}%</span>
        </div>
      </div>

      <h3>Evidence Supporting Classification</h3>
      <div className={styles.checksContainer}>
        <CheckItem passed={classification.evidence.regionViewed}>
          Viewport tracking confirms region was {classification.evidence.regionViewed ? 'viewed' : 'NOT viewed'}
        </CheckItem>
        <div className={styles.evidenceItem}>
          <span>Dwell time: {(classification.evidence.dwellTimeMs / 1000).toFixed(1)} seconds</span>
        </div>
        <div className={styles.evidenceItem}>
          <span>Zoom level: {classification.evidence.zoomLevel.toFixed(1)}x</span>
        </div>
        <CheckItem passed={!classification.evidence.notedInInitialAssessment}>
          Finding was {classification.evidence.notedInInitialAssessment ? '' : 'not '}noted in initial assessment
        </CheckItem>
      </div>

      <h3>Scientific Context</h3>
      <p className={styles.scientificContext}>{classification.scientificContext}</p>

      <p className={styles.expectedRate}>
        Expected rate range: {classification.expectedRateRange.min}% - {classification.expectedRateRange.max}%
      </p>

      <h3>Liability Implications</h3>
      <p className={styles.liabilityImplications}>{classification.liabilityImplications}</p>
    </section>
  );
};

// =============================================================================
// SECTION 5: COGNITIVE LOAD
// =============================================================================

interface CognitiveLoadSectionProps {
  workload: WorkloadMetrics;
}

export const CognitiveLoadSection: React.FC<CognitiveLoadSectionProps> = ({ workload }) => {
  const getThresholdStatus = (): 'green' | 'yellow' | 'red' => {
    return workload.thresholdStatus.toLowerCase() as 'green' | 'yellow' | 'red';
  };

  return (
    <section id="cognitive-load" className={styles.section}>
      <h2 className={styles.sectionTitle}>5. COGNITIVE LOAD ANALYSIS</h2>

      <h3>Session Workload at Time of Error</h3>
      <table className={styles.table}>
        <tbody>
          <tr>
            <td>Cases completed</td>
            <td>{workload.casesCompletedInSession} of {workload.totalSessionCases}</td>
          </tr>
          <tr>
            <td>Session duration</td>
            <td>{workload.sessionDurationMinutes.toFixed(0)} minutes</td>
          </tr>
          <tr>
            <td>Average time per case</td>
            <td>{workload.averageTimePerCaseMinutes.toFixed(1)} minutes</td>
          </tr>
          <tr>
            <td>Cases per hour</td>
            <td>{workload.casesPerHour.toFixed(1)}</td>
          </tr>
        </tbody>
      </table>

      <div className={styles.thresholdStatus}>
        <span className={styles.thresholdLabel}>MACKNIK THRESHOLD STATUS:</span>
        <StatusBadge status={getThresholdStatus()}>{workload.thresholdStatus}</StatusBadge>
      </div>
      <p className={styles.thresholdExplanation}>{workload.thresholdStatusExplanation}</p>

      <div className={styles.fatigueIndex}>
        <span className={styles.fatigueLabel}>FATIGUE INDEX:</span>
        <span className={styles.fatigueValue}>{workload.fatigueIndex}/100 ({workload.fatigueLevel})</span>
      </div>

      <h3>Scientific Basis</h3>
      <p className={styles.scientificBasis}>{workload.scientificBasis}</p>

      <h3>Conclusion</h3>
      <p className={styles.conclusion}><strong>{workload.conclusion}</strong></p>
    </section>
  );
};

// =============================================================================
// SECTION 6: AI DISCLOSURE
// =============================================================================

interface AIDisclosureSectionProps {
  openness: IntelligentOpennessScore;
}

export const AIDisclosureSection: React.FC<AIDisclosureSectionProps> = ({ openness }) => {
  const getComplianceStatus = (): 'green' | 'yellow' | 'red' => {
    if (openness.complianceLevel === 'FULL') return 'green';
    if (openness.complianceLevel === 'SUBSTANTIAL') return 'yellow';
    return 'red';
  };

  return (
    <section id="ai-disclosure" className={styles.section}>
      <h2 className={styles.sectionTitle}>6. AI DISCLOSURE COMPLIANCE (SPIEGELHALTER FRAMEWORK)</h2>

      <table className={styles.table}>
        <tbody>
          <tr>
            <td>Disclosure Format</td>
            <td>{openness.disclosureContent.format}</td>
          </tr>
          <tr>
            <td>AI Validation Phase</td>
            <td>Phase {openness.validationPhase.phase}</td>
          </tr>
        </tbody>
      </table>

      <div className={styles.opennessScore}>
        <span className={styles.opennessLabel}>INTELLIGENT OPENNESS SCORE:</span>
        <span className={styles.opennessValue}>{openness.overallScore}/4</span>
        <StatusBadge status={getComplianceStatus()}>
          {openness.complianceLevel} COMPLIANCE
        </StatusBadge>
      </div>

      <h3>Four Pillars of Intelligent Openness</h3>
      <div className={styles.pillarsContainer}>
        <CheckItem passed={openness.pillars.accessible.met}>
          <strong>Accessible:</strong> {openness.pillars.accessible.explanation}
        </CheckItem>
        <CheckItem passed={openness.pillars.intelligible.met}>
          <strong>Intelligible:</strong> {openness.pillars.intelligible.explanation}
        </CheckItem>
        <CheckItem passed={openness.pillars.usable.met}>
          <strong>Usable:</strong> {openness.pillars.usable.explanation}
        </CheckItem>
        <CheckItem passed={openness.pillars.assessable.met}>
          <strong>Assessable:</strong> {openness.pillars.assessable.explanation}
        </CheckItem>
      </div>

      {openness.disclosureContent.rawText && (
        <>
          <h3>Disclosure Content</h3>
          <pre className={styles.disclosureContent}>{openness.disclosureContent.rawText}</pre>
        </>
      )}

      {openness.validationPhase.warningShown && (
        <>
          <h3>Validation Warning Shown</h3>
          <pre className={styles.validationWarning}>{openness.validationPhase.warningText}</pre>
        </>
      )}

      <h3>Conclusion</h3>
      <p className={styles.conclusion}><strong>{openness.conclusion}</strong></p>
    </section>
  );
};

// =============================================================================
// SECTION 7: ATTENTION ANALYSIS
// =============================================================================

interface AttentionAnalysisSectionProps {
  attention: AttentionSummary;
}

export const AttentionAnalysisSection: React.FC<AttentionAnalysisSectionProps> = ({ attention }) => {
  const getCoverageConclusion = (): string => {
    if (attention.imageCoveragePercent >= 90) {
      return 'Visual search was thorough. The error was not due to inadequate coverage of the image.';
    } else if (attention.imageCoveragePercent >= 70) {
      return 'Visual search covered most of the image. Some regions received limited attention.';
    }
    return 'Visual search coverage was limited. Image coverage may have contributed to the error.';
  };

  return (
    <section id="attention-analysis" className={styles.section}>
      <h2 className={styles.sectionTitle}>7. ATTENTION ANALYSIS</h2>

      <table className={styles.table}>
        <tbody>
          <tr>
            <td>Image Coverage</td>
            <td>{attention.imageCoveragePercent}% of anatomical regions viewed</td>
          </tr>
          <tr>
            <td>Total Viewing Time</td>
            <td>
              {(attention.preAIViewingTimeMs / 1000).toFixed(0)}s (pre-AI) +{' '}
              {(attention.postAIViewingTimeMs / 1000).toFixed(0)}s (post-AI)
            </td>
          </tr>
        </tbody>
      </table>

      {attention.regionAnalysis.length > 0 && (
        <>
          <h3>Region Coverage</h3>
          <table className={styles.table}>
            <thead>
              <tr><th>Status</th><th>Region</th><th>Dwell Time</th><th>Zoom</th></tr>
            </thead>
            <tbody>
              {attention.regionAnalysis.map((r, i) => (
                <tr key={i}>
                  <td className={r.visited ? styles.regionVisited : styles.regionMissed}>
                    {r.visited ? '✓' : '✗'}
                  </td>
                  <td>{r.regionName}</td>
                  <td>{(r.dwellTimeMs / 1000).toFixed(1)}s</td>
                  <td>{r.zoomLevel.toFixed(1)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {attention.findingLocation && (
        <>
          <h3>Finding Location vs Attention</h3>
          <p>Finding was in <strong>{attention.findingLocation.region}</strong>, which received:</p>
          <ul className={styles.attentionList}>
            <li>{(attention.findingLocation.dwellTimeMs / 1000).toFixed(1)} seconds of attention</li>
            <li>{attention.findingLocation.zoomLevel.toFixed(1)}x zoom magnification</li>
            <li>{attention.findingLocation.viewingEpisodes} separate viewing episode(s)</li>
          </ul>
        </>
      )}

      <h3>Conclusion</h3>
      <p className={styles.conclusion}>{getCoverageConclusion()}</p>
    </section>
  );
};

// =============================================================================
// SECTION 8: CRYPTOGRAPHIC VERIFICATION
// =============================================================================

interface CryptographicVerificationSectionProps {
  crypto: CryptographicVerification;
}

export const CryptographicVerificationSection: React.FC<CryptographicVerificationSectionProps> = ({ crypto }) => {
  return (
    <section id="cryptographic-verification" className={styles.section}>
      <h2 className={styles.sectionTitle}>8. CRYPTOGRAPHIC VERIFICATION</h2>

      <table className={styles.table}>
        <tbody>
          <tr>
            <td>Hash Chain Status</td>
            <td>
              <StatusBadge status={crypto.hashChainStatus === 'VERIFIED' ? 'green' : 'red'}>
                {crypto.hashChainStatus} {crypto.hashChainStatus === 'VERIFIED' && '✓'}
              </StatusBadge>
            </td>
          </tr>
          <tr>
            <td>Total Events</td>
            <td>{crypto.totalEvents}</td>
          </tr>
          <tr>
            <td>Chain Integrity</td>
            <td>{crypto.chainIntegrity}</td>
          </tr>
        </tbody>
      </table>

      <h3>Verification Details</h3>
      <table className={styles.table}>
        <tbody>
          <tr>
            <td>Genesis hash</td>
            <td>
              <code className={styles.hash}>{crypto.verificationDetails.genesisHash.substring(0, 16)}...</code>
              {' '}({crypto.verificationDetails.genesisVerified ? 'verified' : 'INVALID'})
            </td>
          </tr>
          <tr>
            <td>Final hash</td>
            <td>
              <code className={styles.hash}>{crypto.verificationDetails.finalHash.substring(0, 16)}...</code>
              {' '}({crypto.verificationDetails.finalVerified ? 'verified' : 'INVALID'})
            </td>
          </tr>
          <tr>
            <td>All intermediate hashes</td>
            <td>{crypto.verificationDetails.allIntermediateHashesValid ? 'VALID' : 'INVALID'}</td>
          </tr>
          <tr>
            <td>Tampering detected</td>
            <td className={crypto.verificationDetails.tamperingDetected ? styles.tamperingAlert : ''}>
              {crypto.verificationDetails.tamperingDetected ? 'YES - ALERT' : 'No'}
            </td>
          </tr>
        </tbody>
      </table>

      {crypto.tsaAttestation.checkpointCount > 0 && (
        <>
          <h3>TSA Timestamp Attestation</h3>
          <div className={styles.checksContainer}>
            <CheckItem passed={true}>
              {crypto.tsaAttestation.checkpointCount} checkpoints attested
            </CheckItem>
            <CheckItem passed={true}>
              Coverage: {crypto.tsaAttestation.coveragePercent}% of events
            </CheckItem>
            <CheckItem passed={true}>
              Earliest: {crypto.tsaAttestation.earliestAttestation}
            </CheckItem>
            <CheckItem passed={true}>
              Latest: {crypto.tsaAttestation.latestAttestation}
            </CheckItem>
          </div>
        </>
      )}

      <p className={styles.cryptoConclusion}><strong>{crypto.conclusion}</strong></p>
    </section>
  );
};

// =============================================================================
// SECTION 9: APPENDICES
// =============================================================================

interface AppendicesSectionProps {
  appendices: PacketAppendices;
}

export const AppendicesSection: React.FC<AppendicesSectionProps> = ({ appendices }) => {
  return (
    <section id="appendices" className={styles.section}>
      <h2 className={styles.sectionTitle}>9. APPENDICES</h2>

      <h3>A: Full Event Log</h3>
      <p>{appendices.fullEventLog.length} events recorded. See JSON export for full details.</p>

      <h3>B: Viewport Attention Heatmap</h3>
      <p>{appendices.viewportHeatmapData ? 'Heatmap data available in export.' : 'No heatmap data available.'}</p>

      <h3>C: Case Images</h3>
      <p>{appendices.caseImagesIncluded ? 'Images included.' : 'Images not included for privacy/legal considerations.'}</p>

      <h3>D: AI System Specifications</h3>
      <table className={styles.table}>
        <tbody>
          <tr><td>Model Name</td><td>{appendices.aiSystemSpecs.modelName}</td></tr>
          <tr><td>Version</td><td>{appendices.aiSystemSpecs.modelVersion}</td></tr>
          <tr><td>Validation Phase</td><td>{appendices.aiSystemSpecs.validationPhase}</td></tr>
        </tbody>
      </table>

      <h3>E: Research Citations</h3>
      <ol className={styles.citationList}>
        {appendices.researchCitations.map((c, i) => (
          <li key={i}>
            {c.authors.join(', ')} ({c.year}). {c.title}. <em>{c.journal}</em>
            {c.volume && `, ${c.volume}`}
            {c.pages && `, ${c.pages}`}.
            {c.doi && <><br />DOI: {c.doi}</>}
          </li>
        ))}
      </ol>

      <h3>F: Glossary of Terms</h3>
      <dl className={styles.glossary}>
        {appendices.glossary.map((g, i) => (
          <React.Fragment key={i}>
            <dt><strong>{g.term}</strong></dt>
            <dd>
              {g.definition}
              {g.legalRelevance && (
                <><br /><em>Legal relevance: {g.legalRelevance}</em></>
              )}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </section>
  );
};

// =============================================================================
// COMPLETE PACKET VIEWER
// =============================================================================

interface EnhancedPacketViewerProps {
  packet: EnhancedExpertWitnessPacket;
}

export const EnhancedPacketViewer: React.FC<EnhancedPacketViewerProps> = ({ packet }) => {
  return (
    <div className={styles.packetContainer}>
      <header className={styles.packetHeader}>
        <h1>EXPERT WITNESS PACKET</h1>
        <div className={styles.packetMeta}>
          <span>Packet ID: {packet.packetId}</span>
          <span>Generated: {new Date(packet.generatedAt).toLocaleString()}</span>
          <span>Version: {packet.version}</span>
        </div>
      </header>

      <nav className={styles.tableOfContents}>
        <h2>Table of Contents</h2>
        <ol>
          <li><a href="#executive-summary">Executive Summary</a></li>
          <li><a href="#workflow-compliance">Workflow Compliance</a></li>
          <li><a href="#case-difficulty">Case Difficulty Analysis</a></li>
          {packet.errorClassification && (
            <li><a href="#error-classification">Error Classification</a></li>
          )}
          <li><a href="#cognitive-load">Cognitive Load Analysis</a></li>
          <li><a href="#ai-disclosure">AI Disclosure Compliance</a></li>
          <li><a href="#attention-analysis">Attention Analysis</a></li>
          <li><a href="#cryptographic-verification">Cryptographic Verification</a></li>
          <li><a href="#appendices">Appendices</a></li>
        </ol>
      </nav>

      <ExecutiveSummarySection summary={packet.executiveSummary} />
      <WorkflowComplianceSection compliance={packet.workflowCompliance} />
      <CaseDifficultySection difficulty={packet.caseDifficultyAnalysis} />
      {packet.errorClassification && (
        <ErrorClassificationSection classification={packet.errorClassification} />
      )}
      <CognitiveLoadSection workload={packet.cognitiveLoadAnalysis} />
      <AIDisclosureSection openness={packet.aiDisclosureCompliance} />
      <AttentionAnalysisSection attention={packet.attentionAnalysis} />
      <CryptographicVerificationSection crypto={packet.cryptographicVerification} />
      <AppendicesSection appendices={packet.appendices} />

      <footer className={styles.packetFooter}>
        <p>This document was generated by Evidify Clinical Decision Documentation Platform.</p>
        <p>Case ID: {packet.executiveSummary.caseId} | Session: {packet.executiveSummary.sessionId}</p>
      </footer>
    </div>
  );
};

export default EnhancedPacketViewer;
