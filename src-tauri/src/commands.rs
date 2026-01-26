// Tauri Commands v4 - Frontend API
// 
// All commands exposed to frontend via Tauri IPC.

use std::sync::Mutex;
use std::collections::HashMap;
use tauri::State;

use crate::vault::Vault;
use crate::models::*;
use crate::ethics;
use crate::ai;
use crate::voice;
use crate::rag;
use crate::attestation;
use crate::metrics;
use crate::recording;
use crate::analysis;
use crate::audit;
use crate::export;
use crate::models::VaultStateType;

/// App state managed by Tauri
pub struct AppState {
    pub vault: Mutex<Vault>,
}

// ============================================
// Vault Commands
// ============================================

#[tauri::command]
pub fn vault_exists(state: State<AppState>) -> bool {
    match state.vault.lock() {
        Ok(vault) => vault.exists(),
        Err(_) => false,
    }
}

#[tauri::command]
pub fn create_vault(state: State<AppState>, passphrase: String) -> Result<(), String> {
    let mut vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.create(&passphrase).map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn unlock_vault(state: State<AppState>, passphrase: String) -> Result<(), String> {
    let mut vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.unlock(&passphrase).map_err(|e| format!("{}", e))?;
    
    // Log vault unlock event
    if let Ok(conn) = vault.get_connection() {
        let _ = audit::log_event(
            conn,
            AuditEventType::VaultUnlocked,
            AuditResourceType::Vault,
            "vault",
            AuditOutcome::Success,
            None,
        );
    }
    
    Ok(())
}

#[tauri::command]
pub fn lock_vault(state: State<AppState>) -> Result<(), String> {
    let mut vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    
    // Log vault lock event before locking
    if let Ok(conn) = vault.get_connection() {
        let _ = audit::log_event(
            conn,
            AuditEventType::VaultLocked,
            AuditResourceType::Vault,
            "vault",
            AuditOutcome::Success,
            None,
        );
    }
    
    vault.lock();
    Ok(())
}

#[tauri::command]
pub fn vault_status(state: State<AppState>) -> VaultStatus {
    match state.vault.lock() {
        Ok(vault) => {
            let vault_state = vault.get_state();
            let is_unlocked = vault.is_unlocked();
            
            let (client_count, note_count) = if is_unlocked {
                vault.get_counts().unwrap_or((0, 0))
            } else {
                (0, 0)
            };
            
            // Map internal VaultStateType to models VaultStateType
            let state_type = match vault_state.state {
                crate::vault::VaultStateType::NoVault => VaultStateType::NoVault,
                crate::vault::VaultStateType::Ready => VaultStateType::Ready,
                crate::vault::VaultStateType::Unlocked => VaultStateType::Unlocked,
                crate::vault::VaultStateType::KeychainLost => VaultStateType::KeychainLost,
                crate::vault::VaultStateType::StaleKeychain => VaultStateType::StaleKeychain,
            };
            
            VaultStatus {
                state: state_type,
                db_exists: vault_state.db_exists,
                keychain_exists: vault_state.keychain_exists,
                message: vault_state.message,
                client_count: if is_unlocked { Some(client_count) } else { None },
                note_count: if is_unlocked { Some(note_count) } else { None },
                // Legacy fields for backwards compatibility
                exists: vault_state.db_exists, // DEPRECATED: prefer `state`; indicates DB presence
                unlocked: is_unlocked,
            }
        }
        Err(_) => VaultStatus {
            state: VaultStateType::Corrupt,
            db_exists: false,
            keychain_exists: false,
            message: "Vault mutex poisoned - please restart the application".to_string(),
            client_count: None,
            note_count: None,
            exists: false,
            unlocked: false,
        }
    }
}

// ============================================
// Vault Recovery Commands
// ============================================

/// Clear stale keychain entries when DB is missing
#[tauri::command]
pub fn vault_clear_stale_keychain(state: State<AppState>, confirm: bool) -> Result<(), String> {
    if !confirm {
        return Err("Must confirm with confirm=true".to_string());
    }
    
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    
    // Only allow if in StaleKeychain state
    let vault_state = vault.get_state();
    if vault_state.state != crate::vault::VaultStateType::StaleKeychain {
        return Err(format!(
            "Cannot clear keychain: vault is in {:?} state, not StaleKeychain",
            vault_state.state
        ));
    }
    
    vault.clear_stale_keychain().map_err(|e| format!("{e}"))?;
    
    log::info!("Cleared stale keychain entries");
    Ok(())
}

/// Delete vault database when keychain is lost (destructive - requires confirmation)
#[tauri::command]
pub fn vault_delete_db(state: State<AppState>, confirm: bool) -> Result<(), String> {
    if !confirm {
        return Err("Must confirm with confirm=true - THIS WILL DELETE ALL DATA".to_string());
    }
    
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    
    // Only allow if in KeychainLost state
    let vault_state = vault.get_state();
    if vault_state.state != crate::vault::VaultStateType::KeychainLost {
        return Err(format!(
            "Cannot delete DB: vault is in {:?} state, not KeychainLost",
            vault_state.state
        ));
    }
    
    vault.delete_vault_db().map_err(|e| format!("{e}"))?;
    
    log::warn!("Deleted vault database due to KeychainLost recovery");
    Ok(())
}

// ============================================
// Client Commands
// ============================================

#[tauri::command]
pub fn create_client(state: State<AppState>, display_name: String) -> Result<Client, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    vault.create_client(&display_name).map_err(|e| format!("{e}"))
}

#[tauri::command]
pub fn list_clients(state: State<AppState>) -> Result<Vec<Client>, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    vault.list_clients().map_err(|e| format!("{e}"))
}

#[tauri::command]
pub fn get_client(state: State<AppState>, id: String) -> Result<Client, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    vault.get_client(&id).map_err(|e| format!("{e}"))
}

#[tauri::command]
pub fn update_client(
    state: State<AppState>, 
    client_json: String
) -> Result<Client, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    let client: Client = serde_json::from_str(&client_json)
        .map_err(|e| format!("Invalid client JSON: {e}"))?;
    vault.update_client(&client).map_err(|e| format!("{e}"))
}

// ============================================
// Note Commands
// ============================================

#[tauri::command]
pub fn create_note(
    state: State<AppState>,
    client_id: String,
    session_date: String,
    note_type: String,
    content: String,
) -> Result<Note, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    let note_type = NoteType::from_str(&note_type);
    vault.create_note(&client_id, &session_date, note_type, &content)
        .map_err(|e| format!("{e}"))
}

#[tauri::command]
pub fn get_note(state: State<AppState>, id: String) -> Result<Note, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    vault.get_note(&id).map_err(|e| format!("{e}"))
}

#[tauri::command]
pub fn list_notes(state: State<AppState>, client_id: Option<String>) -> Result<Vec<Note>, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    vault.list_notes(client_id.as_deref()).map_err(|e| format!("{e}"))
}

#[tauri::command]
pub fn update_note(state: State<AppState>, id: String, content: String) -> Result<Note, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    vault.update_note(&id, &content).map_err(|e| format!("{e}"))
}

#[tauri::command]
pub fn update_structured_note(
    state: State<AppState>, 
    id: String, 
    structured_note: String
) -> Result<Note, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    vault.update_note_structured(&id, &structured_note).map_err(|e| format!("{e}"))
}

#[tauri::command]
pub fn sign_note(state: State<AppState>, id: String, attestations: String) -> Result<Note, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    
    // Get the note first to validate
    let note = vault.get_note(&id).map_err(|e| format!("{e}"))?;
    
    // Basic completion validation - require minimum content
    let content = note.structured_note.as_ref().unwrap_or(&note.raw_input);
    let word_count = content.split_whitespace().count();
    
    if word_count < 20 {
        return Err("Cannot sign: Note is too short (minimum 20 words required for defensibility)".to_string());
    }
    
    // Check for SOAP note critical sections
    let content_lower = content.to_lowercase();
    let has_assessment = content_lower.contains("assessment") || content_lower.contains("a:") || content_lower.contains("a (");
    let has_plan = content_lower.contains("plan") || content_lower.contains("p:") || content_lower.contains("p (");
    
    if !has_assessment {
        return Err("Cannot sign: Note is missing Assessment section (required for clinical defensibility)".to_string());
    }
    
    if !has_plan {
        return Err("Cannot sign: Note is missing Plan section (required for clinical defensibility)".to_string());
    }
    
    vault.sign_note(&id, &attestations).map_err(|e| format!("{e}"))
}

#[tauri::command]
pub fn export_note(state: State<AppState>, id: String, format: String) -> Result<String, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    let note = vault.get_note(&id).map_err(|e| format!("{e}"))?;
    
    match format.as_str() {
        "text" => Ok(format_note_text(&note)),
        "markdown" => Ok(format_note_markdown(&note)),
        "json" => serde_json::to_string_pretty(&note).map_err(|e| format!("{e}")),
        _ => Err("Unknown format".into()),
    }
}

