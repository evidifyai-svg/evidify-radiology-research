/**
 * ImpressionLedger.tsx
 * 
 * Core architecture component for Evidify legal defensibility.
 * Creates an immutable, hash-chained ledger with three entries:
 * 
 * 1. HUMAN_FIRST_IMPRESSION - Assessment before AI exposure (locked)
 * 2. AI_OUTPUT_EXPOSURE - What AI showed and when (immutable record)
 * 3. RECONCILIATION - Final assessment with deviation documentation if applicable
 * 
 * This architecture proves independent judgment without "interpretability theater."
 */

import React, { createContext, useContext, useCallback, useReducer } from 'react';

// ============================================================================
// CRYPTOGRAPHIC UTILITIES
// ============================================================================

async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// TYPES
// ============================================================================

export type LedgerEntryType = 
  | 'HUMAN_FIRST_IMPRESSION'
  | 'AI_OUTPUT_EXPOSURE'
  | 'RECONCILIATION';

export interface DeviationRationale {
  reviewedFlaggedRegion: boolean;
  reviewedTimestamp: string;
  reasons: {
    normalAnatomicalVariant: boolean;
    unchangedFromPrior: boolean;
    clinicalHistoryContradicts: boolean;
    technicalQualityFactors: boolean;
    noReportableFinding: boolean;
    other: string | null;
  };
  supportingEvidence: string | null;
  recommendedFollowup: 
    | 'routine_screening'
    | 'short_interval_6mo'
    | 'additional_imaging'
    | 'other';
  followupOther: string | null;
}

export interface DisclosureExposure {
  shown: boolean;
  format: 'none' | 'numeric' | 'table' | 'icon' | 'sentence' | 'natural_frequency';
  fdr: number | null;
  for_: number | null;
  ppv: number | null;
  npv: number | null;
  sensitivity: number | null;
  specificity: number | null;
  customText: string | null;
}

export interface AIRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label?: string;
}

export interface AIAcknowledgement {
  regionId: string;
  viewed: boolean;
  viewedTimestamp: string | null;
  dwellTimeMs: number;
}

// Entry 1: Human First Impression
export interface HumanFirstImpressionEntry {
  type: 'HUMAN_FIRST_IMPRESSION';
  timestamp: string;
  caseId: string;
  readerId: string;
  
  // Assessment
  assessment: string; // e.g., "birads_3"
  confidence: number; // 1-5
  
  // Timing
  timeOnTaskMs: number;
  imageLoadTimestamp: string;
  
  // Verification
  aiVisible: false; // Always false for this entry
  
  // Hash chain
  hash: string;
  locked: boolean;
}

// Entry 2: AI Output Exposure
export interface AIOutputExposureEntry {
  type: 'AI_OUTPUT_EXPOSURE';
  timestamp: string;
  caseId: string;
  readerId: string;
  
  // AI Output
  aiScore: number;
  aiFlagged: boolean;
  aiAssessment: string | null; // AI's suggested BI-RADS if available
  aiRegions: AIRegion[];
  
  // Disclosure shown
  disclosure: DisclosureExposure;
  
  // Acknowledgements (per region)
  acknowledgements: AIAcknowledgement[];
  
  // Hash chain
  previousHash: string;
  hash: string;
}

// Entry 3: Reconciliation / Final Impression
export interface ReconciliationEntry {
  type: 'RECONCILIATION';
  timestamp: string;
  caseId: string;
  readerId: string;
  
  // Final Assessment
  assessment: string;
  confidence: number;
  
  // Change tracking
  changedFromFirst: boolean;
  changeDirection: 'upgrade' | 'downgrade' | 'unchanged';
  agreesWithAI: boolean;
  
  // Deviation documentation (required if disagrees with AI)
  deviationRationale: DeviationRationale | null;
  
  // Timing
  timeOnTaskMs: number;
  
  // Hash chain
  previousHash: string;
  hash: string;
}

export type LedgerEntry = 
  | HumanFirstImpressionEntry 
  | AIOutputExposureEntry 
  | ReconciliationEntry;

export interface ImpressionLedgerState {
  caseId: string;
  readerId: string;
  entries: LedgerEntry[];
  currentPhase: 'first_impression' | 'ai_exposure' | 'reconciliation' | 'complete';
  isValid: boolean;
  validationErrors: string[];
}

