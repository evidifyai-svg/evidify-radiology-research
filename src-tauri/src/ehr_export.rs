// EHR Export Module
//
// One-click export to common EHR systems
// "Add-on, not replacement" positioning
//
// Supported formats:
// - SimplePractice (CSV)
// - TherapyNotes (TXT structured)
// - Jane App (HTML)
// - Generic CCDA (XML)
// - PDF (universal)
// - DOCX (universal)

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::Path;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum EhrExportError {
    #[error("Unknown EHR format: {0}")]
    UnknownFormat(String),
    
    #[error("Export failed: {0}")]
    ExportFailed(String),
    
    #[error("Template not found: {0}")]
    TemplateNotFound(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

// ============================================
// EHR Target Systems
// ============================================

/// Supported EHR systems
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EhrTarget {
    /// SimplePractice - CSV import
    SimplePractice,
    /// TherapyNotes - structured text
    TherapyNotes,
    /// Jane App - HTML import
    JaneApp,
    /// Practice Fusion - CCDA
    PracticeFusion,
    /// Epic - CCDA
    Epic,
    /// Generic PDF
    Pdf,
    /// Generic DOCX
    Docx,
    /// Plain text
    PlainText,
}

impl EhrTarget {
    pub fn file_extension(&self) -> &'static str {
        match self {
            EhrTarget::SimplePractice => "csv",
            EhrTarget::TherapyNotes => "txt",
            EhrTarget::JaneApp => "html",
            EhrTarget::PracticeFusion | EhrTarget::Epic => "xml",
            EhrTarget::Pdf => "pdf",
            EhrTarget::Docx => "docx",
            EhrTarget::PlainText => "txt",
        }
    }
    
    pub fn display_name(&self) -> &'static str {
        match self {
            EhrTarget::SimplePractice => "SimplePractice",
            EhrTarget::TherapyNotes => "TherapyNotes",
            EhrTarget::JaneApp => "Jane App",
            EhrTarget::PracticeFusion => "Practice Fusion",
            EhrTarget::Epic => "Epic",
            EhrTarget::Pdf => "PDF",
            EhrTarget::Docx => "Word Document",
            EhrTarget::PlainText => "Plain Text",
        }
    }
    
    pub fn description(&self) -> &'static str {
        match self {
            EhrTarget::SimplePractice => "Import via CSV upload in SimplePractice",
            EhrTarget::TherapyNotes => "Copy/paste formatted note into TherapyNotes",
            EhrTarget::JaneApp => "Import via Jane's document upload",
            EhrTarget::PracticeFusion => "CCDA format for Practice Fusion import",
            EhrTarget::Epic => "CCDA format for Epic import",
            EhrTarget::Pdf => "Universal PDF for any system",
            EhrTarget::Docx => "Word document for manual import",
            EhrTarget::PlainText => "Plain text for copy/paste",
        }
    }
}

// ============================================
// Export Data Structures
// ============================================

/// Note data for export
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportableNote {
    pub id: String,
    pub client_id: String,
    pub client_name: String,
    pub session_date: String,
    pub note_type: String,
    pub content: String,
    pub signed_at: Option<DateTime<Utc>>,
    pub signed_by: Option<String>,
    pub word_count: u32,
    pub amendments: Vec<Amendment>,
    pub attestations: Vec<AttestationRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Amendment {
    pub created_at: DateTime<Utc>,
    pub reason: String,
    pub content: String,
    pub signed_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttestationRecord {
    pub detection_id: String,
    pub detection_title: String,
    pub response: String,
    pub explanation: Option<String>,
    pub attested_at: DateTime<Utc>,
}

/// Export options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportOptions {
    /// Target EHR system
    pub target: EhrTarget,
    /// Include attestations
    pub include_attestations: bool,
    /// Include amendments
    pub include_amendments: bool,
    /// Include signature block
    pub include_signature: bool,
    /// Custom header text
    pub custom_header: Option<String>,
    /// Custom footer text
    pub custom_footer: Option<String>,
}

impl Default for ExportOptions {
    fn default() -> Self {
        Self {
            target: EhrTarget::Pdf,
            include_attestations: false,
            include_amendments: true,
            include_signature: true,
            custom_header: None,
            custom_footer: None,
        }
    }
}

/// Export result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportResult {
    pub success: bool,
    pub target: EhrTarget,
    pub file_path: Option<String>,
    pub file_size: u64,
    pub notes_exported: u32,
    pub export_time_ms: u64,
    pub instructions: String,
}

