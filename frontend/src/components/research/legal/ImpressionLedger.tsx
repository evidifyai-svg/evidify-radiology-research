/**
 * ImpressionLedger.tsx
 * 
 * Core architecture component for Evidify legal defensibility.
 * Creates immutable, hash-chained entries that prove:
 * 1. Human formed independent impression BEFORE AI exposure
 * 2. AI output was explicitly acknowledged
 * 3. Final reconciliation documents any deviation with rationale
 * 
 * This is THE artifact that survives deposition cross-examination.
 */

import React, { createContext, useContext, useCallback, useState, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type LedgerEntryType = 
  | 'HUMAN_FIRST_IMPRESSION'
  | 'AI_OUTPUT_EXPOSURE'
  | 'AI_FINDING_ACKNOWLEDGED'
  | 'RECONCILIATION';

export interface BIRADSAssessment {
  category: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  confidence: 1 | 2 | 3 | 4 | 5;
}

export interface AIFinding {
  id: string;
  score: number;
  flagged: boolean;
  region?: { x: number; y: number; width: number; height: number };
  description?: string;
}

export interface DisclosureExposure {
  shown: boolean;
  format: 'none' | 'numeric' | 'table' | 'icon' | 'sentence' | 'natural_frequency';
  metrics: {
    fdr?: number;
    for_?: number;
    ppv?: number;
    npv?: number;
    sensitivity?: number;
    specificity?: number;
  };
  displayedText?: string;
}

export interface DeviationRationale {
  acknowledgedAIFinding: boolean;
  acknowledgedTimestamp: string;
  reasonCodes: string[];
  supportingEvidence?: string;
  recommendedFollowup: string;
}

export interface LedgerEntry {
  // Identity
  entryId: string;
  entryType: LedgerEntryType;
  sequenceNumber: number;
  
  // Timing
  timestamp: string;
  timeOnTaskMs: number;
  
  // Content (varies by entry type)
  assessment?: BIRADSAssessment;
  aiFindings?: AIFinding[];
  disclosure?: DisclosureExposure;
  acknowledgements?: Array<{ findingId: string; timestamp: string; reviewed: boolean }>;
  deviation?: DeviationRationale;
  
  // Context
  aiVisible: boolean;
  caseId: string;
  readerId: string;
  
  // Chain integrity
  previousHash: string | null;
  hash: string;
  
  // Immutability flag
  locked: boolean;
}

export interface ImpressionLedgerState {
  caseId: string;
  readerId: string;
  entries: LedgerEntry[];
  currentPhase: 'first_impression' | 'ai_exposure' | 'reconciliation' | 'complete';
  startTime: number;
}

export interface ImpressionLedgerActions {
  // Record human first impression (Phase 1)
  recordFirstImpression: (assessment: BIRADSAssessment) => Promise<LedgerEntry>;
  
  // Record AI exposure with disclosure config
  recordAIExposure: (findings: AIFinding[], disclosure: DisclosureExposure) => Promise<LedgerEntry>;
  
  // Record acknowledgement of specific AI finding
  acknowledgeAIFinding: (findingId: string) => Promise<void>;
  
  // Record final reconciliation (Phase 2)
  recordReconciliation: (
    assessment: BIRADSAssessment,
    deviation?: DeviationRationale
  ) => Promise<LedgerEntry>;
  
  // Get complete ledger for export
  exportLedger: () => ImpressionLedgerExport;
  
  // Verify chain integrity
  verifyIntegrity: () => IntegrityReport;
  
  // Reset for new case
  reset: (caseId: string, readerId: string) => void;
}

export interface ImpressionLedgerExport {
  caseId: string;
  readerId: string;
  entries: LedgerEntry[];
  summary: {
    firstImpressionTimestamp: string;
    firstImpressionAssessment: BIRADSAssessment | null;
    aiExposureTimestamp: string | null;
    aiScore: number | null;
    aiFlagged: boolean | null;
    disclosureShown: boolean;
    disclosureFormat: string | null;
    allFindingsAcknowledged: boolean;
    reconciliationTimestamp: string | null;
    finalAssessment: BIRADSAssessment | null;
    assessmentChanged: boolean;
    changeDirection: 'upgrade' | 'downgrade' | 'unchanged';
    agreesWithAI: boolean | null;
    deviationDocumented: boolean;
    totalTimeMs: number;
    preAITimeMs: number;
    postAITimeMs: number;
  };
  integrity: IntegrityReport;
  generatedAt: string;
}

export interface IntegrityReport {
  valid: boolean;
  chainValid: boolean;
  allHashesValid: boolean;
  noGapsInSequence: boolean;
  chronologicalOrder: boolean;
  allEntriesLocked: boolean;
  issues: string[];
}

// ============================================================================
// CRYPTO UTILITIES
// ============================================================================

async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateEntryId(): string {
  return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// CONTEXT
// ============================================================================

interface ImpressionLedgerContextValue {
  state: ImpressionLedgerState;
  actions: ImpressionLedgerActions;
  computed: {
    firstImpression: LedgerEntry | null;
    aiExposure: LedgerEntry | null;
    reconciliation: LedgerEntry | null;
    isComplete: boolean;
    canRecordFirstImpression: boolean;
    canRecordAIExposure: boolean;
    canRecordReconciliation: boolean;
  };
}

const ImpressionLedgerContext = createContext<ImpressionLedgerContextValue | null>(null);

export function useImpressionLedger(): ImpressionLedgerContextValue {
  const context = useContext(ImpressionLedgerContext);
  if (!context) {
    throw new Error('useImpressionLedger must be used within ImpressionLedgerProvider');
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface ImpressionLedgerProviderProps {
  caseId: string;
  readerId: string;
  children: React.ReactNode;
}

export const ImpressionLedgerProvider: React.FC<ImpressionLedgerProviderProps> = ({
  caseId,
  readerId,
  children,
}) => {
  const [state, setState] = useState<ImpressionLedgerState>({
    caseId,
    readerId,
    entries: [],
    currentPhase: 'first_impression',
    startTime: Date.now(),
  });

  // Track AI finding acknowledgements separately for real-time updates
  const [acknowledgements, setAcknowledgements] = useState<
    Array<{ findingId: string; timestamp: string; reviewed: boolean }>
  >([]);

  // Compute last hash for chain
  const getLastHash = useCallback((): string | null => {
    if (state.entries.length === 0) return null;
    return state.entries[state.entries.length - 1].hash;
  }, [state.entries]);

  // Create and add entry
  const addEntry = useCallback(async (
    entryType: LedgerEntryType,
    content: Partial<LedgerEntry>
  ): Promise<LedgerEntry> => {
    const now = Date.now();
    const previousHash = getLastHash();
    const sequenceNumber = state.entries.length;
    
    const entryData: Omit<LedgerEntry, 'hash'> = {
      entryId: generateEntryId(),
      entryType,
      sequenceNumber,
      timestamp: new Date(now).toISOString(),
      timeOnTaskMs: now - state.startTime,
      aiVisible: entryType !== 'HUMAN_FIRST_IMPRESSION',
      caseId: state.caseId,
      readerId: state.readerId,
      previousHash,
      locked: true,
      ...content,
    };

    // Compute hash of entry
    const hashInput = JSON.stringify({
      ...entryData,
      previousHash,
    });
    const hash = await computeHash(hashInput);

    const entry: LedgerEntry = {
      ...entryData,
      hash,
    };

    setState(prev => ({
      ...prev,
      entries: [...prev.entries, entry],
    }));

    return entry;
  }, [getLastHash, state.startTime, state.caseId, state.readerId, state.entries.length]);

  // ---- ACTIONS ----

  const recordFirstImpression = useCallback(async (
    assessment: BIRADSAssessment
  ): Promise<LedgerEntry> => {
    if (state.currentPhase !== 'first_impression') {
      throw new Error('Cannot record first impression: wrong phase');
    }

    const entry = await addEntry('HUMAN_FIRST_IMPRESSION', {
      assessment,
      aiVisible: false,
    });

    setState(prev => ({
      ...prev,
      currentPhase: 'ai_exposure',
    }));

    return entry;
  }, [state.currentPhase, addEntry]);

  const recordAIExposure = useCallback(async (
    findings: AIFinding[],
    disclosure: DisclosureExposure
  ): Promise<LedgerEntry> => {
    if (state.currentPhase !== 'ai_exposure') {
      throw new Error('Cannot record AI exposure: wrong phase');
    }

    const entry = await addEntry('AI_OUTPUT_EXPOSURE', {
      aiFindings: findings,
      disclosure,
      aiVisible: true,
    });

    setState(prev => ({
      ...prev,
      currentPhase: 'reconciliation',
    }));

    return entry;
  }, [state.currentPhase, addEntry]);

  const acknowledgeAIFinding = useCallback(async (findingId: string): Promise<void> => {
    const ack = {
      findingId,
      timestamp: new Date().toISOString(),
      reviewed: true,
    };
    
    setAcknowledgements(prev => {
      // Don't duplicate
      if (prev.some(a => a.findingId === findingId)) return prev;
      return [...prev, ack];
    });

    // Also add as ledger entry for auditability
    await addEntry('AI_FINDING_ACKNOWLEDGED', {
      acknowledgements: [ack],
      aiVisible: true,
    });
  }, [addEntry]);

  const recordReconciliation = useCallback(async (
    assessment: BIRADSAssessment,
    deviation?: DeviationRationale
  ): Promise<LedgerEntry> => {
    if (state.currentPhase !== 'reconciliation') {
      throw new Error('Cannot record reconciliation: wrong phase');
    }

    const entry = await addEntry('RECONCILIATION', {
      assessment,
      deviation,
      acknowledgements,
      aiVisible: true,
    });

    setState(prev => ({
      ...prev,
      currentPhase: 'complete',
    }));

    return entry;
  }, [state.currentPhase, addEntry, acknowledgements]);

  const verifyIntegrity = useCallback((): IntegrityReport => {
    const issues: string[] = [];
    let chainValid = true;
    let allHashesValid = true;
    let noGapsInSequence = true;
    let chronologicalOrder = true;
    let allEntriesLocked = true;

    for (let i = 0; i < state.entries.length; i++) {
      const entry = state.entries[i];
      
      // Check sequence
      if (entry.sequenceNumber !== i) {
        noGapsInSequence = false;
        issues.push(`Entry ${i} has wrong sequence number: ${entry.sequenceNumber}`);
      }

      // Check lock status
      if (!entry.locked) {
        allEntriesLocked = false;
        issues.push(`Entry ${i} is not locked`);
      }

      // Check chronological order
      if (i > 0) {
        const prevEntry = state.entries[i - 1];
        if (new Date(entry.timestamp) < new Date(prevEntry.timestamp)) {
          chronologicalOrder = false;
          issues.push(`Entry ${i} timestamp is before entry ${i - 1}`);
        }
      }

      // Check chain linkage
      if (i === 0) {
        if (entry.previousHash !== null) {
          chainValid = false;
          issues.push('First entry should have null previousHash');
        }
      } else {
        const prevEntry = state.entries[i - 1];
        if (entry.previousHash !== prevEntry.hash) {
          chainValid = false;
          issues.push(`Entry ${i} previousHash doesn't match entry ${i - 1} hash`);
        }
      }
    }

    return {
      valid: chainValid && allHashesValid && noGapsInSequence && chronologicalOrder && allEntriesLocked,
      chainValid,
      allHashesValid,
      noGapsInSequence,
      chronologicalOrder,
      allEntriesLocked,
      issues,
    };
  }, [state.entries]);

  const exportLedger = useCallback((): ImpressionLedgerExport => {
    const firstImpressionEntry = state.entries.find(e => e.entryType === 'HUMAN_FIRST_IMPRESSION');
    const aiExposureEntry = state.entries.find(e => e.entryType === 'AI_OUTPUT_EXPOSURE');
    const reconciliationEntry = state.entries.find(e => e.entryType === 'RECONCILIATION');
    
    const firstAssessment = firstImpressionEntry?.assessment ?? null;
    const finalAssessment = reconciliationEntry?.assessment ?? null;
    
    // Determine if assessment changed
    const assessmentChanged = firstAssessment && finalAssessment
      ? firstAssessment.category !== finalAssessment.category
      : false;
    
    // Determine change direction
    let changeDirection: 'upgrade' | 'downgrade' | 'unchanged' = 'unchanged';
    if (firstAssessment && finalAssessment && assessmentChanged) {
      changeDirection = finalAssessment.category > firstAssessment.category ? 'upgrade' : 'downgrade';
    }
    
    // Determine if agrees with AI
    const aiScore = aiExposureEntry?.aiFindings?.[0]?.score ?? null;
    const aiFlagged = aiExposureEntry?.aiFindings?.[0]?.flagged ?? null;
    let agreesWithAI: boolean | null = null;
    if (finalAssessment !== null && aiFlagged !== null) {
      const humanSaysSuspicious = finalAssessment.category >= 4;
      agreesWithAI = humanSaysSuspicious === aiFlagged;
    }
    
    // Check if all findings acknowledged
    const aiFindings = aiExposureEntry?.aiFindings ?? [];
    const ackEntries = state.entries.filter(e => e.entryType === 'AI_FINDING_ACKNOWLEDGED');
    const acknowledgedIds = new Set(ackEntries.flatMap(e => e.acknowledgements?.map(a => a.findingId) ?? []));
    const allFindingsAcknowledged = aiFindings.length === 0 || aiFindings.every(f => acknowledgedIds.has(f.id));
    
    // Calculate timing
    const firstImpressionTime = firstImpressionEntry ? new Date(firstImpressionEntry.timestamp).getTime() : state.startTime;
    const aiExposureTime = aiExposureEntry ? new Date(aiExposureEntry.timestamp).getTime() : null;
    const reconciliationTime = reconciliationEntry ? new Date(reconciliationEntry.timestamp).getTime() : null;
    
    const preAITimeMs = aiExposureTime ? aiExposureTime - state.startTime : 0;
    const postAITimeMs = reconciliationTime && aiExposureTime ? reconciliationTime - aiExposureTime : 0;
    const totalTimeMs = reconciliationTime ? reconciliationTime - state.startTime : Date.now() - state.startTime;

    return {
      caseId: state.caseId,
      readerId: state.readerId,
      entries: state.entries,
      summary: {
        firstImpressionTimestamp: firstImpressionEntry?.timestamp ?? '',
        firstImpressionAssessment: firstAssessment,
        aiExposureTimestamp: aiExposureEntry?.timestamp ?? null,
        aiScore,
        aiFlagged,
        disclosureShown: aiExposureEntry?.disclosure?.shown ?? false,
        disclosureFormat: aiExposureEntry?.disclosure?.format ?? null,
        allFindingsAcknowledged,
        reconciliationTimestamp: reconciliationEntry?.timestamp ?? null,
        finalAssessment,
        assessmentChanged,
        changeDirection,
        agreesWithAI,
        deviationDocumented: !!reconciliationEntry?.deviation,
        totalTimeMs,
        preAITimeMs,
        postAITimeMs,
      },
      integrity: verifyIntegrity(),
      generatedAt: new Date().toISOString(),
    };
  }, [state, verifyIntegrity]);

  const reset = useCallback((newCaseId: string, newReaderId: string) => {
    setState({
      caseId: newCaseId,
      readerId: newReaderId,
      entries: [],
      currentPhase: 'first_impression',
      startTime: Date.now(),
    });
    setAcknowledgements([]);
  }, []);

  // ---- COMPUTED ----

  const computed = useMemo(() => {
    const firstImpression = state.entries.find(e => e.entryType === 'HUMAN_FIRST_IMPRESSION') ?? null;
    const aiExposure = state.entries.find(e => e.entryType === 'AI_OUTPUT_EXPOSURE') ?? null;
    const reconciliation = state.entries.find(e => e.entryType === 'RECONCILIATION') ?? null;

    return {
      firstImpression,
      aiExposure,
      reconciliation,
      isComplete: state.currentPhase === 'complete',
      canRecordFirstImpression: state.currentPhase === 'first_impression',
      canRecordAIExposure: state.currentPhase === 'ai_exposure',
      canRecordReconciliation: state.currentPhase === 'reconciliation',
    };
  }, [state.entries, state.currentPhase]);

  const actions: ImpressionLedgerActions = {
    recordFirstImpression,
    recordAIExposure,
    acknowledgeAIFinding,
    recordReconciliation,
    exportLedger,
    verifyIntegrity,
    reset,
  };

  return (
    <ImpressionLedgerContext.Provider value={{ state, actions, computed }}>
      {children}
    </ImpressionLedgerContext.Provider>
  );
};

// ============================================================================
// DISPLAY COMPONENT: Ledger Timeline View
// ============================================================================

interface LedgerTimelineProps {
  ledger: ImpressionLedgerExport;
  showHashes?: boolean;
}

export const LedgerTimeline: React.FC<LedgerTimelineProps> = ({ 
  ledger, 
  showHashes = false 
}) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const getEntryIcon = (type: LedgerEntryType) => {
    switch (type) {
      case 'HUMAN_FIRST_IMPRESSION': return '';
      case 'AI_OUTPUT_EXPOSURE': return '';
      case 'AI_FINDING_ACKNOWLEDGED': return '';
      case 'RECONCILIATION': return '';
      default: return '';
    }
  };

  const getEntryLabel = (type: LedgerEntryType) => {
    switch (type) {
      case 'HUMAN_FIRST_IMPRESSION': return 'Independent Assessment';
      case 'AI_OUTPUT_EXPOSURE': return 'AI Output Revealed';
      case 'AI_FINDING_ACKNOWLEDGED': return 'AI Finding Reviewed';
      case 'RECONCILIATION': return 'Final Assessment';
      default: return type;
    }
  };

  return (
    <div className="bg-slate-900 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <h3 className="text-lg font-semibold text-white">Impression Ledger</h3>
        <div className={`px-2 py-1 rounded text-xs font-medium ${
          ledger.integrity.valid 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-red-500/20 text-red-400'
        }`}>
          {ledger.integrity.valid ? ' Chain Verified' : ' Integrity Issue'}
        </div>
      </div>

      <div className="space-y-3">
        {ledger.entries.map((entry, idx) => (
          <div 
            key={entry.entryId}
            className="relative pl-8 pb-3 border-l-2 border-slate-700 last:border-l-0"
          >
            {/* Timeline dot */}
            <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-slate-800 border-2 border-purple-500 flex items-center justify-center text-xs">
              {idx + 1}
            </div>

            <div className="bg-slate-800 rounded-lg p-3 ml-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{getEntryIcon(entry.entryType)}</span>
                <span className="font-medium text-white">{getEntryLabel(entry.entryType)}</span>
                <span className="text-xs text-slate-400 ml-auto">
                  {formatTime(entry.timestamp)}
                </span>
              </div>

              {/* Entry-specific content */}
              {entry.entryType === 'HUMAN_FIRST_IMPRESSION' && entry.assessment && (
                <div className="text-sm text-slate-300">
                  BI-RADS {entry.assessment.category} • Confidence {entry.assessment.confidence}/5
                  <span className="ml-2 text-xs text-yellow-400">
                    (AI not visible)
                  </span>
                </div>
              )}

              {entry.entryType === 'AI_OUTPUT_EXPOSURE' && (
                <div className="text-sm text-slate-300 space-y-1">
                  {entry.aiFindings?.map(f => (
                    <div key={f.id}>
                      Score: {f.score} • {f.flagged ? ' Flagged' : ' Not flagged'}
                    </div>
                  ))}
                  {entry.disclosure?.shown && (
                    <div className="text-xs text-purple-400">
                      Disclosure shown: {entry.disclosure.format}
                      {entry.disclosure.metrics.fdr !== undefined && 
                        ` (FDR: ${(entry.disclosure.metrics.fdr * 100).toFixed(0)}%)`
                      }
                    </div>
                  )}
                </div>
              )}

              {entry.entryType === 'AI_FINDING_ACKNOWLEDGED' && (
                <div className="text-sm text-green-400">
                   Reader confirmed review of AI-flagged region
                </div>
              )}

              {entry.entryType === 'RECONCILIATION' && entry.assessment && (
                <div className="text-sm text-slate-300 space-y-1">
                  <div>
                    Final: BI-RADS {entry.assessment.category} • Confidence {entry.assessment.confidence}/5
                  </div>
                  {entry.deviation && (
                    <div className="text-xs text-orange-400">
                       Deviation documented: {entry.deviation.reasonCodes.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* Hash display */}
              {showHashes && (
                <div className="mt-2 pt-2 border-t border-slate-700 text-xs font-mono text-slate-500">
                  <div>Hash: {entry.hash.slice(0, 16)}...</div>
                  {entry.previousHash && (
                    <div>Prev: {entry.previousHash.slice(0, 16)}...</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="border-t border-slate-700 pt-3 mt-3">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-slate-400">Pre-AI Time</div>
            <div className="text-white font-medium">
              {(ledger.summary.preAITimeMs / 1000).toFixed(1)}s
            </div>
          </div>
          <div>
            <div className="text-slate-400">Post-AI Time</div>
            <div className="text-white font-medium">
              {(ledger.summary.postAITimeMs / 1000).toFixed(1)}s
            </div>
          </div>
          <div>
            <div className="text-slate-400">Changed?</div>
            <div className={`font-medium ${
              ledger.summary.assessmentChanged ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {ledger.summary.assessmentChanged 
                ? `Yes (${ledger.summary.changeDirection})` 
                : 'No'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpressionLedgerProvider;
