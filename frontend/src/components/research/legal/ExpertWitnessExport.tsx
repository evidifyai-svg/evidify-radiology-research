/**
 * ExpertWitnessExport.tsx
 * 
 * Generates court-ready documentation for expert witness testimony.
 * Designed to survive deposition cross-examination by proving:
 * 
 * 1. Reader formed independent opinion BEFORE AI exposure
 * 2. AI findings were explicitly reviewed and acknowledged
 * 3. Any deviation is documented with clinical rationale
 * 4. Complete chain of custody with cryptographic verification
 * 
 * Key insight from liability research: "what matters to defense is 
 * documented reasoning and process, not AI agreement."
 */

import React from 'react';
import { ImpressionLedgerExport, IntegrityReport, LedgerEntry } from './ImpressionLedger';
import { DeviationDocumentation, DEVIATION_REASON_CODES, FOLLOWUP_RECOMMENDATIONS } from './ClinicalReasoningDocumentor';

// ============================================================================
// METHODOLOGY STATEMENT (non-removable in exports)
// ============================================================================

/**
 * Mandatory methodology statement included in all exports.
 * This statement cannot be removed or hidden by the user.
 */
const METHODOLOGY_STATEMENT =
  'Methodology & Limitations: Session timing reflects platform-measured ' +
  'viewer session duration and does not account for off-screen review, ' +
  'verbal consultation, or reference to prior studies. Published normative ' +
  'benchmarks for radiology interpretation time do not currently exist ' +
  '(Waite et al., Radiology 2022). All comparative context in this ' +
  'document reflects internal benchmarks only and should not be interpreted ' +
  'as population norms. Viewer interaction data documents tool usage events ' +
  'and does not measure visual attention or gaze direction.';

// ============================================================================
// TYPES
// ============================================================================

export interface RubberStampIndicator {
  indicator: string;
  detected: boolean;
  severity: 'low' | 'medium' | 'high';
  description: string;
  value?: number | string;
  threshold?: number | string;
}

export interface ExpertWitnessPacket {
  // Header
  generatedAt: string;
  version: '1.0';
  packetId: string;
  
  // Case identification
  caseId: string;
  readerId: string;
  studyProtocolId?: string;
  
  // Executive summary
  summary: {
    independentJudgmentDocumented: boolean;
    aiOutputReviewed: boolean;
    allFindingsAcknowledged: boolean;
    deviationDocumented: boolean;
    chainIntegrityVerified: boolean;
    rubberStampRiskLevel: 'low' | 'medium' | 'high';
  };
  
  // Timeline (the core exhibit)
  timeline: TimelineEvent[];
  
  // Assessment comparison
  assessmentAnalysis: {
    firstImpression: string | null;
    firstConfidence: number | null;
    aiOutput: string | null;
    aiScore: number | null;
    aiFlagged: boolean | null;
    finalAssessment: string | null;
    finalConfidence: number | null;
    assessmentChanged: boolean;
    changeDirection: 'upgrade' | 'downgrade' | 'unchanged';
    agreesWithAI: boolean | null;
  };
  
  // Timing analysis
  timingAnalysis: {
    totalSessionMs: number;
    preAITimeMs: number;
    postAITimeMs: number;
    preAITimeAdequate: boolean;
    postAITimeAdequate: boolean;
    timeOnImageBeforeAI: number;
    timeOnImageAfterAI: number;
  };
  
  // Deviation documentation (if applicable)
  deviation: DeviationDocumentation | null;
  
  // Rubber-stamp risk indicators
  rubberStampIndicators: RubberStampIndicator[];
  
  // Chain integrity
  integrity: IntegrityReport;
  
  // Raw ledger for verification
  rawLedger: ImpressionLedgerExport;
}

export interface TimelineEvent {
  sequenceNumber: number;
  timestamp: string;
  relativeTimeMs: number;
  eventType: string;
  eventLabel: string;
  details: Record<string, any>;
  hash: string;
  isKeyEvent: boolean;
}

// ============================================================================
// RUBBER-STAMP DETECTION
// ============================================================================