// ============================================
// EHR Exporter
// ============================================

/// Main exporter
pub struct EhrExporter;

impl EhrExporter {
    /// Export single note
    pub fn export_note(
        note: &ExportableNote,
        options: &ExportOptions,
        output_dir: &Path,
    ) -> Result<ExportResult, EhrExportError> {
        let start = std::time::Instant::now();
        
        let content = match options.target {
            EhrTarget::SimplePractice => Self::format_simplepractice(note, options)?,
            EhrTarget::TherapyNotes => Self::format_therapynotes(note, options)?,
            EhrTarget::JaneApp => Self::format_janeapp(note, options)?,
            EhrTarget::PracticeFusion | EhrTarget::Epic => Self::format_ccda(note, options)?,
            EhrTarget::Pdf => Self::format_pdf(note, options)?,
            EhrTarget::Docx => Self::format_docx(note, options)?,
            EhrTarget::PlainText => Self::format_plaintext(note, options)?,
        };
        
        // Generate filename
        let filename = format!(
            "{}_{}_{}_{}.{}",
            sanitize_filename(&note.client_name),
            note.session_date,
            note.note_type,
            note.id[..8].to_string(),
            options.target.file_extension()
        );
        
        let file_path = output_dir.join(&filename);
        std::fs::write(&file_path, &content)?;
        
        let file_size = content.len() as u64;
        let export_time_ms = start.elapsed().as_millis() as u64;
        
        Ok(ExportResult {
            success: true,
            target: options.target,
            file_path: Some(file_path.to_string_lossy().to_string()),
            file_size,
            notes_exported: 1,
            export_time_ms,
            instructions: Self::get_import_instructions(options.target),
        })
    }
    
    /// Export multiple notes (batch)
    pub fn export_batch(
        notes: &[ExportableNote],
        options: &ExportOptions,
        output_dir: &Path,
    ) -> Result<ExportResult, EhrExportError> {
        let start = std::time::Instant::now();
        let mut total_size: u64 = 0;
        
        // For CSV formats, combine into single file
        if options.target == EhrTarget::SimplePractice {
            let content = Self::format_simplepractice_batch(notes, options)?;
            let filename = format!("evidify_export_{}.csv", Utc::now().format("%Y%m%d_%H%M%S"));
            let file_path = output_dir.join(&filename);
            std::fs::write(&file_path, &content)?;
            total_size = content.len() as u64;
            
            return Ok(ExportResult {
                success: true,
                target: options.target,
                file_path: Some(file_path.to_string_lossy().to_string()),
                file_size: total_size,
                notes_exported: notes.len() as u32,
                export_time_ms: start.elapsed().as_millis() as u64,
                instructions: Self::get_import_instructions(options.target),
            });
        }
        
        // For other formats, export individually
        for note in notes {
            let result = Self::export_note(note, options, output_dir)?;
            total_size += result.file_size;
        }
        
        Ok(ExportResult {
            success: true,
            target: options.target,
            file_path: Some(output_dir.to_string_lossy().to_string()),
            file_size: total_size,
            notes_exported: notes.len() as u32,
            export_time_ms: start.elapsed().as_millis() as u64,
            instructions: Self::get_import_instructions(options.target),
        })
    }
    
    // ============================================
    // Format-Specific Implementations
    // ============================================
    
    /// SimplePractice CSV format
    fn format_simplepractice(note: &ExportableNote, options: &ExportOptions) -> Result<String, EhrExportError> {
        let mut csv = String::new();
        csv.push_str("Client Name,Service Date,Note Type,Note Content,Signed By,Signed Date\n");
        csv.push_str(&format!(
            "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"\n",
            escape_csv(&note.client_name),
            note.session_date,
            note.note_type,
            escape_csv(&note.content),
            note.signed_by.as_deref().unwrap_or(""),
            note.signed_at.map(|d| d.format("%Y-%m-%d").to_string()).unwrap_or_default()
        ));
        Ok(csv)
    }
    
