// Audit Log Module v4
// 
// PHI-impossible audit logging:
// - Typed events only (no arbitrary data)
// - Detection IDs only (no evidence text)
// - Path hashes only (no full file paths - PHI risk)
// - Hash-chained for integrity verification

use rusqlite::{Connection, params};
use crate::crypto;
use crate::models::{AuditEntry, AuditEventType, AuditResourceType, AuditOutcome};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AuditError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    
    #[error("Chain integrity failure at entry {index}")]
    ChainBroken { index: usize },
    
    #[error("Hash mismatch at entry {index}")]
    HashMismatch { index: usize },
}

/// Log an audit event (no export path info)
pub fn log_event(
    conn: &Connection,
    event_type: AuditEventType,
    resource_type: AuditResourceType,
    resource_id: &str,
    outcome: AuditOutcome,
    detection_ids: Option<&[String]>,
) -> Result<AuditEntry, AuditError> {
    log_event_with_path(conn, event_type, resource_type, resource_id, outcome, detection_ids, None, None)
}

/// Log an export event with path classification and hash
/// 
/// SECURITY: We NEVER log the full path (PHI risk: "/Patients/Jane_Doe/...")
/// Instead we log:
/// - path_class: safe/cloud_sync/network_share/removable/unknown
/// - path_hash: SHA-256(salt || canonical_path) - not reversible without vault salt
pub fn log_export_event(
    conn: &Connection,
    resource_id: &str,
    outcome: AuditOutcome,
    path_class: &str,
    path_hash: &str,
) -> Result<AuditEntry, AuditError> {
    log_event_with_path(
        conn,
        AuditEventType::ExportCreated,
        AuditResourceType::Export,
        resource_id,
        outcome,
        None,
        Some(path_class),
        Some(path_hash),
    )
}

/// Internal: log event with optional path info
fn log_event_with_path(
    conn: &Connection,
    event_type: AuditEventType,
    resource_type: AuditResourceType,
    resource_id: &str,
    outcome: AuditOutcome,
    detection_ids: Option<&[String]>,
    path_class: Option<&str>,
    path_hash: Option<&str>,
) -> Result<AuditEntry, AuditError> {
    let id = uuid::Uuid::new_v4().to_string();
    let timestamp = chrono::Utc::now().timestamp_millis();
    
    let (previous_hash, sequence) = get_last_entry_info(conn)?;
    
    // Build entry data for hashing (no PHI - only IDs, enums, hashes)
    let entry_data = format!(
        "{}|{}|{}|{:?}|{:?}|{}|{:?}|{}|{}",
        id, timestamp, sequence, event_type, resource_type, resource_id, outcome,
        path_class.unwrap_or(""),
        path_hash.unwrap_or("")
    );
    
    let entry_hash = crypto::hash_chain_entry(&previous_hash, entry_data.as_bytes());
    
    let detection_ids_json = detection_ids.map(|ids| {
        serde_json::to_string(ids).unwrap_or_default()
    });
    
    conn.execute(
        "INSERT INTO audit_log (id, timestamp, sequence, event_type, resource_type, resource_id, 
         outcome, detection_ids, path_class, path_hash, previous_hash, entry_hash) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            &id,
            timestamp,
            sequence,
            format!("{:?}", event_type).to_lowercase(),
            format!("{:?}", resource_type).to_lowercase(),
            resource_id,
            format!("{:?}", outcome).to_lowercase(),
            detection_ids_json,
            path_class,
            path_hash,
            &previous_hash,
            &entry_hash
        ],
    )?;
    
    Ok(AuditEntry {
        id,
        timestamp,
        sequence,
        event_type,
        resource_type,
        resource_id: resource_id.to_string(),
        outcome,
        detection_ids: detection_ids.map(|ids| ids.to_vec()),
        path_class: path_class.map(|s| s.to_string()),
        path_hash: path_hash.map(|s| s.to_string()),
        previous_hash,
        entry_hash,
    })
}

fn get_last_entry_info(conn: &Connection) -> Result<(String, i64), AuditError> {
    let result = conn.query_row(
        "SELECT entry_hash, sequence FROM audit_log ORDER BY sequence DESC LIMIT 1",
        [],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?)),
    );
    
    match result {
        Ok((hash, seq)) => Ok((hash, seq + 1)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(("genesis".to_string(), 1)),
        Err(e) => Err(AuditError::Database(e)),
    }
}