export function detectRubberStampIndicators(
  ledger: ImpressionLedgerExport,
  deviation: DeviationDocumentation | null
): RubberStampIndicator[] {
  const indicators: RubberStampIndicator[] = [];
  const { summary } = ledger;
  
  // 1. Minimal pre-AI time
  const preAITimeS = summary.preAITimeMs / 1000;
  indicators.push({
    indicator: 'MINIMAL_PRE_AI_TIME',
    detected: preAITimeS < 15,
    severity: preAITimeS < 5 ? 'high' : preAITimeS < 15 ? 'medium' : 'low',
    description: 'Time spent on independent assessment before AI consultation',
    value: `${preAITimeS.toFixed(1)}s`,
    threshold: '≥15s recommended',
  });
  
  // 2. Minimal post-AI time
  const postAITimeS = summary.postAITimeMs / 1000;
  indicators.push({
    indicator: 'MINIMAL_POST_AI_TIME',
    detected: postAITimeS < 5,
    severity: postAITimeS < 3 ? 'high' : postAITimeS < 5 ? 'medium' : 'low',
    description: 'Time spent reviewing AI output and reconciling',
    value: `${postAITimeS.toFixed(1)}s`,
    threshold: '≥5s recommended',
  });
  
  // 3. Instant agreement with AI
  const instantAgreement = summary.assessmentChanged && 
    summary.agreesWithAI === true && 
    postAITimeS < 5;
  indicators.push({
    indicator: 'INSTANT_AI_AGREEMENT',
    detected: instantAgreement,
    severity: 'high',
    description: 'Changed assessment to match AI with minimal review time',
    value: instantAgreement ? 'Yes' : 'No',
  });
  
  // 4. No deviation documentation when disagreeing with AI
  const disagreedWithoutDoc = summary.agreesWithAI === false && !deviation;
  indicators.push({
    indicator: 'UNDOCUMENTED_DEVIATION',
    detected: disagreedWithoutDoc,
    severity: 'high',
    description: 'Disagreed with AI without documenting rationale',
    value: disagreedWithoutDoc ? 'Yes' : 'No',
  });
  
  // 5. AI findings not acknowledged
  indicators.push({
    indicator: 'UNACKNOWLEDGED_FINDINGS',
    detected: !summary.allFindingsAcknowledged,
    severity: 'high',
    description: 'AI-flagged regions were not explicitly reviewed',
    value: summary.allFindingsAcknowledged ? 'All acknowledged' : 'Not all acknowledged',
  });
  
  // 6. Disclosure not viewed/acknowledged
  indicators.push({
    indicator: 'DISCLOSURE_NOT_VIEWED',
    detected: !summary.disclosureShown,
    severity: 'medium',
    description: 'AI performance disclosure was not viewed',
    value: summary.disclosureShown ? 'Viewed' : 'Not shown',
  });
  
  return indicators;
}

export function calculateRubberStampRiskLevel(
  indicators: RubberStampIndicator[]
): 'low' | 'medium' | 'high' {
  const highCount = indicators.filter(i => i.detected && i.severity === 'high').length;
  const mediumCount = indicators.filter(i => i.detected && i.severity === 'medium').length;
  
  if (highCount >= 2) return 'high';
  if (highCount >= 1 || mediumCount >= 2) return 'medium';
  return 'low';
}

// ============================================================================
// PACKET GENERATION
// ============================================================================

