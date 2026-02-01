/**
 * RegionOverlay.tsx
 *
 * Visual overlay component showing anatomical regions with attention color-coding.
 * Designed for researcher view only - can be toggled on/off.
 *
 * Color coding based on attention level:
 * - Gray: Region not yet viewed
 * - Yellow: Brief attention (< threshold for "adequate")
 * - Green: Adequate attention (sufficient dwell time)
 * - Red outline: High-priority region (per Wolfe research on cancer prevalence)
 *
 * Based on:
 * - Wolfe, J. M. (2020). "Visual Search" in Attention (2nd ed.)
 * - Standard ACR BI-RADS breast quadrant nomenclature
 */

import React, { useMemo } from 'react';
import {
  AnatomicalRegion,
  AnatomicalRegionDefinition,
  REGION_DEFINITIONS,
  HIGH_PRIORITY_REGIONS,
  getRegionCode,
  percentToPixelBounds,
} from '../../lib/anatomicalRegions';
import { RegionCoverage } from '../../lib/useViewportTracking';

// ============================================================================
// TYPES
// ============================================================================

export interface RegionOverlayProps {
  /** Which mammogram view this overlay is for */
  viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO';
  /** Container width in pixels */
  containerWidth: number;
  /** Container height in pixels */
  containerHeight: number;
  /** Coverage data for coloring regions */
  coverage?: Map<AnatomicalRegion, RegionCoverage>;
  /** Whether overlay is visible */
  visible?: boolean;
  /** Show region labels */
  showLabels?: boolean;
  /** Show dwell time on regions */
  showDwellTime?: boolean;
  /** Minimum dwell time (ms) for "adequate" viewing */
  adequateDwellThreshold?: number;
  /** Opacity of region fills (0-1) */
  fillOpacity?: number;
  /** Callback when region is clicked */
  onRegionClick?: (region: AnatomicalRegion, coverage?: RegionCoverage) => void;
  /** Callback when region is hovered */
  onRegionHover?: (region: AnatomicalRegion | null, coverage?: RegionCoverage) => void;
}

/**
 * Attention level for color coding.
 */
type AttentionLevel = 'NOT_VIEWED' | 'BRIEF' | 'ADEQUATE' | 'EXTENSIVE';

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Determine attention level based on dwell time.
 */
function getAttentionLevel(
  dwellTimeMs: number,
  adequateThreshold: number
): AttentionLevel {
  if (dwellTimeMs === 0) return 'NOT_VIEWED';
  if (dwellTimeMs < adequateThreshold * 0.5) return 'BRIEF';
  if (dwellTimeMs < adequateThreshold * 2) return 'ADEQUATE';
  return 'EXTENSIVE';
}

/**
 * Get color for attention level.
 */
function getAttentionColor(level: AttentionLevel): { fill: string; stroke: string; textColor: string } {
  switch (level) {
    case 'NOT_VIEWED':
      return { fill: 'rgba(156, 163, 175, 0.3)', stroke: '#6b7280', textColor: '#9ca3af' };
    case 'BRIEF':
      return { fill: 'rgba(251, 191, 36, 0.35)', stroke: '#f59e0b', textColor: '#fbbf24' };
    case 'ADEQUATE':
      return { fill: 'rgba(34, 197, 94, 0.35)', stroke: '#22c55e', textColor: '#4ade80' };
    case 'EXTENSIVE':
      return { fill: 'rgba(59, 130, 246, 0.4)', stroke: '#3b82f6', textColor: '#60a5fa' };
  }
}

/**
 * Format milliseconds to readable time.
 */
