/**
 * ValidationComprehensionCheck.tsx
 *
 * Comprehension check component to verify clinician understanding of
 * AI validation status per Spiegelhalter's 4-phase framework.
 *
 * PURPOSE:
 * Per Brown's mock jury research: "Jurors may be more sympathetic to clinicians
 * who can demonstrate they understood AI limitations before relying on it."
 *
 * This component:
 * 1. Tests whether the clinician understands what the validation phase means
 * 2. Documents the response for legal defensibility
 * 3. Provides immediate feedback with correct explanation
 *
 * LEGAL SIGNIFICANCE:
 * By requiring a comprehension check, we create stronger evidence that the
 * clinician actually understood the AI's validation status, not just that
 * information was displayed. This addresses potential claims that the
 * disclosure was ignored or not understood.
 *
 * STUDY APPLICATION:
 * Different comprehension check designs can be tested:
 * - Multiple choice (this implementation)
 * - True/False
 * - Open-ended response
 * - No check (control condition)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ValidationPhase,
  ValidationComprehensionQuestion,
  AIValidationComprehensionPayload,
} from '../../../lib/aiValidationTypes';
import {
  PHASE_COMPREHENSION_QUESTIONS,
  PHASE_COLORS,
  PHASE_NAMES,
} from '../../../lib/aiValidationTypes';

// ============================================================================
// TYPES
// ============================================================================

interface ValidationComprehensionCheckProps {
  /** The validation phase being tested */
  phase: ValidationPhase;

  /** AI system identifier for logging */
  systemId: string;

  /** Custom question (overrides default phase question) */
  customQuestion?: ValidationComprehensionQuestion;

  /** Callback when answer is submitted */
  onResponse?: (payload: AIValidationComprehensionPayload) => void;

  /** Callback when comprehension check is complete */
  onComplete?: (passed: boolean) => void;

  /** Whether to show explanation after answer */
  showExplanation?: boolean;

  /** Whether to require correct answer to proceed */
  requireCorrect?: boolean;

  /** Maximum attempts allowed (0 = unlimited) */
  maxAttempts?: number;

  /** Additional CSS classes */
  className?: string;
}

interface CheckState {
  selectedIndex: number | null;
  isSubmitted: boolean;
  isCorrect: boolean;
  attempts: number;
  showingExplanation: boolean;
  startTime: number;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const CheckIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L1 21h22L12 2zm0 3.83L19.13 19H4.87L12 5.83zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
  </svg>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ValidationComprehensionCheck: React.FC<ValidationComprehensionCheckProps> = ({
  phase,
  systemId,
  customQuestion,
  onResponse,
  onComplete,
  showExplanation = true,
  requireCorrect = false,
  maxAttempts = 0,
  className = '',
}) => {
  // Get question for this phase
  const question = customQuestion ?? PHASE_COMPREHENSION_QUESTIONS[phase];
  const colors = PHASE_COLORS[phase];

  // State
  const [state, setState] = useState<CheckState>({
    selectedIndex: null,
    isSubmitted: false,
    isCorrect: false,
    attempts: 0,
    showingExplanation: false,
    startTime: Date.now(),
  });

  const startTimeRef = useRef<number>(Date.now());

  // Reset start time on mount
  useEffect(() => {
    startTimeRef.current = Date.now();
    setState((prev) => ({ ...prev, startTime: Date.now() }));
  }, [phase]);

  // Handle option selection
  const handleSelect = useCallback((index: number) => {
    if (state.isSubmitted && !state.showingExplanation) return;
    if (state.isSubmitted && state.isCorrect) return;

    setState((prev) => ({
      ...prev,
      selectedIndex: index,
      isSubmitted: false,
      showingExplanation: false,
    }));
  }, [state.isSubmitted, state.showingExplanation, state.isCorrect]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (state.selectedIndex === null) return;

    const isCorrect = state.selectedIndex === question.correctIndex;
    const responseTimeMs = Date.now() - startTimeRef.current;
    const newAttempts = state.attempts + 1;

    // Create payload
    const payload: AIValidationComprehensionPayload = {
      systemId,
      questionId: question.questionId,
      phase,
      selectedIndex: state.selectedIndex,
      correctIndex: question.correctIndex,
      isCorrect,
      responseTimeMs,
      timestamp: new Date().toISOString(),
    };

    // Log response
    onResponse?.(payload);

    setState((prev) => ({
      ...prev,
      isSubmitted: true,
      isCorrect,
      attempts: newAttempts,
      showingExplanation: showExplanation,
    }));

    // Check if we should complete
    const shouldComplete =
      isCorrect ||
      !requireCorrect ||
      (maxAttempts > 0 && newAttempts >= maxAttempts);

    if (shouldComplete) {
      // Delay completion to allow user to see result
      setTimeout(() => {
        onComplete?.(isCorrect);
      }, showExplanation ? 3000 : 1000);
    }
  }, [
    state.selectedIndex,
    state.attempts,
    question,
    systemId,
    phase,
    onResponse,
    onComplete,
    showExplanation,
    requireCorrect,
    maxAttempts,
  ]);

