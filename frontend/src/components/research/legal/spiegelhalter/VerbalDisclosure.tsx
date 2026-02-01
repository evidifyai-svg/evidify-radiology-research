/**
 * VerbalDisclosure.tsx
 *
 * Verbal probability labels with optional numeric supplement.
 *
 * Research basis:
 * - Budescu et al. (2009): Verbal probabilities are accessible but ambiguous
 * - Spiegelhalter (2017): "Verbal and numerical probabilities together"
 * - IPCC (2010): Standardized verbal likelihood scale
 *
 * Two modes:
 * 1. VERBAL_ONLY: Just the verbal label (e.g., "Low likelihood")
 * 2. VERBAL_PLUS_NUMERIC: Verbal with percentage (e.g., "Low likelihood (12%)")
 *
 * Spiegelhalter's verbal scale:
 * - Very Low: < 5%
 * - Low: 5-25%
 * - Intermediate: 25-75%
 * - High: 75-95%
 * - Very High: > 95%
 */

import React from 'react';
import type { AIDisclosure, VerbalProbabilityScale } from './disclosureTypes';

interface VerbalDisclosureProps {
  disclosure: AIDisclosure;
  showNumeric?: boolean;
  compact?: boolean;
  onInteraction?: () => void;
}

export const VerbalDisclosure: React.FC<VerbalDisclosureProps> = ({
  disclosure,
  showNumeric = false,
  compact = false,
  onInteraction,
}) => {
  const { metrics, recommendation, config } = disclosure;
  const isFlagged = recommendation.isFlagged;

  // Get the relevant error rate
  const errorRate = isFlagged ? metrics.fdr : metrics.for;
  const errorLabel = getVerbalLabel(errorRate, config.verbalScale);

  // Get the relevant accuracy rate
  const accuracyRate = 1 - errorRate;
  const accuracyLabel = getVerbalLabel(accuracyRate, config.verbalScale);

  const handleClick = () => {
    onInteraction?.();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2" onClick={handleClick}>
        <VerbalBadge
          label={errorLabel.label}
          color={getColorForLabel(errorLabel.label)}
          size="sm"
        />
        {showNumeric && (
          <span className="text-sm text-slate-400">
            ({Math.round(errorRate * 100)}%)
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4" onClick={handleClick}>
      {/* Main verbal statement */}
      <div className="p-4 bg-gradient-to-br from-slate-700/50 to-slate-800 rounded-lg border border-slate-600">
        {/* Error likelihood */}
        <div className="mb-4">
          <div className="text-sm text-slate-400 mb-2">
            {isFlagged ? 'Likelihood this flag is a false alarm:' : 'Likelihood this case has missed disease:'}
          </div>
          <div className="flex items-center gap-3">
            <VerbalBadge
              label={errorLabel.label}
              color={getColorForLabel(errorLabel.label)}
              size="lg"
            />
            {showNumeric && (
              <span className="text-2xl font-bold text-white">
                ({Math.round(errorRate * 100)}%)
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-2">
            {errorLabel.description}
          </p>
        </div>

        {/* Accuracy likelihood */}
        <div className="pt-4 border-t border-slate-600">
          <div className="text-sm text-slate-400 mb-2">
            {isFlagged ? 'Likelihood this flag is correct:' : 'Likelihood this clearance is correct:'}
          </div>
          <div className="flex items-center gap-3">
            <VerbalBadge
              label={accuracyLabel.label}
              color={getColorForLabel(accuracyLabel.label)}
              size="md"
            />
            {showNumeric && (
              <span className="text-xl font-semibold text-white">
                ({Math.round(accuracyRate * 100)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Verbal scale reference (optional, for transparency) */}
      <div className="p-3 bg-slate-900/50 rounded-lg">
        <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">
          Verbal Scale Reference
        </div>
        <div className="flex justify-between">
          <ScaleMarker label="Very Low" range="<5%" />
          <ScaleMarker label="Low" range="5-25%" />
          <ScaleMarker label="Intermediate" range="25-75%" />
          <ScaleMarker label="High" range="75-95%" />
          <ScaleMarker label="Very High" range=">95%" />
        </div>
      </div>

      {/* Interpretation guidance */}
      <div className="p-3 bg-slate-800 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg
              className="w-5 h-5 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div className="text-sm text-slate-300">
            {getInterpretationGuidance(errorLabel.label, isFlagged)}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// VERBAL BADGE COMPONENT
// ============================================================================

interface VerbalBadgeProps {
  label: string;
  color: string;
  size: 'sm' | 'md' | 'lg';
}

const VerbalBadge: React.FC<VerbalBadgeProps> = ({ label, color, size }) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-lg font-semibold',
  };

  return (
    <span
      className={`inline-block rounded-full ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}50`,
      }}
    >
      {label}
    </span>
  );
};

// ============================================================================
// SCALE MARKER COMPONENT
// ============================================================================

interface ScaleMarkerProps {
  label: string;
  range: string;
}

const ScaleMarker: React.FC<ScaleMarkerProps> = ({ label, range }) => (
  <div className="text-center">
    <div className="text-xs font-medium text-slate-400">{label}</div>
    <div className="text-[10px] text-slate-500">{range}</div>
  </div>
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface VerbalLabelResult {
  label: 'Very Low' | 'Low' | 'Intermediate' | 'High' | 'Very High';
  description: string;
}

function getVerbalLabel(probability: number, scale: VerbalProbabilityScale): VerbalLabelResult {
  if (probability <= scale.veryLow[1]) {
    return {
      label: 'Very Low',
      description: 'This outcome is very unlikely to occur.',
    };
  }
  if (probability <= scale.low[1]) {
    return {
      label: 'Low',
      description: 'This outcome is unlikely, but possible.',
    };
  }
  if (probability <= scale.intermediate[1]) {
    return {
      label: 'Intermediate',
      description: 'This outcome could occur with moderate probability.',
    };
  }
  if (probability <= scale.high[1]) {
    return {
      label: 'High',
      description: 'This outcome is likely to occur.',
    };
  }
  return {
    label: 'Very High',
    description: 'This outcome is very likely to occur.',
  };
}

function getColorForLabel(label: string): string {
  const colors: Record<string, string> = {
    'Very Low': '#22c55e',   // Green
    'Low': '#84cc16',        // Lime
    'Intermediate': '#f59e0b', // Amber
    'High': '#f97316',       // Orange
    'Very High': '#ef4444',  // Red
  };
  return colors[label] || '#94a3b8';
}

function getInterpretationGuidance(label: string, isFlagged: boolean): string {
  if (isFlagged) {
    switch (label) {
      case 'Very Low':
        return 'The AI is very reliable when flagging this type of case. False alarms are rare.';
      case 'Low':
        return 'The AI is generally reliable when flagging, though some false alarms occur.';
      case 'Intermediate':
        return 'There is meaningful uncertainty. About half of similar flags may be false alarms.';
      case 'High':
        return 'Many AI flags of this type are false alarms. Consider additional verification.';
      case 'Very High':
        return 'Most AI flags of this type are false alarms. Strong independent verification recommended.';
      default:
        return '';
    }
  } else {
    switch (label) {
      case 'Very Low':
        return 'The AI rarely misses disease when clearing cases like this.';
      case 'Low':
        return 'The AI is generally reliable when clearing, though some cases are missed.';
      case 'Intermediate':
        return 'There is meaningful uncertainty. Consider additional review if clinical suspicion exists.';
      case 'High':
        return 'The AI frequently misses disease in cases like this. Careful review recommended.';
      case 'Very High':
        return 'The AI misses disease in most cases like this. Do not rely on AI clearance.';
      default:
        return '';
    }
  }
}

export default VerbalDisclosure;