fn format_note_text(note: &Note) -> String {
    let content = note.structured_note.as_ref().unwrap_or(&note.raw_input);
    
    format!(
        "SESSION NOTE\n\
        Date: {}\n\
        Type: {:?}\n\
        Status: {:?}\n\n\
        {}\n\n\
        ---\n\
        Content Hash: {}\n\
        Generated by Evidify",
        note.session_date,
        note.note_type,
        note.status,
        content,
        note.content_hash
    )
}

fn format_note_markdown(note: &Note) -> String {
    let content = note.structured_note.as_ref().unwrap_or(&note.raw_input);
    
    format!(
        "# Session Note\n\n\
        **Date:** {}  \n\
        **Type:** {:?}  \n\
        **Status:** {:?}\n\n\
        ---\n\n\
        {}\n\n\
        ---\n\n\
        *Content Hash: {}*  \n\
        *Generated by Evidify*",
        note.session_date,
        note.note_type,
        note.status,
        content,
        note.content_hash
    )
}

// ============================================
// Ethics Commands
// ============================================

#[tauri::command]
pub fn analyze_ethics(content: String) -> EthicsAnalysis {
    ethics::analyze(&content)
}

#[tauri::command]
pub fn resolve_detection(
    state: State<AppState>,
    note_id: String,
    detection_id: String,
    response: String,
    response_note: Option<String>,
) -> Result<(), String> {
    // Store attestation with note
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    let note = vault.get_note(&note_id).map_err(|e| format!("{e}"))?;
    
    let mut attestations = note.attestations.clone();
    attestations.push(Attestation {
        detection_id,
        response: match response.as_str() {
            "addressed_in_note" => AttestationResponse::AddressedInNote,
            "not_clinically_relevant" => AttestationResponse::NotClinicallyRelevant,
            "will_address_next_session" => AttestationResponse::WillAddressNextSession,
            "consulted_supervisor" => AttestationResponse::ConsultedSupervisor,
            _ => AttestationResponse::DocumentedElsewhere,
        },
        response_note,
        attested_at: chrono::Utc::now().timestamp_millis(),
    });
    
    // Note: In a real implementation, we'd update the note with new attestations
    Ok(())
}

// ============================================
// AI Commands
// ============================================

#[tauri::command]
pub async fn check_ollama() -> OllamaStatus {
    ai::check_status().await
}

#[tauri::command]
pub async fn structure_note_ai(
    model: String,
    content: String,
    note_type: String,
) -> Result<String, String> {
    let note_type = NoteType::from_str(&note_type);
    ai::structure_note(&model, &content, note_type)
        .await
        .map_err(|e| format!("{e}"))
}

#[tauri::command]
pub fn embed_text(text: String) -> Vec<f32> {
    ai::embed_text_local(&text)
}

#[tauri::command]
pub fn search_notes(
    _state: State<AppState>,
    _query: String,
    _limit: Option<i32>,
) -> Result<Vec<SearchResult>, String> {
    // TODO: Implement semantic search
    Ok(vec![])
}

// ============================================
// Audit Commands
// ============================================

#[tauri::command]
pub fn get_audit_log(
    state: State<AppState>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<AuditEntry>, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    if !vault.is_unlocked() {
        return Err("Vault not unlocked".to_string());
    }
    let conn = vault.get_connection().map_err(|e| format!("{e}"))?;
    
    audit::get_entries(
        conn, 
        limit.unwrap_or(100), 
        offset.unwrap_or(0)
    ).map_err(|e| format!("{e}"))
}

#[tauri::command]
pub fn verify_audit_chain(state: State<AppState>) -> Result<AuditVerificationResult, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    if !vault.is_unlocked() {
        return Err("Vault not unlocked".to_string());
    }
    let conn = vault.get_connection().map_err(|e| format!("{e}"))?;
    
    match audit::verify_chain(conn) {
        Ok(true) => Ok(AuditVerificationResult {
            valid: true,
            error: None,
            checked_at: chrono::Utc::now().timestamp_millis(),
        }),
        Ok(false) => Ok(AuditVerificationResult {
            valid: false,
            error: Some("Chain verification failed".to_string()),
            checked_at: chrono::Utc::now().timestamp_millis(),
        }),
        Err(e) => Ok(AuditVerificationResult {
            valid: false,
            error: Some(e.to_string()),
            checked_at: chrono::Utc::now().timestamp_millis(),
        }),
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct AuditVerificationResult {
    pub valid: bool,
    pub error: Option<String>,
    pub checked_at: i64,
}

// ============================================
// Export Path Validation
// ============================================

/// Result of export path classification with full details
#[derive(Debug, Clone, serde::Serialize)]
pub struct ExportClassificationResult {
    pub classification: PathClassification,
    pub reason: String,
    pub warnings: Vec<String>,
    pub decision: String,  // "allowed" or "blocked"
    pub can_override: bool,
    pub decision_reason: String,
}

#[tauri::command]
pub fn classify_export_path(path: String, enterprise_mode: Option<bool>) -> ExportClassificationResult {
    use std::path::Path;
    
    let path = Path::new(&path);
    
    // If path doesn't exist, try classifying parent directory
    let classify_path = if path.exists() {
        path.to_path_buf()
    } else {
        path.parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| path.to_path_buf())
    };
    
    let result = export::classify_path(&classify_path);
    
    // Apply policy
    let policy = if enterprise_mode.unwrap_or(false) {
        export::ExportPolicy::enterprise()
    } else {
        export::ExportPolicy::default()
    };
    
    let decision = policy.evaluate(&result);
    
    let (decision_str, can_override, decision_reason) = match decision {
        export::ExportDecision::Allowed { reason } => ("allowed".to_string(), false, reason),
        export::ExportDecision::Blocked { reason, can_override } => ("blocked".to_string(), can_override, reason),
    };
    
    ExportClassificationResult {
        classification: result.classification,
        reason: result.reason,
        warnings: result.warnings,
        decision: decision_str,
        can_override,
        decision_reason,
    }
}

/// Validate export path and return simple allow/block for use in actual export operations
#[tauri::command]
pub fn validate_export_path(
    path: String, 
    enterprise_mode: Option<bool>,
    user_override: Option<bool>,
) -> Result<(), String> {
    use std::path::Path;
    
    let path = Path::new(&path);
    
    // If path doesn't exist, try classifying parent directory
    let classify_path = if path.exists() {
        path.to_path_buf()
    } else {
        path.parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| path.to_path_buf())
    };
    
    let result = export::classify_path(&classify_path);
    
    let policy = if enterprise_mode.unwrap_or(false) {
        export::ExportPolicy::enterprise()
    } else {
        export::ExportPolicy::default()
    };
    
    let decision = policy.evaluate(&result);
    
    match decision {
        export::ExportDecision::Allowed { .. } => Ok(()),
        export::ExportDecision::Blocked { reason, can_override } => {
            if can_override && user_override.unwrap_or(false) {
                Ok(())
            } else if can_override {
                Err(format!("Export blocked (override available): {}", reason))
            } else {
                Err(format!("Export blocked (no override): {}", reason))
            }
        }
    }
}

// ============================================
// Voice Commands
// ============================================

#[tauri::command]
pub fn list_whisper_models() -> Vec<voice::WhisperModelInfo> {
    let models_dir = std::path::PathBuf::from("models");
    voice::VoiceCapture::list_models(&models_dir)
}

#[tauri::command]
pub fn get_transcript_text(state: State<AppState>) -> String {
    // In production, we'd have voice state in AppState
    // For now, return placeholder
    "Transcript text would appear here during recording.".to_string()
}

/// Transcribe audio buffer and return segments
#[tauri::command]
pub fn transcribe_audio(
    audio_data: Vec<f32>,
    sample_rate: u32,
) -> Result<Vec<voice::TranscriptSegment>, String> {
    // Resample to 16kHz if needed
    let audio = if sample_rate != 16000 {
        voice::resample_to_16k(&audio_data, sample_rate)
    } else {
        audio_data
    };
    
    // In production, use WhisperContext
    // For now, return placeholder
    Ok(vec![voice::TranscriptSegment {
        text: "[Audio transcription - integrate Whisper model]".to_string(),
        start_ms: 0,
        end_ms: (audio.len() as f32 / 16000.0 * 1000.0) as i64,
        confidence: 0.0,
        risk_detected: None,
    }])
}

/// Convert transcript to structured note
#[tauri::command]
pub async fn voice_to_structured_note(
    transcript: String,
    note_type: NoteType,
    model: String,
) -> Result<String, String> {
    voice::voice_to_note(&transcript, note_type, &model)
        .await
        .map_err(|e| format!("{e}"))
}

