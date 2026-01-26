// Supervision Workflow Module
//
// Manages supervisor-supervisee relationships and co-signature workflows:
// - Supervisor assignments
// - Review queue management
// - Co-signature requirements
// - Feedback annotations
// - Competency tracking
//
// Designed for training programs, group practices, and compliance requirements.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SupervisionError {
    #[error("Supervisor not found: {0}")]
    SupervisorNotFound(String),
    
    #[error("Supervisee not found: {0}")]
    SuperviseeNotFound(String),
    
    #[error("Note not found: {0}")]
    NoteNotFound(String),
    
    #[error("Not authorized: {0}")]
    NotAuthorized(String),
    
    #[error("Co-signature already exists")]
    AlreadyCoSigned,
    
    #[error("Note not signed by supervisee")]
    NoteNotSigned,
    
    #[error("Review delay exceeded: {0} hours")]
    ReviewDelayExceeded(u32),
}

// ============================================
// Supervision Data Structures
// ============================================

/// Credential level for supervision requirements
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CredentialLevel {
    /// Psychology intern
    Intern,
    /// Practicum student
    Trainee,
    /// Postdoctoral fellow
    Postdoc,
    /// Provisionally licensed (pre-full-licensure)
    ProvisionallyLicensed,
    /// Fully licensed clinician
    Licensed,
    /// Licensed supervisor
    Supervisor,
}

impl CredentialLevel {
    /// Check if this credential level requires supervision
    pub fn requires_supervision(&self) -> bool {
        matches!(self, 
            CredentialLevel::Intern | 
            CredentialLevel::Trainee | 
            CredentialLevel::Postdoc |
            CredentialLevel::ProvisionallyLicensed
        )
    }
    
    /// Check if this credential level can supervise
    pub fn can_supervise(&self) -> bool {
        matches!(self, CredentialLevel::Supervisor)
    }
}

/// Supervision relationship between supervisor and supervisee
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupervisionRelationship {
    /// Unique relationship ID
    pub id: String,
    /// Supervisor user ID
    pub supervisor_id: String,
    /// Supervisor name
    pub supervisor_name: String,
    /// Supervisor credentials
    pub supervisor_credentials: String,
    /// Supervisee user ID
    pub supervisee_id: String,
    /// Supervisee name
    pub supervisee_name: String,
    /// Supervisee credential level
    pub supervisee_level: CredentialLevel,
    /// Relationship start date
    pub start_date: DateTime<Utc>,
    /// Relationship end date (None = ongoing)
    pub end_date: Option<DateTime<Utc>>,
    /// Co-signature required for all notes
    pub cosign_required: bool,
    /// Review required for high-risk notes
    pub review_high_risk: bool,
    /// Maximum hours before review is overdue
    pub max_review_hours: u32,
    /// Relationship is active
    pub active: bool,
}

/// Item in supervisor's review queue
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewQueueItem {
    /// Note ID
    pub note_id: String,
    /// Client display name
    pub client_name: String,
    /// Note type
    pub note_type: String,
    /// Supervisee who created the note
    pub supervisee_id: String,
    /// Supervisee name
    pub supervisee_name: String,
    /// When the note was signed by supervisee
    pub signed_at: DateTime<Utc>,
    /// Hours since signature
    pub hours_pending: f64,
    /// Priority level
    pub priority: ReviewPriority,
    /// Risk flags present
    pub has_risk_flags: bool,
    /// Number of detections requiring attention
    pub detection_count: u32,
    /// Whether review is overdue
    pub is_overdue: bool,
}

/// Priority level for review queue
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ReviewPriority {
    /// Critical safety concern - immediate review needed
    Urgent,
    /// Standard review timeline
    Normal,
    /// Lower priority (no time-sensitive content)
    Low,
}

/// Feedback annotation on a note
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedbackAnnotation {
    /// Unique annotation ID
    pub id: String,
    /// Note ID this annotates
    pub note_id: String,
    /// Annotation type
    pub annotation_type: AnnotationType,
    /// Start offset in note content (optional)
    pub start_offset: Option<usize>,
    /// End offset in note content (optional)
    pub end_offset: Option<usize>,
    /// Feedback content
    pub content: String,
    /// Created by (supervisor ID)
    pub created_by: String,
    /// Created at
    pub created_at: DateTime<Utc>,
    /// Acknowledged by supervisee
    pub acknowledged: bool,
    /// Acknowledged at
    pub acknowledged_at: Option<DateTime<Utc>>,
}

/// Type of feedback annotation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AnnotationType {
    /// Highlight a strength
    Strength,
    /// Suggest improvement
    Improvement,
    /// Flag critical concern
    Critical,
    /// Ask clarifying question
    Question,
    /// Teaching point with resource
    Teaching,
    /// General comment
    Comment,
}

