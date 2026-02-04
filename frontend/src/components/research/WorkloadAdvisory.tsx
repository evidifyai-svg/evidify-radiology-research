/**
 * WorkloadAdvisory.tsx
 *
 * Non-blocking advisory modal shown when radiologist exceeds
 * workload thresholds. Informs about potential accuracy degradation
 * and logs user's choice to continue or take a break.
 *
 * Design: Non-modal (can be dismissed), clearly informative but
 * not alarming, respects radiologist autonomy while creating
 * documentation for defensibility.
 */

import React, { useRef, useCallback } from 'react';
import type { WorkloadAdvisoryProps } from '../../types/workloadTypes';

/**
 * Get advisory content based on workload level.
 */
function getAdvisoryContent(level: WorkloadAdvisoryProps['level']): {
  title: string;
  message: string;
  iconBg: string;
  borderColor: string;
} {
  if (level === 'RED') {
    return {
      title: 'High Workload Advisory',
      message:
        'Research suggests diagnostic accuracy may decrease beyond 40 cases/hour. ' +
        'Consider taking a break to maintain optimal performance.',
      iconBg: 'bg-red-500/20',
      borderColor: 'border-red-500/50',
    };
  }

  return {
    title: 'Elevated Workload Notice',
    message:
      'You are approaching recommended workload limits. ' +
      'Studies indicate performance may begin to decline at this pace.',
    iconBg: 'bg-amber-500/20',
    borderColor: 'border-amber-500/50',
  };
}

/**
 * Format duration for display.
 */
function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} minutes`;
}

/**
 * WorkloadAdvisory component.
 * Displays a non-blocking advisory when workload thresholds are exceeded.
 */
export const WorkloadAdvisory: React.FC<WorkloadAdvisoryProps> = ({
  isOpen,
  level,
  metrics,
  onContinue,
  onTakeBreak,
}) => {
  const showTimeRef = useRef<number>(Date.now());

  // Track when advisory was shown
  if (isOpen) {
    showTimeRef.current = Date.now();
  }

  const handleContinue = useCallback(() => {
    onContinue();
  }, [onContinue]);

  const handleTakeBreak = useCallback(() => {
    onTakeBreak();
  }, [onTakeBreak]);

  if (!isOpen) {
    return null;
  }

  const content = getAdvisoryContent(level);
  const sessionDurationMs =
    Date.now() - new Date(metrics.sessionStartTime).getTime();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={`bg-slate-800 rounded-xl p-6 max-w-md mx-4 border ${content.borderColor} shadow-xl`}
        role="alertdialog"
        aria-labelledby="advisory-title"
        aria-describedby="advisory-message"
      >
        {/* Icon and title */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`${content.iconBg} rounded-full p-3`}>
            <svg
              className={`w-6 h-6 ${level === 'RED' ? 'text-red-400' : 'text-amber-400'}`}
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
          </div>
          <div>
            <h2
              id="advisory-title"
              className={`text-lg font-semibold ${level === 'RED' ? 'text-red-300' : 'text-amber-300'}`}
            >
              {content.title}
            </h2>
            <p id="advisory-message" className="text-slate-300 text-sm mt-1">
              {content.message}
            </p>
          </div>
        </div>

        {/* Current metrics summary */}
        <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-slate-400 text-xs">Cases</div>
              <div className="text-white font-semibold">{metrics.casesCompleted}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs">Session</div>
              <div className="text-white font-semibold">
                {formatDuration(sessionDurationMs)}
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-xs">Rate</div>
              <div className="text-white font-semibold">
                {Math.round(metrics.casesPerHour)}/hr
              </div>
            </div>
          </div>
        </div>

        {/* Session duration index indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs">Session Duration Index</span>
            <span className="text-slate-300 text-xs">{metrics.sessionDurationIndex}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                metrics.sessionDurationIndex >= 70
                  ? 'bg-red-500'
                  : metrics.sessionDurationIndex >= 40
                    ? 'bg-amber-500'
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(metrics.sessionDurationIndex, 100)}%` }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleTakeBreak}
            className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600
              text-white rounded-lg font-medium transition-colors"
          >
            Take Break
          </button>
          <button
            onClick={handleContinue}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
              level === 'RED'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            Continue Reading
          </button>
        </div>

        {/* Documentation notice */}
        <p className="text-slate-500 text-xs text-center mt-3">
          Your response will be documented for quality assurance purposes.
        </p>
      </div>
    </div>
  );
};

export default WorkloadAdvisory;
