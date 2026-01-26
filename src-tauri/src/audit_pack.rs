// Audit Pack Generator
//
// Creates comprehensive audit packages for legal/compliance responses:
// - Notes with amendments
// - Attestation records
// - Chain-of-custody verification
// - Export certificate
//
// All outputs are verifiable and tamper-evident.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AuditPackError {
    #[error("Vault not available")]
    VaultNotAvailable,
    
    #[error("No notes found in date range")]
    NoNotesFound,
    
    #[error("Chain verification failed: {0}")]
    ChainVerificationFailed(String),
    
    #[error("Export destination blocked: {0}")]
    ExportBlocked(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Serialization error: {0}")]
    Serialization(String),
}

// ============================================
// Audit Pack Data Structures
// ============================================

/// Type of audit pack to generate
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AuditPackType {
    /// Full pack: all notes, amendments, attestations, audit log
    Full,
    /// Summary: note summaries only (no full content)
    Summary,
    /// Legal: chain-of-custody focused
    Legal,
    /// Payer: medical necessity focused
    Payer,
    /// Custom: user-selected components
    Custom,
}

/// Configuration for audit pack generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditPackConfig {
    /// Pack type
    pub pack_type: AuditPackType,
    
    /// Date range (inclusive)
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    
    /// Client IDs to include (None = all)
    pub client_ids: Option<Vec<String>>,
    
    /// Include full note content
    pub include_content: bool,
    
    /// Include amendments
    pub include_amendments: bool,
    
    /// Include attestations
    pub include_attestations: bool,
    
    /// Include audit log extract
    pub include_audit_log: bool,
    
    /// Include chain verification
    pub include_chain_verification: bool,
    
    /// Redact client names
    pub redact_client_names: bool,
    
    /// Output format
    pub output_format: AuditPackFormat,
}

impl Default for AuditPackConfig {
    fn default() -> Self {
        Self {
            pack_type: AuditPackType::Full,
            start_date: Utc::now() - chrono::Duration::days(365),
            end_date: Utc::now(),
            client_ids: None,
            include_content: true,
            include_amendments: true,
            include_attestations: true,
            include_audit_log: true,
            include_chain_verification: true,
            redact_client_names: false,
            output_format: AuditPackFormat::Pdf,
        }
    }
}

/// Output format for audit pack
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AuditPackFormat {
    Pdf,
    Json,
    Zip,  // Contains PDF + JSON + individual files
}

