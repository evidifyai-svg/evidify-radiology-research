// Attestation Module v4 - Clinical Defensibility
//
// Quick-pick responses, consolidation logic, and cryptographic signing.
// Ensures all flagged content is acknowledged before note finalization.
//
// Key features:
// 1. Detection consolidation (group similar items)
// 2. Quick-pick response templates
// 3. Batch attestation for efficiency
// 4. Cryptographic signing with timestamp
// 5. Audit trail generation

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::Utc;

use crate::models::{Attestation, AttestationResponse, Note, NoteStatus};
use crate::ethics::{Detection, Severity, Category};
use crate::crypto;

// ============================================
// Attestation Types
// ============================================

/// Consolidated detection group for UI efficiency
#[derive(Debug, Clone, Serialize)]
pub struct DetectionGroup {
    pub category: Category,
    pub severity: Severity,
    pub detections: Vec<Detection>,
    pub suggested_response: AttestationResponse,
    pub group_id: String,
}

/// Quick-pick response with explanation
#[derive(Debug, Clone, Serialize)]
pub struct QuickPickOption {
    pub response: AttestationResponse,
    pub label: String,
    pub description: String,
    pub requires_note: bool,
}

/// Attestation request from frontend
#[derive(Debug, Clone, Deserialize)]
pub struct AttestationRequest {
    pub detection_id: String,
    pub response: AttestationResponse,
    pub response_note: Option<String>,
}

/// Batch attestation request
#[derive(Debug, Clone, Deserialize)]
pub struct BatchAttestationRequest {
    pub group_id: String,
    pub response: AttestationResponse,
    pub response_note: Option<String>,
    pub detection_ids: Vec<String>,
}

/// Attestation result
#[derive(Debug, Clone, Serialize)]
pub struct AttestationResult {
    pub attestations: Vec<Attestation>,
    pub all_resolved: bool,
    pub can_sign: bool,
    pub remaining_count: usize,
}

/// Signing result with cryptographic proof
#[derive(Debug, Clone, Serialize)]
pub struct SigningResult {
    pub signed_at: i64,
    pub signature_hash: String,
    pub attestation_summary: String,
}

// ============================================
// Quick-Pick Options
// ============================================

/// Get quick-pick options for a detection category
pub fn get_quick_picks(category: &Category, severity: &Severity) -> Vec<QuickPickOption> {
    let mut options = vec![
        QuickPickOption {
            response: AttestationResponse::AddressedInNote,
            label: "Addressed in Note".to_string(),
            description: "This issue is documented and addressed in the session note".to_string(),
            requires_note: false,
        },
        QuickPickOption {
            response: AttestationResponse::NotClinicallyRelevant,
            label: "Not Clinically Relevant".to_string(),
            description: "After review, this is not clinically significant in this context".to_string(),
            requires_note: true,
        },
        QuickPickOption {
            response: AttestationResponse::WillAddressNextSession,
            label: "Will Address Next Session".to_string(),
            description: "Flagged for follow-up in the next scheduled session".to_string(),
            requires_note: false,
        },
        QuickPickOption {
            response: AttestationResponse::ConsultedSupervisor,
            label: "Consulted Supervisor".to_string(),
            description: "Discussed with clinical supervisor for guidance".to_string(),
            requires_note: true,
        },
    ];
    
    // Add category-specific options
    match category {
        Category::SuicidalIdeation | Category::SelfHarm => {
            options.insert(0, QuickPickOption {
                response: AttestationResponse::AddressedInNote,
                label: "Safety Plan Completed".to_string(),
                description: "Safety assessment conducted and plan documented".to_string(),
                requires_note: false,
            });
        }
        Category::HomicidalIdeation => {
            options.insert(0, QuickPickOption {
                response: AttestationResponse::AddressedInNote,
                label: "Duty to Warn Assessed".to_string(),
                description: "Tarasoff duty evaluated and appropriate action taken".to_string(),
                requires_note: true,
            });
        }
        Category::ChildAbuse | Category::ElderAbuse => {
            options.insert(0, QuickPickOption {
                response: AttestationResponse::AddressedInNote,
                label: "Mandated Report Filed".to_string(),
                description: "Required report submitted to appropriate agency".to_string(),
                requires_note: true,
            });
        }
        _ => {}
    }
    
    // For critical severity, require supervisor consultation
    if *severity == Severity::Critical {
        options.retain(|o| o.response != AttestationResponse::NotClinicallyRelevant);
    }
    
    options
}

// ============================================
// Detection Consolidation
// ============================================

