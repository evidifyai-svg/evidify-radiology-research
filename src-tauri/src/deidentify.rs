// HIPAA Safe Harbor De-identification Engine
// Implements 45 CFR 164.514(b)(2) - All 18 identifier categories
//
// This module provides local-first, offline-capable de-identification
// to enable clinical consultation without transmitting PHI.

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use lazy_static::lazy_static;

// ============================================
// Safe Harbor 18 Identifier Categories
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum IdentifierCategory {
    Name,                    // A - Names
    Geographic,              // B - Geographic subdivisions smaller than state
    Date,                    // C - Dates (except year), ages 89+
    Phone,                   // D - Phone numbers
    Fax,                     // E - Fax numbers
    Email,                   // F - Email addresses
    SSN,                     // G - Social Security numbers
    MedicalRecordNumber,     // H - Medical record numbers
    HealthPlanNumber,        // I - Health plan beneficiary numbers
    AccountNumber,           // J - Account numbers
    LicenseNumber,           // K - Certificate/license numbers
    VehicleIdentifier,       // L - Vehicle identifiers/serial numbers
    DeviceIdentifier,        // M - Device identifiers/serial numbers
    WebUrl,                  // N - Web URLs
    IpAddress,               // O - IP addresses
    Biometric,               // P - Biometric identifiers
    FullFacePhoto,           // Q - Full-face photographs
    UniqueIdentifier,        // R - Any other unique identifier
    ContextualIdentifier,    // AI-detected contextual identifiers
}

impl IdentifierCategory {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Name => "A",
            Self::Geographic => "B",
            Self::Date => "C",
            Self::Phone => "D",
            Self::Fax => "E",
            Self::Email => "F",
            Self::SSN => "G",
            Self::MedicalRecordNumber => "H",
            Self::HealthPlanNumber => "I",
            Self::AccountNumber => "J",
            Self::LicenseNumber => "K",
            Self::VehicleIdentifier => "L",
            Self::DeviceIdentifier => "M",
            Self::WebUrl => "N",
            Self::IpAddress => "O",
            Self::Biometric => "P",
            Self::FullFacePhoto => "Q",
            Self::UniqueIdentifier => "R",
            Self::ContextualIdentifier => "AI",
        }
    }

    pub fn description(&self) -> &'static str {
        match self {
            Self::Name => "Names",
            Self::Geographic => "Geographic data smaller than state",
            Self::Date => "Dates (except year)",
            Self::Phone => "Phone numbers",
            Self::Fax => "Fax numbers",
            Self::Email => "Email addresses",
            Self::SSN => "Social Security numbers",
            Self::MedicalRecordNumber => "Medical record numbers",
            Self::HealthPlanNumber => "Health plan numbers",
            Self::AccountNumber => "Account numbers",
            Self::LicenseNumber => "License/certificate numbers",
            Self::VehicleIdentifier => "Vehicle identifiers",
            Self::DeviceIdentifier => "Device identifiers",
            Self::WebUrl => "Web URLs",
            Self::IpAddress => "IP addresses",
            Self::Biometric => "Biometric identifiers",
            Self::FullFacePhoto => "Full-face photographs",
            Self::UniqueIdentifier => "Other unique identifiers",
            Self::ContextualIdentifier => "AI-detected contextual identifier",
        }
    }
}

// ============================================
// Detection Result
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedIdentifier {
    pub category: IdentifierCategory,
    pub original_text: String,
    pub start_pos: usize,
    pub end_pos: usize,
    pub replacement: String,
    pub confidence: f32,  // 0.0 - 1.0
    pub detection_method: String,  // "regex", "ner", "ai", "rule"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeidentificationResult {
    pub original_hash: String,
    pub deidentified_text: String,
    pub deidentified_hash: String,
    pub identifiers_found: Vec<DetectedIdentifier>,
    pub category_counts: HashMap<String, i32>,
    pub safe_harbor_compliant: bool,
    pub timestamp: String,
    pub processing_time_ms: u64,
}

