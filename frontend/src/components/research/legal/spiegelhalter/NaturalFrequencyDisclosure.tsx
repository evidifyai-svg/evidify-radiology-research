/**
 * NaturalFrequencyDisclosure.tsx
 *
 * Spiegelhalter's preferred format for communicating uncertainty.
 *
 * Key research findings:
 * - Hoffrage et al. (2000): Natural frequencies improve Bayesian reasoning
 * - Gigerenzer & Hoffrage (1995): Ecological rationality of frequency formats
 * - Spiegelhalter (2017): "Use expected frequencies... rather than conditional probabilities"
 *
 * Format: "Out of 100 cases flagged by the AI, about 15 will NOT have cancer"
 *
 * Principles implemented:
 * 1. Consistent denominator (always 100)
 * 2. Absolute numbers, not percentages
 * 3. Explicit statement of both outcomes (complementary frequencies)
 * 4. Context-appropriate framing (flagged vs cleared)
 */

import React from 'react';
import type { AIDisclosure } from './disclosureTypes';

interface NaturalFrequencyDisclosureProps {
  disclosure: AIDisclosure;
  compact?: boolean;
  onInteraction?: () => void;
}

export const NaturalFrequencyDisclosure: React.FC<NaturalFrequencyDisclosureProps> = ({
  disclosure,
  compact = false,
  onInteraction,
}) => {
  const { metrics, recommendation, formatted, config } = disclosure;
  const isFlagged = recommendation.isFlagged;
  const denominator = config.consistentDenominator;

  // Calculate frequencies
  const fdrNumerator = Math.round(metrics.fdr * denominator);
  const fdrComplement = denominator - fdrNumerator;
  const forNumerator = Math.round(metrics.for * denominator);
  const forComplement = denominator - forNumerator;

  const handleClick = () => {
    onInteraction?.();
  };

  if (compact) {
    return (
      <div className="text-sm text-slate-300" onClick={handleClick}>
        {isFlagged ? (
          <span>
            <strong className="text-orange-400">{fdrNumerator}</strong> of{' '}
            <strong>{denominator}</strong> flags are false alarms
          </span>
        ) : (
          <span>
            <strong className="text-red-400">{forNumerator}</strong> of{' '}
            <strong>{denominator}</strong> clears have missed disease
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4" onClick={handleClick}>
      {/* Main frequency statement */}
      <div className="p-4 bg-gradient-to-br from-slate-700/50 to-slate-800 rounded-lg border border-slate-600">
        <div className="text-sm text-slate-400 mb-2">
          {isFlagged ? 'For cases AI flags as suspicious:' : 'For cases AI indicates are not suspicious:'}
        </div>

        <div className="text-lg font-medium text-white mb-4">
          Out of <span className="text-purple-400 font-bold">{denominator}</span> cases:
        </div>

        {/* Visual breakdown */}
        <div className="space-y-3">
          {isFlagged ? (
            <>
              {/* True positives */}
              <FrequencyRow
                count={fdrComplement}
                total={denominator}
                label="will have cancer"
                sublabel="(AI correct)"
                color="green"
              />
              {/* False positives */}
              <FrequencyRow
                count={fdrNumerator}
                total={denominator}
                label="will NOT have cancer"
                sublabel="(false alarms)"
                color="orange"
              />
            </>
          ) : (
            <>
              {/* True negatives */}
              <FrequencyRow
                count={forComplement}
                total={denominator}
                label="will truly be negative"
                sublabel="(AI correct)"
                color="green"
              />
              {/* False negatives */}
              <FrequencyRow
                count={forNumerator}
                total={denominator}
                label="will actually have cancer"
                sublabel="(missed cases)"
                color="red"
              />
            </>
          )}
        </div>
      </div>

      {/* What this means */}
      <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="text-sm text-slate-300">
            <strong className="text-white">What this means:</strong>
            {isFlagged ? (
              <p className="mt-1">
                When the AI flags a case as suspicious, it is correct about{' '}
                <strong className="text-green-400">{fdrComplement}</strong> times out of{' '}
                {denominator}. The remaining <strong className="text-orange-400">{fdrNumerator}</strong>{' '}
                are false alarms where no cancer is present.
              </p>
            ) : (
              <p className="mt-1">
                When the AI indicates a case is not suspicious, it is correct about{' '}
                <strong className="text-green-400">{forComplement}</strong> times out of{' '}
                {denominator}. However, <strong className="text-red-400">{forNumerator}</strong>{' '}
                cases will actually have cancer that the AI missed.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Complementary metric (if both enabled) */}
      {config.showFDR && config.showFOR && (
        <div className="p-3 bg-slate-800 rounded-lg">
          <div className="text-xs text-slate-400 mb-2">
            {isFlagged ? 'For comparison (when AI clears):' : 'For comparison (when AI flags):'}
          </div>
          <div className="text-sm text-slate-300">
            {isFlagged ? (
              <span>
                About <strong className="text-red-400">{forNumerator}</strong> of {denominator}{' '}
                cases the AI clears will have missed disease.
              </span>
            ) : (
              <span>
                About <strong className="text-orange-400">{fdrNumerator}</strong> of {denominator}{' '}
                cases the AI flags will be false alarms.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// FREQUENCY ROW COMPONENT
// ============================================================================

interface FrequencyRowProps {
  count: number;
  total: number;
  label: string;
  sublabel: string;
  color: 'green' | 'orange' | 'red';
}

const FrequencyRow: React.FC<FrequencyRowProps> = ({
  count,
  total,
  label,
  sublabel,
  color,
}) => {
  const percentage = (count / total) * 100;

  const colorClasses = {
    green: { text: 'text-green-400', bg: 'bg-green-500' },
    orange: { text: 'text-orange-400', bg: 'bg-orange-500' },
    red: { text: 'text-red-400', bg: 'bg-red-500' },
  };

  const colors = colorClasses[color];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold ${colors.text}`}>{count}</span>
          <span className="text-slate-300">{label}</span>
          <span className="text-xs text-slate-500">{sublabel}</span>
        </div>
        <span className="text-sm text-slate-400">{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.bg} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default NaturalFrequencyDisclosure;
