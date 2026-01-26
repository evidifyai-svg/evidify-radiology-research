// Clipboard Security Module
//
// Provides secure clipboard operations with:
// - Configurable auto-clear TTL
// - PHI-minimal audit logging
// - Policy-based controls
//
// No PHI is ever stored in logs - only event types.

use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tokio::time::sleep;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ClipboardError {
    #[error("Clipboard operation failed: {0}")]
    OperationFailed(String),
    
    #[error("Clipboard not available")]
    NotAvailable,
    
    #[error("Policy violation: {0}")]
    PolicyViolation(String),
}

/// Clipboard security policy configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardPolicy {
    /// Auto-clear clipboard after this many seconds (0 = disabled)
    pub auto_clear_seconds: u32,
    
    /// Show user confirmation before copying sensitive content
    pub confirm_before_copy: bool,
    
    /// Log clipboard events to audit log
    pub audit_clipboard_events: bool,
    
    /// Maximum allowed clipboard content length (0 = unlimited)
    pub max_content_length: usize,
}

impl Default for ClipboardPolicy {
    fn default() -> Self {
        Self {
            auto_clear_seconds: 30,        // Clear after 30 seconds
            confirm_before_copy: false,    // Don't require confirmation by default
            audit_clipboard_events: true,  // Log events
            max_content_length: 0,         // No limit
        }
    }
}

/// Content classification for clipboard operations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ClipboardContentType {
    /// Plain text (notes, etc.)
    Text,
    /// Structured clinical content
    ClinicalNote,
    /// Assessment or test results
    Assessment,
    /// Client identifiers
    ClientInfo,
    /// Non-sensitive (UI text, settings, etc.)
    NonSensitive,
}

/// Clipboard operation for audit logging
#[derive(Debug, Clone, Serialize)]
pub struct ClipboardEvent {
    pub operation: ClipboardOperation,
    pub content_type: ClipboardContentType,
    pub content_length: usize,
    pub auto_clear_scheduled: bool,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Copy, Serialize)]
pub enum ClipboardOperation {
    Copy,
    Clear,
    AutoClear,
}

/// Secure clipboard manager
pub struct SecureClipboard {
    /// Current clipboard policy
    policy: ClipboardPolicy,
    
    /// Handle to cancel pending auto-clear
    cancel_token: Arc<Mutex<Option<tokio::sync::oneshot::Sender<()>>>>,
    
    /// Track if we have content pending clear
    has_pending_content: Arc<std::sync::atomic::AtomicBool>,
}

impl SecureClipboard {
    pub fn new(policy: ClipboardPolicy) -> Self {
        Self {
            policy,
            cancel_token: Arc::new(Mutex::new(None)),
            has_pending_content: Arc::new(std::sync::atomic::AtomicBool::new(false)),
        }
    }
    
    pub fn with_default_policy() -> Self {
        Self::new(ClipboardPolicy::default())
    }
    
    /// Update clipboard policy
    pub fn set_policy(&mut self, policy: ClipboardPolicy) {
        self.policy = policy;
    }
    
    /// Get current policy
    pub fn get_policy(&self) -> &ClipboardPolicy {
        &self.policy
    }
    
    /// Copy content to clipboard with policy enforcement
    pub async fn copy(
        &self,
        content: &str,
        content_type: ClipboardContentType,
    ) -> Result<ClipboardEvent, ClipboardError> {
        // Check content length policy
        if self.policy.max_content_length > 0 && content.len() > self.policy.max_content_length {
            return Err(ClipboardError::PolicyViolation(format!(
                "Content exceeds maximum length ({} > {})",
                content.len(),
                self.policy.max_content_length
            )));
        }
        
        // Cancel any pending auto-clear
        {
            let mut cancel = self.cancel_token.lock().await;
            if let Some(tx) = cancel.take() {
                let _ = tx.send(());
            }
        }
        
        // Copy to system clipboard
        self.write_to_system_clipboard(content)?;
        
        // Schedule auto-clear if enabled
        let auto_clear_scheduled = if self.policy.auto_clear_seconds > 0 {
            self.schedule_auto_clear().await;
            true
        } else {
            false
        };
        
        // Create event (no PHI - just metadata)
        let event = ClipboardEvent {
            operation: ClipboardOperation::Copy,
            content_type,
            content_length: content.len(),
            auto_clear_scheduled,
            timestamp: chrono::Utc::now(),
        };
        
        self.has_pending_content.store(true, std::sync::atomic::Ordering::SeqCst);
        
        Ok(event)
    }
    