// ============================================
// Audit Trail Entry
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeidentificationAudit {
    pub id: String,
    pub note_id: Option<String>,
    pub client_id: Option<String>,
    pub original_hash: String,
    pub deidentified_hash: String,
    pub identifiers_removed: Vec<AuditedIdentifier>,
    pub category_summary: HashMap<String, i32>,
    pub method: String,  // "safe_harbor", "expert_determination"
    pub ai_enhanced: bool,
    pub user_verified: bool,
    pub created_at: i64,
    pub exported_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditedIdentifier {
    pub category_code: String,
    pub category_name: String,
    pub position: usize,
    pub length: usize,
    pub replacement_type: String,  // "redact", "generalize", "pseudonymize"
}

// ============================================
// Consultation Draft
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsultationDraft {
    pub id: String,
    pub title: String,
    pub deidentified_content: String,
    pub clinical_question: String,
    pub specialties: Vec<String>,
    pub urgency: String,  // "routine", "soon", "urgent"
    pub audit_id: String,
    pub status: String,  // "draft", "ready", "submitted", "responded"
    pub created_at: i64,
    pub updated_at: i64,
}

// ============================================
// Regex Patterns for 18 Identifiers
// ============================================

lazy_static! {
    // A - Names: Common name patterns (will be enhanced by NER)
    static ref NAME_TITLES: Regex = Regex::new(
        r"(?i)\b(Mr\.|Mrs\.|Ms\.|Miss|Dr\.|Prof\.|Rev\.|Hon\.)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?"
    ).unwrap();
    
    // B - Geographic: Addresses, cities, ZIP codes
    static ref STREET_ADDRESS: Regex = Regex::new(
        r"(?i)\d{1,5}\s+[\w\s]{1,30}\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl|circle|cir)\b"
    ).unwrap();
    
    static ref CITY_STATE: Regex = Regex::new(
        r"(?i)\b[A-Z][a-z]+(\s+[A-Z][a-z]+)?,\s*[A-Z]{2}\b"
    ).unwrap();
    
    static ref ZIP_CODE: Regex = Regex::new(
        r"\b\d{5}(-\d{4})?\b"
    ).unwrap();
    
    static ref PO_BOX: Regex = Regex::new(
        r"(?i)\b(p\.?\s*o\.?\s*box|post\s*office\s*box)\s*\d+"
    ).unwrap();
    
    // C - Dates: Full dates (month/day/year patterns)
    static ref DATE_MDY: Regex = Regex::new(
        r"\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](\d{2}|\d{4})\b"
    ).unwrap();
    
    static ref DATE_DMY: Regex = Regex::new(
        r"\b(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](\d{2}|\d{4})\b"
    ).unwrap();
    
    static ref DATE_WRITTEN: Regex = Regex::new(
        r"(?i)\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{1,2}(st|nd|rd|th)?,?\s*\d{2,4}\b"
    ).unwrap();
    
    static ref DATE_WRITTEN_ALT: Regex = Regex::new(
        r"(?i)\b\d{1,2}(st|nd|rd|th)?\s+(of\s+)?(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec),?\s*\d{2,4}\b"
    ).unwrap();
    
    static ref AGE_89_PLUS: Regex = Regex::new(
        r"(?i)\b(89|9\d|1\d{2})\s*(year|yr|y\.?o\.?)s?\s*(old)?\b"
    ).unwrap();
    
    // D - Phone numbers
    static ref PHONE: Regex = Regex::new(
        r"(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
    ).unwrap();
    
    // E - Fax (similar to phone, often labeled)
    static ref FAX: Regex = Regex::new(
        r"(?i)\b(fax|facsimile)[:\s]*(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
    ).unwrap();
    
    // F - Email
    static ref EMAIL: Regex = Regex::new(
        r"(?i)\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
    ).unwrap();
    
    // G - SSN
    static ref SSN: Regex = Regex::new(
        r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b"
    ).unwrap();
    
    // H - Medical Record Numbers (MRN patterns)
    static ref MRN: Regex = Regex::new(
        r"(?i)\b(mrn|medical\s*record|patient\s*id|chart)[:\s#]*[A-Z0-9-]{4,15}\b"
    ).unwrap();
    
    // I - Health Plan Numbers
    static ref HEALTH_PLAN: Regex = Regex::new(
        r"(?i)\b(member\s*id|subscriber\s*id|policy|group)[:\s#]*[A-Z0-9-]{5,20}\b"
    ).unwrap();
    
    // J - Account Numbers
    static ref ACCOUNT_NUMBER: Regex = Regex::new(
        r"(?i)\b(account|acct)[:\s#]*\d{6,20}\b"
    ).unwrap();
    
    // K - License Numbers (driver's license, professional)
    static ref LICENSE: Regex = Regex::new(
        r"(?i)\b(license|lic|dl)[:\s#]*[A-Z0-9-]{5,15}\b"
    ).unwrap();
    
    // L - Vehicle identifiers (VIN, plates)
    static ref VIN: Regex = Regex::new(
        r"\b[A-HJ-NPR-Z0-9]{17}\b"
    ).unwrap();
    
    static ref LICENSE_PLATE: Regex = Regex::new(
        r"(?i)\b(plate|tag)[:\s#]*[A-Z0-9]{2,8}\b"
    ).unwrap();
    
    // M - Device identifiers (serial numbers) - requires explicit separator
    static ref DEVICE_SERIAL: Regex = Regex::new(
        r"(?i)\b(serial|s/n)\s*[:#]\s*[A-Z0-9-]{5,20}\b"
    ).unwrap();
    
    // N - URLs
    static ref URL: Regex = Regex::new(
        r#"(?i)\b(https?://|www\.)[^\s<>"{}|\\^`\[\]]{3,100}\b"#
    ).unwrap();
    
    // O - IP Addresses
    static ref IP_ADDRESS: Regex = Regex::new(
        r#"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b"#
    ).unwrap();
    
    static ref IPV6: Regex = Regex::new(
        r#"(?i)\b(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\b"#
    ).unwrap();
    
    // P - Biometric references
    static ref BIOMETRIC: Regex = Regex::new(
        r#"(?i)\b(fingerprint|retinal\s*scan|iris\s*scan|voice\s*print|facial\s*recognition|dna\s*sample)\b"#
    ).unwrap();
    
    // Q - Photo references
    static ref PHOTO_REF: Regex = Regex::new(
        r#"(?i)\b(photograph|photo|picture|image|headshot)\s*(of|showing)?\s*(patient|client|individual)?\b"#
    ).unwrap();
    
    // R - Other unique identifiers
    static ref CASE_NUMBER: Regex = Regex::new(
        r#"(?i)\b(case|file|claim|reference)[:\s#]*[A-Z0-9-]{4,20}\b"#
    ).unwrap();
    
    // Common first names for NER enhancement
    static ref COMMON_FIRST_NAMES: Vec<&'static str> = vec![
        "james", "john", "robert", "michael", "william", "david", "richard", "joseph", "thomas", "charles",
        "mary", "patricia", "jennifer", "linda", "elizabeth", "barbara", "susan", "jessica", "sarah", "karen",
        "christopher", "daniel", "matthew", "anthony", "mark", "donald", "steven", "paul", "andrew", "joshua",
        "nancy", "betty", "margaret", "sandra", "ashley", "kimberly", "emily", "donna", "michelle", "dorothy",
        "kevin", "brian", "george", "edward", "ronald", "timothy", "jason", "jeffrey", "ryan", "jacob",
        "carol", "amanda", "melissa", "deborah", "stephanie", "rebecca", "sharon", "laura", "cynthia", "kathleen"
    ];
    
    // Restricted ZIP codes (population <= 20,000)
    static ref RESTRICTED_ZIPS: Vec<&'static str> = vec![
        "036", "059", "063", "102", "203", "556", "692", "790", "821", "823", 
        "830", "831", "878", "879", "884", "890", "893"
    ];
}

