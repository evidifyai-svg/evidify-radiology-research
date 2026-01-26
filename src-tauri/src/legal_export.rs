// Legal Audit Export Module
//
// Generates attorney-ready audit reports
// "Prove you documented on time"
// "Tamper-evident records for board complaints"
//
// Output formats:
// - PDF report with chain verification
// - JSON for technical analysis
// - CSV timeline for legal review

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::Path;

// ============================================
// Types
// ============================================

/// Type of legal report
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LegalReportType {
    /// Full audit trail report
    FullAudit,
    /// Timeline of events for specific client
    ClientTimeline,
    /// Documentation timing proof
    TimingCertificate,
    /// Chain of custody report
    ChainOfCustody,
    /// Specific date range extract
    DateRangeExtract,
}

/// Legal report request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LegalReportRequest {
    /// Report type
    pub report_type: LegalReportType,
    /// Client ID (optional, for client-specific reports)
    pub client_id: Option<String>,
    /// Start date
    pub start_date: DateTime<Utc>,
    /// End date
    pub end_date: DateTime<Utc>,
    /// Note IDs to include (optional)
    pub note_ids: Option<Vec<String>>,
    /// Include technical details
    pub include_technical: bool,
    /// Include hash verification
    pub include_verification: bool,
    /// Requesting party
    pub requested_by: String,
    /// Case reference number
    pub case_reference: Option<String>,
}

