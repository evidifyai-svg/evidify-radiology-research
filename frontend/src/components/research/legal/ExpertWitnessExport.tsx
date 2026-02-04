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
    'AI_OUTPUT_EXPOSURE': 'AI Consultation Presented',
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

      {/* Chain Integrity Summary */}
      <div className="p-6 border-b border-slate-800">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">
          Chain Integrity Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <IntegrityCheck label="Chain Valid" passed={packet.integrity.chainValid} />
          <IntegrityCheck label="All Hashes Valid" passed={packet.integrity.allHashesValid} />
          <IntegrityCheck label="No Gaps" passed={packet.integrity.noGapsInSequence} />
          <IntegrityCheck label="Chronological" passed={packet.integrity.chronologicalOrder} />
          <IntegrityCheck label="All Locked" passed={packet.integrity.allEntriesLocked} />
        </div>
        <p className="text-sm text-slate-500 mt-3">
          See detailed temporal proof walkthrough below ↓
        </p>
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

      {/* Temporal Proof Walkthrough */}
      <TemporalProofWalkthrough
        timeline={packet.timeline}
        chainValid={packet.integrity.chainValid}
      />

      {/* Methodology Statement */}
      <div className="p-6 border-b border-slate-800">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">
          Methodology Statement
        </h3>
        <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-300 space-y-3">
          <p>
            This documentation package was generated by the Evidify Research Platform.
            Time-on-task measurements reflect system-recorded durations between logged events
            and do not account for cognitive processes occurring outside the documented interface.
          </p>
          <p>
            Hash chain verification confirms the temporal ordering and integrity of recorded events.
            It does not validate the clinical accuracy of any assessment. All timing thresholds
            referenced in this report are internal benchmarks derived from research literature and
            do not represent regulatory standards or standards of care.
          </p>
          <p>
            Workload metrics (cases per hour, session duration index) are observational measures.
            Elevated values indicate increased throughput but do not independently establish
            impairment or diminished performance.
          </p>
        </div>
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

