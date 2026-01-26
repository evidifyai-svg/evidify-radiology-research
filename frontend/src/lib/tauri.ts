// Tauri API bindings for Evidify
// Type-safe wrappers for backend commands

import { invoke } from '@tauri-apps/api/tauri';
import { save } from '@tauri-apps/api/dialog';
import { writeBinaryFile } from '@tauri-apps/api/fs';

// ============================================
// Types
// ============================================

export interface Client {
  id: string;
  display_name: string;
  status: string;
  session_count: number;
  created_at: number;
  updated_at: number;
  // Extended profile fields (optional)
  date_of_birth?: string;
  phone?: string;
  email?: string;
  emergency_contact?: string;
  insurance_info?: string;
  diagnosis_codes?: string;
  treatment_start_date?: string;
  referring_provider?: string;
  notes?: string;
}

export interface Note {
  id: string;
  client_id: string;
  session_date: string;
  note_type: NoteType;
  content: string;  // raw_input serialized as content
  raw_input?: string; // explicit field if needed
  structured_note?: string; // AI-structured version
  word_count: number;
  status: NoteStatus;
  content_hash: string;
  attestations: Attestation[];
  signed_at: number | null;
  created_at: number;
  updated_at: number;
}

export type NoteType = 'progress' | 'intake' | 'crisis' | 'phone' | 'group' | 'termination';
export type NoteStatus = 'draft' | 'reviewed' | 'signed' | 'amended' | 'exported';

export interface Attestation {
  detection_id: string;
  detection_type: string;
  evidence: string;
  response: AttestationResponse;
  response_note: string | null;
  attested_at: number;
}

export type AttestationResponse = 
  | 'addressed_in_note'
  | 'not_clinically_relevant'
  | 'will_address_next_session'
  | 'consulted_supervisor';

export interface EthicsDetection {
  id: string;
  severity: DetectionSeverity;
  category: string;
  title: string;
  description: string;
  evidence: string;
  suggestion: string;
  policy_ref: string | null;
  requires_attestation: boolean;
}

export type DetectionSeverity = 'attest' | 'flag' | 'coach';

export interface EthicsAnalysis {
  detections: EthicsDetection[];
  attest_count: number;
  flag_count: number;
  coach_count: number;
}

// ============================================
// Vault State Types
// ============================================

/**
 * Vault state - PRIMARY routing key for UI
 * UI MUST route on this, NOT on exists/unlocked booleans
 */
export type VaultStateType = 
  | 'no_vault'        // Fresh install, no DB or keychain
  | 'ready'           // DB + keychain present, locked
  | 'unlocked'        // Currently unlocked and usable
  | 'keychain_lost'   // DB exists but keychain missing - recovery needed
  | 'stale_keychain'  // Keychain exists but DB missing - cleanup needed
  | 'corrupt';        // DB exists but cannot be opened - severe error

/**
 * Full vault status for UI routing
 */
export interface VaultStatus {
  /** Primary routing key - UI MUST route on this */
  state: VaultStateType;
  /** Whether the vault database file exists (snake_case) */
  db_exists: boolean;
  /** Whether the keychain entry exists (snake_case) */
  keychain_exists: boolean;
  /** Whether the vault database file exists (camelCase alias) */
  dbExists: boolean;
  /** Whether the keychain entry exists (camelCase alias) */
  keychainExists: boolean;
  /** Human-readable message (PHI-free) */
  message: string;
  /** Client count (only when unlocked) */
  client_count: number | null;
  /** Note count (only when unlocked) */
  note_count: number | null;
  
  // Legacy fields for backwards compatibility - DEPRECATED
  exists: boolean;
  unlocked: boolean;
}

/**
 * Normalize vault status from backend (handles snake_case and legacy formats)
 */
export function normalizeVaultStatus(raw: any): VaultStatus {
  // Handle legacy format that only has exists/unlocked
  if (raw.state === undefined) {
    const state: VaultStateType = raw.unlocked ? 'unlocked' 
      : raw.exists ? 'ready' 
      : 'no_vault';
    const dbExists = raw.exists ?? false;
    const keychainExists = raw.exists ?? false;
    return {
      state,
      db_exists: dbExists,
      keychain_exists: keychainExists,
      dbExists,
      keychainExists,
      message: '',
      client_count: raw.client_count ?? raw.clientCount ?? null,
      note_count: raw.note_count ?? raw.noteCount ?? null,
      exists: raw.exists ?? false,
      unlocked: raw.unlocked ?? false,
    };
  }
  
  const dbExists = raw.db_exists ?? raw.dbExists ?? false;
  const keychainExists = raw.keychain_exists ?? raw.keychainExists ?? false;
  return {
    state: raw.state,
    db_exists: dbExists,
    keychain_exists: keychainExists,
    dbExists,
    keychainExists,
    message: raw.message ?? '',
    client_count: raw.client_count ?? raw.clientCount ?? null,
    note_count: raw.note_count ?? raw.noteCount ?? null,
    exists: raw.exists ?? false,
    unlocked: raw.unlocked ?? false,
  };
}

export interface OllamaStatus {
  available: boolean;
  models: string[];
  error: string | null;
}

// ============================================
// Vault API
// ============================================

export async function vaultExists(): Promise<boolean> {
  return invoke('vault_exists');
}

export async function createVault(passphrase: string): Promise<void> {
  return invoke('create_vault', { passphrase });
}

export async function unlockVault(passphrase: string): Promise<void> {
  return invoke('unlock_vault', { passphrase });
}

export async function lockVault(): Promise<void> {
  return invoke('lock_vault');
}

export async function getVaultStatus(): Promise<VaultStatus> {
  const raw = await invoke('vault_status');
  return normalizeVaultStatus(raw);
}

/**
 * Clear stale keychain entries when DB is missing (StaleKeychain state)
 * Requires explicit confirmation
 */
export async function clearStaleKeychain(confirm: boolean): Promise<void> {
  return invoke('vault_clear_stale_keychain', { confirm });
}

/**
 * Delete vault database when keychain is lost (KeychainLost state)
 * WARNING: This is destructive and will delete all data!
 * Requires explicit confirmation
 */
export async function deleteVaultDb(confirm: boolean): Promise<void> {
  return invoke('vault_delete_db', { confirm });
}

/**
 * Clear stale keychain (convenience wrapper that auto-confirms)
 * Used by UI recovery flow
 */
export async function vaultClearStaleKeychain(): Promise<void> {
  return clearStaleKeychain(true);
}

/**
 * Delete vault DB (convenience wrapper that auto-confirms)
 * Used by UI recovery flow
 * WARNING: This is destructive and will delete all data!
 */
export async function vaultDeleteDb(): Promise<void> {
  return deleteVaultDb(true);
}

// ============================================
// Client API
// ============================================

export async function createClient(displayName: string): Promise<Client> {
  return invoke('create_client', { displayName });
}

export async function getClient(id: string): Promise<Client> {
  return invoke('get_client', { id });
}

export async function listClients(): Promise<Client[]> {
  return invoke('list_clients');
}

export async function updateClient(client: Client): Promise<Client> {
  return invoke('update_client', { clientJson: JSON.stringify(client) });
}

// ============================================
// Note API
// ============================================

