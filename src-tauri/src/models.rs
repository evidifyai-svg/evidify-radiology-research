// Data models for Evidify v4
// 
// Changes from v3:
// - path_class/path_hash in AuditEntry (no full paths - PHI risk)
// - OllamaStatus.authenticated always false (honest - no fake auth)

use serde::{Deserialize, Serialize};

// ============================================
// Client
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Client {
    pub id: String,
    pub display_name: String,
    pub status: String,
    pub session_count: i32,
    pub created_at: i64,
    pub updated_at: i64,
    
    // Extended profile fields (optional, PHI-safe identifiers only)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub date_of_birth: Option<String>,         // YYYY-MM-DD format
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emergency_contact: Option<String>,      // Name and number
    #[serde(skip_serializing_if = "Option::is_none")]
    pub insurance_info: Option<String>,         // Carrier/ID for billing
    #[serde(skip_serializing_if = "Option::is_none")]
    pub diagnosis_codes: Option<String>,        // ICD-10 codes, comma separated
    #[serde(skip_serializing_if = "Option::is_none")]
    pub treatment_start_date: Option<String>,   // YYYY-MM-DD
    #[serde(skip_serializing_if = "Option::is_none")]
    pub referring_provider: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,                  // General notes about client
}

/// Result from cross-client search with match context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientSearchResult {
    pub client: Client,
    pub matched_fields: Vec<(String, String)>,  // (field_name, matched_value)
}

/// Treatment progress analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreatmentProgress {
    pub client_id: String,
    pub client_name: String,
    pub total_sessions: i32,
    pub date_range: Option<(String, String)>,  // (first_session, last_session)
    pub session_frequency: Option<f64>,         // Average days between sessions
    pub themes: Vec<ProgressTheme>,
    pub risk_trajectory: Option<String>,        // "improving", "stable", "concerning", "insufficient_data"
    pub ai_summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressTheme {
    pub theme: String,
    pub first_mentioned: String,    // date
    pub mention_count: i32,
    pub trend: String,              // "improving", "stable", "worsening", "resolved"
    pub note_ids: Vec<String>,      // IDs of notes containing this theme
}

// ============================================
// Note
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub client_id: String,
    pub session_date: String,
    pub note_type: NoteType,
    #[serde(rename = "content")]
    pub raw_input: String,
    pub structured_note: Option<String>,
    pub word_count: i32,
    pub status: NoteStatus,
    
    // Detection tracking: IDs only (evidence reconstructed from raw_input)
    pub detection_ids: Vec<String>,
    pub attestations: Vec<Attestation>,
    
    // Provenance
    pub content_hash: String,
    
    pub signed_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NoteType {
    Progress,
    Intake,
    Crisis,
    Phone,
    Group,
    Termination,
}

impl NoteType {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "progress" => NoteType::Progress,
            "intake" => NoteType::Intake,
            "crisis" => NoteType::Crisis,
            "phone" => NoteType::Phone,
            "group" => NoteType::Group,
            "termination" => NoteType::Termination,
            _ => NoteType::Progress,
        }
    }
    
    pub fn format_name(&self) -> &str {
        match self {
            NoteType::Progress => "SOAP",
            NoteType::Intake => "Intake Assessment",
            NoteType::Crisis => "Crisis Note",
            NoteType::Phone => "Phone Contact",
            NoteType::Group => "Group Note",
            NoteType::Termination => "Termination Summary",
        }
    }
}

impl std::fmt::Display for NoteType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            NoteType::Progress => write!(f, "progress"),
            NoteType::Intake => write!(f, "intake"),
            NoteType::Crisis => write!(f, "crisis"),
            NoteType::Phone => write!(f, "phone"),
            NoteType::Group => write!(f, "group"),
            NoteType::Termination => write!(f, "termination"),
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NoteStatus {
    Draft,
    Reviewed,
    Signed,
    Amended,
    Exported,
}

impl NoteStatus {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "draft" => NoteStatus::Draft,
            "reviewed" => NoteStatus::Reviewed,
            "signed" => NoteStatus::Signed,
            "amended" => NoteStatus::Amended,
            "exported" => NoteStatus::Exported,
            _ => NoteStatus::Draft,
        }
    }
}

impl std::fmt::Display for NoteStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            NoteStatus::Draft => write!(f, "Draft"),
            NoteStatus::Reviewed => write!(f, "Reviewed"),
            NoteStatus::Signed => write!(f, "Signed"),
            NoteStatus::Amended => write!(f, "Amended"),
            NoteStatus::Exported => write!(f, "Exported"),
        }
    }
}

