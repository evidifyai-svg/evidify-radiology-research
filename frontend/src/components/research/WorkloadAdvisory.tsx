/**
 * WorkloadAdvisory.tsx
 *
 * Non-blocking advisory modal for workload warnings
 * Based on Dr. Stephen Macknik's research on radiologist fatigue
 *
 * Shows when radiologist exceeds workload thresholds, offering:
 * - Clear warning about performance impact
 * - Option to continue or take a break
 * - All interactions logged for legal defensibility
 *
 * Usage:
 * <WorkloadAdvisory
 *   isOpen={showAdvisory}
 *   advisoryType="CASE_RATE"
 *   metrics={workloadMetrics}
 *   onContinue={handleContinue}
 *   onTakeBreak={handleBreak}
 * />
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, Activity, Coffee, ChevronRight } from 'lucide-react';
import type { WorkloadMetrics, WorkloadAdvisoryProps } from '../../types/workloadTypes';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAdvisoryContent(advisoryType: WorkloadAdvisoryProps['advisoryType'], metrics: WorkloadMetrics): {
  title: string;
  message: string;
  detail: string;
  severity: 'warning' | 'critical';
} {
  switch (advisoryType) {
    case 'CASE_RATE':
      if (metrics.casesPerHour >= metrics.thresholds.casesPerHourRed) {
        return {
          title: 'High Case Rate Detected',
          message: `You are reading at ${metrics.casesPerHour} cases/hour, which exceeds the ${metrics.thresholds.casesPerHourRed} cases/hour threshold.`,
          detail: 'Research by Macknik et al. suggests diagnostic accuracy may decrease significantly at this pace. Consider taking a break or slowing down.',
          severity: 'critical',
        };
      }
      return {
        title: 'Elevated Case Rate',
        message: `You are reading at ${metrics.casesPerHour} cases/hour, approaching the recommended limit.`,
        detail: 'Research suggests accuracy may begin to decrease. Consider pacing your review.',
        severity: 'warning',
      };

    case 'SESSION_DURATION':
      const sessionMinutes = Math.round(metrics.totalReadingTimeMs / 60000);
      return {
        title: 'Extended Session Duration',
        message: `You have been reading for ${sessionMinutes} minutes, approaching the ${metrics.thresholds.maxSessionMinutes}-minute threshold.`,
        detail: 'Extended reading sessions are associated with increased fatigue and decreased diagnostic accuracy. A break is recommended.',
        severity: sessionMinutes >= metrics.thresholds.maxSessionMinutes ? 'critical' : 'warning',
      };

    case 'FATIGUE_INDEX':
      return {
        title: 'Elevated Fatigue Index',
        message: `Your current fatigue index is ${metrics.fatigueIndex}/100, indicating accumulated cognitive load.`,
        detail: 'High fatigue index correlates with increased error rates. Consider taking a restorative break.',
        severity: metrics.fatigueIndex >= 80 ? 'critical' : 'warning',
      };
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const WorkloadAdvisory: React.FC<WorkloadAdvisoryProps> = ({
  isOpen,
  advisoryType,
  metrics,
  onContinue,
  onTakeBreak,
}) => {
  const [showTime, setShowTime] = useState<number>(0);
  const [acknowledged, setAcknowledged] = useState<boolean>(false);

  // Track time advisory is shown
  useEffect(() => {
    if (isOpen) {
      setShowTime(Date.now());
      setAcknowledged(false);
    }
  }, [isOpen]);

  const content = getAdvisoryContent(advisoryType, metrics);
  const isCritical = content.severity === 'critical';

  const handleContinue = useCallback(() => {
    setAcknowledged(true);
    onContinue();
  }, [onContinue]);

  const handleTakeBreak = useCallback(() => {
    setAcknowledged(true);
    onTakeBreak();
  }, [onTakeBreak]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className={`
          bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden
          border-2 ${isCritical ? 'border-red-500/50' : 'border-amber-500/50'}
          animate-in fade-in zoom-in-95 duration-200
        `}
      >
        {/* Header */}
        <div
          className={`
            px-6 py-4 flex items-center gap-3
            ${isCritical ? 'bg-red-500/20' : 'bg-amber-500/20'}
          `}
        >
          <div
            className={`
              w-12 h-12 rounded-full flex items-center justify-center
              ${isCritical ? 'bg-red-500/30' : 'bg-amber-500/30'}
            `}
          >
            <AlertTriangle
              className={`w-6 h-6 ${isCritical ? 'text-red-400' : 'text-amber-400'}`}
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              WORKLOAD ADVISORY
            </h2>
            <p className={`text-sm ${isCritical ? 'text-red-300' : 'text-amber-300'}`}>
              {content.title}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Main message */}
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            {content.message}
          </p>

          {/* Detail box */}
          <div className="bg-slate-900/50 rounded-lg p-4 mb-5">
            <p className="text-slate-400 text-sm leading-relaxed">
              {content.detail}
            </p>
          </div>

          {/* Current metrics display */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <Activity className="w-4 h-4 text-slate-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{metrics.casesCompleted}</div>
              <div className="text-xs text-slate-500">Cases</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <Clock className="w-4 h-4 text-slate-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">
                {Math.round(metrics.totalReadingTimeMs / 60000)}m
              </div>
              <div className="text-xs text-slate-500">Duration</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <div
                className={`
                  w-4 h-4 rounded-full mx-auto mb-1
                  ${metrics.macknikStatus === 'RED' ? 'bg-red-500' : metrics.macknikStatus === 'YELLOW' ? 'bg-amber-500' : 'bg-green-500'}
                `}
              />
              <div className="text-lg font-bold text-white">{metrics.fatigueIndex}</div>
              <div className="text-xs text-slate-500">Fatigue</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleTakeBreak}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                font-medium transition-all
                ${isCritical
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
              `}
            >
              <Coffee className="w-4 h-4" />
              Take Break
            </button>
            <button
              onClick={handleContinue}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                font-medium transition-all
                ${isCritical
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-red-500/30'
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
                }
              `}
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Critical severity extra warning */}
          {isCritical && (
            <p className="mt-4 text-xs text-red-400 text-center">
              Continuing may increase diagnostic error risk. Your choice will be logged.
            </p>
          )}
        </div>

        {/* Footer citation */}
        <div className="px-6 py-3 bg-slate-900/50 border-t border-slate-700/50">
          <p className="text-[10px] text-slate-500 text-center">
            Advisory based on Macknik et al. research on radiologist workload and diagnostic accuracy.
            This interaction is logged for quality assurance.
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TOAST VERSION (for less intrusive notifications)
// ============================================================================