const TemporalProofWalkthrough: React.FC<{
  timeline: TimelineEvent[];
  chainValid: boolean;
}> = ({ timeline, chainValid }) => {
  const [showTamperDemo, setShowTamperDemo] = React.useState(false);

  // Filter to key events + SESSION_START + final event, deduplicated
  const lastIdx = timeline.length - 1;
  const seen = new Set<number>();
  const displayEvents = timeline.filter((e, i) => {
    if (!(e.isKeyEvent || e.eventType === 'SESSION_START' || i === lastIdx)) return false;
    if (seen.has(e.sequenceNumber)) return false;
    seen.add(e.sequenceNumber);
    return true;
  });

  if (displayEvents.length === 0) return null;

  return (
    <div className="p-6 border-b border-slate-800">
      <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-6">
        Temporal Proof Walkthrough
      </h3>

      {/* Vertical Chain Diagram */}
      <div className="mb-8">
        {displayEvents.map((event, idx) => (
          <React.Fragment key={event.sequenceNumber}>
            {/* Event Node */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 flex justify-center">
                <div className={`rounded-full flex items-center justify-center font-bold ${
                  event.isKeyEvent
                    ? 'w-8 h-8 text-sm bg-purple-500 text-white'
                    : 'w-6 h-6 text-xs bg-slate-600 text-slate-300'
                }`}>
                  {idx + 1}
                </div>
              </div>
              <div className="flex-1">
                <div className={`font-medium ${event.isKeyEvent ? 'text-white' : 'text-slate-400 text-sm'}`}>
                  {event.eventLabel}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
                <div className="text-xs text-slate-600 font-mono mt-0.5">
                  {event.hash.slice(0, 8)}
                </div>
              </div>
            </div>

            {/* Chain Link Indicator */}
            {idx < displayEvents.length - 1 && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex-shrink-0 w-8 flex justify-center">
                  <div className="relative h-8 flex items-center justify-center">
                    <div className="absolute w-px h-full bg-slate-700" />
                    <div className={`relative z-10 w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                      chainValid
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {chainValid ? '\u2713' : '\u2717'}
                    </div>
                  </div>
                </div>
                <span className={`text-xs ${chainValid ? 'text-green-400/80' : 'text-red-400/80'}`}>
                  {chainValid
                    ? 'Hash incorporates previous step'
                    : 'Chain broken \u2014 tampering detected'}
                </span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Plain-Language Explanation */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-5 mb-6">
        <h4 className="text-sm font-semibold text-blue-400 mb-3">How This Proves the Sequence</h4>
        <div className="text-sm text-slate-300 space-y-2">
          <p>
            Each step in this documentation chain incorporates a mathematical fingerprint (hash) of
            the previous step. This means:
          </p>
          <ul className="ml-4 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">{'\u2022'}</span>
              <span>
                {"Step 2\u2019s record contains proof that Step 1 existed in its exact form before Step 2 was created"}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">{'\u2022'}</span>
              <span>
                {"If anyone altered Step 1 after the fact, Step 2\u2019s proof would no longer match \u2014 the tampering would be automatically detectable"}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">{'\u2022'}</span>
              <span>
                An independent verification tool can reconstruct this chain from raw data and confirm every link is intact
              </span>
            </li>
          </ul>
          <p className="text-slate-400 text-xs mt-3 pt-3 border-t border-blue-500/10">
            This is the same principle used in blockchain technology and is recognized as
            self-authenticating evidence under Federal Rules of Evidence 902(13)/(14) and
            Vermont statute 12 V.S.A. {'\u00A7'}1913.
          </p>
        </div>
      </div>

      {/* Tamper Detection Demo */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowTamperDemo(prev => !prev)}
          className="w-full px-4 py-3 text-left text-sm font-medium text-slate-300 hover:bg-slate-800/50 transition-colors flex items-center justify-between"
        >
          <span>See What Tampering Looks Like</span>
          <span className="text-slate-500 text-xs">{showTamperDemo ? '\u25B2' : '\u25BC'}</span>
        </button>
        {showTamperDemo && (
          <div className="px-4 pb-4 border-t border-slate-700">
            <div className="mt-4 mb-4">
              {displayEvents.slice(0, Math.min(displayEvents.length, 4)).map((event, idx) => (
                <React.Fragment key={`tamper-${event.sequenceNumber}`}>
                  {/* Tampered node */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 flex justify-center">
                      <div className={`rounded-full flex items-center justify-center font-bold text-sm ${
                        idx === 0
                          ? 'w-8 h-8 bg-red-500 text-white'
                          : 'w-8 h-8 bg-slate-700 text-slate-500'
                      }`}>
                        {idx + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${idx === 0 ? 'text-red-400' : 'text-slate-500'}`}>
                        {event.eventLabel}
                        {idx === 0 && (
                          <span className="ml-2 text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">
                            ALTERED
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono mt-0.5">
                        {idx === 0 ? (
                          <span className="text-red-400">
                            <span className="line-through opacity-50">{event.hash.slice(0, 8)}</span>
                            {' '}
                            <span>{'????????'}</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">{event.hash.slice(0, 8)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Broken chain link */}
                  {idx < Math.min(displayEvents.length, 4) - 1 && (
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex-shrink-0 w-8 flex justify-center">
                        <div className="relative h-8 flex items-center justify-center">
                          <div className="absolute w-px h-full bg-red-500/30" />
                          <div className="relative z-10 w-4 h-4 rounded-full flex items-center justify-center text-xs bg-red-500/20 text-red-400">
                            {'\u2717'}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-red-400/70">
                        Chain broken {'\u2014'} hash mismatch detected
                      </span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-sm text-slate-300">
              If the Step 1 assessment were altered after the fact, every subsequent hash link
              would fail verification. The alteration is not just detectable {'\u2014'} it is precisely
              locatable to the modified step.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpertWitnessPacketView;