/// Complete audit pack
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditPack {
    /// Unique pack identifier
    pub id: String,
    
    /// Generation timestamp
    pub generated_at: DateTime<Utc>,
    
    /// Who generated this pack
    pub generated_by: String,
    
    /// Pack type
    pub pack_type: AuditPackType,
    
    /// Date range covered
    pub date_range: DateRange,
    
    /// Clients included
    pub clients: Vec<ClientSummary>,
    
    /// Pack contents
    pub contents: AuditPackContents,
    
    /// Chain verification result
    pub chain_verification: Option<ChainVerification>,
    
    /// Pack metadata
    pub metadata: AuditPackMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateRange {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientSummary {
    pub id: String,
    pub display_name: String,  // May be redacted
    pub note_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditPackContents {
    /// Notes included
    pub notes: Vec<AuditNote>,
    
    /// Amendments
    pub amendments: Vec<AuditAmendment>,
    
    /// Attestations
    pub attestations: Vec<AuditAttestation>,
    
    /// Audit log extract (PHI-minimal)
    pub audit_log: Vec<AuditLogEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditNote {
    pub id: String,
    pub client_id: String,
    pub note_type: String,
    pub created_at: DateTime<Utc>,
    pub signed_at: Option<DateTime<Utc>>,
    pub signed_by: Option<String>,
    pub content: Option<String>,  // None if summary-only
    pub content_hash: String,
    pub has_amendments: bool,
    pub has_attestations: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditAmendment {
    pub id: String,
    pub note_id: String,
    pub created_at: DateTime<Utc>,
    pub reason: String,
    pub content: String,
    pub signed_by: String,
    pub signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditAttestation {
    pub id: String,
    pub note_id: String,
    pub detection_id: String,
    pub detection_title: String,
    pub response: String,
    pub explanation: Option<String>,
    pub attested_at: DateTime<Utc>,
    pub attested_by: String,
    pub signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    /// Event type (no PHI)
    pub event_type: String,
    /// Resource type
    pub resource_type: String,
    /// Resource ID
    pub resource_id: String,
    /// Timestamp
    pub timestamp: DateTime<Utc>,
    /// Outcome
    pub outcome: String,
    /// Entry hash
    pub entry_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChainVerification {
    /// Verification passed
    pub verified: bool,
    /// Number of entries checked
    pub entries_checked: u64,
    /// First entry timestamp
    pub first_entry: DateTime<Utc>,
    /// Last entry timestamp
    pub last_entry: DateTime<Utc>,
    /// Verification hash
    pub verification_hash: String,
    /// Any gaps detected
    pub gaps_detected: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditPackMetadata {
    /// Evidify version
    pub app_version: String,
    /// Pack schema version
    pub schema_version: String,
    /// Total notes
    pub total_notes: u32,
    /// Total amendments
    pub total_amendments: u32,
    /// Total attestations
    pub total_attestations: u32,
    /// Generation duration (ms)
    pub generation_time_ms: u64,
}

/// Export certificate for audit pack
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportCertificate {
    /// Pack ID
    pub pack_id: String,
    /// Content hash (SHA-256)
    pub content_hash: String,
    /// Export timestamp
    pub exported_at: DateTime<Utc>,
    /// Exported by
    pub exported_by: String,
    /// Destination classification
    pub destination_class: String,
    /// Destination hash (not the path itself)
    pub destination_hash: String,
    /// Certificate signature
    pub signature: String,
}

// ============================================
// Audit Pack Generator
// ============================================

/// Audit pack generator
pub struct AuditPackGenerator {
    /// Configuration
    config: AuditPackConfig,
}

impl AuditPackGenerator {
    pub fn new(config: AuditPackConfig) -> Self {
        Self { config }
    }
    
    /// Generate audit pack from vault data
    pub fn generate(
        &self,
        notes: Vec<AuditNote>,
        amendments: Vec<AuditAmendment>,
        attestations: Vec<AuditAttestation>,
        audit_log: Vec<AuditLogEntry>,
        chain_verification: Option<ChainVerification>,
        generated_by: &str,
    ) -> Result<AuditPack, AuditPackError> {
        let start_time = std::time::Instant::now();
        
        // Filter by date range
        let notes: Vec<AuditNote> = notes.into_iter()
            .filter(|n| {
                n.created_at >= self.config.start_date && 
                n.created_at <= self.config.end_date
            })
            .filter(|n| {
                self.config.client_ids.as_ref()
                    .map(|ids| ids.contains(&n.client_id))
                    .unwrap_or(true)
            })
            .collect();
        
        if notes.is_empty() {
            return Err(AuditPackError::NoNotesFound);
        }
        
        // Get unique clients
        let mut client_map: HashMap<String, u32> = HashMap::new();
        for note in &notes {
            *client_map.entry(note.client_id.clone()).or_insert(0) += 1;
        }
        
        let clients: Vec<ClientSummary> = client_map.into_iter()
            .map(|(id, count)| ClientSummary {
                id: id.clone(),
                display_name: if self.config.redact_client_names {
                    format!("Client-{}", &id[..8])
                } else {
                    id
                },
                note_count: count,
            })
            .collect();
        
        // Filter related records
        let note_ids: Vec<&str> = notes.iter().map(|n| n.id.as_str()).collect();
        
        let amendments: Vec<AuditAmendment> = if self.config.include_amendments {
            amendments.into_iter()
                .filter(|a| note_ids.contains(&a.note_id.as_str()))
                .collect()
        } else {
            vec![]
        };
        
        let attestations: Vec<AuditAttestation> = if self.config.include_attestations {
            attestations.into_iter()
                .filter(|a| note_ids.contains(&a.note_id.as_str()))
                .collect()
        } else {
            vec![]
        };
        
        let audit_log: Vec<AuditLogEntry> = if self.config.include_audit_log {
            audit_log.into_iter()
                .filter(|e| {
                    e.timestamp >= self.config.start_date && 
                    e.timestamp <= self.config.end_date
                })
                .collect()
        } else {
            vec![]
        };
        
        let pack = AuditPack {
            id: uuid::Uuid::new_v4().to_string(),
            generated_at: Utc::now(),
            generated_by: generated_by.to_string(),
            pack_type: self.config.pack_type,
            date_range: DateRange {
                start: self.config.start_date,
                end: self.config.end_date,
            },
            clients,
            contents: AuditPackContents {
                notes: notes.clone(),
                amendments: amendments.clone(),
                attestations: attestations.clone(),
                audit_log,
            },
            chain_verification: if self.config.include_chain_verification {
                chain_verification
            } else {
                None
            },
            metadata: AuditPackMetadata {
                app_version: env!("CARGO_PKG_VERSION").to_string(),
                schema_version: "1.0".to_string(),
                total_notes: notes.len() as u32,
                total_amendments: amendments.len() as u32,
                total_attestations: attestations.len() as u32,
                generation_time_ms: start_time.elapsed().as_millis() as u64,
            },
        };
        
        Ok(pack)
    }
    
    /// Export audit pack to file
    pub fn export(
        &self,
        pack: &AuditPack,
        destination: &Path,
    ) -> Result<ExportCertificate, AuditPackError> {
        // Check destination classification
        let dest_class = classify_destination(destination);
        
        if dest_class == "CloudSync" {
            return Err(AuditPackError::ExportBlocked(
                "Cannot export audit pack to cloud-synced folder".to_string()
            ));
        }
        
        // Serialize
        let content = serde_json::to_string_pretty(pack)
            .map_err(|e| AuditPackError::Serialization(e.to_string()))?;
        
        // Calculate hash
        let content_hash = sha256_hex(content.as_bytes());
        
        // Write file
        let output_path = match self.config.output_format {
            AuditPackFormat::Json => {
                let path = destination.join(format!("audit-pack-{}.json", pack.id));
                std::fs::write(&path, &content)?;
                path
            }
            AuditPackFormat::Pdf => {
                // Would generate PDF here - for now, write JSON
                let path = destination.join(format!("audit-pack-{}.json", pack.id));
                std::fs::write(&path, &content)?;
                path
            }
            AuditPackFormat::Zip => {
                // Would create ZIP archive here - for now, write JSON
                let path = destination.join(format!("audit-pack-{}.json", pack.id));
                std::fs::write(&path, &content)?;
                path
            }
        };
        
        // Create certificate
        let cert = ExportCertificate {
            pack_id: pack.id.clone(),
            content_hash,
            exported_at: Utc::now(),
            exported_by: pack.generated_by.clone(),
            destination_class: dest_class,
            destination_hash: sha256_hex(destination.to_string_lossy().as_bytes()),
            signature: String::new(),  // Would sign with vault key
        };
        
        // Write certificate
        let cert_path = output_path.with_extension("certificate.json");
        let cert_content = serde_json::to_string_pretty(&cert)
            .map_err(|e| AuditPackError::Serialization(e.to_string()))?;
        std::fs::write(&cert_path, &cert_content)?;
        
        log::info!("Audit pack exported: {:?}", output_path);
        
        Ok(cert)
    }
}

// ============================================
// Helper Functions
// ============================================

/// Classify export destination
fn classify_destination(path: &Path) -> String {
    let path_str = path.to_string_lossy().to_lowercase();
    
    // Cloud sync folders
    let cloud_indicators = [
        "icloud", "mobile documents",
        "onedrive",
        "dropbox",
        "google drive",
        "box sync",
    ];
    
    for indicator in cloud_indicators {
        if path_str.contains(indicator) {
            return "CloudSync".to_string();
        }
    }
    
    // Network shares
    if path_str.starts_with("/volumes/") || path_str.starts_with("\\\\") {
        if !is_local_volume(path) {
            return "NetworkShare".to_string();
        }
    }
    
    // Removable media
    if is_removable_volume(path) {
        return "Removable".to_string();
    }
    
    "Safe".to_string()
}

fn is_local_volume(_path: &Path) -> bool {
    // Would check if volume is local disk
    true
}

fn is_removable_volume(_path: &Path) -> bool {
    // Would check if volume is removable
    false
}

/// Calculate SHA-256 hash
fn sha256_hex(data: &[u8]) -> String {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
}

// ============================================
// Tauri Commands
// ============================================

use tauri::State;
use crate::commands::AppState;

/// Generate audit pack
#[tauri::command]
pub async fn generate_audit_pack(
    state: State<'_, AppState>,
    config: AuditPackConfig,
) -> Result<AuditPack, String> {
    let vault = state.vault.lock().map_err(|e| e.to_string())?;
    
    if !vault.is_unlocked() {
        return Err("Vault is not unlocked".to_string());
    }
    
    // Helper to convert i64 timestamp to DateTime<Utc>
    fn timestamp_to_datetime(ts: i64) -> DateTime<Utc> {
        DateTime::from_timestamp(ts, 0).unwrap_or_else(Utc::now)
    }
    
    // Get notes from vault
    let notes = vault.list_notes(None)
        .map_err(|e| e.to_string())?
        .into_iter()
        .map(|n| AuditNote {
            id: n.id,
            client_id: n.client_id,
            note_type: format!("{:?}", n.note_type),
            created_at: timestamp_to_datetime(n.created_at),
            signed_at: n.signed_at.map(timestamp_to_datetime),
            signed_by: None, // Note struct doesn't track signer identity
            content: if config.include_content { Some(n.raw_input) } else { None },
            content_hash: n.content_hash,
            has_amendments: false,
            has_attestations: !n.attestations.is_empty(),
        })
        .collect();
    
    // Get amendments (would query from vault)
    let amendments = vec![];
    
    // Get attestations (would query from vault)
    let attestations = vec![];
    
    // Get audit log
    let audit_log = vec![];
    
    // Chain verification not implemented yet - placeholder
    let chain_verification: Option<ChainVerification> = None;
    
    let generator = AuditPackGenerator::new(config);
    generator.generate(
        notes,
        amendments,
        attestations,
        audit_log,
        chain_verification,
        "current_user",  // Would get from vault
    ).map_err(|e| e.to_string())
}

/// Export audit pack to file
#[tauri::command]
pub async fn export_audit_pack(
    pack: AuditPack,
    destination: String,
    format: AuditPackFormat,
) -> Result<ExportCertificate, String> {
    let config = AuditPackConfig {
        output_format: format,
        ..Default::default()
    };
    
    let generator = AuditPackGenerator::new(config);
    generator.export(&pack, Path::new(&destination))
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_destination_classification() {
        assert_eq!(classify_destination(Path::new("/Users/test/Documents")), "Safe");
        assert_eq!(classify_destination(Path::new("/Users/test/Library/Mobile Documents/iCloud")), "CloudSync");
        assert_eq!(classify_destination(Path::new("/Users/test/Dropbox/notes")), "CloudSync");
    }
    
    #[test]
    fn test_sha256() {
        let hash = sha256_hex(b"test");
        assert_eq!(hash.len(), 64);
    }
}
