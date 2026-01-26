/**
 * Evidify Event Schema v0.1.0
 * Aligned with AGI Team Kernel Specification
 * 
 * This is the canonical event format for the Evidify platform.
 * All modules (Radiology, Forensic Psych, etc.) emit events in this format.
 */

// =============================================================================
// SCHEMA VERSION
// =============================================================================
export const EVENT_SCHEMA_VERSION = '1.0.0';

// =============================================================================
// EVENT TYPES (Kernel + Radiology Module)
// =============================================================================
export type KernelEventType =
  | 'SESSION_START'
  | 'SESSION_END'
  | 'CASE_LOADED'
  | 'TOOL_USED'
  | 'MEASUREMENT_ADDED'
  | 'SCORE_PRELIM_COMMITTED'
  | 'AI_AVAILABLE'
  | 'AI_UNLOCKED'
  | 'AI_EXPOSED'
  | 'AI_HIDDEN'
  | 'SCORE_FINAL_SUBMITTED'
  | 'DISAGREEMENT_RECORDED'
  | 'GATE_BLOCKED'
  | 'GATE_SATISFIED'
  | 'UI_FOCUS_CHANGED'
  | 'ERROR';

export type RadiologyEventType =
  | 'FIRST_IMPRESSION_LOCKED'
  | 'DISCLOSURE_PRESENTED'
  | 'DISCLOSURE_COMPREHENSION'
  | 'TRUST_CALIBRATION'
  | 'NASA_TLX_RECORDED'
  | 'RISK_METER_SNAPSHOT'
  | 'DEVIATION_SUBMITTED'
  | 'COUNTERBALANCING_ASSIGNED'
  | 'GROUND_TRUTH_REVEALED'
  | 'ADAPTIVE_DISCLOSURE_DECISION';

export type EventType = KernelEventType | RadiologyEventType;

// =============================================================================
// ACTOR MODEL
// =============================================================================
export type ActorRole = 'Participant' | 'StudyOperator' | 'PI' | 'System' | 'Auditor';

export interface Actor {
  role: ActorRole;
  participant_id?: string;
  operator_id?: string;
}

// =============================================================================
// CONTEXT MODEL
// =============================================================================
export interface EventContext {
  protocol_id: string;
  protocol_hash?: string;
  condition_id: string;
  case_id: string;
  phase_id: string;
  trial_index?: number;
  is_calibration?: boolean;
}

// =============================================================================
// ASSET REFERENCE
// =============================================================================
export interface AssetRef {
  asset_id: string;
  asset_hash: string; // Format: "sha256:<64 hex chars>"
  asset_type?: 'dicom_series' | 'image' | 'overlay_json' | 'protocol_json';
}

// =============================================================================
// LEDGER CHAIN FIELDS
// =============================================================================
export interface LedgerFields {
  prev_hash: string; // Format: "sha256:<64 hex chars>"
  event_hash: string;
}

// =============================================================================
// CANONICAL EVENT STRUCTURE
// =============================================================================
export interface EvidifyEvent<T = Record<string, unknown>> {
  // Schema metadata
  event_schema_version: string;
  
  // Identity
  session_id: string;
  seq: number; // Monotonically increasing sequence number
  
  // Event type
  event_type: EventType;
  
  // Timing (both required for replay + verification)
  mono_ms: number; // Monotonic milliseconds since session start
  wall_utc: string; // ISO 8601 timestamp
  
  // Actor
  actor: Actor;
  
  // Context
  context: EventContext;
  
  // Event-specific payload
  payload: T;
  
  // Referenced assets (optional)
  assets?: AssetRef[];
  
  // Ledger chain (injected at write time)
  ledger?: LedgerFields;
}

// =============================================================================
// EVENT PAYLOADS BY TYPE
// =============================================================================

export interface SessionStartPayload {
  protocol_id: string;
  protocol_version: string;
  site_id?: string;
  app_build: AppBuild;
  determinism_mode: boolean;
}