/// Co-signature record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoSignature {
    /// Note ID
    pub note_id: String,
    /// Supervisor ID
    pub supervisor_id: String,
    /// Supervisor name
    pub supervisor_name: String,
    /// Supervisor credentials
    pub supervisor_credentials: String,
    /// Co-signature timestamp
    pub signed_at: DateTime<Utc>,
    /// Hours between supervisee signature and co-signature
    pub review_delay_hours: f64,
    /// Any conditions or notes
    pub conditions: Option<String>,
    /// Cryptographic signature
    pub signature: String,
}

/// Competency tracking record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompetencyRecord {
    /// Supervisee ID
    pub supervisee_id: String,
    /// Competency area
    pub competency_area: String,
    /// Current rating (1-5)
    pub rating: u8,
    /// Rating history
    pub history: Vec<CompetencyRating>,
    /// Last updated
    pub updated_at: DateTime<Utc>,
    /// Notes/evidence
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompetencyRating {
    pub rating: u8,
    pub date: DateTime<Utc>,
    pub rater_id: String,
    pub evidence: Option<String>,
}

// ============================================
// Supervision Manager
// ============================================

/// Manages supervision relationships and workflows
pub struct SupervisionManager {
    /// Active supervision relationships
    relationships: HashMap<String, SupervisionRelationship>,
    /// Review queue
    review_queue: Vec<ReviewQueueItem>,
    /// Annotations
    annotations: HashMap<String, Vec<FeedbackAnnotation>>,
    /// Co-signatures
    cosignatures: HashMap<String, CoSignature>,
    /// Competency records
    competencies: HashMap<String, Vec<CompetencyRecord>>,
}

impl SupervisionManager {
    pub fn new() -> Self {
        Self {
            relationships: HashMap::new(),
            review_queue: Vec::new(),
            annotations: HashMap::new(),
            cosignatures: HashMap::new(),
            competencies: HashMap::new(),
        }
    }
    
    /// Create a new supervision relationship
    pub fn create_relationship(
        &mut self,
        relationship: SupervisionRelationship,
    ) -> Result<(), SupervisionError> {
        self.relationships.insert(relationship.id.clone(), relationship);
        Ok(())
    }
    
    /// Get supervisor for a supervisee
    pub fn get_supervisor(&self, supervisee_id: &str) -> Option<&SupervisionRelationship> {
        self.relationships.values()
            .find(|r| r.supervisee_id == supervisee_id && r.active)
    }
    
    /// Get supervisees for a supervisor
    pub fn get_supervisees(&self, supervisor_id: &str) -> Vec<&SupervisionRelationship> {
        self.relationships.values()
            .filter(|r| r.supervisor_id == supervisor_id && r.active)
            .collect()
    }
    
    /// Add note to review queue
    pub fn add_to_review_queue(&mut self, item: ReviewQueueItem) {
        self.review_queue.push(item);
        self.sort_review_queue();
    }
    
    /// Get review queue for supervisor
    pub fn get_review_queue(&self, supervisor_id: &str) -> Vec<&ReviewQueueItem> {
        // Get supervisees for this supervisor
        let supervisee_ids: Vec<&str> = self.relationships.values()
            .filter(|r| r.supervisor_id == supervisor_id && r.active)
            .map(|r| r.supervisee_id.as_str())
            .collect();
        
        self.review_queue.iter()
            .filter(|item| supervisee_ids.contains(&item.supervisee_id.as_str()))
            .collect()
    }
    
    /// Sort review queue by priority and age
    fn sort_review_queue(&mut self) {
        self.review_queue.sort_by(|a, b| {
            // First by priority
            let priority_order = |p: &ReviewPriority| match p {
                ReviewPriority::Urgent => 0,
                ReviewPriority::Normal => 1,
                ReviewPriority::Low => 2,
            };
            
            let priority_cmp = priority_order(&a.priority).cmp(&priority_order(&b.priority));
            if priority_cmp != std::cmp::Ordering::Equal {
                return priority_cmp;
            }
            
            // Then by overdue status
            if a.is_overdue != b.is_overdue {
                return b.is_overdue.cmp(&a.is_overdue);
            }
            
            // Then by hours pending (oldest first)
            b.hours_pending.partial_cmp(&a.hours_pending).unwrap_or(std::cmp::Ordering::Equal)
        });
    }
    
    /// Add feedback annotation
    pub fn add_annotation(
        &mut self,
        annotation: FeedbackAnnotation,
    ) -> Result<(), SupervisionError> {
        self.annotations
            .entry(annotation.note_id.clone())
            .or_insert_with(Vec::new)
            .push(annotation);
        Ok(())
    }
    
