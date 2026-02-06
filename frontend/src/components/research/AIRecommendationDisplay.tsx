/**
 * AIRecommendationDisplay.tsx
 *
 * Configurable AI uncertainty display for research studies.
 *
 * Four display modes matching published research conditions:
 *   binary       – recommendation only (control condition)
 *   confidence   – adds numeric confidence + progress bar
 *   error_rates  – adds FDR / FOR performance metrics
 *   full         – confidence + error rates + calibration + cohort context
 */

import React, { useEffect } from 'react';
import { Bot } from 'lucide-react';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type UncertaintyDisplayMode = 'binary' | 'confidence' | 'error_rates' | 'full';

export interface AIRecommendation {
  recommendation: 'NORMAL' | 'ABNORMAL';
  finding?: string;
  location?: string;
  confidence?: number;          // 0-100
  falseDiscoveryRate?: number;  // 0-100
  falseOmissionRate?: number;   // 0-100
  cohortPrevalence?: number;    // 0-100
  calibrationNote?: string;
}

export interface AIRecommendationDisplayProps {
  recommendation: AIRecommendation;
  displayMode: UncertaintyDisplayMode;
  /** Fires once when the component mounts (for event logging). */
  onViewed?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function confidenceBarColor(confidence: number): string {
  if (confidence >= 80) return '#22c55e'; // green-500
  if (confidence >= 60) return '#eab308'; // yellow-500
  return '#ef4444';                       // red-500
}

function modeLabel(mode: UncertaintyDisplayMode): string | null {
  switch (mode) {
    case 'confidence':  return 'Confidence Displayed';
    case 'error_rates': return 'Error Rates Displayed';
    case 'full':        return 'Full Metrics Displayed';
    default:            return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AIRecommendationDisplay: React.FC<AIRecommendationDisplayProps> = ({
  recommendation,
  displayMode,
  onViewed,
}) => {
  useEffect(() => {
    onViewed?.();
    // Intentionally fire only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showConfidence = (displayMode === 'confidence' || displayMode === 'full') &&
    recommendation.confidence !== undefined;

  const showErrorRates = displayMode === 'error_rates' || displayMode === 'full';

  const showCohort = displayMode === 'full' && recommendation.cohortPrevalence !== undefined;

  const badge = modeLabel(displayMode);

  return (
    <div style={{
      backgroundColor: 'rgba(30, 41, 59, 0.8)',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '20px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
      }}>
        <Bot size={20} style={{ color: '#60a5fa' }} />
        <span style={{ color: 'white', fontWeight: 600, fontSize: '15px' }}>AI Assessment</span>
        {badge && (
          <span style={{
            marginLeft: 'auto',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            backgroundColor: '#334155',
            color: '#94a3b8',
          }}>
            {badge}
          </span>
        )}
      </div>

      {/* Recommendation (always shown) */}
      <div style={{ marginBottom: '16px' }}>
        <span style={{
          fontSize: '18px',
          fontWeight: 700,
          color: recommendation.recommendation === 'ABNORMAL' ? '#f87171' : '#4ade80',
        }}>
          {recommendation.recommendation}
        </span>
        {recommendation.finding && (
          <p style={{ color: '#cbd5e1', marginTop: '4px', fontSize: '14px' }}>
            {recommendation.finding}
            {recommendation.location && (
              <span style={{ color: '#94a3b8' }}>{' '}({recommendation.location})</span>
            )}
          </p>
        )}
      </div>

      {/* Confidence bar */}
      {showConfidence && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '13px',
            marginBottom: '4px',
          }}>
            <span style={{ color: '#94a3b8' }}>Confidence</span>
            <span style={{ color: 'white' }}>{recommendation.confidence}%</span>
          </div>
          <div style={{
            height: '8px',
            backgroundColor: '#334155',
            borderRadius: '9999px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              borderRadius: '9999px',
              backgroundColor: confidenceBarColor(recommendation.confidence!),
              width: `${recommendation.confidence}%`,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Error rates */}
      {showErrorRates && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          borderRadius: '8px',
        }}>
          <h4 style={{ color: '#cbd5e1', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
            Performance Metrics
          </h4>
          {recommendation.falseDiscoveryRate !== undefined && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              marginBottom: '4px',
            }}>
              <span style={{ color: '#94a3b8' }}>False Discovery Rate</span>
              <span style={{ color: '#fbbf24' }}>{recommendation.falseDiscoveryRate}%</span>
            </div>
          )}
          {recommendation.falseOmissionRate !== undefined && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
            }}>
              <span style={{ color: '#94a3b8' }}>False Omission Rate</span>
              <span style={{ color: '#fbbf24' }}>{recommendation.falseOmissionRate}%</span>
            </div>
          )}
          {recommendation.falseDiscoveryRate !== undefined && (
            <p style={{ color: '#64748b', fontSize: '11px', marginTop: '8px', fontStyle: 'italic' }}>
              {recommendation.falseDiscoveryRate}% of positive AI findings are false alarms
            </p>
          )}
        </div>
      )}

      {/* Calibration note (full mode only) */}
      {displayMode === 'full' && recommendation.calibrationNote && (
        <div style={{
          marginBottom: '16px',
          padding: '8px 12px',
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#94a3b8',
        }}>
          <span style={{ fontWeight: 600, color: '#cbd5e1' }}>Calibration: </span>
          {recommendation.calibrationNote}
        </div>
      )}

      {/* Cohort context (full mode only) */}
      {showCohort && (
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          borderRadius: '8px',
        }}>
          <h4 style={{ color: '#cbd5e1', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
            Cohort Context
          </h4>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            This finding type flagged in {recommendation.cohortPrevalence}% of similar cases in your practice
          </p>
        </div>
      )}
    </div>
  );
};

export default AIRecommendationDisplay;
