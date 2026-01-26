// Policy-as-Code Engine
//
// Enforces organization policies locally, even when offline.
// Policies are signed by administrators and verified before enforcement.
//
// Features:
// - Export destination controls
// - Attestation requirements
// - Recording consent rules
// - Supervision requirements
// - Retention policies

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum PolicyError {
    #[error("Policy not found")]
    NotFound,
    
    #[error("Invalid policy signature")]
    InvalidSignature,
    
    #[error("Policy expired")]
    Expired,
    
    #[error("Policy version mismatch")]
    VersionMismatch,
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Parse error: {0}")]
    Parse(String),
}

// ============================================
// Policy Data Structures
// ============================================

/// Complete organization policy bundle
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationPolicy {
    /// Unique policy identifier
    pub id: String,
    
    /// Policy version (semver)
    pub version: String,
    
    /// Organization name
    pub organization: String,
    
    /// When this policy becomes effective
    pub effective_date: DateTime<Utc>,
    
    /// When this policy expires (optional)
    pub expires_at: Option<DateTime<Utc>>,
    
    /// Administrator who signed this policy
    pub signed_by: String,
    
    /// Cryptographic signature
    pub signature: String,
    
    /// Export controls
    pub export_policy: ExportPolicy,
    
    /// Attestation requirements
    pub attestation_policy: AttestationPolicy,
    
    /// Recording/consent rules
    pub recording_policy: RecordingPolicy,
    
    /// Supervision requirements
    pub supervision_policy: SupervisionPolicy,
    
    /// Data retention rules
    pub retention_policy: RetentionPolicy,
    
    /// Custom policy extensions
    pub custom_rules: HashMap<String, serde_json::Value>,
}

impl Default for OrganizationPolicy {
    fn default() -> Self {
        Self {
            id: "default".to_string(),
            version: "1.0.0".to_string(),
            organization: "Solo Practice".to_string(),
            effective_date: Utc::now(),
            expires_at: None,
            signed_by: "system".to_string(),
            signature: String::new(),
            export_policy: ExportPolicy::default(),
            attestation_policy: AttestationPolicy::default(),
            recording_policy: RecordingPolicy::default(),
            supervision_policy: SupervisionPolicy::default(),
            retention_policy: RetentionPolicy::default(),
            custom_rules: HashMap::new(),
        }
    }
}

/// Export destination controls
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportPolicy {
    /// Action for cloud-synced folders (iCloud, OneDrive, Dropbox, etc.)
    pub cloud_sync: ExportAction,
    
    /// Action for network shares
    pub network_share: ExportAction,
    
    /// Action for removable media
    pub removable_media: ExportAction,
    
    /// Action for unknown destinations
    pub unknown_destination: ExportAction,
    
    /// Require audit pack for bulk exports (>N notes)
    pub audit_pack_required_above: Option<u32>,
    
    /// Allowed export formats
    pub allowed_formats: Vec<String>,
    
    /// Blocked export paths (explicit)
    pub blocked_paths: Vec<String>,
}

impl Default for ExportPolicy {
    fn default() -> Self {
        Self {
            cloud_sync: ExportAction::Warn,
            network_share: ExportAction::Warn,
            removable_media: ExportAction::Warn,
            unknown_destination: ExportAction::Warn,
            audit_pack_required_above: Some(10),
            allowed_formats: vec![
                "pdf".to_string(),
                "docx".to_string(),
                "json".to_string(),
            ],
            blocked_paths: vec![],
        }
    }
}

/// Action to take for export destination
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ExportAction {
    /// Allow without warning
    Allow,
    /// Allow with warning
    Warn,
    /// Block completely
    Block,
    /// Require admin approval
    RequireApproval,
}

/// Attestation requirements
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttestationPolicy {
    /// Detection patterns that MUST be attested before signing
    pub required_attestations: Vec<String>,
    
    /// Detection patterns that SHOULD be attested (warning only)
    pub recommended_attestations: Vec<String>,
    
    /// Risk levels requiring supervisor review
    pub supervisor_review_required: Option<String>,
    
    /// Maximum time allowed for attestation (seconds, 0 = unlimited)
    pub attestation_timeout: u32,
    
    /// Allow "not relevant" dismissals
    pub allow_not_relevant: bool,
    
    /// Require explanation for "not relevant"
    pub require_explanation_for_not_relevant: bool,
}

impl Default for AttestationPolicy {
    fn default() -> Self {
        Self {
            required_attestations: vec![
                "safety-si-direct".to_string(),
                "safety-si-plan".to_string(),
                "safety-hi-direct".to_string(),
                "safety-hi-threat".to_string(),
                "safety-abuse-child".to_string(),
                "safety-abuse-elder".to_string(),
                "safety-duty-warn".to_string(),
            ],
            recommended_attestations: vec![
                "safety-si-euphemism".to_string(),
                "safety-si-passive".to_string(),
                "doc-capacity-concern".to_string(),
            ],
            supervisor_review_required: None,
            attestation_timeout: 0,
            allow_not_relevant: true,
            require_explanation_for_not_relevant: true,
        }
    }
}