export async function createNote(
  clientId: string,
  sessionDate: string,
  noteType: NoteType,
  content: string
): Promise<Note> {
  return invoke('create_note', { clientId, sessionDate, noteType, content });
}

export async function getNote(id: string): Promise<Note> {
  return invoke('get_note', { id });
}

export async function listNotes(clientId?: string): Promise<Note[]> {
  return invoke('list_notes', { clientId });
}

export async function updateNote(id: string, content: string): Promise<Note> {
  return invoke('update_note', { id, content });
}

export async function updateStructuredNote(id: string, structuredNote: string): Promise<Note> {
  return invoke('update_structured_note', { id, structuredNote });
}

export async function signNote(id: string, attestations: string): Promise<Note> {
  return invoke('sign_note', { id, attestations });
}

export async function exportNote(id: string, format: string): Promise<string> {
  return invoke('export_note', { id, format });
}

// ============================================
// Ethics API
// ============================================

export async function analyzeEthics(content: string): Promise<EthicsAnalysis> {
  return invoke('analyze_ethics', { content });
}

// ============================================
// AI API
// ============================================

export async function checkOllama(): Promise<OllamaStatus> {
  return invoke('check_ollama');
}

// Alias for backwards compatibility
export const ollamaStatus = checkOllama;

export async function structureNoteAI(
  model: string,
  content: string,
  noteType: NoteType
): Promise<string> {
  return invoke('structure_note_ai', { model, content, noteType });
}

// ============================================
// Export Path Validation
// ============================================

export type PathClassification = 'safe' | 'cloud_sync' | 'network_share' | 'removable_media' | 'unknown';

export interface ExportClassificationResult {
  classification: PathClassification;
  reason: string;
  warnings: string[];
  decision: 'allowed' | 'blocked';
  can_override: boolean;
  decision_reason: string;
}

export async function classifyExportPath(
  path: string, 
  enterpriseMode?: boolean
): Promise<ExportClassificationResult> {
  return invoke('classify_export_path', { path, enterpriseMode });
}

export async function validateExportPath(
  path: string,
  enterpriseMode?: boolean,
  userOverride?: boolean
): Promise<void> {
  return invoke('validate_export_path', { path, enterpriseMode, userOverride });
}

// ============================================
// Voice / Speech-to-Text API
// ============================================

export interface WhisperModelInfo {
  name: string;
  path: string;
  size_mb: number;
  multilingual: boolean;
}

export interface TranscriptSegment {
  text: string;
  start_ms: number;
  end_ms: number;
  confidence: number;
  risk_detected: string | null;
}

export async function listWhisperModels(): Promise<WhisperModelInfo[]> {
  return invoke('list_whisper_models');
}

export async function getTranscriptText(): Promise<string> {
  return invoke('get_transcript_text');
}

export async function transcribeAudio(
  audioData: number[],
  sampleRate: number
): Promise<TranscriptSegment[]> {
  return invoke('transcribe_audio', { audioData, sampleRate });
}

export async function voiceToStructuredNote(
  transcript: string,
  noteType: NoteType,
  model: string
): Promise<string> {
  return invoke('voice_to_structured_note', { transcript, noteType, model });
}

// ============================================
// RAG / Semantic Search API
// ============================================

export interface SearchResult {
  note_id: string;
  chunk_text: string;
  score: number;
  note_date: string | null;
  note_type: string | null;
  client_id: string | null;
}

export interface RAGAnswer {
  answer: string;
  sources: RAGSource[];
}

export interface RAGSource {
  note_id: string;
  note_date: string | null;
  relevance: number;
}

export interface IndexStats {
  total_embeddings: number;
  total_notes: number;
  indexed_notes: number;
  embedding_model: string;
  embedding_dim: number;
}

export async function indexNoteForSearch(noteId: string): Promise<number> {
  return invoke('index_note_for_search', { noteId });
}

export async function searchNotesSemantic(
  query: string,
  limit: number,
  clientId?: string
): Promise<SearchResult[]> {
  return invoke('search_notes_semantic', { query, limit, clientId });
}

export async function ragQueryNotes(
  question: string,
  model: string,
  clientId?: string
): Promise<RAGAnswer> {
  return invoke('rag_query_notes', { question, model, clientId });
}

export async function getSearchIndexStats(): Promise<IndexStats> {
  return invoke('get_search_index_stats');
}

export async function reindexAllNotesForSearch(): Promise<number> {
  return invoke('reindex_all_notes_for_search');
}

// ============================================
// Attestation API
// ============================================

export interface QuickPickOption {
  response: AttestationResponse;
  label: string;
  description: string;
  requires_note: boolean;
}

export interface DetectionGroup {
  category: string;
  severity: string;
  detections: EthicsDetection[];
  suggested_response: AttestationResponse;
  group_id: string;
}

export interface AttestationResult {
  attestations: Attestation[];
  all_resolved: boolean;
  can_sign: boolean;
  remaining_count: number;
}

export interface AttestationStats {
  total_detections: number;
  requiring_attestation: number;
  attested: number;
  by_response: Record<string, number>;
  by_category: Record<string, number>;
  average_time_to_attest_ms: number | null;
}

export async function getQuickPicks(
  category: string,
  severity: string
): Promise<QuickPickOption[]> {
  return invoke('get_quick_picks', { category, severity });
}

export async function consolidateDetections(
  detections: EthicsDetection[]
): Promise<DetectionGroup[]> {
  return invoke('consolidate_detections', { 
    detectionsJson: JSON.stringify(detections) 
  });
}

export async function validateAttestation(
  detection: EthicsDetection,
  response: AttestationResponse,
  responseNote?: string
): Promise<void> {
  return invoke('validate_attestation', {
    detectionJson: JSON.stringify(detection),
    response,
    responseNote,
  });
}

export async function checkAttestationCompleteness(
  detections: EthicsDetection[],
  attestations: Attestation[]
): Promise<AttestationResult> {
  return invoke('check_attestation_completeness', {
    detectionsJson: JSON.stringify(detections),
    attestationsJson: JSON.stringify(attestations),
  });
}

export async function calculateAttestationStats(
  detections: EthicsDetection[],
  attestations: Attestation[]
): Promise<AttestationStats> {
  return invoke('calculate_attestation_stats', {
    detectionsJson: JSON.stringify(detections),
    attestationsJson: JSON.stringify(attestations),
  });
}

// ============================================
// Metrics API
// ============================================

export interface SessionMetrics {
  id: string;
  timestamp: number;
  capture_duration_ms: number | null;
  ai_processing_ms: number | null;
  review_duration_ms: number | null;
  total_duration_ms: number;
  word_count: number;
  voice_words: number;
  typed_words: number;
  ai_structured: boolean;
  ai_model_used: string | null;
  ai_edit_percentage: number;
  detection_count: number;
  attestation_count: number;
  critical_detections: number;
  completed: boolean;
  exported: boolean;
}

