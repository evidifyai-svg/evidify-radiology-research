/**
 * WorkloadMonitor.tsx
 *
 * Real-time workload display component for radiologist sessions
 * Based on Dr. Stephen Macknik's research on fatigue and performance degradation
 *
 * Displays:
 * - Cases completed (e.g., "12/50")
 * - Session time in minutes
 * - Average time per case
 * - Macknik status indicator (GREEN/YELLOW/RED)
 * - Visual progress bar showing proximity to thresholds
 *
 * Usage:
 * <WorkloadMonitor
 *   metrics={workloadMetrics}
 *   compact={false}
 *   showProgressBar={true}
 * />
 */

import React, { useMemo } from 'react';
import { Clock, Activity, AlertTriangle, Zap } from 'lucide-react';
import type { WorkloadMetrics, MacknikStatus } from '../../types/workloadTypes';

// ============================================================================
// TYPES
// ============================================================================

interface WorkloadMonitorProps {
  metrics: WorkloadMetrics;
  compact?: boolean;
  showProgressBar?: boolean;
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
}

function formatAverageTime(ms: number): string {
  if (ms === 0) return '--';
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

function getStatusColor(status: MacknikStatus): {
  bg: string;
  text: string;
  border: string;
  indicator: string;
} {
  switch (status) {
    case 'GREEN':
      return {
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        border: 'border-green-500/30',
        indicator: 'bg-green-500',
      };
    case 'YELLOW':
      return {
        bg: 'bg-amber-500/20',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        indicator: 'bg-amber-500',
      };
    case 'RED':
      return {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        border: 'border-red-500/30',
        indicator: 'bg-red-500',
      };
  }
}

function getStatusEmoji(status: MacknikStatus): string {
  switch (status) {
    case 'GREEN':
      return '';
    case 'YELLOW':
      return '';
    case 'RED':
      return '';
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const WorkloadMonitor: React.FC<WorkloadMonitorProps> = ({
  metrics,
  compact = false,
  showProgressBar = true,
  className = '',
}) => {
  const statusColors = useMemo(() => getStatusColor(metrics.macknikStatus), [metrics.macknikStatus]);

  // Calculate progress towards thresholds
  const casesProgress = useMemo(() => {
    return Math.min((metrics.casesCompleted / metrics.thresholds.maxSessionCases) * 100, 100);
  }, [metrics.casesCompleted, metrics.thresholds.maxSessionCases]);

  const timeProgress = useMemo(() => {
    const sessionMinutes = metrics.totalReadingTimeMs / 60000;
    return Math.min((sessionMinutes / metrics.thresholds.maxSessionMinutes) * 100, 100);
  }, [metrics.totalReadingTimeMs, metrics.thresholds.maxSessionMinutes]);

  const rateProgress = useMemo(() => {
    return Math.min((metrics.casesPerHour / metrics.thresholds.casesPerHourRed) * 100, 100);
  }, [metrics.casesPerHour, metrics.thresholds.casesPerHourRed]);

  // Compact version for header bar
  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* Status indicator */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${statusColors.bg} ${statusColors.border} border`}>
          <span className={`w-2 h-2 rounded-full ${statusColors.indicator} animate-pulse`} />
          <span className={`text-xs font-medium ${statusColors.text}`}>
            {getStatusEmoji(metrics.macknikStatus)} {metrics.macknikStatus}
          </span>
        </div>

        {/* Cases count */}
        <div className="flex items-center gap-1 text-slate-400 text-sm">
          <Activity className="w-3.5 h-3.5" />
          <span>
            {metrics.casesCompleted}/{metrics.thresholds.maxSessionCases}
          </span>
        </div>

        {/* Session time */}
        <div className="flex items-center gap-1 text-slate-400 text-sm">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatDuration(metrics.totalReadingTimeMs)}</span>
        </div>

        {/* Cases per hour */}
        <div className="flex items-center gap-1 text-slate-400 text-sm">
          <Zap className="w-3.5 h-3.5" />
          <span>{metrics.casesPerHour}/hr</span>
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div className={`bg-slate-800 rounded-xl p-4 border border-slate-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Workload Monitor</span>
        </div>

        {/* Macknik Status Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusColors.bg} ${statusColors.border} border`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${statusColors.indicator} animate-pulse`} />
          <span className={`text-sm font-semibold ${statusColors.text}`}>
            {getStatusEmoji(metrics.macknikStatus)} {metrics.macknikStatus}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {/* Cases Completed */}
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500 mb-1">Cases</div>
          <div className="text-xl font-bold text-white">
            {metrics.casesCompleted}
            <span className="text-sm text-slate-500">/{metrics.thresholds.maxSessionCases}</span>
          </div>
        </div>

        {/* Session Time */}
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500 mb-1">Session</div>
          <div className="text-xl font-bold text-white">{formatDuration(metrics.totalReadingTimeMs)}</div>
        </div>

        {/* Avg Time/Case */}
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500 mb-1">Avg/Case</div>
          <div className="text-xl font-bold text-white">{formatAverageTime(metrics.averageTimePerCaseMs)}</div>
        </div>

        {/* Cases per Hour */}
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500 mb-1">Rate</div>
          <div className="text-xl font-bold text-white">
            {metrics.casesPerHour}
            <span className="text-sm text-slate-500">/hr</span>
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      {showProgressBar && (
        <div className="space-y-3">
          {/* Fatigue Index */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">Fatigue Index</span>
              <span className={`font-medium ${metrics.fatigueIndex >= 80 ? 'text-red-400' : metrics.fatigueIndex >= 60 ? 'text-amber-400' : 'text-green-400'}`}>
                {metrics.fatigueIndex}/100
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  metrics.fatigueIndex >= 80 ? 'bg-red-500' : metrics.fatigueIndex >= 60 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${metrics.fatigueIndex}%` }}
              />
            </div>
          </div>

          {/* Cases Progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">Cases Progress</span>
              <span className="text-slate-300">{Math.round(casesProgress)}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${casesProgress}%` }}
              />
            </div>
          </div>

          {/* Rate Indicator (relative to red threshold) */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">Rate vs Threshold</span>
              <span className={`${rateProgress >= 100 ? 'text-red-400' : rateProgress >= 75 ? 'text-amber-400' : 'text-slate-300'}`}>
                {Math.round(rateProgress)}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden relative">
              {/* Yellow threshold marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-500/60"
                style={{ left: `${(metrics.thresholds.casesPerHourYellow / metrics.thresholds.casesPerHourRed) * 100}%` }}
              />
              {/* Progress bar */}
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  rateProgress >= 100 ? 'bg-red-500' : rateProgress >= 75 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${rateProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Warning message when in YELLOW or RED */}
      {metrics.macknikStatus !== 'GREEN' && (
        <div
          className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${statusColors.bg} ${statusColors.border} border`}
        >
          <AlertTriangle className={`w-4 h-4 ${statusColors.text} mt-0.5 flex-shrink-0`} />
          <div className="text-xs">
            <span className={`font-medium ${statusColors.text}`}>
              {metrics.macknikStatus === 'YELLOW' ? 'Elevated Workload' : 'High Workload Alert'}
            </span>
            <p className="text-slate-400 mt-0.5">
              {metrics.macknikStatus === 'YELLOW'
                ? 'Research suggests accuracy may decrease. Consider pacing.'
                : 'Diagnostic accuracy significantly impacted at this pace. Consider a break.'}
            </p>
          </div>
        </div>
      )}

      {/* Citation */}
      <div className="mt-3 pt-3 border-t border-slate-700/50">
        <p className="text-[10px] text-slate-500">
          Based on Macknik et al. radiologist workload research. Thresholds: Yellow &gt;{metrics.thresholds.casesPerHourYellow}/hr, Red &gt;{metrics.thresholds.casesPerHourRed}/hr
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// MINI VERSION (for embedding in headers)
// ============================================================================

interface WorkloadMonitorMiniProps {
  metrics: WorkloadMetrics;
  onClick?: () => void;
}

export const WorkloadMonitorMini: React.FC<WorkloadMonitorMiniProps> = ({ metrics, onClick }) => {
  const statusColors = getStatusColor(metrics.macknikStatus);

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusColors.bg} ${statusColors.border} border transition-all hover:scale-105`}
    >
      <span className={`w-2 h-2 rounded-full ${statusColors.indicator} ${metrics.macknikStatus !== 'GREEN' ? 'animate-pulse' : ''}`} />
      <span className={`text-xs font-medium ${statusColors.text}`}>
        {metrics.casesCompleted} cases
      </span>
      <span className="text-slate-500">|</span>
      <span className="text-xs text-slate-400">{metrics.casesPerHour}/hr</span>
    </button>
  );
};

export default WorkloadMonitor;