/// Get voice/whisper status
#[tauri::command]
pub fn get_voice_status() -> VoiceStatus {
    let models_dir = dirs::home_dir()
        .map(|h| h.join("whisper-models"))
        .unwrap_or_else(|| std::path::PathBuf::from("whisper-models"));
    
    // Check for whisper-cpp installation
    let whisper_cmd = ["whisper-cpp", "whisper", "main"]
        .iter()
        .find(|cmd| {
            std::process::Command::new(cmd)
                .arg("--help")
                .output()
                .is_ok()
        })
        .map(|s| s.to_string());
    
    // Check for ffmpeg
    let ffmpeg_installed = std::process::Command::new("ffmpeg")
        .arg("-version")
        .output()
        .is_ok();
    
    // List available models
    let models = if models_dir.exists() {
        std::fs::read_dir(&models_dir)
            .map(|entries| {
                entries
                    .filter_map(|e| e.ok())
                    .filter_map(|e| {
                        let name = e.file_name().to_string_lossy().to_string();
                        if name.starts_with("ggml-") && name.ends_with(".bin") {
                            Some(name)
                        } else {
                            None
                        }
                    })
                    .collect()
            })
            .unwrap_or_default()
    } else {
        vec![]
    };
    
    VoiceStatus {
        whisper_installed: whisper_cmd.is_some(),
        whisper_command: whisper_cmd,
        models_available: models,
        ffmpeg_installed,
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct VoiceStatus {
    pub whisper_installed: bool,
    pub whisper_command: Option<String>,
    pub models_available: Vec<String>,
    pub ffmpeg_installed: bool,
}

/// Download a Whisper model
#[tauri::command]
pub async fn download_whisper_model(model_name: String) -> Result<String, String> {
    use std::io::Write;
    
    let models_dir = dirs::home_dir()
        .map(|h| h.join("whisper-models"))
        .unwrap_or_else(|| std::path::PathBuf::from("whisper-models"));
    
    // Create directory if needed
    if !models_dir.exists() {
        std::fs::create_dir_all(&models_dir)
            .map_err(|e| format!("Failed to create models directory: {}", e))?;
    }
    
    // Model URLs from Hugging Face
    let model_url = match model_name.as_str() {
        "tiny" | "tiny.en" => format!(
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{}.bin",
            model_name
        ),
        "base" | "base.en" => format!(
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{}.bin",
            model_name
        ),
        "small" | "small.en" => format!(
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{}.bin",
            model_name
        ),
        "medium" | "medium.en" => format!(
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-{}.bin",
            model_name
        ),
        "large-v3" => "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin".to_string(),
        _ => return Err(format!("Unknown model: {}. Available: tiny, tiny.en, base, base.en, small, small.en, medium, medium.en, large-v3", model_name)),
    };
    
    let filename = format!("ggml-{}.bin", model_name);
    let dest_path = models_dir.join(&filename);
    
    // Check if already exists
    if dest_path.exists() {
        return Ok(format!("Model {} already exists at {}", model_name, dest_path.display()));
    }
    
    log::info!("Downloading Whisper model {} from {}", model_name, model_url);
    
    // Use curl for download (more reliable for large files)
    let output = std::process::Command::new("curl")
        .args([
            "-L",  // Follow redirects
            "-o", dest_path.to_str().unwrap(),
            "--progress-bar",
            &model_url,
        ])
        .output()
        .map_err(|e| format!("Failed to run curl: {}. Install curl or download manually.", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Download failed: {}", stderr));
    }
    
    // Verify file was created
    if !dest_path.exists() {
        return Err("Download appeared to succeed but file not found".to_string());
    }
    
    let size = std::fs::metadata(&dest_path)
        .map(|m| m.len())
        .unwrap_or(0);
    
    Ok(format!("Downloaded {} ({:.1} MB) to {}", filename, size as f64 / 1_000_000.0, dest_path.display()))
}

/// Transcribe audio from base64 encoded data
#[tauri::command]
pub async fn transcribe_audio_base64(
    audio_data: String,
    format: String,
) -> Result<String, String> {
    use std::io::Write;
    
    // Decode base64
    let decoded = base64::decode(&audio_data)
        .map_err(|e| format!("Base64 decode error: {}", e))?;
    
    // Create temp file
    let temp_dir = std::env::temp_dir();
    let input_path = temp_dir.join(format!("evidify_audio_{}.{}", uuid::Uuid::new_v4(), format));
    let wav_path = temp_dir.join(format!("evidify_audio_{}.wav", uuid::Uuid::new_v4()));
    
    // Write audio to temp file
    let mut file = std::fs::File::create(&input_path)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    file.write_all(&decoded)
        .map_err(|e| format!("Failed to write audio: {}", e))?;
    drop(file);
    
    // Convert to WAV using ffmpeg
    let ffmpeg_result = std::process::Command::new("ffmpeg")
        .args(["-y", "-i"])
        .arg(&input_path)
        .args(["-ar", "16000", "-ac", "1", "-f", "wav"])
        .arg(&wav_path)
        .output();
    
    // Clean up input file
    let _ = std::fs::remove_file(&input_path);
    
    let ffmpeg_output = ffmpeg_result
        .map_err(|e| format!("ffmpeg not found or failed: {}", e))?;
    
    if !ffmpeg_output.status.success() {
        let _ = std::fs::remove_file(&wav_path);
        return Err(format!("ffmpeg conversion failed: {}", String::from_utf8_lossy(&ffmpeg_output.stderr)));
    }
    
    // Find whisper command
    let whisper_cmd = ["whisper-cpp", "whisper", "main"]
        .iter()
        .find(|cmd| {
            std::process::Command::new(cmd)
                .arg("--help")
                .output()
                .is_ok()
        })
        .ok_or_else(|| "whisper-cpp not found".to_string())?;
    
    // Find model
    let models_dir = dirs::home_dir()
        .map(|h| h.join("whisper-models"))
        .unwrap_or_else(|| std::path::PathBuf::from("whisper-models"));
    
    let model_path = models_dir.join("ggml-base.en.bin");
    if !model_path.exists() {
        let _ = std::fs::remove_file(&wav_path);
        return Err(format!("Whisper model not found at {:?}", model_path));
    }
    
    // Run whisper
    let whisper_result = std::process::Command::new(whisper_cmd)
        .args(["-m"])
        .arg(&model_path)
        .args(["-f"])
        .arg(&wav_path)
        .args(["-l", "en", "--no-timestamps"])
        .output()
        .map_err(|e| format!("Whisper failed: {}", e))?;
    
    // Clean up WAV file
    let _ = std::fs::remove_file(&wav_path);
    
    if !whisper_result.status.success() {
        return Err(format!("Whisper error: {}", String::from_utf8_lossy(&whisper_result.stderr)));
    }
    
    let transcript = String::from_utf8_lossy(&whisper_result.stdout)
        .trim()
        .to_string();
    
    Ok(transcript)
}

/// Structure a voice transcript into a clinical note
#[tauri::command]
pub async fn structure_voice_note(
    transcript: String,
    client_id: String,
) -> Result<StructuredVoiceNote, String> {
    // Use AI to structure the transcript
    let prompt = format!(
        r#"You are a clinical documentation assistant. Structure the following session debrief into a SOAP note format.

TRANSCRIPT:
{}

Return a JSON object with these fields:
- subjective: Patient's reported symptoms, concerns, and statements
- objective: Observable behaviors, affect, appearance, mental status
- assessment: Clinical impressions and diagnostic considerations  
- plan: Treatment recommendations, next steps, follow-up
- interventions: Array of therapeutic interventions used
- riskLevel: "low", "moderate", or "high" based on any safety concerns
- nextSession: Brief note about next session focus (or null)

Respond ONLY with the JSON object, no additional text."#,
        transcript
    );
    
    // Try to call Ollama
    let client = reqwest::Client::new();
    let response = client
        .post("http://localhost:11434/api/generate")
        .json(&serde_json::json!({
            "model": "llama3.2",
            "prompt": prompt,
            "stream": false,
            "options": {
                "temperature": 0.3
            }
        }))
        .send()
        .await
        .map_err(|e| format!("Ollama request failed: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Ollama returned status: {}", response.status()));
    }
    
    let result: serde_json::Value = response.json().await
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;
    
    let response_text = result["response"].as_str()
        .ok_or_else(|| "No response from Ollama".to_string())?;
    
    // Parse the JSON response
    let structured: StructuredVoiceNote = serde_json::from_str(response_text)
        .map_err(|e| format!("Failed to parse structured note: {}", e))?;
    
    Ok(structured)
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StructuredVoiceNote {
    pub subjective: String,
    pub objective: String,
    pub assessment: String,
    pub plan: String,
    pub interventions: Vec<String>,
    #[serde(rename = "riskLevel")]
    pub risk_level: Option<String>,
    #[serde(rename = "nextSession")]
    pub next_session: Option<String>,
}

// ============================================
// RAG / Semantic Search Commands
// ============================================

#[tauri::command]
pub fn index_note_for_search(
    state: State<AppState>,
    note_id: String,
) -> Result<usize, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    let conn = vault.get_connection().map_err(|e| format!("{e}"))?;
    
    // Get note content
    let note = vault.get_note(&note_id).map_err(|e| format!("{e}"))?;
    let content = note.structured_note.as_ref()
        .unwrap_or(&note.raw_input);
    
    rag::index_note(conn, &note_id, content)
        .map_err(|e| format!("{e}"))
}

#[tauri::command]
pub fn search_notes_semantic(
    state: State<AppState>,
    query: String,
    limit: usize,
    client_id: Option<String>,
) -> Result<Vec<rag::SearchResult>, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    let conn = vault.get_connection().map_err(|e| format!("{e}"))?;
    
    rag::search_similar(conn, &query, limit, client_id.as_deref())
        .map_err(|e| format!("{e}"))
}

#[tauri::command]
pub async fn rag_query_notes(
    state: State<'_, AppState>,
    question: String,
    client_id: Option<String>,
    model: String,
) -> Result<rag::RAGAnswer, String> {
    // We need to run this synchronously because Connection can't be sent across threads
    // and we can't hold the MutexGuard across await points
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    let conn = vault.get_connection().map_err(|e| format!("{e}"))?;
    
    // For now, run synchronously - RAG queries are quick enough
    // A proper fix would involve connection pooling or async-safe DB access
    rag::rag_query_sync(conn, &question, client_id.as_deref(), &model)
        .map_err(|e| format!("{e}"))
}

#[tauri::command]
pub fn get_search_index_stats(state: State<AppState>) -> Result<rag::IndexStats, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    let conn = vault.get_connection().map_err(|e| format!("{e}"))?;
    
    rag::get_index_stats(conn).map_err(|e| format!("{e}"))
}