/// Get audit log entries
pub fn get_entries(
    conn: &Connection,
    limit: i64,
    offset: i64,
) -> Result<Vec<AuditEntry>, AuditError> {
    let mut stmt = conn.prepare(
        "SELECT id, timestamp, sequence, event_type, resource_type, resource_id, 
         outcome, detection_ids, path_class, path_hash, previous_hash, entry_hash 
         FROM audit_log ORDER BY sequence DESC LIMIT ?1 OFFSET ?2"
    )?;
    
    let rows = stmt.query_map(params![limit, offset], |row| {
        let detection_ids_json: Option<String> = row.get(7)?;
        
        Ok(AuditEntry {
            id: row.get(0)?,
            timestamp: row.get(1)?,
            sequence: row.get(2)?,
            event_type: parse_event_type(&row.get::<_, String>(3)?),
            resource_type: parse_resource_type(&row.get::<_, String>(4)?),
            resource_id: row.get(5)?,
            outcome: parse_outcome(&row.get::<_, String>(6)?),
            detection_ids: detection_ids_json
                .map(|j| serde_json::from_str(&j).unwrap_or_default()),
            path_class: row.get(8)?,
            path_hash: row.get(9)?,
            previous_hash: row.get(10)?,
            entry_hash: row.get(11)?,
        })
    })?;
    
    rows.collect::<Result<Vec<_>, _>>().map_err(AuditError::from)
}

/// Verify audit chain integrity
pub fn verify_chain(conn: &Connection) -> Result<bool, AuditError> {
    let mut stmt = conn.prepare(
        "SELECT id, timestamp, sequence, event_type, resource_type, resource_id, 
         outcome, detection_ids, path_class, path_hash, previous_hash, entry_hash 
         FROM audit_log ORDER BY sequence ASC"
    )?;
    
    let rows = stmt.query_map([], |row| {
        Ok(AuditEntry {
            id: row.get(0)?,
            timestamp: row.get(1)?,
            sequence: row.get(2)?,
            event_type: parse_event_type(&row.get::<_, String>(3)?),
            resource_type: parse_resource_type(&row.get::<_, String>(4)?),
            resource_id: row.get(5)?,
            outcome: parse_outcome(&row.get::<_, String>(6)?),
            detection_ids: row.get::<_, Option<String>>(7)?
                .map(|j| serde_json::from_str(&j).unwrap_or_default()),
            path_class: row.get(8)?,
            path_hash: row.get(9)?,
            previous_hash: row.get(10)?,
            entry_hash: row.get(11)?,
        })
    })?;
    
    let entries: Vec<AuditEntry> = rows.collect::<Result<Vec<_>, _>>()?;
    
    if entries.is_empty() {
        return Ok(true);
    }
    
    // Verify first entry
    if entries[0].previous_hash != "genesis" {
        return Err(AuditError::ChainBroken { index: 0 });
    }
    
    // Verify chain
    for (i, entry) in entries.iter().enumerate() {
        let entry_data = format!(
            "{}|{}|{}|{:?}|{:?}|{}|{:?}|{}|{}",
            entry.id, entry.timestamp, entry.sequence,
            entry.event_type, entry.resource_type,
            entry.resource_id, entry.outcome,
            entry.path_class.as_deref().unwrap_or(""),
            entry.path_hash.as_deref().unwrap_or("")
        );
        
        let computed = crypto::hash_chain_entry(&entry.previous_hash, entry_data.as_bytes());
        
        if computed != entry.entry_hash {
            return Err(AuditError::HashMismatch { index: i });
        }
        
        if i > 0 && entry.previous_hash != entries[i - 1].entry_hash {
            return Err(AuditError::ChainBroken { index: i });
        }
    }
    
    Ok(true)
}

fn parse_event_type(s: &str) -> AuditEventType {
    match s {
        "notecreated" => AuditEventType::NoteCreated,
        "noteupdated" => AuditEventType::NoteUpdated,
        "notesigned" => AuditEventType::NoteSigned,
        "noteexported" => AuditEventType::NoteExported,
        "notedeleted" => AuditEventType::NoteDeleted,
        "clientcreated" => AuditEventType::ClientCreated,
        "clientupdated" => AuditEventType::ClientUpdated,
        "aianalysisrun" => AuditEventType::AiAnalysisRun,
        "ethicsdetectiontriggered" => AuditEventType::EthicsDetectionTriggered,
        "ethicsdetectionresolved" => AuditEventType::EthicsDetectionResolved,
        "formulationgenerated" => AuditEventType::FormulationGenerated,
        "searchexecuted" => AuditEventType::SearchExecuted,
        "exportcreated" => AuditEventType::ExportCreated,
        "settingschanged" => AuditEventType::SettingsChanged,
        "vaultunlocked" => AuditEventType::VaultUnlocked,
        "vaultlocked" => AuditEventType::VaultLocked,
        "passphrasechanged" => AuditEventType::PassphraseChanged,
        _ => AuditEventType::NoteCreated,
    }
}

fn parse_resource_type(s: &str) -> AuditResourceType {
    match s {
        "note" => AuditResourceType::Note,
        "client" => AuditResourceType::Client,
        "export" => AuditResourceType::Export,
        "settings" => AuditResourceType::Settings,
        "vault" => AuditResourceType::Vault,
        _ => AuditResourceType::Note,
    }
}

fn parse_outcome(s: &str) -> AuditOutcome {
    match s {
        "success" => AuditOutcome::Success,
        "failure" => AuditOutcome::Failure,
        "blocked" => AuditOutcome::Blocked,
        _ => AuditOutcome::Success,
    }
}