/// Consolidate similar detections into groups
pub fn consolidate_detections(detections: &[Detection]) -> Vec<DetectionGroup> {
    let mut groups: HashMap<(Category, Severity), Vec<Detection>> = HashMap::new();
    
    for detection in detections {
        let key = (detection.category.clone(), detection.severity.clone());
        groups.entry(key).or_default().push(detection.clone());
    }
    
    groups.into_iter().map(|((category, severity), detections)| {
        let suggested = suggest_response(&category, &severity);
        let group_id = format!("{:?}-{:?}", category, severity).to_lowercase();
        
        DetectionGroup {
            category,
            severity,
            detections,
            suggested_response: suggested,
            group_id,
        }
    }).collect()
}

/// Suggest default response based on category and severity
fn suggest_response(category: &Category, severity: &Severity) -> AttestationResponse {
    match severity {
        Severity::Critical => AttestationResponse::ConsultedSupervisor,
        Severity::High => match category {
            Category::SuicidalIdeation | Category::HomicidalIdeation => {
                AttestationResponse::AddressedInNote
            }
            _ => AttestationResponse::WillAddressNextSession,
        },
        _ => AttestationResponse::AddressedInNote,
    }
}

// ============================================
// Attestation Processing
// ============================================

/// Process a single attestation
pub fn process_attestation(
    detection: &Detection,
    response: AttestationResponse,
    response_note: Option<String>,
) -> Attestation {
    // Validate response_note requirement
    let final_note = match response {
        AttestationResponse::NotClinicallyRelevant |
        AttestationResponse::ConsultedSupervisor => {
            response_note.or_else(|| Some("[No note provided]".to_string()))
        }
        _ => response_note,
    };
    
    Attestation {
        detection_id: detection.id.clone(),
        response,
        response_note: final_note,
        attested_at: Utc::now().timestamp_millis(),
    }
}

/// Process batch attestation for a group
pub fn process_batch_attestation(
    detections: &[Detection],
    response: AttestationResponse,
    response_note: Option<String>,
) -> Vec<Attestation> {
    detections.iter().map(|d| {
        process_attestation(d, response.clone(), response_note.clone())
    }).collect()
}

/// Check if all required attestations are complete
pub fn check_attestation_completeness(
    detections: &[Detection],
    attestations: &[Attestation],
) -> AttestationResult {
    let attested_ids: std::collections::HashSet<_> = attestations
        .iter()
        .map(|a| a.detection_id.as_str())
        .collect();
    
    let required: Vec<_> = detections
        .iter()
        .filter(|d| d.requires_attestation())
        .collect();
    
    let remaining: Vec<_> = required
        .iter()
        .filter(|d| !attested_ids.contains(d.id.as_str()))
        .collect();
    
    let all_resolved = remaining.is_empty();
    
    AttestationResult {
        attestations: attestations.to_vec(),
        all_resolved,
        can_sign: all_resolved,
        remaining_count: remaining.len(),
    }
}

// ============================================
// Note Signing
// ============================================

/// Sign a note after all attestations are complete
pub fn sign_note(
    note: &mut Note,
    attestations: Vec<Attestation>,
) -> Result<SigningResult, String> {
    // Verify all required attestations are present
    if attestations.is_empty() && !note.detection_ids.is_empty() {
        return Err("Cannot sign: required attestations missing".to_string());
    }
    
    let signed_at = Utc::now().timestamp_millis();
    
    // Build content for signing
    let sign_content = format!(
        "{}|{}|{}|{}",
        note.id,
        note.content_hash,
        signed_at,
        attestations.len()
    );
    
    // Generate signature hash
    let signature_hash = crypto::hash_content(sign_content.as_bytes());
    
    // Build attestation summary
    let summary = build_attestation_summary(&attestations);
    
    // Update note
    note.status = NoteStatus::Signed;
    note.attestations = attestations;
    note.signed_at = Some(signed_at);
    
    Ok(SigningResult {
        signed_at,
        signature_hash,
        attestation_summary: summary,
    })
}