#[tauri::command]
pub fn reindex_all_notes_for_search(state: State<AppState>) -> Result<usize, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    let conn = vault.get_connection().map_err(|e| format!("{e}"))?;
    
    rag::reindex_all_notes(conn).map_err(|e| format!("{e}"))
}

// ============================================
// Attestation Commands
// ============================================

#[tauri::command]
pub fn get_quick_picks(
    category: String,
    severity: String,
) -> Vec<attestation::QuickPickOption> {
    let cat = match category.to_lowercase().as_str() {
        "suicidalideation" | "suicidal_ideation" => ethics::Category::SuicidalIdeation,
        "homicidalideation" | "homicidal_ideation" => ethics::Category::HomicidalIdeation,
        "selfharm" | "self_harm" => ethics::Category::SelfHarm,
        "childabuse" | "child_abuse" => ethics::Category::ChildAbuse,
        "elderabuse" | "elder_abuse" => ethics::Category::ElderAbuse,
        "substanceuse" | "substance_use" => ethics::Category::SubstanceUse,
        "safety" => ethics::Category::Safety,
        "documentation" => ethics::Category::Documentation,
        "billing" => ethics::Category::Billing,
        "integrity" => ethics::Category::Documentation, // map integrity to documentation
        _ => ethics::Category::ClinicalRisk,
    };
    
    // Handle both Severity (Critical/High/Medium/Low) and DetectionSeverity (attest/flag/coach)
    let sev = match severity.to_lowercase().as_str() {
        "critical" | "attest" => ethics::Severity::High, // attest maps to High
        "high" => ethics::Severity::High,
        "medium" | "flag" => ethics::Severity::Medium,
        "low" | "coach" => ethics::Severity::Low,
        _ => ethics::Severity::Low,
    };
    
    attestation::get_quick_picks(&cat, &sev)
}

#[tauri::command]
pub fn consolidate_detections(
    detections_json: String,
) -> Result<Vec<attestation::DetectionGroup>, String> {
    // Frontend sends EthicsDetection[], convert to Detection[]
    let eth_detections: Vec<EthicsDetection> = serde_json::from_str(&detections_json)
        .map_err(|e| format!("{e}"))?;
    let detections: Vec<ethics::Detection> = eth_detections.iter().map(|d| d.into()).collect();
    
    Ok(attestation::consolidate_detections(&detections))
}

#[tauri::command]
pub fn validate_attestation(
    detection_json: String,
    response: String,
    response_note: Option<String>,
) -> Result<(), String> {
    // Frontend sends EthicsDetection, convert to Detection for validation
    let eth_detection: EthicsDetection = serde_json::from_str(&detection_json)
        .map_err(|e| format!("{e}"))?;
    let detection: ethics::Detection = (&eth_detection).into();
    
    let resp = parse_attestation_response(&response)?;
    
    attestation::validate_attestation(&detection, &resp, &response_note)
}

#[tauri::command]
pub fn check_attestation_completeness(
    detections_json: String,
    attestations_json: String,
) -> Result<attestation::AttestationResult, String> {
    // Frontend sends EthicsDetection[], convert to Detection[]
    let eth_detections: Vec<EthicsDetection> = serde_json::from_str(&detections_json)
        .map_err(|e| format!("{e}"))?;
    let detections: Vec<ethics::Detection> = eth_detections.iter().map(|d| d.into()).collect();
    let attestations: Vec<Attestation> = serde_json::from_str(&attestations_json)
        .map_err(|e| format!("{e}"))?;
    
    Ok(attestation::check_attestation_completeness(&detections, &attestations))
}

#[tauri::command]
pub fn calculate_attestation_stats(
    detections_json: String,
    attestations_json: String,
) -> Result<attestation::AttestationStats, String> {
    // Frontend sends EthicsDetection[], convert to Detection[]
    let eth_detections: Vec<EthicsDetection> = serde_json::from_str(&detections_json)
        .map_err(|e| format!("{e}"))?;
    let detections: Vec<ethics::Detection> = eth_detections.iter().map(|d| d.into()).collect();
    let attestations: Vec<Attestation> = serde_json::from_str(&attestations_json)
        .map_err(|e| format!("{e}"))?;
    
    Ok(attestation::calculate_stats(&detections, &attestations))
}

fn parse_attestation_response(s: &str) -> Result<AttestationResponse, String> {
    match s.to_lowercase().replace("_", "").as_str() {
        "addressedinnote" => Ok(AttestationResponse::AddressedInNote),
        "notclinicallyrelevant" => Ok(AttestationResponse::NotClinicallyRelevant),
        "willaddressnextsession" => Ok(AttestationResponse::WillAddressNextSession),
        "consultedsupervisor" => Ok(AttestationResponse::ConsultedSupervisor),
        _ => Err(format!("Unknown attestation response: {}", s)),
    }
}

// ============================================
// Metrics Commands
// ============================================

#[tauri::command]
pub fn record_session_metrics(
    state: State<AppState>,
    metrics_json: String,
) -> Result<(), String> {
    let metrics: metrics::SessionMetrics = serde_json::from_str(&metrics_json)
        .map_err(|e| format!("{e}"))?;
    
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    let conn = vault.get_connection().map_err(|e| format!("{e}"))?;
    
    // Ensure metrics table exists
    metrics::init_metrics_table(conn).map_err(|e| format!("{e}"))?;
    
    metrics::record_session(conn, &metrics).map_err(|e| format!("{e}"))
}

#[tauri::command]
pub fn get_dashboard_metrics(
    state: State<AppState>,
    days: i32,
) -> Result<metrics::DashboardMetrics, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    let conn = vault.get_connection().map_err(|e| format!("{e}"))?;
    
    // Ensure metrics table exists
    metrics::init_metrics_table(conn).map_err(|e| format!("{e}"))?;
    
    metrics::calculate_dashboard_metrics(conn, days).map_err(|e| format!("{e}"))
}

#[tauri::command]
pub fn get_metrics_report(
    state: State<AppState>,
    days: i32,
) -> Result<metrics::MetricsReport, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned".to_string())?;
    let conn = vault.get_connection().map_err(|e| format!("{e}"))?;
    
    // Ensure metrics table exists
    metrics::init_metrics_table(conn).map_err(|e| format!("{e}"))?;
    
    let dashboard = metrics::calculate_dashboard_metrics(conn, days)
        .map_err(|e| format!("{e}"))?;
    
    Ok(metrics::generate_report(&dashboard, days))
}

// ============================================
// Recording Commands
// ============================================

#[tauri::command]
pub fn evaluate_recording_policy(
    attestation_json: String,
    policy_json: Option<String>,
) -> Result<recording::PolicyResult, String> {
    let attestation: recording::ConsentAttestation = serde_json::from_str(&attestation_json)
        .map_err(|e| format!("{e}"))?;
    
    let config = match policy_json {
        Some(json) => recording::load_policy_config(&json)?,
        None => recording::PolicyConfig::default(),
    };
    
    Ok(recording::evaluate_policy(&attestation, &config))
}