    /// SimplePractice batch CSV
    fn format_simplepractice_batch(notes: &[ExportableNote], _options: &ExportOptions) -> Result<String, EhrExportError> {
        let mut csv = String::new();
        csv.push_str("Client Name,Service Date,Note Type,Note Content,Signed By,Signed Date\n");
        
        for note in notes {
            csv.push_str(&format!(
                "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"\n",
                escape_csv(&note.client_name),
                note.session_date,
                note.note_type,
                escape_csv(&note.content),
                note.signed_by.as_deref().unwrap_or(""),
                note.signed_at.map(|d| d.format("%Y-%m-%d").to_string()).unwrap_or_default()
            ));
        }
        
        Ok(csv)
    }
    
    /// TherapyNotes structured text
    fn format_therapynotes(note: &ExportableNote, options: &ExportOptions) -> Result<String, EhrExportError> {
        let mut output = String::new();
        
        // Header
        output.push_str(&format!("CLIENT: {}\n", note.client_name));
        output.push_str(&format!("DATE: {}\n", note.session_date));
        output.push_str(&format!("TYPE: {}\n", note.note_type));
        output.push_str(&format!("{}\n\n", "=".repeat(50)));
        
        // Content
        output.push_str(&note.content);
        output.push_str("\n\n");
        
        // Amendments
        if options.include_amendments && !note.amendments.is_empty() {
            output.push_str(&format!("{}\n", "-".repeat(50)));
            output.push_str("AMENDMENTS:\n\n");
            for amendment in &note.amendments {
                output.push_str(&format!(
                    "[{}] Amended by {}\nReason: {}\n{}\n\n",
                    amendment.created_at.format("%Y-%m-%d %H:%M"),
                    amendment.signed_by,
                    amendment.reason,
                    amendment.content
                ));
            }
        }
        
        // Signature
        if options.include_signature {
            output.push_str(&format!("{}\n", "-".repeat(50)));
            if let (Some(by), Some(at)) = (&note.signed_by, note.signed_at) {
                output.push_str(&format!(
                    "Electronically signed by {} on {}\n",
                    by,
                    at.format("%Y-%m-%d at %H:%M")
                ));
            }
        }
        
        Ok(output)
    }
    
    /// Jane App HTML format
    fn format_janeapp(note: &ExportableNote, options: &ExportOptions) -> Result<String, EhrExportError> {
        let mut html = String::new();
        
        html.push_str("<!DOCTYPE html>\n<html>\n<head>\n");
        html.push_str("<meta charset=\"UTF-8\">\n");
        html.push_str(&format!("<title>{} - {}</title>\n", note.client_name, note.session_date));
        html.push_str("<style>\n");
        html.push_str("body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }\n");
        html.push_str(".header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }\n");
        html.push_str(".content { line-height: 1.6; white-space: pre-wrap; }\n");
        html.push_str(".signature { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ccc; color: #666; }\n");
        html.push_str(".amendment { background: #f5f5f5; padding: 15px; margin: 15px 0; border-left: 3px solid #d97706; }\n");
        html.push_str("</style>\n</head>\n<body>\n");
        
        // Header
        html.push_str("<div class=\"header\">\n");
        html.push_str(&format!("<h1>{}</h1>\n", html_escape(&note.client_name)));
        html.push_str(&format!("<p><strong>Date:</strong> {} | <strong>Type:</strong> {}</p>\n", 
            note.session_date, note.note_type));
        html.push_str("</div>\n");
        
        // Content
        html.push_str("<div class=\"content\">\n");
        html.push_str(&html_escape(&note.content));
        html.push_str("\n</div>\n");
        
        // Amendments
        if options.include_amendments && !note.amendments.is_empty() {
            html.push_str("<h2>Amendments</h2>\n");
            for amendment in &note.amendments {
                html.push_str("<div class=\"amendment\">\n");
                html.push_str(&format!("<p><strong>{}</strong> by {}</p>\n",
                    amendment.created_at.format("%Y-%m-%d %H:%M"),
                    html_escape(&amendment.signed_by)));
                html.push_str(&format!("<p><em>Reason:</em> {}</p>\n", html_escape(&amendment.reason)));
                html.push_str(&format!("<p>{}</p>\n", html_escape(&amendment.content)));
                html.push_str("</div>\n");
            }
        }
        
        // Signature
        if options.include_signature {
            html.push_str("<div class=\"signature\">\n");
            if let (Some(by), Some(at)) = (&note.signed_by, note.signed_at) {
                html.push_str(&format!(
                    "<p>Electronically signed by <strong>{}</strong> on {}</p>\n",
                    html_escape(by),
                    at.format("%Y-%m-%d at %H:%M")
                ));
            }
            html.push_str("</div>\n");
        }
        
        html.push_str("</body>\n</html>");
        
        Ok(html)
    }
    
