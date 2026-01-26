// SIEM Log Forwarding Module
//
// Exports audit events to enterprise SIEM systems.
// All events are PHI-impossible by design - only event types and hashed identifiers.
//
// Supported formats:
// - Splunk HEC (HTTP Event Collector)
// - Azure Sentinel
// - Generic JSON/Syslog

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SiemError {
    #[error("SIEM not configured")]
    NotConfigured,
    
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),
    
    #[error("Authentication failed")]
    AuthFailed,
    
    #[error("Rate limited")]
    RateLimited,
    
    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
    
    #[error("Serialization error: {0}")]
    Serialization(String),
    
    #[error("HTTP error: {0}")]
    Http(String),
}

// ============================================
// SIEM Configuration
// ============================================

/// SIEM integration configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SiemConfig {
    /// Enable SIEM forwarding
    pub enabled: bool,
    
    /// SIEM format/provider
    pub format: SiemFormat,
    
    /// Endpoint URL
    pub endpoint: String,
    
    /// Authentication token/key
    pub auth_token: Option<String>,
    
    /// Custom headers
    pub headers: std::collections::HashMap<String, String>,
    
    /// Batch size (events per request)
    pub batch_size: usize,
    
    /// Flush interval (seconds)
    pub flush_interval_seconds: u32,
    
    /// Retry count for failed sends
    pub retry_count: u32,
    
    /// Source identifier
    pub source: String,
    
    /// Source type
    pub source_type: String,
    
    /// Index (for Splunk)
    pub index: Option<String>,
}

impl Default for SiemConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            format: SiemFormat::Generic,
            endpoint: String::new(),
            auth_token: None,
            headers: std::collections::HashMap::new(),
            batch_size: 100,
            flush_interval_seconds: 60,
            retry_count: 3,
            source: "evidify".to_string(),
            source_type: "evidify:audit".to_string(),
            index: None,
        }
    }
}

/// SIEM format/provider
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SiemFormat {
    /// Splunk HTTP Event Collector
    Splunk,
    /// Azure Sentinel
    Sentinel,
    /// Generic JSON POST
    Generic,
    /// Syslog (CEF format)
    Syslog,
}

// ============================================
// PHI-Impossible Event Schema
// ============================================

/// SIEM event (PHI-impossible by design)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SiemEvent {
    /// Event timestamp
    pub timestamp: DateTime<Utc>,
    
    /// Event type (e.g., "note.created", "vault.unlocked")
    pub event_type: String,
    
    /// Event category
    pub category: EventCategory,
    
    /// Outcome (success/failure)
    pub outcome: EventOutcome,
    
    /// Device identifier (hashed)
    pub device_id: String,
    
    /// User identifier (hashed)
    pub user_id: String,
    
    /// Resource type (e.g., "note", "client", "vault")
    pub resource_type: String,
    
    /// Resource identifier (hashed UUID, not PHI)
    pub resource_id: String,
    
    /// Additional context (no PHI)
    pub context: EventContext,
    
    /// Entry hash for tamper detection
    pub entry_hash: String,
}

/// Event category
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EventCategory {
    /// Authentication events
    Authentication,
    /// Documentation events (create, update, sign)
    Documentation,
    /// Safety/ethics events
    Safety,
    /// Export events
    Export,
    /// Policy events
    Policy,
    /// System events
    System,
}

/// Event outcome
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EventOutcome {
    Success,
    Failure,
    Blocked,
    Warning,
}

/// Event context (PHI-impossible)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EventContext {
    /// Duration in milliseconds (for timed operations)
    pub duration_ms: Option<u64>,
    
    /// Count (for batch operations)
    pub count: Option<u32>,
    
    /// Reason code (for failures/blocks)
    pub reason_code: Option<String>,
    
    /// Detection IDs (for safety events)
    pub detection_ids: Option<Vec<String>>,
    
    /// Policy ID (for policy events)
    pub policy_id: Option<String>,
    
    /// Export format (for export events)
    pub export_format: Option<String>,
    
    /// Destination class (for export events)
    pub destination_class: Option<String>,
}

// ============================================
// SIEM Forwarder
// ============================================

/// SIEM log forwarder
pub struct SiemForwarder {
    /// Configuration
    config: SiemConfig,
    
    /// Event buffer
    buffer: VecDeque<SiemEvent>,
    