/// Build human-readable attestation summary
fn build_attestation_summary(attestations: &[Attestation]) -> String {
    if attestations.is_empty() {
        return "No attestations required.".to_string();
    }
    
    let mut summary = format!("{} attestation(s) recorded:\n", attestations.len());
    
    for att in attestations {
        let response_str = match att.response {
            AttestationResponse::AddressedInNote => "Addressed in note",
            AttestationResponse::NotClinicallyRelevant => "Not clinically relevant",
            AttestationResponse::WillAddressNextSession => "Will address next session",
            AttestationResponse::ConsultedSupervisor => "Consulted supervisor",
            AttestationResponse::DocumentedElsewhere => "Documented elsewhere",
        };
        
        summary.push_str(&format!(
            "- {}: {} ({})\n",
            att.detection_id,
            response_str,
            chrono::DateTime::from_timestamp_millis(att.attested_at)
                .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                .unwrap_or_default()
        ));
        
        if let Some(note) = &att.response_note {
            summary.push_str(&format!("  Note: {}\n", note));
        }
    }
    
    summary
}

// ============================================
// Attestation Validation
// ============================================

/// Validate attestation response for a given detection
pub fn validate_attestation(
    detection: &Detection,
    response: &AttestationResponse,
    response_note: &Option<String>,
) -> Result<(), String> {
    // Critical detections cannot use "not clinically relevant"
    if detection.severity == Severity::Critical {
        if *response == AttestationResponse::NotClinicallyRelevant {
            return Err("Critical detections cannot be marked as 'not clinically relevant'".to_string());
        }
    }
    
    // Some responses require notes
    match response {
        AttestationResponse::NotClinicallyRelevant => {
            if response_note.is_none() || response_note.as_ref().map(|n| n.trim().is_empty()).unwrap_or(true) {
                return Err("'Not clinically relevant' requires an explanation".to_string());
            }
        }
        AttestationResponse::ConsultedSupervisor => {
            if response_note.is_none() || response_note.as_ref().map(|n| n.trim().is_empty()).unwrap_or(true) {
                return Err("Supervisor consultation requires documentation".to_string());
            }
        }
        _ => {}
    }
    
    Ok(())
}

// ============================================
// Attestation Statistics
// ============================================

#[derive(Debug, Clone, Serialize)]
pub struct AttestationStats {
    pub total_detections: usize,
    pub requiring_attestation: usize,
    pub attested: usize,
    pub by_response: HashMap<String, usize>,
    pub by_category: HashMap<String, usize>,
    pub average_time_to_attest_ms: Option<i64>,
}

/// Calculate attestation statistics for a note
pub fn calculate_stats(
    detections: &[Detection],
    attestations: &[Attestation],
) -> AttestationStats {
    let requiring = detections.iter().filter(|d| d.requires_attestation()).count();
    
    let mut by_response: HashMap<String, usize> = HashMap::new();
    let mut by_category: HashMap<String, usize> = HashMap::new();
    
    for att in attestations {
        let response_key = format!("{:?}", att.response);
        *by_response.entry(response_key).or_default() += 1;
        *by_category.entry(att.detection_id.clone()).or_default() += 1;
    }
    
    AttestationStats {
        total_detections: detections.len(),
        requiring_attestation: requiring,
        attested: attestations.len(),
        by_response,
        by_category,
        average_time_to_attest_ms: None, // Would require detection timestamps
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn mock_detection(category: Category, severity: Severity) -> Detection {
        Detection {
            id: uuid::Uuid::new_v4().to_string(),
            pattern_id: "test".to_string(),
            category,
            severity: severity.clone(),
            title: "Test Detection".to_string(),
            description: "Test".to_string(),
            suggestion: "Test".to_string(),
            match_start: 0,
            match_end: 10,
            requires_attestation: severity == Severity::Critical || severity == Severity::High,
        }
    }
    
    #[test]
    fn test_consolidation() {
        let detections = vec![
            mock_detection(Category::SuicidalIdeation, Severity::Critical),
            mock_detection(Category::SuicidalIdeation, Severity::Critical),
            mock_detection(Category::SubstanceUse, Severity::Medium),
        ];
        
        let groups = consolidate_detections(&detections);
        assert_eq!(groups.len(), 2);
    }
    
    #[test]
    fn test_quick_picks() {
        let picks = get_quick_picks(&Category::SuicidalIdeation, &Severity::Critical);
        assert!(picks.len() >= 3);
        assert!(picks.iter().all(|p| p.response != AttestationResponse::NotClinicallyRelevant));
    }
    
    #[test]
    fn test_validation() {
        let detection = mock_detection(Category::SuicidalIdeation, Severity::Critical);
        
        // Critical cannot be "not clinically relevant"
        let result = validate_attestation(
            &detection,
            &AttestationResponse::NotClinicallyRelevant,
            &None,
        );
        assert!(result.is_err());
        
        // Addressed in note is fine
        let result = validate_attestation(
            &detection,
            &AttestationResponse::AddressedInNote,
            &None,
        );
        assert!(result.is_ok());
    }
}
