/**
 * Evidify MRMC Export Schema v0.1.0
 * Aligned with AGI Team Specification
 * 
 * Produces reads.csv + design.json for iMRMC/OR-DBM analysis
 */

// =============================================================================
// reads.csv COLUMN SCHEMA (EXACT ORDER REQUIRED)
// =============================================================================
export interface MRMCReadRow {
  // Identity columns
  study_id: string;
  session_id: string;
  reader_id: string;
  case_id: string;
  trial_index: number;
  condition_id: string;
  modality_id: string;
  task_id: string;
  
  // Truth specification
  truth_label: string;
  truth_reference_type: TruthReferenceType;
  truth_reference_id: string;
  
  // Scoring
  score_prelim: number | 'NA';
  score_final: number | 'NA';
  decision_prelim: DecisionValue;
  decision_final: DecisionValue;
  confidence_prelim: number | 'NA';
  confidence_final: number | 'NA';
  
  // AI exposure
  ai_available: 0 | 1;
  ai_exposed: 0 | 1;
  ai_exposure_count: number;
  ai_time_visible_ms: number;
  
  // Disagreement
  disagree_flag: 0 | 1;
  disagree_reason_code: DisagreeReasonCode;
  
  // Timing
  time_to_prelim_ms: number | 'NA';
  time_to_final_ms: number;
  time_total_on_case_ms: number;
  
  // Interaction counts
  n_tool_events: number;
  n_measurements: number;
  
  // Catch trials
  catch_trial_flag: 0 | 1;
  catch_trial_pass: 0 | 1 | 'NA';
  
  // QC
  gate_violation_count: number;
  qc_flags: string; // Semicolon-separated
}

export type TruthReferenceType = 
  | 'consensus_panel' 
  | 'adjudication' 
  | 'instrument_threshold' 
  | 'other' 
  | 'unknown';

export type DecisionValue = 'negative' | 'positive' | 'indeterminate' | 'na';

export type DisagreeReasonCode =
  | 'AI_FALSE_POSITIVE'
  | 'AI_FALSE_NEGATIVE'
  | 'ARTIFACT_OR_POOR_QUALITY'
  | 'CLINICAL_CONTEXT_OVERRIDE'
  | 'UNCERTAIN_OR_BORDERLINE'
  | 'OTHER'
  | 'NA';

// Column order (MUST match exactly for canonical CSV)
export const MRMC_COLUMN_ORDER: (keyof MRMCReadRow)[] = [
  'study_id',
  'session_id',
  'reader_id',
  'case_id',
  'trial_index',
  'condition_id',
  'modality_id',
  'task_id',
  'truth_label',
  'truth_reference_type',
  'truth_reference_id',
  'score_prelim',
  'score_final',
  'decision_prelim',
  'decision_final',
  'confidence_prelim',
  'confidence_final',
  'ai_available',
  'ai_exposed',
  'ai_exposure_count',
  'ai_time_visible_ms',
  'disagree_flag',
  'disagree_reason_code',
  'time_to_prelim_ms',
  'time_to_final_ms',
  'time_total_on_case_ms',
  'n_tool_events',
  'n_measurements',
  'catch_trial_flag',
  'catch_trial_pass',
  'gate_violation_count',
  'qc_flags',
];

// =============================================================================
// design.json SCHEMA
// =============================================================================
export interface MRMCDesign {
  design_schema_version: string;
  study_id: string;
  protocol_hash: string;
  session_plan_hashes: string[];
  created_utc: string;
  
  mrmc: {
    design_type: DesignType;
    readers: {
      count: number;
      id_strategy: 'pseudonymous_uuid' | 'sequential' | 'external';
    };
    cases: {
      count: number;
      case_sampling: string;
    };
    modalities: string[];
    conditions: ConditionDef[];
    task: TaskDef;
    truth: TruthDef;
  };
  
  qc: QCConfig;
  
  export_profiles: {
    MRMC_iMRMC_v1?: ExportProfile;
    MRMC_ORDBM_v1?: ExportProfile;
  };
}

export type DesignType = 
  | 'fully_crossed' 
  | 'split_plot' 
  | 'partially_crossed' 
  | 'reader_nested' 
  | 'case_nested';

export interface ConditionDef {
  condition_id: string;
  label: string;
  ai_exposure_mode?: 'disabled' | 'immediate' | 'on_demand' | 'delayed';
  disclosure_format?: string;
}