    /// HTTP client
    client: reqwest::Client,
    
    /// Last flush time
    last_flush: Option<DateTime<Utc>>,
    
    /// Failed event count
    failed_count: u64,
    
    /// Total sent count
    sent_count: u64,
}

impl SiemForwarder {
    pub fn new(config: SiemConfig) -> Self {
        Self {
            config,
            buffer: VecDeque::new(),
            client: reqwest::Client::new(),
            last_flush: None,
            failed_count: 0,
            sent_count: 0,
        }
    }
    
    /// Check if SIEM is enabled
    pub fn is_enabled(&self) -> bool {
        self.config.enabled && !self.config.endpoint.is_empty()
    }
    
    /// Add event to buffer
    pub fn log_event(&mut self, event: SiemEvent) {
        if !self.is_enabled() {
            return;
        }
        
        self.buffer.push_back(event);
        
        // Check if we should flush
        if self.buffer.len() >= self.config.batch_size {
            // Would trigger async flush here
            log::debug!("SIEM buffer full, should flush");
        }
    }
    
    /// Flush buffer to SIEM
    pub async fn flush(&mut self) -> Result<u32, SiemError> {
        if !self.is_enabled() {
            return Err(SiemError::NotConfigured);
        }
        
        if self.buffer.is_empty() {
            return Ok(0);
        }
        
        // Take events from buffer
        let events: Vec<SiemEvent> = self.buffer.drain(..).collect();
        let event_count = events.len() as u32;
        
        // Format events
        let payload = self.format_payload(&events)?;
        
        // Send to SIEM
        let result = self.send_payload(&payload).await;
        
        match result {
            Ok(_) => {
                self.sent_count += event_count as u64;
                self.last_flush = Some(Utc::now());
                log::info!("SIEM: Sent {} events", event_count);
                Ok(event_count)
            }
            Err(e) => {
                // Put events back in buffer for retry
                for event in events.into_iter().rev() {
                    self.buffer.push_front(event);
                }
                self.failed_count += event_count as u64;
                Err(e)
            }
        }
    }
    
    /// Format payload for SIEM
    fn format_payload(&self, events: &[SiemEvent]) -> Result<String, SiemError> {
        match self.config.format {
            SiemFormat::Splunk => self.format_splunk(events),
            SiemFormat::Sentinel => self.format_sentinel(events),
            SiemFormat::Generic => self.format_generic(events),
            SiemFormat::Syslog => self.format_syslog(events),
        }
    }
    
    /// Format for Splunk HEC
    fn format_splunk(&self, events: &[SiemEvent]) -> Result<String, SiemError> {
        let hec_events: Vec<serde_json::Value> = events.iter()
            .map(|e| {
                serde_json::json!({
                    "time": e.timestamp.timestamp(),
                    "source": self.config.source,
                    "sourcetype": self.config.source_type,
                    "index": self.config.index,
                    "event": {
                        "event_type": e.event_type,
                        "category": e.category,
                        "outcome": e.outcome,
                        "device_id": e.device_id,
                        "user_id": e.user_id,
                        "resource_type": e.resource_type,
                        "resource_id": e.resource_id,
                        "context": e.context,
                        "entry_hash": e.entry_hash,
                    }
                })
            })
            .collect();
        
        // Splunk HEC expects newline-delimited JSON
        let payload: String = hec_events.iter()
            .map(|e| serde_json::to_string(e).unwrap_or_default())
            .collect::<Vec<_>>()
            .join("\n");
        
        Ok(payload)
    }
    
    /// Format for Azure Sentinel
    fn format_sentinel(&self, events: &[SiemEvent]) -> Result<String, SiemError> {
        let sentinel_events: Vec<serde_json::Value> = events.iter()
            .map(|e| {
                serde_json::json!({
                    "TimeGenerated": e.timestamp.to_rfc3339(),
                    "EventType": e.event_type,
                    "Category": format!("{:?}", e.category),
                    "Outcome": format!("{:?}", e.outcome),
                    "DeviceId": e.device_id,
                    "UserId": e.user_id,
                    "ResourceType": e.resource_type,
                    "ResourceId": e.resource_id,
                    "DurationMs": e.context.duration_ms,
                    "Count": e.context.count,
                    "ReasonCode": e.context.reason_code,
                    "EntryHash": e.entry_hash,
                })
            })
            .collect();
        
        serde_json::to_string(&sentinel_events)
            .map_err(|e| SiemError::Serialization(e.to_string()))
    }
    