#[tauri::command]
pub fn start_recording_session(
    note_id: String,
    client_id: String,
    attestation_json: String,
    policy_json: Option<String>,
) -> Result<recording::RecordingSession, String> {
    let attestation: recording::ConsentAttestation = serde_json::from_str(&attestation_json)
        .map_err(|e| format!("{e}"))?;
    
    let config = match policy_json {
        Some(json) => recording::load_policy_config(&json)?,
        None => recording::PolicyConfig::default(),
    };
    
    recording::start_recording(&note_id, &client_id, &attestation, &config)
}

#[tauri::command]
pub fn get_default_recording_policy() -> recording::PolicyConfig {
    recording::PolicyConfig::default()
}

// ============================================
// Deep Analysis Commands
// ============================================

#[tauri::command]
pub fn create_patient_feature_store(client_id: String) -> analysis::PatientFeatureStore {
    analysis::PatientFeatureStore::new(&client_id)
}

#[tauri::command]
pub fn add_session_to_feature_store(
    store_json: String,
    parsed_note_json: String,
) -> Result<analysis::PatientFeatureStore, String> {
    let mut store: analysis::PatientFeatureStore = serde_json::from_str(&store_json)
        .map_err(|e| format!("{e}"))?;
    let note: analysis::ParsedNote = serde_json::from_str(&parsed_note_json)
        .map_err(|e| format!("{e}"))?;
    
    store.add_session(&note);
    Ok(store)
}

#[tauri::command]
pub fn run_deep_analysis(
    store_json: String,
) -> Result<analysis::DeepAnalysisResult, String> {
    let store: analysis::PatientFeatureStore = serde_json::from_str(&store_json)
        .map_err(|e| format!("{e}"))?;
    
    Ok(analysis::run_deep_analysis(&store))
}

#[tauri::command]
pub fn detect_inconsistencies(
    store_json: String,
) -> Result<Vec<analysis::AnalysisFinding>, String> {
    let store: analysis::PatientFeatureStore = serde_json::from_str(&store_json)
        .map_err(|e| format!("{e}"))?;
    
    Ok(analysis::detect_inconsistencies(&store))
}

#[tauri::command]
pub fn analyze_trajectories(
    store_json: String,
) -> Result<Vec<analysis::TrajectoryCard>, String> {
    let store: analysis::PatientFeatureStore = serde_json::from_str(&store_json)
        .map_err(|e| format!("{e}"))?;
    
    Ok(analysis::analyze_trajectories(&store))
}

#[tauri::command]
pub fn generate_hypotheses(
    store_json: String,
) -> Result<Vec<analysis::Hypothesis>, String> {
    let store: analysis::PatientFeatureStore = serde_json::from_str(&store_json)
        .map_err(|e| format!("{e}"))?;
    
    Ok(analysis::generate_hypotheses(&store))
}

// ============================================
// Cross-Client Search
// ============================================

#[tauri::command]
pub fn search_clients(
    state: State<AppState>,
    query: String,
) -> Result<Vec<crate::models::ClientSearchResult>, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.search_clients(&query).map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn get_client_last_visit(
    state: State<AppState>,
    client_id: String,
) -> Result<Option<String>, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.get_client_last_visit(&client_id).map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn get_client_visit_count_since(
    state: State<AppState>,
    client_id: String,
    since_date: String,
) -> Result<i32, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.get_client_visit_count_since(&client_id, &since_date).map_err(|e| format!("{}", e))
}

// ============================================
// Note Editing
// ============================================

#[tauri::command]
pub fn update_note_content(
    state: State<AppState>,
    note_id: String,
    content: String,
) -> Result<crate::models::Note, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.update_note(&note_id, &content).map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn amend_note(
    state: State<AppState>,
    note_id: String,
    amendment_text: String,
    reason: String,
) -> Result<crate::models::Note, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.amend_note(&note_id, &amendment_text, &reason).map_err(|e| format!("{}", e))
}

// ============================================
// Treatment Progress Analysis
// ============================================

#[tauri::command]
pub fn get_treatment_progress(
    state: State<AppState>,
    client_id: String,
) -> Result<crate::models::TreatmentProgress, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.get_treatment_progress(&client_id).map_err(|e| format!("{}", e))
}

// ============================================
// Document Management
// ============================================

#[tauri::command]
pub fn upload_document(
    state: State<AppState>,
    client_id: String,
    filename: String,
    file_type: String,
    mime_type: String,
    data: Vec<u8>,
    description: Option<String>,
    document_date: Option<String>,
) -> Result<crate::vault::ClientDocument, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.upload_document(
        &client_id,
        &filename,
        &file_type,
        &mime_type,
        &data,
        description.as_deref(),
        document_date.as_deref(),
    ).map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn list_documents(
    state: State<AppState>,
    client_id: String,
) -> Result<Vec<crate::vault::ClientDocument>, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.list_documents(&client_id).map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn get_document_data(
    state: State<AppState>,
    document_id: String,
) -> Result<Vec<u8>, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.get_document_data(&document_id).map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn delete_document(
    state: State<AppState>,
    document_id: String,
) -> Result<(), String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.delete_document(&document_id).map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn search_documents(
    state: State<AppState>,
    query: String,
) -> Result<Vec<crate::vault::ClientDocument>, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.search_documents(&query).map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn update_document_ocr(
    state: State<AppState>,
    document_id: String,
    ocr_text: String,
) -> Result<(), String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.update_document_ocr(&document_id, &ocr_text).map_err(|e| format!("{}", e))
}

// ============================================
// Storage Management
// ============================================

#[tauri::command]
pub fn get_storage_stats(
    state: State<AppState>,
) -> Result<crate::vault::StorageStats, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.get_storage_stats().map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn optimize_database(
    state: State<AppState>,
) -> Result<(), String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.optimize_database().map_err(|e| format!("{}", e))
}

// ============================================
// OCR Processing
// ============================================

/// Run OCR on a document and update its searchable text
#[tauri::command]
pub async fn process_document_ocr(
    state: State<'_, AppState>,
    document_id: String,
) -> Result<String, String> {
    // Get document data
    let data = {
        let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
        vault.get_document_data(&document_id).map_err(|e| format!("{}", e))?
    };
    
    // Write to temp file
    let temp_dir = std::env::temp_dir();
    let temp_path = temp_dir.join(format!("evidify_ocr_{}.tmp", uuid::Uuid::new_v4()));
    
    std::fs::write(&temp_path, &data)
        .map_err(|e| format!("Failed to write temp file: {}", e))?;
    
    // Run tesseract OCR
    let output_base = temp_dir.join(format!("evidify_ocr_out_{}", uuid::Uuid::new_v4()));
    
    let result = std::process::Command::new("tesseract")
        .args([
            temp_path.to_str().unwrap(),
            output_base.to_str().unwrap(),
            "-l", "eng",  // English
            "--psm", "1", // Automatic page segmentation with OSD
        ])
        .output();
    
    // Clean up input temp file
    let _ = std::fs::remove_file(&temp_path);
    
    let output = result.map_err(|e| {
        format!("Tesseract not installed or failed: {}. Install with: brew install tesseract", e)
    })?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("OCR failed: {}", stderr));
    }
    
    // Read output text file
    let output_txt = output_base.with_extension("txt");
    let ocr_text = std::fs::read_to_string(&output_txt)
        .map_err(|e| format!("Failed to read OCR output: {}", e))?;
    
    // Clean up output file
    let _ = std::fs::remove_file(&output_txt);
    
    // Update document with OCR text
    {
        let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
        vault.update_document_ocr(&document_id, &ocr_text)
            .map_err(|e| format!("{}", e))?;
    }
    
    Ok(format!("OCR complete: {} characters extracted", ocr_text.len()))
}

/// Check if OCR (Tesseract) is available
#[tauri::command]
pub fn check_ocr_available() -> bool {
    std::process::Command::new("tesseract")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

// ============================================
// Pre-Session Prep Sheet
// ============================================

#[tauri::command]
pub fn generate_prep_sheet(
    state: State<AppState>,
    client_id: String,
) -> Result<crate::models::PrepSheet, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.generate_prep_sheet(&client_id).map_err(|e| format!("{}", e))
}

// ============================================
// AI Completion Check
// ============================================

