/**
 * ComparativeDisclosure.tsx
 *
 * Comparative/analogical format for probability communication.
 *
 * Research basis:
 * - Lipkus (2007): Anchoring to familiar risks improves understanding
 * - Spiegelhalter (2017): "Analogies can help... risk of dying in a car crash"
 * - Galesic & Garcia-Retamero (2010): Comparisons aid intuitive understanding
 *
 * Format: "Similar to the risk of..." with familiar anchors
 *
 * Anchor risks used:
 * - Coin flip (50%)
 * - Typical mammogram false positive (~10%)
 * - Lifetime breast cancer risk (~13%)
 * - Car accident this year (~1%)
 * - Lightning strike (~0.00005%)
 */

import React from 'react';
import type { AIDisclosure } from './disclosureTypes';
import { COMPARATIVE_RISKS } from './disclosureTypes';

interface ComparativeDisclosureProps {
  disclosure: AIDisclosure;
  compact?: boolean;
  onInteraction?: () => void;
}

export const ComparativeDisclosure: React.FC<ComparativeDisclosureProps> = ({
  disclosure,
  compact = false,
  onInteraction,
}) => {
  const { metrics, recommendation } = disclosure;
  const isFlagged = recommendation.isFlagged;

  // Get the relevant error rate
  const errorRate = isFlagged ? metrics.fdr : metrics.for;
  const comparison = findBestComparison(errorRate);
  const accuracyRate = 1 - errorRate;
  const accuracyComparison = findBestComparison(accuracyRate);

  const handleClick = () => {
    onInteraction?.();
  };

  if (compact) {
    return (
      <div className="text-sm text-slate-300" onClick={handleClick}>
        {comparison.statement}
      </div>
    );
  }

  return (
    <div className="space-y-4" onClick={handleClick}>
      {/* Main comparison */}
      <div className="p-4 bg-gradient-to-br from-slate-700/50 to-slate-800 rounded-lg border border-slate-600">
        <div className="text-sm text-slate-400 mb-3">
          {isFlagged
            ? 'The chance of this AI flag being a false alarm is:'
            : 'The chance of this AI clearance missing cancer is:'}
        </div>

        <ComparisonCard
          probability={errorRate}
          comparison={comparison}
          color={isFlagged ? 'orange' : 'red'}
        />
      </div>

      {/* Risk scale visualization */}
      <div className="p-4 bg-slate-800 rounded-lg">
        <div className="text-xs text-slate-500 mb-4 uppercase tracking-wider">
          Risk Scale (for context)
        </div>
        <RiskScale currentProbability={errorRate} />
      </div>

      {/* Accuracy comparison */}
      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        <div className="text-sm text-slate-400 mb-3">
          {isFlagged
            ? 'Conversely, the chance this AI flag is correct is:'
            : 'Conversely, the chance this AI clearance is correct is:'}
        </div>

        <ComparisonCard
          probability={accuracyRate}
          comparison={accuracyComparison}
          color="green"
          size="sm"
        />
      </div>

      {/* Interpretation note */}
      <div className="p-3 bg-slate-800 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg
              className="w-5 h-5 text-amber-400"
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
          <div className="text-sm text-slate-400">
            <strong className="text-slate-300">Note:</strong> These comparisons are approximate
            and meant to aid intuition. Individual case characteristics may affect actual probabilities.
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPARISON CARD COMPONENT
// ============================================================================

interface ComparisonInfo {
  anchor: string;
  anchorProbability: number;
  statement: string;
  direction: 'higher' | 'lower' | 'similar';
}

interface ComparisonCardProps {
  probability: number;
  comparison: ComparisonInfo;
  color: 'green' | 'orange' | 'red';
  size?: 'sm' | 'md';
}

const ComparisonCard: React.FC<ComparisonCardProps> = ({
  probability,
  comparison,
  color,
  size = 'md',
}) => {
  const colorClasses = {
    green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  };

  const colors = colorClasses[color];

  return (
    <div className={`p-4 rounded-lg ${colors.bg} border ${colors.border}`}>
      <div className="flex items-center gap-4">
        {/* Percentage */}
        <div className={`text-${size === 'sm' ? '2xl' : '3xl'} font-bold ${colors.text}`}>
          {Math.round(probability * 100)}%
        </div>

        {/* Comparison statement */}
        <div className="flex-1">
          <div className={`text-${size === 'sm' ? 'sm' : 'base'} text-slate-300`}>
            {comparison.statement}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            ({comparison.anchor}: {Math.round(comparison.anchorProbability * 100)}%)
          </div>
        </div>

        {/* Direction indicator */}
        <DirectionIndicator direction={comparison.direction} />
      </div>
    </div>
  );
};

// ============================================================================
// DIRECTION INDICATOR
// ============================================================================

interface DirectionIndicatorProps {
  direction: 'higher' | 'lower' | 'similar';
}

const DirectionIndicator: React.FC<DirectionIndicatorProps> = ({ direction }) => {
  if (direction === 'higher') {
    return (
      <div className="flex flex-col items-center text-red-400">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-[10px]">HIGHER</span>
      </div>
    );
  }

  if (direction === 'lower') {
    return (
      <div className="flex flex-col items-center text-green-400">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-[10px]">LOWER</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-blue-400">
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
          clipRule="evenodd"
        />
      </svg>
      <span className="text-[10px]">SIMILAR</span>
    </div>
  );
};

// ============================================================================
// RISK SCALE VISUALIZATION
// ============================================================================

interface RiskScaleProps {
  currentProbability: number;
}

const RiskScale: React.FC<RiskScaleProps> = ({ currentProbability }) => {
  const markers = [
    { prob: 0.01, label: 'Car accident', position: 10 },
    { prob: 0.10, label: 'Mammo false+', position: 30 },
    { prob: 0.13, label: 'Lifetime BC', position: 40 },
    { prob: 0.50, label: 'Coin flip', position: 70 },
  ];

  // Calculate position for current probability (log scale for better spread)
  const getPosition = (p: number) => {
    const logP = Math.log10(Math.max(0.001, p));
    const minLog = Math.log10(0.001);
    const maxLog = Math.log10(1);
    return ((logP - minLog) / (maxLog - minLog)) * 100;
  };

  const currentPosition = getPosition(currentProbability);

  return (
    <div className="relative h-20">
      {/* Scale bar */}
      <div className="absolute top-8 left-0 right-0 h-2 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full" />

      {/* Markers */}
      {markers.map((marker) => (
        <div
          key={marker.label}
          className="absolute flex flex-col items-center"
          style={{ left: `${marker.position}%`, transform: 'translateX(-50%)' }}
        >
          <div className="text-[10px] text-slate-400 whitespace-nowrap">{marker.label}</div>
          <div className="w-0.5 h-3 bg-slate-500 mt-1" />
        </div>
      ))}

      {/* Current position indicator */}
      <div
        className="absolute flex flex-col items-center"
        style={{
          left: `${Math.min(95, Math.max(5, currentPosition))}%`,
          transform: 'translateX(-50%)',
          top: '24px',
        }}
      >
        <div className="w-4 h-4 rounded-full bg-purple-500 border-2 border-white shadow-lg" />
        <div className="text-xs font-medium text-purple-400 mt-1">
          {Math.round(currentProbability * 100)}%
        </div>
      </div>

      {/* Scale labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-slate-500">
        <span>0.1%</span>
        <span>1%</span>
        <span>10%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function findBestComparison(probability: number): ComparisonInfo {
  // Find the closest anchor
  let bestMatch = {
    key: 'coinFlip',
    ...COMPARATIVE_RISKS.coinFlip,
  };
  let bestDistance = Math.abs(probability - bestMatch.probability);

  for (const [key, risk] of Object.entries(COMPARATIVE_RISKS)) {
    const distance = Math.abs(probability - risk.probability);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = { key, ...risk };
    }
  }

  // Determine direction relative to anchor
  let direction: 'higher' | 'lower' | 'similar';
  const ratio = probability / bestMatch.probability;
  if (ratio > 1.5) {
    direction = 'higher';
  } else if (ratio < 0.67) {
    direction = 'lower';
  } else {
    direction = 'similar';
  }

  // Generate statement
  let statement: string;
  if (direction === 'similar') {
    statement = `Similar to ${bestMatch.description}`;
  } else if (direction === 'higher') {
    const multiplier = Math.round(ratio);
    statement = `About ${multiplier}x higher than ${bestMatch.description}`;
  } else {
    const divisor = Math.round(1 / ratio);
    statement = `About ${divisor}x lower than ${bestMatch.description}`;
  }

  return {
    anchor: bestMatch.key,
    anchorProbability: bestMatch.probability,
    statement,
    direction,
  };
}

export default ComparativeDisclosure;
