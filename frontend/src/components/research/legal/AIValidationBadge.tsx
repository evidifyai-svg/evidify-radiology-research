/**
 * AIValidationBadge.tsx
 *
 * Compact badge component showing AI validation phase per Spiegelhalter's framework.
 *
 * SPIEGELHALTER'S KEY INSIGHT (The Art of Statistics, 2019):
 * Most medical AI has only been validated to Phase 1 or 2 - tested on datasets
 * or compared to experts - but NOT shown to improve patient outcomes. Clinicians
 * should see this distinction clearly before relying on AI.
 *
 * COLOR CODING RATIONALE:
 * - Phase 1 (Red): INSUFFICIENT evidence - lab testing only
 * - Phase 2 (Orange): LOW evidence - expert comparison only
 * - Phase 3 (Yellow): MODERATE evidence - outcome data exists
 * - Phase 4 (Green): HIGH evidence - broad implementation validated
 *
 * The colors follow traffic light conventions:
 * Red/Orange = Proceed with caution
 * Yellow = Moderate confidence
 * Green = Stronger evidence supports use
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  AIValidationStatus,
  ValidationPhase,
  EvidenceQuality,
  PHASE_DESCRIPTIONS,
  PHASE_RECOMMENDATIONS,
} from '../../../lib/aiValidationTypes';
import {
  PHASE_NAMES,
  PHASE_COLORS,
  PHASE_EVIDENCE_QUALITY,
} from '../../../lib/aiValidationTypes';

// ============================================================================
// TYPES
// ============================================================================

interface AIValidationBadgeProps {
  /** The validation status to display */
  validation: AIValidationStatus;

  /** AI system name for display */
  systemName: string;

  /** Callback when badge is first displayed */
  onDisplayed?: (timestamp: string, phase: ValidationPhase) => void;

  /** Callback when user clicks for more details */
  onExpand?: (timestamp: string) => void;

  /** Callback when user acknowledges the validation status */
  onAcknowledge?: (timestamp: string, viewDurationMs: number) => void;

  /** Whether to show in compact (badge only) or expanded mode */
  compact?: boolean;

  /** Whether to require acknowledgment before proceeding */
  requireAcknowledgment?: boolean;

  /** Minimum viewing time in ms before acknowledgment is allowed */
  minimumViewingTimeMs?: number;

  /** Additional CSS classes */
  className?: string;
}

interface BadgeState {
  isExpanded: boolean;
  isAcknowledged: boolean;
  displayedAt: number;
  canAcknowledge: boolean;
  remainingTime: number;
}

// ============================================================================
// PHASE ICON COMPONENT
// ============================================================================

