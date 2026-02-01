/**
 * Wolfe Error Classification Display Card
 *
 * Visual display component for Wolfe error taxonomy classifications.
 * Shows classification type, evidence, scientific basis, and liability assessment
 * in a structured, professional format suitable for clinical and legal review.
 *
 * @see Wolfe, J.M. et al. (2022). Normal Blindness. Trends in Cognitive Sciences.
 */

import React, { useState, useMemo } from 'react';
import {
  EyeOff,
  Brain,
  Scale,
  CheckCircle2,
  TrendingDown,
  Ghost,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileText,
  BookOpen,
  Shield,
  Clock,
  ZoomIn,
  Eye,
  Target,
} from 'lucide-react';

import type {
  WolfeErrorClassification,
  WolfeErrorType,
  EvidenceCheck,
} from '../lib/wolfeErrorTypes';

import { ERROR_TYPE_DISPLAY } from '../lib/wolfeThresholds';
import { generateEvidenceChecks } from '../lib/wolfeClassifier';

/**
 * Props for WolfeErrorCard component
 */
interface WolfeErrorCardProps {
  /** The classification to display */
  classification: WolfeErrorClassification;

  /** Compact mode - shows less detail */
  compact?: boolean;

  /** Show expert witness statement */
  showExpertStatement?: boolean;

