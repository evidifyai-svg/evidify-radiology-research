/**
 * AttentionSummary.tsx
 *
 * Display component showing attention coverage metrics for a case.
 * Designed for the researcher sidebar to provide real-time feedback
 * on which regions have been examined.
 */

import React from 'react';
import type { AttentionSummaryDisplayProps } from '../../types/viewportAttentionTypes';
import { getRegionDisplayName } from '../../lib/anatomicalRegions';

/**
 * Format milliseconds to human-readable duration.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Get color class based on coverage percentage.
 */
function getCoverageColorClass(percent: number): string {
  if (percent >= 90) return 'text-green-400';
  if (percent >= 70) return 'text-green-300';
  if (percent >= 50) return 'text-amber-400';
  return 'text-red-400';
}

/**
 * AttentionSummary display component.
 */
export const AttentionSummary: React.FC<AttentionSummaryDisplayProps> = ({
  summary,
  compact = false,
  className = '',
}) => {
  if (!summary) {
    return (
      <div className={`bg-slate-800 rounded-xl p-4 border border-slate-700 ${className}`}>
        <p className="text-slate-500 text-sm">No attention data available</p>
      </div>
    );
  }

  const coverageColorClass = getCoverageColorClass(summary.coveragePercent);

  // Compact mode for header/sidebar
  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 px-3 py-2 bg-slate-800/80 rounded-lg border border-slate-700 ${className}`}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-xs">Coverage:</span>
          <span className={`font-semibold ${coverageColorClass}`}>
            {summary.coveragePercent}%
          </span>
        </div>
        {summary.regionsNeverViewed.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-xs">|</span>
            <span className="text-red-400 text-xs">
              {summary.regionsNeverViewed.length} not viewed
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-xs">|</span>
          <span className="text-slate-400 text-xs">
            Avg: {formatDuration(summary.averageDwellTimeMs)}
          </span>
        </div>
      </div>
    );
  }

  // Full display mode
  return (
    <div
      className={`bg-slate-800 rounded-xl p-4 border border-slate-700 ${className}`}
      role="region"
      aria-label="Attention Coverage Summary"
    >
      {/* Header */}
      <h3 className="text-slate-300 text-sm font-medium mb-3">
        Attention Coverage
      </h3>

      {/* Main metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Coverage percentage */}
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${coverageColorClass}`}>
            {summary.coveragePercent}%
          </div>
          <div className="text-slate-400 text-xs mt-1">Image Coverage</div>
        </div>

        {/* Regions viewed */}
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">
            {summary.regionsViewed}
            <span className="text-slate-500 text-lg">/{summary.totalRegions}</span>
          </div>
          <div className="text-slate-400 text-xs mt-1">Regions Viewed</div>
        </div>
      </div>

      {/* Average dwell time */}
      <div className="bg-slate-700/50 rounded-lg p-2 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-xs">Avg Dwell Time</span>
          <span className="text-white text-sm font-medium">
            {formatDuration(summary.averageDwellTimeMs)}
          </span>
        </div>
      </div>

      {/* Coverage progress bar */}
      <div className="mb-4">
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              summary.coveragePercent >= 90
                ? 'bg-green-500'
                : summary.coveragePercent >= 70
                  ? 'bg-green-400'
                  : summary.coveragePercent >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(summary.coveragePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Regions not viewed */}
      {summary.regionsNeverViewed.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-red-400 text-xs font-medium">
              Regions Not Viewed
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary.regionsNeverViewed.slice(0, 6).map((region) => (
              <span
                key={region}
                className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded"
              >
                {region.replace('_', '-')}
              </span>
            ))}
            {summary.regionsNeverViewed.length > 6 && (
              <span className="px-2 py-0.5 bg-slate-600 text-slate-400 text-xs rounded">
                +{summary.regionsNeverViewed.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Hotspots */}
      {summary.hotspots.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span className="text-green-400 text-xs font-medium">
              Attention Hotspots
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary.hotspots.map((region) => (
              <span
                key={region}
                className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded"
              >
                {region.replace('_', '-')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Total reading time */}
      <div className="mt-4 pt-3 border-t border-slate-700">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Total Reading Time</span>
          <span className="text-slate-300">
            {formatDuration(summary.totalReadingTimeMs)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AttentionSummary;
