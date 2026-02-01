/**
 * IconArrayDisclosure.tsx
 *
 * Visual icon array for communicating probability.
 *
 * Research basis:
 * - Galesic et al. (2009): Icon arrays reduce denominator neglect
 * - Spiegelhalter (2017): "Part-to-whole comparisons... helped by icon arrays"
 * - Garcia-Retamero & Cokely (2013): Visual aids improve risk comprehension
 *
 * Format: A 10x10 grid of 100 person icons, with highlighted icons representing
 * the proportion of incorrect AI predictions.
 *
 * Design principles:
 * 1. Always 100 icons (consistent denominator)
 * 2. Clear visual distinction between highlighted and default
 * 3. Grouped highlighting (not random) for pattern recognition
 * 4. Person icons to emphasize "these are real cases"
 */

import React, { useMemo } from 'react';
import type { AIDisclosure } from './disclosureTypes';

interface IconArrayDisclosureProps {
  disclosure: AIDisclosure;
  compact?: boolean;
  onInteraction?: () => void;
}

export const IconArrayDisclosure: React.FC<IconArrayDisclosureProps> = ({
  disclosure,
  compact = false,
  onInteraction,
}) => {
  const { metrics, recommendation, config } = disclosure;
  const isFlagged = recommendation.isFlagged;

  // Calculate how many icons to highlight
  const denominator = config.consistentDenominator;
  const errorRate = isFlagged ? metrics.fdr : metrics.for;
  const highlightCount = Math.round(errorRate * denominator);
  const correctCount = denominator - highlightCount;

  const handleClick = () => {
    onInteraction?.();
  };

  if (compact) {
    // Compact view: mini icon array
    return (
      <div className="flex items-center gap-3" onClick={handleClick}>
        <MiniIconArray
          total={20}
          highlighted={Math.round(errorRate * 20)}
          highlightColor={isFlagged ? '#f97316' : '#ef4444'}
        />
        <span className="text-sm text-slate-300">
          {highlightCount} of {denominator} {isFlagged ? 'false alarms' : 'missed'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4" onClick={handleClick}>
      {/* Explanation header */}
      <div className="text-center">
        <div className="text-sm text-slate-400 mb-1">
          Each figure represents one case {isFlagged ? 'flagged' : 'cleared'} by the AI
        </div>
        <div className="text-xs text-slate-500">
          Out of {denominator} cases
        </div>
      </div>

      {/* Icon Array */}
      <div className="flex justify-center">
        <IconGrid
          total={denominator}
          highlighted={highlightCount}
          highlightColor={isFlagged ? '#f97316' : '#ef4444'}
          defaultColor="#22c55e"
          iconType="person"
          rows={10}
          cols={10}
        />
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6">
        <LegendItem
          color="#22c55e"
          count={correctCount}
          label={isFlagged ? 'True positives (cancer present)' : 'True negatives (no cancer)'}
        />
        <LegendItem
          color={isFlagged ? '#f97316' : '#ef4444'}
          count={highlightCount}
          label={isFlagged ? 'False positives (no cancer)' : 'Missed cases (cancer present)'}
        />
      </div>

      {/* Summary statement */}
      <div className="p-3 bg-slate-900/50 rounded-lg text-center">
        <p className="text-sm text-slate-300">
          {isFlagged ? (
            <>
              When the AI flags a case, <strong className="text-green-400">{correctCount}</strong> out
              of {denominator} will have cancer, while{' '}
              <strong className="text-orange-400">{highlightCount}</strong> will be false alarms.
            </>
          ) : (
            <>
              When the AI clears a case, <strong className="text-green-400">{correctCount}</strong> out
              of {denominator} will truly be negative, while{' '}
              <strong className="text-red-400">{highlightCount}</strong> will have missed cancer.
            </>
          )}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// ICON GRID COMPONENT
// ============================================================================

interface IconGridProps {
  total: number;
  highlighted: number;
  highlightColor: string;
  defaultColor: string;
  iconType: 'person' | 'dot' | 'square';
  rows: number;
  cols: number;
}

const IconGrid: React.FC<IconGridProps> = ({
  total,
  highlighted,
  highlightColor,
  defaultColor,
  iconType,
  rows,
  cols,
}) => {
  // Generate array with highlighted at the end (grouped for visual clarity)
  const icons = useMemo(() => {
    const arr = [];
    const defaultCount = total - highlighted;
    for (let i = 0; i < defaultCount; i++) {
      arr.push({ isHighlighted: false, index: i });
    }
    for (let i = 0; i < highlighted; i++) {
      arr.push({ isHighlighted: true, index: defaultCount + i });
    }
    return arr;
  }, [total, highlighted]);

  const iconSize = 24;
  const gap = 2;

  return (
    <div
      className="inline-grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${iconSize}px)`,
        gap: `${gap}px`,
      }}
    >
      {icons.map((icon, i) => (
        <Icon
          key={i}
          type={iconType}
          color={icon.isHighlighted ? highlightColor : defaultColor}
          size={iconSize}
          isHighlighted={icon.isHighlighted}
        />
      ))}
    </div>
  );
};

// ============================================================================
// INDIVIDUAL ICON COMPONENT
// ============================================================================

interface IconProps {
  type: 'person' | 'dot' | 'square';
  color: string;
  size: number;
  isHighlighted: boolean;
}

const Icon: React.FC<IconProps> = ({ type, color, size, isHighlighted }) => {
  if (type === 'person') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={color}
        className={`transition-colors duration-200 ${isHighlighted ? 'animate-pulse' : ''}`}
        style={{ opacity: isHighlighted ? 1 : 0.8 }}
      >
        {/* Simple person icon */}
        <circle cx="12" cy="6" r="4" />
        <path d="M12 12c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5z" />
      </svg>
    );
  }

  if (type === 'dot') {
    return (
      <div
        style={{
          width: size - 4,
          height: size - 4,
          margin: 2,
          borderRadius: '50%',
          backgroundColor: color,
          opacity: isHighlighted ? 1 : 0.8,
        }}
        className={isHighlighted ? 'animate-pulse' : ''}
      />
    );
  }

  // Square
  return (
    <div
      style={{
        width: size - 4,
        height: size - 4,
        margin: 2,
        borderRadius: 4,
        backgroundColor: color,
        opacity: isHighlighted ? 1 : 0.8,
      }}
      className={isHighlighted ? 'animate-pulse' : ''}
    />
  );
};