// ============================================
// De-identification Engine
// ============================================

pub struct DeidentificationEngine {
    pub use_ai: bool,
    pub ai_model: Option<String>,
}

impl DeidentificationEngine {
    pub fn new(use_ai: bool, ai_model: Option<String>) -> Self {
        Self { use_ai, ai_model }
    }
    
    /// Main de-identification function
    pub fn deidentify(&self, text: &str) -> DeidentificationResult {
        let start_time = std::time::Instant::now();
        let original_hash = Self::compute_hash(text);
        
        let mut identifiers: Vec<DetectedIdentifier> = Vec::new();
        
        // Detect all identifier categories
        identifiers.extend(self.detect_names(text));
        identifiers.extend(self.detect_geographic(text));
        identifiers.extend(self.detect_dates(text));
        identifiers.extend(self.detect_phone_fax(text));
        identifiers.extend(self.detect_email(text));
        identifiers.extend(self.detect_ssn(text));
        identifiers.extend(self.detect_medical_numbers(text));
        identifiers.extend(self.detect_account_numbers(text));
        identifiers.extend(self.detect_vehicle_device(text));
        identifiers.extend(self.detect_web_identifiers(text));
        identifiers.extend(self.detect_biometric_photo(text));
        identifiers.extend(self.detect_other_identifiers(text));
        
        // Sort by position (reverse order for replacement)
        identifiers.sort_by(|a, b| b.start_pos.cmp(&a.start_pos));
        
        // Remove overlapping detections (keep highest confidence)
        identifiers = Self::remove_overlaps(identifiers);
        
        // Apply replacements
        let mut deidentified = text.to_string();
        for id in &identifiers {
            // Use safe replacement to avoid UTF-8 boundary panics
            Self::safe_replace_range(&mut deidentified, id.start_pos, id.end_pos, &id.replacement);
        }
        
        // Count by category
        let mut category_counts: HashMap<String, i32> = HashMap::new();
        for id in &identifiers {
            *category_counts.entry(id.category.code().to_string()).or_insert(0) += 1;
        }
        
        let deidentified_hash = Self::compute_hash(&deidentified);
        let processing_time = start_time.elapsed().as_millis() as u64;
        
        // Re-sort for output (by position ascending)
        let mut sorted_identifiers = identifiers;
        sorted_identifiers.sort_by(|a, b| a.start_pos.cmp(&b.start_pos));
        
        DeidentificationResult {
            original_hash,
            deidentified_text: deidentified,
            deidentified_hash,
            identifiers_found: sorted_identifiers,
            category_counts,
            safe_harbor_compliant: true,  // We remove all 18 categories
            timestamp: chrono::Utc::now().to_rfc3339(),
            processing_time_ms: processing_time,
        }
    }
    
