// Evidify v9 - Local-First Clinical Documentation Platform
// 
// Security Architecture:
// - All PHI encrypted at rest (SQLCipher + AES-256-GCM)
// - Keys stored in OS keychain (never in app memory long-term)
// - No PHI transmitted over network
// - Hash-chained audit logs
// - Signed builds with SBOM

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod crypto;
mod vault;
mod audit;
mod ethics;
mod ai;
mod models;
mod commands;
mod export;
mod voice;
mod rag;
mod attestation;
mod metrics;
mod recording;
mod analysis;
mod clipboard;
mod policy;
mod supervision;
mod siem;
mod audit_pack;
mod time_tracking;
mod ehr_export;
mod legal_export;
mod performance;
mod deidentify;

use std::sync::Mutex;
use tauri::Manager;
use commands::AppState;
use vault::Vault;

fn main() {
    env_logger::init();
    
    tauri::Builder::default()
        .setup(|app| {
            // Initialize vault directory
            let app_dir = app.path_resolver()
                .app_data_dir()
                .expect("Failed to get app data directory");
            
            std::fs::create_dir_all(&app_dir).ok();
            
            log::info!("Evidify starting, data dir: {:?}", app_dir);
            
            // Create vault instance
            let vault = Vault::new(app_dir);
            
            // Manage app state
            app.manage(AppState {
                vault: Mutex::new(vault),
            });

            // Forensic UI command state (in-memory store).
            // NOTE: This does not touch export/canonicalization/verifier code paths.
            app.manage(commands::ForensicState::default());
            
            // Manage clipboard state
            app.manage(clipboard::ClipboardState::default());
            
            // Manage policy state
            app.manage(policy::PolicyState::default());
            
            // Manage supervision state
            app.manage(supervision::SupervisionState::default());
            
            // Manage SIEM state
            app.manage(siem::SiemState::default());
            
            // Manage time tracking state
            app.manage(time_tracking::TimeTrackerState::default());
            
            // Manage performance state
            app.manage(performance::PerformanceState::default());
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Vault commands
            commands::vault_exists,
            commands::create_vault,
            commands::unlock_vault,
            commands::lock_vault,
            commands::vault_status,
            commands::vault_clear_stale_keychain,
            commands::vault_delete_db,
            
            // Client commands
            commands::create_client,
            commands::list_clients,
            commands::get_client,
            commands::update_client,
            
            // Note commands
            commands::create_note,
            commands::get_note,
            commands::list_notes,
            commands::update_note,
            commands::update_structured_note,
            commands::sign_note,
            commands::export_note,
            
            // Ethics commands
            commands::analyze_ethics,
            commands::resolve_detection,
            
            // AI commands
            commands::check_ollama,
            commands::structure_note_ai,
            commands::embed_text,
            commands::search_notes,
            
            // Export commands
            commands::classify_export_path,
            commands::validate_export_path,
            
            // Voice commands
            commands::list_whisper_models,
            commands::get_transcript_text,
            commands::transcribe_audio,
            commands::voice_to_structured_note,
            commands::get_voice_status,
            commands::transcribe_audio_base64,
            commands::structure_voice_note,
            
            // RAG / Semantic search commands
            commands::index_note_for_search,
            commands::search_notes_semantic,
            commands::rag_query_notes,
            commands::get_search_index_stats,
            commands::reindex_all_notes_for_search,
            
            // Attestation commands
            commands::get_quick_picks,
            commands::consolidate_detections,
            commands::validate_attestation,
            commands::check_attestation_completeness,
            commands::calculate_attestation_stats,
            
            // Metrics commands
            commands::record_session_metrics,
            commands::get_dashboard_metrics,
            commands::get_metrics_report,
            
            // Recording commands
            commands::evaluate_recording_policy,
            commands::start_recording_session,
            commands::get_default_recording_policy,
            
            // Deep Analysis commands
            commands::create_patient_feature_store,
            commands::add_session_to_feature_store,
            commands::run_deep_analysis,
            commands::detect_inconsistencies,
            commands::analyze_trajectories,
            commands::generate_hypotheses,
            
            // Cross-Client Search
            commands::search_clients,
            commands::get_client_last_visit,
            commands::get_client_visit_count_since,
            
            // Note Editing
            commands::update_note_content,
            commands::amend_note,
            
            // Treatment Progress
            commands::get_treatment_progress,
            
            // Document Management
            commands::upload_document,
            commands::list_documents,
            commands::get_document_data,
            commands::delete_document,
            commands::search_documents,
            commands::update_document_ocr,
            
            // Storage Management
            commands::get_storage_stats,
            commands::optimize_database,
            
            // OCR Processing
            commands::process_document_ocr,
            commands::check_ocr_available,
            
            // Voice/Whisper
            commands::download_whisper_model,
            
            // Pre-Session Prep Sheet
            commands::generate_prep_sheet,
            
            // AI Completion Check
            commands::check_note_completion,
            
            // Export
            commands::export_note_to_file,
            
            // Supervisor Mode
            commands::create_trainee,
            commands::list_trainees,
            commands::submit_note_for_review,
            commands::get_pending_reviews,
            commands::add_review_comment,
            commands::complete_review,
            commands::get_supervisor_dashboard,
            commands::get_trainee_pending_reviews,
            commands::get_note_reviews,
            
            // Audit commands
            commands::get_audit_log,
            commands::verify_audit_chain,
            
            // Clipboard commands
            clipboard::clipboard_copy,
            clipboard::clipboard_clear,
            clipboard::clipboard_get_policy,
            clipboard::clipboard_set_policy,
            clipboard::clipboard_has_pending,
            
            // Policy commands
            policy::get_active_policy,
            policy::load_policy_from_file,
            policy::check_export_policy,
            policy::check_attestation_policy,
            policy::get_policy_version,
            
            // Supervision commands
            supervision::get_review_queue,
            supervision::add_feedback_annotation,
            supervision::get_note_annotations,
            supervision::cosign_note,
            supervision::get_cosignature,
            supervision::check_cosign_required,
            supervision::update_competency_rating,
            supervision::get_competency_records,
            
            // SIEM commands
            siem::configure_siem,
            siem::get_siem_status,
            siem::flush_siem_buffer,
            
            // Audit Pack commands
            audit_pack::generate_audit_pack,
            audit_pack::export_audit_pack,
            
            // Time Tracking commands
            time_tracking::record_time_metrics,
            time_tracking::get_time_metrics,
            time_tracking::get_efficiency_score,
            
            // EHR Export commands
            ehr_export::get_ehr_targets,
            ehr_export::export_to_ehr,
            
            // Legal Export commands
            legal_export::generate_legal_report,
            legal_export::export_legal_report,
            
            // Performance commands
            performance::get_performance_stats,
            performance::clear_caches,
            performance::get_notes_paginated,
            
            // De-identification commands (HIPAA Safe Harbor)
            commands::deidentify_text,
            commands::deidentify_note,
            commands::detect_contextual_identifiers,
            commands::save_deidentification_audit,
            commands::get_deidentification_audits,
            commands::export_deidentified_case,
            commands::create_consultation_draft,
            commands::list_consultation_drafts,
            commands::get_consultation_draft,
            commands::update_consultation_draft,
            commands::delete_consultation_draft,

            // Forensic UI support commands (annotations / promotion)
            commands::forensic_list_annotations,
            commands::forensic_create_annotation,
            commands::forensic_promote_to_claim,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
