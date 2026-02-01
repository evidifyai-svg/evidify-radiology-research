/**
 * useCaseDifficulty.ts
 *
 * React hook for Case Difficulty Index (CDI) management.
 * Provides CDI calculation, caching, and event logging integration.
 *
 * Usage:
 * ```tsx
 * const { cdi, isCalculating, shouldDisplay, logCDIDisplayed } = useCaseDifficulty(
 *   caseMetadata,
 *   cdiConfig,
 *   eventLogger
 * );
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  calculateCDI,
  type CaseDifficultyIndex,
  type CaseMetadata,
} from './caseDifficulty';
import {
  type CDIConfig,
  type CDIDisplayTiming,
  getDefaultCDIConfig,
} from './cdiConfig';
import type { EventLogger } from './event_logger';

// ============================================================================
// HOOK TYPES
// ============================================================================

/**
 * Current phase of case interpretation.
 */
export type InterpretationPhase =
  | 'LOADING'              // Case is loading
  | 'PRE_INTERPRETATION'   // Before first impression
  | 'POST_LOCK'            // After first impression locked
  | 'POST_AI'              // After AI revealed
  | 'FINAL'                // After final assessment
  | 'COMPLETE';            // Case completed

/**
 * CDI hook state.
 */
export interface UseCaseDifficultyState {
  /** Calculated CDI (null if not yet calculated or disabled) */
  cdi: CaseDifficultyIndex | null;

  /** Whether calculation is in progress */
  isCalculating: boolean;

  /** Whether CDI has been calculated for current case */
  isCalculated: boolean;

  /** Whether CDI should be displayed based on config and phase */
  shouldDisplay: boolean;

  /** Whether CDI was already displayed to participant */
  wasDisplayed: boolean;

  /** Current interpretation phase */
  currentPhase: InterpretationPhase;

  /** Error message if calculation failed */
  error: string | null;
}

/**
 * CDI hook actions.
 */
export interface UseCaseDifficultyActions {
  /** Manually trigger CDI calculation */
  calculate: () => void;

  /** Log that CDI was displayed to participant */
  logCDIDisplayed: () => Promise<void>;

  /** Log that CDI was calculated */
  logCDICalculated: () => Promise<void>;

  /** Update the interpretation phase */
  setPhase: (phase: InterpretationPhase) => void;

  /** Reset state for a new case */
  reset: () => void;
}

/**
 * Full hook return type.
 */
export type UseCaseDifficultyReturn = UseCaseDifficultyState & UseCaseDifficultyActions;

/**
 * Hook options.
 */
export interface UseCaseDifficultyOptions {
  /** Whether to auto-calculate on metadata change */
  autoCalculate?: boolean;

  /** Initial interpretation phase */
  initialPhase?: InterpretationPhase;

  /** Callback when CDI is calculated */
  onCalculated?: (cdi: CaseDifficultyIndex) => void;