// ============================================
// Attestation
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attestation {
    pub detection_id: String,
    pub response: AttestationResponse,
    pub response_note: Option<String>,
    pub attested_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AttestationResponse {
    AddressedInNote,
    NotClinicallyRelevant,
    WillAddressNextSession,
    ConsultedSupervisor,
    DocumentedElsewhere,
}

// ============================================
// Ethics Detection (v3: stored without evidence)
// ============================================

/// Detection as stored in database (no evidence text)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredDetection {
    pub id: String,
    pub pattern_id: String,
    pub severity: DetectionSeverity,
    pub match_start: usize,
    pub match_end: usize,
}

impl StoredDetection {
    /// Reconstruct evidence from note content
    pub fn get_evidence(&self, note_content: &str, context_size: usize) -> String {
        let start = self.match_start.saturating_sub(context_size);
        let end = (self.match_end + context_size).min(note_content.len());
        
        // Find word boundaries
        let content_bytes = note_content.as_bytes();
        let actual_start = (0..=start).rev()
            .find(|&i| i == 0 || content_bytes.get(i-1).map(|&b| b == b' ').unwrap_or(true))
            .unwrap_or(start);
        let actual_end = (end..note_content.len())
            .find(|&i| content_bytes.get(i).map(|&b| b == b' ').unwrap_or(true))
            .unwrap_or(end);
        
        let mut evidence = String::new();
        if actual_start > 0 {
            evidence.push_str("...");
        }
        if let Some(slice) = note_content.get(actual_start..actual_end) {
            evidence.push_str(slice);
        }
        if actual_end < note_content.len() {
            evidence.push_str("...");
        }
        evidence
    }
}