    /// Get annotations for a note
    pub fn get_annotations(&self, note_id: &str) -> Vec<&FeedbackAnnotation> {
        self.annotations
            .get(note_id)
            .map(|v| v.iter().collect())
            .unwrap_or_default()
    }
    
    /// Add co-signature
    pub fn add_cosignature(
        &mut self,
        cosignature: CoSignature,
    ) -> Result<(), SupervisionError> {
        if self.cosignatures.contains_key(&cosignature.note_id) {
            return Err(SupervisionError::AlreadyCoSigned);
        }
        
        // Remove from review queue
        self.review_queue.retain(|item| item.note_id != cosignature.note_id);
        
        self.cosignatures.insert(cosignature.note_id.clone(), cosignature);
        Ok(())
    }
    
    /// Get co-signature for a note
    pub fn get_cosignature(&self, note_id: &str) -> Option<&CoSignature> {
        self.cosignatures.get(note_id)
    }
    
    /// Check if note requires co-signature
    pub fn requires_cosignature(&self, supervisee_id: &str) -> bool {
        self.get_supervisor(supervisee_id)
            .map(|r| r.cosign_required)
            .unwrap_or(false)
    }
    
    /// Update competency rating
    pub fn update_competency(
        &mut self,
        supervisee_id: &str,
        competency_area: &str,
        rating: u8,
        rater_id: &str,
        evidence: Option<String>,
    ) -> Result<(), SupervisionError> {
        let records = self.competencies
            .entry(supervisee_id.to_string())
            .or_insert_with(Vec::new);
        
        // Find existing record for this area
        if let Some(record) = records.iter_mut()
            .find(|r| r.competency_area == competency_area) 
        {
            record.history.push(CompetencyRating {
                rating,
                date: Utc::now(),
                rater_id: rater_id.to_string(),
                evidence,
            });
            record.rating = rating;
            record.updated_at = Utc::now();
        } else {
            // Create new record
            records.push(CompetencyRecord {
                supervisee_id: supervisee_id.to_string(),
                competency_area: competency_area.to_string(),
                rating,
                history: vec![CompetencyRating {
                    rating,
                    date: Utc::now(),
                    rater_id: rater_id.to_string(),
                    evidence,
                }],
                updated_at: Utc::now(),
                notes: String::new(),
            });
        }
        
        Ok(())
    }
    
    /// Get competency records for supervisee
    pub fn get_competencies(&self, supervisee_id: &str) -> Vec<&CompetencyRecord> {
        self.competencies
            .get(supervisee_id)
            .map(|v| v.iter().collect())
            .unwrap_or_default()
    }
}