const PhaseIcon: React.FC<{ phase: ValidationPhase; size?: 'sm' | 'md' | 'lg' }> = ({
  phase,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Icons represent validation level
  // Phase 1: Flask (lab testing)
  // Phase 2: Users (expert comparison)
  // Phase 3: Heart/Activity (patient outcomes)
  // Phase 4: Globe (broad implementation)
  const icons: Record<ValidationPhase, React.ReactNode> = {
    1: (
      <svg className={sizeClasses[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 3h6M12 3v6m-4 2l-3 9a1 1 0 001 1h12a1 1 0 001-1l-3-9" />
        <path d="M8 11h8" />
      </svg>
    ),
    2: (
      <svg className={sizeClasses[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    3: (
      <svg className={sizeClasses[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    4: (
      <svg className={sizeClasses[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
  };

  return <>{icons[phase]}</>;
};

// ============================================================================
// EVIDENCE QUALITY INDICATOR
// ============================================================================

const EvidenceQualityBar: React.FC<{ quality: EvidenceQuality }> = ({ quality }) => {
  const levels: Record<EvidenceQuality, number> = {
    INSUFFICIENT: 1,
    LOW: 2,
    MODERATE: 3,
    HIGH: 4,
  };

  const colors: Record<EvidenceQuality, string> = {
    INSUFFICIENT: 'bg-red-500',
    LOW: 'bg-orange-500',
    MODERATE: 'bg-yellow-500',
    HIGH: 'bg-green-500',
  };

  const level = levels[quality];

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`h-2 w-4 rounded-sm ${
            i <= level ? colors[quality] : 'bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
};

// ============================================================================
// WARNING ICON
// ============================================================================

const WarningIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L1 21h22L12 2zm0 3.83L19.13 19H4.87L12 5.83zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
  </svg>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AIValidationBadge: React.FC<AIValidationBadgeProps> = ({
  validation,
  systemName,
  onDisplayed,
  onExpand,
  onAcknowledge,
  compact = false,
  requireAcknowledgment = false,
  minimumViewingTimeMs = 5000,
  className = '',
}) => {
  // State
  const [state, setState] = useState<BadgeState>({
    isExpanded: false,
    isAcknowledged: false,
    displayedAt: Date.now(),
    canAcknowledge: !requireAcknowledgment || minimumViewingTimeMs === 0,
    remainingTime: minimumViewingTimeMs,
  });

  const displayStartRef = useRef<number>(Date.now());

  // Log display on mount
  useEffect(() => {
    displayStartRef.current = Date.now();
    onDisplayed?.(new Date().toISOString(), validation.phase);

    // Handle minimum viewing time countdown
    if (requireAcknowledgment && minimumViewingTimeMs > 0) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - displayStartRef.current;
        const remaining = Math.max(0, minimumViewingTimeMs - elapsed);

        setState((prev) => ({
          ...prev,
          remainingTime: remaining,
          canAcknowledge: remaining === 0,
        }));

        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [onDisplayed, validation.phase, requireAcknowledgment, minimumViewingTimeMs]);

  // Handlers
  const handleExpand = useCallback(() => {
    setState((prev) => ({ ...prev, isExpanded: true }));
    onExpand?.(new Date().toISOString());
  }, [onExpand]);

  const handleAcknowledge = useCallback(() => {
    if (!state.canAcknowledge) return;

    const viewDurationMs = Date.now() - displayStartRef.current;
    setState((prev) => ({ ...prev, isAcknowledged: true }));
    onAcknowledge?.(new Date().toISOString(), viewDurationMs);
  }, [state.canAcknowledge, onAcknowledge]);

  // Get colors for current phase
  const colors = PHASE_COLORS[validation.phase];
  const isHighRisk = validation.phase <= 2;

  // Compact badge only
  if (compact) {
    return (
      <button
        onClick={handleExpand}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-lg
          border transition-all hover:scale-105
          ${className}
        `}
        style={{
          backgroundColor: `${colors.background}40`,
          borderColor: colors.border,
          color: colors.text,
        }}
      >
        {isHighRisk && <WarningIcon className="w-4 h-4" />}
        <PhaseIcon phase={validation.phase} size="sm" />
        <span className="font-medium text-sm">
          Phase {validation.phase}
        </span>
      </button>
    );
  }

  // Full badge with details
  return (
    <div
      className={`rounded-xl border overflow-hidden ${className}`}
      style={{
        backgroundColor: `${colors.background}60`,
        borderColor: colors.border,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: `${colors.primary}20` }}
      >
        <div className="flex items-center gap-3">
          {isHighRisk && (
            <WarningIcon
              className="w-5 h-5"
              style={{ color: colors.primary }}
            />
          )}
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">
              AI Validation Status
            </div>
            <div
              className="font-semibold text-lg"
              style={{ color: colors.text }}
            >
              PHASE {validation.phase}
              <span className="ml-2 text-sm font-normal opacity-80">
                "{validation.phaseName}"
              </span>
            </div>
          </div>
        </div>
        <PhaseIcon phase={validation.phase} size="lg" />
      </div>

      {/* Description */}
      <div className="px-4 py-3 border-b" style={{ borderColor: `${colors.border}40` }}>
        <p className="text-sm text-slate-300 leading-relaxed">
          {validation.description}
        </p>
      </div>

      {/* Metrics Row */}
      <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b" style={{ borderColor: `${colors.border}40` }}>
        <div>
          <div className="text-xs text-slate-400 mb-1">Evidence Quality</div>
          <div className="flex items-center gap-2">
            <EvidenceQualityBar quality={validation.evidenceQuality} />
            <span className="text-sm font-medium" style={{ color: colors.text }}>
              {validation.evidenceQuality}
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">FDA Status</div>
          <div className="text-sm font-medium text-white">
            {validation.regulatory.fdaCleared
              ? `${validation.regulatory.fdaClearanceType || ''} Cleared`
              : 'Not Cleared'}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">Last Validated</div>
          <div className="text-sm font-medium text-white">
            {validation.lastValidated}
          </div>
        </div>
      </div>

      {/* Spiegelhalter Advisory */}
      <div
        className="px-4 py-3"
        style={{ backgroundColor: `${colors.primary}10` }}
      >
        <div className="flex items-start gap-2">
          <WarningIcon
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            style={{ color: colors.primary }}
          />
          <div>
            <div
              className="text-xs uppercase tracking-wide font-semibold mb-1"
              style={{ color: colors.primary }}
            >
              Spiegelhalter Advisory
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              "{validation.recommendation}"
            </p>
          </div>
        </div>
      </div>

      {/* Expand Button */}
      {!state.isExpanded && (
        <button
          onClick={handleExpand}
          className="w-full px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors border-t"
          style={{ borderColor: `${colors.border}40` }}
        >
          View detailed evidence →
        </button>
      )}

      {/* Acknowledgment Section */}
      {requireAcknowledgment && !state.isAcknowledged && (
        <div className="px-4 py-3 bg-slate-800/50 border-t" style={{ borderColor: `${colors.border}40` }}>
          <button
            onClick={handleAcknowledge}
            disabled={!state.canAcknowledge}
            className={`
              w-full py-2.5 rounded-lg font-medium text-sm transition-all
              ${
                state.canAcknowledge
                  ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }
            `}
          >
            {state.canAcknowledge ? (
              'I understand this AI validation status'
            ) : (
              <>
                Please review for {Math.ceil(state.remainingTime / 1000)}s...
              </>
            )}
          </button>

          {state.canAcknowledge && (
            <p className="text-xs text-slate-500 text-center mt-2">
              By acknowledging, you confirm you have read and understood the AI validation status above.
            </p>
          )}
        </div>
      )}

      {/* Acknowledged Confirmation */}
      {state.isAcknowledged && (
        <div className="px-4 py-2 bg-green-900/20 border-t border-green-700/30">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Acknowledged at {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPACT INLINE BADGE
// ============================================================================

/**
 * Ultra-compact inline badge for use in headers or toolbars.
 */
export const AIValidationInlineBadge: React.FC<{
  phase: ValidationPhase;
  onClick?: () => void;
  className?: string;
}> = ({ phase, onClick, className = '' }) => {
  const colors = PHASE_COLORS[phase];
  const isHighRisk = phase <= 2;

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium
        border transition-all hover:scale-105
        ${className}
      `}
      style={{
        backgroundColor: `${colors.background}60`,
        borderColor: colors.border,
        color: colors.text,
      }}
      title={`AI Validation: ${PHASE_NAMES[phase]}`}
    >
      {isHighRisk && <WarningIcon className="w-3 h-3" />}
      <span>P{phase}</span>
    </button>
  );
};

// ============================================================================
// PHASE INDICATOR BAR
// ============================================================================

/**
 * Horizontal bar showing all 4 phases with current phase highlighted.
 */
export const AIValidationPhaseBar: React.FC<{
  currentPhase: ValidationPhase;
  className?: string;
}> = ({ currentPhase, className = '' }) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {([1, 2, 3, 4] as ValidationPhase[]).map((phase) => {
        const colors = PHASE_COLORS[phase];
        const isActive = phase === currentPhase;
        const isPast = phase < currentPhase;

        return (
          <div
            key={phase}
            className={`
              flex-1 h-2 rounded-full transition-all
              ${isActive ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}
            `}
            style={{
              backgroundColor: isActive || isPast ? colors.primary : '#334155',
              opacity: isActive ? 1 : isPast ? 0.7 : 0.3,
            }}
            title={`Phase ${phase}: ${PHASE_NAMES[phase]}`}
          />
        );
      })}
    </div>
  );
};

export default AIValidationBadge;