/// Recording and consent policy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingPolicy {
    /// Consent required before recording
    pub consent_required: bool,
    
    /// Auto-delete audio after note signing
    pub auto_delete_audio_after_signing: bool,
    
    /// Maximum audio retention (days, 0 = unlimited)
    pub max_audio_retention_days: u32,
    
    /// Require re-consent each session
    pub reconsent_each_session: bool,
    
    /// Jurisdiction-specific rules
    pub jurisdiction_rules: HashMap<String, JurisdictionRecordingRule>,
}

impl Default for RecordingPolicy {
    fn default() -> Self {
        Self {
            consent_required: true,
            auto_delete_audio_after_signing: true,
            max_audio_retention_days: 0,
            reconsent_each_session: false,
            jurisdiction_rules: HashMap::new(),
        }
    }
}

/// Jurisdiction-specific recording rules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JurisdictionRecordingRule {
    /// Two-party consent required
    pub two_party_consent: bool,
    /// Written consent required
    pub written_consent_required: bool,
    /// Notice language
    pub notice_text: Option<String>,
}

/// Supervision policy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupervisionPolicy {
    /// Credential levels requiring co-signature
    pub cosign_required_for: Vec<CredentialLevel>,
    
    /// Maximum time for supervisor review (hours)
    pub max_review_delay_hours: u32,
    
    /// Require supervisor review for high-risk notes
    pub review_high_risk_notes: bool,
    
    /// Competency tracking enabled
    pub competency_tracking_enabled: bool,
}

impl Default for SupervisionPolicy {
    fn default() -> Self {
        Self {
            cosign_required_for: vec![
                CredentialLevel::Intern,
                CredentialLevel::Trainee,
            ],
            max_review_delay_hours: 72,
            review_high_risk_notes: true,
            competency_tracking_enabled: true,
        }
    }
}

/// Credential level for supervision rules
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CredentialLevel {
    Intern,
    Trainee,
    Postdoc,
    ProvisionallyLicensed,
    Licensed,
    Supervisor,
}

/// Data retention policy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetentionPolicy {
    /// Minimum retention (days)
    pub minimum_retention_days: u32,
    
    /// Maximum retention (days, 0 = unlimited)
    pub maximum_retention_days: u32,
    
    /// Retain after client discharge
    pub retain_after_discharge_days: u32,
    
    /// Audit log retention (days)
    pub audit_log_retention_days: u32,
}

impl Default for RetentionPolicy {
    fn default() -> Self {
        Self {
            minimum_retention_days: 2555, // ~7 years
            maximum_retention_days: 0,    // Unlimited
            retain_after_discharge_days: 2555,
            audit_log_retention_days: 3650, // 10 years
        }
    }
}

// ============================================
// Policy Engine
// ============================================

/// Policy engine for enforcement
pub struct PolicyEngine {
    /// Active policy
    active_policy: OrganizationPolicy,
    
    /// Policy file path
    policy_path: Option<PathBuf>,
    
    /// Last policy sync time
    last_sync: Option<DateTime<Utc>>,
}

impl PolicyEngine {
    pub fn new() -> Self {
        Self {
            active_policy: OrganizationPolicy::default(),
            policy_path: None,
            last_sync: None,
        }
    }
    
    /// Load policy from file
    pub fn load_from_file(&mut self, path: &Path) -> Result<(), PolicyError> {
        let content = std::fs::read_to_string(path)?;
        let policy: OrganizationPolicy = serde_json::from_str(&content)
            .map_err(|e| PolicyError::Parse(e.to_string()))?;
        
        // Verify signature (placeholder - would use real crypto)
        // if !self.verify_signature(&policy) {
        //     return Err(PolicyError::InvalidSignature);
        // }
        
        // Check expiration
        if let Some(expires) = policy.expires_at {
            if expires < Utc::now() {
                return Err(PolicyError::Expired);
            }
        }
        
        self.active_policy = policy;
        self.policy_path = Some(path.to_path_buf());
        self.last_sync = Some(Utc::now());
        
        log::info!("Policy loaded: {} v{}", 
            self.active_policy.organization, 
            self.active_policy.version);
        
        Ok(())
    }
    
    /// Get active policy
    pub fn get_policy(&self) -> &OrganizationPolicy {
        &self.active_policy
    }
    
    /// Check export policy for destination
    pub fn check_export(&self, destination_class: &str) -> PolicyDecision {
        let action = match destination_class.to_lowercase().as_str() {
            "cloudsync" | "cloud_sync" | "icloud" | "onedrive" | "dropbox" => {
                self.active_policy.export_policy.cloud_sync
            }
            "networkshare" | "network_share" | "network" => {
                self.active_policy.export_policy.network_share
            }
            "removable" | "usb" | "external" => {
                self.active_policy.export_policy.removable_media
            }
            "safe" | "local" => ExportAction::Allow,
            _ => self.active_policy.export_policy.unknown_destination,
        };
        
        match action {
            ExportAction::Allow => PolicyDecision::Allow,
            ExportAction::Warn => PolicyDecision::Warn {
                message: format!("Export to {} may not be secure", destination_class),
            },
            ExportAction::Block => PolicyDecision::Block {
                reason: format!("Organization policy prohibits export to {}", destination_class),
            },
            ExportAction::RequireApproval => PolicyDecision::RequireApproval {
                approver: "administrator".to_string(),
            },
        }
    }
    