// ============================================================================
// MINI ICON ARRAY (for compact view)
// ============================================================================

interface MiniIconArrayProps {
  total: number;
  highlighted: number;
  highlightColor: string;
}

const MiniIconArray: React.FC<MiniIconArrayProps> = ({
  total,
  highlighted,
  highlightColor,
}) => {
  const defaultCount = total - highlighted;

  return (
    <div className="flex gap-0.5">
      {Array.from({ length: defaultCount }).map((_, i) => (
        <div
          key={`d-${i}`}
          className="w-2 h-4 rounded-sm bg-green-500"
          style={{ opacity: 0.8 }}
        />
      ))}
      {Array.from({ length: highlighted }).map((_, i) => (
        <div
          key={`h-${i}`}
          className="w-2 h-4 rounded-sm"
          style={{ backgroundColor: highlightColor }}
        />
      ))}
    </div>
  );
};

// ============================================================================
// LEGEND ITEM
// ============================================================================

interface LegendItemProps {
  color: string;
  count: number;
  label: string;
}

const LegendItem: React.FC<LegendItemProps> = ({ color, count, label }) => (
  <div className="flex items-center gap-2">
    <div
      className="w-4 h-4 rounded"
      style={{ backgroundColor: color }}
    />
    <div className="text-sm">
      <span className="font-semibold text-white">{count}</span>
      <span className="text-slate-400 ml-1">{label}</span>
    </div>
  </div>
);

export default IconArrayDisclosure;