export interface DashboardMetrics {
  period_start: number;
  period_end: number;
  total_notes: number;
  total_words: number;
  notes_per_day: number;
  avg_time_per_note_ms: number;
  estimated_typing_time_ms: number;
  time_saved_ms: number;
  time_saved_percentage: number;
  ai_assist_rate: number;
  voice_capture_rate: number;
  avg_ai_edit_rate: number;
  detection_rate: number;
  attestation_compliance: number;
  critical_addressed_rate: number;
  time_trend: TrendPoint[];
  volume_trend: TrendPoint[];
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface MetricsReport {
  generated_at: number;
  period_days: number;
  headline: {
    time_saved_hours: number;
    time_saved_percentage: number;
    notes_completed: number;
    compliance_rate: number;
  };
  time_analysis: {
    avg_note_minutes: number;
    baseline_minutes: number;
    time_saved_per_note_minutes: number;
    daily_time_saved_minutes: number;
  };
  ai_analysis: {
    ai_assist_rate: number;
    voice_capture_rate: number;
    avg_edit_rate: number;
    ai_acceptance_rate: number;
  };
  defensibility_analysis: {
    detections_per_note: number;
    attestation_compliance: number;
    critical_addressed: number;
    zero_incidents: boolean;
  };
}

export async function recordSessionMetrics(metrics: SessionMetrics): Promise<void> {
  return invoke('record_session_metrics', { 
    metricsJson: JSON.stringify(metrics) 
  });
}

export async function getDashboardMetrics(days: number): Promise<DashboardMetrics> {
  return invoke('get_dashboard_metrics', { days });
}

export async function getMetricsReport(days: number): Promise<MetricsReport> {
  return invoke('get_metrics_report', { days });
}

// ============================================
// Recording API
// ============================================

export type PolicyDecision = 'ALLOW' | 'WARN' | 'BLOCK';
export type ConsentStatus = 'signed_today' | 'signed_on_file' | 'not_signed';
export type ThirdPartyRisk = 'no' | 'yes' | 'unknown';
export type RecordingMode = 'audio_only' | 'off';

export interface ConsentAttestation {
  patient_state: string | null;
  consent_status: ConsentStatus;
  verbal_reconfirm: boolean;
  third_party_risk: ThirdPartyRisk;
  all_parties_consented: boolean;
  recording_mode: RecordingMode;
}

export interface PolicyResult {
  decision: PolicyDecision;
  reason_codes: string[];
  required_actions: string[];
  policy_version: string;
}

export interface RecordingSession {
  session_id: string;
  note_id: string;
  client_id: string;
  started_at: number;
  stopped_at: number | null;
  status: string;
  asset_id: string;
  policy_snapshot: PolicyResult;
}

export interface PolicyConfig {
  version: string;
  defaults: {
    require_patient_state_each_session: boolean;
    require_verbal_reconfirm_each_session: boolean;
    require_signed_consent_before_recording: boolean;
    block_if_patient_state_unknown: boolean;
    block_if_consent_missing: boolean;
    warn_if_third_party_unknown: boolean;
    block_if_third_party_yes_and_not_consented: boolean;
  };
}

export async function evaluateRecordingPolicy(
  attestation: ConsentAttestation,
  policyJson?: string
): Promise<PolicyResult> {
  return invoke('evaluate_recording_policy', {
    attestationJson: JSON.stringify(attestation),
    policyJson,
  });
}

export async function startRecordingSession(
  noteId: string,
  clientId: string,
  attestation: ConsentAttestation,
  policyJson?: string
): Promise<RecordingSession> {
  return invoke('start_recording_session', {
    noteId,
    clientId,
    attestationJson: JSON.stringify(attestation),
    policyJson,
  });
}

export async function getDefaultRecordingPolicy(): Promise<PolicyConfig> {
  return invoke('get_default_recording_policy');
}

// ============================================
// Deep Analysis API
// ============================================

export interface ParsedNote {
  note_id: string;
  session_date: string;
  symptoms: SymptomExtraction[];
  interventions: InterventionExtraction[];
  risk_flags: RiskFlag[];
  diagnoses: DiagnosisExtraction[];
  plan_items: PlanItem[];
  measures: MeasureScore[];
  telehealth: TelehealthContext | null;
  consent_attestations: string[];
}

export interface SymptomExtraction {
  symptom: string;
  domain: string;
  severity: string | null;
  temporal: string | null;
  frequency: string | null;
}

export interface InterventionExtraction {
  intervention_type: string;
  specific_technique: string | null;
  homework_assigned: boolean;
}

export interface RiskFlag {
  risk_type: string;
  level: string | null;
  assessed: boolean;
  plan_documented: boolean;
}

export interface DiagnosisExtraction {
  code: string | null;
  description: string;
  status: string;
}

export interface PlanItem {
  item: string;
  item_type: string;
  completed: boolean | null;
}

export interface MeasureScore {
  measure: string;
  score: number;
  severity: string | null;
}

export interface TelehealthContext {
  is_telehealth: boolean;
  patient_state: string | null;
  privacy_confirmed: boolean;
}

export interface PatientFeatureStore {
  client_id: string;
  sessions: SessionFeatures[];
  updated_at: number;
}

export interface SessionFeatures {
  note_id: string;
  session_date: string;
  timestamp: number;
  symptom_domains: string[];
  symptom_severities: Record<string, string>;
  interventions_used: string[];
  homework_assigned: boolean;
  risk_types_present: string[];
  highest_risk_level: string | null;
  diagnoses: string[];
  measure_scores: Record<string, number>;
  is_telehealth: boolean;
  patient_state: string | null;
}

export interface AnalysisFinding {
  finding_id: string;
  category: string;
  title: string;
  description: string;
  suggested_action: string | null;
  confidence: string;
  evidence: EvidenceTrail;
  clinician_action: ClinicianAction | null;
}

export interface EvidenceTrail {
  evidence_fields: string[];
  source_session_ids: string[];
  rule_ids: string[];
  time_window: string | null;
}

export interface ClinicianAction {
  action: string;
  timestamp: number;
  note: string | null;
}

export interface TrajectoryCard {
  domain: string;
  trend: string;
  description: string;
  data_points: TrendDataPoint[];
  evidence: EvidenceTrail;
}

export interface TrendDataPoint {
  session_date: string;
  value: number;
  label: string | null;
}

export interface Hypothesis {
  hypothesis_id: string;
  title: string;
  description: string;
  why: string;
  suggested_next_step: string;
  confidence: string;
  evidence: EvidenceTrail;
}

export interface DeepAnalysisResult {
  findings: AnalysisFinding[];
  trajectories: TrajectoryCard[];
  hypotheses: Hypothesis[];
  analyzed_at: number;
  session_count: number;
}

export async function createPatientFeatureStore(clientId: string): Promise<PatientFeatureStore> {
  return invoke('create_patient_feature_store', { clientId });
}

export async function addSessionToFeatureStore(
  store: PatientFeatureStore,
  parsedNote: ParsedNote
): Promise<PatientFeatureStore> {
  return invoke('add_session_to_feature_store', {
    storeJson: JSON.stringify(store),
    parsedNoteJson: JSON.stringify(parsedNote),
  });
}

export async function runDeepAnalysis(store: PatientFeatureStore): Promise<DeepAnalysisResult> {
  return invoke('run_deep_analysis', { storeJson: JSON.stringify(store) });
}

export async function detectInconsistencies(store: PatientFeatureStore): Promise<AnalysisFinding[]> {
  return invoke('detect_inconsistencies', { storeJson: JSON.stringify(store) });
}

export async function analyzeTrajectories(store: PatientFeatureStore): Promise<TrajectoryCard[]> {
  return invoke('analyze_trajectories', { storeJson: JSON.stringify(store) });
}

export async function generateHypotheses(store: PatientFeatureStore): Promise<Hypothesis[]> {
  return invoke('generate_hypotheses', { storeJson: JSON.stringify(store) });
}

// ============================================
// Audit API
// ============================================

export interface AuditEntry {
  id: string;
  timestamp: number;
  sequence: number;
  event_type: string;
  resource_type: string;
  resource_id: string;
  outcome: string;
  detection_ids: string[] | null;
  path_class: string | null;
  path_hash: string | null;
  previous_hash: string;
  entry_hash: string;
}

export interface AuditVerificationResult {
  valid: boolean;
  error: string | null;
  checked_at: number;
}

export async function getAuditLog(limit?: number, offset?: number): Promise<AuditEntry[]> {
  return invoke('get_audit_log', { limit, offset });
}

export async function verifyAuditChain(): Promise<AuditVerificationResult> {
  return invoke('verify_audit_chain');
}

// ============================================
// Security Self-Check
// ============================================

export interface SecurityCheckResult {
  ollama_loopback: boolean;
  vault_encrypted: boolean;
  audit_chain_valid: boolean;
  no_external_network: boolean;
  checks_passed: number;
  checks_total: number;
  details: string[];
}

// ============================================
// Cross-Client Search
// ============================================

export interface ClientSearchResult {
  client: Client;
  matched_fields: [string, string][];  // [field_name, matched_value]
}

export async function searchClients(query: string): Promise<ClientSearchResult[]> {
  return invoke('search_clients', { query });
}

export async function getClientLastVisit(clientId: string): Promise<string | null> {
  return invoke('get_client_last_visit', { clientId });
}

export async function getClientVisitCountSince(clientId: string, sinceDate: string): Promise<number> {
  return invoke('get_client_visit_count_since', { clientId, sinceDate });
}

// ============================================
// Note Editing
// ============================================

export async function updateNoteContent(noteId: string, content: string): Promise<Note> {
  return invoke('update_note_content', { noteId, content });
}

export async function amendNote(noteId: string, amendmentText: string, reason: string): Promise<Note> {
  return invoke('amend_note', { noteId, amendmentText, reason });
}

// ============================================
// Treatment Progress Analysis
// ============================================

export interface TreatmentProgress {
  client_id: string;
  client_name: string;
  total_sessions: number;
  date_range: [string, string] | null;
  session_frequency: number | null;
  themes: ProgressTheme[];
  risk_trajectory: string | null;
  ai_summary: string | null;
}

export interface ProgressTheme {
  theme: string;
  first_mentioned: string;
  mention_count: number;
  trend: string;
}

export async function getTreatmentProgress(clientId: string): Promise<TreatmentProgress> {
  return invoke('get_treatment_progress', { clientId });
}

// ============================================
// Clipboard Security
// ============================================

export interface ClipboardPolicy {
  auto_clear_seconds: number;
  confirm_before_copy: boolean;
  audit_clipboard_events: boolean;
  max_content_length: number;
}

export interface ClipboardCopyResult {
  success: boolean;
  auto_clear_seconds: number | null;
  content_length: number;
}

export async function clipboardCopy(
  content: string,
  contentType?: 'text' | 'clinical_note' | 'assessment' | 'client_info' | 'non_sensitive'
): Promise<ClipboardCopyResult> {
  return invoke('clipboard_copy', { content, contentType });
}

export async function clipboardClear(): Promise<boolean> {
  return invoke('clipboard_clear');
}

export async function clipboardGetPolicy(): Promise<ClipboardPolicy> {
  return invoke('clipboard_get_policy');
}

export async function clipboardSetPolicy(policy: ClipboardPolicy): Promise<boolean> {
  return invoke('clipboard_set_policy', { policy });
}

export async function clipboardHasPending(): Promise<boolean> {
  return invoke('clipboard_has_pending');
}

// ============================================
// Voice Scribe (Enhanced)
// ============================================

export interface VoiceStatus {
  whisper_installed: boolean;
  whisper_command: string | null;
  models_available: string[];
  models_directory: string;
  recommended_model: string;
  ffmpeg_installed: boolean;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
  language: string;
  processing_time_ms: number;
  model_name: string;
}

export interface TranscriptSegment {
  text: string;
  start_ms: number;
  end_ms: number;
  confidence: number;
  risk_detected: string | null;
}

export async function getVoiceStatus(): Promise<VoiceStatus> {
  return invoke('get_voice_status');
}

export async function transcribeAudioFile(
  audioPath: string,
  modelName?: string,
  language?: string
): Promise<TranscriptionResult> {
  return invoke('transcribe_audio', { audioPath, modelName, language });
}

// ============================================
// Policy Management
// ============================================

export interface OrganizationPolicy {
  id: string;
  version: string;
  organization: string;
  effective_date: string;
  expires_at: string | null;
  signed_by: string;
  export_policy: ExportPolicy;
  attestation_policy: AttestationPolicy;
  recording_policy: RecordingPolicy;
  supervision_policy: SupervisionPolicy;
  retention_policy: RetentionPolicy;
}

export interface ExportPolicy {
  cloud_sync: 'Allow' | 'Warn' | 'Block' | 'RequireApproval';
  network_share: 'Allow' | 'Warn' | 'Block' | 'RequireApproval';
  removable_media: 'Allow' | 'Warn' | 'Block' | 'RequireApproval';
  unknown_destination: 'Allow' | 'Warn' | 'Block' | 'RequireApproval';
  audit_pack_required_above: number | null;
  allowed_formats: string[];
}

export interface AttestationPolicy {
  required_attestations: string[];
  recommended_attestations: string[];
  supervisor_review_required: string | null;
  attestation_timeout: number;
  allow_not_relevant: boolean;
  require_explanation_for_not_relevant: boolean;
}

export interface RecordingPolicy {
  consent_required: boolean;
  auto_delete_audio_after_signing: boolean;
  max_audio_retention_days: number;
  reconsent_each_session: boolean;
}

export interface SupervisionPolicy {
  cosign_required_for: string[];
  max_review_delay_hours: number;
  review_high_risk_notes: boolean;
  competency_tracking_enabled: boolean;
}

export interface RetentionPolicy {
  minimum_retention_days: number;
  maximum_retention_days: number;
  retain_after_discharge_days: number;
  audit_log_retention_days: number;
}

export async function getActivePolicy(): Promise<OrganizationPolicy> {
  return invoke('get_active_policy');
}

export async function loadPolicyFromFile(path: string): Promise<boolean> {
  return invoke('load_policy_from_file', { path });
}

export async function checkExportPolicy(destinationClass: string): Promise<PolicyDecision> {
  return invoke('check_export_policy', { destinationClass });
}

export async function checkAttestationPolicy(detectionId: string): Promise<'Required' | 'Recommended' | 'Optional'> {
  return invoke('check_attestation_policy', { detectionId });
}

// ============================================
// Supervision Workflow
// ============================================

export interface ReviewQueueItem {
  note_id: string;
  client_name: string;
  note_type: string;
  supervisee_id: string;
  supervisee_name: string;
  signed_at: string;
  hours_pending: number;
  priority: 'Urgent' | 'Normal' | 'Low';
  has_risk_flags: boolean;
  detection_count: number;
  is_overdue: boolean;
}

export interface FeedbackAnnotation {
  id: string;
  note_id: string;
  annotation_type: 'Strength' | 'Improvement' | 'Critical' | 'Question' | 'Teaching' | 'Comment';
  start_offset: number | null;
  end_offset: number | null;
  content: string;
  created_by: string;
  created_at: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
}

export interface CoSignature {
  note_id: string;
  supervisor_id: string;
  supervisor_name: string;
  supervisor_credentials: string;
  signed_at: string;
  review_delay_hours: number;
  conditions: string | null;
  signature: string;
}

export interface CompetencyRecord {
  supervisee_id: string;
  competency_area: string;
  rating: number;
  history: CompetencyRating[];
  updated_at: string;
  notes: string;
}

export interface CompetencyRating {
  rating: number;
  date: string;
  rater_id: string;
  evidence: string | null;
}

export async function getReviewQueue(supervisorId: string): Promise<ReviewQueueItem[]> {
  return invoke('get_review_queue', { supervisorId });
}

export async function addFeedbackAnnotation(
  noteId: string,
  annotationType: FeedbackAnnotation['annotation_type'],
  content: string,
  supervisorId: string,
  startOffset?: number,
  endOffset?: number
): Promise<FeedbackAnnotation> {
  return invoke('add_feedback_annotation', { 
    noteId, annotationType, content, supervisorId, startOffset, endOffset 
  });
}

export async function getNoteAnnotations(noteId: string): Promise<FeedbackAnnotation[]> {
  return invoke('get_note_annotations', { noteId });
}

export async function cosignNote(
  noteId: string,
  supervisorId: string,
  supervisorName: string,
  supervisorCredentials: string,
  conditions?: string
): Promise<CoSignature> {
  return invoke('cosign_note', { 
    noteId, supervisorId, supervisorName, supervisorCredentials, conditions 
  });
}

export async function getCosignature(noteId: string): Promise<CoSignature | null> {
  return invoke('get_cosignature', { noteId });
}

export async function checkCosignRequired(superviseeId: string): Promise<boolean> {
  return invoke('check_cosign_required', { superviseeId });
}

export async function updateCompetencyRating(
  superviseeId: string,
  competencyArea: string,
  rating: number,
  raterId: string,
  evidence?: string
): Promise<void> {
  return invoke('update_competency_rating', { 
    superviseeId, competencyArea, rating, raterId, evidence 
  });
}

export async function getCompetencyRecords(superviseeId: string): Promise<CompetencyRecord[]> {
  return invoke('get_competency_records', { superviseeId });
}

// ============================================
// SIEM Integration
// ============================================

export interface SiemConfig {
  enabled: boolean;
  format: 'Splunk' | 'Sentinel' | 'Generic' | 'Syslog';
  endpoint: string;
  auth_token: string | null;
  headers: Record<string, string>;
  batch_size: number;
  flush_interval_seconds: number;
  retry_count: number;
  source: string;
  source_type: string;
  index: string | null;
}

export interface SiemStatus {
  enabled: boolean;
  format: string;
  endpoint: string | null;
  buffer_size: number;
  sent_count: number;
  failed_count: number;
  last_flush: string | null;
}

export async function configureSiem(config: SiemConfig): Promise<void> {
  return invoke('configure_siem', { config });
}

export async function getSiemStatus(): Promise<SiemStatus | null> {
  return invoke('get_siem_status');
}

export async function flushSiemBuffer(): Promise<number> {
  return invoke('flush_siem_buffer');
}

// ============================================
// Audit Pack Generator
// ============================================

export interface AuditPackConfig {
  pack_type: 'Full' | 'Summary' | 'Legal' | 'Payer' | 'Custom';
  start_date: string;
  end_date: string;
  client_ids: string[] | null;
  include_content: boolean;
  include_amendments: boolean;
  include_attestations: boolean;
  include_audit_log: boolean;
  include_chain_verification: boolean;
  redact_client_names: boolean;
  output_format: 'Pdf' | 'Json' | 'Zip';
}

export interface AuditPack {
  id: string;
  generated_at: string;
  generated_by: string;
  pack_type: string;
  date_range: { start: string; end: string };
  clients: ClientSummary[];
  contents: AuditPackContents;
  chain_verification: ChainVerification | null;
  metadata: AuditPackMetadata;
}

export interface ClientSummary {
  id: string;
  display_name: string;
  note_count: number;
}

export interface AuditPackContents {
  notes: AuditNote[];
  amendments: AuditAmendment[];
  attestations: AuditAttestation[];
  audit_log: AuditLogEntry[];
}

export interface AuditNote {
  id: string;
  client_id: string;
  note_type: string;
  created_at: string;
  signed_at: string | null;
  signed_by: string | null;
  content: string | null;
  content_hash: string;
  has_amendments: boolean;
  has_attestations: boolean;
}

export interface AuditAmendment {
  id: string;
  note_id: string;
  created_at: string;
  reason: string;
  content: string;
  signed_by: string;
  signature: string;
}

export interface AuditAttestation {
  id: string;
  note_id: string;
  detection_id: string;
  detection_title: string;
  response: string;
  explanation: string | null;
  attested_at: string;
  attested_by: string;
  signature: string;
}

export interface AuditLogEntry {
  event_type: string;
  resource_type: string;
  resource_id: string;
  timestamp: string;
  outcome: string;
  entry_hash: string;
}

export interface ChainVerification {
  verified: boolean;
  entries_checked: number;
  first_entry: string;
  last_entry: string;
  verification_hash: string;
  gaps_detected: string[];
}

export interface AuditPackMetadata {
  app_version: string;
  schema_version: string;
  total_notes: number;
  total_amendments: number;
  total_attestations: number;
  generation_time_ms: number;
}

export interface ExportCertificate {
  pack_id: string;
  content_hash: string;
  exported_at: string;
  exported_by: string;
  destination_class: string;
  destination_hash: string;
  signature: string;
}

export async function generateAuditPack(config: AuditPackConfig): Promise<AuditPack> {
  return invoke('generate_audit_pack', { config });
}

export async function exportAuditPack(
  pack: AuditPack,
  destination: string,
  format: 'Pdf' | 'Json' | 'Zip'
): Promise<ExportCertificate> {
  return invoke('export_audit_pack', { pack, destination, format });
}

// ============================================
// Voice Scribe Enhanced (Sprint 1) - Additional Types
// ============================================

export interface StructuredVoiceNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  interventions: string[];
  riskLevel: 'low' | 'moderate' | 'high' | null;
  nextSession: string | null;
}

