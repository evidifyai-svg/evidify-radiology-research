/**
 * NasaTLX.tsx
 * 
 * P1-3: NASA Task Load Index for cognitive load measurement
 * Standard 6-dimension workload assessment tool
 * 
 * Reference: Hart, S. G., & Staveland, L. E. (1988). Development of NASA-TLX
 */

import React, { useState, useCallback } from 'react';

export interface TLXDimension {
  id: string;
  name: string;
  leftLabel: string;
  rightLabel: string;
  description: string;
}

export const TLX_DIMENSIONS: TLXDimension[] = [
  {
    id: 'mental_demand',
    name: 'Mental Demand',
    leftLabel: 'Very Low',
    rightLabel: 'Very High',
    description: 'How mentally demanding was the task?',
  },
  {
    id: 'physical_demand',
    name: 'Physical Demand',
    leftLabel: 'Very Low',
    rightLabel: 'Very High',
    description: 'How physically demanding was the task?',
  },
  {
    id: 'temporal_demand',
    name: 'Temporal Demand',
    leftLabel: 'Very Low',
    rightLabel: 'Very High',
    description: 'How hurried or rushed was the pace of the task?',
  },
  {
    id: 'performance',
    name: 'Performance',
    leftLabel: 'Perfect',
    rightLabel: 'Failure',
    description: 'How successful were you in accomplishing what you were asked to do?',
  },
  {
    id: 'effort',
    name: 'Effort',
    leftLabel: 'Very Low',
    rightLabel: 'Very High',
    description: 'How hard did you have to work to accomplish your level of performance?',
  },
  {
    id: 'frustration',
    name: 'Frustration',
    leftLabel: 'Very Low',
    rightLabel: 'Very High',
    description: 'How insecure, discouraged, irritated, stressed, and annoyed were you?',
  },
];

export interface TLXResponse {
  mental_demand: number;
  physical_demand: number;
  temporal_demand: number;
  performance: number;
  effort: number;
  frustration: number;
  raw_tlx_score: number;
  timestamp: string;
  phase: 'POST_CASE' | 'POST_SESSION';
  caseId?: string;
}

interface NasaTLXProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (response: TLXResponse) => void;
  phase: 'POST_CASE' | 'POST_SESSION';
  caseId?: string;
  title?: string;
}

export const NasaTLX: React.FC<NasaTLXProps> = ({
  isOpen,
  onClose,
  onSubmit,
  phase,
  caseId,
  title = 'Workload Assessment',
}) => {
  const [responses, setResponses] = useState<Record<string, number>>({
    mental_demand: 50,
    physical_demand: 10,
    temporal_demand: 50,
    performance: 30,
    effort: 50,
    frustration: 30,
  });
  const [currentDimension, setCurrentDimension] = useState(0);
  const [mode, setMode] = useState<'SEQUENTIAL' | 'ALL'>('ALL');

  const handleSubmit = useCallback(() => {
    // Calculate raw TLX score (unweighted average)
    const values = Object.values(responses);
    const rawScore = values.reduce((a, b) => a + b, 0) / values.length;

    const tlxResponse: TLXResponse = {
      mental_demand: responses.mental_demand,
      physical_demand: responses.physical_demand,
      temporal_demand: responses.temporal_demand,
      performance: responses.performance,
      effort: responses.effort,
      frustration: responses.frustration,
      raw_tlx_score: Math.round(rawScore * 10) / 10,
      timestamp: new Date().toISOString(),
      phase,
      caseId,
    };

    onSubmit(tlxResponse);
    onClose();
  }, [responses, phase, caseId, onSubmit, onClose]);

  const handleDimensionChange = (dimensionId: string, value: number) => {
    setResponses(prev => ({ ...prev, [dimensionId]: value }));
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>{title}</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
              NASA Task Load Index (TLX)
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#94a3b8',
            }}
          >
            ×
          </button>
        </div>

        {/* Instructions */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: '#f0f9ff',
          borderBottom: '1px solid #e0f2fe',
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#0369a1' }}>
            Rate each dimension from 0-100 based on your experience with the task.
            Click the scale or drag the slider to adjust your rating.
          </p>
        </div>

        {/* Dimensions */}
        <div style={{ padding: '24px' }}>
          {TLX_DIMENSIONS.map((dim, index) => (
            <div
              key={dim.id}
              style={{
                marginBottom: index < TLX_DIMENSIONS.length - 1 ? '28px' : 0,
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '8px',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>{dim.name}</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>{dim.description}</div>
                </div>
                <div style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  minWidth: '48px',
                  textAlign: 'center',
                }}>
                  {responses[dim.id]}
                </div>
              </div>

              <div style={{ position: 'relative', padding: '0 4px' }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={responses[dim.id]}
                  onChange={e => handleDimensionChange(dim.id, Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '8px',
                    appearance: 'none',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                />
                
                {/* Scale marks */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '4px',
                }}>
                  {[0, 25, 50, 75, 100].map(mark => (
                    <div
                      key={mark}
                      style={{
                        fontSize: '10px',
                        color: '#94a3b8',
                        width: '20px',
                        textAlign: 'center',
                      }}
                    >
                      {mark}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '2px',
                fontSize: '12px',
                color: '#64748b',
              }}>
                <span>{dim.leftLabel}</span>
                <span>{dim.rightLabel}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>Overall Workload (Raw TLX)</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e40af' }}>
                {Math.round(Object.values(responses).reduce((a, b) => a + b, 0) / 6)}
              </div>
            </div>
            <div style={{
              display: 'flex',
              gap: '8px',
            }}>
              <button
                onClick={onClose}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#fff',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Skip
              </button>
              <button
                onClick={handleSubmit}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>

        {/* Citation */}
        <div style={{
          padding: '12px 24px',
          backgroundColor: '#f1f5f9',
          borderTop: '1px solid #e2e8f0',
          fontSize: '11px',
          color: '#94a3b8',
        }}>
          Hart, S.G., & Staveland, L.E. (1988). Development of NASA-TLX: Results of empirical 
          and theoretical research. In P.A. Hancock & N. Meshkati (Eds.), Human Mental Workload.
        </div>
      </div>
    </div>
  );
};

// Compact inline version for quick assessment
interface QuickTLXProps {
  onSubmit: (score: number) => void;
}

export const QuickTLX: React.FC<QuickTLXProps> = ({ onSubmit }) => {
  const [score, setScore] = useState(50);

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
      }}>
        <span style={{ fontWeight: 600 }}>Overall Mental Workload</span>
        <span style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '2px 10px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: 'bold',
        }}>
          {score}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={score}
        onChange={e => setScore(Number(e.target.value))}
        style={{ width: '100%' }}
      />
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: '#94a3b8',
        marginTop: '4px',
      }}>
        <span>Very Low</span>
        <span>Very High</span>
      </div>
      <button
        onClick={() => onSubmit(score)}
        style={{
          marginTop: '12px',
          width: '100%',
          padding: '10px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        Submit
      </button>
    </div>
  );
};

export default NasaTLX;
