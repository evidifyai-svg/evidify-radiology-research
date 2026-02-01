/**
 * AttentionSummary.tsx
 *
 * Display component for real-time viewport attention coverage.
 * Shows in researcher sidebar with key metrics.
 *
 * Displays:
 * - Overall image coverage percentage
 * - Regions not yet viewed
 * - Average dwell time per region
 * - High-priority region coverage
 *
 * Based on Wolfe's research on visual attention and search errors.
 */

import React, { useMemo } from 'react';
import { AttentionSummary as AttentionSummaryData } from '../../lib/useViewportTracking';
import { AnatomicalRegion, getRegionCode, getRegionDisplayName, HIGH_PRIORITY_REGIONS } from '../../lib/anatomicalRegions';

// ============================================================================
// TYPES
// ============================================================================

export interface AttentionSummaryProps {
  /** Attention summaries per view */
  summaries: Map<string, AttentionSummaryData>;
  /** Whether to show detailed breakdown */
  detailed?: boolean;
  /** Whether to show recommendations */
  showRecommendations?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** View to focus on (null = aggregate all) */
  focusView?: 'RCC' | 'LCC' | 'RMLO' | 'LMLO' | null;
  /** Custom styling */
  style?: React.CSSProperties;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format milliseconds to readable time.
 */
function formatTime(ms: number): string {
  if (ms === 0) return '0s';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Get color class based on coverage percentage.
 */
function getCoverageColor(percent: number): string {
  if (percent >= 80) return '#22c55e'; // green
  if (percent >= 50) return '#f59e0b'; // yellow/amber
  return '#ef4444'; // red
}

/**
 * Aggregate summaries across multiple views.
 */
function aggregateSummaries(summaries: Map<string, AttentionSummaryData>): AttentionSummaryData {
  let totalRegions = 0;
  let regionsViewed = 0;
  let totalDwellTime = 0;
  let dwellCount = 0;
  const allNeverViewed: AnatomicalRegion[] = [];
  const allHotspots: AnatomicalRegion[] = [];
  let totalClinicalScore = 0;
  let clinicalScoreCount = 0;
  let highPriorityViewed = 0;
  let highPriorityTotal = 0;

  summaries.forEach((summary) => {
    totalRegions += summary.totalRegions;
    regionsViewed += summary.regionsViewed;
    allNeverViewed.push(...summary.regionsNeverViewed);
    allHotspots.push(...summary.hotspots);

    if (summary.averageDwellTimeMs > 0) {
      totalDwellTime += summary.averageDwellTimeMs * summary.regionsViewed;
      dwellCount += summary.regionsViewed;
    }

    totalClinicalScore += summary.clinicalCoverageScore;
    clinicalScoreCount++;

    highPriorityViewed += summary.highPriorityRegionsViewed;
    highPriorityTotal += summary.highPriorityRegionsTotal;
  });

  return {
    totalRegions,
    regionsViewed,
    coveragePercent: totalRegions > 0 ? (regionsViewed / totalRegions) * 100 : 0,
    regionsNeverViewed: allNeverViewed,
    averageDwellTimeMs: dwellCount > 0 ? totalDwellTime / dwellCount : 0,
    hotspots: allHotspots.slice(0, 3),
    clinicalCoverageScore: clinicalScoreCount > 0 ? totalClinicalScore / clinicalScoreCount : 0,
    highPriorityRegionsViewed: highPriorityViewed,
    highPriorityRegionsTotal: highPriorityTotal,
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AttentionSummary displays real-time coverage statistics.
 *
 * Example display:
 * ```
 * Image Coverage: 78%
 * Regions Not Viewed: UOQ-R, Axilla-L
 * Avg Dwell Time: 2.3s/region
 * ```
 */
export const AttentionSummaryDisplay: React.FC<AttentionSummaryProps> = ({
  summaries,
  detailed = false,
  showRecommendations = true,
  compact = false,
  focusView = null,
  style,
}) => {
  // Get summary data (either for specific view or aggregated)
  const summary = useMemo(() => {
    if (focusView && summaries.has(focusView)) {
      return summaries.get(focusView)!;
    }
    return aggregateSummaries(summaries);
  }, [summaries, focusView]);

  // Determine if there are critical gaps
  const hasCriticalGaps = useMemo(() => {
    return summary.regionsNeverViewed.some((region) =>
      HIGH_PRIORITY_REGIONS.includes(region)
    );
  }, [summary.regionsNeverViewed]);

  if (compact) {
    return (
      <CompactSummary
        summary={summary}
        hasCriticalGaps={hasCriticalGaps}
        style={style}
      />
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#1f2937',
        borderRadius: 8,
        padding: 12,
        border: '1px solid #374151',
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px solid #374151',
        }}
      >
        <span
          style={{
            color: '#f3f4f6',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Attention Coverage
        </span>
        {focusView && (
          <span
            style={{
              backgroundColor: '#3b82f6',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 500,
            }}
          >
            {focusView}
          </span>
        )}
      </div>

      {/* Main Coverage */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <span style={{ color: '#9ca3af', fontSize: 12 }}>Image Coverage</span>
          <span
            style={{
              color: getCoverageColor(summary.coveragePercent),
              fontWeight: 700,
              fontSize: 18,
              fontFamily: 'monospace',
            }}
          >
            {Math.round(summary.coveragePercent)}%
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 6,
            backgroundColor: '#374151',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, summary.coveragePercent)}%`,
              backgroundColor: getCoverageColor(summary.coveragePercent),
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <StatBox
          label="Regions Viewed"
          value={`${summary.regionsViewed}/${summary.totalRegions}`}
        />
        <StatBox
          label="Avg Dwell Time"
          value={formatTime(summary.averageDwellTimeMs)}
        />
        <StatBox
          label="Clinical Score"
          value={`${Math.round(summary.clinicalCoverageScore)}%`}
          color={getCoverageColor(summary.clinicalCoverageScore)}
        />
        <StatBox
          label="High Priority"
          value={`${summary.highPriorityRegionsViewed}/${summary.highPriorityRegionsTotal}`}
          color={
            summary.highPriorityRegionsViewed === summary.highPriorityRegionsTotal
              ? '#22c55e'
              : '#f59e0b'
          }
        />
      </div>

      {/* Regions Not Viewed */}
      {summary.regionsNeverViewed.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              color: '#9ca3af',
              fontSize: 11,
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ color: hasCriticalGaps ? '#ef4444' : '#9ca3af' }}>
              {hasCriticalGaps ? '!' : ''}
            </span>
            Regions Not Viewed ({summary.regionsNeverViewed.length})
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
            }}
          >
            {summary.regionsNeverViewed.slice(0, detailed ? undefined : 6).map((region) => (
              <RegionTag
                key={region}
                region={region}
                isHighPriority={HIGH_PRIORITY_REGIONS.includes(region)}
              />
            ))}
            {!detailed && summary.regionsNeverViewed.length > 6 && (
              <span
                style={{
                  color: '#6b7280',
                  fontSize: 10,
                  padding: '2px 4px',
                }}
              >
                +{summary.regionsNeverViewed.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Hotspots */}
      {detailed && summary.hotspots.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              color: '#9ca3af',
              fontSize: 11,
              marginBottom: 4,
            }}
          >
            Highest Attention
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
            }}
          >
            {summary.hotspots.map((region) => (
              <span
                key={region}
                style={{
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontFamily: 'monospace',
                }}
              >
                {getRegionCode(region)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {showRecommendations && hasCriticalGaps && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 6,
            padding: 8,
          }}
        >
          <div
            style={{
              color: '#ef4444',
              fontSize: 11,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Attention Gap Detected
          </div>
          <div style={{ color: '#fca5a5', fontSize: 10 }}>
            High-priority anatomical regions have not been examined.
            Consider reviewing:{' '}
            {summary.regionsNeverViewed
              .filter((r) => HIGH_PRIORITY_REGIONS.includes(r))
              .map((r) => getRegionCode(r))
              .join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Compact summary for smaller displays.
 */
const CompactSummary: React.FC<{
  summary: AttentionSummaryData;
  hasCriticalGaps: boolean;
  style?: React.CSSProperties;
}> = ({ summary, hasCriticalGaps, style }) => (
  <div
    style={{
      backgroundColor: '#1f2937',
      borderRadius: 6,
      padding: 8,
      border: hasCriticalGaps ? '1px solid #ef4444' : '1px solid #374151',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      ...style,
    }}
  >
    {/* Coverage Circle */}
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        backgroundColor: '#111827',
        border: `3px solid ${getCoverageColor(summary.coveragePercent)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: getCoverageColor(summary.coveragePercent),
          fontWeight: 700,
          fontSize: 11,
          fontFamily: 'monospace',
        }}
      >
        {Math.round(summary.coveragePercent)}%
      </span>
    </div>

    {/* Stats */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          color: '#f3f4f6',
          fontSize: 11,
          fontWeight: 500,
          marginBottom: 2,
        }}
      >
        {summary.regionsViewed}/{summary.totalRegions} regions |{' '}
        {formatTime(summary.averageDwellTimeMs)}/region
      </div>
      {summary.regionsNeverViewed.length > 0 && (
        <div
          style={{
            color: hasCriticalGaps ? '#fca5a5' : '#9ca3af',
            fontSize: 10,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          Not viewed: {summary.regionsNeverViewed.map((r) => getRegionCode(r)).join(', ')}
        </div>
      )}
    </div>
  </div>
);

/**
 * Small stat box component.
 */
const StatBox: React.FC<{
  label: string;
  value: string;
  color?: string;
}> = ({ label, value, color = '#f3f4f6' }) => (
  <div
    style={{
      backgroundColor: '#111827',
      borderRadius: 4,
      padding: 6,
      textAlign: 'center',
    }}
  >
    <div style={{ color: '#6b7280', fontSize: 9, marginBottom: 2 }}>{label}</div>
    <div
      style={{
        color,
        fontWeight: 600,
        fontSize: 12,
        fontFamily: 'monospace',
      }}
    >
      {value}
    </div>
  </div>
);

/**
 * Region tag component.
 */
const RegionTag: React.FC<{
  region: AnatomicalRegion;
  isHighPriority: boolean;
}> = ({ region, isHighPriority }) => (
  <span
    style={{
      backgroundColor: isHighPriority ? 'rgba(239, 68, 68, 0.2)' : '#374151',
      color: isHighPriority ? '#fca5a5' : '#9ca3af',
      padding: '2px 6px',
      borderRadius: 4,
      fontSize: 10,
      fontFamily: 'monospace',
      border: isHighPriority ? '1px solid rgba(239, 68, 68, 0.4)' : 'none',
    }}
    title={getRegionDisplayName(region)}
  >
    {getRegionCode(region)}
    {isHighPriority && <span style={{ marginLeft: 2 }}>*</span>}
  </span>
);

// ============================================================================
// PER-VIEW BREAKDOWN
// ============================================================================

export interface PerViewBreakdownProps {
  summaries: Map<string, AttentionSummaryData>;
  style?: React.CSSProperties;
}

/**
 * Shows attention breakdown for each view separately.
 */
export const PerViewBreakdown: React.FC<PerViewBreakdownProps> = ({ summaries, style }) => {
  const views: Array<'RCC' | 'LCC' | 'RMLO' | 'LMLO'> = ['RCC', 'LCC', 'RMLO', 'LMLO'];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 8,
        ...style,
      }}
    >
      {views.map((viewKey) => {
        const summary = summaries.get(viewKey);
        if (!summary) return null;

        return (
          <div
            key={viewKey}
            style={{
              backgroundColor: '#1f2937',
              borderRadius: 6,
              padding: 8,
              border: '1px solid #374151',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  color: '#f3f4f6',
                  fontWeight: 600,
                  fontSize: 11,
                }}
              >
                {viewKey}
              </span>
              <span
                style={{
                  color: getCoverageColor(summary.coveragePercent),
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: 'monospace',
                }}
              >
                {Math.round(summary.coveragePercent)}%
              </span>
            </div>

            {/* Mini progress bar */}
            <div
              style={{
                height: 4,
                backgroundColor: '#374151',
                borderRadius: 2,
                overflow: 'hidden',
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, summary.coveragePercent)}%`,
                  backgroundColor: getCoverageColor(summary.coveragePercent),
                }}
              />
            </div>

            <div style={{ color: '#6b7280', fontSize: 9 }}>
              {summary.regionsViewed}/{summary.totalRegions} regions |{' '}
              {formatTime(summary.averageDwellTimeMs)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AttentionSummaryDisplay;