/** Transcribe audio from base64 encoded data */
export async function transcribeAudioBase64(audioData: string, format: string): Promise<string> {
  return invoke('transcribe_audio_base64', { audioData, format });
}

/** Structure a voice transcript into a clinical note */
export async function structureVoiceNote(transcript: string, clientId: string): Promise<StructuredVoiceNote> {
  return invoke('structure_voice_note', { transcript, clientId });
}

// ============================================
// Time Tracking Metrics (Sprint 1)
// ============================================

export type DocumentationMethod = 'voice' | 'typed' | 'template' | 'manual';

export interface SessionMetrics {
  noteId: string;
  clientId: string;
  startTime: string; // ISO string
  endTime: string;
  method: DocumentationMethod;
  wordCount: number;
  aiAssisted: boolean;
}

export interface WeeklyStats {
  weekStart: string;
  noteCount: number;
  totalSeconds: number;
  avgSeconds: number;
}

export interface TimeMetricsData {
  totalNotes: number;
  totalTimeSeconds: number;
  avgTimeSeconds: number;
  voiceScribeCount: number;
  voiceScribeAvgSeconds: number;
  typedCount: number;
  typedAvgSeconds: number;
  estimatedTimeSavedSeconds: number;
  weeklyStats: WeeklyStats[];
}