#[tauri::command]
pub async fn check_note_completion(
    state: State<'_, AppState>,
    note_id: String,
    model: String,
) -> Result<crate::models::CompletionCheckResult, String> {
    // Get note content
    let note_content = {
        let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
        let note = vault.get_note(&note_id).map_err(|e| format!("{}", e))?;
        note.raw_input.clone()
    };
    
    // Use AI to check completeness
    let prompt = format!(r#"Analyze this clinical progress note for completeness and quality. Check for:
1. Missing required fields (subjective, objective, assessment, plan)
2. Vague or ambiguous language
3. Compliance issues (missing dates, unclear interventions, no diagnosis reference)

Return a JSON object with:
{{
  "is_complete": boolean,
  "overall_score": 0.0-1.0,
  "missing_fields": [{{"field_name": "string", "importance": "required|recommended|optional", "description": "string"}}],
  "vague_sections": [{{"section": "string", "problematic_text": "string", "suggestion": "string"}}],
  "compliance_issues": [{{"issue_type": "string", "description": "string", "severity": "warning|error"}}],
  "suggestions": ["string"]
}}

Note content:
{}

Return ONLY the JSON object, no other text."#, note_content);

    let response = crate::ai::call_ollama(&model, &prompt).await
        .map_err(|e| format!("AI check failed: {}", e))?;
    
    // Parse response
    let result: crate::models::CompletionCheckResult = serde_json::from_str(&response)
        .unwrap_or_else(|_| {
            // Fallback: basic rule-based check
            let content_lower = note_content.to_lowercase();
            let mut missing = Vec::new();
            let mut issues = Vec::new();
            
            if !content_lower.contains("subjective") && !content_lower.contains("client reports") {
                missing.push(crate::models::MissingField {
                    field_name: "Subjective".to_string(),
                    importance: "required".to_string(),
                    description: "No subjective section or client report found".to_string(),
                });
            }
            if !content_lower.contains("assessment") && !content_lower.contains("clinical impression") {
                missing.push(crate::models::MissingField {
                    field_name: "Assessment".to_string(),
                    importance: "required".to_string(),
                    description: "No clinical assessment found".to_string(),
                });
            }
            if !content_lower.contains("plan") && !content_lower.contains("next steps") {
                missing.push(crate::models::MissingField {
                    field_name: "Plan".to_string(),
                    importance: "required".to_string(),
                    description: "No treatment plan documented".to_string(),
                });
            }
            if note_content.len() < 200 {
                issues.push(crate::models::ComplianceIssue {
                    issue_type: "insufficient_detail".to_string(),
                    description: "Note appears too brief for adequate documentation".to_string(),
                    severity: "warning".to_string(),
                });
            }
            
            let score = 1.0 - (missing.len() as f32 * 0.2) - (issues.len() as f32 * 0.1);
            
            crate::models::CompletionCheckResult {
                is_complete: missing.is_empty() && issues.iter().all(|i| i.severity != "error"),
                overall_score: score.max(0.0),
                missing_fields: missing,
                vague_sections: vec![],
                compliance_issues: issues,
                suggestions: vec![
                    "Consider adding more detail to support medical necessity".to_string(),
                ],
            }
        });
    
    Ok(result)
}

// ============================================
// Export to PDF/DOCX
// ============================================

#[tauri::command]
pub fn export_note_to_file(
    state: State<AppState>,
    note_id: String,
    format: String,  // "pdf", "docx", "txt"
    include_header: bool,
) -> Result<Vec<u8>, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    let note = vault.get_note(&note_id).map_err(|e| format!("{}", e))?;
    let client = vault.get_client(&note.client_id).map_err(|e| format!("{}", e))?;
    
    match format.as_str() {
        "txt" => {
            let mut content = String::new();
            if include_header {
                content.push_str(&format!("Client: {}\n", client.display_name));
                content.push_str(&format!("Session Date: {}\n", note.session_date));
                content.push_str(&format!("Note Type: {}\n", note.note_type));
                content.push_str(&format!("Status: {}\n", note.status));
                content.push_str(&format!("Word Count: {}\n", note.word_count));
                content.push_str(&format!("Content Hash: {}\n", note.content_hash));
                content.push_str("\n---\n\n");
            }
            content.push_str(&note.raw_input);
            Ok(content.into_bytes())
        }
        "pdf" => {
            // Generate PDF using simple text-based approach
            let pdf_content = generate_note_pdf(&note, &client, include_header)?;
            Ok(pdf_content)
        }
        "docx" => {
            // Generate DOCX
            let docx_content = generate_note_docx(&note, &client, include_header)?;
            Ok(docx_content)
        }
        _ => Err(format!("Unsupported format: {}", format)),
    }
}