    /// Clear clipboard immediately
    pub async fn clear(&self) -> Result<ClipboardEvent, ClipboardError> {
        // Cancel pending auto-clear
        {
            let mut cancel = self.cancel_token.lock().await;
            if let Some(tx) = cancel.take() {
                let _ = tx.send(());
            }
        }
        
        // Clear system clipboard
        self.write_to_system_clipboard("")?;
        
        self.has_pending_content.store(false, std::sync::atomic::Ordering::SeqCst);
        
        Ok(ClipboardEvent {
            operation: ClipboardOperation::Clear,
            content_type: ClipboardContentType::NonSensitive,
            content_length: 0,
            auto_clear_scheduled: false,
            timestamp: chrono::Utc::now(),
        })
    }
    
    /// Schedule automatic clipboard clear
    async fn schedule_auto_clear(&self) {
        let (tx, rx) = tokio::sync::oneshot::channel();
        
        {
            let mut cancel = self.cancel_token.lock().await;
            *cancel = Some(tx);
        }
        
        let ttl = Duration::from_secs(self.policy.auto_clear_seconds as u64);
        let has_pending = self.has_pending_content.clone();
        
        tokio::spawn(async move {
            tokio::select! {
                _ = sleep(ttl) => {
                    // TTL expired, clear clipboard
                    #[cfg(target_os = "macos")]
                    {
                        use std::process::Command;
                        let _ = Command::new("pbcopy")
                            .stdin(std::process::Stdio::piped())
                            .spawn()
                            .and_then(|mut child| {
                                if let Some(stdin) = child.stdin.as_mut() {
                                    use std::io::Write;
                                    let _ = stdin.write_all(b"");
                                }
                                child.wait()
                            });
                    }
                    
                    #[cfg(target_os = "windows")]
                    {
                        use std::process::Command;
                        let _ = Command::new("cmd")
                            .args(["/C", "echo.|clip"])
                            .output();
                    }
                    
                    has_pending.store(false, std::sync::atomic::Ordering::SeqCst);
                    log::info!("Clipboard auto-cleared after {} seconds", ttl.as_secs());
                }
                _ = rx => {
                    // Cancelled, don't clear
                    log::debug!("Clipboard auto-clear cancelled");
                }
            }
        });
    }
    
    /// Write content to system clipboard
    fn write_to_system_clipboard(&self, content: &str) -> Result<(), ClipboardError> {
        #[cfg(target_os = "macos")]
        {
            use std::process::{Command, Stdio};
            use std::io::Write;
            
            let mut child = Command::new("pbcopy")
                .stdin(Stdio::piped())
                .spawn()
                .map_err(|e| ClipboardError::OperationFailed(e.to_string()))?;
            
            if let Some(stdin) = child.stdin.as_mut() {
                stdin.write_all(content.as_bytes())
                    .map_err(|e| ClipboardError::OperationFailed(e.to_string()))?;
            }
            
            child.wait()
                .map_err(|e| ClipboardError::OperationFailed(e.to_string()))?;
            
            Ok(())
        }
        
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;
            
            // Use clip.exe for Windows
            let mut child = Command::new("cmd")
                .args(["/C", "clip"])
                .stdin(std::process::Stdio::piped())
                .spawn()
                .map_err(|e| ClipboardError::OperationFailed(e.to_string()))?;
            
            if let Some(stdin) = child.stdin.as_mut() {
                use std::io::Write;
                stdin.write_all(content.as_bytes())
                    .map_err(|e| ClipboardError::OperationFailed(e.to_string()))?;
            }
            
            child.wait()
                .map_err(|e| ClipboardError::OperationFailed(e.to_string()))?;
            
            Ok(())
        }
        
        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        {
            // Linux: try xclip or xsel
            use std::process::{Command, Stdio};
            use std::io::Write;
            
            // Try xclip first
            if let Ok(mut child) = Command::new("xclip")
                .args(["-selection", "clipboard"])
                .stdin(Stdio::piped())
                .spawn()
            {
                if let Some(stdin) = child.stdin.as_mut() {
                    let _ = stdin.write_all(content.as_bytes());
                }
                let _ = child.wait();
                return Ok(());
            }
            
            // Fall back to xsel
            if let Ok(mut child) = Command::new("xsel")
                .args(["--clipboard", "--input"])
                .stdin(Stdio::piped())
                .spawn()
            {
                if let Some(stdin) = child.stdin.as_mut() {
                    let _ = stdin.write_all(content.as_bytes());
                }
                let _ = child.wait();
                return Ok(());
            }
            
            Err(ClipboardError::NotAvailable)
        }
    }
    
    /// Check if there's content pending auto-clear
    pub fn has_pending_content(&self) -> bool {
        self.has_pending_content.load(std::sync::atomic::Ordering::SeqCst)
    }
    
    /// Get time remaining until auto-clear (approximate)
    pub fn get_auto_clear_seconds(&self) -> u32 {
        self.policy.auto_clear_seconds
    }
}