// ============================================================================
// LEDGER ACTIONS
// ============================================================================

type LedgerAction =
  | { type: 'INITIALIZE'; caseId: string; readerId: string }
  | { type: 'LOCK_FIRST_IMPRESSION'; entry: HumanFirstImpressionEntry }
  | { type: 'RECORD_AI_EXPOSURE'; entry: AIOutputExposureEntry }
  | { type: 'RECORD_RECONCILIATION'; entry: ReconciliationEntry }
  | { type: 'RESET' };

function ledgerReducer(state: ImpressionLedgerState, action: LedgerAction): ImpressionLedgerState {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        caseId: action.caseId,
        readerId: action.readerId,
        entries: [],
        currentPhase: 'first_impression',
        isValid: true,
        validationErrors: [],
      };
    
    case 'LOCK_FIRST_IMPRESSION':
      if (state.currentPhase !== 'first_impression') {
        return {
          ...state,
          isValid: false,
          validationErrors: [...state.validationErrors, 'Cannot lock first impression: wrong phase'],
        };
      }
      return {
        ...state,
        entries: [...state.entries, action.entry],
        currentPhase: 'ai_exposure',
      };
    
    case 'RECORD_AI_EXPOSURE':
      if (state.currentPhase !== 'ai_exposure') {
        return {
          ...state,
          isValid: false,
          validationErrors: [...state.validationErrors, 'Cannot record AI exposure: wrong phase'],
        };
      }
      return {
        ...state,
        entries: [...state.entries, action.entry],
        currentPhase: 'reconciliation',
      };
    
    case 'RECORD_RECONCILIATION':
      if (state.currentPhase !== 'reconciliation') {
        return {
          ...state,
          isValid: false,
          validationErrors: [...state.validationErrors, 'Cannot record reconciliation: wrong phase'],
        };
      }
      return {
        ...state,
        entries: [...state.entries, action.entry],
        currentPhase: 'complete',
      };
    
    case 'RESET':
      return {
        caseId: '',
        readerId: '',
        entries: [],
        currentPhase: 'first_impression',
        isValid: true,
        validationErrors: [],
      };
    
    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface ImpressionLedgerContextType {
  state: ImpressionLedgerState;
  
  // Actions
  initialize: (caseId: string, readerId: string) => void;
  lockFirstImpression: (assessment: string, confidence: number, timeOnTaskMs: number, imageLoadTimestamp: string) => Promise<void>;
  recordAIExposure: (
    aiScore: number,
    aiFlagged: boolean,
    aiAssessment: string | null,
    aiRegions: AIRegion[],
    disclosure: DisclosureExposure
  ) => Promise<void>;
  acknowledgeAIRegion: (regionId: string, dwellTimeMs: number) => void;
  recordReconciliation: (
    assessment: string,
    confidence: number,
    timeOnTaskMs: number,
    deviationRationale: DeviationRationale | null
  ) => Promise<void>;
  reset: () => void;
  
  // Queries
  getFirstImpression: () => HumanFirstImpressionEntry | null;
  getAIExposure: () => AIOutputExposureEntry | null;
  getReconciliation: () => ReconciliationEntry | null;
  validateChain: () => Promise<{ valid: boolean; errors: string[] }>;
  exportLedger: () => LedgerExport;
}

const ImpressionLedgerContext = createContext<ImpressionLedgerContextType | null>(null);

// ============================================================================
// EXPORT FORMAT
// ============================================================================

export interface LedgerExport {
  version: '1.0';
  exportedAt: string;
  caseId: string;
  readerId: string;
  
  // The three entries
  humanFirstImpression: HumanFirstImpressionEntry | null;
  aiOutputExposure: AIOutputExposureEntry | null;
  reconciliation: ReconciliationEntry | null;
  
  // Derived metrics
  metrics: {
    independentAssessmentProven: boolean;
    timeBeforeAIExposureMs: number | null;
    assessmentChanged: boolean;
    changeDirection: 'upgrade' | 'downgrade' | 'unchanged';
    agreesWithAI: boolean;
    deviationDocumented: boolean;
    allRegionsAcknowledged: boolean;
    chainValid: boolean;
    chainHash: string | null;
  };
  