export type TimePeriod = 'week' | 'month' | 'quarter' | 'year' | 'all';

/** Record session timing metrics */
export async function recordTimeMetrics(
  noteId: string,
  clientId: string,
  startTime: string,
  endTime: string,
  method: DocumentationMethod,
  wordCount: number,
  aiAssisted: boolean
): Promise<void> {
  return invoke('record_time_metrics', { 
    noteId, clientId, startTime, endTime, method, wordCount, aiAssisted 
  });
}

/** Get time metrics for a period */
export async function getTimeMetrics(period: TimePeriod): Promise<TimeMetricsData> {
  return invoke('get_time_metrics', { period });
}

/** Get efficiency score (0-100) */
export async function getEfficiencyScore(period: TimePeriod): Promise<number> {
  return invoke('get_efficiency_score', { period });
}

// ============================================
// EHR Export (Sprint 3)
// ============================================

export type EhrTarget = 
  | 'simplepractice'
  | 'therapynotes'
  | 'janeapp'
  | 'practicefusion'
  | 'epic'
  | 'pdf'
  | 'docx'
  | 'plaintext';

export interface EhrTargetInfo {
  id: string;
  name: string;
  extension: string;
  description: string;
}

export interface ExportableNote {
  id: string;
  client_id: string;
  client_name: string;
  session_date: string;
  note_type: string;
  content: string;
  signed_at: string | null;
  signed_by: string | null;
  word_count: number;
  amendments: EhrAmendment[];
  attestations: EhrAttestationRecord[];
}