export function generateExpertWitnessPacket(
  ledger: ImpressionLedgerExport,
  deviation: DeviationDocumentation | null = null,
  studyProtocolId?: string
): ExpertWitnessPacket {
  const { summary, entries, integrity } = ledger;
  
  // Build timeline
  const startTime = entries.length > 0 ? new Date(entries[0].timestamp).getTime() : Date.now();
  const timeline: TimelineEvent[] = entries.map((entry, index) => ({
    sequenceNumber: index,
    timestamp: entry.timestamp,
    relativeTimeMs: new Date(entry.timestamp).getTime() - startTime,
    eventType: entry.entryType,
    eventLabel: getEventLabel(entry.entryType),
    details: extractEventDetails(entry),
    hash: entry.hash,
    isKeyEvent: ['HUMAN_FIRST_IMPRESSION', 'AI_OUTPUT_EXPOSURE', 'RECONCILIATION'].includes(entry.entryType),
  }));
  
  // Detect rubber-stamp indicators
  const rubberStampIndicators = detectRubberStampIndicators(ledger, deviation);
  const rubberStampRiskLevel = calculateRubberStampRiskLevel(rubberStampIndicators);
  
  return {
    generatedAt: new Date().toISOString(),
    version: '1.0',
    packetId: `ewp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    
    caseId: ledger.caseId,
    readerId: ledger.readerId,
    studyProtocolId,
    
    summary: {
      independentJudgmentDocumented: summary.firstImpressionAssessment !== null,
      aiOutputReviewed: summary.aiExposureTimestamp !== null,
      allFindingsAcknowledged: summary.allFindingsAcknowledged,
      deviationDocumented: deviation !== null,
      chainIntegrityVerified: integrity.valid,
      rubberStampRiskLevel,
    },
    
    timeline,
    
    assessmentAnalysis: {
      firstImpression: summary.firstImpressionAssessment 
        ? `BI-RADS ${summary.firstImpressionAssessment.category}`
        : null,
      firstConfidence: summary.firstImpressionAssessment?.confidence ?? null,
      aiOutput: summary.aiFlagged !== null 
        ? (summary.aiFlagged ? 'Flagged as Suspicious' : 'Not Flagged')
        : null,
      aiScore: summary.aiScore,
      aiFlagged: summary.aiFlagged,
      finalAssessment: summary.finalAssessment 
        ? `BI-RADS ${summary.finalAssessment.category}`
        : null,
      finalConfidence: summary.finalAssessment?.confidence ?? null,
      assessmentChanged: summary.assessmentChanged,
      changeDirection: summary.changeDirection,
      agreesWithAI: summary.agreesWithAI,
    },
    
    timingAnalysis: {
      totalSessionMs: summary.totalTimeMs,
      preAITimeMs: summary.preAITimeMs,
      postAITimeMs: summary.postAITimeMs,
      preAITimeAdequate: summary.preAITimeMs >= 15000,
      postAITimeAdequate: summary.postAITimeMs >= 5000,
      timeOnImageBeforeAI: summary.preAITimeMs,
      timeOnImageAfterAI: summary.postAITimeMs,
    },
    
    deviation,
    rubberStampIndicators,
    integrity,
    rawLedger: ledger,
  };
}

function getEventLabel(entryType: string): string {
  const labels: Record<string, string> = {
    'HUMAN_FIRST_IMPRESSION': 'Independent Assessment Recorded',
    'AI_OUTPUT_EXPOSURE': 'AI Output Revealed',
    'AI_FINDING_ACKNOWLEDGED': 'AI Finding Reviewed',
    'RECONCILIATION': 'Final Assessment Recorded',
  };
  return labels[entryType] || entryType;
}

function extractEventDetails(entry: LedgerEntry): Record<string, any> {
  const details: Record<string, any> = {};
  
  if (entry.assessment) {
    details.assessment = `BI-RADS ${entry.assessment.category}`;
    details.confidence = `${entry.assessment.confidence}/5`;
  }
  
  if (entry.aiFindings) {
    details.aiScore = entry.aiFindings[0]?.score;
    details.aiFlagged = entry.aiFindings[0]?.flagged;
  }
  
  if (entry.disclosure) {
    details.disclosureFormat = entry.disclosure.format;
    details.disclosureShown = entry.disclosure.shown;
  }
  
  if (entry.deviation) {
    details.deviationReasons = entry.deviation.reasonCodes?.length || 0;
  }
  
  return details;
}

// ============================================================================
// DISPLAY COMPONENTS
// ============================================================================

interface ExpertWitnessPacketViewProps {
  packet: ExpertWitnessPacket;
  showRawLedger?: boolean;
}

export const ExpertWitnessPacketView: React.FC<ExpertWitnessPacketViewProps> = ({
  packet,
  showRawLedger = false,
}) => {
  const formatMs = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'low': return 'text-green-400 bg-green-500/10';
    }
  };

  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-purple-500/10 px-6 py-4 border-b border-purple-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Expert Witness Packet</h2>
            <p className="text-sm text-slate-400 mt-1">
              Case: {packet.caseId} • Reader: {packet.readerId}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            packet.integrity.valid 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {packet.integrity.valid ? 'Chain Verified' : 'Integrity Issue'}
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="p-6 border-b border-slate-800">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">
          Executive Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <SummaryItem
            label="Independent Judgment"
            value={packet.summary.independentJudgmentDocumented}
          />
          <SummaryItem
            label="AI Output Reviewed"
            value={packet.summary.aiOutputReviewed}
          />
          <SummaryItem
            label="All Findings Acknowledged"
            value={packet.summary.allFindingsAcknowledged}
          />
          <SummaryItem
            label="Deviation Documented"
            value={packet.summary.deviationDocumented}
            required={packet.assessmentAnalysis.agreesWithAI === false}
          />
          <SummaryItem
            label="Chain Integrity"
            value={packet.summary.chainIntegrityVerified}
          />
          <div className="p-3 rounded-lg bg-slate-800">
            <div className="text-xs text-slate-400 mb-1">Rubber-Stamp Risk</div>
            <div className={`font-semibold capitalize ${
              packet.summary.rubberStampRiskLevel === 'high' ? 'text-red-400' :
              packet.summary.rubberStampRiskLevel === 'medium' ? 'text-yellow-400' :
              'text-green-400'
            }`}>
              {packet.summary.rubberStampRiskLevel}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6 border-b border-slate-800">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">
          Event Timeline
        </h3>
        <div className="space-y-3">
          {packet.timeline.filter(e => e.isKeyEvent).map((event, idx) => (
            <div key={event.sequenceNumber} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-20 text-right">
                <div className="text-sm text-white font-mono">
                  +{formatMs(event.relativeTimeMs)}
                </div>
              </div>
              <div className="flex-shrink-0 w-3 h-3 mt-1 rounded-full bg-purple-500" />
              <div className="flex-1">
                <div className="font-medium text-white">{event.eventLabel}</div>
                <div className="text-sm text-slate-400">
                  {Object.entries(event.details).map(([k, v]) => (
                    <span key={k} className="mr-3">
                      {k}: <span className="text-slate-300">{String(v)}</span>
                    </span>
                  ))}
                </div>
                <div className="text-xs text-slate-500 font-mono mt-1">
                  Hash: {event.hash.slice(0, 24)}...
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assessment Analysis */}
      <div className="p-6 border-b border-slate-800">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">
          Assessment Analysis
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-500/10 rounded-lg">
            <div className="text-xs text-blue-400 mb-2">First Impression</div>
            <div className="text-2xl font-bold text-white">
              {packet.assessmentAnalysis.firstImpression || '—'}
            </div>
            <div className="text-sm text-slate-400">
              Confidence: {packet.assessmentAnalysis.firstConfidence || '—'}/5
            </div>
            <div className="text-xs text-blue-400 mt-2">
              (AI Not Visible)
            </div>
          </div>
          <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
            <div className="text-xs text-yellow-400 mb-2">AI Output</div>
            <div className="text-2xl font-bold text-white">
              {packet.assessmentAnalysis.aiScore ?? '—'}
            </div>
            <div className="text-sm text-slate-400">
              {packet.assessmentAnalysis.aiFlagged ? 'Flagged' : 'Not Flagged'}
            </div>
          </div>
          <div className="text-center p-4 bg-green-500/10 rounded-lg">
            <div className="text-xs text-green-400 mb-2">Final Assessment</div>
            <div className="text-2xl font-bold text-white">
              {packet.assessmentAnalysis.finalAssessment || '—'}
            </div>
            <div className="text-sm text-slate-400">
              Confidence: {packet.assessmentAnalysis.finalConfidence || '—'}/5
            </div>
            {packet.assessmentAnalysis.assessmentChanged && (
              <div className={`text-xs mt-2 ${
                packet.assessmentAnalysis.changeDirection === 'upgrade' 
                  ? 'text-orange-400' 
                  : 'text-blue-400'
              }`}>
                {packet.assessmentAnalysis.changeDirection === 'upgrade' ? '↑' : '↓'} 
                Changed ({packet.assessmentAnalysis.changeDirection})
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timing Analysis */}
      <div className="p-6 border-b border-slate-800">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">
          Timing Analysis
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TimingMetric
            label="Pre-AI Time"
            value={formatMs(packet.timingAnalysis.preAITimeMs)}
            adequate={packet.timingAnalysis.preAITimeAdequate}
            threshold="≥15s"
          />
          <TimingMetric
            label="Post-AI Time"
            value={formatMs(packet.timingAnalysis.postAITimeMs)}
            adequate={packet.timingAnalysis.postAITimeAdequate}
            threshold="≥5s"
          />
          <TimingMetric
            label="Total Session"
            value={formatMs(packet.timingAnalysis.totalSessionMs)}
            adequate={true}
          />
          <TimingMetric
            label="Pre:Post Ratio"
            value={`${(packet.timingAnalysis.preAITimeMs / Math.max(packet.timingAnalysis.postAITimeMs, 1)).toFixed(1)}:1`}
            adequate={packet.timingAnalysis.preAITimeMs > packet.timingAnalysis.postAITimeMs}
          />
        </div>
      </div>

      {/* Rubber-Stamp Indicators */}
      <div className="p-6 border-b border-slate-800">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">
          Rubber-Stamp Risk Indicators
        </h3>
        <div className="space-y-2">
          {packet.rubberStampIndicators.map((indicator, idx) => (
            <div 
              key={idx}
              className={`p-3 rounded-lg flex items-center justify-between ${
                indicator.detected ? getSeverityColor(indicator.severity) : 'bg-slate-800'
              }`}
            >
              <div>
                <div className={`font-medium ${indicator.detected ? '' : 'text-slate-400'}`}>
                  {indicator.indicator.replace(/_/g, ' ')}
                </div>
                <div className="text-sm text-slate-400">{indicator.description}</div>
              </div>
              <div className="text-right">
                <div className={`font-medium ${indicator.detected ? '' : 'text-slate-400'}`}>
                  {indicator.value}
                </div>
                {indicator.threshold && (
                  <div className="text-xs text-slate-500">{indicator.threshold}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deviation Documentation */}
      {packet.deviation && (
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">
            Deviation Documentation
          </h3>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <div className="mb-3">
              <div className="text-sm text-slate-400">Clinical Rationale</div>
              <div className="text-white">
                {packet.deviation.selectedReasonCodes
                  .map(code => DEVIATION_REASON_CODES.find(r => r.code === code)?.label)
                  .filter(Boolean)
                  .join('; ')}
              </div>
            </div>
            {packet.deviation.supportingEvidence && (
              <div className="mb-3">
                <div className="text-sm text-slate-400">Supporting Evidence</div>
                <div className="text-white">{packet.deviation.supportingEvidence}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-slate-400">Recommended Follow-up</div>
              <div className="text-white">
                {FOLLOWUP_RECOMMENDATIONS.find(r => r.code === packet.deviation!.followupRecommendation)?.label 
                  || packet.deviation.followupOther 
                  || 'Not specified'}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-orange-500/20 text-xs text-slate-400">
              AI finding acknowledged at {new Date(packet.deviation.acknowledgedTimestamp).toLocaleTimeString()}
              {packet.deviation.regionReviewed && ' • Flagged region reviewed'}
              {' • '}Completed in {(packet.deviation.timeToCompleteMs / 1000).toFixed(1)}s
            </div>
          </div>
        </div>
      )}

      {/* Methodology Statement - NON-REMOVABLE */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/50">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">
          Methodology & Limitations
        </h3>
        <p className="text-slate-400 text-sm leading-relaxed">
          {METHODOLOGY_STATEMENT}
        </p>
      </div>

      {/* Chain Integrity */}
      <div className="p-6">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">
          Chain Integrity Verification
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <IntegrityCheck label="Chain Valid" passed={packet.integrity.chainValid} />
          <IntegrityCheck label="All Hashes Valid" passed={packet.integrity.allHashesValid} />
          <IntegrityCheck label="No Gaps" passed={packet.integrity.noGapsInSequence} />
          <IntegrityCheck label="Chronological" passed={packet.integrity.chronologicalOrder} />
          <IntegrityCheck label="All Locked" passed={packet.integrity.allEntriesLocked} />
        </div>
        {packet.integrity.issues.length > 0 && (
          <div className="mt-4 p-3 bg-red-500/10 rounded-lg">
            <div className="text-red-400 font-medium mb-2">Issues Detected:</div>
            <ul className="text-sm text-red-300 space-y-1">
              {packet.integrity.issues.map((issue, i) => (
                <li key={i}>• {issue}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-800/50 px-6 py-3 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Packet ID: {packet.packetId}</span>
          <span>Generated: {new Date(packet.generatedAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

// Helper components

const SummaryItem: React.FC<{ label: string; value: boolean; required?: boolean }> = ({ 
  label, 
  value, 
  required 
}) => (
  <div className="p-3 rounded-lg bg-slate-800">
    <div className="text-xs text-slate-400 mb-1">{label}</div>
    <div className={`font-semibold ${
      value ? 'text-green-400' : required ? 'text-red-400' : 'text-slate-400'
    }`}>
      {value ? 'Yes' : required ? 'Missing' : 'No'}
    </div>
  </div>
);

const TimingMetric: React.FC<{ 
  label: string; 
  value: string; 
  adequate: boolean;
  threshold?: string;
}> = ({ label, value, adequate, threshold }) => (
  <div className="p-3 rounded-lg bg-slate-800">
    <div className="text-xs text-slate-400 mb-1">{label}</div>
    <div className={`text-lg font-semibold ${adequate ? 'text-white' : 'text-orange-400'}`}>
      {value}
    </div>
    {threshold && (
      <div className="text-xs text-slate-500">{threshold}</div>
    )}
  </div>
);

const IntegrityCheck: React.FC<{ label: string; passed: boolean }> = ({ label, passed }) => (
  <div className={`p-3 rounded-lg text-center ${
    passed ? 'bg-green-500/10' : 'bg-red-500/10'
  }`}>
    <div className={`text-lg ${passed ? 'text-green-400' : 'text-red-400'}`}>
      {passed ? 'Pass' : 'Fail'}
    </div>
    <div className="text-xs text-slate-400">{label}</div>
  </div>
);

export default ExpertWitnessPacketView;