    /// Format as generic JSON
    fn format_generic(&self, events: &[SiemEvent]) -> Result<String, SiemError> {
        serde_json::to_string(events)
            .map_err(|e| SiemError::Serialization(e.to_string()))
    }
    
    /// Format as CEF syslog
    fn format_syslog(&self, events: &[SiemEvent]) -> Result<String, SiemError> {
        let cef_lines: Vec<String> = events.iter()
            .map(|e| {
                format!(
                    "CEF:0|Evidify|EvidifyAudit|1.0|{}|{}|{}|deviceId={} userId={} resourceType={} resourceId={} outcome={} entryHash={}",
                    e.event_type,
                    e.event_type,
                    self.severity_from_category(&e.category),
                    e.device_id,
                    e.user_id,
                    e.resource_type,
                    e.resource_id,
                    format!("{:?}", e.outcome),
                    e.entry_hash,
                )
            })
            .collect();
        
        Ok(cef_lines.join("\n"))
    }
    
    fn severity_from_category(&self, category: &EventCategory) -> u8 {
        match category {
            EventCategory::Safety => 8,
            EventCategory::Authentication => 6,
            EventCategory::Export => 5,
            EventCategory::Policy => 4,
            EventCategory::Documentation => 3,
            EventCategory::System => 2,
        }
    }
    
    /// Send payload to SIEM
    async fn send_payload(&self, payload: &str) -> Result<(), SiemError> {
        let mut request = self.client
            .post(&self.config.endpoint)
            .header("Content-Type", "application/json");
        
        // Add authentication
        if let Some(token) = &self.config.auth_token {
            match self.config.format {
                SiemFormat::Splunk => {
                    request = request.header("Authorization", format!("Splunk {}", token));
                }
                SiemFormat::Sentinel => {
                    request = request.header("Authorization", format!("Bearer {}", token));
                }
                _ => {
                    request = request.header("Authorization", format!("Bearer {}", token));
                }
            }
        }
        
        // Add custom headers
        for (key, value) in &self.config.headers {
            request = request.header(key, value);
        }
        
        // Send request
        let response = request
            .body(payload.to_string())
            .send()
            .await
            .map_err(|e| SiemError::Http(e.to_string()))?;
        
        if response.status().is_success() {
            Ok(())
        } else if response.status() == 401 || response.status() == 403 {
            Err(SiemError::AuthFailed)
        } else if response.status() == 429 {
            Err(SiemError::RateLimited)
        } else {
            Err(SiemError::Http(format!(
                "HTTP {}: {}",
                response.status(),
                response.text().await.unwrap_or_default()
            )))
        }
    }
    
    /// Get forwarder status
    pub fn status(&self) -> SiemStatus {
        SiemStatus {
            enabled: self.is_enabled(),
            format: self.config.format,
            endpoint: if self.is_enabled() {
                Some(self.config.endpoint.clone())
            } else {
                None
            },
            buffer_size: self.buffer.len(),
            sent_count: self.sent_count,
            failed_count: self.failed_count,
            last_flush: self.last_flush,
        }
    }
}

/// SIEM forwarder status
#[derive(Debug, Clone, Serialize)]
pub struct SiemStatus {
    pub enabled: bool,
    pub format: SiemFormat,
    pub endpoint: Option<String>,
    pub buffer_size: usize,
    pub sent_count: u64,
    pub failed_count: u64,
    pub last_flush: Option<DateTime<Utc>>,
}

// ============================================
// Event Builders
// ============================================

/// Build authentication event
pub fn auth_event(
    event_type: &str,
    outcome: EventOutcome,
    device_id: &str,
    user_id: &str,
) -> SiemEvent {
    SiemEvent {
        timestamp: Utc::now(),
        event_type: event_type.to_string(),
        category: EventCategory::Authentication,
        outcome,
        device_id: sha256_short(device_id),
        user_id: sha256_short(user_id),
        resource_type: "vault".to_string(),
        resource_id: sha256_short(user_id),
        context: EventContext::default(),
        entry_hash: String::new(),
    }
}