export interface EhrAmendment {
  created_at: string;
  reason: string;
  content: string;
  signed_by: string;
}

export interface EhrAttestationRecord {
  detection_id: string;
  detection_title: string;
  response: string;
  explanation: string | null;
  attested_at: string;
}

export interface EhrExportResult {
  success: boolean;
  target: EhrTarget;
  filePath: string | null;
  fileSize: number;
  notesExported: number;
  exportTimeMs: number;
  instructions: string;
}

/** Get available EHR export targets */
export async function getEhrTargets(): Promise<EhrTargetInfo[]> {
  return invoke('get_ehr_targets');
}

/** Export note to EHR format */
export async function exportToEhr(
  note: ExportableNote,
  target: EhrTarget,
  outputDir: string,
  includeAmendments: boolean,
  includeSignature: boolean
): Promise<EhrExportResult> {
  return invoke('export_to_ehr', { 
    note, target, outputDir, includeAmendments, includeSignature 
  });
}

// ============================================
// Legal Audit Export (Sprint 3)
// ============================================

export type LegalReportType = 
  | 'full'
  | 'timeline'
  | 'timing'
  | 'custody'
  | 'extract';

export interface LegalReportRequest {
  reportType: LegalReportType;
  clientId?: string;
  startDate: string;
  endDate: string;
  noteIds?: string[];
  includeTechnical: boolean;
  includeVerification: boolean;
  requestedBy: string;
  caseReference?: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface ReportSummary {
  totalEntries: number;
  notesCreated: number;
  notesSigned: number;
  amendments: number;
  exports: number;
  avgTimeToSignHours: number;
  findings: string[];
}

export interface LegalAuditEntry {
  id: string;
  timestamp: string;
  eventType: string;
  category: string;
  description: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  outcome: string;
  entryHash: string;
  previousHash: string;
  technical?: TechnicalDetails;
}

export interface TechnicalDetails {
  contentHash?: string;
  wordCount?: number;
  ipAddress: string;
  deviceId: string;
  appVersion: string;
}

export interface LegalChainVerification {
  valid: boolean;
  entriesVerified: number;
  firstHash: string;
  lastHash: string;
  gaps: ChainGap[];
  verifiedAt: string;
  method: string;
}

export interface ChainGap {
  beforeHash: string;
  afterHash: string;
  beforeTimestamp: string;
  afterTimestamp: string;
  gapDurationSeconds: number;
}

export interface CertificationStatement {
  statement: string;
  certifiedBy: string;
  certifiedAt: string;
  signature: string;
}

export interface LegalReport {
  id: string;
  reportType: LegalReportType;
  generatedAt: string;
  title: string;
  caseReference?: string;
  dateRange: DateRange;
  summary: ReportSummary;
  entries: LegalAuditEntry[];
  chainVerification: LegalChainVerification;
  certification: CertificationStatement;
}

/** Generate a legal audit report */
export async function generateLegalReport(
  reportType: LegalReportType,
  startDate: string,
  endDate: string,
  requestedBy: string,
  options?: {
    clientId?: string;
    caseReference?: string;
    includeTechnical?: boolean;
  }
): Promise<LegalReport> {
  return invoke('generate_legal_report', {
    reportType,
    clientId: options?.clientId,
    startDate,
    endDate,
    caseReference: options?.caseReference,
    requestedBy,
    includeTechnical: options?.includeTechnical ?? false,
  });
}

/** Export legal report to file */
export async function exportLegalReport(
  report: LegalReport,
  format: 'html' | 'pdf' | 'csv' | 'json',
  outputPath: string
): Promise<string> {
  return invoke('export_legal_report', { report, format, outputPath });
}

// ============================================
// Supervisor Dashboard Types (Sprint 3-4)
// ============================================

export type CredentialLevel = 'intern' | 'trainee' | 'postdoc' | 'provisionally_licensed' | 'licensed' | 'supervisor';

export interface Supervisee {
  id: string;
  name: string;
  credentials: string;
  level: CredentialLevel;
  startDate: string;
  notesThisWeek: number;
  notesPendingReview: number;
  lastActivity: string;
}

/** Get list of supervisees for a supervisor */
export async function getSupervisees(supervisorId: string): Promise<Supervisee[]> {
  return invoke('get_supervisees', { supervisorId });
}

// ============================================
// Performance Optimization (Sprint 4)
// ============================================

export interface CacheStats {
  entries: number;
  max_entries: number;
  hits: number;
  misses: number;
  hit_rate: number;
}

export interface MemoryStats {
  heap_used_mb: number;
  rss_mb: number;
  cache_entries: number;
  pending_tasks: number;
}

export interface PerformanceStats {
  cache: CacheStats;
  memory: MemoryStats;
  pending_background_tasks: number;
}

export interface PaginationRequest {
  page: number;
  page_size: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/** Get performance statistics */
export async function getPerformanceStats(): Promise<PerformanceStats> {
  return invoke('get_performance_stats');
}

/** Clear all caches */
export async function clearCaches(): Promise<void> {
  return invoke('clear_caches');
}

/** Trigger database optimization */
export async function optimizeDatabase(): Promise<void> {
  return invoke('optimize_database');
}

/** Get notes with pagination */
export async function getNotesPaginated(
  page: number,
  pageSize: number,
  clientId?: string
): Promise<PaginatedResponse<Note>> {
  return invoke('get_notes_paginated', { page, pageSize, clientId });
}

// ============================================
// Document Management
// ============================================

export interface ClientDocument {
  id: string;
  client_id: string;
  filename: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  content_hash: string;
  ocr_text?: string;
  description?: string;
  document_date?: string;
  created_at: number;
  updated_at: number;
}

export interface StorageStats {
  database_size_bytes: number;
  note_count: number;
  client_count: number;
  document_count: number;
  document_size_bytes: number;
  embedding_count: number;
}

/** Upload a document to a client's chart */
export async function uploadDocument(
  clientId: string,
  filename: string,
  fileType: string,
  mimeType: string,
  data: number[],
  description?: string,
  documentDate?: string
): Promise<ClientDocument> {
  return invoke('upload_document', {
    clientId,
    filename,
    fileType,
    mimeType,
    data,
    description,
    documentDate,
  });
}

/** List documents for a client */
export async function listDocuments(clientId: string): Promise<ClientDocument[]> {
  return invoke('list_documents', { clientId });
}

/** Get document binary data */
export async function getDocumentData(documentId: string): Promise<number[]> {
  return invoke('get_document_data', { documentId });
}

/** Delete a document */
export async function deleteDocument(documentId: string): Promise<void> {
  return invoke('delete_document', { documentId });
}

/** Search documents by content/filename */
export async function searchDocuments(query: string): Promise<ClientDocument[]> {
  return invoke('search_documents', { query });
}

/** Update document OCR text */
export async function updateDocumentOcr(documentId: string, ocrText: string): Promise<void> {
  return invoke('update_document_ocr', { documentId, ocrText });
}

// ============================================
// Storage Management
// ============================================

/** Get storage statistics */
export async function getStorageStats(): Promise<StorageStats> {
  return invoke('get_storage_stats');
}

/** Run database optimization (VACUUM/ANALYZE) */
export async function runDatabaseOptimization(): Promise<void> {
  return invoke('optimize_database');
}

// ============================================
// OCR Processing
// ============================================

/** Run OCR on a document and extract text */
export async function processDocumentOcr(documentId: string): Promise<string> {
  return invoke('process_document_ocr', { documentId });
}

/** Check if Tesseract OCR is available */
export async function checkOcrAvailable(): Promise<boolean> {
  return invoke('check_ocr_available');
}

// ============================================
// Voice/Whisper Management
// ============================================

export interface VoiceSetupStatus {
  whisper_installed: boolean;
  whisper_command: string | null;
  models_available: string[];
  ffmpeg_installed: boolean;
}

/** Download a Whisper model */
export async function downloadWhisperModel(modelName: string): Promise<string> {
  return invoke('download_whisper_model', { modelName });
}

// ============================================
// Progress Themes (updated)
// ============================================

export interface ProgressTheme {
  theme: string;
  first_mentioned: string;
  mention_count: number;
  trend: string;
  note_ids: string[];
}

// ============================================
// Pre-Session Prep Sheet
// ============================================

export interface PrepSheet {
  client_id: string;
  client_name: string;
  generated_at: string;
  demographics: PrepDemographics;
  recent_sessions: RecentSessionSummary[];
  active_themes: PrepTheme[];
  safety_alerts: SafetyAlert[];
  suggested_assessments: AssessmentSuggestion[];
  focus_suggestions: string[];
  last_assessments: AssessmentResult[];
}

export interface PrepDemographics {
  age: number | null;
  treatment_duration_days: number | null;
  total_sessions: number;
  last_session_date: string | null;
  days_since_last_session: number | null;
  diagnosis_codes: string | null;
}

export interface RecentSessionSummary {
  session_date: string;
  note_type: string;
  key_points: string[];
  mood_indicators: string[];
  interventions_used: string[];
}

export interface PrepTheme {
  theme: string;
  trend: string;
  last_mentioned: string;
  clinical_note: string | null;
}

export interface SafetyAlert {
  alert_type: string;
  last_flagged: string;
  severity: string;
  details: string;
}

export interface AssessmentSuggestion {
  assessment_name: string;
  reason: string;
  last_administered: string | null;
  last_score: number | null;
}

export interface AssessmentResult {
  assessment_name: string;
  score: number;
  date_administered: string;
  interpretation: string;
}

/** Generate pre-session prep sheet for a client */
export async function generatePrepSheet(clientId: string): Promise<PrepSheet> {
  return invoke('generate_prep_sheet', { clientId });
}

// ============================================
// AI Completion Check
// ============================================

export interface CompletionCheckResult {
  is_complete: boolean;
  overall_score: number;
  missing_fields: MissingField[];
  vague_sections: VagueSection[];
  compliance_issues: ComplianceIssue[];
  suggestions: string[];
}

export interface MissingField {
  field_name: string;
  importance: string;
  description: string;
}

export interface VagueSection {
  section: string;
  problematic_text: string;
  suggestion: string;
}

export interface ComplianceIssue {
  issue_type: string;
  description: string;
  severity: string;
}

/** Check note completion before signing */
export async function checkNoteCompletion(noteId: string, model: string): Promise<CompletionCheckResult> {
  return invoke('check_note_completion', { noteId, model });
}

// ============================================
// Export to PDF/DOCX
// ============================================

/** Export a note to file format (pdf, docx, txt) */
export async function exportNoteToFile(
  noteId: string,
  format: 'pdf' | 'docx' | 'txt',
  includeHeader: boolean = true
): Promise<number[]> {
  return invoke('export_note_to_file', { noteId, format, includeHeader });
}

// ============================================
// Supervisor Mode
// ============================================

export interface Trainee {
  id: string;
  name: string;
  email: string | null;
  supervisor_id: string;
  start_date: string;
  status: string;
  notes_submitted: number;
  notes_approved: number;
  created_at: number;
}

export interface SupervisorReview {
  id: string;
  note_id: string;
  supervisor_id: string;
  supervisor_name: string;
  review_date: string;
  status: string;
  comments: ReviewComment[];
  overall_feedback: string | null;
  clinical_accuracy_score: number | null;
  documentation_quality_score: number | null;
  created_at: number;
}

export interface ReviewComment {
  id: string;
  section: string | null;
  comment_type: string;
  text: string;
  created_at: number;
}

export interface PendingReview {
  note_id: string;
  trainee_name: string;
  client_name: string;
  session_date: string;
  submitted_at: string;
  days_pending: number;
}

export interface SupervisorDashboard {
  supervisor_id: string;
  trainees: TraineeSummary[];
  pending_reviews: PendingReview[];
  recent_activity: SupervisorActivity[];
}

export interface TraineeSummary {
  trainee: Trainee;
  pending_notes: number;
  avg_quality_score: number | null;
  last_submission: string | null;
}

export interface SupervisorActivity {
  activity_type: string;
  description: string;
  timestamp: number;
}

/** Create a new trainee */
export async function createTrainee(name: string, email: string | null, supervisorId: string): Promise<Trainee> {
  return invoke('create_trainee', { name, email, supervisorId });
}

/** List trainees for a supervisor */
export async function listTrainees(supervisorId: string): Promise<Trainee[]> {
  return invoke('list_trainees', { supervisorId });
}

/** Submit a note for supervisor review */
export async function submitNoteForReview(noteId: string, traineeId: string): Promise<void> {
  return invoke('submit_note_for_review', { noteId, traineeId });
}

/** Get pending reviews for a supervisor */
export async function getPendingReviews(supervisorId: string): Promise<PendingReview[]> {
  return invoke('get_pending_reviews', { supervisorId });
}

/** Add a review comment to a note */
export async function addReviewComment(
  noteId: string,
  supervisorId: string,
  commentType: string,
  text: string,
  section?: string
): Promise<ReviewComment> {
  return invoke('add_review_comment', { noteId, supervisorId, commentType, text, section });
}

/** Complete a review */
export async function completeReview(
  noteId: string,
  supervisorId: string,
  status: 'approved' | 'needs_revision' | 'rejected',
  overallFeedback?: string,
  clinicalAccuracyScore?: number,
  documentationQualityScore?: number
): Promise<SupervisorReview> {
  return invoke('complete_review', { 
    noteId, 
    supervisorId, 
    status, 
    overallFeedback,
    clinicalAccuracyScore,
    documentationQualityScore
  });
}

/** Get supervisor dashboard */
export async function getSupervisorDashboard(supervisorId: string): Promise<SupervisorDashboard> {
  return invoke('get_supervisor_dashboard', { supervisorId });
}

/** Get reviews for a note */
export async function getNoteReviews(noteId: string): Promise<SupervisorReview[]> {
  return invoke('get_note_reviews', { noteId });
}

// ============================================
// HIPAA Safe Harbor De-identification
// ============================================

export type IdentifierCategory = 
  | 'Name'
  | 'Geographic'
  | 'Date'
  | 'Phone'
  | 'Fax'
  | 'Email'
  | 'SSN'
  | 'MedicalRecordNumber'
  | 'HealthPlanNumber'
  | 'AccountNumber'
  | 'LicenseNumber'
  | 'VehicleIdentifier'
  | 'DeviceIdentifier'
  | 'WebUrl'
  | 'IpAddress'
  | 'Biometric'
  | 'FullFacePhoto'
  | 'UniqueIdentifier'
  | 'ContextualIdentifier';

export interface DetectedIdentifier {
  category: IdentifierCategory;
  original_text: string;
  start_pos: number;
  end_pos: number;
  replacement: string;
  confidence: number;
  detection_method: string;
}

export interface DeidentificationResult {
  original_hash: string;
  deidentified_text: string;
  deidentified_hash: string;
  identifiers_found: DetectedIdentifier[];
  category_counts: Record<string, number>;
  safe_harbor_compliant: boolean;
  timestamp: string;
  processing_time_ms: number;
}

export interface AuditedIdentifier {
  category_code: string;
  category_name: string;
  position: number;
  length: number;
  replacement_type: string;
}

export interface DeidentificationAudit {
  id: string;
  note_id: string | null;
  client_id: string | null;
  original_hash: string;
  deidentified_hash: string;
  identifiers_removed: AuditedIdentifier[];
  category_summary: Record<string, number>;
  method: string;
  ai_enhanced: boolean;
  user_verified: boolean;
  created_at: number;
  exported_at: number | null;
}

export interface ConsultationDraft {
  id: string;
  title: string;
  deidentified_content: string;
  clinical_question: string;
  specialties: string[];
  urgency: string;
  audit_id: string;
  status: string;
  created_at: number;
  updated_at: number;
}

/** De-identify text using HIPAA Safe Harbor method */
export async function deidentifyText(text: string, useAi: boolean = false): Promise<DeidentificationResult> {
  return invoke('deidentify_text', { text, useAi });
}

/** De-identify a note */
export async function deidentifyNote(noteId: string, useAi: boolean = false): Promise<DeidentificationResult> {
  return invoke('deidentify_note', { noteId, useAi });
}

/** AI-enhanced contextual identifier detection */
export async function detectContextualIdentifiers(text: string, model: string): Promise<DetectedIdentifier[]> {
  return invoke('detect_contextual_identifiers', { text, model });
}

/** Save de-identification audit trail */
export async function saveDeidentificationAudit(
  noteId: string | null,
  clientId: string | null,
  result: DeidentificationResult,
  aiEnhanced: boolean
): Promise<DeidentificationAudit> {
  return invoke('save_deidentification_audit', { noteId, clientId, result, aiEnhanced });
}

/** Get de-identification audits for a note */
export async function getDeidentificationAudits(noteId?: string): Promise<DeidentificationAudit[]> {
  return invoke('get_deidentification_audits', { noteId });
}

/** Export de-identified case with audit certificate */
export async function exportDeidentifiedCase(
  noteId: string,
  format: 'pdf' | 'docx' | 'txt',
  includeAudit: boolean = true
): Promise<number[]> {
  return invoke('export_deidentified_case', { noteId, format, includeAudit });
}

/** Create a consultation draft from a note */
export async function createConsultationDraft(
  noteId: string,
  title: string,
  clinicalQuestion: string,
  specialties: string[],
  urgency: 'routine' | 'soon' | 'urgent'
): Promise<ConsultationDraft> {
  return invoke('create_consultation_draft', { noteId, title, clinicalQuestion, specialties, urgency });
}

/** List all consultation drafts */
export async function listConsultationDrafts(): Promise<ConsultationDraft[]> {
  return invoke('list_consultation_drafts');
}

/** Get a specific draft */
export async function getConsultationDraft(draftId: string): Promise<ConsultationDraft> {
  return invoke('get_consultation_draft', { draftId });
}

/** Update a consultation draft */
export async function updateConsultationDraft(
  draftId: string,
  title?: string,
  clinicalQuestion?: string,
  status?: string
): Promise<void> {
  return invoke('update_consultation_draft', { draftId, title, clinicalQuestion, status });
}

/** Delete a consultation draft */
export async function deleteConsultationDraft(draftId: string): Promise<void> {
  return invoke('delete_consultation_draft', { draftId });
}

/** Get current policy version */
export async function getPolicyVersion(): Promise<string> {
  return invoke('get_policy_version', {});
}

/** Get pending note reviews for a trainee */
export interface PendingReview {
  note_id: string;
  trainee_name: string;
  client_name: string;
  session_date: string;
  submitted_at: string;
  days_pending: number;
}

export async function getTraineePendingReviews(traineeId: string): Promise<PendingReview[]> {
  return invoke('get_trainee_pending_reviews', { traineeId });
}

// ============================================
// File Save Helper (uses Tauri native dialog)
// ============================================

export async function saveFile(
  data: number[],
  defaultFileName: string,
  filterName: string,
  extension: string
): Promise<boolean> {
  try {
    // Open save dialog
    const filePath = await save({
      defaultPath: defaultFileName,
      filters: [{
        name: filterName,
        extensions: [extension]
      }]
    });
    
    if (!filePath) {
      // User cancelled
      return false;
    }
    
    // Write file
    await writeBinaryFile(filePath, new Uint8Array(data));
    return true;
  } catch (err) {
    console.error('File save error:', err);
    throw err;
  }
}
