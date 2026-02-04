/**
 * AIUncertaintyViz.tsx
 * 
 * P1-4: Advanced AI uncertainty visualization
 * Shows confidence gradients, calibration curves, and uncertainty indicators
 */

import React from 'react';

// ============================================================================
// CONFIDENCE BADGE WITH GRADIENT
// ============================================================================

interface ConfidenceBadgeProps {
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  size = 'md',
  showLabel = true,
}) => {
  const getColor = (conf: number): string => {
    if (conf >= 90) return '#16a34a'; // Green - high confidence
    if (conf >= 70) return '#3b82f6'; // Blue - good confidence
    if (conf >= 50) return '#f59e0b'; // Yellow - moderate confidence
    return '#ef4444'; // Red - low confidence
  };

  const getLabel = (conf: number): string => {
    if (conf >= 90) return 'Very High';
    if (conf >= 70) return 'High';
    if (conf >= 50) return 'Moderate';
    if (conf >= 30) return 'Low';
    return 'Very Low';
  };

  const sizes = {
    sm: { font: '12px', padding: '4px 8px', ring: '32px' },
    md: { font: '14px', padding: '6px 12px', ring: '48px' },
    lg: { font: '18px', padding: '8px 16px', ring: '64px' },
  };

  const color = getColor(confidence);
  const s = sizes[size];

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      {/* Circular indicator */}
      <div style={{
        position: 'relative',
        width: s.ring,
        height: s.ring,
      }}>
        {/* Background ring */}
        <svg
          viewBox="0 0 36 36"
          style={{
            position: 'absolute',
            transform: 'rotate(-90deg)',
          }}
        >
          <path
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${confidence}, 100`}
          />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: size === 'sm' ? '10px' : size === 'md' ? '12px' : '14px',
          color,
        }}>
          {confidence}%
        </div>
      </div>

      {showLabel && (
        <span style={{
          fontSize: s.font,
          fontWeight: 500,
          color,
        }}>
          {getLabel(confidence)}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// UNCERTAINTY SPECTRUM BAR
// ============================================================================

interface UncertaintySpectrumProps {
  confidence: number;
  showTicks?: boolean;
  width?: string;
}

export const UncertaintySpectrum: React.FC<UncertaintySpectrumProps> = ({
  confidence,
  showTicks = true,
  width = '100%',
}) => {
  return (
    <div style={{ width }}>
      <div style={{
        position: 'relative',
        height: '24px',
        background: 'linear-gradient(to right, #ef4444 0%, #f59e0b 40%, #3b82f6 70%, #16a34a 100%)',
        borderRadius: '4px',
        overflow: 'visible',
      }}>
        {/* Confidence marker */}
        <div style={{
          position: 'absolute',
          left: `${confidence}%`,
          top: '-4px',
          transform: 'translateX(-50%)',
          width: '4px',
          height: '32px',
          backgroundColor: '#1e293b',
          borderRadius: '2px',
        }} />
        
        {/* Value label */}
        <div style={{
          position: 'absolute',
          left: `${confidence}%`,
          top: '-28px',
          transform: 'translateX(-50%)',
          backgroundColor: '#1e293b',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
        }}>
          {confidence}%
        </div>
      </div>
      
      {showTicks && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
          fontSize: '10px',
          color: '#94a3b8',
        }}>
          <span>Uncertain</span>
          <span>50%</span>
          <span>Confident</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// AI FINDING CARD WITH UNCERTAINTY
// ============================================================================

interface AIFindingWithUncertaintyProps {
  birads: number;
  confidence: number;
  finding: string;
  uncertaintyFactors?: string[];
  fdr?: number;
  for_?: number;
}

export const AIFindingWithUncertainty: React.FC<AIFindingWithUncertaintyProps> = ({
  birads,
  confidence,
  finding,
  uncertaintyFactors = [],
  fdr,
  for_,
}) => {
  const isUncertain = confidence < 70;

  return (
    <div style={{
      backgroundColor: isUncertain ? '#fef3c7' : '#faf5ff',
      borderRadius: '12px',
      padding: '20px',
      border: `2px solid ${isUncertain ? '#fcd34d' : '#c4b5fd'}`,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>AI</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '18px' }}>AI Suggestion</div>
            <div style={{ color: '#64748b', fontSize: '13px' }}>
              {isUncertain ? 'Moderate uncertainty' : 'High confidence detection'}
            </div>
          </div>
        </div>
        <ConfidenceBadge confidence={confidence} size="lg" showLabel={false} />
      </div>

      {/* Main suggestion */}
      <div style={{
        backgroundColor: 'white',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <div style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#7c3aed',
          marginBottom: '8px',
        }}>
          BI-RADS {birads}
        </div>
        <div style={{ color: '#64748b' }}>{finding}</div>
      </div>

      {/* Uncertainty spectrum */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
          Confidence Level
        </div>
        <UncertaintySpectrum confidence={confidence} />
      </div>

      {/* Uncertainty factors (if any) */}
      {uncertaintyFactors.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(234, 179, 8, 0.1)',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', marginBottom: '8px' }}>
            Uncertainty Factors
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#78350f' }}>
            {uncertaintyFactors.map((factor, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>{factor}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Error rates */}
      {(fdr !== undefined || for_ !== undefined) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}>
          {fdr !== undefined && (
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(251, 191, 36, 0.2)',
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '11px', color: '#92400e' }}>False Discovery Rate</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{fdr}%</div>
              <div style={{ fontSize: '10px', color: '#a16207' }}>False alarms per 100 "positive"</div>
            </div>
          )}
          {for_ !== undefined && (
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '11px', color: '#991b1b' }}>False Omission Rate</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{for_}%</div>
              <div style={{ fontSize: '10px', color: '#b91c1c' }}>Missed per 100 "negative"</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CALIBRATION PLOT (simplified visual)
// ============================================================================

interface CalibrationPlotProps {
  predictions: Array<{ confidence: number; wasCorrect: boolean }>;
}

export const CalibrationPlot: React.FC<CalibrationPlotProps> = ({ predictions }) => {
  // Group predictions by confidence decile
  const bins = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}-${(i + 1) * 10}%`,
    predicted: (i + 0.5) * 10,
    actual: 0,
    count: 0,
  }));

  predictions.forEach(p => {
    const binIndex = Math.min(Math.floor(p.confidence / 10), 9);
    bins[binIndex].count++;
    if (p.wasCorrect) {
      bins[binIndex].actual += 1;
    }
  });

  // Calculate actual accuracy per bin
  bins.forEach(bin => {
    if (bin.count > 0) {
      bin.actual = (bin.actual / bin.count) * 100;
    }
  });

  const maxHeight = 100;

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      padding: '20px',
      borderRadius: '8px',
    }}>
      <div style={{ fontWeight: 600, marginBottom: '16px' }}>
        AI Calibration Plot
      </div>
      
      <div style={{
        position: 'relative',
        height: '200px',
        borderLeft: '2px solid #e2e8f0',
        borderBottom: '2px solid #e2e8f0',
        marginLeft: '40px',
      }}>
        {/* Perfect calibration line */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(45deg, transparent 49.5%, #94a3b8 49.5%, #94a3b8 50.5%, transparent 50.5%)',
        }} />
        
        {/* Bars */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          padding: '0 10px',
        }}>
          {bins.map((bin, i) => (
            <div
              key={i}
              style={{
                width: '8%',
                height: `${(bin.actual / maxHeight) * 100}%`,
                backgroundColor: Math.abs(bin.actual - bin.predicted) < 10 
                  ? '#10b981' 
                  : Math.abs(bin.actual - bin.predicted) < 20 
                    ? '#f59e0b' 
                    : '#ef4444',
                borderRadius: '2px 2px 0 0',
                minHeight: bin.count > 0 ? '4px' : '0',
              }}
              title={`Bin ${bin.range}: ${bin.count} predictions, ${bin.actual.toFixed(1)}% accurate`}
            />
          ))}
        </div>
        
        {/* Y-axis labels */}
        <div style={{ position: 'absolute', left: '-40px', top: 0, bottom: 0 }}>
          {[100, 50, 0].map(val => (
            <div
              key={val}
              style={{
                position: 'absolute',
                top: `${100 - val}%`,
                transform: 'translateY(-50%)',
                fontSize: '10px',
                color: '#64748b',
              }}
            >
              {val}%
            </div>
          ))}
        </div>
      </div>
      
      {/* X-axis label */}
      <div style={{
        textAlign: 'center',
        marginTop: '8px',
        fontSize: '12px',
        color: '#64748b',
      }}>
        Predicted Confidence
      </div>
      
      {/* Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        marginTop: '16px',
        fontSize: '11px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#94a3b8' }} />
          <span>Perfect calibration</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981' }} />
          <span>Well calibrated</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444' }} />
          <span>Poorly calibrated</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// BOUNDING BOX WITH CONFIDENCE GRADIENT
// ============================================================================

interface GradientBoundingBoxProps {
  confidence: number;
  top: string;
  left: string;
  width: string;
  height: string;
  showInteractionTimeline?: boolean;
}

export const GradientBoundingBox: React.FC<GradientBoundingBoxProps> = ({
  confidence,
  top,
  left,
  width,
  height,
  showInteractionTimeline = false,
}) => {
  // Color based on confidence
  const hue = (confidence / 100) * 120; // 0 = red, 120 = green
  const borderColor = `hsl(${hue}, 80%, 50%)`;
  const bgColor = `hsla(${hue}, 80%, 50%, 0.2)`;
  
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        width,
        height,
        border: `3px solid ${borderColor}`,
        backgroundColor: showInteractionTimeline ? bgColor : 'transparent',
        borderRadius: '4px',
        boxShadow: `0 0 20px ${bgColor}`,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Confidence label */}
      <div
        style={{
          position: 'absolute',
          top: '-28px',
          left: '0',
          backgroundColor: borderColor,
          color: 'white',
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
        }}
      >
        {confidence}% confidence
      </div>
      
      {/* Corner markers */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(corner => {
        const [v, h] = corner.split('-');
        return (
          <div
            key={corner}
            style={{
              position: 'absolute',
              [v]: '-3px',
              [h]: '-3px',
              width: '12px',
              height: '12px',
              borderStyle: 'solid',
              borderColor,
              borderWidth: v === 'top' 
                ? (h === 'left' ? '3px 0 0 3px' : '3px 3px 0 0')
                : (h === 'left' ? '0 0 3px 3px' : '0 3px 3px 0'),
            }}
          />
        );
      })}
    </div>
  );
};

export default {
  ConfidenceBadge,
  UncertaintySpectrum,
  AIFindingWithUncertainty,
  CalibrationPlot,
  GradientBoundingBox,
};
