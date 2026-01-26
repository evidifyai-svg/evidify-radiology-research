/**
 * DisclosureConfig.tsx
 * 
 * Makes error rate disclosure a first-class study factor.
 * 
 * Key insight from Brown mock jury research: "educating jurors about AI error rates 
 * can reduce penalization." This component enables research on:
 * - Does FDR/FOR disclosure reduce automation bias?
 * - Which framing produces best calibrated trust?
 * - Do different metrics affect reader behavior differently?
 * 
 * Supports multiple disclosure formats as study conditions:
 * - none: No error rate info
 * - numeric: "FDR: 12%, FOR: 3%"
 * - table: 2x2 confusion matrix
 * - sentence: Natural language explanation
 * - natural_frequency: "Of 100 flagged cases, 12 are false alarms"
 * - icon: Visual confidence meter
 */

import React, { useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type DisclosureFormat = 
  | 'none' 
  | 'numeric' 
  | 'table' 
  | 'sentence' 
  | 'natural_frequency'
  | 'icon'
  | 'custom';

export interface DisclosureMetrics {
  // Error rates (what Evidify emphasizes)
  fdr?: number;   // False Discovery Rate: When AI flags, % that are false positives
  for_?: number;  // False Omission Rate: When AI clears, % that are false negatives
  
  // Traditional metrics (for comparison studies)
  ppv?: number;   // Positive Predictive Value (1 - FDR)
  npv?: number;   // Negative Predictive Value (1 - FOR)
  sensitivity?: number;
  specificity?: number;
  
  // For natural frequency framing
  baseSampleSize?: number;  // e.g., 100 or 1000
}

export interface DisclosureConfig {
  // Study condition identifier
  conditionId: string;
  conditionLabel: string;
  
  // What to show
  enabled: boolean;
  format: DisclosureFormat;
  metrics: DisclosureMetrics;
  
  // Framing options
  emphasizeErrorRates: boolean;  // Lead with FDR/FOR vs PPV/NPV
  useColorCoding: boolean;       // Red/green for high/low risk
  showConfidenceInterval?: boolean;
  
  // Custom text (for 'custom' format)
  customText?: string;
  
  // Audit tracking
  trackExposure: boolean;  // Log when disclosure is viewed
  requireAcknowledgement: boolean;  // Require "I understand" click
}

// Pre-defined study conditions
export const DISCLOSURE_CONDITIONS: Record<string, DisclosureConfig> = {
  no_ai: {
    conditionId: 'no_ai',
    conditionLabel: 'No AI (Control)',
    enabled: false,
    format: 'none',
    metrics: {},
    emphasizeErrorRates: false,
    useColorCoding: false,
    trackExposure: true,
    requireAcknowledgement: false,
  },
  
  score_only: {
    conditionId: 'score_only',
    conditionLabel: 'Score Only',
    enabled: true,
    format: 'none',
    metrics: {},
    emphasizeErrorRates: false,
    useColorCoding: false,
    trackExposure: true,
    requireAcknowledgement: false,
  },
  
  numeric_fdr_for: {
    conditionId: 'numeric_fdr_for',
    conditionLabel: 'Numeric FDR/FOR',
    enabled: true,
    format: 'numeric',
    metrics: { fdr: 0.12, for_: 0.03 },
    emphasizeErrorRates: true,
    useColorCoding: true,
    trackExposure: true,
    requireAcknowledgement: false,
  },
  
  numeric_ppv_npv: {
    conditionId: 'numeric_ppv_npv',
    conditionLabel: 'Numeric PPV/NPV',
    enabled: true,
    format: 'numeric',
    metrics: { ppv: 0.88, npv: 0.97 },
    emphasizeErrorRates: false,
    useColorCoding: true,
    trackExposure: true,
    requireAcknowledgement: false,
  },
  
  sentence_fdr_for: {
    conditionId: 'sentence_fdr_for',
    conditionLabel: 'Sentence (FDR/FOR)',
    enabled: true,
    format: 'sentence',
    metrics: { fdr: 0.12, for_: 0.03 },
    emphasizeErrorRates: true,
    useColorCoding: false,
    trackExposure: true,
    requireAcknowledgement: false,
  },
  
  natural_frequency: {
    conditionId: 'natural_frequency',
    conditionLabel: 'Natural Frequency',
    enabled: true,
    format: 'natural_frequency',
    metrics: { fdr: 0.12, for_: 0.03, baseSampleSize: 100 },
    emphasizeErrorRates: true,
    useColorCoding: false,
    trackExposure: true,
    requireAcknowledgement: false,
  },
  
  table_full: {
    conditionId: 'table_full',
    conditionLabel: 'Full Table',
    enabled: true,
    format: 'table',
    metrics: { fdr: 0.12, for_: 0.03, sensitivity: 0.95, specificity: 0.88 },
    emphasizeErrorRates: true,
    useColorCoding: true,
    trackExposure: true,
    requireAcknowledgement: true,
  },
};

// ============================================================================
// DISCLOSURE COMPONENTS
// ============================================================================

interface DisclosureDisplayProps {
  config: DisclosureConfig;
  aiFlagged: boolean;
  onExposure?: (timestamp: string, format: DisclosureFormat) => void;
  onAcknowledge?: (timestamp: string) => void;
}

export const DisclosureDisplay: React.FC<DisclosureDisplayProps> = ({
  config,
  aiFlagged,
  onExposure,
  onAcknowledge,
}) => {
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [exposureLogged, setExposureLogged] = React.useState(false);

  // Log exposure on mount
  React.useEffect(() => {
    if (config.trackExposure && !exposureLogged && config.enabled) {
      onExposure?.(new Date().toISOString(), config.format);
      setExposureLogged(true);
    }
  }, [config, exposureLogged, onExposure]);

  const handleAcknowledge = () => {
    setAcknowledged(true);
    onAcknowledge?.(new Date().toISOString());
  };

  if (!config.enabled || config.format === 'none') {
    return null;
  }

  // Render based on format
  return (
    <div className="mt-3 pt-3 border-t border-slate-700">
      <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">
        AI Performance Disclosure
      </div>
      
      {config.format === 'numeric' && (
        <NumericDisclosure config={config} aiFlagged={aiFlagged} />
      )}
      
      {config.format === 'sentence' && (
        <SentenceDisclosure config={config} aiFlagged={aiFlagged} />
      )}
      
      {config.format === 'natural_frequency' && (
        <NaturalFrequencyDisclosure config={config} aiFlagged={aiFlagged} />
      )}
      
      {config.format === 'table' && (
        <TableDisclosure config={config} />
      )}
      
      {config.format === 'icon' && (
        <IconDisclosure config={config} aiFlagged={aiFlagged} />
      )}
      
      {config.format === 'custom' && config.customText && (
        <div className="text-sm text-slate-300">{config.customText}</div>
      )}

      {config.requireAcknowledgement && !acknowledged && (
        <button
          onClick={handleAcknowledge}
          className="mt-3 w-full py-2 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-sm font-medium transition-colors"
        >
          I understand this information
        </button>
      )}
      
      {config.requireAcknowledgement && acknowledged && (
        <div className="mt-2 text-xs text-green-400">
          ✓ Acknowledged at {new Date().toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// FORMAT-SPECIFIC COMPONENTS
// ============================================================================

const NumericDisclosure: React.FC<{ config: DisclosureConfig; aiFlagged: boolean }> = ({ 
  config, 
  aiFlagged 
}) => {
  const { metrics, emphasizeErrorRates, useColorCoding } = config;

  if (emphasizeErrorRates) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {metrics.fdr !== undefined && (
          <div className={`p-2 rounded ${useColorCoding ? 'bg-orange-500/10' : 'bg-slate-800'}`}>
            <div className="text-xs text-slate-400">False Discovery Rate</div>
            <div className={`text-lg font-semibold ${useColorCoding ? 'text-orange-400' : 'text-white'}`}>
              {(metrics.fdr * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-slate-500">
              {aiFlagged ? 'of flags are false alarms' : '—'}
            </div>
          </div>
        )}
        {metrics.for_ !== undefined && (
          <div className={`p-2 rounded ${useColorCoding ? 'bg-red-500/10' : 'bg-slate-800'}`}>
            <div className="text-xs text-slate-400">False Omission Rate</div>
            <div className={`text-lg font-semibold ${useColorCoding ? 'text-red-400' : 'text-white'}`}>
              {(metrics.for_ * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-slate-500">
              {!aiFlagged ? 'of clears miss disease' : '—'}
            </div>
          </div>
        )}
      </div>
    );
  }

  // PPV/NPV framing
  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.ppv !== undefined && (
        <div className={`p-2 rounded ${useColorCoding ? 'bg-green-500/10' : 'bg-slate-800'}`}>
          <div className="text-xs text-slate-400">Positive Predictive Value</div>
          <div className={`text-lg font-semibold ${useColorCoding ? 'text-green-400' : 'text-white'}`}>
            {(metrics.ppv * 100).toFixed(0)}%
          </div>
        </div>
      )}
      {metrics.npv !== undefined && (
        <div className={`p-2 rounded ${useColorCoding ? 'bg-green-500/10' : 'bg-slate-800'}`}>
          <div className="text-xs text-slate-400">Negative Predictive Value</div>
          <div className={`text-lg font-semibold ${useColorCoding ? 'text-green-400' : 'text-white'}`}>
            {(metrics.npv * 100).toFixed(0)}%
          </div>
        </div>
      )}
    </div>
  );
};

const SentenceDisclosure: React.FC<{ config: DisclosureConfig; aiFlagged: boolean }> = ({ 
  config, 
  aiFlagged 
}) => {
  const { metrics } = config;

  const relevantSentence = useMemo(() => {
    if (aiFlagged && metrics.fdr !== undefined) {
      const correctRate = ((1 - metrics.fdr) * 100).toFixed(0);
      return `When this AI flags a case as suspicious, it is correct ${correctRate}% of the time.`;
    }
    if (!aiFlagged && metrics.for_ !== undefined) {
      const correctRate = ((1 - metrics.for_) * 100).toFixed(0);
      return `When this AI indicates a case is not suspicious, it is correct ${correctRate}% of the time.`;
    }
    return null;
  }, [aiFlagged, metrics]);

  return (
    <div className="p-3 bg-slate-800 rounded-lg">
      <p className="text-sm text-slate-200">
        {relevantSentence || 'AI performance information not available for this case.'}
      </p>
    </div>
  );
};

const NaturalFrequencyDisclosure: React.FC<{ config: DisclosureConfig; aiFlagged: boolean }> = ({ 
  config, 
  aiFlagged 
}) => {
  const { metrics } = config;
  const sampleSize = metrics.baseSampleSize || 100;

  const content = useMemo(() => {
    if (aiFlagged && metrics.fdr !== undefined) {
      const falseAlarms = Math.round(metrics.fdr * sampleSize);
      const truePositives = sampleSize - falseAlarms;
      return {
        main: `Of ${sampleSize} cases flagged by this AI:`,
        detail: `${truePositives} are truly suspicious, ${falseAlarms} are false alarms`,
      };
    }
    if (!aiFlagged && metrics.for_ !== undefined) {
      const missed = Math.round(metrics.for_ * sampleSize);
      const trulyNegative = sampleSize - missed;
      return {
        main: `Of ${sampleSize} cases NOT flagged by this AI:`,
        detail: `${trulyNegative} are truly negative, ${missed} have missed disease`,
      };
    }
    return null;
  }, [aiFlagged, metrics, sampleSize]);

  if (!content) return null;

  return (
    <div className="p-3 bg-slate-800 rounded-lg">
      <p className="text-sm font-medium text-white mb-1">{content.main}</p>
      <p className="text-sm text-slate-300">{content.detail}</p>
    </div>
  );
};

const TableDisclosure: React.FC<{ config: DisclosureConfig }> = ({ config }) => {
  const { metrics } = config;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-800">
            <th className="px-3 py-2 text-left text-slate-400 font-medium">Metric</th>
            <th className="px-3 py-2 text-right text-slate-400 font-medium">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {metrics.fdr !== undefined && (
            <tr>
              <td className="px-3 py-2 text-slate-300">False Discovery Rate (FDR)</td>
              <td className="px-3 py-2 text-right text-orange-400 font-medium">
                {(metrics.fdr * 100).toFixed(1)}%
              </td>
            </tr>
          )}
          {metrics.for_ !== undefined && (
            <tr>
              <td className="px-3 py-2 text-slate-300">False Omission Rate (FOR)</td>
              <td className="px-3 py-2 text-right text-red-400 font-medium">
                {(metrics.for_ * 100).toFixed(1)}%
              </td>
            </tr>
          )}
          {metrics.sensitivity !== undefined && (
            <tr>
              <td className="px-3 py-2 text-slate-300">Sensitivity</td>
              <td className="px-3 py-2 text-right text-green-400 font-medium">
                {(metrics.sensitivity * 100).toFixed(1)}%
              </td>
            </tr>
          )}
          {metrics.specificity !== undefined && (
            <tr>
              <td className="px-3 py-2 text-slate-300">Specificity</td>
              <td className="px-3 py-2 text-right text-green-400 font-medium">
                {(metrics.specificity * 100).toFixed(1)}%
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const IconDisclosure: React.FC<{ config: DisclosureConfig; aiFlagged: boolean }> = ({ 
  config, 
  aiFlagged 
}) => {
  const { metrics } = config;

  // Calculate a "reliability" score for visual display
  const reliability = useMemo(() => {
    if (aiFlagged && metrics.fdr !== undefined) {
      return 1 - metrics.fdr; // PPV
    }
    if (!aiFlagged && metrics.for_ !== undefined) {
      return 1 - metrics.for_; // NPV
    }
    return null;
  }, [aiFlagged, metrics]);

  if (reliability === null) return null;

  // Color based on reliability
  const getColor = (r: number) => {
    if (r >= 0.9) return 'text-green-400';
    if (r >= 0.8) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getBgColor = (r: number) => {
    if (r >= 0.9) return 'bg-green-500';
    if (r >= 0.8) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="p-3 bg-slate-800 rounded-lg">
      <div className="flex items-center gap-3">
        {/* Meter */}
        <div className="flex-1">
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getBgColor(reliability)} transition-all duration-500`}
              style={{ width: `${reliability * 100}%` }}
            />
          </div>
        </div>
        {/* Value */}
        <div className={`text-lg font-semibold ${getColor(reliability)}`}>
          {(reliability * 100).toFixed(0)}%
        </div>
      </div>
      <div className="text-xs text-slate-400 mt-2">
        AI reliability for this {aiFlagged ? 'positive' : 'negative'} result
      </div>
    </div>
  );
};

// ============================================================================
// STUDY CONFIGURATION COMPONENT
// ============================================================================

interface DisclosureConfigEditorProps {
  config: DisclosureConfig;
  onChange: (config: DisclosureConfig) => void;
}

export const DisclosureConfigEditor: React.FC<DisclosureConfigEditorProps> = ({
  config,
  onChange,
}) => {
  const updateMetric = (key: keyof DisclosureMetrics, value: number) => {
    onChange({
      ...config,
      metrics: { ...config.metrics, [key]: value },
    });
  };

  return (
    <div className="space-y-4 p-4 bg-slate-800 rounded-lg">
      <h4 className="font-medium text-white">Disclosure Configuration</h4>
      
      {/* Enabled toggle */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
          className="h-4 w-4 rounded border-slate-600 text-purple-500"
        />
        <span className="text-slate-300">Show disclosure</span>
      </label>

      {/* Format selector */}
      <div>
        <label className="block text-sm text-slate-400 mb-1">Format</label>
        <select
          value={config.format}
          onChange={(e) => onChange({ ...config, format: e.target.value as DisclosureFormat })}
          className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white"
        >
          <option value="none">None</option>
          <option value="numeric">Numeric (FDR/FOR or PPV/NPV)</option>
          <option value="sentence">Sentence</option>
          <option value="natural_frequency">Natural Frequency</option>
          <option value="table">Full Table</option>
          <option value="icon">Visual Meter</option>
        </select>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1">FDR (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={(config.metrics.fdr ?? 0) * 100}
            onChange={(e) => updateMetric('fdr', parseFloat(e.target.value) / 100)}
            className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">FOR (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={(config.metrics.for_ ?? 0) * 100}
            onChange={(e) => updateMetric('for_', parseFloat(e.target.value) / 100)}
            className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white"
          />
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.emphasizeErrorRates}
            onChange={(e) => onChange({ ...config, emphasizeErrorRates: e.target.checked })}
            className="h-4 w-4 rounded border-slate-600 text-purple-500"
          />
          <span className="text-slate-300 text-sm">Emphasize error rates (vs PPV/NPV)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.useColorCoding}
            onChange={(e) => onChange({ ...config, useColorCoding: e.target.checked })}
            className="h-4 w-4 rounded border-slate-600 text-purple-500"
          />
          <span className="text-slate-300 text-sm">Use color coding</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.requireAcknowledgement}
            onChange={(e) => onChange({ ...config, requireAcknowledgement: e.target.checked })}
            className="h-4 w-4 rounded border-slate-600 text-purple-500"
          />
          <span className="text-slate-300 text-sm">Require acknowledgement</span>
        </label>
      </div>
    </div>
  );
};

// ============================================================================
// EXPOSURE LOGGING HOOK
// ============================================================================

export interface DisclosureExposureLog {
  timestamp: string;
  format: DisclosureFormat;
  conditionId: string;
  aiFlagged: boolean;
  acknowledged: boolean;
  acknowledgedTimestamp: string | null;
  viewDurationMs: number;
}

export function useDisclosureTracking(config: DisclosureConfig, aiFlagged: boolean) {
  const [log, setLog] = React.useState<DisclosureExposureLog | null>(null);
  const startTimeRef = React.useRef<number | null>(null);

  const onExposure = React.useCallback((timestamp: string, format: DisclosureFormat) => {
    startTimeRef.current = Date.now();
    setLog({
      timestamp,
      format,
      conditionId: config.conditionId,
      aiFlagged,
      acknowledged: false,
      acknowledgedTimestamp: null,
      viewDurationMs: 0,
    });
  }, [config.conditionId, aiFlagged]);

  const onAcknowledge = React.useCallback((timestamp: string) => {
    setLog(prev => prev ? {
      ...prev,
      acknowledged: true,
      acknowledgedTimestamp: timestamp,
      viewDurationMs: startTimeRef.current ? Date.now() - startTimeRef.current : 0,
    } : null);
  }, []);

  // Update duration on unmount
  React.useEffect(() => {
    return () => {
      if (startTimeRef.current && log) {
        setLog(prev => prev ? {
          ...prev,
          viewDurationMs: Date.now() - startTimeRef.current!,
        } : null);
      }
    };
  }, [log]);

  return { log, onExposure, onAcknowledge };
}

export default DisclosureDisplay;