    /// CCDA XML format (simplified)
    fn format_ccda(note: &ExportableNote, _options: &ExportOptions) -> Result<String, EhrExportError> {
        let mut xml = String::new();
        
        xml.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.push_str("<ClinicalDocument xmlns=\"urn:hl7-org:v3\">\n");
        xml.push_str("  <realmCode code=\"US\"/>\n");
        xml.push_str("  <typeId root=\"2.16.840.1.113883.1.3\" extension=\"POCD_HD000040\"/>\n");
        xml.push_str("  <templateId root=\"2.16.840.1.113883.10.20.22.1.1\"/>\n");
        xml.push_str(&format!("  <id root=\"{}\"/>\n", note.id));
        xml.push_str("  <code code=\"34108-1\" codeSystem=\"2.16.840.1.113883.6.1\" displayName=\"Progress Note\"/>\n");
        xml.push_str(&format!("  <effectiveTime value=\"{}\"/>\n", note.session_date.replace("-", "")));
        
        // Record target (patient)
        xml.push_str("  <recordTarget>\n");
        xml.push_str("    <patientRole>\n");
        xml.push_str(&format!("      <id root=\"{}\"/>\n", note.client_id));
        xml.push_str("      <patient>\n");
        xml.push_str(&format!("        <name>{}</name>\n", xml_escape(&note.client_name)));
        xml.push_str("      </patient>\n");
        xml.push_str("    </patientRole>\n");
        xml.push_str("  </recordTarget>\n");
        
        // Author
        if let Some(author) = &note.signed_by {
            xml.push_str("  <author>\n");
            xml.push_str(&format!("    <time value=\"{}\"/>\n", 
                note.signed_at.map(|d| d.format("%Y%m%d%H%M%S").to_string()).unwrap_or_default()));
            xml.push_str("    <assignedAuthor>\n");
            xml.push_str(&format!("      <assignedPerson><name>{}</name></assignedPerson>\n", xml_escape(author)));
            xml.push_str("    </assignedAuthor>\n");
            xml.push_str("  </author>\n");
        }
        
        // Body with note content
        xml.push_str("  <component>\n");
        xml.push_str("    <structuredBody>\n");
        xml.push_str("      <component>\n");
        xml.push_str("        <section>\n");
        xml.push_str("          <code code=\"34108-1\" displayName=\"Progress Note\"/>\n");
        xml.push_str("          <text>\n");
        xml.push_str(&format!("            {}\n", xml_escape(&note.content)));
        xml.push_str("          </text>\n");
        xml.push_str("        </section>\n");
        xml.push_str("      </component>\n");
        xml.push_str("    </structuredBody>\n");
        xml.push_str("  </component>\n");
        
        xml.push_str("</ClinicalDocument>");
        
        Ok(xml)
    }
    
    /// PDF format (returns HTML for conversion)
    fn format_pdf(note: &ExportableNote, options: &ExportOptions) -> Result<String, EhrExportError> {
        // For now, return HTML that can be converted to PDF
        // In production, would use a PDF library
        Self::format_janeapp(note, options)
    }
    
    /// DOCX format (returns plain text for now)
    fn format_docx(note: &ExportableNote, options: &ExportOptions) -> Result<String, EhrExportError> {
        // For now, return formatted text
        // In production, would use docx library
        Self::format_therapynotes(note, options)
    }
    
    /// Plain text format
    fn format_plaintext(note: &ExportableNote, options: &ExportOptions) -> Result<String, EhrExportError> {
        Self::format_therapynotes(note, options)
    }
    