  /** Callback when card is clicked */
  onClick?: () => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Icon component mapping for error types
 */
const ErrorTypeIcon: React.FC<{ type: WolfeErrorType; className?: string }> = ({
  type,
  className = 'w-5 h-5',
}) => {
  switch (type) {
    case 'SEARCH_ERROR':
      return <EyeOff className={className} />;
    case 'RECOGNITION_ERROR':
      return <Brain className={className} />;
    case 'DECISION_ERROR':
      return <Scale className={className} />;
    case 'SATISFACTION_OF_SEARCH':
      return <CheckCircle2 className={className} />;
    case 'PREVALENCE_EFFECT':
      return <TrendingDown className={className} />;
    case 'INATTENTIONAL_BLINDNESS':
      return <Ghost className={className} />;
    case 'CORRECT':
      return <CheckCircle className={className} />;
    case 'UNCLASSIFIABLE':
    default:
      return <HelpCircle className={className} />;
  }
};

/**
 * Liability badge component
 */
const LiabilityBadge: React.FC<{
  level: 'LOW' | 'MODERATE' | 'HIGH';
}> = ({ level }) => {
  const colors = {
    LOW: 'bg-green-900/50 text-green-400 border-green-700',
    MODERATE: 'bg-amber-900/50 text-amber-400 border-amber-700',
    HIGH: 'bg-red-900/50 text-red-400 border-red-700',
  };

  const icons = {
    LOW: <Shield className="w-3.5 h-3.5" />,
    MODERATE: <AlertTriangle className="w-3.5 h-3.5" />,
    HIGH: <AlertTriangle className="w-3.5 h-3.5" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border ${colors[level]}`}
    >
      {icons[level]}
      {level}
    </span>
  );
};

/**
 * Confidence meter component
 */
const ConfidenceMeter: React.FC<{ confidence: number }> = ({ confidence }) => {
  const percent = Math.round(confidence * 100);
  const color =
    confidence >= 0.85
      ? 'bg-green-500'
      : confidence >= 0.6
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-300 w-12 text-right">
        {percent}%
      </span>
    </div>
  );
};

/**
 * Evidence check item component
 */
const EvidenceCheckItem: React.FC<{ check: EvidenceCheck }> = ({ check }) => {
  return (
    <div className="flex items-start gap-2 py-1">
      {check.passed ? (
        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-gray-300">{check.label}</span>
          {check.value !== undefined && (
            <span className="text-sm font-medium text-gray-100">
              {check.value}
            </span>
          )}
        </div>
        {check.threshold && (
          <span className="text-xs text-gray-500">
            Threshold: {check.threshold}
          </span>
        )}
        {check.context && (
          <span className="text-xs text-gray-500 block">{check.context}</span>
        )}
      </div>
    </div>
  );
};

/**
 * Main WolfeErrorCard component
 */
export const WolfeErrorCard: React.FC<WolfeErrorCardProps> = ({
  classification,
  compact = false,
  showExpertStatement = false,
  onClick,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showStatement, setShowStatement] = useState(false);

  const config = ERROR_TYPE_DISPLAY[classification.errorType];
  const evidenceChecks = useMemo(
    () => generateEvidenceChecks(classification),
    [classification]
  );

  const borderColor = config.color;
  const bgColor = config.backgroundColor;

  return (
    <div
      className={`rounded-lg border overflow-hidden ${className}`}
      style={{
        borderColor: borderColor,
        backgroundColor: bgColor,
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ backgroundColor: `${borderColor}15` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${borderColor}30` }}
          >
            <ErrorTypeIcon
              type={classification.errorType}
              className="w-5 h-5"
            />
          </div>
          <div>
            <h3
              className="font-semibold text-sm"
              style={{ color: borderColor }}
            >
              ERROR CLASSIFICATION: {classification.errorType.replace(/_/g, ' ')}
            </h3>
            <p className="text-xs text-gray-400">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LiabilityBadge level={classification.liabilityAssessment.level} />
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Confidence bar - always visible */}
      <div className="px-4 py-2 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">Confidence</span>
          <span className="text-xs text-gray-500">
            {classification.classifierVersion}
          </span>
        </div>
        <ConfidenceMeter confidence={classification.confidence} />
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <>
          {/* Evidence section */}
          <div className="px-4 py-3 border-b border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-gray-400" />
              <h4 className="text-sm font-medium text-gray-300">EVIDENCE</h4>
            </div>
            <div className="space-y-0.5">
              {evidenceChecks.map((check, i) => (
                <EvidenceCheckItem key={i} check={check} />
              ))}
            </div>

            {/* Viewport details if available */}
            {classification.evidence.viewportData && (
              <div className="mt-3 pt-3 border-t border-gray-700/30 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="text-xs">Viewed</span>
                  </div>
                  <span className="text-sm font-medium text-gray-200">
                    {classification.evidence.viewportData.regionViewed ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs">Dwell</span>
                  </div>
                  <span className="text-sm font-medium text-gray-200">
                    {(classification.evidence.viewportData.dwellTimeMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span className="text-xs">Zoom</span>
                  </div>
                  <span className="text-sm font-medium text-gray-200">
                    {classification.evidence.viewportData.zoomLevel.toFixed(1)}x
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Scientific basis section */}
          <div className="px-4 py-3 border-b border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-gray-400" />
              <h4 className="text-sm font-medium text-gray-300">SCIENTIFIC BASIS</h4>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {classification.scientificBasis.keyFinding}
            </p>
            <p className="text-xs text-gray-500 mt-2 italic">
              {classification.scientificBasis.citation.split('.')[0]}...
            </p>
          </div>

          {/* Liability assessment section */}
          <div className="px-4 py-3 border-b border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-gray-400" />
              <h4 className="text-sm font-medium text-gray-300">
                LIABILITY ASSESSMENT: {classification.liabilityAssessment.level}
              </h4>
            </div>

            {classification.liabilityAssessment.mitigatingFactors.length > 0 && (
              <div className="mb-2">
                <span className="text-xs text-green-400">Mitigating:</span>
                <ul className="ml-4 mt-1">
                  {classification.liabilityAssessment.mitigatingFactors.map((f, i) => (
                    <li key={i} className="text-xs text-gray-400 list-disc">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {classification.liabilityAssessment.aggravatingFactors.length > 0 && (
              <div>
                <span className="text-xs text-red-400">Aggravating:</span>
                <ul className="ml-4 mt-1">
                  {classification.liabilityAssessment.aggravatingFactors.map((f, i) => (
                    <li key={i} className="text-xs text-gray-400 list-disc">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Expert witness statement toggle */}
          {showExpertStatement && (
            <div className="px-4 py-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStatement(!showStatement);
                }}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>
                  {showStatement ? 'Hide' : 'View'} Expert Witness Statement
                </span>
                {showStatement ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showStatement && (
                <pre className="mt-3 p-3 bg-gray-900/50 rounded-lg text-xs text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto max-h-96 overflow-y-auto">
                  {classification.expertWitnessStatement}
                </pre>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Compact error type badge for lists
 */
export const WolfeErrorBadge: React.FC<{
  type: WolfeErrorType;
  className?: string;
}> = ({ type, className = '' }) => {
  const config = ERROR_TYPE_DISPLAY[type];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded ${className}`}
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
        border: `1px solid ${config.color}40`,
      }}
    >
      <ErrorTypeIcon type={type} className="w-3 h-3" />
      {config.label}
    </span>
  );
};

/**
 * Summary row for tables
 */
export const WolfeErrorSummaryRow: React.FC<{
  classification: WolfeErrorClassification;
  onClick?: () => void;
}> = ({ classification, onClick }) => {
  const config = ERROR_TYPE_DISPLAY[classification.errorType];

  return (
    <tr
      className="hover:bg-gray-800/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <ErrorTypeIcon type={classification.errorType} className="w-4 h-4" />
          <span className="text-sm" style={{ color: config.color }}>
            {config.label}
          </span>
        </div>
      </td>
      <td className="px-4 py-2 text-sm text-gray-400">
        {classification.caseId}
      </td>
      <td className="px-4 py-2">
        <div className="w-24">
          <ConfidenceMeter confidence={classification.confidence} />
        </div>
      </td>
      <td className="px-4 py-2">
        <LiabilityBadge level={classification.liabilityAssessment.level} />
      </td>
    </tr>
  );
};

/**
 * Analytics summary card
 */
export const WolfeAnalyticsSummary: React.FC<{
  analytics: {
    totalErrors: number;
    totalCorrect: number;
    byType: Record<WolfeErrorType, number>;
    averageConfidence: number;
  };
}> = ({ analytics }) => {
  const errorTypes: WolfeErrorType[] = [
    'SEARCH_ERROR',
    'RECOGNITION_ERROR',
    'DECISION_ERROR',
    'SATISFACTION_OF_SEARCH',
    'PREVALENCE_EFFECT',
    'INATTENTIONAL_BLINDNESS',
  ];

  const maxCount = Math.max(...errorTypes.map((t) => analytics.byType[t] || 0));

  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-medium text-gray-300 mb-3">
        Error Distribution
      </h3>

      <div className="space-y-2">
        {errorTypes.map((type) => {
          const config = ERROR_TYPE_DISPLAY[type];
          const count = analytics.byType[type] || 0;
          const percent = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div key={type} className="flex items-center gap-2">
              <div className="w-32 flex items-center gap-1.5">
                <ErrorTypeIcon type={type} className="w-3.5 h-3.5" />
                <span className="text-xs text-gray-400 truncate">
                  {config.label}
                </span>
              </div>
              <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: config.color,
                  }}
                />
              </div>
              <span className="text-xs text-gray-400 w-8 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-700 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-semibold text-red-400">
            {analytics.totalErrors}
          </div>
          <div className="text-xs text-gray-500">Errors</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-green-400">
            {analytics.totalCorrect}
          </div>
          <div className="text-xs text-gray-500">Correct</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-blue-400">
            {Math.round(analytics.averageConfidence * 100)}%
          </div>
          <div className="text-xs text-gray-500">Avg Confidence</div>
        </div>
      </div>
    </div>
  );
};

export default WolfeErrorCard;