/// Build documentation event
pub fn doc_event(
    event_type: &str,
    outcome: EventOutcome,
    device_id: &str,
    user_id: &str,
    resource_id: &str,
) -> SiemEvent {
    SiemEvent {
        timestamp: Utc::now(),
        event_type: event_type.to_string(),
        category: EventCategory::Documentation,
        outcome,
        device_id: sha256_short(device_id),
        user_id: sha256_short(user_id),
        resource_type: "note".to_string(),
        resource_id: sha256_short(resource_id),
        context: EventContext::default(),
        entry_hash: String::new(),
    }
}

/// Build safety event
pub fn safety_event(
    event_type: &str,
    outcome: EventOutcome,
    device_id: &str,
    user_id: &str,
    resource_id: &str,
    detection_ids: Vec<String>,
) -> SiemEvent {
    SiemEvent {
        timestamp: Utc::now(),
        event_type: event_type.to_string(),
        category: EventCategory::Safety,
        outcome,
        device_id: sha256_short(device_id),
        user_id: sha256_short(user_id),
        resource_type: "note".to_string(),
        resource_id: sha256_short(resource_id),
        context: EventContext {
            detection_ids: Some(detection_ids),
            ..Default::default()
        },
        entry_hash: String::new(),
    }
}

/// Build export event
pub fn export_event(
    event_type: &str,
    outcome: EventOutcome,
    device_id: &str,
    user_id: &str,
    export_format: &str,
    destination_class: &str,
) -> SiemEvent {
    SiemEvent {
        timestamp: Utc::now(),
        event_type: event_type.to_string(),
        category: EventCategory::Export,
        outcome,
        device_id: sha256_short(device_id),
        user_id: sha256_short(user_id),
        resource_type: "export".to_string(),
        resource_id: uuid::Uuid::new_v4().to_string(),
        context: EventContext {
            export_format: Some(export_format.to_string()),
            destination_class: Some(destination_class.to_string()),
            ..Default::default()
        },
        entry_hash: String::new(),
    }
}

/// Short SHA-256 hash (first 16 chars)
fn sha256_short(input: &str) -> String {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    hex::encode(&hasher.finalize()[..8])
}

// ============================================
// Tauri Commands
// ============================================

use tauri::State;
use std::sync::RwLock;

pub struct SiemState {
    pub forwarder: RwLock<Option<SiemForwarder>>,
}

impl Default for SiemState {
    fn default() -> Self {
        Self {
            forwarder: RwLock::new(None),
        }
    }
}

/// Configure SIEM integration
#[tauri::command]
pub fn configure_siem(
    state: State<'_, SiemState>,
    config: SiemConfig,
) -> Result<(), String> {
    let mut forwarder = state.forwarder.write().map_err(|e| e.to_string())?;
    *forwarder = Some(SiemForwarder::new(config));
    Ok(())
}

/// Get SIEM status
#[tauri::command]
pub fn get_siem_status(
    state: State<'_, SiemState>,
) -> Result<Option<SiemStatus>, String> {
    let forwarder = state.forwarder.read().map_err(|e| e.to_string())?;
    Ok(forwarder.as_ref().map(|f| f.status()))
}

/// Flush SIEM buffer
#[tauri::command]
pub async fn flush_siem_buffer(
    state: State<'_, SiemState>,
) -> Result<u32, String> {
    let mut forwarder = state.forwarder.write().map_err(|e| e.to_string())?;
    if let Some(f) = forwarder.as_mut() {
        tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(f.flush())
        }).map_err(|e| e.to_string())
    } else {
        Err("SIEM not configured".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_sha256_short() {
        let hash = sha256_short("test-user-id");
        assert_eq!(hash.len(), 16);
    }
    
    #[test]
    fn test_event_builders() {
        let event = auth_event("vault.unlocked", EventOutcome::Success, "device1", "user1");
        assert_eq!(event.event_type, "vault.unlocked");
        assert_eq!(event.category, EventCategory::Authentication);
    }
    
    #[test]
    fn test_cef_format() {
        let forwarder = SiemForwarder::new(SiemConfig {
            format: SiemFormat::Syslog,
            ..Default::default()
        });
        
        let events = vec![
            auth_event("vault.unlocked", EventOutcome::Success, "dev1", "usr1")
        ];
        
        let payload = forwarder.format_syslog(&events).unwrap();
        assert!(payload.contains("CEF:0|Evidify"));
    }
}