/// Detection with evidence (for display to user)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EthicsDetection {
    pub id: String,
    pub severity: DetectionSeverity,
    pub category: String,
    pub title: String,
    pub description: String,
    pub evidence: String,
    pub suggestion: String,
    pub policy_ref: Option<String>,
    pub requires_attestation: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum DetectionSeverity {
    Attest,  // Must acknowledge + document response
    Flag,    // Highlighted, tracked in metrics
    Coach,   // Inline suggestion, optional
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EthicsAnalysis {
    pub detections: Vec<EthicsDetection>,
    pub stored_detections: Vec<StoredDetection>,
    pub attest_count: usize,
    pub flag_count: usize,
    pub coach_count: usize,
}

// ============================================
// Audit Log (PHI-impossible)
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEntry {
    pub id: String,
    pub timestamp: i64,
    pub sequence: i64,
    pub event_type: AuditEventType,
    pub resource_type: AuditResourceType,
    pub resource_id: String,
    pub outcome: AuditOutcome,
    pub detection_ids: Option<Vec<String>>,  // IDs only, no content
    pub path_class: Option<String>,          // For exports: safe/cloud/network/removable
    pub path_hash: Option<String>,           // Salted SHA-256 of canonical path (not reversible)
    pub previous_hash: String,
    pub entry_hash: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditEventType {
    NoteCreated,
    NoteUpdated,
    NoteSigned,
    NoteExported,
    NoteDeleted,
    ClientCreated,
    ClientUpdated,
    AiAnalysisRun,
    EthicsDetectionTriggered,
    EthicsDetectionResolved,
    FormulationGenerated,
    SearchExecuted,
    ExportCreated,
    SettingsChanged,
    VaultUnlocked,
    VaultLocked,
    PassphraseChanged,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditResourceType {
    Note,
    Client,
    Export,
    Settings,
    Vault,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditOutcome {
    Success,
    Failure,
    Blocked,
}

// ============================================
// AI / Ollama
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaStatus {
    pub available: bool,
    // NOTE: We do NOT authenticate Ollama. This field exists for API compatibility
    // but is ALWAYS false. Ollama is treated as same-trust-zone.
    pub authenticated: bool,  // Always false - kept for API compatibility
    pub models: Vec<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructuredNote {
    pub subjective: String,
    pub objective: String,
    pub assessment: String,
    pub plan: String,
}

// ============================================
// Search
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub note_id: String,
    pub client_id: String,
    pub session_date: String,
    pub excerpt: String,
    pub score: f32,
}

// ============================================
// Export
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportOptions {
    pub format: ExportFormat,
    pub include_provenance: bool,
    pub include_attestations: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExportFormat {
    Text,
    Markdown,
    Json,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PathClassification {
    Safe,
    CloudSync,
    NetworkShare,
    RemovableMedia,
    Unknown,
}

// ============================================
// Vault Status
// ============================================

/// Vault state type - single source of truth for UI routing
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum VaultStateType {
    NoVault,           // Fresh install, no DB or keychain
    Ready,             // DB + keychain present, locked
    Unlocked,          // Currently unlocked and usable
    KeychainLost,      // DB exists but keychain entry missing - recovery needed
    StaleKeychain,     // Keychain exists but DB missing - cleanup needed
    Corrupt,           // DB exists but cannot be opened - severe error
}

/// Full vault status for UI routing - uses state as primary routing key
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultStatus {
    /// Primary routing key - UI MUST route on this, not exists/unlocked
    pub state: VaultStateType,
    /// Whether the vault database file exists
    pub db_exists: bool,
    /// Whether the keychain entry exists
    pub keychain_exists: bool,
    /// Human-readable message (PHI-free)
    pub message: String,
    /// Client count (only when unlocked)
    pub client_count: Option<i32>,
    /// Note count (only when unlocked)
    pub note_count: Option<i32>,
    
    // Legacy fields for backwards compatibility - DEPRECATED
    #[serde(default)]
    pub exists: bool,
    #[serde(default)]
    pub unlocked: bool,
}

// ============================================
// Pre-Session Prep Sheet
// ============================================

/// Pre-session preparation sheet for clinician
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrepSheet {
    pub client_id: String,
    pub client_name: String,
    pub generated_at: String,
    
    /// Client demographics
    pub demographics: PrepDemographics,
    
    /// Recent session summary
    pub recent_sessions: Vec<RecentSessionSummary>,
    
    /// Active themes/patterns
    pub active_themes: Vec<PrepTheme>,
    
    /// Safety alerts from recent notes
    pub safety_alerts: Vec<SafetyAlert>,
    
    /// Suggested assessment tools
    pub suggested_assessments: Vec<AssessmentSuggestion>,
    
    /// AI-generated session focus suggestions
    pub focus_suggestions: Vec<String>,
    
    /// Last assessment scores (if any)
    pub last_assessments: Vec<AssessmentResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrepDemographics {
    pub age: Option<i32>,
    pub treatment_duration_days: Option<i32>,
    pub total_sessions: i32,
    pub last_session_date: Option<String>,
    pub days_since_last_session: Option<i32>,
    pub diagnosis_codes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentSessionSummary {
    pub session_date: String,
    pub note_type: String,
    pub key_points: Vec<String>,
    pub mood_indicators: Vec<String>,
    pub interventions_used: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrepTheme {
    pub theme: String,
    pub trend: String,
    pub last_mentioned: String,
    pub clinical_note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafetyAlert {
    pub alert_type: String,  // "suicidal_ideation", "self_harm", "abuse", etc.
    pub last_flagged: String,
    pub severity: String,    // "low", "moderate", "high"
    pub details: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentSuggestion {
    pub assessment_name: String,  // "PHQ-9", "GAD-7", "BDI-II", etc.
    pub reason: String,
    pub last_administered: Option<String>,
    pub last_score: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentResult {
    pub assessment_name: String,
    pub score: i32,
    pub date_administered: String,
    pub interpretation: String,
}

// ============================================
// Note Completion Check
// ============================================

/// Result of AI completion check before signing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionCheckResult {
    pub is_complete: bool,
    pub overall_score: f32,  // 0.0 to 1.0
    pub missing_fields: Vec<MissingField>,
    pub vague_sections: Vec<VagueSection>,
    pub compliance_issues: Vec<ComplianceIssue>,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MissingField {
    pub field_name: String,
    pub importance: String,  // "required", "recommended", "optional"
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VagueSection {
    pub section: String,
    pub problematic_text: String,
    pub suggestion: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceIssue {
    pub issue_type: String,
    pub description: String,
    pub severity: String,  // "warning", "error"
}

// ============================================
// Supervisor Mode
// ============================================

/// Supervisor review of a trainee note
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupervisorReview {
    pub id: String,
    pub note_id: String,
    pub supervisor_id: String,
    pub supervisor_name: String,
    pub review_date: String,
    pub status: String,  // "pending", "approved", "needs_revision", "rejected"
    pub comments: Vec<ReviewComment>,
    pub overall_feedback: Option<String>,
    pub clinical_accuracy_score: Option<i32>,  // 1-5
    pub documentation_quality_score: Option<i32>,  // 1-5
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewComment {
    pub id: String,
    pub section: Option<String>,  // Which part of note this applies to
    pub comment_type: String,  // "correction", "suggestion", "praise", "question"
    pub text: String,
    pub created_at: i64,
}

/// Trainee under supervision
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trainee {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub supervisor_id: String,
    pub start_date: String,
    pub status: String,  // "active", "completed", "inactive"
    pub notes_submitted: i32,
    pub notes_approved: i32,
    pub created_at: i64,
}

/// Supervisor dashboard data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupervisorDashboard {
    pub supervisor_id: String,
    pub trainees: Vec<TraineeSummary>,
    pub pending_reviews: Vec<PendingReview>,
    pub recent_activity: Vec<SupervisorActivity>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraineeSummary {
    pub trainee: Trainee,
    pub pending_notes: i32,
    pub avg_quality_score: Option<f32>,
    pub last_submission: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingReview {
    pub note_id: String,
    pub trainee_name: String,
    pub client_name: String,
    pub session_date: String,
    pub submitted_at: String,
    pub days_pending: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupervisorActivity {
    pub activity_type: String,
    pub description: String,
    pub timestamp: i64,
}
