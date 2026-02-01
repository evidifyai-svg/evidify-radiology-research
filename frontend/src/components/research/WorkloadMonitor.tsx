/**
 * WorkloadMonitor Component
 *
 * Non-blocking UI panel displaying real-time workload metrics.
 * Based on radiologist fatigue research (Macknik et al.).
 *
 * Feature-flagged: Only renders when workload monitoring is enabled.
 */

import React from 'react';
import { Activity, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { WorkloadMetrics, WorkloadStatus } from '../../types/workloadTypes';

interface WorkloadMonitorProps {
  metrics: WorkloadMetrics | null;
  enabled: boolean;
  /** Optional: compact mode for smaller display */
  compact?: boolean;
  /** Optional: position override */
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

/**
 * Get status indicator color classes
 */
function getStatusClasses(status: WorkloadStatus): {
  bg: string;
  text: string;
  border: string;
  indicator: string;
} {
  switch (status) {
    case 'GREEN':
      return {
        bg: 'bg-green-900/30',
        text: 'text-green-400',
        border: 'border-green-700',
        indicator: 'bg-green-500',
      };
    case 'YELLOW':
      return {
        bg: 'bg-yellow-900/30',
        text: 'text-yellow-400',
        border: 'border-yellow-700',
        indicator: 'bg-yellow-500',
      };
    case 'RED':
      return {
        bg: 'bg-red-900/30',
        text: 'text-red-400',
        border: 'border-red-700',
        indicator: 'bg-red-500',
      };
  }
}

/**
 * Format milliseconds to human-readable time
 */
function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Format session duration
 */
function formatSessionDuration(startTime: string): string {
  const ms = Date.now() - new Date(startTime).getTime();
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Progress bar component for fatigue index
 */
const FatigueBar: React.FC<{ value: number; status: WorkloadStatus }> = ({
  value,
  status,
}) => {
  const statusClasses = getStatusClasses(status);

  return (
    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full transition-all duration-500 ${statusClasses.indicator}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
};

/**
 * Main WorkloadMonitor component
 */
export const WorkloadMonitor: React.FC<WorkloadMonitorProps> = ({
  metrics,
  enabled,
  compact = false,
  position = 'top-right',
}) => {
  // Don't render if not enabled or no metrics
  if (!enabled || !metrics) {
    return null;
  }

  const statusClasses = getStatusClasses(metrics.workloadStatus);

  // Position classes
  const positionClasses: Record<string, string> = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-left': 'bottom-4 left-4',
  };

  if (compact) {
    // Compact mode: just a status indicator
    return (
      <div
        className={`fixed ${positionClasses[position]} z-40 flex items-center gap-2 px-3 py-2 rounded-lg border ${statusClasses.bg} ${statusClasses.border}`}
      >
        <div className={`w-3 h-3 rounded-full ${statusClasses.indicator} animate-pulse`} />
        <span className={`text-sm font-medium ${statusClasses.text}`}>
          {metrics.workloadStatus}
        </span>
        <span className="text-slate-400 text-xs">
          {metrics.casesCompleted} cases
        </span>
      </div>
    );
  }

  // Full panel mode
  return (
    <div
      className={`fixed ${positionClasses[position]} z-40 w-64 rounded-lg border ${statusClasses.border} ${statusClasses.bg} backdrop-blur-sm shadow-lg`}
    >
      {/* Header */}
      <div className={`px-3 py-2 border-b ${statusClasses.border} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${statusClasses.text}`} />
          <span className={`text-sm font-semibold ${statusClasses.text}`}>
            Workload Monitor
          </span>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full ${statusClasses.indicator} animate-pulse`} />
      </div>

      {/* Metrics */}
      <div className="p-3 space-y-3">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-xs">Status</span>
          <span className={`text-sm font-bold ${statusClasses.text}`}>
            {metrics.workloadStatus}
          </span>
        </div>

        {/* Cases completed */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 text-xs">Cases</span>
          </div>
          <span className="text-slate-200 text-sm font-medium">
            {metrics.casesCompleted}
          </span>
        </div>

        {/* Session time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 text-xs">Session</span>
          </div>
          <span className="text-slate-200 text-sm font-medium">
            {formatSessionDuration(metrics.sessionStartTime)}
          </span>
        </div>

        {/* Cases per hour */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-xs">Cases/hour</span>
          <span className="text-slate-200 text-sm font-medium">
            {metrics.casesPerHour.toFixed(1)}
          </span>
        </div>

        {/* Average time per case */}
        {metrics.averageTimePerCaseMs > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs">Avg time/case</span>
            <span className="text-slate-200 text-sm font-medium">
              {formatTime(metrics.averageTimePerCaseMs)}
            </span>
          </div>
        )}

        {/* Fatigue index */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs">Fatigue Index</span>
            <span className={`text-sm font-medium ${statusClasses.text}`}>
              {metrics.fatigueIndex}%
            </span>
          </div>
          <FatigueBar value={metrics.fatigueIndex} status={metrics.workloadStatus} />
        </div>

        {/* Warning message for elevated status */}
        {metrics.workloadStatus !== 'GREEN' && (
          <div className={`flex items-start gap-2 p-2 rounded ${statusClasses.bg} border ${statusClasses.border}`}>
            <AlertTriangle className={`w-4 h-4 ${statusClasses.text} flex-shrink-0 mt-0.5`} />
            <span className={`text-xs ${statusClasses.text}`}>
              {metrics.workloadStatus === 'YELLOW'
                ? 'Consider taking a short break soon.'
                : 'High workload detected. A break is recommended.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkloadMonitor;
