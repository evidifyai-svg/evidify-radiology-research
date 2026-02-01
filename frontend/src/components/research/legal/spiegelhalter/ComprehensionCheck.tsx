/**
 * ComprehensionCheck.tsx
 *
 * Comprehension verification after disclosure presentation.
 *
 * Research basis:
 * - Spiegelhalter (2017): "Test understanding with simple questions"
 * - Peters et al. (2007): Numeracy affects risk comprehension
 * - Galesic & Garcia-Retamero (2010): Comprehension checks validate understanding
 *
 * Questions are generated based on the disclosure format to ensure
 * participants actually understood the presented information.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type {
  AIDisclosure,
  ComprehensionCheck as ComprehensionCheckType,
  ComprehensionCheckConfig,
  SpiegelhalterDisclosureFormat,
  ComprehensionCheckResponsePayload,
} from './disclosureTypes';

// ============================================================================
// TYPES
// ============================================================================

interface ComprehensionCheckProps {
  disclosure: AIDisclosure;
  config?: ComprehensionCheckConfig;
  onComplete: (check: ComprehensionCheckType, allPassed: boolean) => void;
  onResponse?: (payload: ComprehensionCheckResponsePayload) => void;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ComprehensionCheck: React.FC<ComprehensionCheckProps> = ({
  disclosure,
  config = {
    numChecks: 1,
    tolerance: 5,
    allowRetry: true,
    maxAttempts: 2,
    showFeedback: true,
  },
  onComplete,
  onResponse,
  className = '',
}) => {
  const [answer, setAnswer] = useState<string>('');
  const [attempts, setAttempts] = useState(0);
  const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  // Generate the question based on format
  const question = generateQuestion(disclosure);

  // Reset timer on question change
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [question.question]);

  const handleSubmit = useCallback(() => {
    if (!answer || isSubmitting) return;

    setIsSubmitting(true);
    const responseTimeMs = Date.now() - startTimeRef.current;
    const numericAnswer = parseFloat(answer);
    const isCorrect = !isNaN(numericAnswer) &&
      Math.abs(numericAnswer - question.correctAnswer) <= config.tolerance;

    const checkResult: ComprehensionCheckType = {
      checkId: `check_${Date.now()}`,
      question: question.question,
      alternativeQuestion: question.alternativeQuestion,
      correctAnswer: question.correctAnswer,
      tolerance: config.tolerance,
      participantAnswer: numericAnswer,
      isCorrect,
      responseTimeMs,
      metric: question.metric,
      format: disclosure.formatted.format,
    };

    // Log the response
    onResponse?.({
      disclosureId: disclosure.disclosureId,
      caseId: disclosure.recommendation.location,
      checkId: checkResult.checkId,
      question: question.question,
      correctAnswer: question.correctAnswer,
      participantAnswer: numericAnswer,
      isCorrect,
      responseTimeMs,
      attempt: attempts + 1,
    });

    setAttempts(prev => prev + 1);
    setLastResult(isCorrect ? 'correct' : 'incorrect');

    // If correct or max attempts reached, complete
    if (isCorrect || attempts + 1 >= config.maxAttempts || !config.allowRetry) {
      setTimeout(() => {
        onComplete(checkResult, isCorrect);
      }, config.showFeedback ? 1500 : 0);
    } else {
      // Allow retry
      setTimeout(() => {
        setAnswer('');
        setLastResult(null);
        setIsSubmitting(false);
        startTimeRef.current = Date.now();
      }, 1500);
    }
  }, [answer, attempts, config, disclosure, isSubmitting, onComplete, onResponse, question]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className={`bg-slate-800 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
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
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm font-medium text-white">Comprehension Check</span>
        {config.maxAttempts > 1 && (
          <span className="text-xs text-slate-400 ml-auto">
            Attempt {attempts + 1} of {config.maxAttempts}
          </span>
        )}
      </div>

      {/* Question */}
      <div className="mb-4">
        <p className="text-slate-300">{question.question}</p>
        {question.hint && (
          <p className="text-xs text-slate-500 mt-1">{question.hint}</p>
        )}
      </div>

      {/* Answer input */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="number"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter your answer"
            disabled={isSubmitting}
            className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
          />
          {question.unit && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              {question.unit}
            </span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!answer || isSubmitting}
          className="px-6 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit
        </button>
      </div>

      {/* Feedback */}
      {config.showFeedback && lastResult && (
        <div
          className={`mt-4 p-3 rounded-lg ${
            lastResult === 'correct'
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-red-500/10 border border-red-500/30'
          }`}
        >
          {lastResult === 'correct' ? (
            <div className="flex items-center gap-2 text-green-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">Correct!</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-red-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">
                  {config.allowRetry && attempts < config.maxAttempts
                    ? 'Not quite. Try again.'
                    : `The correct answer is ${question.correctAnswer}${question.unit || ''}`}
                </span>
              </div>
              {config.allowRetry && attempts < config.maxAttempts && (
                <p className="text-xs text-slate-400 ml-7">
                  Hint: Look at the disclosure information above.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// QUESTION GENERATION
// ============================================================================

interface GeneratedQuestion {
  question: string;
  alternativeQuestion?: string;
  correctAnswer: number;
  metric: 'FDR' | 'FOR' | 'PPV' | 'NPV' | 'CONFIDENCE';
  hint?: string;
  unit?: string;
}

function generateQuestion(disclosure: AIDisclosure): GeneratedQuestion {
  const { metrics, recommendation, formatted, config } = disclosure;
  const isFlagged = recommendation.isFlagged;
  const denominator = config.consistentDenominator;
  const format = formatted.format;

  // Primary metric based on context
  const primaryMetric = isFlagged ? 'FDR' : 'FOR';
  const primaryValue = isFlagged ? metrics.fdr : metrics.for;
  const correctAnswerRaw = Math.round(primaryValue * 100);

  switch (format) {
    case 'PERCENTAGE':
      return {
        question: isFlagged
          ? `According to the disclosure, what percentage of cases the AI flags are false positives (false alarms)?`
          : `According to the disclosure, what percentage of cases the AI clears actually have cancer (missed cases)?`,
        correctAnswer: correctAnswerRaw,
        metric: primaryMetric,
        unit: '%',
      };

    case 'NATURAL_FREQUENCY':
      return {
        question: isFlagged
          ? `Out of ${denominator} cases the AI flags, approximately how many will NOT have cancer?`
          : `Out of ${denominator} cases the AI clears, approximately how many will actually have cancer?`,
        alternativeQuestion: `What is the chance (as a number out of ${denominator}) that this AI assessment is incorrect?`,
        correctAnswer: Math.round(primaryValue * denominator),
        metric: primaryMetric,
        hint: `Enter a number between 0 and ${denominator}`,
      };

    case 'ICON_ARRAY':
      return {
        question: `In the icon array shown, how many figures represent incorrect AI assessments?`,
        correctAnswer: Math.round(primaryValue * denominator),
        metric: primaryMetric,
        hint: `Count the highlighted figures`,
      };

    case 'VERBAL_ONLY':
    case 'VERBAL_PLUS_NUMERIC':
      return {
        question: isFlagged
          ? `Based on the verbal scale shown, approximately what percentage of AI flags are false alarms?`
          : `Based on the verbal scale shown, approximately what percentage of AI clearances miss cancer?`,
        correctAnswer: correctAnswerRaw,
        metric: primaryMetric,
        unit: '%',
        hint: format === 'VERBAL_ONLY'
          ? 'Estimate based on the verbal label shown'
          : 'The exact percentage was shown in the disclosure',
      };

    case 'ODDS':
      // For odds, ask about probability
      return {
        question: isFlagged
          ? `Based on the odds shown, approximately what is the percentage chance this AI flag is a false alarm?`
          : `Based on the odds shown, approximately what is the percentage chance this AI clearance missed cancer?`,
        correctAnswer: correctAnswerRaw,
        metric: primaryMetric,
        unit: '%',
        hint: 'Convert the odds to a percentage',
      };

    case 'COMPARATIVE':
      return {
        question: isFlagged
          ? `According to the comparison shown, approximately what is the percentage chance this AI flag is a false alarm?`
          : `According to the comparison shown, approximately what is the percentage chance this AI clearance missed cancer?`,
        correctAnswer: correctAnswerRaw,
        metric: primaryMetric,
        unit: '%',
      };

    default:
      return {
        question: `What is the AI's error rate for this type of case (as a percentage)?`,
        correctAnswer: correctAnswerRaw,
        metric: primaryMetric,
        unit: '%',
      };
  }
}

// ============================================================================
// PRE-BUILT QUESTION SETS
// ============================================================================

export const COMPREHENSION_QUESTIONS = {
  fdr: {
    basic: (denominator: number) => ({
      question: `Out of ${denominator} cases the AI flags as suspicious, how many are typically false alarms?`,
      metric: 'FDR' as const,
    }),
    percentage: {
      question: 'What percentage of AI-flagged cases turn out to be false positives?',
      metric: 'FDR' as const,
      unit: '%',
    },
  },
  for: {
    basic: (denominator: number) => ({
      question: `Out of ${denominator} cases the AI clears, how many typically have cancer that was missed?`,
      metric: 'FOR' as const,
    }),
    percentage: {
      question: 'What percentage of AI-cleared cases actually have cancer?',
      metric: 'FOR' as const,
      unit: '%',
    },
  },
};

export default ComprehensionCheck;
