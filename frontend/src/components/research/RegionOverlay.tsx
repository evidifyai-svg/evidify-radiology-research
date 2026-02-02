/**
 * RegionOverlay.tsx
 *
 * Transparent overlay that displays anatomical regions on the mammogram.
 * Color-codes regions by attention level:
 * - Gray: Not viewed
 * - Yellow: Brief view (<2 seconds)
 * - Light Green: Adequate view (2-5 seconds)
 * - Green: Extended view (>5 seconds)
 *
 * This overlay is intended for researcher mode only and should be
 * toggled off during actual reading sessions.
 */

import React, { useMemo } from 'react';
import type { RegionOverlayProps } from '../../types/viewportAttentionTypes';
import {
  getAttentionLevelColor,
  getAttentionLevelBorderColor,
} from '../../lib/anatomicalRegions';

/**
 * Convert polygon points to SVG path string.
 */
function polygonToPath(
  polygon: Array<{ x: number; y: number }>,
  containerSize: { width: number; height: number }
): string {
  if (polygon.length === 0) return '';

  const points = polygon.map((p) => ({
    x: p.x * containerSize.width,
    y: p.y * containerSize.height,
  }));

  const first = points[0];
  const rest = points.slice(1);

  let path = `M ${first.x} ${first.y}`;
  for (const point of rest) {
    path += ` L ${point.x} ${point.y}`;
  }
  path += ' Z';

  return path;
}

/**
 * Format dwell time for display.
 */
function formatDwellTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * RegionOverlay component.
 * Renders SVG overlay showing anatomical regions with attention coloring.
 */
export const RegionOverlay: React.FC<RegionOverlayProps> = ({
  regions,
  visible,
  containerSize,
}) => {
  // Memoize paths and labels for performance
  const regionElements = useMemo(() => {
    return regions.map((region) => {
      const path = polygonToPath(region.definition.polygon, containerSize);
      const fillColor = getAttentionLevelColor(region.attentionLevel);
      const strokeColor = getAttentionLevelBorderColor(region.attentionLevel);
      const center = {
        x: region.definition.center.x * containerSize.width,
        y: region.definition.center.y * containerSize.height,
      };

      return {
        id: region.definition.id,
        path,
        fillColor,
        strokeColor,
        center,
        label: region.definition.label,
        attentionLevel: region.attentionLevel,
        dwellTimeMs: region.dwellTimeMs,
        viewCount: region.viewCount,
      };
    });
  }, [regions, containerSize]);

  if (!visible) {
    return null;
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: containerSize.width, height: containerSize.height }}
      viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
    >
      <defs>
        {/* Pattern for not-viewed regions */}
        <pattern
          id="not-viewed-pattern"
          patternUnits="userSpaceOnUse"
          width="8"
          height="8"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="8"
            stroke="rgba(148, 163, 184, 0.3)"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      {/* Region polygons */}
      {regionElements.map((region) => (
        <g key={region.id}>
          {/* Region fill */}
          <path
            d={region.path}
            fill={
              region.attentionLevel === 'NOT_VIEWED'
                ? 'url(#not-viewed-pattern)'
                : region.fillColor
            }
            stroke={region.strokeColor}
            strokeWidth="1.5"
            strokeDasharray={region.attentionLevel === 'NOT_VIEWED' ? '4,2' : 'none'}
          />

          {/* Region label background */}
          <rect
            x={region.center.x - 35}
            y={region.center.y - 10}
            width="70"
            height="20"
            rx="4"
            fill="rgba(0, 0, 0, 0.75)"
          />

          {/* Region label */}
          <text
            x={region.center.x}
            y={region.center.y + 4}
            textAnchor="middle"
            className="text-[10px] fill-white font-medium"
          >
            {region.label}
          </text>

          {/* Attention indicator (if viewed) */}
          {region.viewCount > 0 && (
            <>
              <rect
                x={region.center.x - 25}
                y={region.center.y + 12}
                width="50"
                height="14"
                rx="2"
                fill="rgba(0, 0, 0, 0.6)"
              />
              <text
                x={region.center.x}
                y={region.center.y + 22}
                textAnchor="middle"
                className="text-[9px] fill-slate-300"
              >
                {formatDwellTime(region.dwellTimeMs)} • {region.viewCount}x
              </text>
            </>
          )}
        </g>
      ))}

      {/* Legend */}
      <g transform="translate(10, 10)">
        <rect width="120" height="80" rx="4" fill="rgba(0, 0, 0, 0.8)" />

        <text x="8" y="16" className="text-[10px] fill-white font-medium">
          Attention Legend
        </text>

        {/* Legend items */}
        {[
          { level: 'NOT_VIEWED', label: 'Not Viewed', color: 'rgba(148, 163, 184, 0.2)' },
          { level: 'BRIEF', label: 'Brief (<2s)', color: 'rgba(250, 204, 21, 0.3)' },
          { level: 'ADEQUATE', label: 'Adequate (2-5s)', color: 'rgba(34, 197, 94, 0.25)' },
          { level: 'EXTENDED', label: 'Extended (>5s)', color: 'rgba(34, 197, 94, 0.4)' },
        ].map((item, index) => (
          <g key={item.level} transform={`translate(8, ${26 + index * 14})`}>
            <rect width="10" height="10" rx="2" fill={item.color} stroke="rgba(255,255,255,0.3)" />
            <text x="16" y="8" className="text-[9px] fill-slate-300">
              {item.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
};

export default RegionOverlay;