  /** Callback when CDI display is triggered */
  onDisplay?: (cdi: CaseDifficultyIndex) => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * React hook for managing Case Difficulty Index.
 *
 * @param metadata - Case metadata for CDI calculation
 * @param config - CDI configuration (optional, uses defaults if not provided)
 * @param eventLogger - Event logger for research logging (optional)
 * @param options - Additional hook options
 */
export function useCaseDifficulty(
  metadata: CaseMetadata | null,
  config?: Partial<CDIConfig>,
  eventLogger?: EventLogger | null,
  options: UseCaseDifficultyOptions = {}
): UseCaseDifficultyReturn {
  const {
    autoCalculate = true,
    initialPhase = 'LOADING',
    onCalculated,
    onDisplay,
  } = options;

  // Merge config with defaults
  const fullConfig = useMemo(() => getDefaultCDIConfig(config), [config]);

  // State
  const [cdi, setCdi] = useState<CaseDifficultyIndex | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [wasDisplayed, setWasDisplayed] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<InterpretationPhase>(initialPhase);
  const [error, setError] = useState<string | null>(null);
  const [lastCalculatedCaseId, setLastCalculatedCaseId] = useState<string | null>(null);

  // Derived state
  const isCalculated = cdi !== null && cdi.caseId === metadata?.caseId;

  // Determine if CDI should be displayed based on config and phase
  const shouldDisplay = useMemo(() => {
    if (!fullConfig.enabled || !fullConfig.showToParticipant) return false;
    if (!isCalculated || !cdi) return false;

    const timing = fullConfig.showBeforeOrAfter;

    switch (timing) {
      case 'BEFORE_INTERPRETATION':
        return currentPhase === 'PRE_INTERPRETATION' && !wasDisplayed;

      case 'AFTER_LOCK':
        return (currentPhase === 'POST_LOCK' || currentPhase === 'POST_AI') && !wasDisplayed;

      case 'AFTER_FINAL':
        return (currentPhase === 'FINAL' || currentPhase === 'COMPLETE') && !wasDisplayed;

      case 'NEVER':
      default:
        return false;
    }
  }, [fullConfig, isCalculated, cdi, currentPhase, wasDisplayed]);

  // Calculate CDI
  const calculate = useCallback(() => {
    if (!metadata || !fullConfig.enabled) {
      setError('Cannot calculate: metadata missing or CDI disabled');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const result = calculateCDI(metadata, fullConfig);
      setCdi(result);
      setLastCalculatedCaseId(metadata.caseId);
      onCalculated?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown calculation error';
      setError(message);
      console.error('CDI calculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  }, [metadata, fullConfig, onCalculated]);

  // Auto-calculate when metadata changes
  useEffect(() => {
    if (autoCalculate && metadata && fullConfig.enabled) {
      // Only calculate if case changed
      if (metadata.caseId !== lastCalculatedCaseId) {
        calculate();
      }
    }
  }, [autoCalculate, metadata, fullConfig.enabled, lastCalculatedCaseId, calculate]);

  // Log CDI calculated event
  const logCDICalculated = useCallback(async () => {
    if (!eventLogger || !cdi) return;

    try {
      await eventLogger.addEvent('CASE_DIFFICULTY_CALCULATED', {
        caseId: cdi.caseId,
        compositeScore: cdi.compositeScore,
        difficulty: cdi.difficulty,
        radpeerPrediction: cdi.radpeerPrediction,
        percentile: cdi.percentile,
        components: cdi.components,
        prevalenceRate: cdi.prevalenceRate,
        priorProbability: cdi.priorProbability,
        difficultyFactors: cdi.difficultyFactors,
        configUsed: cdi.configUsed,
      });
    } catch (err) {
      console.error('Failed to log CDI calculated event:', err);
    }
  }, [eventLogger, cdi]);

  // Log CDI displayed event
  const logCDIDisplayed = useCallback(async () => {
    if (!eventLogger || !cdi) return;

    try {
      await eventLogger.addEvent('CASE_DIFFICULTY_DISPLAYED', {
        caseId: cdi.caseId,
        compositeScore: cdi.compositeScore,
        difficulty: cdi.difficulty,
        radpeerPrediction: cdi.radpeerPrediction,
        percentile: cdi.percentile,
        displayPhase: currentPhase,
        displayTiming: fullConfig.showBeforeOrAfter,
        showPercentile: fullConfig.showPercentile,
        showRadpeerPrediction: fullConfig.showRadpeerPrediction,
        showFactors: fullConfig.showFactors,
      });
      setWasDisplayed(true);
      onDisplay?.(cdi);
    } catch (err) {
      console.error('Failed to log CDI displayed event:', err);
    }
  }, [eventLogger, cdi, currentPhase, fullConfig, onDisplay]);

  // Update phase
  const setPhase = useCallback((phase: InterpretationPhase) => {
    setCurrentPhase(phase);
  }, []);

  // Reset state for new case
  const reset = useCallback(() => {
    setCdi(null);
    setIsCalculating(false);
    setWasDisplayed(false);
    setCurrentPhase('LOADING');
    setError(null);
  }, []);

  // Reset when metadata changes to new case
  useEffect(() => {
    if (metadata && metadata.caseId !== lastCalculatedCaseId) {
      setWasDisplayed(false);
      setCurrentPhase('LOADING');
      setError(null);
    }
  }, [metadata, lastCalculatedCaseId]);

  return {
    // State
    cdi,
    isCalculating,
    isCalculated,
    shouldDisplay,
    wasDisplayed,
    currentPhase,
    error,
    // Actions
    calculate,
    logCDIDisplayed,
    logCDICalculated,
    setPhase,
    reset,
  };
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Hook for CDI display visibility.
 * Returns true when CDI should be shown based on config and timing.
 */
export function useCDIVisibility(
  cdi: CaseDifficultyIndex | null,
  config: CDIConfig,
  phase: InterpretationPhase,
  alreadyDisplayed: boolean
): boolean {
  return useMemo(() => {
    if (!config.enabled || !config.showToParticipant || !cdi) {
      return false;
    }

    if (alreadyDisplayed) {
      // Keep showing if already displayed and not in completed phase
      return phase !== 'COMPLETE';
    }

    const timing = config.showBeforeOrAfter;

    switch (timing) {
      case 'BEFORE_INTERPRETATION':
        return phase === 'PRE_INTERPRETATION';

      case 'AFTER_LOCK':
        return phase === 'POST_LOCK' || phase === 'POST_AI';

      case 'AFTER_FINAL':
        return phase === 'FINAL';

      case 'NEVER':
      default:
        return false;
    }
  }, [cdi, config, phase, alreadyDisplayed]);
}

/**
 * Hook for CDI warning indicator.
 * Returns true if CDI score exceeds warning threshold.
 */
export function useCDIWarning(
  cdi: CaseDifficultyIndex | null,
  warningThreshold: number = 70
): boolean {
  return useMemo(() => {
    if (!cdi) return false;
    return cdi.compositeScore >= warningThreshold;
  }, [cdi, warningThreshold]);
}

/**
 * Hook for multiple CDI calculations (batch mode).
 * Useful for study setup and analysis.
 */
export function useBatchCDI(
  cases: CaseMetadata[],
  config?: Partial<CDIConfig>
): {
  results: CaseDifficultyIndex[];
  isCalculating: boolean;
  calculate: () => void;
} {
  const [results, setResults] = useState<CaseDifficultyIndex[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const fullConfig = useMemo(() => getDefaultCDIConfig(config), [config]);

  const calculate = useCallback(() => {
    setIsCalculating(true);
    try {
      const cdis = cases.map(c => calculateCDI(c, fullConfig));
      setResults(cdis);
    } finally {
      setIsCalculating(false);
    }
  }, [cases, fullConfig]);

  return { results, isCalculating, calculate };
}

// ============================================================================
// CONTEXT (optional, for app-wide CDI state)
// ============================================================================

import { createContext, useContext, type ReactNode } from 'react';

interface CDIContextValue {
  config: CDIConfig;
  currentCDI: CaseDifficultyIndex | null;
  setCurrentCDI: (cdi: CaseDifficultyIndex | null) => void;
}

const CDIContext = createContext<CDIContextValue | null>(null);

/**
 * Provider for app-wide CDI context.
 */
export function CDIProvider({
  children,
  config,
}: {
  children: ReactNode;
  config?: Partial<CDIConfig>;
}) {
  const fullConfig = useMemo(() => getDefaultCDIConfig(config), [config]);
  const [currentCDI, setCurrentCDI] = useState<CaseDifficultyIndex | null>(null);

  const value = useMemo(
    () => ({ config: fullConfig, currentCDI, setCurrentCDI }),
    [fullConfig, currentCDI]
  );

  return (
    <CDIContext.Provider value={value}>
      {children}
    </CDIContext.Provider>
  );
}

/**
 * Hook to access CDI context.
 */
export function useCDIContext(): CDIContextValue {
  const context = useContext(CDIContext);
  if (!context) {
    throw new Error('useCDIContext must be used within a CDIProvider');
  }
  return context;
}

export default useCaseDifficulty;