  // Handle retry (for incorrect answers when requireCorrect is true)
  const handleRetry = useCallback(() => {
    startTimeRef.current = Date.now();
    setState((prev) => ({
      ...prev,
      selectedIndex: null,
      isSubmitted: false,
      showingExplanation: false,
    }));
  }, []);

  // Determine if retry is allowed
  const canRetry =
    state.isSubmitted &&
    !state.isCorrect &&
    requireCorrect &&
    (maxAttempts === 0 || state.attempts < maxAttempts);

  // Determine if max attempts reached
  const maxAttemptsReached =
    maxAttempts > 0 && state.attempts >= maxAttempts && !state.isCorrect;

  return (
    <div className={`bg-slate-800 rounded-xl border border-slate-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className="px-5 py-4 border-b"
        style={{
          backgroundColor: `${colors.background}40`,
          borderColor: `${colors.border}40`,
        }}
      >
        <div className="flex items-center gap-3">
          <AlertIcon className="w-5 h-5" style={{ color: colors.primary }} />
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">
              Comprehension Check
            </div>
            <div className="font-medium text-white">
              Phase {phase} Validation Understanding
            </div>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="p-5">
        <p className="text-white font-medium mb-4">{question.question}</p>

        {/* Options */}
        <div className="space-y-2">
          {question.options.map((option, index) => {
            const isSelected = state.selectedIndex === index;
            const isCorrectOption = index === question.correctIndex;
            const showResult = state.isSubmitted;

            let optionStyles = 'border-slate-600 hover:border-slate-500';
            let bgStyles = 'bg-slate-900/30';

            if (isSelected && !showResult) {
              optionStyles = 'border-purple-500 ring-1 ring-purple-500';
              bgStyles = 'bg-purple-500/10';
            } else if (showResult && isCorrectOption) {
              optionStyles = 'border-green-500';
              bgStyles = 'bg-green-500/10';
            } else if (showResult && isSelected && !isCorrectOption) {
              optionStyles = 'border-red-500';
              bgStyles = 'bg-red-500/10';
            }

            return (
              <button
                key={index}
                onClick={() => handleSelect(index)}
                disabled={state.isSubmitted && (state.isCorrect || !canRetry)}
                className={`
                  w-full p-4 rounded-lg border text-left transition-all
                  ${bgStyles} ${optionStyles}
                  ${state.isSubmitted && !canRetry ? 'cursor-default' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Option indicator */}
                  <div
                    className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${
                        showResult && isCorrectOption
                          ? 'border-green-500 bg-green-500'
                          : showResult && isSelected && !isCorrectOption
                          ? 'border-red-500 bg-red-500'
                          : isSelected
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-slate-500'
                      }
                    `}
                  >
                    {showResult && isCorrectOption && (
                      <CheckIcon className="w-4 h-4 text-white" />
                    )}
                    {showResult && isSelected && !isCorrectOption && (
                      <XIcon className="w-4 h-4 text-white" />
                    )}
                    {isSelected && !showResult && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>

                  {/* Option text */}
                  <span
                    className={`
                      text-sm leading-relaxed
                      ${
                        showResult && isCorrectOption
                          ? 'text-green-300'
                          : showResult && isSelected && !isCorrectOption
                          ? 'text-red-300'
                          : 'text-slate-200'
                      }
                    `}
                  >
                    {option}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation (shown after submission) */}
        {state.showingExplanation && (
          <div
            className={`
              mt-4 p-4 rounded-lg border
              ${
                state.isCorrect
                  ? 'bg-green-900/20 border-green-700/30'
                  : 'bg-amber-900/20 border-amber-700/30'
              }
            `}
          >
            <div
              className={`
                flex items-center gap-2 font-medium mb-2
                ${state.isCorrect ? 'text-green-400' : 'text-amber-400'}
              `}
            >
              {state.isCorrect ? (
                <>
                  <CheckIcon className="w-5 h-5" />
                  Correct!
                </>
              ) : (
                <>
                  <XIcon className="w-5 h-5" />
                  Not quite right
                </>
              )}
            </div>
            <p className={`text-sm ${state.isCorrect ? 'text-green-300' : 'text-amber-300'}`}>
              {question.explanation}
            </p>
          </div>
        )}

        {/* Max attempts warning */}
        {maxAttemptsReached && (
          <div className="mt-4 p-4 rounded-lg bg-red-900/20 border border-red-700/30">
            <p className="text-sm text-red-300">
              Maximum attempts ({maxAttempts}) reached. Please review the correct answer above.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 bg-slate-800/50 border-t border-slate-700/50 flex justify-between items-center">
        <div className="text-xs text-slate-500">
          {state.attempts > 0 && `Attempt ${state.attempts}${maxAttempts > 0 ? ` of ${maxAttempts}` : ''}`}
        </div>

        <div className="flex gap-2">
          {canRetry && (
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg font-medium text-sm transition-colors"
            >
              Try Again
            </button>
          )}

          {!state.isSubmitted && (
            <button
              onClick={handleSubmit}
              disabled={state.selectedIndex === null}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-colors
                ${
                  state.selectedIndex === null
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }
              `}
            >
              Submit Answer
            </button>
          )}

          {state.isSubmitted && state.isCorrect && (
            <div className="px-4 py-2 bg-green-600/20 text-green-400 rounded-lg font-medium text-sm flex items-center gap-2">
              <CheckIcon className="w-4 h-4" />
              Understanding Confirmed
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// INLINE COMPREHENSION CHECK
// ============================================================================

/**
 * A more compact inline version for embedding in other components.
 */
export const InlineComprehensionCheck: React.FC<{
  phase: ValidationPhase;
  systemId: string;
  onComplete?: (passed: boolean) => void;
  onResponse?: (payload: AIValidationComprehensionPayload) => void;
}> = ({ phase, systemId, onComplete, onResponse }) => {
  const question = PHASE_COMPREHENSION_QUESTIONS[phase];
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const startTimeRef = useRef(Date.now());

  const handleSubmit = useCallback(() => {
    if (selectedIndex === null) return;

    const isCorrect = selectedIndex === question.correctIndex;
    const responseTimeMs = Date.now() - startTimeRef.current;

    onResponse?.({
      systemId,
      questionId: question.questionId,
      phase,
      selectedIndex,
      correctIndex: question.correctIndex,
      isCorrect,
      responseTimeMs,
      timestamp: new Date().toISOString(),
    });

    setSubmitted(true);

    setTimeout(() => {
      onComplete?.(isCorrect);
    }, 1500);
  }, [selectedIndex, question, systemId, phase, onResponse, onComplete]);

  const isCorrect = selectedIndex === question.correctIndex;

  return (
    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
      <p className="text-sm text-white font-medium mb-3">{question.question}</p>

      <div className="space-y-1.5">
        {question.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => !submitted && setSelectedIndex(idx)}
            disabled={submitted}
            className={`
              w-full px-3 py-2 rounded text-left text-sm transition-all
              ${
                submitted && idx === question.correctIndex
                  ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                  : submitted && idx === selectedIndex && !isCorrect
                  ? 'bg-red-500/20 border border-red-500/50 text-red-300'
                  : selectedIndex === idx
                  ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                  : 'bg-slate-900/30 border border-slate-700 text-slate-300 hover:border-slate-600'
              }
            `}
          >
            {option}
          </button>
        ))}
      </div>

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={selectedIndex === null}
          className={`
            mt-3 w-full py-2 rounded text-sm font-medium transition-colors
            ${
              selectedIndex === null
                ? 'bg-slate-700 text-slate-500'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }
          `}
        >
          Confirm
        </button>
      )}

      {submitted && (
        <div
          className={`mt-3 p-2 rounded text-sm ${
            isCorrect
              ? 'bg-green-900/30 text-green-300'
              : 'bg-amber-900/30 text-amber-300'
          }`}
        >
          {isCorrect ? '✓ Correct' : '✗ Incorrect'}: {question.explanation}
        </div>
      )}
    </div>
  );
};

export default ValidationComprehensionCheck;