impl Default for SupervisionManager {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================
// Supervision Dashboard Data
// ============================================

/// Dashboard data for supervisor view
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupervisorDashboard {
    /// Supervisor info
    pub supervisor_id: String,
    pub supervisor_name: String,
    
    /// Active supervisees count
    pub supervisee_count: u32,
    
    /// Review queue summary
    pub queue_summary: ReviewQueueSummary,
    
    /// Recent activity
    pub recent_activity: Vec<SupervisionActivity>,
    
    /// Competency overview
    pub competency_overview: Vec<SuperviseeCompetencySummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewQueueSummary {
    pub total_pending: u32,
    pub urgent_count: u32,
    pub overdue_count: u32,
    pub oldest_hours: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupervisionActivity {
    pub activity_type: String,
    pub description: String,
    pub timestamp: DateTime<Utc>,
    pub supervisee_name: Option<String>,
    pub note_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuperviseeCompetencySummary {
    pub supervisee_id: String,
    pub supervisee_name: String,
    pub areas_rated: u32,
    pub average_rating: f64,
    pub areas_needing_attention: Vec<String>,
}

// ============================================
// Tauri Commands
// ============================================

use tauri::State;
use std::sync::RwLock;

pub struct SupervisionState {
    pub manager: RwLock<SupervisionManager>,
}

impl Default for SupervisionState {
    fn default() -> Self {
        Self {
            manager: RwLock::new(SupervisionManager::new()),
        }
    }
}

/// Get review queue for current supervisor
#[tauri::command]
pub fn get_review_queue(
    state: State<'_, SupervisionState>,
    supervisor_id: String,
) -> Result<Vec<ReviewQueueItem>, String> {
    let manager = state.manager.read().map_err(|e| e.to_string())?;
    Ok(manager.get_review_queue(&supervisor_id)
        .into_iter()
        .cloned()
        .collect())
}

/// Add feedback annotation to note
#[tauri::command]
pub fn add_feedback_annotation(
    state: State<'_, SupervisionState>,
    note_id: String,
    annotation_type: AnnotationType,
    content: String,
    supervisor_id: String,
    start_offset: Option<usize>,
    end_offset: Option<usize>,
) -> Result<FeedbackAnnotation, String> {
    let mut manager = state.manager.write().map_err(|e| e.to_string())?;
    
    let annotation = FeedbackAnnotation {
        id: uuid::Uuid::new_v4().to_string(),
        note_id,
        annotation_type,
        start_offset,
        end_offset,
        content,
        created_by: supervisor_id,
        created_at: Utc::now(),
        acknowledged: false,
        acknowledged_at: None,
    };
    
    manager.add_annotation(annotation.clone()).map_err(|e| e.to_string())?;
    Ok(annotation)
}

/// Get annotations for a note
#[tauri::command]
pub fn get_note_annotations(
    state: State<'_, SupervisionState>,
    note_id: String,
) -> Result<Vec<FeedbackAnnotation>, String> {
    let manager = state.manager.read().map_err(|e| e.to_string())?;
    Ok(manager.get_annotations(&note_id)
        .into_iter()
        .cloned()
        .collect())
}

/// Co-sign a note
#[tauri::command]
pub fn cosign_note(
    state: State<'_, SupervisionState>,
    note_id: String,
    supervisor_id: String,
    supervisor_name: String,
    supervisor_credentials: String,
    conditions: Option<String>,
) -> Result<CoSignature, String> {
    let mut manager = state.manager.write().map_err(|e| e.to_string())?;
    
    let cosignature = CoSignature {
        note_id,
        supervisor_id,
        supervisor_name,
        supervisor_credentials,
        signed_at: Utc::now(),
        review_delay_hours: 0.0,  // Would calculate from note signed_at
        conditions,
        signature: String::new(),  // Would generate cryptographic signature
    };
    
    manager.add_cosignature(cosignature.clone()).map_err(|e| e.to_string())?;
    Ok(cosignature)
}

/// Get co-signature for a note
#[tauri::command]
pub fn get_cosignature(
    state: State<'_, SupervisionState>,
    note_id: String,
) -> Result<Option<CoSignature>, String> {
    let manager = state.manager.read().map_err(|e| e.to_string())?;
    Ok(manager.get_cosignature(&note_id).cloned())
}

/// Check if note requires co-signature
#[tauri::command]
pub fn check_cosign_required(
    state: State<'_, SupervisionState>,
    supervisee_id: String,
) -> Result<bool, String> {
    let manager = state.manager.read().map_err(|e| e.to_string())?;
    Ok(manager.requires_cosignature(&supervisee_id))
}

/// Update competency rating
#[tauri::command]
pub fn update_competency_rating(
    state: State<'_, SupervisionState>,
    supervisee_id: String,
    competency_area: String,
    rating: u8,
    rater_id: String,
    evidence: Option<String>,
) -> Result<(), String> {
    let mut manager = state.manager.write().map_err(|e| e.to_string())?;
    manager.update_competency(&supervisee_id, &competency_area, rating, &rater_id, evidence)
        .map_err(|e| e.to_string())
}

/// Get competency records for supervisee
#[tauri::command]
pub fn get_competency_records(
    state: State<'_, SupervisionState>,
    supervisee_id: String,
) -> Result<Vec<CompetencyRecord>, String> {
    let manager = state.manager.read().map_err(|e| e.to_string())?;
    Ok(manager.get_competencies(&supervisee_id)
        .into_iter()
        .cloned()
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_credential_levels() {
        assert!(CredentialLevel::Intern.requires_supervision());
        assert!(CredentialLevel::Trainee.requires_supervision());
        assert!(!CredentialLevel::Licensed.requires_supervision());
        assert!(CredentialLevel::Supervisor.can_supervise());
    }
    
    #[test]
    fn test_review_queue_sorting() {
        let mut manager = SupervisionManager::new();
        
        manager.add_to_review_queue(ReviewQueueItem {
            note_id: "1".to_string(),
            client_name: "Client A".to_string(),
            note_type: "SOAP".to_string(),
            supervisee_id: "sup1".to_string(),
            supervisee_name: "Trainee 1".to_string(),
            signed_at: Utc::now(),
            hours_pending: 24.0,
            priority: ReviewPriority::Normal,
            has_risk_flags: false,
            detection_count: 0,
            is_overdue: false,
        });
        
        manager.add_to_review_queue(ReviewQueueItem {
            note_id: "2".to_string(),
            client_name: "Client B".to_string(),
            note_type: "Crisis".to_string(),
            supervisee_id: "sup1".to_string(),
            supervisee_name: "Trainee 1".to_string(),
            signed_at: Utc::now(),
            hours_pending: 2.0,
            priority: ReviewPriority::Urgent,
            has_risk_flags: true,
            detection_count: 3,
            is_overdue: false,
        });
        
        // Urgent should be first
        assert_eq!(manager.review_queue[0].note_id, "2");
    }
}