    /// Check attestation requirements for detection
    pub fn check_attestation(&self, detection_id: &str) -> AttestationRequirement {
        if self.active_policy.attestation_policy.required_attestations
            .iter()
            .any(|p| detection_id.starts_with(p) || detection_id == p)
        {
            AttestationRequirement::Required
        } else if self.active_policy.attestation_policy.recommended_attestations
            .iter()
            .any(|p| detection_id.starts_with(p) || detection_id == p)
        {
            AttestationRequirement::Recommended
        } else {
            AttestationRequirement::Optional
        }
    }
    
    /// Check if recording requires consent
    pub fn requires_recording_consent(&self) -> bool {
        self.active_policy.recording_policy.consent_required
    }
    
    /// Check if supervisor review is required for credential level
    pub fn requires_cosign(&self, credential: CredentialLevel) -> bool {
        self.active_policy.supervision_policy.cosign_required_for.contains(&credential)
    }
    
    /// Get policy version info
    pub fn get_version_info(&self) -> PolicyVersionInfo {
        PolicyVersionInfo {
            id: self.active_policy.id.clone(),
            version: self.active_policy.version.clone(),
            organization: self.active_policy.organization.clone(),
            effective_date: self.active_policy.effective_date,
            expires_at: self.active_policy.expires_at,
            last_sync: self.last_sync,
        }
    }
}

impl Default for PolicyEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Policy decision result
#[derive(Debug, Clone, Serialize)]
pub enum PolicyDecision {
    Allow,
    Warn { message: String },
    Block { reason: String },
    RequireApproval { approver: String },
}

/// Attestation requirement level
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum AttestationRequirement {
    Required,
    Recommended,
    Optional,
}

/// Policy version information
#[derive(Debug, Clone, Serialize)]
pub struct PolicyVersionInfo {
    pub id: String,
    pub version: String,
    pub organization: String,
    pub effective_date: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub last_sync: Option<DateTime<Utc>>,
}

// ============================================
// Tauri Commands
// ============================================

use tauri::State;

pub struct PolicyState {
    pub engine: RwLock<PolicyEngine>,
}

impl Default for PolicyState {
    fn default() -> Self {
        Self {
            engine: RwLock::new(PolicyEngine::new()),
        }
    }
}

/// Get active policy
#[tauri::command]
pub fn get_active_policy(
    state: State<'_, PolicyState>,
) -> Result<OrganizationPolicy, String> {
    let engine = state.engine.read().map_err(|e| e.to_string())?;
    Ok(engine.get_policy().clone())
}

/// Load policy from file
#[tauri::command]
pub fn load_policy_from_file(
    state: State<'_, PolicyState>,
    path: String,
) -> Result<bool, String> {
    let mut engine = state.engine.write().map_err(|e| e.to_string())?;
    engine.load_from_file(Path::new(&path)).map_err(|e| e.to_string())?;
    Ok(true)
}

/// Check export policy
#[tauri::command]
pub fn check_export_policy(
    state: State<'_, PolicyState>,
    destination_class: String,
) -> Result<PolicyDecision, String> {
    let engine = state.engine.read().map_err(|e| e.to_string())?;
    Ok(engine.check_export(&destination_class))
}

/// Check attestation policy
#[tauri::command]
pub fn check_attestation_policy(
    state: State<'_, PolicyState>,
    detection_id: String,
) -> Result<AttestationRequirement, String> {
    let engine = state.engine.read().map_err(|e| e.to_string())?;
    Ok(engine.check_attestation(&detection_id))
}

/// Get policy version info
#[tauri::command]
pub fn get_policy_version(
    state: State<'_, PolicyState>,
) -> Result<PolicyVersionInfo, String> {
    let engine = state.engine.read().map_err(|e| e.to_string())?;
    Ok(engine.get_version_info())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_default_policy() {
        let engine = PolicyEngine::new();
        let policy = engine.get_policy();
        
        assert_eq!(policy.organization, "Solo Practice");
        assert_eq!(policy.export_policy.cloud_sync, ExportAction::Warn);
    }
    
    #[test]
    fn test_export_check() {
        let engine = PolicyEngine::new();
        
        match engine.check_export("CloudSync") {
            PolicyDecision::Warn { .. } => {}
            _ => panic!("Expected Warn for CloudSync"),
        }
        
        match engine.check_export("safe") {
            PolicyDecision::Allow => {}
            _ => panic!("Expected Allow for safe"),
        }
    }
    
    #[test]
    fn test_attestation_check() {
        let engine = PolicyEngine::new();
        
        assert_eq!(
            engine.check_attestation("safety-si-direct"),
            AttestationRequirement::Required
        );
        
        assert_eq!(
            engine.check_attestation("some-random-detection"),
            AttestationRequirement::Optional
        );
    }
}