  // Raw entries for verification
  entries: LedgerEntry[];
}

// ============================================================================
// PROVIDER
// ============================================================================

const initialState: ImpressionLedgerState = {
  caseId: '',
  readerId: '',
  entries: [],
  currentPhase: 'first_impression',
  isValid: true,
  validationErrors: [],
};

export const ImpressionLedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(ledgerReducer, initialState);
  
  // Track acknowledgements separately (mutable until AI exposure is recorded)
  const [pendingAcknowledgements, setPendingAcknowledgements] = React.useState<AIAcknowledgement[]>([]);
  
  const initialize = useCallback((caseId: string, readerId: string) => {
    dispatch({ type: 'INITIALIZE', caseId, readerId });
    setPendingAcknowledgements([]);
  }, []);
  
  const lockFirstImpression = useCallback(async (
    assessment: string,
    confidence: number,
    timeOnTaskMs: number,
    imageLoadTimestamp: string
  ) => {
    const timestamp = new Date().toISOString();
    
    const entryData = {
      type: 'HUMAN_FIRST_IMPRESSION' as const,
      timestamp,
      caseId: state.caseId,
      readerId: state.readerId,
      assessment,
      confidence,
      timeOnTaskMs,
      imageLoadTimestamp,
      aiVisible: false as const,
      locked: true,
    };
    
    const hash = await computeHash(JSON.stringify(entryData));
    
    const entry: HumanFirstImpressionEntry = {
      ...entryData,
      hash,
    };
    
    dispatch({ type: 'LOCK_FIRST_IMPRESSION', entry });
  }, [state.caseId, state.readerId]);
  
  const recordAIExposure = useCallback(async (
    aiScore: number,
    aiFlagged: boolean,
    aiAssessment: string | null,
    aiRegions: AIRegion[],
    disclosure: DisclosureExposure
  ) => {
    const timestamp = new Date().toISOString();
    const previousEntry = state.entries[state.entries.length - 1];
    
    if (!previousEntry || previousEntry.type !== 'HUMAN_FIRST_IMPRESSION') {
      throw new Error('Cannot record AI exposure without locked first impression');
    }
    
    const entryData = {
      type: 'AI_OUTPUT_EXPOSURE' as const,
      timestamp,
      caseId: state.caseId,
      readerId: state.readerId,
      aiScore,
      aiFlagged,
      aiAssessment,
      aiRegions,
      disclosure,
      acknowledgements: pendingAcknowledgements,
      previousHash: previousEntry.hash,
    };
    
    const hash = await computeHash(JSON.stringify(entryData));
    
    const entry: AIOutputExposureEntry = {
      ...entryData,
      hash,
    };
    
    dispatch({ type: 'RECORD_AI_EXPOSURE', entry });
  }, [state.caseId, state.readerId, state.entries, pendingAcknowledgements]);
  
  const acknowledgeAIRegion = useCallback((regionId: string, dwellTimeMs: number) => {
    setPendingAcknowledgements(prev => {
      const existing = prev.find(a => a.regionId === regionId);
      if (existing) {
        return prev.map(a => 
          a.regionId === regionId 
            ? { ...a, viewed: true, viewedTimestamp: new Date().toISOString(), dwellTimeMs: a.dwellTimeMs + dwellTimeMs }
            : a
        );
      }
      return [...prev, {
        regionId,
        viewed: true,
        viewedTimestamp: new Date().toISOString(),
        dwellTimeMs,
      }];
    });
  }, []);
  
  const recordReconciliation = useCallback(async (
    assessment: string,
    confidence: number,
    timeOnTaskMs: number,
    deviationRationale: DeviationRationale | null
  ) => {
    const timestamp = new Date().toISOString();
    const previousEntry = state.entries[state.entries.length - 1];
    const firstImpression = state.entries[0] as HumanFirstImpressionEntry;
    const aiExposure = state.entries[1] as AIOutputExposureEntry;
    
    if (!previousEntry || previousEntry.type !== 'AI_OUTPUT_EXPOSURE') {
      throw new Error('Cannot record reconciliation without AI exposure');
    }
    
    // Determine if assessment changed
    const changedFromFirst = assessment !== firstImpression.assessment;
    
    // Determine change direction (based on BI-RADS)
    const firstBirads = parseInt(firstImpression.assessment.replace('birads_', ''));
    const finalBirads = parseInt(assessment.replace('birads_', ''));
    const changeDirection: 'upgrade' | 'downgrade' | 'unchanged' = 
      finalBirads > firstBirads ? 'upgrade' :
      finalBirads < firstBirads ? 'downgrade' : 'unchanged';
    
    // Determine if agrees with AI
    const agreesWithAI = aiExposure.aiFlagged 
      ? finalBirads >= 4  // AI flagged, reader says suspicious
      : finalBirads < 4;  // AI didn't flag, reader says benign
    
    const entryData = {
      type: 'RECONCILIATION' as const,
      timestamp,
      caseId: state.caseId,
      readerId: state.readerId,
      assessment,
      confidence,
      changedFromFirst,
      changeDirection,
      agreesWithAI,
      deviationRationale,
      timeOnTaskMs,
      previousHash: previousEntry.hash,
    };
    
    const hash = await computeHash(JSON.stringify(entryData));
    
    const entry: ReconciliationEntry = {
      ...entryData,
      hash,
    };
    
    dispatch({ type: 'RECORD_RECONCILIATION', entry });
  }, [state.caseId, state.readerId, state.entries]);
  
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    setPendingAcknowledgements([]);
  }, []);
  
  const getFirstImpression = useCallback((): HumanFirstImpressionEntry | null => {
    const entry = state.entries.find(e => e.type === 'HUMAN_FIRST_IMPRESSION');
    return entry as HumanFirstImpressionEntry | null;
  }, [state.entries]);
  
  const getAIExposure = useCallback((): AIOutputExposureEntry | null => {
    const entry = state.entries.find(e => e.type === 'AI_OUTPUT_EXPOSURE');
    return entry as AIOutputExposureEntry | null;
  }, [state.entries]);
  
  const getReconciliation = useCallback((): ReconciliationEntry | null => {
    const entry = state.entries.find(e => e.type === 'RECONCILIATION');
    return entry as ReconciliationEntry | null;
  }, [state.entries]);
  
  const validateChain = useCallback(async (): Promise<{ valid: boolean; errors: string[] }> => {
    const errors: string[] = [];
    
    if (state.entries.length === 0) {
      return { valid: true, errors: [] };
    }
    
    // Validate first entry has no previous hash
    const first = state.entries[0];
    if (first.type !== 'HUMAN_FIRST_IMPRESSION') {
      errors.push('First entry must be HUMAN_FIRST_IMPRESSION');
    }
    
    // Validate hash chain
    for (let i = 1; i < state.entries.length; i++) {
      const current = state.entries[i];
      const previous = state.entries[i - 1];
      
      if ('previousHash' in current && current.previousHash !== previous.hash) {
        errors.push(`Hash chain broken at entry ${i}: previousHash doesn't match`);
      }
      
      // Verify hash integrity
      const { hash, ...dataWithoutHash } = current;
      const computedHash = await computeHash(JSON.stringify(dataWithoutHash));
      if (computedHash !== hash) {
        errors.push(`Hash integrity failed at entry ${i}`);
      }
    }
    
    // Validate sequence
    const expectedSequence: LedgerEntryType[] = ['HUMAN_FIRST_IMPRESSION', 'AI_OUTPUT_EXPOSURE', 'RECONCILIATION'];
    for (let i = 0; i < state.entries.length; i++) {
      if (state.entries[i].type !== expectedSequence[i]) {
        errors.push(`Entry ${i} should be ${expectedSequence[i]}, found ${state.entries[i].type}`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }, [state.entries]);
  
  const exportLedger = useCallback((): LedgerExport => {
    const firstImpression = getFirstImpression();
    const aiExposure = getAIExposure();
    const reconciliation = getReconciliation();
    
    const lastEntry = state.entries[state.entries.length - 1];
    
    // Check if all AI regions were acknowledged
    const allRegionsAcknowledged = aiExposure 
      ? aiExposure.aiRegions.every(region => 
          aiExposure.acknowledgements.some(a => a.regionId === region.id && a.viewed)
        )
      : true;
    
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      caseId: state.caseId,
      readerId: state.readerId,
      
      humanFirstImpression: firstImpression,
      aiOutputExposure: aiExposure,
      reconciliation: reconciliation,
      
      metrics: {
        independentAssessmentProven: firstImpression?.locked === true && firstImpression.aiVisible === false,
        timeBeforeAIExposureMs: firstImpression?.timeOnTaskMs ?? null,
        assessmentChanged: reconciliation?.changedFromFirst ?? false,
        changeDirection: reconciliation?.changeDirection ?? 'unchanged',
        agreesWithAI: reconciliation?.agreesWithAI ?? true,
        deviationDocumented: reconciliation?.deviationRationale !== null,
        allRegionsAcknowledged,
        chainValid: state.isValid,
        chainHash: lastEntry?.hash ?? null,
      },
      
      entries: state.entries,
    };
  }, [state, getFirstImpression, getAIExposure, getReconciliation]);
  
  const contextValue: ImpressionLedgerContextType = {
    state,
    initialize,
    lockFirstImpression,
    recordAIExposure,
    acknowledgeAIRegion,
    recordReconciliation,
    reset,
    getFirstImpression,
    getAIExposure,
    getReconciliation,
    validateChain,
    exportLedger,
  };
  
  return (
    <ImpressionLedgerContext.Provider value={contextValue}>
      {children}
    </ImpressionLedgerContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================

export function useImpressionLedger(): ImpressionLedgerContextType {
  const context = useContext(ImpressionLedgerContext);
  if (!context) {
    throw new Error('useImpressionLedger must be used within ImpressionLedgerProvider');
  }
  return context;
}

// ============================================================================
// DISPLAY COMPONENT (for debugging / demo)
// ============================================================================

export const ImpressionLedgerDisplay: React.FC = () => {
  const { state, validateChain, exportLedger } = useImpressionLedger();
  const [validationResult, setValidationResult] = React.useState<{ valid: boolean; errors: string[] } | null>(null);
  
  const handleValidate = async () => {
    const result = await validateChain();
    setValidationResult(result);
  };
  
  return (
    <div className="bg-slate-900 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Impression Ledger</h3>
        <span className={`px-3 py-1 rounded-full text-sm ${
          state.currentPhase === 'complete' ? 'bg-green-500/20 text-green-400' :
          state.currentPhase === 'first_impression' ? 'bg-blue-500/20 text-blue-400' :
          state.currentPhase === 'ai_exposure' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-purple-500/20 text-purple-400'
        }`}>
          {state.currentPhase.replace('_', ' ').toUpperCase()}
        </span>
      </div>
      
      <div className="space-y-3">
        {state.entries.map((entry, index) => (
          <div key={index} className={`p-4 rounded-lg border ${
            entry.type === 'HUMAN_FIRST_IMPRESSION' ? 'border-blue-500/50 bg-blue-500/10' :
            entry.type === 'AI_OUTPUT_EXPOSURE' ? 'border-yellow-500/50 bg-yellow-500/10' :
            'border-green-500/50 bg-green-500/10'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">
                Entry {index + 1}: {entry.type.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {entry.hash.substring(0, 16)}...
              </span>
            </div>
            
            <div className="text-sm text-slate-300">
              <div>Timestamp: {entry.timestamp}</div>
              {'assessment' in entry && <div>Assessment: {entry.assessment}</div>}
              {'aiScore' in entry && <div>AI Score: {entry.aiScore}</div>}
              {'changedFromFirst' in entry && (
                <div>Changed: {entry.changedFromFirst ? 'Yes' : 'No'} ({entry.changeDirection})</div>
              )}
            </div>
          </div>
        ))}
        
        {state.entries.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            No entries yet. Waiting for first impression.
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={handleValidate}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white"
        >
          Validate Chain
        </button>
        <button
          onClick={() => console.log(exportLedger())}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white"
        >
          Export (Console)
        </button>
      </div>
      
      {validationResult && (
        <div className={`p-3 rounded ${validationResult.valid ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          <div className={`font-medium ${validationResult.valid ? 'text-green-400' : 'text-red-400'}`}>
            {validationResult.valid ? '✓ Chain Valid' : '✗ Chain Invalid'}
          </div>
          {validationResult.errors.length > 0 && (
            <ul className="text-sm text-red-300 mt-2">
              {validationResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ImpressionLedgerProvider;
