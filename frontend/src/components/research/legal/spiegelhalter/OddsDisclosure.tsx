/**
 * OddsDisclosure.tsx
 *
 * Odds format for probability communication.
 *
 * Research basis:
 * - Gigerenzer (2002): Odds are familiar to clinicians from betting/gambling contexts
 * - Spiegelhalter (2017): Can be intuitive for some audiences
 *
 * Format: "5 to 1 odds" (e.g., 5 to 1 odds that this flag is correct)
 *
 * Note: Odds can be confusing when probability is very low or high.
 * This format is included as an experimental condition.
 */

import React from 'react';
import type { AIDisclosure } from './disclosureTypes';

interface OddsDisclosureProps {
  disclosure: AIDisclosure;
  compact?: boolean;
  onInteraction?: () => void;
}

export const OddsDisclosure: React.FC<OddsDisclosureProps> = ({
  disclosure,
  compact = false,
  onInteraction,
}) => {
  const { metrics, recommendation } = disclosure;
  const isFlagged = recommendation.isFlagged;

  // Get the relevant error rate
  const errorRate = isFlagged ? metrics.fdr : metrics.for;
  const accuracyRate = 1 - errorRate;

  // Calculate odds
  const errorOdds = calculateOdds(errorRate);
  const accuracyOdds = calculateOdds(accuracyRate);

  const handleClick = () => {
    onInteraction?.();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2" onClick={handleClick}>
        <span className="text-sm text-slate-300">
          {accuracyOdds.statement} odds of being correct
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4" onClick={handleClick}>
      {/* Main odds display */}
      <div className="p-4 bg-gradient-to-br from-slate-700/50 to-slate-800 rounded-lg border border-slate-600">
        {/* Accuracy odds */}
        <div className="mb-4">
          <div className="text-sm text-slate-400 mb-2">
            Odds the AI is correct:
          </div>
          <div className="flex items-center gap-4">
            <OddsDisplay odds={accuracyOdds} color="green" />
            <div className="text-sm text-slate-400">
              {accuracyOdds.explanation}
            </div>
          </div>
        </div>

        {/* Error odds */}
        <div className="pt-4 border-t border-slate-600">
          <div className="text-sm text-slate-400 mb-2">
            {isFlagged ? 'Odds of false alarm:' : 'Odds of missed disease:'}
          </div>
          <div className="flex items-center gap-4">
            <OddsDisplay odds={errorOdds} color={isFlagged ? 'orange' : 'red'} />
            <div className="text-sm text-slate-400">
              {errorOdds.explanation}
            </div>
          </div>
        </div>
      </div>

      {/* Visual representation */}
      <div className="p-4 bg-slate-800 rounded-lg">
        <div className="text-xs text-slate-500 mb-3 uppercase tracking-wider">
          Visual Representation
        </div>
        <OddsVisual
          forCount={accuracyOdds.for}
          againstCount={accuracyOdds.against}
          forLabel="Correct"
          againstLabel="Incorrect"
          forColor="#22c55e"
          againstColor={isFlagged ? '#f97316' : '#ef4444'}
        />
      </div>

      {/* Interpretation */}
      <div className="p-3 bg-slate-900/50 rounded-lg">
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
            <p className="mt-1">
              {isFlagged ? (
                <>
                  For every <strong className="text-orange-400">{errorOdds.against}</strong> case
                  {errorOdds.against === 1 ? '' : 's'} where the AI flag is a false alarm, there are approximately{' '}
                  <strong className="text-green-400">{errorOdds.for}</strong> case
                  {errorOdds.for === 1 ? '' : 's'} where the flag correctly identifies cancer.
                </>
              ) : (
                <>
                  For every <strong className="text-red-400">{errorOdds.against}</strong> case
                  {errorOdds.against === 1 ? '' : 's'} where the AI misses cancer, there are approximately{' '}
                  <strong className="text-green-400">{errorOdds.for}</strong> case
                  {errorOdds.for === 1 ? '' : 's'} where the clearance is correct.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ODDS DISPLAY COMPONENT
// ============================================================================

interface OddsInfo {
  statement: string;
  for: number;
  against: number;
  explanation: string;
}

interface OddsDisplayProps {
  odds: OddsInfo;
  color: 'green' | 'orange' | 'red';
}

const OddsDisplay: React.FC<OddsDisplayProps> = ({ odds, color }) => {
  const colorClasses = {
    green: 'text-green-400 bg-green-500/10 border-green-500/30',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    red: 'text-red-400 bg-red-500/10 border-red-500/30',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${colorClasses[color]}`}
    >
      <span className="text-2xl font-bold">{odds.for}</span>
      <span className="text-slate-400">to</span>
      <span className="text-2xl font-bold">{odds.against}</span>
    </div>
  );
};

// ============================================================================
// ODDS VISUAL COMPONENT
// ============================================================================

interface OddsVisualProps {
  forCount: number;
  againstCount: number;
  forLabel: string;
  againstLabel: string;
  forColor: string;
  againstColor: string;
}

const OddsVisual: React.FC<OddsVisualProps> = ({
  forCount,
  againstCount,
  forLabel,
  againstLabel,
  forColor,
  againstColor,
}) => {
  // Normalize to max 10 blocks
  const maxBlocks = 10;
  const total = forCount + againstCount;
  const normalizedFor = Math.max(1, Math.round((forCount / total) * maxBlocks));
  const normalizedAgainst = Math.max(1, Math.round((againstCount / total) * maxBlocks));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {Array.from({ length: normalizedFor }).map((_, i) => (
            <div
              key={`for-${i}`}
              className="w-8 h-8 rounded"
              style={{ backgroundColor: forColor }}
            />
          ))}
        </div>
        <span className="text-sm text-slate-400">{forLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {Array.from({ length: normalizedAgainst }).map((_, i) => (
            <div
              key={`against-${i}`}
              className="w-8 h-8 rounded"
              style={{ backgroundColor: againstColor }}
            />
          ))}
        </div>
        <span className="text-sm text-slate-400">{againstLabel}</span>
      </div>
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateOdds(probability: number): OddsInfo {
  // Avoid division by zero
  const p = Math.max(0.001, Math.min(0.999, probability));
  const odds = p / (1 - p);

  let forCount: number;
  let againstCount: number;
  let statement: string;
  let explanation: string;

  if (odds >= 1) {
    // Odds in favor (e.g., "5 to 1")
    forCount = Math.round(odds);
    againstCount = 1;

    if (forCount === 1) {
      statement = '1 to 1';
      explanation = 'Roughly equal chance either way';
    } else {
      statement = `${forCount} to 1`;
      explanation = `About ${forCount} times more likely to occur`;
    }
  } else {
    // Odds against (e.g., "1 to 5")
    forCount = 1;
    againstCount = Math.round(1 / odds);

    statement = `1 to ${againstCount}`;
    explanation = `About ${againstCount} times less likely to occur`;
  }

  return { statement, for: forCount, against: againstCount, explanation };
}

export default OddsDisclosure;