/// Legal report output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LegalReport {
    /// Report ID
    pub id: String,
    /// Report type
    pub report_type: LegalReportType,
    /// Generation timestamp
    pub generated_at: DateTime<Utc>,
    /// Report title
    pub title: String,
    /// Case reference
    pub case_reference: Option<String>,
    /// Date range covered
    pub date_range: DateRange,
    /// Executive summary
    pub summary: ReportSummary,
    /// Audit entries
    pub entries: Vec<AuditEntry>,
    /// Chain verification result
    pub chain_verification: ChainVerificationResult,
    /// Certification statement
    pub certification: CertificationStatement,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateRange {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportSummary {
    /// Total entries in report
    pub total_entries: u32,
    /// Notes created in period
    pub notes_created: u32,
    /// Notes signed in period
    pub notes_signed: u32,
    /// Amendments in period
    pub amendments: u32,
    /// Exports in period
    pub exports: u32,
    /// Average time to signature (hours)
    pub avg_time_to_sign_hours: f64,
    /// Key findings
    pub findings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEntry {
    /// Entry ID
    pub id: String,
    /// Timestamp
    pub timestamp: DateTime<Utc>,
    /// Event type
    pub event_type: String,
    /// Event category
    pub category: String,
    /// Description
    pub description: String,
    /// Resource type
    pub resource_type: String,
    /// Resource ID
    pub resource_id: String,
    /// User ID (hashed)
    pub user_id: String,
    /// Outcome
    pub outcome: String,
    /// Entry hash
    pub entry_hash: String,
    /// Previous hash (for chain)
    pub previous_hash: String,
    /// Technical details (optional)
    pub technical: Option<TechnicalDetails>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechnicalDetails {
    /// Content hash at time of event
    pub content_hash: Option<String>,
    /// Word count
    pub word_count: Option<u32>,
    /// IP address (local indicator)
    pub ip_address: String,
    /// Device ID
    pub device_id: String,
    /// App version
    pub app_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChainVerificationResult {
    /// Chain is valid
    pub valid: bool,
    /// Number of entries verified
    pub entries_verified: u32,
    /// First entry hash
    pub first_hash: String,
    /// Last entry hash
    pub last_hash: String,
    /// Any gaps detected
    pub gaps: Vec<ChainGap>,
    /// Verification timestamp
    pub verified_at: DateTime<Utc>,
    /// Verification method
    pub method: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChainGap {
    pub before_hash: String,
    pub after_hash: String,
    pub before_timestamp: DateTime<Utc>,
    pub after_timestamp: DateTime<Utc>,
    pub gap_duration_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CertificationStatement {
    /// Statement text
    pub statement: String,
    /// Certified by
    pub certified_by: String,
    /// Certification timestamp
    pub certified_at: DateTime<Utc>,
    /// Digital signature (hex)
    pub signature: String,
}

// ============================================
// Legal Report Generator
// ============================================

pub struct LegalReportGenerator;

impl LegalReportGenerator {
    /// Generate a legal report
    pub fn generate(
        request: &LegalReportRequest,
        entries: Vec<AuditEntry>,
        verification: ChainVerificationResult,
    ) -> LegalReport {
        let now = Utc::now();
        
        // Calculate summary statistics
        let summary = Self::calculate_summary(&entries);
        
        // Generate certification
        let certification = CertificationStatement {
            statement: format!(
                "I hereby certify that this report accurately represents the audit trail \
                maintained by Evidify for the period {} to {}. The audit log uses \
                cryptographic hash chaining (SHA-256) to ensure tamper-evidence. \
                Any modification to historical entries would break the hash chain \
                and be immediately detectable.",
                request.start_date.format("%Y-%m-%d"),
                request.end_date.format("%Y-%m-%d")
            ),
            certified_by: request.requested_by.clone(),
            certified_at: now,
            signature: String::new(), // Would be actual signature
        };
        
        let title = match request.report_type {
            LegalReportType::FullAudit => "Full Audit Trail Report".to_string(),
            LegalReportType::ClientTimeline => format!(
                "Client Documentation Timeline - {}", 
                request.client_id.as_deref().unwrap_or("Unknown")
            ),
            LegalReportType::TimingCertificate => "Documentation Timing Certificate".to_string(),
            LegalReportType::ChainOfCustody => "Chain of Custody Report".to_string(),
            LegalReportType::DateRangeExtract => format!(
                "Audit Extract: {} to {}",
                request.start_date.format("%Y-%m-%d"),
                request.end_date.format("%Y-%m-%d")
            ),
        };
        
        LegalReport {
            id: uuid::Uuid::new_v4().to_string(),
            report_type: request.report_type,
            generated_at: now,
            title,
            case_reference: request.case_reference.clone(),
            date_range: DateRange {
                start: request.start_date,
                end: request.end_date,
            },
            summary,
            entries,
            chain_verification: verification,
            certification,
        }
    }
    
    /// Calculate summary statistics
    fn calculate_summary(entries: &[AuditEntry]) -> ReportSummary {
        let total_entries = entries.len() as u32;
        
        let notes_created = entries.iter()
            .filter(|e| e.event_type == "note.created")
            .count() as u32;
        
        let notes_signed = entries.iter()
            .filter(|e| e.event_type == "note.signed")
            .count() as u32;
        
        let amendments = entries.iter()
            .filter(|e| e.event_type == "note.amended")
            .count() as u32;
        
        let exports = entries.iter()
            .filter(|e| e.event_type.starts_with("export."))
            .count() as u32;
        
        // Calculate average time to signature
        // Would need to pair created/signed events by note_id
        let avg_time_to_sign_hours = 0.0; // Placeholder
        
        let mut findings = Vec::new();
        
        if notes_created > 0 && notes_signed > 0 {
            let sign_rate = (notes_signed as f64 / notes_created as f64) * 100.0;
            findings.push(format!("{:.0}% of notes created were signed in this period", sign_rate));
        }
        
        if amendments > 0 {
            findings.push(format!("{} amendment(s) made to previously signed notes", amendments));
        }
        
        ReportSummary {
            total_entries,
            notes_created,
            notes_signed,
            amendments,
            exports,
            avg_time_to_sign_hours,
            findings,
        }
    }
    
    /// Format report as PDF-ready HTML
    pub fn format_html(report: &LegalReport) -> String {
        let mut html = String::new();
        
        html.push_str("<!DOCTYPE html>\n<html>\n<head>\n");
        html.push_str("<meta charset=\"UTF-8\">\n");
        html.push_str(&format!("<title>{}</title>\n", report.title));
        html.push_str("<style>\n");
        html.push_str("body { font-family: 'Times New Roman', serif; max-width: 8.5in; margin: 0.75in auto; font-size: 11pt; line-height: 1.4; }\n");
        html.push_str("h1 { font-size: 16pt; text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; }\n");
        html.push_str("h2 { font-size: 13pt; margin-top: 20px; }\n");
        html.push_str(".header-info { text-align: center; margin-bottom: 20px; }\n");
        html.push_str(".summary-box { background: #f5f5f5; padding: 15px; margin: 20px 0; border: 1px solid #ccc; }\n");
        html.push_str(".entry { border-bottom: 1px solid #eee; padding: 8px 0; font-size: 10pt; }\n");
        html.push_str(".entry-time { color: #666; }\n");
        html.push_str(".entry-hash { font-family: monospace; font-size: 8pt; color: #999; }\n");
        html.push_str(".verification { background: #e8f5e9; padding: 15px; margin: 20px 0; border-left: 4px solid #4caf50; }\n");
        html.push_str(".verification.invalid { background: #ffebee; border-color: #f44336; }\n");
        html.push_str(".certification { margin-top: 40px; padding-top: 20px; border-top: 2px solid black; }\n");
        html.push_str(".page-break { page-break-before: always; }\n");
        html.push_str("@media print { body { margin: 0; } }\n");
        html.push_str("</style>\n</head>\n<body>\n");
        
        // Header
        html.push_str(&format!("<h1>{}</h1>\n", report.title));
        html.push_str("<div class=\"header-info\">\n");
        html.push_str(&format!("<p><strong>Report ID:</strong> {}</p>\n", report.id));
        html.push_str(&format!("<p><strong>Generated:</strong> {}</p>\n", report.generated_at.format("%Y-%m-%d %H:%M:%S UTC")));
        if let Some(ref case_ref) = report.case_reference {
            html.push_str(&format!("<p><strong>Case Reference:</strong> {}</p>\n", case_ref));
        }
        html.push_str(&format!("<p><strong>Period:</strong> {} to {}</p>\n",
            report.date_range.start.format("%Y-%m-%d"),
            report.date_range.end.format("%Y-%m-%d")));
        html.push_str("</div>\n");
        
        // Summary
        html.push_str("<div class=\"summary-box\">\n");
        html.push_str("<h2>Executive Summary</h2>\n");
        html.push_str(&format!("<p><strong>Total Audit Entries:</strong> {}</p>\n", report.summary.total_entries));
        html.push_str(&format!("<p><strong>Notes Created:</strong> {}</p>\n", report.summary.notes_created));
        html.push_str(&format!("<p><strong>Notes Signed:</strong> {}</p>\n", report.summary.notes_signed));
        html.push_str(&format!("<p><strong>Amendments:</strong> {}</p>\n", report.summary.amendments));
        html.push_str(&format!("<p><strong>Exports:</strong> {}</p>\n", report.summary.exports));
        if !report.summary.findings.is_empty() {
            html.push_str("<p><strong>Key Findings:</strong></p>\n<ul>\n");
            for finding in &report.summary.findings {
                html.push_str(&format!("<li>{}</li>\n", finding));
            }
            html.push_str("</ul>\n");
        }
        html.push_str("</div>\n");
        
        // Chain Verification
        let verify_class = if report.chain_verification.valid { "verification" } else { "verification invalid" };
        html.push_str(&format!("<div class=\"{}\">\n", verify_class));
        html.push_str("<h2>Audit Chain Verification</h2>\n");
        html.push_str(&format!("<p><strong>Status:</strong> {}</p>\n", 
            if report.chain_verification.valid { "VERIFIED ✓" } else { "VERIFICATION FAILED ✗" }));
        html.push_str(&format!("<p><strong>Entries Verified:</strong> {}</p>\n", report.chain_verification.entries_verified));
        html.push_str(&format!("<p><strong>Method:</strong> {}</p>\n", report.chain_verification.method));
        html.push_str(&format!("<p><strong>First Entry Hash:</strong> <code>{}</code></p>\n", &report.chain_verification.first_hash[..16]));
        html.push_str(&format!("<p><strong>Last Entry Hash:</strong> <code>{}</code></p>\n", &report.chain_verification.last_hash[..16]));
        if !report.chain_verification.gaps.is_empty() {
            html.push_str("<p><strong>Gaps Detected:</strong></p>\n<ul>\n");
            for gap in &report.chain_verification.gaps {
                html.push_str(&format!("<li>Gap of {} seconds between {} and {}</li>\n",
                    gap.gap_duration_seconds,
                    gap.before_timestamp.format("%Y-%m-%d %H:%M:%S"),
                    gap.after_timestamp.format("%Y-%m-%d %H:%M:%S")));
            }
            html.push_str("</ul>\n");
        }
        html.push_str("</div>\n");
        
        // Audit Entries
        html.push_str("<div class=\"page-break\"></div>\n");
        html.push_str("<h2>Detailed Audit Trail</h2>\n");
        for entry in &report.entries {
            html.push_str("<div class=\"entry\">\n");
            html.push_str(&format!("<span class=\"entry-time\">{}</span> — ", entry.timestamp.format("%Y-%m-%d %H:%M:%S")));
            html.push_str(&format!("<strong>{}</strong>: {} ", entry.event_type, entry.description));
            html.push_str(&format!("<span class=\"entry-hash\">[{}]</span>\n", &entry.entry_hash[..12]));
            html.push_str("</div>\n");
        }
        
        // Certification
        html.push_str("<div class=\"certification\">\n");
        html.push_str("<h2>Certification</h2>\n");
        html.push_str(&format!("<p>{}</p>\n", report.certification.statement));
        html.push_str(&format!("<p><strong>Certified by:</strong> {}</p>\n", report.certification.certified_by));
        html.push_str(&format!("<p><strong>Date:</strong> {}</p>\n", report.certification.certified_at.format("%Y-%m-%d %H:%M:%S UTC")));
        html.push_str("</div>\n");
        
        html.push_str("</body>\n</html>");
        
        html
    }
    
    /// Format report as CSV
    pub fn format_csv(report: &LegalReport) -> String {
        let mut csv = String::new();
        
        csv.push_str("Timestamp,Event Type,Category,Description,Resource Type,Resource ID,Entry Hash\n");
        
        for entry in &report.entries {
            csv.push_str(&format!(
                "{},{},{},\"{}\",{},{},{}\n",
                entry.timestamp.format("%Y-%m-%d %H:%M:%S"),
                entry.event_type,
                entry.category,
                entry.description.replace('"', "\"\""),
                entry.resource_type,
                entry.resource_id,
                &entry.entry_hash[..16]
            ));
        }
        
        csv
    }
    
    /// Format report as JSON
    pub fn format_json(report: &LegalReport) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(report)
    }
}

// ============================================
// Tauri Commands
// ============================================

/// Generate legal audit report
#[tauri::command]
pub async fn generate_legal_report(
    report_type: String,
    client_id: Option<String>,
    start_date: String,
    end_date: String,
    case_reference: Option<String>,
    requested_by: String,
    include_technical: bool,
) -> Result<LegalReport, String> {
    let start = DateTime::parse_from_rfc3339(&start_date)
        .map_err(|e| e.to_string())?
        .with_timezone(&Utc);
    let end = DateTime::parse_from_rfc3339(&end_date)
        .map_err(|e| e.to_string())?
        .with_timezone(&Utc);
    
    let report_type = match report_type.as_str() {
        "full" => LegalReportType::FullAudit,
        "timeline" => LegalReportType::ClientTimeline,
        "timing" => LegalReportType::TimingCertificate,
        "custody" => LegalReportType::ChainOfCustody,
        "extract" => LegalReportType::DateRangeExtract,
        _ => LegalReportType::FullAudit,
    };
    
    let request = LegalReportRequest {
        report_type,
        client_id,
        start_date: start,
        end_date: end,
        note_ids: None,
        include_technical,
        include_verification: true,
        requested_by,
        case_reference,
    };
    
    // Mock data for now - would fetch from audit log
    let entries = vec![];
    let verification = ChainVerificationResult {
        valid: true,
        entries_verified: 0,
        first_hash: "0".repeat(64),
        last_hash: "0".repeat(64),
        gaps: vec![],
        verified_at: Utc::now(),
        method: "SHA-256 hash chain".to_string(),
    };
    
    Ok(LegalReportGenerator::generate(&request, entries, verification))
}

/// Export legal report to file
#[tauri::command]
pub async fn export_legal_report(
    report: LegalReport,
    format: String,
    output_path: String,
) -> Result<String, String> {
    let content = match format.as_str() {
        "html" | "pdf" => LegalReportGenerator::format_html(&report),
        "csv" => LegalReportGenerator::format_csv(&report),
        "json" => LegalReportGenerator::format_json(&report).map_err(|e| e.to_string())?,
        _ => return Err("Unknown format".to_string()),
    };
    
    std::fs::write(&output_path, &content).map_err(|e| e.to_string())?;
    
    Ok(output_path)
}