export interface CaseLoadedPayload {
  case_id: string;
  case_index: number;
  is_calibration: boolean;
  is_catch_trial: boolean;
  case_difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface ScorePrelimPayload {
  instrument_id: string;
  value: number;
  confidence: number;
  pre_trust?: number;
  time_to_prelim_ms: number;
}

export interface AIExposedPayload {
  ai_overlay_id: string;
  ai_birads: number;
  ai_confidence: number;
  disclosure_format: 'FDR_FOR' | 'SENSITIVITY_SPECIFICITY' | 'NONE';
  fdr_value?: number;
  for_value?: number;
}

export interface ScoreFinalPayload {
  instrument_id: string;
  value: number;
  confidence: number;
  post_trust?: number;
  changed_from_prelim: boolean;
  time_to_final_ms: number;
}

export interface DisagreementPayload {
  disagree_reason_code: DisagreeReasonCode;
  rationale_text?: string;
  initial_value: number;
  final_value: number;
  ai_value: number;
}

export type DisagreeReasonCode =
  | 'AI_FALSE_POSITIVE'
  | 'AI_FALSE_NEGATIVE'
  | 'ARTIFACT_OR_POOR_QUALITY'
  | 'CLINICAL_CONTEXT_OVERRIDE'
  | 'UNCERTAIN_OR_BORDERLINE'
  | 'OTHER'
  | 'NA';

export interface GateBlockedPayload {
  gate_id: string;
  gate_type: GateType;
  reason: string;
  required_action: string;
}

export interface GateSatisfiedPayload {
  gate_id: string;
  gate_type: GateType;
  satisfied_by_event_seq: number;
}

export type GateType =
  | 'require_preliminary_read'
  | 'require_disagreement_reason'
  | 'require_min_time_on_case'
  | 'require_measurement_before_submit'
  | 'require_disclosure_comprehension'
  | 'custom';

export interface ToolUsedPayload {
  tool: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface MeasurementPayload {
  measurement_id: string;
  type: 'length' | 'area' | 'roi';
  value: number;
  unit: string;
  coordinates?: unknown;
}

export interface TrustCalibrationPayload {
  pre_trust: number;
  post_trust: number;
  trust_delta: number;
  case_id: string;
}

export interface NasaTlxPayload {
  mental_demand: number;
  physical_demand: number;
  temporal_demand: number;
  performance: number;
  effort: number;
  frustration: number;
  raw_tlx_score: number;
}

export interface RiskMeterSnapshotPayload {
  time_to_lock_ms: number;
  ai_agreement_streak: number;
  deviations_skipped: number;
  total_deviations: number;
  ai_dwell_ratio: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  risk_score: number;
}

export interface DisclosureComprehensionPayload {
  question_type: 'FDR' | 'FOR' | 'BOTH';
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  attempt_number: number;
}

export interface AdaptiveDisclosurePayload {
  policy: 'STATIC' | 'ADAPTIVE';
  case_difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  disclosure_intensity: 'MINIMAL' | 'STANDARD' | 'FULL_DEBIAS';
  show_fdr_for: boolean;
  show_debias_prompt: boolean;
  reasoning: string;
}

// =============================================================================
// APP BUILD INFO
// =============================================================================
export interface AppBuild {
  build_id: string;
  version: string;
  platform: 'macos' | 'windows' | 'linux' | 'web';
  arch?: 'x64' | 'arm64';
  git_commit?: string;
  determinism_mode: boolean;
}

// =============================================================================
// HELPER: Create Event with Defaults
// =============================================================================
export function createEvent<T>(
  sessionId: string,
  seq: number,
  eventType: EventType,
  payload: T,
  context: EventContext,
  actor: Actor = { role: 'Participant' },
  sessionStartMs: number = Date.now()
): EvidifyEvent<T> {
  return {
    event_schema_version: EVENT_SCHEMA_VERSION,
    session_id: sessionId,
    seq,
    event_type: eventType,
    mono_ms: Date.now() - sessionStartMs,
    wall_utc: new Date().toISOString(),
    actor,
    context,
    payload,
  };
}

// =============================================================================
// HASH CHAIN CONSTANTS
// =============================================================================
export const GENESIS_PREV_HASH = 'sha256:' + '0'.repeat(64);

// =============================================================================
// VALIDATION HELPERS
// =============================================================================
export function isValidEventType(type: string): type is EventType {
  const kernelTypes: KernelEventType[] = [
    'SESSION_START', 'SESSION_END', 'CASE_LOADED', 'TOOL_USED',
    'MEASUREMENT_ADDED', 'SCORE_PRELIM_COMMITTED', 'AI_AVAILABLE',
    'AI_UNLOCKED', 'AI_EXPOSED', 'AI_HIDDEN', 'SCORE_FINAL_SUBMITTED',
    'DISAGREEMENT_RECORDED', 'GATE_BLOCKED', 'GATE_SATISFIED',
    'UI_FOCUS_CHANGED', 'ERROR'
  ];
  const radioTypes: RadiologyEventType[] = [
    'FIRST_IMPRESSION_LOCKED', 'DISCLOSURE_PRESENTED', 'DISCLOSURE_COMPREHENSION',
    'TRUST_CALIBRATION', 'NASA_TLX_RECORDED', 'RISK_METER_SNAPSHOT',
    'DEVIATION_SUBMITTED', 'COUNTERBALANCING_ASSIGNED', 'GROUND_TRUTH_REVEALED',
    'ADAPTIVE_DISCLOSURE_DECISION'
  ];
  return kernelTypes.includes(type as KernelEventType) || 
         radioTypes.includes(type as RadiologyEventType);
}
