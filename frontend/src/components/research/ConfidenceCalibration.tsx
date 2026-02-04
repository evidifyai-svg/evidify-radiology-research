/**
 * ConfidenceCalibration.tsx
 * 
 * P1-2: Capture confidence BEFORE and AFTER AI consultation
 * Computes confidence shift as a key behavioral metric
 */

import React, { useState } from 'react';

export interface ConfidenceState {
  preAI: number | null;
  postAI: number | null;
  shift: number | null;
  shiftDirection: 'INCREASED' | 'DECREASED' | 'UNCHANGED' | null;
}

interface ConfidenceSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  color?: string;
}

export const ConfidenceSlider: React.FC<ConfidenceSliderProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  color = '#3b82f6',
}) => {
  const getConfidenceLabel = (v: number): string => {
    if (v < 20) return 'Very Low';
    if (v < 40) return 'Low';
    if (v < 60) return 'Moderate';
    if (v < 80) return 'High';
    return 'Very High';
  };

  return (
    <div style={{ opacity: disabled ? 0.5 : 1 }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '8px',
      }}>
        <label style={{ fontWeight: 600 }}>{label}</label>
        <span style={{ 
          fontSize: '14px',
          color: '#64748b',
        }}>
          {getConfidenceLabel(value)}
        </span>
      </div>
      
      <div style={{ position: 'relative' }}>
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          disabled={disabled}
          style={{
            width: '100%',
            height: '8px',
            appearance: 'none',
            backgroundColor: '#e2e8f0',
            borderRadius: '4px',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        />
        
        {/* Value display */}
        <div style={{
          position: 'absolute',
          left: `${value}%`,
          transform: 'translateX(-50%)',
          top: '-28px',
          backgroundColor: color,
          color: 'white',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
        }}>
          {value}%
        </div>
      </div>
      
      {/* Scale labels */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '4px',
        fontSize: '11px',
        color: '#94a3b8',
      }}>
        <span>0% (Guessing)</span>
        <span>50%</span>
        <span>100% (Certain)</span>
      </div>
    </div>
  );
};

interface ConfidenceComparisonProps {
  preAI: number;
  postAI: number;
  biradsChanged: boolean;
}

export const ConfidenceComparison: React.FC<ConfidenceComparisonProps> = ({
  preAI,
  postAI,
  biradsChanged,
}) => {
  const shift = postAI - preAI;
  const shiftDirection = shift > 0 ? 'INCREASED' : shift < 0 ? 'DECREASED' : 'UNCHANGED';
  
  const getInterpretation = (): { text: string; color: string } => {
    if (biradsChanged) {
      if (shiftDirection === 'INCREASED') {
        return { 
          text: 'Changed assessment with increased confidence - AI may have provided useful information',
          color: '#16a34a',
        };
      } else if (shiftDirection === 'DECREASED') {
        return {
          text: 'Changed assessment with decreased confidence - Decision uncertainty present',
          color: '#f59e0b',
        };
      } else {
        return {
          text: 'Changed assessment with same confidence - Independent reconsideration',
          color: '#64748b',
        };
      }
    } else {
      if (shiftDirection === 'INCREASED') {
        return {
          text: 'Maintained assessment with increased confidence - AI confirmation effect',
          color: '#3b82f6',
        };
      } else if (shiftDirection === 'DECREASED') {
        return {
          text: 'Maintained assessment with decreased confidence - AI introduced doubt',
          color: '#f59e0b',
        };
      } else {
        return {
          text: 'No change in assessment or confidence',
          color: '#64748b',
        };
      }
    }
  };

  const interpretation = getInterpretation();

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      padding: '16px',
      border: '1px solid #e2e8f0',
    }}>
      <div style={{ fontWeight: 600, marginBottom: '16px' }}>Confidence Calibration</div>
      
      {/* Visual comparison */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '16px',
      }}>
        {/* Pre-AI */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Before AI</div>
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#64748b',
          }}>
            {preAI}%
          </div>
        </div>

        {/* Arrow */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}>
          <div style={{
            fontSize: '24px',
            color: shift > 0 ? '#16a34a' : shift < 0 ? '#ef4444' : '#94a3b8',
          }}>
            {shift > 0 ? '→ ↑' : shift < 0 ? '→ ↓' : '→'}
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: shift > 0 ? '#16a34a' : shift < 0 ? '#ef4444' : '#64748b',
          }}>
            {shift > 0 ? `+${shift}` : shift}%
          </div>
        </div>

        {/* Post-AI */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>After AI</div>
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: shift > 0 ? '#16a34a' : shift < 0 ? '#ef4444' : '#3b82f6',
          }}>
            {postAI}%
          </div>
        </div>
      </div>

      {/* Interpretation */}
      <div style={{
        padding: '12px',
        backgroundColor: '#fff',
        borderRadius: '6px',
        border: `1px solid ${interpretation.color}20`,
      }}>
        <div style={{ 
          fontSize: '13px', 
          color: interpretation.color,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>Tip</span>
          {interpretation.text}
        </div>
      </div>

      {/* Metrics for export */}
      <div style={{
        marginTop: '12px',
        display: 'flex',
        gap: '16px',
        fontSize: '11px',
        color: '#94a3b8',
      }}>
        <span>confidence_pre_ai: {preAI}</span>
        <span>confidence_post_ai: {postAI}</span>
        <span>confidence_shift: {shift}</span>
        <span>shift_direction: {shiftDirection}</span>
      </div>
    </div>
  );
};

// Event payload types
export interface ConfidenceLogPayload {
  phase: 'PRE_AI' | 'POST_AI';
  confidence: number;
  timestamp: string;
}

export interface ConfidenceShiftPayload {
  preAI: number;
  postAI: number;
  shift: number;
  shiftDirection: 'INCREASED' | 'DECREASED' | 'UNCHANGED';
  biradsChanged: boolean;
  biradsDelta: number;
}

export default ConfidenceSlider;