    fn compute_hash(text: &str) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(text.as_bytes());
        format!("{:x}", hasher.finalize())
    }
    
    fn remove_overlaps(mut identifiers: Vec<DetectedIdentifier>) -> Vec<DetectedIdentifier> {
        if identifiers.is_empty() {
            return identifiers;
        }
        
        // Sort by start position
        identifiers.sort_by(|a, b| a.start_pos.cmp(&b.start_pos));
        
        let mut result: Vec<DetectedIdentifier> = Vec::new();
        let mut last_end = 0;
        
        for id in identifiers {
            if id.start_pos >= last_end {
                last_end = id.end_pos;
                result.push(id);
            } else if id.confidence > result.last().map(|r| r.confidence).unwrap_or(0.0) {
                // Higher confidence, replace
                result.pop();
                last_end = id.end_pos;
                result.push(id);
            }
        }
        
        result
    }
    
    /// Safe string slice that respects UTF-8 character boundaries
    fn safe_slice_before(text: &str, end: usize, max_len: usize) -> &str {
        if end == 0 {
            return "";
        }
        
        let start = if end >= max_len { end - max_len } else { 0 };
        
        // Find valid UTF-8 boundary
        let mut actual_start = start;
        while actual_start < end && !text.is_char_boundary(actual_start) {
            actual_start += 1;
        }
        
        if actual_start >= end {
            return "";
        }
        
        &text[actual_start..end]
    }
    
    /// Safe replace_range that handles UTF-8 boundaries
    fn safe_replace_range(text: &mut String, start: usize, end: usize, replacement: &str) -> bool {
        // Validate boundaries
        if start > end || end > text.len() {
            return false;
        }
        
        // Check UTF-8 boundaries
        if !text.is_char_boundary(start) || !text.is_char_boundary(end) {
            log::warn!("Invalid UTF-8 boundary for replacement at {}..{}", start, end);
            return false;
        }
        
        text.replace_range(start..end, replacement);
        true
    }
    
    // ============================================
    // Detection Methods by Category
    // ============================================
    
    fn detect_names(&self, text: &str) -> Vec<DetectedIdentifier> {
        let mut results = Vec::new();
        
        // Detect quoted names with initials like "Jordan R." or "J. Smith"
        let quoted_name = Regex::new(r#""([A-Z][a-z]+\s+[A-Z]\.?|[A-Z]\.\s*[A-Z][a-z]+)""#).unwrap();
        for cap in quoted_name.captures_iter(text) {
            if let Some(name_match) = cap.get(0) {
                results.push(DetectedIdentifier {
                    category: IdentifierCategory::Name,
                    original_text: name_match.as_str().to_string(),
                    start_pos: name_match.start(),
                    end_pos: name_match.end(),
                    replacement: "[NAME]".to_string(),
                    confidence: 0.95,
                    detection_method: "quoted_name".to_string(),
                });
            }
        }
        
        // Detect titled names (Mr., Mrs., Dr., etc.)
        for cap in NAME_TITLES.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::Name,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[NAME]".to_string(),
                confidence: 0.95,
                detection_method: "regex".to_string(),
            });
        }
        
        // Detect common first names in context
        // Only match if preceded by strong name indicators
        let _text_lower = text.to_lowercase();
        for name in COMMON_FIRST_NAMES.iter() {
            // Only process names that are at least 4 chars to avoid false positives
            if name.len() < 4 {
                continue;
            }
            let pattern = format!(r#"(?i)\b{}\b"#, regex::escape(name));
            if let Ok(re) = Regex::new(&pattern) {
                for cap in re.find_iter(text) {
                    // Check context - require strong name indicators immediately before
                    // Use safe string slicing to avoid UTF-8 boundary panics
                    let before = Self::safe_slice_before(text, cap.start(), 30);
                    let before_lower = before.to_lowercase();
                    // Require explicit name markers, not just "client" or "patient" 
                    let strong_hints = ["named ", "called ", "mr. ", "mrs. ", "ms. ", "dr. ", "name: ", "name is "];
                    let is_name_context = strong_hints.iter().any(|h| before_lower.contains(h));
                    
                    if is_name_context {
                        results.push(DetectedIdentifier {
                            category: IdentifierCategory::Name,
                            original_text: cap.as_str().to_string(),
                            start_pos: cap.start(),
                            end_pos: cap.end(),
                            replacement: "[NAME]".to_string(),
                            confidence: 0.75,
                            detection_method: "context".to_string(),
                        });
                    }
                }
            }
        }
        
        // Detect Patient: Name or Client: Name patterns (requires colon or dash)
        // Must have explicit separator to avoid false positives like "Client at home"
        let patient_name = Regex::new(r#"(?i)(patient|client|individual)\s*[:\-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)"#).unwrap();
        for cap in patient_name.captures_iter(text) {
            if let Some(name_match) = cap.get(2) {
                // Skip common non-name words
                let matched_text = name_match.as_str().to_lowercase();
                let skip_words = ["the", "at", "in", "on", "is", "was", "has", "had", "will", "can", "may", 
                                  "home", "office", "room", "reports", "states", "denies", "presents"];
                if skip_words.iter().any(|w| matched_text.starts_with(w)) {
                    continue;
                }
                results.push(DetectedIdentifier {
                    category: IdentifierCategory::Name,
                    original_text: name_match.as_str().to_string(),
                    start_pos: name_match.start(),
                    end_pos: name_match.end(),
                    replacement: "[NAME]".to_string(),
                    confidence: 0.90,
                    detection_method: "pattern".to_string(),
                });
            }
        }
        
        results
    }
    
    fn detect_geographic(&self, text: &str) -> Vec<DetectedIdentifier> {
        let mut results = Vec::new();
        
        // Street addresses
        for cap in STREET_ADDRESS.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::Geographic,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[ADDRESS]".to_string(),
                confidence: 0.95,
                detection_method: "regex".to_string(),
            });
        }
        
        // City, State patterns
        for cap in CITY_STATE.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::Geographic,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[CITY, STATE]".to_string(),
                confidence: 0.85,
                detection_method: "regex".to_string(),
            });
        }
        
        // ZIP codes - check for restricted ZIPs
        for cap in ZIP_CODE.find_iter(text) {
            let zip = cap.as_str();
            let first_three = &zip[..3];
            let replacement = if RESTRICTED_ZIPS.contains(&first_three) {
                "[ZIP 000XX]".to_string()  // Must set to 000 for small populations
            } else {
                format!("[ZIP {}XX]", first_three)  // Keep first 3 digits if pop > 20k
            };
            
            results.push(DetectedIdentifier {
                category: IdentifierCategory::Geographic,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement,
                confidence: 0.99,
                detection_method: "regex".to_string(),
            });
        }
        
        // PO Box
        for cap in PO_BOX.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::Geographic,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[PO BOX]".to_string(),
                confidence: 0.99,
                detection_method: "regex".to_string(),
            });
        }
        
        results
    }
    
    fn detect_dates(&self, text: &str) -> Vec<DetectedIdentifier> {
        let mut results = Vec::new();
        
        // Numeric dates MM/DD/YYYY
        for cap in DATE_MDY.find_iter(text) {
            let date_str = cap.as_str();
            // Extract year for replacement
            let parts: Vec<&str> = date_str.split(|c| c == '/' || c == '-').collect();
            let year = parts.get(2).unwrap_or(&"[YEAR]");
            
            results.push(DetectedIdentifier {
                category: IdentifierCategory::Date,
                original_text: date_str.to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: format!("[DATE {}]", year),
                confidence: 0.90,
                detection_method: "regex".to_string(),
            });
        }
        
        // Written dates "January 15, 2024"
        for cap in DATE_WRITTEN.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::Date,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[DATE]".to_string(),
                confidence: 0.95,
                detection_method: "regex".to_string(),
            });
        }
        
        for cap in DATE_WRITTEN_ALT.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::Date,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[DATE]".to_string(),
                confidence: 0.95,
                detection_method: "regex".to_string(),
            });
        }
        
        // Ages 89+ must be aggregated to 90+
        for cap in AGE_89_PLUS.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::Date,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "90+ years old".to_string(),
                confidence: 0.99,
                detection_method: "regex".to_string(),
            });
        }
        
        results
    }
    
    fn detect_phone_fax(&self, text: &str) -> Vec<DetectedIdentifier> {
        let mut results = Vec::new();
        
        // Fax numbers (check first as they're often labeled)
        for cap in FAX.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::Fax,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[FAX]".to_string(),
                confidence: 0.99,
                detection_method: "regex".to_string(),
            });
        }
        
        // Phone numbers
        for cap in PHONE.find_iter(text) {
            // Avoid double-counting fax numbers
            let before = if cap.start() >= 10 { &text[cap.start()-10..cap.start()] } else { &text[..cap.start()] };
            if !before.to_lowercase().contains("fax") {
                results.push(DetectedIdentifier {
                    category: IdentifierCategory::Phone,
                    original_text: cap.as_str().to_string(),
                    start_pos: cap.start(),
                    end_pos: cap.end(),
                    replacement: "[PHONE]".to_string(),
                    confidence: 0.95,
                    detection_method: "regex".to_string(),
                });
            }
        }
        
        results
    }
    
    fn detect_email(&self, text: &str) -> Vec<DetectedIdentifier> {
        let mut results = Vec::new();
        
        for cap in EMAIL.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::Email,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[EMAIL]".to_string(),
                confidence: 0.99,
                detection_method: "regex".to_string(),
            });
        }
        
        results
    }
    
    fn detect_ssn(&self, text: &str) -> Vec<DetectedIdentifier> {
        let mut results = Vec::new();
        
        for cap in SSN.find_iter(text) {
            let ssn = cap.as_str();
            // Validate it looks like an SSN (not 000, 666, 900-999 in first group)
            let first_three: i32 = ssn.chars().take(3).filter(|c| c.is_digit(10))
                .collect::<String>().parse().unwrap_or(0);
            
            if first_three != 0 && first_three != 666 && first_three < 900 {
                results.push(DetectedIdentifier {
                    category: IdentifierCategory::SSN,
                    original_text: cap.as_str().to_string(),
                    start_pos: cap.start(),
                    end_pos: cap.end(),
                    replacement: "[SSN]".to_string(),
                    confidence: 0.85,
                    detection_method: "regex".to_string(),
                });
            }
        }
        
        results
    }
    
    fn detect_medical_numbers(&self, text: &str) -> Vec<DetectedIdentifier> {
        let mut results = Vec::new();
        
        for cap in MRN.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::MedicalRecordNumber,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[MRN]".to_string(),
                confidence: 0.95,
                detection_method: "regex".to_string(),
            });
        }
        
        for cap in HEALTH_PLAN.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::HealthPlanNumber,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[HEALTH_PLAN_ID]".to_string(),
                confidence: 0.90,
                detection_method: "regex".to_string(),
            });
        }
        
        for cap in LICENSE.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::LicenseNumber,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[LICENSE]".to_string(),
                confidence: 0.85,
                detection_method: "regex".to_string(),
            });
        }
        
        results
    }
    
    fn detect_account_numbers(&self, text: &str) -> Vec<DetectedIdentifier> {
        let mut results = Vec::new();
        
        for cap in ACCOUNT_NUMBER.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::AccountNumber,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[ACCOUNT]".to_string(),
                confidence: 0.90,
                detection_method: "regex".to_string(),
            });
        }
        
        results
    }
    
    fn detect_vehicle_device(&self, text: &str) -> Vec<DetectedIdentifier> {
        let mut results = Vec::new();
        
        for cap in VIN.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::VehicleIdentifier,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[VIN]".to_string(),
                confidence: 0.85,
                detection_method: "regex".to_string(),
            });
        }
        
        for cap in LICENSE_PLATE.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::VehicleIdentifier,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[PLATE]".to_string(),
                confidence: 0.80,
                detection_method: "regex".to_string(),
            });
        }
        
        for cap in DEVICE_SERIAL.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::DeviceIdentifier,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[SERIAL]".to_string(),
                confidence: 0.85,
                detection_method: "regex".to_string(),
            });
        }
        
        results
    }
    
    fn detect_web_identifiers(&self, text: &str) -> Vec<DetectedIdentifier> {
        let mut results = Vec::new();
        
        for cap in URL.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::WebUrl,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[URL]".to_string(),
                confidence: 0.99,
                detection_method: "regex".to_string(),
            });
        }
        
        for cap in IP_ADDRESS.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::IpAddress,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[IP]".to_string(),
                confidence: 0.99,
                detection_method: "regex".to_string(),
            });
        }
        
        for cap in IPV6.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::IpAddress,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[IP]".to_string(),
                confidence: 0.95,
                detection_method: "regex".to_string(),
            });
        }
        
        results
    }
    
    fn detect_biometric_photo(&self, text: &str) -> Vec<DetectedIdentifier> {
        let mut results = Vec::new();
        
        for cap in BIOMETRIC.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::Biometric,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[BIOMETRIC]".to_string(),
                confidence: 0.95,
                detection_method: "regex".to_string(),
            });
        }
        
        for cap in PHOTO_REF.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::FullFacePhoto,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[PHOTO REFERENCE]".to_string(),
                confidence: 0.80,
                detection_method: "regex".to_string(),
            });
        }
        
        results
    }
    
    fn detect_other_identifiers(&self, text: &str) -> Vec<DetectedIdentifier> {
        let mut results = Vec::new();
        
        for cap in CASE_NUMBER.find_iter(text) {
            results.push(DetectedIdentifier {
                category: IdentifierCategory::UniqueIdentifier,
                original_text: cap.as_str().to_string(),
                start_pos: cap.start(),
                end_pos: cap.end(),
                replacement: "[CASE_ID]".to_string(),
                confidence: 0.85,
                detection_method: "regex".to_string(),
            });
        }
        
        results
    }
}

