/**
 * CalibrationTrial.tsx
 * 
 * P1-1: Training case with immediate feedback
 * Shows reader the ground truth after their assessment
 * Helps calibrate expectations before real trials
 */

import React, { useState, useCallback } from 'react';

export interface CalibrationCase {
  caseId: string;
  images: {
    RCC: string;
    LCC: string;
    RMLO: string;
    LMLO: string;
  };
  groundTruth: {
    birads: number;
    pathology: 'BENIGN' | 'MALIGNANT' | 'UNKNOWN';
    description: string;
    teachingPoints: string[];
  };
  aiSuggestion: {
    birads: number;
    confidence: number;
    wasCorrect: boolean;
  };
}

interface CalibrationTrialProps {
  case_: CalibrationCase;
  onComplete: (result: CalibrationResult) => void;
  showAI?: boolean;
}

export interface CalibrationResult {
  caseId: string;
  userBirads: number;
  userConfidence: number;
  groundTruthBirads: number;
  wasCorrect: boolean;
  absoluteError: number;
  aiWasCorrect: boolean;
  timeToAssessMs: number;
  feedbackViewed: boolean;
}

export const CalibrationTrial: React.FC<CalibrationTrialProps> = ({
  case_,
  onComplete,
  showAI = false,
}) => {
  const [phase, setPhase] = useState<'ASSESS' | 'FEEDBACK' | 'REVIEW'>('ASSESS');
  const [userBirads, setUserBirads] = useState<number | null>(null);
  const [userConfidence, setUserConfidence] = useState(70);
  const [startTime] = useState(Date.now());
  const [assessmentTime, setAssessmentTime] = useState<number | null>(null);

  const handleSubmitAssessment = useCallback(() => {
    if (userBirads === null) return;
    setAssessmentTime(Date.now() - startTime);
    setPhase('FEEDBACK');
  }, [userBirads, startTime]);

  const handleContinue = useCallback(() => {
    if (userBirads === null || assessmentTime === null) return;
    
    const result: CalibrationResult = {
      caseId: case_.caseId,
      userBirads,
      userConfidence,
      groundTruthBirads: case_.groundTruth.birads,
      wasCorrect: userBirads === case_.groundTruth.birads,
      absoluteError: Math.abs(userBirads - case_.groundTruth.birads),
      aiWasCorrect: case_.aiSuggestion.wasCorrect,
      timeToAssessMs: assessmentTime,
      feedbackViewed: true,
    };
    
    onComplete(result);
  }, [case_, userBirads, userConfidence, assessmentTime, onComplete]);

  const isCorrect = userBirads === case_.groundTruth.birads;
  const isClose = userBirads !== null && Math.abs(userBirads - case_.groundTruth.birads) <= 1;

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        padding: '12px 16px',
        backgroundColor: '#fef3c7',
        borderRadius: '8px',
        border: '1px solid #fcd34d',
      }}>
        <span style={{ fontSize: '24px' }}>📚</span>
        <div>
          <div style={{ fontWeight: 600, color: '#92400e' }}>Calibration Case</div>
          <div style={{ fontSize: '13px', color: '#a16207' }}>
            Training mode - You will see feedback after your assessment
          </div>
        </div>
      </div>

      {/* Assessment Phase */}
      {phase === 'ASSESS' && (
        <div>
          <h3 style={{ marginTop: 0 }}>Make Your Assessment</h3>
          <p style={{ color: '#64748b' }}>
            Review the images and select your BI-RADS category. 
            {showAI && ' AI suggestion is shown for reference.'}
          </p>

          {/* Placeholder for mammogram viewer */}
          <div style={{
            backgroundColor: '#1f2937',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            color: '#9ca3af',
            marginBottom: '20px',
          }}>
            [Mammogram Viewer - Case {case_.caseId}]
          </div>

          {/* AI suggestion (if enabled) */}
          {showAI && (
            <div style={{
              backgroundColor: '#faf5ff',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #c4b5fd',
            }}>
              <span style={{ marginRight: '8px' }}>🤖</span>
              <strong>AI Suggestion:</strong> BI-RADS {case_.aiSuggestion.birads} 
              ({case_.aiSuggestion.confidence}% confidence)
            </div>
          )}

          {/* Assessment form */}
          <div style={{ display: 'grid', gap: '16px', maxWidth: '400px' }}>
            <div>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Your BI-RADS Assessment
              </label>
              <select
                value={userBirads ?? ''}
                onChange={e => setUserBirads(Number(e.target.value))}
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
                  <option key={n} value={n}>BI-RADS {n}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Confidence: {userConfidence}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={userConfidence}
                onChange={e => setUserConfidence(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <button
              onClick={handleSubmitAssessment}
              disabled={userBirads === null}
              style={{
                padding: '14px',
                backgroundColor: userBirads !== null ? '#3b82f6' : '#cbd5e1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: userBirads !== null ? 'pointer' : 'not-allowed',
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              Submit & See Feedback
            </button>
          </div>
        </div>
      )}

      {/* Feedback Phase */}
      {phase === 'FEEDBACK' && (
        <div>
          <h3 style={{ marginTop: 0 }}>
            {isCorrect ? '✅ Correct!' : isClose ? '⚠️ Close' : '❌ Incorrect'}
          </h3>

          {/* Result comparison */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              padding: '16px',
              backgroundColor: '#f1f5f9',
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Your Answer</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>BI-RADS {userBirads}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{userConfidence}% confidence</div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: '#dcfce7',
              borderRadius: '8px',
              textAlign: 'center',
              border: '2px solid #86efac',
            }}>
              <div style={{ fontSize: '12px', color: '#166534', marginBottom: '4px' }}>Ground Truth</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a' }}>
                BI-RADS {case_.groundTruth.birads}
              </div>
              <div style={{ fontSize: '12px', color: '#22c55e' }}>{case_.groundTruth.pathology}</div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: case_.aiSuggestion.wasCorrect ? '#dcfce7' : '#fee2e2',
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>AI Suggested</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>BI-RADS {case_.aiSuggestion.birads}</div>
              <div style={{ fontSize: '12px', color: case_.aiSuggestion.wasCorrect ? '#22c55e' : '#ef4444' }}>
                {case_.aiSuggestion.wasCorrect ? '✓ Correct' : '✗ Incorrect'}
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div style={{
            backgroundColor: '#f0fdf4',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid #86efac',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>📋 Case Explanation</div>
            <p style={{ margin: 0, color: '#166534' }}>{case_.groundTruth.description}</p>
          </div>

          {/* Teaching points */}
          <div style={{
            backgroundColor: '#eff6ff',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '1px solid #93c5fd',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>💡 Teaching Points</div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e40af' }}>
              {case_.groundTruth.teachingPoints.map((point, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{point}</li>
              ))}
            </ul>
          </div>

          {/* Performance summary */}
          <div style={{
            backgroundColor: '#f8fafc',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '14px',
          }}>
            <span>Assessment time: <strong>{((assessmentTime || 0) / 1000).toFixed(1)}s</strong></span>
            <span>Absolute error: <strong>{Math.abs((userBirads || 0) - case_.groundTruth.birads)} categories</strong></span>
          </div>

          <button
            onClick={handleContinue}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            Continue to Study Cases →
          </button>
        </div>
      )}
    </div>
  );
};

// Sample calibration case for testing
export const SAMPLE_CALIBRATION_CASE: CalibrationCase = {
  caseId: 'CAL-001',
  images: {
    RCC: '/images/inbreast/20587544_d571b5880ad2a016_MG_R_CC_ANON.png',
    LCC: '/images/inbreast/20587466_d571b5880ad2a016_MG_L_CC_ANON.png',
    RMLO: '/images/inbreast/20587492_d571b5880ad2a016_MG_R_ML_ANON.png',
    LMLO: '/images/inbreast/20587518_d571b5880ad2a016_MG_L_ML_ANON.png',
  },
  groundTruth: {
    birads: 4,
    pathology: 'MALIGNANT',
    description: 'Suspicious calcifications in the upper outer quadrant of the right breast. Biopsy revealed invasive ductal carcinoma.',
    teachingPoints: [
      'Clustered pleomorphic calcifications are suspicious for malignancy',
      'BI-RADS 4 indicates >2% but <95% likelihood of malignancy',
      'AI correctly identified the calcifications but human interpretation of morphology is critical',
    ],
  },
  aiSuggestion: {
    birads: 4,
    confidence: 78,
    wasCorrect: true,
  },
};

export default CalibrationTrial;