export interface TaskDef {
  task_id: string;
  primary_endpoint: string;
  scale: {
    type: 'binary' | 'likert' | 'numeric';
    min?: number;
    max?: number;
  };
  decision_rule?: {
    binary_threshold?: number;
  };
}

export interface TruthDef {
  truth_label_type: 'binary' | 'ordinal' | 'continuous';
  positive_label: string;
  negative_label: string;
  reference_type: TruthReferenceType;
  reference_id: string;
}

export interface QCConfig {
  fast_read_threshold_ms: number;
  min_time_on_case_ms: number;
  catch_trial: {
    enabled: boolean;
    frequency: number;
    fail_threshold: number;
  };
}

export interface ExportProfile {
  enabled: boolean;
  mapping: {
    reader_col: string;
    case_col: string;
    modality_col?: string;
    treatment_col?: string;
    score_col: string;
    truth_col: string;
  };
}

// =============================================================================
// QC REPORT SCHEMA
// =============================================================================
export interface QCReport {
  qc_schema_version: string;
  session_id: string;
  generated_utc: string;
  
  summary: {
    total_trials: number;
    completed_trials: number;
    excluded_trials: number;
    catch_trials_total: number;
    catch_trials_passed: number;
    catch_trials_failed: number;
  };
  
  timing: {
    median_time_to_prelim_ms: number;
    median_time_to_final_ms: number;
    fast_reads_count: number;
    fast_reads_threshold_ms: number;
  };
  
  ai_exposure: {
    ai_exposed_count: number;
    ai_not_exposed_count: number;
    mean_ai_time_visible_ms: number;
  };
  
  disagreements: {
    total_disagreements: number;
    disagreements_with_reason: number;
    disagreements_without_reason: number;
    reason_distribution: Record<DisagreeReasonCode, number>;
  };
  
  gates: {
    total_gate_blocks: number;
    gate_blocks_by_type: Record<string, number>;
    all_gates_satisfied: boolean;
  };
  
  flags: QCFlag[];
  
  verdict: 'PASS' | 'WARN' | 'FAIL';
  verdict_reasons: string[];
}

export interface QCFlag {
  trial_index: number;
  case_id: string;
  flag_type: QCFlagType;
  severity: 'INFO' | 'WARN' | 'EXCLUDE';
  message: string;
}

export type QCFlagType =
  | 'FAST_READ'
  | 'CATCH_FAIL'
  | 'AI_EARLY_ATTEMPT'
  | 'MISSING_PRELIM'
  | 'MISSING_DISAGREEMENT_REASON'
  | 'EXTREME_TIME'
  | 'INCOMPLETE_TRIAL';

// =============================================================================
// CONVERSION FUNCTIONS
// =============================================================================

/**
 * Convert DerivedMetrics to MRMCReadRow
 */
export function derivedMetricsToMRMCRow(
  metrics: any, // Your existing DerivedMetrics type
  sessionId: string,
  studyId: string,
  conditionId: string
): MRMCReadRow {
  return {
    study_id: studyId,
    session_id: sessionId,
    reader_id: sessionId, // In single-reader sessions, reader = session
    case_id: metrics.caseId,
    trial_index: metrics.trialIndex || 0,
    condition_id: conditionId,
    modality_id: 'MAMMO', // Mammography module
    task_id: 'birads_assessment_v1',
    
    // Truth (placeholder - inject from case metadata)
    truth_label: metrics.groundTruthBirads?.toString() || 'NA',
    truth_reference_type: 'consensus_panel',
    truth_reference_id: 'BRPLL_consensus_v1',
    
    // Scoring
    score_prelim: metrics.initialBirads ?? 'NA',
    score_final: metrics.finalBirads ?? 'NA',
    decision_prelim: biradsToBinary(metrics.initialBirads),
    decision_final: biradsToBinary(metrics.finalBirads),
    confidence_prelim: metrics.initialConfidence ?? 'NA',
    confidence_final: metrics.finalConfidence ?? 'NA',
    
    // AI exposure
    ai_available: 1,
    ai_exposed: metrics.aiExposed ? 1 : 0,
    ai_exposure_count: metrics.aiExposureCount || 1,
    ai_time_visible_ms: metrics.aiTimeVisibleMs || 0,
    
    // Disagreement
    disagree_flag: metrics.changeOccurred ? 1 : 0,
    disagree_reason_code: metrics.deviationRationale ? 'OTHER' : 'NA',
    
    // Timing
    time_to_prelim_ms: metrics.timeToLockMs ?? 'NA',
    time_to_final_ms: metrics.timeToFinalMs || 0,
    time_total_on_case_ms: metrics.totalTimeMs || 0,
    
    // Interactions
    n_tool_events: (metrics.interactionCounts?.zooms || 0) + (metrics.interactionCounts?.pans || 0),
    n_measurements: metrics.measurementCount || 0,
    
    // Catch trials
    catch_trial_flag: metrics.isCatchTrial ? 1 : 0,
    catch_trial_pass: metrics.isCatchTrial ? (metrics.catchTrialPassed ? 1 : 0) : 'NA',
    
    // QC
    gate_violation_count: metrics.gateViolations || 0,
    qc_flags: buildQCFlags(metrics).join(';'),
  };
}