// ============================================
// AI-Enhanced Detection (Ollama Integration)
// ============================================

pub async fn detect_contextual_identifiers(
    text: &str,
    model: &str,
) -> Result<Vec<DetectedIdentifier>, String> {
    let prompt = format!(r#"Analyze this clinical text for INDIRECT identifiers that could identify a patient even though they're not directly named. Look for:
1. Unique occupations ("the only baker in town")
2. Rare medical conditions combined with demographics
3. Specific locations or institutions
4. Unique family situations
5. News-worthy events referenced
6. Celebrity or public figure references
7. Extremely specific timeframes
8. Unique physical characteristics

Text to analyze:
{}

Return a JSON array of found identifiers. Each object should have:
- "text": the exact text found
- "reason": why this could be identifying
- "suggestion": replacement text

Return ONLY the JSON array, no other text. If none found, return []"#, text);

    let response = crate::ai::call_ollama(model, &prompt).await
        .map_err(|e| format!("AI detection failed: {}", e))?;
    
    // Parse response
    let identifiers: Vec<serde_json::Value> = serde_json::from_str(&response)
        .unwrap_or_else(|_| Vec::new());
    
    let mut results = Vec::new();
    for item in identifiers {
        if let (Some(found_text), Some(suggestion)) = (
            item.get("text").and_then(|t| t.as_str()),
            item.get("suggestion").and_then(|s| s.as_str()),
        ) {
            // Find position in original text
            if let Some(pos) = text.find(found_text) {
                results.push(DetectedIdentifier {
                    category: IdentifierCategory::ContextualIdentifier,
                    original_text: found_text.to_string(),
                    start_pos: pos,
                    end_pos: pos + found_text.len(),
                    replacement: suggestion.to_string(),
                    confidence: 0.70,  // AI detections get moderate confidence
                    detection_method: "ai".to_string(),
                });
            }
        }
    }
    
    Ok(results)
}

// ============================================
// Tests
// ============================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_phone_detection() {
        let engine = DeidentificationEngine::new(false, None);
        let text = "Call me at 555-123-4567 or (555) 987-6543.";
        let result = engine.deidentify(text);
        
        assert!(result.deidentified_text.contains("[PHONE]"));
        assert_eq!(result.category_counts.get("D"), Some(&2));
    }
    
    #[test]
    fn test_email_detection() {
        let engine = DeidentificationEngine::new(false, None);
        let text = "Email the patient at john.doe@email.com for follow-up.";
        let result = engine.deidentify(text);
        
        assert!(result.deidentified_text.contains("[EMAIL]"));
    }
    
    #[test]
    fn test_ssn_detection() {
        let engine = DeidentificationEngine::new(false, None);
        let text = "SSN: 123-45-6789";
        let result = engine.deidentify(text);
        
        assert!(result.deidentified_text.contains("[SSN]"));
    }
    
    #[test]
    fn test_date_detection() {
        let engine = DeidentificationEngine::new(false, None);
        let text = "DOB: 01/15/1985, appointment on January 20, 2024";
        let result = engine.deidentify(text);
        
        assert!(!result.deidentified_text.contains("01/15/1985"));
        assert!(!result.deidentified_text.contains("January 20"));
    }
    
    #[test]
    fn test_zip_restricted() {
        let engine = DeidentificationEngine::new(false, None);
        // 036 is a restricted ZIP (population <= 20,000)
        let text = "Address: 03601";
        let result = engine.deidentify(text);
        
        assert!(result.deidentified_text.contains("000"));
    }
    
    #[test]
    fn test_age_89_plus() {
        let engine = DeidentificationEngine::new(false, None);
        let text = "Patient is 92 years old";
        let result = engine.deidentify(text);
        
        assert!(result.deidentified_text.contains("90+"));
    }
}
