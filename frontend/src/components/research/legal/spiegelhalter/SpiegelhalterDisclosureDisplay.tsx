/**
 * SpiegelhalterDisclosureDisplay.tsx
 *
 * Main disclosure component implementing Spiegelhalter's uncertainty framework.
 * Dynamically renders the appropriate format based on configuration.
 *
 * References:
 * - Spiegelhalter, D. (2017). Risk and Uncertainty Communication. Annual Review of Statistics.
 * - Spiegelhalter, D. (2019). The Art of Statistics: Learning from Data.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type {
  AIDisclosure,
  SpiegelhalterDisclosureFormat,
  SpiegelhalterDisclosureConfig,
  DisclosureViewedPayload,
} from './disclosureTypes';
import { PercentageDisclosure } from './PercentageDisclosure';
import { NaturalFrequencyDisclosure } from './NaturalFrequencyDisclosure';
import { IconArrayDisclosure } from './IconArrayDisclosure';
import { VerbalDisclosure } from './VerbalDisclosure';
import { OddsDisclosure } from './OddsDisclosure';
import { ComparativeDisclosure } from './ComparativeDisclosure';

// ============================================================================
// TYPES
// ============================================================================

interface SpiegelhalterDisclosureDisplayProps {
  /** The disclosure data to display */
  disclosure: AIDisclosure;

  /** Callback when disclosure is viewed */
  onViewed?: (payload: DisclosureViewedPayload) => void;

  /** Callback when user acknowledges understanding */
  onAcknowledge?: () => void;

  /** Optional className for styling */
  className?: string;

  /** Whether to show in compact mode */
  compact?: boolean;

  /** Whether to show the AI recommendation alongside */
  showRecommendation?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SpiegelhalterDisclosureDisplay: React.FC<SpiegelhalterDisclosureDisplayProps> = ({
  disclosure,
  onViewed,
  onAcknowledge,
  className = '',
  compact = false,
  showRecommendation = true,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);

  // Track scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setScrolledToBottom(true);
      }
      setInteractionCount(prev => prev + 1);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Track view duration and emit event on unmount or acknowledgement
  useEffect(() => {
    return () => {
      const durationMs = Date.now() - startTimeRef.current;
      onViewed?.({
        disclosureId: disclosure.disclosureId,
        caseId: disclosure.recommendation.location, // Use case context if available
        durationMs,
        acknowledged,
        scrolledToBottom,
        interactionCount,
      });
    };
  }, [acknowledged, disclosure, interactionCount, onViewed, scrolledToBottom]);

  const handleAcknowledge = useCallback(() => {
    setAcknowledged(true);
    const durationMs = Date.now() - startTimeRef.current;
    onViewed?.({
      disclosureId: disclosure.disclosureId,
      caseId: disclosure.recommendation.location,
      durationMs,
      acknowledged: true,
      acknowledgedAt: new Date().toISOString(),
      scrolledToBottom,
      interactionCount,
    });
    onAcknowledge?.();
  }, [disclosure, interactionCount, onAcknowledge, onViewed, scrolledToBottom]);

  const handleInteraction = useCallback(() => {
    setInteractionCount(prev => prev + 1);
  }, []);

  const format = disclosure.formatted.format;

  // Render the appropriate format component
  const renderFormat = () => {
    switch (format) {
      case 'PERCENTAGE':
        return (
          <PercentageDisclosure
            disclosure={disclosure}
            compact={compact}
            onInteraction={handleInteraction}
          />
        );

      case 'NATURAL_FREQUENCY':
        return (
          <NaturalFrequencyDisclosure
            disclosure={disclosure}
            compact={compact}
            onInteraction={handleInteraction}
          />
        );

      case 'ICON_ARRAY':
        return (
          <IconArrayDisclosure
            disclosure={disclosure}
            compact={compact}
            onInteraction={handleInteraction}
          />
        );

      case 'VERBAL_ONLY':
        return (
          <VerbalDisclosure
            disclosure={disclosure}
            showNumeric={false}
            compact={compact}
            onInteraction={handleInteraction}
          />
        );

      case 'VERBAL_PLUS_NUMERIC':
        return (
          <VerbalDisclosure
            disclosure={disclosure}
            showNumeric={true}
            compact={compact}
            onInteraction={handleInteraction}
          />
        );

      case 'ODDS':
        return (
          <OddsDisclosure
            disclosure={disclosure}
            compact={compact}
            onInteraction={handleInteraction}
          />
        );

      case 'COMPARATIVE':
        return (
          <ComparativeDisclosure
            disclosure={disclosure}
            compact={compact}
            onInteraction={handleInteraction}
          />
        );

      case 'NONE':
        return null;

      default:
        return (
          <div className="text-sm text-slate-400">
            Unknown disclosure format: {format}
          </div>
        );
    }
  };

  // Don't render anything for NONE format
  if (format === 'NONE') {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`bg-slate-800 rounded-lg overflow-hidden ${className}`}
      onClick={handleInteraction}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-purple-400"
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
            <span className="text-sm font-medium text-white">
              AI Performance Disclosure
            </span>
          </div>
          <span className="text-xs text-slate-400 uppercase tracking-wider">
            {formatLabel(format)}
          </span>
        </div>
      </div>

      {/* AI Recommendation (optional) */}
      {showRecommendation && !compact && (
        <div className="px-4 py-3 bg-purple-500/10 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-purple-400">
                {disclosure.recommendation.birads}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium text-white">
                AI Suggestion: BI-RADS {disclosure.recommendation.birads}
              </div>
              <div className="text-xs text-slate-400">
                {disclosure.recommendation.finding}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Format-specific content */}
      <div className="p-4">
        {renderFormat()}
      </div>

      {/* Confidence indicator */}
      {disclosure.config.showConfidence && !compact && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>AI Confidence</span>
            <span>{Math.round(disclosure.metrics.confidence * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-300"
              style={{ width: `${disclosure.metrics.confidence * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Acknowledgement button */}
      {disclosure.config.requireAcknowledgement && (
        <div className="px-4 pb-4">
          {!acknowledged ? (
            <button
              onClick={handleAcknowledge}
              className="w-full py-2.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-sm font-medium transition-colors border border-purple-500/30"
            >
              I understand this information
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-green-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Acknowledged
            </div>
          )}
        </div>
      )}

      {/* Footer with Spiegelhalter attribution (for research transparency) */}
      {!compact && (
        <div className="px-4 py-2 bg-slate-900/50 border-t border-slate-700">
          <p className="text-[10px] text-slate-500 text-center">
            Disclosure format based on Spiegelhalter uncertainty communication framework
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get human-readable label for format.
 */
function formatLabel(format: SpiegelhalterDisclosureFormat): string {
  const labels: Record<SpiegelhalterDisclosureFormat, string> = {
    PERCENTAGE: 'Percentage',
    NATURAL_FREQUENCY: 'Natural Frequency',
    ICON_ARRAY: 'Icon Array',
    VERBAL_ONLY: 'Verbal',
    VERBAL_PLUS_NUMERIC: 'Verbal + Numeric',
    ODDS: 'Odds',
    COMPARATIVE: 'Comparative',
    NONE: 'None',
  };
  return labels[format];
}

// ============================================================================
// UTILITY: Format Disclosure Generator
// ============================================================================

/**
 * Generate a formatted disclosure from raw metrics and config.
 */
export function generateFormattedDisclosure(
  metrics: AIDisclosure['metrics'],
  recommendation: AIDisclosure['recommendation'],
  config: SpiegelhalterDisclosureConfig
): AIDisclosure {
  const denominator = config.consistentDenominator;
  const isFlagged = recommendation.isFlagged;

  // Determine primary metric based on context
  const primaryMetric = isFlagged ? 'FDR' : 'FOR';
  const primaryValue = isFlagged ? metrics.fdr : metrics.for;

  // Generate format-specific content
  const formatted: AIDisclosure['formatted'] = {
    format: config.format,
    contextType: isFlagged ? 'FLAGGED' : 'CLEARED',
    primaryMetric,
    rawValue: primaryValue,
    fullStatement: '',
    shortStatement: '',
  };

  // Percentage format
  formatted.percentage = `${Math.round(primaryValue * 100)}%`;

  // Natural frequency format (Spiegelhalter's recommended)
  const numerator = Math.round(primaryValue * denominator);
  const complement = denominator - numerator;
  if (isFlagged) {
    formatted.naturalFrequency = {
      numerator,
      denominator,
      statement: `Out of ${denominator} cases the AI flags as suspicious, about ${numerator} will NOT have cancer (false positives)`,
      complementNumerator: complement,
      complementStatement: `About ${complement} will have cancer (true positives)`,
    };
  } else {
    formatted.naturalFrequency = {
      numerator,
      denominator,
      statement: `Out of ${denominator} cases the AI indicates are NOT suspicious, about ${numerator} will actually have cancer (missed cases)`,
      complementNumerator: complement,
      complementStatement: `About ${complement} will truly be negative`,
    };
  }

  // Verbal format
  formatted.verbal = getVerbalLabel(primaryValue, config.verbalScale);

  // Icon array format
  formatted.iconArray = {
    total: denominator,
    highlighted: numerator,
    highlightColor: isFlagged ? '#f97316' : '#ef4444', // Orange for FDR, Red for FOR
    defaultColor: '#22c55e',
    rows: 10,
    cols: 10,
    iconType: 'person',
  };

  // Odds format
  const odds = primaryValue / (1 - primaryValue);
  if (odds < 1) {
    const invOdds = Math.round(1 / odds);
    formatted.odds = {
      statement: `1 to ${invOdds} odds`,
      for: 1,
      against: invOdds,
    };
  } else {
    const roundedOdds = Math.round(odds);
    formatted.odds = {
      statement: `${roundedOdds} to 1 odds`,
      for: roundedOdds,
      against: 1,
    };
  }

  // Generate full statement based on format
  switch (config.format) {
    case 'PERCENTAGE':
      formatted.fullStatement = `The AI's ${isFlagged ? 'false discovery' : 'false omission'} rate is ${formatted.percentage}.`;
      formatted.shortStatement = `${isFlagged ? 'FDR' : 'FOR'}: ${formatted.percentage}`;
      break;
    case 'NATURAL_FREQUENCY':
      formatted.fullStatement = formatted.naturalFrequency.statement;
      formatted.shortStatement = `${numerator} of ${denominator} ${isFlagged ? 'flags incorrect' : 'clears incorrect'}`;
      break;
    case 'VERBAL_ONLY':
      formatted.fullStatement = `There is a ${formatted.verbal.label.toLowerCase()} likelihood that this AI assessment is incorrect.`;
      formatted.shortStatement = formatted.verbal.label;
      break;
    case 'VERBAL_PLUS_NUMERIC':
      formatted.fullStatement = `There is a ${formatted.verbal.label.toLowerCase()} likelihood (${formatted.percentage}) that this AI assessment is incorrect.`;
      formatted.shortStatement = `${formatted.verbal.label} (${formatted.percentage})`;
      break;
    case 'ICON_ARRAY':
      formatted.fullStatement = `In this visual, ${numerator} highlighted figures represent cases where the AI would be incorrect.`;
      formatted.shortStatement = `${numerator}/${denominator} incorrect`;
      break;
    case 'ODDS':
      formatted.fullStatement = `The odds of this AI assessment being incorrect are approximately ${formatted.odds.statement}.`;
      formatted.shortStatement = formatted.odds.statement;
      break;
    case 'COMPARATIVE':
      formatted.fullStatement = getComparativeStatement(primaryValue, isFlagged);
      formatted.shortStatement = 'See comparison';
      break;
    default:
      formatted.fullStatement = '';
      formatted.shortStatement = '';
  }

  return {
    disclosureId: `disc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    generatedAt: new Date().toISOString(),
    metrics,
    recommendation,
    formatted,
    config,
  };
}

/**
 * Get verbal label based on probability and scale.
 */
function getVerbalLabel(
  probability: number,
  scale: SpiegelhalterDisclosureConfig['verbalScale']
): AIDisclosure['formatted']['verbal'] {
  if (probability <= scale.veryLow[1]) {
    return { label: 'Very Low', description: 'Very low likelihood of error' };
  }
  if (probability <= scale.low[1]) {
    return { label: 'Low', description: 'Low likelihood of error' };
  }
  if (probability <= scale.intermediate[1]) {
    return { label: 'Intermediate', description: 'Intermediate likelihood of error' };
  }
  if (probability <= scale.high[1]) {
    return { label: 'High', description: 'High likelihood of error' };
  }
  return { label: 'Very High', description: 'Very high likelihood of error' };
}

/**
 * Get comparative statement using familiar risks.
 */
function getComparativeStatement(probability: number, isFlagged: boolean): string {
  const context = isFlagged ? 'false positive' : 'missed case';

  if (probability < 0.05) {
    return `The chance of a ${context} is lower than being in a car accident this year.`;
  }
  if (probability < 0.15) {
    return `The chance of a ${context} is similar to a typical screening mammogram false positive rate.`;
  }
  if (probability < 0.5) {
    return `The chance of a ${context} is higher than a typical screening mammogram false positive rate, but less than flipping heads.`;
  }
  return `The chance of a ${context} is similar to or greater than flipping heads on a coin.`;
}

export default SpiegelhalterDisclosureDisplay;