function biradsToBinary(birads: number | null): DecisionValue {
  if (birads === null || birads === undefined) return 'na';
  if (birads >= 4) return 'positive';
  if (birads <= 2) return 'negative';
  return 'indeterminate'; // BI-RADS 3
}

function buildQCFlags(metrics: any): string[] {
  const flags: string[] = [];
  if (metrics.timeToLockMs && metrics.timeToLockMs < 3000) {
    flags.push('FAST_READ');
  }
  if (metrics.isCatchTrial && !metrics.catchTrialPassed) {
    flags.push('CATCH_FAIL');
  }
  if (metrics.aiEarlyAttempt) {
    flags.push('AI_EARLY_ATTEMPT');
  }
  return flags;
}

/**
 * Generate reads.csv content
 */
export function generateReadsCSV(rows: MRMCReadRow[]): string {
  const header = MRMC_COLUMN_ORDER.join(',');
  const dataRows = rows.map(row => 
    MRMC_COLUMN_ORDER.map(col => formatCSVValue(row[col])).join(',')
  );
  return [header, ...dataRows].join('\n');
}

function formatCSVValue(value: unknown): string {
  if (value === null || value === undefined) return 'NA';
  if (typeof value === 'string') {
    // Quote if contains comma, quote, or newline
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
  return String(value);
}

/**
 * Generate design.json
 */
export function generateDesignJSON(
  studyId: string,
  protocolHash: string,
  conditions: ConditionDef[],
  readerCount: number,
  caseCount: number
): MRMCDesign {
  return {
    design_schema_version: '1.0.0',
    study_id: studyId,
    protocol_hash: protocolHash,
    session_plan_hashes: [],
    created_utc: new Date().toISOString(),
    
    mrmc: {
      design_type: 'fully_crossed',
      readers: {
        count: readerCount,
        id_strategy: 'pseudonymous_uuid',
      },
      cases: {
        count: caseCount,
        case_sampling: 'fixed_set_v1',
      },
      modalities: ['MAMMO'],
      conditions,
      task: {
        task_id: 'birads_assessment_v1',
        primary_endpoint: 'score_final',
        scale: { type: 'likert', min: 0, max: 6 },
        decision_rule: { binary_threshold: 4 },
      },
      truth: {
        truth_label_type: 'ordinal',
        positive_label: 'malignant',
        negative_label: 'benign',
        reference_type: 'consensus_panel',
        reference_id: 'BRPLL_consensus_v1',
      },
    },
    
    qc: {
      fast_read_threshold_ms: 3000,
      min_time_on_case_ms: 3000,
      catch_trial: {
        enabled: true,
        frequency: 0.05,
        fail_threshold: 1,
      },
    },
    
    export_profiles: {
      MRMC_iMRMC_v1: {
        enabled: true,
        mapping: {
          reader_col: 'reader_id',
          case_col: 'case_id',
          modality_col: 'condition_id',
          score_col: 'score_final',
          truth_col: 'truth_label',
        },
      },
      MRMC_ORDBM_v1: {
        enabled: true,
        mapping: {
          reader_col: 'reader_id',
          case_col: 'case_id',
          treatment_col: 'condition_id',
          score_col: 'score_final',
          truth_col: 'truth_label',
        },
      },
    },
  };
}