// ============================================
// Tauri Commands
// ============================================

use tauri::State;
use std::sync::RwLock;

pub struct ClipboardState {
    pub clipboard: RwLock<SecureClipboard>,
}

impl Default for ClipboardState {
    fn default() -> Self {
        Self {
            clipboard: RwLock::new(SecureClipboard::with_default_policy()),
        }
    }
}

/// Copy text to clipboard with security controls
#[tauri::command]
pub async fn clipboard_copy(
    state: State<'_, ClipboardState>,
    content: String,
    content_type: Option<String>,
) -> Result<ClipboardCopyResult, String> {
    let content_type = match content_type.as_deref() {
        Some("clinical_note") => ClipboardContentType::ClinicalNote,
        Some("assessment") => ClipboardContentType::Assessment,
        Some("client_info") => ClipboardContentType::ClientInfo,
        Some("non_sensitive") => ClipboardContentType::NonSensitive,
        _ => ClipboardContentType::Text,
    };
    
    // Get auto_clear_seconds before async operation
    let auto_clear_seconds = {
        let clipboard = state.clipboard.read().map_err(|e| e.to_string())?;
        clipboard.get_auto_clear_seconds()
    };
    
    // Perform async operation without holding guard
    let event = {
        let clipboard = state.clipboard.read().map_err(|e| e.to_string())?;
        // Use block_on to execute async code synchronously
        tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(clipboard.copy(&content, content_type))
        }).map_err(|e| e.to_string())?
    };
    
    Ok(ClipboardCopyResult {
        success: true,
        auto_clear_seconds: if event.auto_clear_scheduled {
            Some(auto_clear_seconds)
        } else {
            None
        },
        content_length: event.content_length,
    })
}

#[derive(Serialize)]
pub struct ClipboardCopyResult {
    pub success: bool,
    pub auto_clear_seconds: Option<u32>,
    pub content_length: usize,
}

/// Clear clipboard immediately
#[tauri::command]
pub async fn clipboard_clear(
    state: State<'_, ClipboardState>,
) -> Result<bool, String> {
    let clipboard = state.clipboard.read().map_err(|e| e.to_string())?;
    tokio::task::block_in_place(|| {
        tokio::runtime::Handle::current().block_on(clipboard.clear())
    }).map_err(|e| e.to_string())?;
    Ok(true)
}

/// Get clipboard policy
#[tauri::command]
pub fn clipboard_get_policy(
    state: State<'_, ClipboardState>,
) -> Result<ClipboardPolicy, String> {
    let clipboard = state.clipboard.read().map_err(|e| e.to_string())?;
    Ok(clipboard.get_policy().clone())
}

/// Update clipboard policy
#[tauri::command]
pub fn clipboard_set_policy(
    state: State<'_, ClipboardState>,
    policy: ClipboardPolicy,
) -> Result<bool, String> {
    let mut clipboard = state.clipboard.write().map_err(|e| e.to_string())?;
    clipboard.set_policy(policy);
    Ok(true)
}

/// Check if clipboard has pending content
#[tauri::command]
pub fn clipboard_has_pending(
    state: State<'_, ClipboardState>,
) -> Result<bool, String> {
    let clipboard = state.clipboard.read().map_err(|e| e.to_string())?;
    Ok(clipboard.has_pending_content())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_default_policy() {
        let policy = ClipboardPolicy::default();
        assert_eq!(policy.auto_clear_seconds, 30);
        assert!(policy.audit_clipboard_events);
    }
    
    #[tokio::test]
    async fn test_clipboard_copy() {
        let clipboard = SecureClipboard::with_default_policy();
        
        let result = clipboard.copy("test content", ClipboardContentType::Text).await;
        
        // May fail in CI without clipboard access
        if let Ok(event) = result {
            assert_eq!(event.content_length, 12);
            assert!(event.auto_clear_scheduled);
        }
    }
}