fn generate_note_pdf(note: &crate::models::Note, client: &crate::models::Client, include_header: bool) -> Result<Vec<u8>, String> {
    // Build text content
    let mut body = String::new();
    if include_header {
        body.push_str("CLINICAL PROGRESS NOTE\n\n");
        body.push_str(&format!("Client: {}\n", client.display_name));
        body.push_str(&format!("Session Date: {}\n", note.session_date));
        body.push_str(&format!("Note Type: {}\n", note.note_type));
        body.push_str(&format!("Status: {}\n\n", note.status));
        body.push_str("---\n\n");
    }
    body.push_str(&note.raw_input);
    body.push_str(&format!("\n\n---\nGenerated by Evidify | Hash: {}", &note.content_hash[..12]));
    
    // Split into lines and create text positioning commands
    let mut text_commands = String::new();
    let lines: Vec<&str> = body.lines().collect();
    let mut y_pos = 750i32;
    
    for line in lines {
        if y_pos < 50 {
            break;
        }
        let escaped = line
            .replace("\\", "\\\\")
            .replace("(", "\\(")
            .replace(")", "\\)");
        text_commands.push_str(&format!("50 {} Td ({}) Tj 0 -14 Td\n", y_pos, escaped));
        y_pos = 0;
    }
    
    let stream_content = format!("BT\n/F1 11 Tf\n{}ET", text_commands);
    let stream_length = stream_content.len();
    
    let mut pdf = Vec::new();
    
    pdf.extend_from_slice(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n");
    let obj1_offset = pdf.len();
    pdf.extend_from_slice(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n");
    let obj2_offset = pdf.len();
    pdf.extend_from_slice(b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n");
    let obj3_offset = pdf.len();
    pdf.extend_from_slice(b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n");
    let obj4_offset = pdf.len();
    let obj4 = format!("4 0 obj << /Length {} >>\nstream\n{}\nendstream\nendobj\n", stream_length, stream_content);
    pdf.extend_from_slice(obj4.as_bytes());
    let obj5_offset = pdf.len();
    pdf.extend_from_slice(b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n");
    
    let xref_offset = pdf.len();
    let xref = format!(
        "xref\n0 6\n0000000000 65535 f \n{:010} 00000 n \n{:010} 00000 n \n{:010} 00000 n \n{:010} 00000 n \n{:010} 00000 n \n",
        obj1_offset, obj2_offset, obj3_offset, obj4_offset, obj5_offset
    );
    pdf.extend_from_slice(xref.as_bytes());
    
    let trailer = format!("trailer << /Size 6 /Root 1 0 R >>\nstartxref\n{}\n%%EOF", xref_offset);
    pdf.extend_from_slice(trailer.as_bytes());
    
    Ok(pdf)
}
fn generate_note_docx(note: &crate::models::Note, client: &crate::models::Client, include_header: bool) -> Result<Vec<u8>, String> {
    use std::io::{Write, Cursor};
    use zip::write::FileOptions;
    use zip::ZipWriter;
    
    let mut buffer = Cursor::new(Vec::new());
    let mut zip = ZipWriter::new(&mut buffer);
    let options = FileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    
    // [Content_Types].xml
    zip.start_file("[Content_Types].xml", options).map_err(|e| e.to_string())?;
    zip.write_all(br#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"#).map_err(|e| e.to_string())?;
    
    // _rels/.rels
    zip.start_file("_rels/.rels", options).map_err(|e| e.to_string())?;
    zip.write_all(br#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"#).map_err(|e| e.to_string())?;
    
    // Build document content
    let mut paragraphs = String::new();
    
    if include_header {
        paragraphs.push_str(&format!(r#"<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>CLINICAL PROGRESS NOTE</w:t></w:r></w:p>"#));
        paragraphs.push_str(&format!(r#"<w:p><w:r><w:t>Client: {}</w:t></w:r></w:p>"#, escape_xml(&client.display_name)));
        paragraphs.push_str(&format!(r#"<w:p><w:r><w:t>Session Date: {}</w:t></w:r></w:p>"#, &note.session_date));
        paragraphs.push_str(&format!(r#"<w:p><w:r><w:t>Note Type: {}</w:t></w:r></w:p>"#, &note.note_type));
        paragraphs.push_str(&format!(r#"<w:p><w:r><w:t>Status: {}</w:t></w:r></w:p>"#, &note.status));
        paragraphs.push_str(r#"<w:p><w:r><w:t>---</w:t></w:r></w:p>"#);
    }
    
    // Add note content, paragraph by paragraph
    for line in note.raw_input.lines() {
        if line.is_empty() {
            paragraphs.push_str(r#"<w:p/>"#);
        } else {
            paragraphs.push_str(&format!(r#"<w:p><w:r><w:t>{}</w:t></w:r></w:p>"#, escape_xml(line)));
        }
    }
    
    // Footer
    paragraphs.push_str(r#"<w:p><w:r><w:t>---</w:t></w:r></w:p>"#);
    paragraphs.push_str(&format!(r#"<w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>Generated by Evidify | Hash: {}</w:t></w:r></w:p>"#, &note.content_hash[..12]));
    
    // word/document.xml
    zip.start_file("word/document.xml", options).map_err(|e| e.to_string())?;
    let doc = format!(r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {}
  </w:body>
</w:document>"#, paragraphs);
    zip.write_all(doc.as_bytes()).map_err(|e| e.to_string())?;
    
    zip.finish().map_err(|e| e.to_string())?;
    drop(zip);
    
    Ok(buffer.into_inner())
}

fn escape_xml(s: &str) -> String {
    s.replace("&", "&amp;")
     .replace("<", "&lt;")
     .replace(">", "&gt;")
     .replace("\"", "&quot;")
     .replace("'", "&apos;")
}

// ============================================
// Supervisor Mode
// ============================================

#[tauri::command]
pub fn create_trainee(
    state: State<AppState>,
    name: String,
    email: Option<String>,
    supervisor_id: String,
) -> Result<crate::models::Trainee, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.create_trainee(&name, email.as_deref(), &supervisor_id)
        .map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn list_trainees(
    state: State<AppState>,
    supervisor_id: String,
) -> Result<Vec<crate::models::Trainee>, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.list_trainees(&supervisor_id).map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn submit_note_for_review(
    state: State<AppState>,
    note_id: String,
    trainee_id: String,
) -> Result<(), String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.submit_note_for_review(&note_id, &trainee_id)
        .map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn get_pending_reviews(
    state: State<AppState>,
    supervisor_id: String,
) -> Result<Vec<crate::models::PendingReview>, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.get_pending_reviews(&supervisor_id).map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn add_review_comment(
    state: State<AppState>,
    note_id: String,
    supervisor_id: String,
    comment_type: String,
    text: String,
    section: Option<String>,
) -> Result<crate::models::ReviewComment, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.add_review_comment(&note_id, &supervisor_id, &comment_type, &text, section.as_deref())
        .map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn complete_review(
    state: State<AppState>,
    note_id: String,
    supervisor_id: String,
    status: String,  // "approved", "needs_revision", "rejected"
    overall_feedback: Option<String>,
    clinical_accuracy_score: Option<i32>,
    documentation_quality_score: Option<i32>,
) -> Result<crate::models::SupervisorReview, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.complete_review(
        &note_id,
        &supervisor_id,
        &status,
        overall_feedback.as_deref(),
        clinical_accuracy_score,
        documentation_quality_score,
    ).map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn get_supervisor_dashboard(
    state: State<AppState>,
    supervisor_id: String,
) -> Result<crate::models::SupervisorDashboard, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.get_supervisor_dashboard(&supervisor_id).map_err(|e| format!("{}", e))
}

/// Get pending reviews for a specific trainee
#[tauri::command]
pub fn get_trainee_pending_reviews(
    state: State<AppState>,
    trainee_id: String,
) -> Result<Vec<crate::models::PendingReview>, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.get_trainee_pending_reviews(&trainee_id).map_err(|e| format!("{}", e))
}

#[tauri::command]
pub fn get_note_reviews(
    state: State<AppState>,
    note_id: String,
) -> Result<Vec<crate::models::SupervisorReview>, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.get_note_reviews(&note_id).map_err(|e| format!("{}", e))
}

// ============================================
// HIPAA Safe Harbor De-identification
// ============================================

/// De-identify text using Safe Harbor method (45 CFR 164.514(b)(2))
#[tauri::command]
pub fn deidentify_text(
    text: String,
    use_ai: bool,
) -> Result<crate::deidentify::DeidentificationResult, String> {
    let engine = crate::deidentify::DeidentificationEngine::new(use_ai, None);
    Ok(engine.deidentify(&text))
}

/// De-identify a note and return preview comparison
#[tauri::command]
pub fn deidentify_note(
    state: State<AppState>,
    note_id: String,
    use_ai: bool,
) -> Result<crate::deidentify::DeidentificationResult, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    let note = vault.get_note(&note_id).map_err(|e| format!("{}", e))?;
    
    let engine = crate::deidentify::DeidentificationEngine::new(use_ai, None);
    Ok(engine.deidentify(&note.raw_input))
}

/// AI-enhanced contextual identifier detection
#[tauri::command]
pub async fn detect_contextual_identifiers(
    text: String,
    model: String,
) -> Result<Vec<crate::deidentify::DetectedIdentifier>, String> {
    crate::deidentify::detect_contextual_identifiers(&text, &model).await
}

/// Save de-identification audit trail
#[tauri::command]
pub fn save_deidentification_audit(
    state: State<AppState>,
    note_id: Option<String>,
    client_id: Option<String>,
    result: crate::deidentify::DeidentificationResult,
    ai_enhanced: bool,
) -> Result<crate::deidentify::DeidentificationAudit, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.save_deidentification_audit(note_id.as_deref(), client_id.as_deref(), &result, ai_enhanced)
        .map_err(|e| format!("{}", e))
}

/// Get audit trail for a note
#[tauri::command]
pub fn get_deidentification_audits(
    state: State<AppState>,
    note_id: Option<String>,
) -> Result<Vec<crate::deidentify::DeidentificationAudit>, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.get_deidentification_audits(note_id.as_deref())
        .map_err(|e| format!("{}", e))
}

/// Export de-identified case with audit certificate
#[tauri::command]
pub fn export_deidentified_case(
    state: State<AppState>,
    note_id: String,
    format: String,  // "pdf", "docx", "txt"
    include_audit: bool,
) -> Result<Vec<u8>, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    
    // Get note
    let note = vault.get_note(&note_id).map_err(|e| format!("{}", e))?;
    let client = vault.get_client(&note.client_id).map_err(|e| format!("{}", e))?;
    
    // De-identify
    let engine = crate::deidentify::DeidentificationEngine::new(false, None);
    let result = engine.deidentify(&note.raw_input);
    
    // Build content
    let mut content = String::new();
    content.push_str("═══════════════════════════════════════════════════════════\n");
    content.push_str("              DE-IDENTIFIED CLINICAL CASE\n");
    content.push_str("═══════════════════════════════════════════════════════════\n\n");
    content.push_str(&format!("Case Type: {}\n", note.note_type));
    content.push_str(&format!("Session Period: [DATE REDACTED]\n"));
    content.push_str(&format!("De-identification Method: HIPAA Safe Harbor\n"));
    content.push_str(&format!("Regulation: 45 CFR 164.514(b)(2)\n\n"));
    content.push_str("───────────────────────────────────────────────────────────\n");
    content.push_str("                    CASE CONTENT\n");
    content.push_str("───────────────────────────────────────────────────────────\n\n");
    content.push_str(&result.deidentified_text);
    content.push_str("\n\n");
    
    if include_audit {
        content.push_str("───────────────────────────────────────────────────────────\n");
        content.push_str("              DE-IDENTIFICATION CERTIFICATE\n");
        content.push_str("───────────────────────────────────────────────────────────\n\n");
        content.push_str(&format!("Timestamp: {}\n", result.timestamp));
        content.push_str(&format!("Original Hash: {}\n", &result.original_hash[..16]));
        content.push_str(&format!("De-identified Hash: {}\n", &result.deidentified_hash[..16]));
        content.push_str(&format!("Identifiers Removed: {}\n", result.identifiers_found.len()));
        content.push_str(&format!("Processing Time: {}ms\n", result.processing_time_ms));
        content.push_str(&format!("Safe Harbor Compliant: {}\n\n", result.safe_harbor_compliant));
        
        content.push_str("Categories Removed:\n");
        for (code, count) in &result.category_counts {
            let desc = match code.as_str() {
                "A" => "Names",
                "B" => "Geographic",
                "C" => "Dates",
                "D" => "Phone",
                "E" => "Fax",
                "F" => "Email",
                "G" => "SSN",
                "H" => "Medical Record #",
                "I" => "Health Plan #",
                "J" => "Account #",
                "K" => "License #",
                "L" => "Vehicle ID",
                "M" => "Device ID",
                "N" => "URL",
                "O" => "IP Address",
                "P" => "Biometric",
                "Q" => "Photo",
                "R" => "Other Unique ID",
                "AI" => "AI-Detected Contextual",
                _ => "Unknown",
            };
            content.push_str(&format!("  • {} ({}): {} removed\n", code, desc, count));
        }
        content.push_str("\n");
        content.push_str("This document has been de-identified per HIPAA Safe Harbor\n");
        content.push_str("method. All 18 identifier categories have been reviewed and\n");
        content.push_str("applicable identifiers removed or generalized.\n\n");
        content.push_str("Generated by Evidify | evidify.ai\n");
    }
    
    match format.as_str() {
        "txt" => Ok(content.into_bytes()),
        "pdf" => {
            // Simple PDF generation
            let pdf = generate_deidentified_pdf(&content)?;
            Ok(pdf)
        }
        "docx" => {
            // Generate DOCX
            let docx = generate_deidentified_docx(&content)?;
            Ok(docx)
        }
        _ => Err(format!("Unsupported format: {}", format)),
    }
}

fn generate_deidentified_pdf(content: &str) -> Result<Vec<u8>, String> {
    // Escape for PDF
    let escaped = content
        .replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
        .replace("\n", ") Tj T* (");
    
    let pdf = format!(
        r#"%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length {} >>
stream
BT
/F1 10 Tf
50 750 Td
12 TL
({}) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Courier >> endobj
xref
0 6
0000000000 65535 f 
trailer << /Size 6 /Root 1 0 R >>
startxref
500
%%EOF"#,
        escaped.len() + 50,
        escaped
    );
    
    Ok(pdf.into_bytes())
}

fn generate_deidentified_docx(content: &str) -> Result<Vec<u8>, String> {
    use std::io::{Write, Cursor};
    use zip::write::FileOptions;
    use zip::ZipWriter;
    
    let mut buffer = Cursor::new(Vec::new());
    let mut zip = ZipWriter::new(&mut buffer);
    let options = FileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    
    // [Content_Types].xml
    zip.start_file("[Content_Types].xml", options).map_err(|e| e.to_string())?;
    zip.write_all(br#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"#).map_err(|e| e.to_string())?;
    
    // _rels/.rels
    zip.start_file("_rels/.rels", options).map_err(|e| e.to_string())?;
    zip.write_all(br#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"#).map_err(|e| e.to_string())?;
    
    // Build document content
    let mut paragraphs = String::new();
    for line in content.lines() {
        let escaped_line = line
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;");
        if line.is_empty() {
            paragraphs.push_str(r#"<w:p/>"#);
        } else {
            paragraphs.push_str(&format!(r#"<w:p><w:r><w:t>{}</w:t></w:r></w:p>"#, escaped_line));
        }
    }
    
    // word/document.xml
    zip.start_file("word/document.xml", options).map_err(|e| e.to_string())?;
    let doc = format!(r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {}
  </w:body>
</w:document>"#, paragraphs);
    zip.write_all(doc.as_bytes()).map_err(|e| e.to_string())?;
    
    zip.finish().map_err(|e| e.to_string())?;
    drop(zip);
    
    Ok(buffer.into_inner())
}

// ============================================
// Consultation Draft Queue
// ============================================

/// Create a new consultation draft
#[tauri::command]
pub fn create_consultation_draft(
    state: State<AppState>,
    note_id: String,
    title: String,
    clinical_question: String,
    specialties: Vec<String>,
    urgency: String,
) -> Result<crate::deidentify::ConsultationDraft, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    
    // Get and de-identify note
    let note = vault.get_note(&note_id).map_err(|e| format!("{}", e))?;
    let engine = crate::deidentify::DeidentificationEngine::new(false, None);
    let result = engine.deidentify(&note.raw_input);
    
    // Save audit first
    let audit = vault.save_deidentification_audit(
        Some(&note_id),
        Some(&note.client_id),
        &result,
        false
    ).map_err(|e| format!("{}", e))?;
    
    // Create draft
    vault.create_consultation_draft(
        &result.deidentified_text,
        &title,
        &clinical_question,
        &specialties,
        &urgency,
        &audit.id
    ).map_err(|e| format!("{}", e))
}

/// List all consultation drafts
#[tauri::command]
pub fn list_consultation_drafts(
    state: State<AppState>,
) -> Result<Vec<crate::deidentify::ConsultationDraft>, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.list_consultation_drafts().map_err(|e| format!("{}", e))
}

/// Get a specific draft
#[tauri::command]
pub fn get_consultation_draft(
    state: State<AppState>,
    draft_id: String,
) -> Result<crate::deidentify::ConsultationDraft, String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.get_consultation_draft(&draft_id).map_err(|e| format!("{}", e))
}

/// Update draft status
#[tauri::command]
pub fn update_consultation_draft(
    state: State<AppState>,
    draft_id: String,
    title: Option<String>,
    clinical_question: Option<String>,
    status: Option<String>,
) -> Result<(), String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.update_consultation_draft(&draft_id, title.as_deref(), clinical_question.as_deref(), status.as_deref())
        .map_err(|e| format!("{}", e))
}

/// Delete a draft
#[tauri::command]
pub fn delete_consultation_draft(
    state: State<AppState>,
    draft_id: String,
) -> Result<(), String> {
    let vault = state.vault.lock().map_err(|_| "Vault mutex poisoned")?;
    vault.delete_consultation_draft(&draft_id).map_err(|e| format!("{}", e))
}

// =============================
// Forensic annotation commands
// =============================

/// Lightweight, UI-support store for forensic annotations.
///
/// This is intentionally scoped to the Forensic UI in v4.3.x. It does **not**
/// participate in canonicalization, export writing, verifier logic, or any of
/// the Golden CI fixtures.
#[derive(Default)]
pub struct ForensicState {
    pub annotations: Mutex<HashMap<String, Vec<ForensicAnnotation>>>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ForensicAnnotation {
    pub id: String,
    pub evidence_id: String,
    pub page: Option<u32>,
    pub quote: String,
    pub note: String,
    pub tags: Vec<String>,
    pub created_at_iso: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ApiResult<T> {
    pub status: String,
    pub data: T,
}

fn ok<T>(data: T) -> ApiResult<T> {
    ApiResult {
        status: "success".to_string(),
        data,
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ForensicCreateAnnotationInput {
    pub page: Option<u32>,
    pub quote: String,
    pub note: String,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ForensicCreateAnnotationRequest {
    #[serde(rename = "evidenceId")]
    pub evidence_id: String,
    pub input: ForensicCreateAnnotationInput,
    #[serde(rename = "userId")]
    pub user_id: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ForensicPromoteToClaimInput {
    #[serde(rename = "annotationId")]
    pub annotation_id: String,
    #[serde(rename = "reportId")]
    pub report_id: String,
    #[serde(rename = "sectionId")]
    pub section_id: String,
    #[serde(rename = "claimType")]
    pub claim_type: String,
    #[serde(rename = "claimText")]
    pub claim_text: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ForensicPromoteToClaimRequest {
    pub input: ForensicPromoteToClaimInput,
    #[serde(rename = "userId")]
    pub user_id: Option<String>,
}

#[tauri::command]
pub fn forensic_list_annotations(
    forensic: State<ForensicState>,
    evidence_id: String,
) -> Result<ApiResult<Vec<ForensicAnnotation>>, String> {
    let map = forensic.annotations.lock().map_err(|_| "ForensicState mutex poisoned")?;
    let items = map.get(&evidence_id).cloned().unwrap_or_default();
    Ok(ok(items))
}

#[tauri::command]
pub fn forensic_create_annotation(
    forensic: State<ForensicState>,
    req: ForensicCreateAnnotationRequest,
) -> Result<ApiResult<ForensicAnnotation>, String> {
    if req.evidence_id.trim().is_empty() {
        return Err("evidenceId is required".to_string());
    }
    if req.input.quote.trim().is_empty() {
        return Err("quote is required".to_string());
    }

    let mut map = forensic.annotations.lock().map_err(|_| "ForensicState mutex poisoned")?;

    let a = ForensicAnnotation {
        id: uuid::Uuid::new_v4().to_string(),
        evidence_id: req.evidence_id.clone(),
        page: req.input.page,
        quote: req.input.quote,
        note: req.input.note,
        tags: req.input.tags,
        created_at_iso: chrono::Utc::now().to_rfc3339(),
    };

    map.entry(req.evidence_id).or_default().push(a.clone());
    Ok(ok(a))
}

/// For v4.3.x, promotion is acknowledged and returned as a stub success.
/// Persisting promoted claims into the forensic report model is tracked
/// separately and will integrate with the existing export pipeline later.
#[tauri::command]
pub fn forensic_promote_to_claim(
    _state: State<AppState>,
    req: ForensicPromoteToClaimRequest,
) -> Result<ApiResult<serde_json::Value>, String> {
    // Validate required fields to avoid silent success.
    let i = &req.input;
    if i.annotation_id.trim().is_empty() {
        return Err("annotationId is required".to_string());
    }
    if i.report_id.trim().is_empty() {
        return Err("reportId is required".to_string());
    }
    if i.section_id.trim().is_empty() {
        return Err("sectionId is required".to_string());
    }
    if i.claim_text.trim().is_empty() {
        return Err("claimText is required".to_string());
    }

    Ok(ok(serde_json::json!({
        "promoted": true,
        "annotationId": i.annotation_id,
        "reportId": i.report_id,
        "sectionId": i.section_id,
        "claimType": i.claim_type,
    })))
}