    /// Get import instructions for target EHR
    fn get_import_instructions(target: EhrTarget) -> String {
        match target {
            EhrTarget::SimplePractice => {
                "To import into SimplePractice:\n\
                1. Go to Settings → Import/Export\n\
                2. Select 'Import Client Data'\n\
                3. Choose the exported CSV file\n\
                4. Map the columns to SimplePractice fields\n\
                5. Review and confirm import".to_string()
            }
            EhrTarget::TherapyNotes => {
                "To add to TherapyNotes:\n\
                1. Open the client's chart\n\
                2. Click 'Add Note'\n\
                3. Copy the exported text content\n\
                4. Paste into the note field\n\
                5. Review and sign the note".to_string()
            }
            EhrTarget::JaneApp => {
                "To import into Jane App:\n\
                1. Open the client's profile\n\
                2. Go to Documents section\n\
                3. Click 'Upload Document'\n\
                4. Select the exported HTML file\n\
                5. The note will be attached to the client".to_string()
            }
            EhrTarget::PracticeFusion | EhrTarget::Epic => {
                "To import CCDA:\n\
                1. Access the patient's record\n\
                2. Navigate to Import/Documents\n\
                3. Select 'Import CCD/CCDA'\n\
                4. Upload the XML file\n\
                5. Review and reconcile data".to_string()
            }
            EhrTarget::Pdf => {
                "PDF export complete.\n\
                This file can be:\n\
                - Attached to any EHR as a document\n\
                - Printed for physical records\n\
                - Sent securely to other providers".to_string()
            }
            EhrTarget::Docx => {
                "Word document export complete.\n\
                This file can be:\n\
                - Edited before importing\n\
                - Attached to any EHR\n\
                - Used as a template".to_string()
            }
            EhrTarget::PlainText => {
                "Plain text export complete.\n\
                Copy and paste this content into any system.".to_string()
            }
        }
    }
}

// ============================================
// Helper Functions
// ============================================

fn escape_csv(s: &str) -> String {
    s.replace('"', "\"\"")
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn xml_escape(s: &str) -> String {
    html_escape(s)
}

fn sanitize_filename(s: &str) -> String {
    s.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect()
}

// ============================================
// Tauri Commands
// ============================================

/// Get available EHR targets
#[tauri::command]
pub fn get_ehr_targets() -> Vec<EhrTargetInfo> {
    vec![
        EhrTargetInfo { id: "simplepractice", name: "SimplePractice", extension: "csv", description: "Import via CSV upload in SimplePractice" },
        EhrTargetInfo { id: "therapynotes", name: "TherapyNotes", extension: "txt", description: "Copy/paste formatted note into TherapyNotes" },
        EhrTargetInfo { id: "janeapp", name: "Jane App", extension: "html", description: "Import via Jane's document upload" },
        EhrTargetInfo { id: "pdf", name: "PDF", extension: "pdf", description: "Universal PDF for any system" },
        EhrTargetInfo { id: "docx", name: "Word Document", extension: "docx", description: "Word document for manual import" },
        EhrTargetInfo { id: "plaintext", name: "Plain Text", extension: "txt", description: "Plain text for copy/paste" },
    ]
}

#[derive(Debug, Clone, Serialize)]
pub struct EhrTargetInfo {
    pub id: &'static str,
    pub name: &'static str,
    pub extension: &'static str,
    pub description: &'static str,
}

/// Export note to EHR format
#[tauri::command]
pub async fn export_to_ehr(
    note: ExportableNote,
    target: String,
    output_dir: String,
    include_amendments: bool,
    include_signature: bool,
) -> Result<ExportResult, String> {
    let target = match target.as_str() {
        "simplepractice" => EhrTarget::SimplePractice,
        "therapynotes" => EhrTarget::TherapyNotes,
        "janeapp" => EhrTarget::JaneApp,
        "pdf" => EhrTarget::Pdf,
        "docx" => EhrTarget::Docx,
        "plaintext" => EhrTarget::PlainText,
        _ => return Err(format!("Unknown EHR target: {}", target)),
    };
    
    let options = ExportOptions {
        target,
        include_amendments,
        include_signature,
        ..Default::default()
    };
    
    EhrExporter::export_note(&note, &options, Path::new(&output_dir))
        .map_err(|e| e.to_string())
}
