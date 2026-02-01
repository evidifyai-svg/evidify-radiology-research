/**
 * CaseDifficultyDisplay.tsx
 *
 * Display component for Case Difficulty Index (CDI).
 * Shows difficulty score, percentile ranking, and contributing factors
 * to support RADPEER compliance and legal documentation.
 *
 * Design based on RADPEER Score criteria:
 * - Score 1: Diagnosis should be made
 * - Score 2: Difficult diagnosis, not ordinarily expected to be made
 *
 * Reference: Macknik SL, et al. Perceptual Limits in Radiology. Radiology. 2022.
 */

import React, { useEffect, useCallback, memo } from 'react';
import type {
  CaseDifficultyIndex,
  DifficultyLevel,
  RADPEERPrediction,
  CDIComponents,
} from '../../lib/caseDifficulty';
import type { CDIConfig } from '../../lib/cdiConfig';

// ============================================================================
// STYLES & COLORS
// ============================================================================

const DIFFICULTY_COLORS: Record<DifficultyLevel, { bg: string; text: string; border: string }> = {
  LOW: {
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    border: 'border-green-500/30',
  },
  MODERATE: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  HIGH: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
  },
  VERY_HIGH: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
};

const RADPEER_LABELS: Record<RADPEERPrediction, { short: string; full: string }> = {
  1: {
    short: 'Score 1',
    full: 'Diagnosis should be made',
  },
  2: {
    short: 'Score 2',
    full: 'Difficult - not ordinarily expected to be made',
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface CaseDifficultyDisplayProps {
  /** The calculated CDI to display */
  cdi: CaseDifficultyIndex;

  /** Optional config to control what's shown */
  config?: Partial<CDIConfig>;

  /** Callback when component is displayed (for logging) */
  onDisplay?: () => void;

  /** Whether to show compact version */
  compact?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Whether component is for researcher view (shows all details) */
  researcherView?: boolean;
}

/**
 * Case Difficulty Index display component.
 * Shows difficulty score, percentile, and contributing factors.
 */
export const CaseDifficultyDisplay: React.FC<CaseDifficultyDisplayProps> = memo(({
  cdi,
  config = {},
  onDisplay,
  compact = false,
  className = '',
  researcherView = false,
}) => {
  const {
    showPercentile = true,
    showRadpeerPrediction = true,
    showFactors = true,
  } = config;

  // Call onDisplay when component mounts
  useEffect(() => {
    onDisplay?.();
  }, [onDisplay]);

  const colors = DIFFICULTY_COLORS[cdi.difficulty];
  const radpeerLabel = RADPEER_LABELS[cdi.radpeerPrediction];

  if (compact) {
    return (
      <CompactDisplay
        cdi={cdi}
        colors={colors}
        className={className}
      />
    );
  }

  return (
    <div
      className={`rounded-lg border ${colors.border} ${colors.bg} ${className}`}
      role="region"
      aria-label="Case Difficulty Index"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-semibold ${colors.text}`}>
            CASE DIFFICULTY: {cdi.difficulty}
          </h3>
          <div className="text-right">
            <span className={`text-2xl font-bold ${colors.text}`}>
              CDI: {cdi.compositeScore}/100
            </span>
          </div>
        </div>

        {/* Progress Bar & Percentile */}
        {showPercentile && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-3 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors.text.replace('text-', 'bg-')} transition-all duration-500`}
                  style={{ width: `${cdi.compositeScore}%` }}
                />
              </div>
              <span className="text-sm text-slate-400 whitespace-nowrap">
                {cdi.percentile}{getOrdinalSuffix(cdi.percentile)} %ile
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Contributing Factors */}
      {showFactors && cdi.difficultyFactors.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-700/50">
          <h4 className="text-sm font-medium text-slate-400 mb-2">
            Contributing Factors:
          </h4>
          <ul className="space-y-1">
            {cdi.difficultyFactors.map((factor, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                <span className={colors.text}>•</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* RADPEER Prediction */}
      {showRadpeerPrediction && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${colors.text}`}>
              RADPEER Prediction: {radpeerLabel.short}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1 italic">
            "{radpeerLabel.full}"
          </p>
        </div>
      )}

      {/* Researcher View - Additional Details */}
      {researcherView && (
        <ComponentBreakdown components={cdi.components} colors={colors} />
      )}
    </div>
  );
});

CaseDifficultyDisplay.displayName = 'CaseDifficultyDisplay';

// ============================================================================
// COMPACT DISPLAY
// ============================================================================

interface CompactDisplayProps {
  cdi: CaseDifficultyIndex;
  colors: typeof DIFFICULTY_COLORS[DifficultyLevel];
  className?: string;
}

const CompactDisplay: React.FC<CompactDisplayProps> = memo(({
  cdi,
  colors,
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${colors.border} ${colors.bg} ${className}`}
      role="status"
      aria-label={`Case Difficulty: ${cdi.difficulty}, Score ${cdi.compositeScore}`}
    >
      <DifficultyIcon difficulty={cdi.difficulty} />
      <span className={`font-semibold ${colors.text}`}>
        {cdi.difficulty}
      </span>
      <span className="text-slate-400">|</span>
      <span className="text-white font-mono">
        {cdi.compositeScore}
      </span>
    </div>
  );
});

CompactDisplay.displayName = 'CompactDisplay';

// ============================================================================
// COMPONENT BREAKDOWN (Researcher View)
// ============================================================================

interface ComponentBreakdownProps {
  components: CDIComponents;
  colors: typeof DIFFICULTY_COLORS[DifficultyLevel];
}

const ComponentBreakdown: React.FC<ComponentBreakdownProps> = memo(({
  components,
  colors,
}) => {
  const items = [
    { label: 'Tissue Complexity', value: components.tissueComplexity },
    { label: 'Target Conspicuity', value: components.targetConspicuity },
    { label: 'Distractor Load', value: components.distractorLoad },
    { label: 'Location Difficulty', value: components.locationDifficulty },
    { label: 'Finding Subtlety', value: components.findingSubtlety },
  ];

  return (
    <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/30">
      <h4 className="text-sm font-medium text-slate-400 mb-3">
        Component Scores (1-5 scale):
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {items.map(({ label, value }) => (
          <div key={label} className="text-center">
            <div className="text-xs text-slate-500 mb-1">{label}</div>
            <div className="flex items-center justify-center gap-1">
              <ComponentBar value={value} colors={colors} />
              <span className="text-sm font-mono text-white">{value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

ComponentBreakdown.displayName = 'ComponentBreakdown';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface ComponentBarProps {
  value: number;
  colors: typeof DIFFICULTY_COLORS[DifficultyLevel];
}

const ComponentBar: React.FC<ComponentBarProps> = ({ value, colors }) => {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-2 h-3 rounded-sm ${
            i <= value
              ? colors.text.replace('text-', 'bg-')
              : 'bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
};

interface DifficultyIconProps {
  difficulty: DifficultyLevel;
}

const DifficultyIcon: React.FC<DifficultyIconProps> = ({ difficulty }) => {
  const iconClass = "w-4 h-4";

  switch (difficulty) {
    case 'LOW':
      return (
        <svg className={`${iconClass} text-green-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'MODERATE':
      return (
        <svg className={`${iconClass} text-blue-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'HIGH':
      return (
        <svg className={`${iconClass} text-orange-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case 'VERY_HIGH':
      return (
        <svg className={`${iconClass} text-red-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

// ============================================================================
// MODAL DISPLAY
// ============================================================================

export interface CaseDifficultyModalProps {
  cdi: CaseDifficultyIndex;
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge?: () => void;
  config?: Partial<CDIConfig>;
}

/**
 * Modal display for Case Difficulty Index.
 * Used when showing CDI as an interstitial before interpretation.
 */
export const CaseDifficultyModal: React.FC<CaseDifficultyModalProps> = ({
  cdi,
  isOpen,
  onClose,
  onAcknowledge,
  config = {},
}) => {
  const handleAcknowledge = useCallback(() => {
    onAcknowledge?.();
    onClose();
  }, [onAcknowledge, onClose]);

  if (!isOpen) return null;

  const colors = DIFFICULTY_COLORS[cdi.difficulty];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative max-w-lg w-full mx-4 rounded-xl border-2 ${colors.border} bg-slate-900 shadow-2xl`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-6">
          <CaseDifficultyDisplay
            cdi={cdi}
            config={config}
            researcherView={false}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 rounded-b-xl">
          <button
            onClick={handleAcknowledge}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors
              ${colors.bg} ${colors.text} hover:opacity-80 border ${colors.border}`}
          >
            I Understand - Proceed to Case
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// INLINE BADGE
// ============================================================================

export interface CaseDifficultyBadgeProps {
  cdi: CaseDifficultyIndex;
  showScore?: boolean;
  className?: string;
}

/**
 * Small inline badge for Case Difficulty.
 * Suitable for case lists and headers.
 */
export const CaseDifficultyBadge: React.FC<CaseDifficultyBadgeProps> = memo(({
  cdi,
  showScore = true,
  className = '',
}) => {
  const colors = DIFFICULTY_COLORS[cdi.difficulty];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
        ${colors.bg} ${colors.text} border ${colors.border} ${className}`}
      title={`Case Difficulty: ${cdi.difficulty} (${cdi.compositeScore}/100)`}
    >
      <DifficultyIcon difficulty={cdi.difficulty} />
      {showScore ? (
        <span>{cdi.compositeScore}</span>
      ) : (
        <span>{cdi.difficulty}</span>
      )}
    </span>
  );
});

CaseDifficultyBadge.displayName = 'CaseDifficultyBadge';

// ============================================================================
// LEGAL SUMMARY COMPONENT
// ============================================================================

export interface CaseDifficultyLegalSummaryProps {
  cdi: CaseDifficultyIndex;
  className?: string;
}

/**
 * Formatted legal summary for Expert Witness Packet.
 * Uses monospace font and formal language.
 */
export const CaseDifficultyLegalSummary: React.FC<CaseDifficultyLegalSummaryProps> = ({
  cdi,
  className = '',
}) => {
  return (
    <div className={`bg-slate-800 rounded-lg border border-slate-700 ${className}`}>
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
        <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide">
          Case Difficulty Analysis
        </h3>
      </div>
      <div className="p-4 font-mono text-sm text-slate-300 whitespace-pre-wrap">
        {cdi.legalImplication}
      </div>
    </div>
  );
};

// ============================================================================
// UTILITIES
// ============================================================================

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CaseDifficultyDisplay;