interface WorkloadToastProps {
  metrics: WorkloadMetrics;
  onDismiss: () => void;
  onShowDetails: () => void;
}

export const WorkloadToast: React.FC<WorkloadToastProps> = ({ metrics, onDismiss, onShowDetails }) => {
  const isCritical = metrics.macknikStatus === 'RED';

  useEffect(() => {
    // Auto-dismiss after 10 seconds for yellow, don't auto-dismiss for red
    if (!isCritical) {
      const timer = setTimeout(onDismiss, 10000);
      return () => clearTimeout(timer);
    }
  }, [isCritical, onDismiss]);

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50 max-w-sm
        bg-slate-800 rounded-lg shadow-xl overflow-hidden
        border ${isCritical ? 'border-red-500/50' : 'border-amber-500/50'}
        animate-in slide-in-from-right duration-300
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${isCritical ? 'bg-red-500/20' : 'bg-amber-500/20'}
            `}
          >
            <AlertTriangle className={`w-4 h-4 ${isCritical ? 'text-red-400' : 'text-amber-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${isCritical ? 'text-red-300' : 'text-amber-300'}`}>
              {isCritical ? 'High Workload Alert' : 'Workload Advisory'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {metrics.casesPerHour} cases/hr | Fatigue: {metrics.fatigueIndex}/100
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            &times;
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onShowDetails}
            className={`
              flex-1 text-xs py-1.5 rounded
              ${isCritical ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'}
              transition-colors
            `}
          >
            View Details
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 text-xs py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkloadAdvisory;
