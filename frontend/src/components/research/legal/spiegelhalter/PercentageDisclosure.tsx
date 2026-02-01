/**
 * PercentageDisclosure.tsx
 *
 * Simple percentage display for AI error rates.
 *
 * Note from Spiegelhalter (2017): Percentages are ubiquitous but often misunderstood.
 * Research shows people frequently confuse relative and absolute risk when
 * presented with percentages. Natural frequencies are generally preferred.
 *
 * However, percentages are included as a study condition since they represent
 * the "status quo" in many AI disclosure contexts.
 */

import React from 'react';
import type { AIDisclosure } from './disclosureTypes';

interface PercentageDisclosureProps {
  disclosure: AIDisclosure;
  compact?: boolean;
  onInteraction?: () => void;
}

export const PercentageDisclosure: React.FC<PercentageDisclosureProps> = ({
  disclosure,
  compact = false,
  onInteraction,
}) => {
  const { metrics, recommendation, config } = disclosure;
  const isFlagged = recommendation.isFlagged;

  const handleClick = () => {
    onInteraction?.();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-4" onClick={handleClick}>
        {config.showFDR && isFlagged && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">FDR:</span>
            <span className="text-sm font-semibold text-orange-400">
              {Math.round(metrics.fdr * 100)}%
            </span>
          </div>
        )}
        {config.showFOR && !isFlagged && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">FOR:</span>
            <span className="text-sm font-semibold text-red-400">
              {Math.round(metrics.for * 100)}%
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4" onClick={handleClick}>
      {/* Main metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* False Discovery Rate - shown for flagged cases */}
        {config.showFDR && (
          <MetricCard
            label="False Discovery Rate"
            value={metrics.fdr}
            description={isFlagged ? "of AI flags are false alarms" : "—"}
            color="orange"
            isActive={isFlagged}
          />
        )}

        {/* False Omission Rate - shown for cleared cases */}
        {config.showFOR && (
          <MetricCard
            label="False Omission Rate"
            value={metrics.for}
            description={!isFlagged ? "of AI clears have disease" : "—"}
            color="red"
            isActive={!isFlagged}
          />
        )}

        {/* PPV - if enabled */}
        {config.showPPV && (
          <MetricCard
            label="Positive Predictive Value"
            value={metrics.ppv}
            description={isFlagged ? "of AI flags are correct" : "—"}
            color="green"
            isActive={isFlagged}
          />
        )}

        {/* NPV - if enabled */}
        {config.showNPV && (
          <MetricCard
            label="Negative Predictive Value"
            value={metrics.npv}
            description={!isFlagged ? "of AI clears are correct" : "—"}
            color="green"
            isActive={!isFlagged}
          />
        )}
      </div>

      {/* Sensitivity/Specificity if enabled */}
      {(config.showSensitivity || config.showSpecificity) && (
        <div className="pt-3 border-t border-slate-700">
          <div className="grid grid-cols-2 gap-3">
            {config.showSensitivity && (
              <MetricCard
                label="Sensitivity"
                value={metrics.sensitivity}
                description="true positive rate"
                color="blue"
                size="sm"
              />
            )}
            {config.showSpecificity && (
              <MetricCard
                label="Specificity"
                value={metrics.specificity}
                description="true negative rate"
                color="blue"
                size="sm"
              />
            )}
          </div>
        </div>
      )}

      {/* Context explanation */}
      <div className="p-3 bg-slate-900/50 rounded-lg">
        <p className="text-sm text-slate-300">
          {isFlagged ? (
            <>
              The AI has flagged this case as <strong className="text-purple-400">suspicious</strong>.
              {' '}Historically, <strong className="text-orange-400">{Math.round(metrics.fdr * 100)}%</strong> of
              cases the AI flags do not have cancer (false positives).
            </>
          ) : (
            <>
              The AI has indicated this case is <strong className="text-green-400">not suspicious</strong>.
              {' '}Historically, <strong className="text-red-400">{Math.round(metrics.for * 100)}%</strong> of
              cases the AI clears actually have cancer (missed cases).
            </>
          )}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

interface MetricCardProps {
  label: string;
  value: number;
  description: string;
  color: 'orange' | 'red' | 'green' | 'blue' | 'purple';
  isActive?: boolean;
  size?: 'sm' | 'md';
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  description,
  color,
  isActive = true,
  size = 'md',
}) => {
  const colorClasses = {
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
    green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  };

  const colors = colorClasses[color];

  return (
    <div
      className={`p-3 rounded-lg border ${
        isActive ? `${colors.bg} ${colors.border}` : 'bg-slate-800 border-slate-700 opacity-50'
      }`}
    >
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div
        className={`font-semibold ${isActive ? colors.text : 'text-slate-500'} ${
          size === 'sm' ? 'text-lg' : 'text-2xl'
        }`}
      >
        {Math.round(value * 100)}%
      </div>
      <div className="text-xs text-slate-500 mt-1">{description}</div>
    </div>
  );
};

export default PercentageDisclosure;
