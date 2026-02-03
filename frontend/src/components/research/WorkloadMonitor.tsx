/**
 * WorkloadMonitor.tsx
 *
 * Real-time display of radiologist workload metrics.
 * Shows case count, session time, throughput rate, and fatigue status.
 *
 * Designed for placement in header bar with compact mode option.
 */

import React, { useMemo } from 'react';
import type { WorkloadMetrics, WorkloadMonitorProps } from '../../types/workloadTypes';

/**
 * Format milliseconds to human-readable duration.
 */
function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format milliseconds to minutes:seconds.
 */
function formatTimePerCase(ms: number): string {
  if (ms === 0) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get status indicator emoji and color.
 */
function getStatusIndicator(status: WorkloadMetrics['workloadStatus']): {
  emoji: string;
  colorClass: string;
  bgClass: string;
  label: string;
} {
  switch (status) {
    case 'GREEN':
      return {
        emoji: '●',
        colorClass: 'text-green-400',
        bgClass: 'bg-green-500/20',
        label: 'Normal',
      };
    case 'YELLOW':
      return {
        emoji: '●',
        colorClass: 'text-amber-400',
        bgClass: 'bg-amber-500/20',
        label: 'Elevated',
      };
    case 'RED':
      return {
        emoji: '●',
        colorClass: 'text-red-400',
        bgClass: 'bg-red-500/20',
        label: 'High',
      };
  }
}

/**
 * Calculate progress bar width based on fatigue index.
 */
function getFatigueBarStyle(fatigueIndex: number): {
  width: string;
  colorClass: string;
} {
  const width = `${Math.min(fatigueIndex, 100)}%`;
  let colorClass = 'bg-green-500';
  if (fatigueIndex >= 70) {
    colorClass = 'bg-red-500';
  } else if (fatigueIndex >= 40) {
    colorClass = 'bg-amber-500';
  }
  return { width, colorClass };
}

/**
 * WorkloadMonitor component.
 * Displays real-time workload metrics with status indicator.
 */
export const WorkloadMonitor: React.FC<WorkloadMonitorProps> = ({
  metrics,
  compact = false,
  onClick,
  className = '',
}) => {
  // Calculate session duration
  const sessionDurationMs = useMemo(() => {
    if (!metrics) return 0;
    const startTime = new Date(metrics.sessionStartTime).getTime();
    return Date.now() - startTime;
  }, [metrics?.sessionStartTime]);

  if (!metrics) {
    return null;
  }

  const status = getStatusIndicator(metrics.workloadStatus);
  const fatigueBar = getFatigueBarStyle(metrics.fatigueIndex);

  // Compact mode for header bar
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${status.bgClass}
          hover:opacity-80 transition-opacity cursor-pointer ${className}`}
      >
        <span className={`${status.colorClass} text-sm`}>{status.emoji}</span>
        <span className="text-slate-300 text-sm font-medium">
          {metrics.casesCompleted}/{metrics.thresholds.maxSessionCases}
        </span>
        <span className="text-slate-500 text-xs">
          {Math.round(metrics.casesPerHour)}/hr
        </span>
      </button>
    );
  }

  // Full mode with detailed metrics
  return (
    <div
      className={`bg-slate-800 rounded-xl p-4 border border-slate-700 ${className}`}
      role="region"
      aria-label="Workload Monitor"
    >
      {/* Header with status */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-slate-300 text-sm font-medium">Workload Monitor</h3>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${status.bgClass}`}>
          <span className={`${status.colorClass} text-xs`}>{status.emoji}</span>
          <span className={`${status.colorClass} text-xs font-medium`}>{status.label}</span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Cases completed */}
        <div className="bg-slate-700/50 rounded-lg p-2">
          <div className="text-slate-400 text-xs mb-0.5">Cases</div>
          <div className="text-white text-lg font-semibold">
            {metrics.casesCompleted}
            <span className="text-slate-500 text-sm font-normal">
              /{metrics.thresholds.maxSessionCases}
            </span>
          </div>
        </div>

        {/* Session time */}
        <div className="bg-slate-700/50 rounded-lg p-2">
          <div className="text-slate-400 text-xs mb-0.5">Session Time</div>
          <div className="text-white text-lg font-semibold">
            {formatDuration(sessionDurationMs)}
          </div>
        </div>

        {/* Average time per case */}
        <div className="bg-slate-700/50 rounded-lg p-2">
          <div className="text-slate-400 text-xs mb-0.5">Avg/Case</div>
          <div className="text-white text-lg font-semibold">
            {formatTimePerCase(metrics.averageTimePerCaseMs)}
          </div>
        </div>

        {/* Cases per hour */}
        <div className="bg-slate-700/50 rounded-lg p-2">
          <div className="text-slate-400 text-xs mb-0.5">Rate</div>
          <div className="text-white text-lg font-semibold">
            {Math.round(metrics.casesPerHour)}
            <span className="text-slate-500 text-sm font-normal">/hr</span>
          </div>
        </div>
      </div>

      {/* Session intensity index bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-slate-400 text-xs">Session Intensity Index</span>
          <span className="text-slate-300 text-xs font-medium">{metrics.fatigueIndex}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${fatigueBar.colorClass} transition-all duration-300`}
            style={{ width: fatigueBar.width }}
          />
        </div>
      </div>

      {/* Threshold markers */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>0</span>
        <span className="text-amber-500">|</span>
        <span className="text-red-500">|</span>
        <span>100</span>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-600 mt-0.5">
        <span></span>
        <span>{metrics.thresholds.casesPerHourYellow}/hr</span>
        <span>{metrics.thresholds.casesPerHourRed}/hr</span>
        <span></span>
      </div>

      {/* Session parameter note */}
      <p className="text-slate-600 text-xs mt-2 italic">
        Parameters configurable per study protocol.
      </p>
    </div>
  );
};

export default WorkloadMonitor;
