/**
 * AttentionCheck.tsx
 * 
 * P1-5: Attention check ("catch") trials
 * Detects inattentive or random responding participants
 * Essential for research data quality
 */

import React, { useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface AttentionCheckCase {
  caseId: string;
  type: 'OBVIOUS_POSITIVE' | 'OBVIOUS_NEGATIVE' | 'INSTRUCTION_CHECK';
  images?: {
    RCC: string;
    LCC: string;
    RMLO: string;
    LMLO: string;
  };
  expectedBirads?: number;
  acceptableRange?: [number, number]; // e.g., [4, 5] means 4 or 5 is acceptable
  instructionText?: string;
  correctResponse?: string;
  difficulty: 'VERY_EASY'; // Attention checks should always be obvious
}

export interface AttentionCheckResult {
  caseId: string;
  type: AttentionCheckCase['type'];
  expectedResponse: string;
  actualResponse: string;
  passed: boolean;
  responseTimeMs: number;
  timestamp: string;
}

export interface AttentionCheckConfig {
  minChecksRequired: number;
  failureThreshold: number; // Fail study if this many checks failed
  insertionStrategy: 'RANDOM' | 'FIXED_POSITIONS' | 'AFTER_N_CASES';
  positionsOrInterval: number[]; // Case indices or interval
}

// ============================================================================
// ATTENTION CHECK CASES LIBRARY
// ============================================================================

export const ATTENTION_CHECK_LIBRARY: AttentionCheckCase[] = [
  {
    caseId: 'ATN-OBV-POS-001',
    type: 'OBVIOUS_POSITIVE',
    images: {
      RCC: '/images/inbreast/20587294_e634830794f5c1bd_MG_R_CC_ANON.png',
      LCC: '/images/inbreast/20587320_e634830794f5c1bd_MG_L_CC_ANON.png',
      RMLO: '/images/inbreast/20587346_e634830794f5c1bd_MG_R_ML_ANON.png',
      LMLO: '/images/inbreast/20587372_e634830794f5c1bd_MG_L_ML_ANON.png',
    },
    expectedBirads: 5,
    acceptableRange: [4, 5], // Either 4 or 5 is acceptable for attention check
    difficulty: 'VERY_EASY',
  },
  {
    caseId: 'ATN-OBV-NEG-001',
    type: 'OBVIOUS_NEGATIVE',
    images: {
      RCC: '/images/inbreast/20587054_b6a4f750c6df4f90_MG_R_CC_ANON.png',
      LCC: '/images/inbreast/20587054_b6a4f750c6df4f90_MG_R_CC_ANON.png',
      RMLO: '/images/inbreast/20587080_b6a4f750c6df4f90_MG_R_ML_ANON.png',
      LMLO: '/images/inbreast/20587080_b6a4f750c6df4f90_MG_R_ML_ANON.png',
    },
    expectedBirads: 1,
    acceptableRange: [1, 2], // Either 1 or 2 is acceptable
    difficulty: 'VERY_EASY',
  },
  {
    caseId: 'ATN-INST-001',
    type: 'INSTRUCTION_CHECK',
    instructionText: 'To confirm you are reading carefully, please select BI-RADS 3 for this case regardless of what you see in the images.',
    correctResponse: '3',
    difficulty: 'VERY_EASY',
  },
  {
    caseId: 'ATN-INST-002',
    type: 'INSTRUCTION_CHECK',
    instructionText: 'Quality check: Please enter the number FOUR in the assessment box below to continue.',
    correctResponse: '4',
    difficulty: 'VERY_EASY',
  },
];

// ============================================================================
// ATTENTION CHECK COMPONENT
// ============================================================================

interface AttentionCheckTrialProps {
  checkCase: AttentionCheckCase;
  onComplete: (result: AttentionCheckResult) => void;
  showWarning?: boolean;
}

export const AttentionCheckTrial: React.FC<AttentionCheckTrialProps> = ({
  checkCase,
  onComplete,
  showWarning = false,
}) => {
  const [response, setResponse] = useState<string | null>(null);
  const [startTime] = useState(Date.now());

  const handleSubmit = useCallback(() => {
    if (response === null) return;

    let passed = false;
    let expectedResponse = '';

    if (checkCase.type === 'INSTRUCTION_CHECK') {
      expectedResponse = checkCase.correctResponse || '';
      passed = response === checkCase.correctResponse;
    } else {
      const responseBirads = parseInt(response);
      expectedResponse = `BI-RADS ${checkCase.expectedBirads}`;
      
      if (checkCase.acceptableRange) {
        passed = responseBirads >= checkCase.acceptableRange[0] && 
                 responseBirads <= checkCase.acceptableRange[1];
      } else {
        passed = responseBirads === checkCase.expectedBirads;
      }
    }

    const result: AttentionCheckResult = {
      caseId: checkCase.caseId,
      type: checkCase.type,
      expectedResponse,
      actualResponse: checkCase.type === 'INSTRUCTION_CHECK' ? response : `BI-RADS ${response}`,
      passed,
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    onComplete(result);
  }, [checkCase, response, startTime, onComplete]);

  return (
    <div style={{ padding: '24px' }}>
      {/* Instruction check specific UI */}
      {checkCase.type === 'INSTRUCTION_CHECK' && (
        <div>
          <div style={{
            backgroundColor: '#fef3c7',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '2px solid #fcd34d',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}>
              <span style={{ fontSize: '24px' }}>Checklist</span>
              <div style={{ fontWeight: 600, color: '#92400e', fontSize: '18px' }}>
                Attention Check
              </div>
            </div>
            <p style={{ margin: 0, color: '#78350f', fontSize: '16px', lineHeight: 1.6 }}>
              {checkCase.instructionText}
            </p>
          </div>

          <div style={{ maxWidth: '300px' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              Your Response
            </label>
            <select
              value={response ?? ''}
              onChange={e => setResponse(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                borderRadius: '8px',
                border: '2px solid #e2e8f0',
              }}
            >
              <option value="">Select...</option>
              {[0, 1, 2, 3, 4, 5, 6].map(n => (
                <option key={n} value={String(n)}>BI-RADS {n}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Image-based attention check */}
      {(checkCase.type === 'OBVIOUS_POSITIVE' || checkCase.type === 'OBVIOUS_NEGATIVE') && (
        <div>
          {showWarning && (
            <div style={{
              backgroundColor: '#fee2e2',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #fca5a5',
              fontSize: '14px',
              color: '#991b1b',
            }}>
              This is a quality check case. Please review carefully.
            </div>
          )}

          <div style={{
            backgroundColor: '#1f2937',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            color: '#9ca3af',
            marginBottom: '20px',
          }}>
            [Mammogram Viewer - Attention Check Case]
            <div style={{ marginTop: '8px', fontSize: '13px' }}>
              {checkCase.type === 'OBVIOUS_POSITIVE' 
                ? '(This case has an obvious finding)'
                : '(This case has no significant findings)'}
            </div>
          </div>

          <div style={{ maxWidth: '400px' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              BI-RADS Assessment
            </label>
            <select
              value={response ?? ''}
              onChange={e => setResponse(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                borderRadius: '8px',
                border: '2px solid #e2e8f0',
              }}
            >
              <option value="">Select BI-RADS...</option>
              {[0, 1, 2, 3, 4, 5, 6].map(n => (
                <option key={n} value={String(n)}>BI-RADS {n}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={response === null}
        style={{
          marginTop: '20px',
          padding: '14px 24px',
          backgroundColor: response !== null ? '#3b82f6' : '#cbd5e1',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: response !== null ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          fontWeight: 600,
        }}
      >
        Continue
      </button>
    </div>
  );
};

// ============================================================================
// ATTENTION CHECK MANAGER
// ============================================================================

interface AttentionCheckManagerProps {
  results: AttentionCheckResult[];
  config: AttentionCheckConfig;
}

export const AttentionCheckSummary: React.FC<AttentionCheckManagerProps> = ({
  results,
  config,
}) => {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const studyValid = failed < config.failureThreshold;

  return (
    <div style={{
      backgroundColor: studyValid ? '#f0fdf4' : '#fef2f2',
      padding: '16px',
      borderRadius: '8px',
      border: `1px solid ${studyValid ? '#86efac' : '#fca5a5'}`,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <div style={{ fontWeight: 600 }}>
          Attention Check Results
        </div>
        <div style={{
          padding: '4px 12px',
          backgroundColor: studyValid ? '#16a34a' : '#ef4444',
          color: 'white',
          borderRadius: '16px',
          fontSize: '13px',
          fontWeight: 'bold',
        }}>
          {studyValid ? 'VALID' : 'INVALID'}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '12px',
      }}>
        <div style={{ textAlign: 'center', padding: '8px', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '6px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{total}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Total Checks</div>
        </div>
        <div style={{ textAlign: 'center', padding: '8px', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '6px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{passed}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Passed</div>
        </div>
        <div style={{ textAlign: 'center', padding: '8px', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '6px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{failed}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Failed</div>
        </div>
      </div>

      {!studyValid && (
        <div style={{
          backgroundColor: '#fee2e2',
          padding: '12px',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#991b1b',
        }}>
          Data quality concern: {failed} attention check(s) failed. 
          Threshold is {config.failureThreshold}. Consider excluding from analysis.
        </div>
      )}

      {/* Individual results */}
      <div style={{ marginTop: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#64748b' }}>
          Individual Checks
        </div>
        {results.map((r, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px',
              backgroundColor: r.passed ? 'rgba(22, 163, 74, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderRadius: '4px',
              marginBottom: '4px',
              fontSize: '13px',
            }}
          >
            <span>{r.caseId}</span>
            <span style={{ color: r.passed ? '#16a34a' : '#ef4444' }}>
              {r.passed ? 'Pass' : 'Fail'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function shouldInsertAttentionCheck(
  currentCaseIndex: number,
  totalCases: number,
  config: AttentionCheckConfig
): boolean {
  if (config.insertionStrategy === 'FIXED_POSITIONS') {
    return config.positionsOrInterval.includes(currentCaseIndex);
  }
  
  if (config.insertionStrategy === 'AFTER_N_CASES') {
    const interval = config.positionsOrInterval[0] || 5;
    return currentCaseIndex > 0 && currentCaseIndex % interval === 0;
  }
  
  // RANDOM - determine probabilistically
  const probability = config.minChecksRequired / totalCases;
  return Math.random() < probability;
}

export function selectAttentionCheck(
  previousChecks: AttentionCheckResult[]
): AttentionCheckCase {
  const usedTypes = new Set(previousChecks.map(c => c.type));
  
  // Prefer unused types
  const unused = ATTENTION_CHECK_LIBRARY.filter(c => !usedTypes.has(c.type));
  if (unused.length > 0) {
    return unused[Math.floor(Math.random() * unused.length)];
  }
  
  // Fall back to random
  return ATTENTION_CHECK_LIBRARY[Math.floor(Math.random() * ATTENTION_CHECK_LIBRARY.length)];
}

export default AttentionCheckTrial;