function formatDwellTime(ms: number): string {
  if (ms === 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * RegionOverlay renders anatomical region boundaries with attention-based coloring.
 *
 * This is a transparent overlay meant to be positioned absolutely over the
 * mammogram image. It shows:
 * - Region boundaries as colored rectangles
 * - Region labels (e.g., "UOQ-R")
 * - Dwell time if enabled
 * - High-priority region indicators
 */
export const RegionOverlay: React.FC<RegionOverlayProps> = ({
  viewKey,
  containerWidth,
  containerHeight,
  coverage,
  visible = true,
  showLabels = true,
  showDwellTime = true,
  adequateDwellThreshold = 500,
  fillOpacity = 0.3,
  onRegionClick,
  onRegionHover,
}) => {
  // Get region definitions for this view
  const regions = useMemo(() => REGION_DEFINITIONS[viewKey], [viewKey]);

  // Calculate pixel bounds for each region
  const regionRenderData = useMemo(() => {
    return regions.map((regionDef: AnatomicalRegionDefinition) => {
      const pixelBounds = percentToPixelBounds(
        regionDef.bounds,
        containerWidth,
        containerHeight
      );

      const regionCoverage = coverage?.get(regionDef.id);
      const dwellTime = regionCoverage?.totalDwellTimeMs || 0;
      const attentionLevel = getAttentionLevel(dwellTime, adequateDwellThreshold);
      const colors = getAttentionColor(attentionLevel);
      const isHighPriority = HIGH_PRIORITY_REGIONS.includes(regionDef.id);

      return {
        ...regionDef,
        pixelBounds,
        coverage: regionCoverage,
        attentionLevel,
        colors,
        isHighPriority,
        dwellTime,
      };
    });
  }, [regions, containerWidth, containerHeight, coverage, adequateDwellThreshold]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 20,
        overflow: 'hidden',
      }}
    >
      {regionRenderData.map((region) => {
        const { pixelBounds, colors, isHighPriority, attentionLevel } = region;

        return (
          <div
            key={region.id}
            style={{
              position: 'absolute',
              left: pixelBounds.x,
              top: pixelBounds.y,
              width: pixelBounds.width,
              height: pixelBounds.height,
              backgroundColor: colors.fill.replace(/[\d.]+\)$/, `${fillOpacity})`),
              border: isHighPriority
                ? `2px dashed ${colors.stroke}`
                : `1px solid ${colors.stroke}`,
              borderRadius: 4,
              pointerEvents: 'auto',
              cursor: onRegionClick ? 'pointer' : 'default',
              transition: 'background-color 0.2s, border-color 0.2s',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onRegionClick?.(region.id, region.coverage);
            }}
            onMouseEnter={() => onRegionHover?.(region.id, region.coverage)}
            onMouseLeave={() => onRegionHover?.(null)}
          >
            {/* Region label */}
            {showLabels && (
              <div
                style={{
                  position: 'absolute',
                  top: 2,
                  left: 2,
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  color: colors.textColor,
                  padding: '2px 4px',
                  borderRadius: 2,
                  fontSize: 9,
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}
              >
                {getRegionCode(region.id)}
                {isHighPriority && (
                  <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
                )}
              </div>
            )}

            {/* Dwell time indicator */}
            {showDwellTime && attentionLevel !== 'NOT_VIEWED' && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  color: colors.textColor,
                  padding: '2px 4px',
                  borderRadius: 2,
                  fontSize: 8,
                  fontFamily: 'monospace',
                  lineHeight: 1,
                }}
              >
                {formatDwellTime(region.dwellTime)}
              </div>
            )}

            {/* View count badge */}
            {region.coverage && region.coverage.viewCount > 1 && (
              <div
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  backgroundColor: colors.stroke,
                  color: '#000',
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  fontSize: 8,
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {region.coverage.viewCount}
              </div>
            )}
          </div>
        );
      })}

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          left: 4,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          padding: '4px 6px',
          borderRadius: 4,
          display: 'flex',
          gap: 8,
          fontSize: 8,
          color: '#9ca3af',
        }}
      >
        <span>
          <span style={{ color: '#6b7280' }}>-</span> Not viewed
        </span>
        <span>
          <span style={{ color: '#fbbf24' }}>-</span> Brief
        </span>
        <span>
          <span style={{ color: '#4ade80' }}>-</span> Adequate
        </span>
        <span style={{ color: '#ef4444' }}>* High priority</span>
      </div>
    </div>
  );
};

// ============================================================================
// MINI OVERLAY (for small displays)
// ============================================================================

/**
 * Compact version of RegionOverlay for smaller displays.
 * Shows just the region outlines without labels.
 */
export const RegionOverlayMini: React.FC<Omit<RegionOverlayProps, 'showLabels' | 'showDwellTime'>> = (props) => {
  return (
    <RegionOverlay
      {...props}
      showLabels={false}
      showDwellTime={false}
      fillOpacity={0.2}
    />
  );
};

// ============================================================================
// HEATMAP OVERLAY
// ============================================================================

export interface HeatmapOverlayProps {
  viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO';
  containerWidth: number;
  containerHeight: number;
  coverage?: Map<AnatomicalRegion, RegionCoverage>;
  visible?: boolean;
  /** Maximum dwell time for color scaling (ms) */
  maxDwellForScale?: number;
}

/**
 * HeatmapOverlay renders a gradient-based attention heatmap.
 * Uses warmer colors (red) for higher attention areas.
 */
export const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({
  viewKey,
  containerWidth,
  containerHeight,
  coverage,
  visible = true,
  maxDwellForScale = 5000,
}) => {
  const regions = useMemo(() => REGION_DEFINITIONS[viewKey], [viewKey]);

  if (!visible || !coverage) return null;

  // Find max dwell time for normalization
  const maxDwell = Math.max(
    ...Array.from(coverage.values()).map(c => c.totalDwellTimeMs),
    1 // Prevent division by zero
  );
  const scaleMax = Math.min(maxDwell, maxDwellForScale);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 15,
        overflow: 'hidden',
      }}
    >
      {regions.map((regionDef: AnatomicalRegionDefinition) => {
        const pixelBounds = percentToPixelBounds(
          regionDef.bounds,
          containerWidth,
          containerHeight
        );

        const regionCoverage = coverage.get(regionDef.id);
        const dwellTime = regionCoverage?.totalDwellTimeMs || 0;

        // Normalize to 0-1 range
        const intensity = Math.min(dwellTime / scaleMax, 1);

        // Color interpolation: transparent -> yellow -> orange -> red
        let hue: number;
        let saturation: number;
        let lightness: number;

        if (intensity < 0.33) {
          // Transparent to yellow
          hue = 60; // Yellow
          saturation = 100;
          lightness = 50;
        } else if (intensity < 0.66) {
          // Yellow to orange
          hue = 45 - (intensity - 0.33) * 90; // 60 -> 30
          saturation = 100;
          lightness = 50;
        } else {
          // Orange to red
          hue = 30 - (intensity - 0.66) * 90; // 30 -> 0
          saturation = 100;
          lightness = 45;
        }

        const opacity = intensity * 0.5;

        return (
          <div
            key={regionDef.id}
            style={{
              position: 'absolute',
              left: pixelBounds.x,
              top: pixelBounds.y,
              width: pixelBounds.width,
              height: pixelBounds.height,
              backgroundColor: `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`,
              borderRadius: 4,
              transition: 'background-color 0.3s',
            }}
          />
        );
      })}
    </div>
  );
};

export default RegionOverlay;
