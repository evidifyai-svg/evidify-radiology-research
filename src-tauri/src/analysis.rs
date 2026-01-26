// Deep Analysis Module v4 - Structured-Only Clinical Intelligence
//
// Provides longitudinal insights using ONLY structured extractions:
// - Symptoms, interventions, risk flags, diagnoses, plans
// - NO raw transcript or free-text processing
//
// Key capabilities:
// 1. Patient feature store (rolling timeline)
// 2. Inconsistency detectors (structured-to-structured)
// 3. Trajectory summaries (symptom/treatment trends)
// 4. Hypothesis engine (differential suggestions)
//
// CRITICAL: All outputs must include evidence_fields[] for traceability.
// LLM (if used) only for phrasing, never for adding facts.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::Utc;

// ============================================
// Structured Extraction Types
// ============================================

/// Parsed note extractions (input to analysis)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedNote {
    pub note_id: String,
    pub session_date: String,
    pub symptoms: Vec<SymptomExtraction>,
    pub interventions: Vec<InterventionExtraction>,
    pub risk_flags: Vec<RiskFlag>,
    pub diagnoses: Vec<DiagnosisExtraction>,
    pub plan_items: Vec<PlanItem>,
    pub measures: Vec<MeasureScore>,
    pub telehealth: Option<TelehealthContext>,
    pub consent_attestations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymptomExtraction {
    pub symptom: String,
    pub domain: SymptomDomain,
    pub severity: Option<Severity>,
    pub temporal: Option<String>,  // "worsening", "stable", "improving"
    pub frequency: Option<String>, // "daily", "weekly", etc.
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum SymptomDomain {
    Mood,
    Anxiety,
    Sleep,
    Cognition,
    Somatic,
    Behavioral,
    Interpersonal,
    Trauma,
    Psychotic,
    Substance,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum Severity {
    Minimal,
    Mild,
    Moderate,
    Severe,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterventionExtraction {
    pub intervention_type: String,  // CBT, DBT, MI, etc.
    pub specific_technique: Option<String>,
    pub homework_assigned: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskFlag {
    pub risk_type: RiskType,
    pub level: Option<RiskLevel>,
    pub assessed: bool,
    pub plan_documented: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RiskType {
    SuicidalIdeation,
    HomicidalIdeation,
    SelfHarm,
    ChildAbuse,
    ElderAbuse,
    DomesticViolence,
    SubstanceUse,
    Elopement,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Low,
    Moderate,
    High,
    Imminent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosisExtraction {
    pub code: Option<String>,  // ICD-10
    pub description: String,
    pub status: DiagnosisStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DiagnosisStatus {
    Active,
    Provisional,
    Resolved,
    RuledOut,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanItem {
    pub item: String,
    pub item_type: PlanItemType,
    pub completed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PlanItemType {
    Homework,
    Referral,
    MedicationChange,
    FollowUp,
    SafetyPlan,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeasureScore {
    pub measure: String,  // PHQ-9, GAD-7, etc.
    pub score: i32,
    pub severity: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelehealthContext {
    pub is_telehealth: bool,
    pub patient_state: Option<String>,
    pub privacy_confirmed: bool,
}

// ============================================
// Patient Feature Store
// ============================================

/// Rolling feature store per patient
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatientFeatureStore {
    pub client_id: String,
    pub sessions: Vec<SessionFeatures>,
    pub updated_at: i64,
}

/// Features extracted from a single session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionFeatures {
    pub note_id: String,
    pub session_date: String,
    pub timestamp: i64,
    
    // Aggregated features
    pub symptom_domains: Vec<SymptomDomain>,
    pub symptom_severities: HashMap<String, Severity>,
    pub interventions_used: Vec<String>,
    pub homework_assigned: bool,
    pub risk_types_present: Vec<RiskType>,
    pub highest_risk_level: Option<RiskLevel>,
    pub diagnoses: Vec<String>,
    pub measure_scores: HashMap<String, i32>,
    pub is_telehealth: bool,
    pub patient_state: Option<String>,
}

impl PatientFeatureStore {
    pub fn new(client_id: &str) -> Self {
        PatientFeatureStore {
            client_id: client_id.to_string(),
            sessions: Vec::new(),
            updated_at: Utc::now().timestamp_millis(),
        }
    }
    
    /// Add session features from a parsed note
    pub fn add_session(&mut self, note: &ParsedNote) {
        let features = SessionFeatures::from_parsed_note(note);
        
        // Remove existing entry for this note if updating
        self.sessions.retain(|s| s.note_id != note.note_id);
        self.sessions.push(features);
        
        // Sort by date
        self.sessions.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
        self.updated_at = Utc::now().timestamp_millis();
    }
    
    /// Get sessions in time window (last N sessions)
    pub fn last_n_sessions(&self, n: usize) -> &[SessionFeatures] {
        let start = self.sessions.len().saturating_sub(n);
        &self.sessions[start..]
    }
    
    /// Get sessions in time window (last N days)
    pub fn sessions_in_days(&self, days: i64) -> Vec<&SessionFeatures> {
        let cutoff = Utc::now().timestamp_millis() - (days * 24 * 60 * 60 * 1000);
        self.sessions.iter().filter(|s| s.timestamp >= cutoff).collect()
    }
}

impl SessionFeatures {
    fn from_parsed_note(note: &ParsedNote) -> Self {
        let symptom_domains: Vec<_> = note.symptoms.iter()
            .map(|s| s.domain.clone())
            .collect();
        
        let mut symptom_severities = HashMap::new();
        for s in &note.symptoms {
            if let Some(sev) = &s.severity {
                symptom_severities.insert(s.symptom.clone(), sev.clone());
            }
        }
        
        let interventions_used: Vec<_> = note.interventions.iter()
            .map(|i| i.intervention_type.clone())
            .collect();
        
        let homework_assigned = note.interventions.iter()
            .any(|i| i.homework_assigned);
        
        let risk_types_present: Vec<_> = note.risk_flags.iter()
            .map(|r| r.risk_type.clone())
            .collect();
        
        let highest_risk_level = note.risk_flags.iter()
            .filter_map(|r| r.level.clone())
            .max();
        
        let diagnoses: Vec<_> = note.diagnoses.iter()
            .filter(|d| d.status == DiagnosisStatus::Active || d.status == DiagnosisStatus::Provisional)
            .map(|d| d.description.clone())
            .collect();
        
        let mut measure_scores = HashMap::new();
        for m in &note.measures {
            measure_scores.insert(m.measure.clone(), m.score);
        }
        
        let (is_telehealth, patient_state) = match &note.telehealth {
            Some(t) => (t.is_telehealth, t.patient_state.clone()),
            None => (false, None),
        };
        
        // Parse session date to timestamp
        let timestamp = chrono::NaiveDate::parse_from_str(&note.session_date, "%Y-%m-%d")
            .map(|d| d.and_hms_opt(12, 0, 0).unwrap().and_utc().timestamp_millis())
            .unwrap_or(Utc::now().timestamp_millis());
        
        SessionFeatures {
            note_id: note.note_id.clone(),
            session_date: note.session_date.clone(),
            timestamp,
            symptom_domains,
            symptom_severities,
            interventions_used,
            homework_assigned,
            risk_types_present,
            highest_risk_level,
            diagnoses,
            measure_scores,
            is_telehealth,
            patient_state,
        }
    }
}

// ============================================
// Analysis Findings
// ============================================

/// Analysis output item with evidence trail
#[derive(Debug, Clone, Serialize)]
pub struct AnalysisFinding {
    pub finding_id: String,
    pub category: FindingCategory,
    pub title: String,
    pub description: String,
    pub suggested_action: Option<String>,
    pub confidence: Confidence,
    pub evidence: EvidenceTrail,
    pub clinician_action: Option<ClinicianAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FindingCategory {
    Documentation,      // Missing elements
    Compliance,        // Jurisdiction/consent issues
    ClinicalConsideration, // Hypothesis/screening suggestion
    Safety,           // Risk escalation
    Inconsistency,    // Contradictions
    Trajectory,       // Trend observation
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Confidence {
    Low,
    Medium,
    High,
}

/// Evidence trail for traceability
#[derive(Debug, Clone, Serialize)]
pub struct EvidenceTrail {
    pub evidence_fields: Vec<String>,  // Field names that triggered this
    pub source_session_ids: Vec<String>,
    pub rule_ids: Vec<String>,
    pub time_window: Option<String>,  // e.g., "last 4 sessions"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClinicianAction {
    pub action: ActionType,
    pub timestamp: i64,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ActionType {
    Accept,
    Reject,
    Defer,
    MuteRule,
    AddToNote,
}

// ============================================
// Inconsistency Detectors
// ============================================

pub fn detect_inconsistencies(store: &PatientFeatureStore) -> Vec<AnalysisFinding> {
    let mut findings = Vec::new();
    let sessions = store.last_n_sessions(10);
    
    if sessions.len() < 2 {
        return findings;
    }
    
    // Rule INC-001: Risk present but level missing
    findings.extend(detect_risk_level_missing(sessions));
    
    // Rule INC-002: Telehealth without patient state
    findings.extend(detect_telehealth_missing_state(sessions));
    
    // Rule INC-003: Intervention without homework progression
    findings.extend(detect_intervention_without_homework(sessions));
    
    // Rule INC-004: Risk resolved without documentation
    findings.extend(detect_risk_change_undocumented(sessions));
    
    // Rule INC-005: Diagnosis change without rationale
    findings.extend(detect_diagnosis_change(sessions));
    
    findings
}

fn detect_risk_level_missing(sessions: &[SessionFeatures]) -> Vec<AnalysisFinding> {
    let mut findings = Vec::new();
    
    for session in sessions {
        if !session.risk_types_present.is_empty() && session.highest_risk_level.is_none() {
            findings.push(AnalysisFinding {
                finding_id: format!("INC-001-{}", session.note_id),
                category: FindingCategory::Documentation,
                title: "Risk level not documented".to_string(),
                description: format!(
                    "Risk flags present ({:?}) but risk level not specified",
                    session.risk_types_present
                ),
                suggested_action: Some("Document risk level assessment".to_string()),
                confidence: Confidence::High,
                evidence: EvidenceTrail {
                    evidence_fields: vec!["risk_types_present".to_string(), "highest_risk_level".to_string()],
                    source_session_ids: vec![session.note_id.clone()],
                    rule_ids: vec!["INC-001".to_string()],
                    time_window: None,
                },
                clinician_action: None,
            });
        }
    }
    
    findings
}

fn detect_telehealth_missing_state(sessions: &[SessionFeatures]) -> Vec<AnalysisFinding> {
    let mut findings = Vec::new();
    
    for session in sessions {
        if session.is_telehealth && session.patient_state.is_none() {
            findings.push(AnalysisFinding {
                finding_id: format!("INC-002-{}", session.note_id),
                category: FindingCategory::Compliance,
                title: "Telehealth session missing patient location".to_string(),
                description: "Telehealth modality documented but patient state/location not captured".to_string(),
                suggested_action: Some("Document patient's physical location for jurisdiction compliance".to_string()),
                confidence: Confidence::High,
                evidence: EvidenceTrail {
                    evidence_fields: vec!["is_telehealth".to_string(), "patient_state".to_string()],
                    source_session_ids: vec![session.note_id.clone()],
                    rule_ids: vec!["INC-002".to_string()],
                    time_window: None,
                },
                clinician_action: None,
            });
        }
    }
    
    findings
}

fn detect_intervention_without_homework(sessions: &[SessionFeatures]) -> Vec<AnalysisFinding> {
    let mut findings = Vec::new();
    
    // Check if CBT/DBT used repeatedly but no homework
    let cbt_sessions: Vec<_> = sessions.iter()
        .filter(|s| s.interventions_used.iter().any(|i| 
            i.to_lowercase().contains("cbt") || 
            i.to_lowercase().contains("dbt") ||
            i.to_lowercase().contains("behavioral")))
        .collect();
    
    if cbt_sessions.len() >= 3 {
        let no_homework_count = cbt_sessions.iter()
            .filter(|s| !s.homework_assigned)
            .count();
        
        if no_homework_count >= 2 {
            findings.push(AnalysisFinding {
                finding_id: format!("INC-003-{}", cbt_sessions.last().unwrap().note_id),
                category: FindingCategory::ClinicalConsideration,
                title: "CBT/DBT interventions without homework progression".to_string(),
                description: format!(
                    "CBT/DBT documented in {} sessions, but homework assigned in only {} sessions",
                    cbt_sessions.len(),
                    cbt_sessions.len() - no_homework_count
                ),
                suggested_action: Some("Consider documenting skills practice assignments".to_string()),
                confidence: Confidence::Medium,
                evidence: EvidenceTrail {
                    evidence_fields: vec!["interventions_used".to_string(), "homework_assigned".to_string()],
                    source_session_ids: cbt_sessions.iter().map(|s| s.note_id.clone()).collect(),
                    rule_ids: vec!["INC-003".to_string()],
                    time_window: Some(format!("last {} sessions", sessions.len())),
                },
                clinician_action: None,
            });
        }
    }
    
    findings
}

fn detect_risk_change_undocumented(sessions: &[SessionFeatures]) -> Vec<AnalysisFinding> {
    let mut findings = Vec::new();
    
    for window in sessions.windows(2) {
        let prev = &window[0];
        let curr = &window[1];
        
        // Check if risk was present before but not now
        for risk in &prev.risk_types_present {
            if !curr.risk_types_present.contains(risk) {
                // Risk disappeared without explicit resolution
                findings.push(AnalysisFinding {
                    finding_id: format!("INC-004-{}", curr.note_id),
                    category: FindingCategory::Documentation,
                    title: format!("{:?} risk not addressed in current session", risk),
                    description: format!(
                        "{:?} was documented in session {} but not in current session",
                        risk, prev.session_date
                    ),
                    suggested_action: Some("Document risk status update or resolution".to_string()),
                    confidence: Confidence::Medium,
                    evidence: EvidenceTrail {
                        evidence_fields: vec!["risk_types_present".to_string()],
                        source_session_ids: vec![prev.note_id.clone(), curr.note_id.clone()],
                        rule_ids: vec!["INC-004".to_string()],
                        time_window: Some("consecutive sessions".to_string()),
                    },
                    clinician_action: None,
                });
            }
        }
    }
    
    findings
}

fn detect_diagnosis_change(sessions: &[SessionFeatures]) -> Vec<AnalysisFinding> {
    let mut findings = Vec::new();
    
    for window in sessions.windows(2) {
        let prev = &window[0];
        let curr = &window[1];
        
        // Check for new diagnoses
        for dx in &curr.diagnoses {
            if !prev.diagnoses.contains(dx) {
                findings.push(AnalysisFinding {
                    finding_id: format!("INC-005-{}", curr.note_id),
                    category: FindingCategory::Documentation,
                    title: "New diagnosis added".to_string(),
                    description: format!("'{}' added since previous session", dx),
                    suggested_action: Some("Document clinical rationale for diagnosis change".to_string()),
                    confidence: Confidence::Low,
                    evidence: EvidenceTrail {
                        evidence_fields: vec!["diagnoses".to_string()],
                        source_session_ids: vec![prev.note_id.clone(), curr.note_id.clone()],
                        rule_ids: vec!["INC-005".to_string()],
                        time_window: Some("consecutive sessions".to_string()),
                    },
                    clinician_action: None,
                });
            }
        }
    }
    
    findings
}

// ============================================
// Trajectory Analysis
// ============================================

#[derive(Debug, Clone, Serialize)]
pub struct TrajectoryCard {
    pub domain: String,
    pub trend: Trend,
    pub description: String,
    pub data_points: Vec<TrendDataPoint>,
    pub evidence: EvidenceTrail,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Trend {
    Improving,
    Stable,
    Worsening,
    Fluctuating,
    Insufficient,
}

#[derive(Debug, Clone, Serialize)]
pub struct TrendDataPoint {
    pub session_date: String,
    pub value: f32,
    pub label: Option<String>,
}

pub fn analyze_trajectories(store: &PatientFeatureStore) -> Vec<TrajectoryCard> {
    let mut cards = Vec::new();
    let sessions = store.sessions_in_days(90);
    
    if sessions.len() < 3 {
        return cards;
    }
    
    // Analyze measure trends (PHQ-9, GAD-7, etc.)
    cards.extend(analyze_measure_trends(&sessions));
    
    // Analyze symptom domain trends
    cards.extend(analyze_symptom_trends(&sessions));
    
    cards
}

fn analyze_measure_trends(sessions: &[&SessionFeatures]) -> Vec<TrajectoryCard> {
    let mut cards = Vec::new();
    
    // Collect all measures used
    let mut measure_data: HashMap<String, Vec<(String, i32)>> = HashMap::new();
    for session in sessions {
        for (measure, score) in &session.measure_scores {
            measure_data.entry(measure.clone())
                .or_default()
                .push((session.session_date.clone(), *score));
        }
    }
    
    for (measure, data) in measure_data {
        if data.len() < 2 {
            continue;
        }
        
        let trend = calculate_trend(&data);
        let data_points: Vec<_> = data.iter()
            .map(|(date, score)| TrendDataPoint {
                session_date: date.clone(),
                value: *score as f32,
                label: None,
            })
            .collect();
        
        let description = match trend {
            Trend::Improving => format!("{} scores showing improvement over time", measure),
            Trend::Worsening => format!("{} scores showing worsening over time", measure),
            Trend::Stable => format!("{} scores relatively stable", measure),
            Trend::Fluctuating => format!("{} scores fluctuating", measure),
            Trend::Insufficient => continue,
        };
        
        cards.push(TrajectoryCard {
            domain: measure.clone(),
            trend,
            description,
            data_points,
            evidence: EvidenceTrail {
                evidence_fields: vec![format!("measure_scores.{}", measure)],
                source_session_ids: sessions.iter().map(|s| s.note_id.clone()).collect(),
                rule_ids: vec!["TRAJ-MEASURE".to_string()],
                time_window: Some("last 90 days".to_string()),
            },
        });
    }
    
    cards
}

fn analyze_symptom_trends(sessions: &[&SessionFeatures]) -> Vec<TrajectoryCard> {
    let mut cards = Vec::new();
    
    // Count symptom domains per session
    let mut domain_presence: HashMap<SymptomDomain, Vec<(String, bool)>> = HashMap::new();
    for session in sessions {
        let domains_in_session: std::collections::HashSet<_> = session.symptom_domains.iter().collect();
        for domain in &[SymptomDomain::Mood, SymptomDomain::Anxiety, SymptomDomain::Sleep, 
                        SymptomDomain::Trauma, SymptomDomain::Substance] {
            domain_presence.entry(domain.clone())
                .or_default()
                .push((session.session_date.clone(), domains_in_session.contains(domain)));
        }
    }
    
    for (domain, data) in domain_presence {
        let present_count = data.iter().filter(|(_, p)| *p).count();
        if present_count < 2 {
            continue;
        }
        
        // Simple trend: more present recently = worsening, less = improving
        let recent = &data[data.len().saturating_sub(3)..];
        let earlier = &data[..data.len().saturating_sub(3).max(3)];
        
        let recent_rate = recent.iter().filter(|(_, p)| *p).count() as f32 / recent.len() as f32;
        let earlier_rate = earlier.iter().filter(|(_, p)| *p).count() as f32 / earlier.len().max(1) as f32;
        
        let trend = if recent_rate > earlier_rate + 0.2 {
            Trend::Worsening
        } else if recent_rate < earlier_rate - 0.2 {
            Trend::Improving
        } else {
            Trend::Stable
        };
        
        let data_points: Vec<_> = data.iter()
            .map(|(date, present)| TrendDataPoint {
                session_date: date.clone(),
                value: if *present { 1.0 } else { 0.0 },
                label: Some(if *present { "present".to_string() } else { "absent".to_string() }),
            })
            .collect();
        
        cards.push(TrajectoryCard {
            domain: format!("{:?}", domain),
            trend,
            description: format!("{:?} symptoms documented in {}/{} sessions", 
                domain, present_count, data.len()),
            data_points,
            evidence: EvidenceTrail {
                evidence_fields: vec!["symptom_domains".to_string()],
                source_session_ids: sessions.iter().map(|s| s.note_id.clone()).collect(),
                rule_ids: vec!["TRAJ-SYMPTOM".to_string()],
                time_window: Some("last 90 days".to_string()),
            },
        });
    }
    
    cards
}

fn calculate_trend(data: &[(String, i32)]) -> Trend {
    if data.len() < 2 {
        return Trend::Insufficient;
    }
    
    // Simple linear regression
    let n = data.len() as f32;
    let x_mean = (n - 1.0) / 2.0;
    let y_mean = data.iter().map(|(_, v)| *v as f32).sum::<f32>() / n;
    
    let mut num = 0.0;
    let mut den = 0.0;
    for (i, (_, y)) in data.iter().enumerate() {
        let x = i as f32;
        num += (x - x_mean) * (*y as f32 - y_mean);
        den += (x - x_mean).powi(2);
    }
    
    if den == 0.0 {
        return Trend::Stable;
    }
    
    let slope = num / den;
    let change_per_session = slope / y_mean.max(1.0);
    
    // Threshold: 10% change per session = significant
    if change_per_session < -0.05 {
        Trend::Improving // Lower scores = better for PHQ/GAD
    } else if change_per_session > 0.05 {
        Trend::Worsening
    } else {
        Trend::Stable
    }
}

// ============================================
// Hypothesis Engine
// ============================================

#[derive(Debug, Clone, Serialize)]
pub struct Hypothesis {
    pub hypothesis_id: String,
    pub title: String,
    pub description: String,
    pub why: String,
    pub suggested_next_step: String,
    pub confidence: Confidence,
    pub evidence: EvidenceTrail,
}

pub fn generate_hypotheses(store: &PatientFeatureStore) -> Vec<Hypothesis> {
    let mut hypotheses = Vec::new();
    let sessions = store.last_n_sessions(6);
    
    if sessions.is_empty() {
        return hypotheses;
    }
    
    // Rule HYP-001: Bipolar spectrum screening
    hypotheses.extend(check_bipolar_indicators(sessions));
    
    // Rule HYP-002: PTSD vs GAD differential
    hypotheses.extend(check_ptsd_gad_differential(sessions));
    
    // Rule HYP-003: Attachment-related formulation
    hypotheses.extend(check_attachment_indicators(sessions));
    
    // Rule HYP-004: Substance use screening
    hypotheses.extend(check_substance_screening(sessions));
    
    hypotheses
}

fn check_bipolar_indicators(sessions: &[SessionFeatures]) -> Vec<Hypothesis> {
    let mut hypotheses = Vec::new();
    
    // Look for: sleep disturbance + irritability + increased goal-directed activity
    let has_sleep = sessions.iter().any(|s| s.symptom_domains.contains(&SymptomDomain::Sleep));
    let has_mood = sessions.iter().any(|s| s.symptom_domains.contains(&SymptomDomain::Mood));
    let has_behavioral = sessions.iter().any(|s| s.symptom_domains.contains(&SymptomDomain::Behavioral));
    
    if has_sleep && has_mood && has_behavioral {
        hypotheses.push(Hypothesis {
            hypothesis_id: "HYP-001".to_string(),
            title: "Consider bipolar spectrum screening".to_string(),
            description: "Pattern of mood, sleep, and behavioral symptoms observed".to_string(),
            why: "Sleep disturbance, mood symptoms, and behavioral changes documented across recent sessions".to_string(),
            suggested_next_step: "Consider MDQ or mood charting if not already completed".to_string(),
            confidence: Confidence::Low,
            evidence: EvidenceTrail {
                evidence_fields: vec!["symptom_domains".to_string()],
                source_session_ids: sessions.iter().map(|s| s.note_id.clone()).collect(),
                rule_ids: vec!["HYP-001".to_string()],
                time_window: Some(format!("last {} sessions", sessions.len())),
            },
        });
    }
    
    hypotheses
}

fn check_ptsd_gad_differential(sessions: &[SessionFeatures]) -> Vec<Hypothesis> {
    let mut hypotheses = Vec::new();
    
    // Look for: anxiety + trauma + somatic
    let has_anxiety = sessions.iter().any(|s| s.symptom_domains.contains(&SymptomDomain::Anxiety));
    let has_trauma = sessions.iter().any(|s| s.symptom_domains.contains(&SymptomDomain::Trauma));
    let has_somatic = sessions.iter().any(|s| s.symptom_domains.contains(&SymptomDomain::Somatic));
    
    if has_anxiety && has_trauma && has_somatic {
        hypotheses.push(Hypothesis {
            hypothesis_id: "HYP-002".to_string(),
            title: "Consider PTSD vs GAD differential".to_string(),
            description: "Pattern of anxiety, trauma, and somatic symptoms observed".to_string(),
            why: "Anxiety symptoms co-occurring with trauma-related content and somatic complaints may warrant PTSD assessment".to_string(),
            suggested_next_step: "Consider PCL-5 or trauma-focused assessment if clinically indicated".to_string(),
            confidence: Confidence::Medium,
            evidence: EvidenceTrail {
                evidence_fields: vec!["symptom_domains".to_string()],
                source_session_ids: sessions.iter().map(|s| s.note_id.clone()).collect(),
                rule_ids: vec!["HYP-002".to_string()],
                time_window: Some(format!("last {} sessions", sessions.len())),
            },
        });
    }
    
    hypotheses
}

fn check_attachment_indicators(sessions: &[SessionFeatures]) -> Vec<Hypothesis> {
    let mut hypotheses = Vec::new();
    
    // Look for: interpersonal symptoms
    let interpersonal_count = sessions.iter()
        .filter(|s| s.symptom_domains.contains(&SymptomDomain::Interpersonal))
        .count();
    
    if interpersonal_count >= 3 {
        hypotheses.push(Hypothesis {
            hypothesis_id: "HYP-003".to_string(),
            title: "Consider attachment-informed formulation".to_string(),
            description: "Persistent interpersonal themes documented".to_string(),
            why: format!("Interpersonal concerns documented in {}/{} recent sessions", 
                interpersonal_count, sessions.len()),
            suggested_next_step: "Consider attachment history exploration if not already addressed".to_string(),
            confidence: Confidence::Low,
            evidence: EvidenceTrail {
                evidence_fields: vec!["symptom_domains".to_string()],
                source_session_ids: sessions.iter()
                    .filter(|s| s.symptom_domains.contains(&SymptomDomain::Interpersonal))
                    .map(|s| s.note_id.clone())
                    .collect(),
                rule_ids: vec!["HYP-003".to_string()],
                time_window: Some(format!("last {} sessions", sessions.len())),
            },
        });
    }
    
    hypotheses
}

fn check_substance_screening(sessions: &[SessionFeatures]) -> Vec<Hypothesis> {
    let mut hypotheses = Vec::new();
    
    // Check for substance risk flags without formal assessment
    let has_substance_flag = sessions.iter()
        .any(|s| s.risk_types_present.contains(&RiskType::SubstanceUse));
    
    // Check if AUDIT/DAST or similar measured
    let has_substance_measure = sessions.iter()
        .any(|s| s.measure_scores.keys()
            .any(|m| m.to_lowercase().contains("audit") || 
                     m.to_lowercase().contains("dast") ||
                     m.to_lowercase().contains("cage")));
    
    if has_substance_flag && !has_substance_measure {
        hypotheses.push(Hypothesis {
            hypothesis_id: "HYP-004".to_string(),
            title: "Consider standardized substance use screening".to_string(),
            description: "Substance use noted but no standardized measure documented".to_string(),
            why: "Substance use risk flagged in documentation without standardized screening measure".to_string(),
            suggested_next_step: "Consider AUDIT/DAST screening if clinically appropriate".to_string(),
            confidence: Confidence::Medium,
            evidence: EvidenceTrail {
                evidence_fields: vec!["risk_types_present".to_string(), "measure_scores".to_string()],
                source_session_ids: sessions.iter().map(|s| s.note_id.clone()).collect(),
                rule_ids: vec!["HYP-004".to_string()],
                time_window: Some(format!("last {} sessions", sessions.len())),
            },
        });
    }
    
    hypotheses
}

// ============================================
// Main Analysis Entry Point
// ============================================

#[derive(Debug, Clone, Serialize)]
pub struct DeepAnalysisResult {
    pub findings: Vec<AnalysisFinding>,
    pub trajectories: Vec<TrajectoryCard>,
    pub hypotheses: Vec<Hypothesis>,
    pub analyzed_at: i64,
    pub session_count: usize,
}

/// Run all deep analysis on patient feature store
pub fn run_deep_analysis(store: &PatientFeatureStore) -> DeepAnalysisResult {
    DeepAnalysisResult {
        findings: detect_inconsistencies(store),
        trajectories: analyze_trajectories(store),
        hypotheses: generate_hypotheses(store),
        analyzed_at: Utc::now().timestamp_millis(),
        session_count: store.sessions.len(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_feature_store_add_session() {
        let mut store = PatientFeatureStore::new("test-client");
        
        let note = ParsedNote {
            note_id: "note-1".to_string(),
            session_date: "2026-01-01".to_string(),
            symptoms: vec![SymptomExtraction {
                symptom: "anxiety".to_string(),
                domain: SymptomDomain::Anxiety,
                severity: Some(Severity::Moderate),
                temporal: None,
                frequency: None,
            }],
            interventions: vec![],
            risk_flags: vec![],
            diagnoses: vec![],
            plan_items: vec![],
            measures: vec![],
            telehealth: None,
            consent_attestations: vec![],
        };
        
        store.add_session(&note);
        assert_eq!(store.sessions.len(), 1);
        assert!(store.sessions[0].symptom_domains.contains(&SymptomDomain::Anxiety));
    }
    
    #[test]
    fn test_inconsistency_detection() {
        let mut store = PatientFeatureStore::new("test-client");
        
        // Add session with risk but no level
        store.sessions.push(SessionFeatures {
            note_id: "note-1".to_string(),
            session_date: "2026-01-01".to_string(),
            timestamp: 1000,
            symptom_domains: vec![],
            symptom_severities: HashMap::new(),
            interventions_used: vec![],
            homework_assigned: false,
            risk_types_present: vec![RiskType::SuicidalIdeation],
            highest_risk_level: None, // Missing!
            diagnoses: vec![],
            measure_scores: HashMap::new(),
            is_telehealth: false,
            patient_state: None,
        });
        
        let findings = detect_inconsistencies(&store);
        assert!(findings.iter().any(|f| f.finding_id.contains("INC-001")));
    }
}
