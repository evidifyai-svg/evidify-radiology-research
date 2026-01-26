# Evidify: Beta to Production Roadmap
## From v4.1.2 to Market Dominance

**Version:** 1.0  
**Date:** January 2026  
**Status:** Strategic Implementation Plan

---

# Executive Summary

Based on comprehensive enterprise-readiness analysis, Evidify has **strong fundamentals** but faces specific blockers that must be resolved before enterprise sales can scale. This document provides:

1. **Immediate Beta Improvements** (v4.2.x) — Ship within 2-4 weeks
2. **Production Launch Requirements** (v5.0) — Ship within 90 days
3. **Market Domination Strategy** — 6-month competitive moat

**The Core Insight**: Your differentiators are already built (local-first, hash-chained audit, attestation workflows, export intelligence). What's missing is **operationalization** (MDM, policy-as-code, training) and **proof artifacts** (SBOM, pen test, SOC 2 readiness).

---

# Part 1: Immediate Beta Improvements (v4.2.x)

## Priority 1: Close the "Enterprise Stop" (W10 — Supply Chain)

**Current Status**: FAIL — This blocks enterprise deals immediately

| Item | Current | Required | Effort | Owner |
|------|---------|----------|--------|-------|
| Code Signing (macOS) | Planned | Apple notarization + Developer ID | 3-5 days | ENG |
| Code Signing (Windows) | Planned | Authenticode certificate | 3-5 days | ENG |
| SBOM Generation | None | CycloneDX/SPDX output per release | 2-3 days | APPSEC |
| Dependency Scanning | Informal | `cargo audit` + `npm audit` in CI | 1 day | ENG |
| Vuln Management Policy | None | Document: intake → triage → SLA → disclosure | 2-3 days | SEC |

**Implementation Plan**:

```bash
# 1. Apple Notarization (macOS)
# Requires: Apple Developer ID ($99/year), notarytool

# In CI/release script:
xcrun notarytool submit Evidify.dmg \
  --apple-id "developer@evidify.ai" \
  --team-id "XXXXXXXXXX" \
  --password "@keychain:AC_PASSWORD" \
  --wait

xcrun stapler staple Evidify.dmg

# 2. Windows Code Signing
# Requires: EV Code Signing Certificate (~$400-500/year)
# Use signtool or AzureSignTool in CI

# 3. SBOM Generation (add to release workflow)
cargo sbom --output-format cyclonedx > sbom-rust.json
npm sbom --omit dev > sbom-node.json

# Merge and version:
jq -s '.[0] * .[1]' sbom-rust.json sbom-node.json > evidify-sbom-v4.2.0.json
```

**Deliverables**:
- [ ] Signed macOS .dmg with notarization
- [ ] Signed Windows .msi with Authenticode
- [ ] SBOM (CycloneDX format) published with each release
- [ ] Vulnerability management policy document
- [ ] Dependency scan reports in release notes

---

## Priority 2: Clipboard PHI Mitigation

**Current Status**: Partial — Known PHI sprawl vector

**Implementation**:

```rust
// src-tauri/src/clipboard.rs

use tauri::ClipboardManager;
use std::time::Duration;
use tokio::time::sleep;

/// Clipboard security configuration
#[derive(Clone, serde::Deserialize)]
pub struct ClipboardPolicy {
    /// Auto-clear clipboard after copy (seconds, 0 = disabled)
    pub auto_clear_seconds: u32,
    /// Warn user when copying PHI-likely content
    pub warn_on_copy: bool,
    /// Log clipboard events (event type only, no content)
    pub audit_clipboard: bool,
}

impl Default for ClipboardPolicy {
    fn default() -> Self {
        Self {
            auto_clear_seconds: 30, // Clear after 30 seconds
            warn_on_copy: true,
            audit_clipboard: true,
        }
    }
}

/// Copy to clipboard with policy enforcement
pub async fn copy_with_policy(
    clipboard: &ClipboardManager,
    content: &str,
    policy: &ClipboardPolicy,
    audit_log: &dyn AuditLogger,
) -> Result<(), ClipboardError> {
    // Set clipboard content
    clipboard.write_text(content)?;
    
    // Log event (no PHI)
    if policy.audit_clipboard {
        audit_log.log_event(
            AuditEventType::ClipboardCopy,
            AuditResourceType::Note,
            "clipboard",
            AuditOutcome::Success,
            None,
        ).ok();
    }
    
    // Schedule auto-clear
    if policy.auto_clear_seconds > 0 {
        let clear_after = Duration::from_secs(policy.auto_clear_seconds as u64);
        let clipboard_clone = clipboard.clone();
        
        tokio::spawn(async move {
            sleep(clear_after).await;
            // Clear clipboard
            let _ = clipboard_clone.write_text("");
        });
    }
    
    Ok(())
}
```

**Frontend Integration**:

```typescript
// When user copies note content
async function copyToClipboard(content: string) {
  const policy = await invoke('get_clipboard_policy');
  
  if (policy.warn_on_copy) {
    const confirmed = await showConfirmDialog(
      "Copy to Clipboard",
      `Content will be cleared from clipboard in ${policy.auto_clear_seconds} seconds.`,
      "Copy"
    );
    if (!confirmed) return;
  }
  
  await invoke('copy_with_policy', { content });
  
  showToast(`Copied. Auto-clearing in ${policy.auto_clear_seconds}s`);
}
```

**Deliverables**:
- [ ] Clipboard policy configuration in settings
- [ ] Auto-clear TTL (default: 30 seconds)
- [ ] Audit event for clipboard operations
- [ ] User notification of auto-clear

---

## Priority 3: Enhanced Voice Scribe Integration

**Current Status**: Stub — Core adoption wedge not functional

**Implementation Architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    VOICE SCRIBE PIPELINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Record    │───►│  whisper.cpp │───►│  Transcript │         │
│  │   (cpal)    │    │  (local ASR) │    │   Buffer    │         │
│  └─────────────┘    └─────────────┘    └──────┬──────┘         │
│                                                │                 │
│                                                ▼                 │
│                                        ┌─────────────┐          │
│                                        │   Ollama    │          │
│                                        │ (Structure) │          │
│                                        └──────┬──────┘          │
│                                                │                 │
│                                                ▼                 │
│                                        ┌─────────────┐          │
│                                        │  SOAP/DAP   │          │
│                                        │    Draft    │          │
│                                        └─────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Rust Implementation** (simplified):

```rust
// src-tauri/src/voice.rs

use std::process::Command;
use std::path::PathBuf;

pub struct WhisperConfig {
    pub model_path: PathBuf,      // e.g., ~/whisper-models/ggml-base.en.bin
    pub language: String,          // "en"
    pub threads: u32,              // CPU threads
}

pub struct TranscriptionResult {
    pub text: String,
    pub segments: Vec<TranscriptSegment>,
    pub duration_ms: u64,
}

pub struct TranscriptSegment {
    pub start_ms: u64,
    pub end_ms: u64,
    pub text: String,
    pub speaker: Option<String>,  // For diarization
}

/// Transcribe audio file using whisper.cpp
pub fn transcribe_audio(
    audio_path: &PathBuf,
    config: &WhisperConfig,
) -> Result<TranscriptionResult, VoiceError> {
    // Ensure 16kHz WAV format
    let wav_path = convert_to_wav(audio_path)?;
    
    // Call whisper-cpp
    let output = Command::new("whisper-cpp")
        .args([
            "-m", config.model_path.to_str().unwrap(),
            "-f", wav_path.to_str().unwrap(),
            "-l", &config.language,
            "-t", &config.threads.to_string(),
            "--output-json",
            "-oj",  // Output JSON
        ])
        .output()?;
    
    if !output.status.success() {
        return Err(VoiceError::TranscriptionFailed(
            String::from_utf8_lossy(&output.stderr).to_string()
        ));
    }
    
    // Parse JSON output
    let json_output = std::fs::read_to_string(
        wav_path.with_extension("json")
    )?;
    
    parse_whisper_output(&json_output)
}

/// Convert audio to 16kHz WAV (required by Whisper)
fn convert_to_wav(input: &PathBuf) -> Result<PathBuf, VoiceError> {
    let output = input.with_extension("wav");
    
    Command::new("ffmpeg")
        .args([
            "-y",
            "-i", input.to_str().unwrap(),
            "-ar", "16000",
            "-ac", "1",
            "-f", "wav",
            output.to_str().unwrap(),
        ])
        .output()?;
    
    Ok(output)
}
```

**90-Second Debrief Mode** (fast path):

```rust
/// Quick debrief: clinician speaks for ~90 seconds post-session
pub async fn quick_debrief(
    audio_path: PathBuf,
    client_id: &str,
    template: NoteTemplate,
) -> Result<NoteDraft, VoiceError> {
    // 1. Transcribe
    let transcript = transcribe_audio(&audio_path, &default_config())?;
    
    // 2. Structure via Ollama
    let structured = structure_transcript(
        &transcript.text,
        &template,
    ).await?;
    
    // 3. Run ethics detection
    let detections = detect_ethics_issues(&structured.content)?;
    
    // 4. Create draft
    Ok(NoteDraft {
        client_id: client_id.to_string(),
        template,
        raw_transcript: transcript.text,
        structured_content: structured,
        detections,
        status: NoteStatus::Draft,
        processing_time_ms: transcript.duration_ms,
    })
}
```

**Deliverables**:
- [ ] whisper.cpp integration with model detection
- [ ] 16kHz WAV conversion pipeline
- [ ] 90-second debrief mode
- [ ] Full-session transcription mode (configurable)
- [ ] Audio auto-deletion after note signing (policy-driven)

---

## Priority 4: Training Materials & Admin Guide

**Current Status**: Partial — Enterprises buy "governable products"

**Required Documents**:

| Document | Audience | Content | Effort |
|----------|----------|---------|--------|
| **Quick Start Guide** | Clinician | First 15 minutes with Evidify | ✅ Done |
| **Full User Manual** | Clinician | Complete feature documentation | 3-5 days |
| **Administrator Guide** | IT/Admin | Deployment, policy config, troubleshooting | 3-5 days |
| **Supervisor Guide** | Supervisor | QA workflows, co-signature, competency tracking | 2-3 days |
| **Security Whitepaper** | SEC/CISO | Architecture, controls, threat model | 2-3 days |
| **Video Tutorials** | All | 5-minute feature walkthroughs | 5-7 days |

**Training Curriculum Outline**:

```markdown
# Evidify Training Program

## Module 1: Getting Started (15 min)
- Installation and setup
- Creating your vault
- Adding your first client
- Creating your first note

## Module 2: Documentation Workflow (30 min)
- Voice Scribe basics
- AI structuring
- Templates and customization
- Keyboard shortcuts

## Module 3: Safety & Compliance (30 min)
- Ethics detection explained
- Attestation workflow
- Risk documentation best practices
- What AI does and doesn't do

## Module 4: Supervision (Supervisors Only) (20 min)
- Review queue management
- Co-signature workflow
- Feedback annotations
- Competency tracking

## Module 5: Administration (Admins Only) (30 min)
- Policy configuration
- User management
- Audit log review
- Compliance dashboard

## Competency Checklist
□ Can create and sign a note in under 5 minutes
□ Can complete attestation workflow for flagged content
□ Can generate and verify an audit pack
□ Understands AI scope and limitations
□ Knows when to contact support
```

---

## Priority 5: Beta Bug Fixes & Polish

Based on testing feedback, address:

| Issue | Category | Priority | Fix |
|-------|----------|----------|-----|
| Compilation errors in hotfix14/15 | Build | P0 | ✅ Fixed |
| Keychain prompt storm (dev builds) | UX | P1 | Document as expected; resolve with code signing |
| Ethics detection false positives | Clinical | P1 | Pattern tuning + "dismiss similar" option |
| Slow first build | DevEx | P2 | Pre-compiled dependencies or binary releases |
| Missing client selector in Quick Capture | UX | P0 | ✅ Fixed |
| Amendment workflow | Feature | P0 | ✅ Implemented |

---

# Part 2: Production Launch (v5.0) — 90 Days

## Phase 1: Days 1-30 — "Unfair Advantage MVP"

### Week 1-2: Voice Pipeline Completion

**Goal**: Voice Scribe works reliably for 90-second debriefs

```
Day 1-3:   whisper.cpp integration + model management
Day 4-5:   Audio capture (cpal) + recording UI
Day 6-7:   Transcription → Structuring pipeline
Day 8-10:  Testing on clinical speech samples
Day 11-14: Performance optimization (target: <30s processing for 50-min audio)
```

**Acceptance Test**:
```bash
# Clinician speaks for 90 seconds
# Processing completes in <15 seconds
# Output: Structured SOAP note with MSE suggestions
# All offline (network unplugged)
```

### Week 2-3: Ethics Detection Hardening

**Goal**: 30+ patterns with <20% false positive rate

**Pattern Categories to Complete**:

| Category | Patterns | Status |
|----------|----------|--------|
| Safety (SI) | rehearsal, means, euphemisms | ✅ Complete |
| Safety (HI) | threats, plans, targets | ✅ Complete |
| Telehealth | location, jurisdiction, privacy | ✅ Complete |
| Security | injection, egress, audit manipulation | ✅ Complete |
| Documentation | risk-intervention match, dx deferred | ✅ Complete |
| **Abuse/Neglect** | mandatory reporting triggers | 🔲 Add |
| **Duty to Warn** | Tarasoff-style indicators | 🔲 Add |
| **Capacity** | decision-making, guardianship | 🔲 Add |

**Pattern Tuning Process**:

```rust
// Add exclusion patterns to reduce false positives
DetectionPattern {
    id: "safety-si-euphemism",
    patterns: vec![
        r"(?i)\b(dark thoughts?|end it all|better off|no point)\b",
    ],
    exclusions: vec![
        // Exclude when clearly historical/resolved
        r"(?i)(denied|no longer|in the past|previously had)",
        // Exclude when clearly about someone else
        r"(?i)(friend|family member|patient reported that)",
    ],
    // ... rest of pattern
}
```

### Week 3-4: Export Controls & Audit Pack

**Goal**: Enterprise-grade export intelligence

**Enhancements**:

```rust
// Enhanced export destination detection
pub enum ExportDestination {
    Safe {
        path: PathBuf,
        classification: String,
    },
    CloudSync {
        provider: CloudProvider,  // iCloud, OneDrive, Dropbox, GoogleDrive
        path: PathBuf,
    },
    NetworkShare {
        unc_path: String,
    },
    Removable {
        volume_name: String,
        path: PathBuf,
    },
    Unknown {
        path: PathBuf,
    },
}

pub enum CloudProvider {
    ICloud,
    OneDrive,
    Dropbox,
    GoogleDrive,
    Box,
    Other(String),
}

// Detection logic
fn classify_export_path(path: &Path) -> ExportDestination {
    let path_str = path.to_string_lossy().to_lowercase();
    
    // iCloud
    if path_str.contains("mobile documents") || 
       path_str.contains("icloud") {
        return ExportDestination::CloudSync {
            provider: CloudProvider::ICloud,
            path: path.to_path_buf(),
        };
    }
    
    // OneDrive
    if path_str.contains("onedrive") {
        return ExportDestination::CloudSync {
            provider: CloudProvider::OneDrive,
            path: path.to_path_buf(),
        };
    }
    
    // Dropbox
    if path_str.contains("dropbox") {
        return ExportDestination::CloudSync {
            provider: CloudProvider::Dropbox,
            path: path.to_path_buf(),
        };
    }
    
    // Network shares (macOS/Windows)
    if path_str.starts_with("/volumes/") && !is_local_volume(path) {
        return ExportDestination::NetworkShare {
            unc_path: path_str.to_string(),
        };
    }
    
    if path_str.starts_with("\\\\") {
        return ExportDestination::NetworkShare {
            unc_path: path_str.to_string(),
        };
    }
    
    // Removable media
    if is_removable_volume(path) {
        return ExportDestination::Removable {
            volume_name: get_volume_name(path),
            path: path.to_path_buf(),
        };
    }
    
    // Default: check if it looks safe
    if is_user_documents(path) || is_user_desktop(path) {
        return ExportDestination::Safe {
            path: path.to_path_buf(),
            classification: "local".to_string(),
        };
    }
    
    ExportDestination::Unknown {
        path: path.to_path_buf(),
    }
}
```

**Audit Pack Generator**:

```rust
pub struct AuditPack {
    pub id: String,
    pub generated_at: DateTime<Utc>,
    pub generated_by: String,
    pub pack_type: AuditPackType,
    pub date_range: (DateTime<Utc>, DateTime<Utc>),
    pub clients: Vec<String>,
    pub contents: AuditPackContents,
    pub chain_verification: ChainVerification,
    pub export_certificate: ExportCertificate,
}

pub struct AuditPackContents {
    pub notes: Vec<Note>,
    pub amendments: Vec<Amendment>,
    pub attestations: Vec<Attestation>,
    pub audit_log_extract: Vec<AuditEntry>,  // PHI-minimal
}

pub struct ChainVerification {
    pub verified: bool,
    pub entries_checked: u64,
    pub first_entry: DateTime<Utc>,
    pub last_entry: DateTime<Utc>,
    pub verification_hash: String,
}

pub struct ExportCertificate {
    pub pack_id: String,
    pub content_hash: String,
    pub exported_at: DateTime<Utc>,
    pub exported_by: String,
    pub destination_class: String,  // "Safe", "Manual Review", etc.
    pub destination_hash: String,   // SHA256 of path (not path itself)
    pub signature: String,
}

impl AuditPack {
    pub fn generate(
        vault: &Vault,
        pack_type: AuditPackType,
        date_range: (DateTime<Utc>, DateTime<Utc>),
        client_ids: Option<Vec<String>>,
    ) -> Result<Self, VaultError> {
        // 1. Gather notes
        let notes = vault.get_notes_in_range(date_range, client_ids.clone())?;
        
        // 2. Gather amendments
        let amendments = notes.iter()
            .flat_map(|n| vault.get_amendments(&n.id))
            .collect();
        
        // 3. Gather attestations
        let attestations = notes.iter()
            .flat_map(|n| vault.get_attestations(&n.id))
            .collect();
        
        // 4. Extract audit log (PHI-minimal)
        let audit_extract = vault.get_audit_log_for_resources(
            notes.iter().map(|n| &n.id).collect()
        )?;
        
        // 5. Verify chain integrity
        let chain_verification = vault.verify_audit_chain()?;
        
        // 6. Create pack
        Ok(Self {
            id: uuid::Uuid::new_v4().to_string(),
            generated_at: Utc::now(),
            generated_by: vault.current_user()?,
            pack_type,
            date_range,
            clients: client_ids.unwrap_or_default(),
            contents: AuditPackContents {
                notes,
                amendments,
                attestations,
                audit_log_extract: audit_extract,
            },
            chain_verification,
            export_certificate: ExportCertificate::default(), // Set on export
        })
    }
    
    pub fn export_to_pdf(&self, destination: &Path) -> Result<PathBuf, ExportError> {
        // Check destination
        let dest_class = classify_export_path(destination);
        
        match dest_class {
            ExportDestination::CloudSync { .. } => {
                return Err(ExportError::BlockedDestination(
                    "Cannot export audit pack to cloud-synced folder".to_string()
                ));
            }
            ExportDestination::NetworkShare { .. } => {
                // Warn but allow with confirmation
            }
            _ => {}
        }
        
        // Generate PDF
        let pdf_path = generate_audit_pack_pdf(self, destination)?;
        
        // Update certificate
        self.export_certificate = ExportCertificate {
            pack_id: self.id.clone(),
            content_hash: hash_file(&pdf_path)?,
            exported_at: Utc::now(),
            exported_by: self.generated_by.clone(),
            destination_class: format!("{:?}", dest_class),
            destination_hash: hash_path(destination),
            signature: sign_certificate(&self)?,
        };
        
        // Log export
        log_export_event(&self)?;
        
        Ok(pdf_path)
    }
}
```

---

## Phase 2: Days 31-60 — "Defensible Workflows"

### Week 5-6: Treatment Progress Dashboard

**Goal**: Visualize outcomes and demonstrate value

**Components**:

```typescript
// frontend/src/components/ProgressDashboard.tsx

interface ProgressDashboardProps {
  clientId: string;
}

function ProgressDashboard({ clientId }: ProgressDashboardProps) {
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [themes, setThemes] = useState<ThemeTrack[]>([]);
  const [riskTrajectory, setRiskTrajectory] = useState<RiskPoint[]>([]);
  
  useEffect(() => {
    async function loadProgress() {
      const progress = await invoke('get_treatment_progress', { clientId });
      setMeasures(progress.measures);
      setThemes(progress.themes);
      setRiskTrajectory(progress.risk_trajectory);
    }
    loadProgress();
  }, [clientId]);
  
  return (
    <div className="progress-dashboard">
      {/* Outcome Measures Chart */}
      <section className="measures-section">
        <h3>Outcome Measures</h3>
        <LineChart data={measures}>
          <Line dataKey="phq9" stroke="#8884d8" name="PHQ-9" />
          <Line dataKey="gad7" stroke="#82ca9d" name="GAD-7" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
        </LineChart>
      </section>
      
      {/* Theme Tracking */}
      <section className="themes-section">
        <h3>Session Themes</h3>
        {themes.map(theme => (
          <ThemeBar 
            key={theme.name}
            name={theme.name}
            mentions={theme.mentions}
            trend={theme.trend}
          />
        ))}
      </section>
      
      {/* Risk Trajectory */}
      <section className="risk-section">
        <h3>Risk Trajectory</h3>
        <RiskTimeline points={riskTrajectory} />
      </section>
      
      {/* Treatment Goals */}
      <section className="goals-section">
        <h3>Treatment Goals</h3>
        <GoalProgress goals={goals} />
      </section>
    </div>
  );
}
```

### Week 6-7: Semantic Search

**Goal**: Find anything across the corpus in <2 seconds

**Implementation**:

```rust
// src-tauri/src/search.rs

use rust_bert::pipelines::sentence_embeddings::{
    SentenceEmbeddingsBuilder, SentenceEmbeddingsModel,
};

pub struct SearchEngine {
    embedding_model: SentenceEmbeddingsModel,
    vector_index: VectorIndex,
    keyword_index: KeywordIndex,
}

impl SearchEngine {
    pub fn new(model_path: &Path) -> Result<Self, SearchError> {
        // Load local embedding model (e5-small or similar)
        let model = SentenceEmbeddingsBuilder::local(model_path)
            .create_model()?;
        
        Ok(Self {
            embedding_model: model,
            vector_index: VectorIndex::new(),
            keyword_index: KeywordIndex::new(),
        })
    }
    
    pub fn index_note(&mut self, note: &Note) -> Result<(), SearchError> {
        // Generate embedding
        let embedding = self.embedding_model.encode(&[&note.content])?[0].clone();
        
        // Add to vector index
        self.vector_index.add(&note.id, embedding)?;
        
        // Add to keyword index
        self.keyword_index.add(&note.id, &note.content)?;
        
        Ok(())
    }
    
    pub fn search(
        &self,
        query: &str,
        filters: &SearchFilters,
        limit: usize,
    ) -> Result<Vec<SearchResult>, SearchError> {
        // 1. Embed query
        let query_embedding = self.embedding_model.encode(&[query])?[0].clone();
        
        // 2. Vector search (top 50)
        let vector_results = self.vector_index.search(&query_embedding, 50)?;
        
        // 3. Keyword search (exact matches)
        let keyword_results = self.keyword_index.search(query)?;
        
        // 4. Merge and re-rank
        let merged = merge_results(vector_results, keyword_results);
        
        // 5. Apply filters
        let filtered = apply_filters(merged, filters);
        
        // 6. Return top N with snippets
        Ok(filtered.into_iter().take(limit).collect())
    }
}

pub struct SearchFilters {
    pub client_ids: Option<Vec<String>>,
    pub date_range: Option<(DateTime<Utc>, DateTime<Utc>)>,
    pub note_types: Option<Vec<NoteType>>,
    pub risk_levels: Option<Vec<RiskLevel>>,
}

pub struct SearchResult {
    pub note_id: String,
    pub client_id: String,
    pub snippet: String,
    pub score: f32,
    pub matched_fields: Vec<String>,
}
```

### Week 7-8: Supervision Workflow

**Goal**: Supervisors can manage supervisees efficiently

**Data Model**:

```rust
pub struct SupervisionRelationship {
    pub supervisor_id: String,
    pub supervisee_id: String,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub scope: SupervisionScope,
}

pub enum SupervisionScope {
    AllClients,
    SpecificClients(Vec<String>),
    NoteTypeFiltered(Vec<NoteType>),
}

pub struct ReviewQueueItem {
    pub note_id: String,
    pub supervisee_id: String,
    pub client_id: String,
    pub added_at: DateTime<Utc>,
    pub priority: ReviewPriority,
    pub has_high_severity_detections: bool,
    pub status: ReviewStatus,
}

pub enum ReviewPriority {
    Urgent,    // High-severity detections
    Normal,    // Standard review
    FYI,       // Informational
}

pub enum ReviewStatus {
    Pending,
    InReview,
    Approved,
    NeedsRevision,
}

pub struct FeedbackAnnotation {
    pub id: String,
    pub note_id: String,
    pub supervisor_id: String,
    pub section: String,  // Which part of note
    pub content: String,
    pub category: FeedbackCategory,
    pub created_at: DateTime<Utc>,
}

pub enum FeedbackCategory {
    Strength,
    Improvement,
    CriticalIssue,
    Question,
    TeachingPoint,
}

pub struct CoSignature {
    pub note_id: String,
    pub supervisor_id: String,
    pub signed_at: DateTime<Utc>,
    pub attestation: String,
    pub signature: String,
}
```

**Supervisor Dashboard UI**:

```typescript
function SupervisorDashboard() {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  return (
    <div className="supervisor-dashboard">
      {/* Review Queue */}
      <aside className="review-queue">
        <h2>Pending Review ({queue.length})</h2>
        
        {/* Urgent items first */}
        <section className="urgent">
          <h3>🔴 Urgent</h3>
          {queue.filter(q => q.priority === 'Urgent').map(item => (
            <QueueItem 
              key={item.note_id}
              item={item}
              onClick={() => selectNote(item.note_id)}
            />
          ))}
        </section>
        
        {/* Normal items */}
        <section className="normal">
          <h3>📋 Standard Review</h3>
          {queue.filter(q => q.priority === 'Normal').map(item => (
            <QueueItem 
              key={item.note_id}
              item={item}
              onClick={() => selectNote(item.note_id)}
            />
          ))}
        </section>
      </aside>
      
      {/* Note Review Panel */}
      <main className="review-panel">
        {selectedNote && (
          <>
            <NoteContent note={selectedNote} />
            
            {/* Feedback Tools */}
            <FeedbackPanel 
              noteId={selectedNote.id}
              onAddFeedback={handleAddFeedback}
            />
            
            {/* Actions */}
            <div className="review-actions">
              <button 
                onClick={() => requestRevision(selectedNote.id)}
                className="btn-secondary"
              >
                Request Revision
              </button>
              <button 
                onClick={() => coSign(selectedNote.id)}
                className="btn-primary"
              >
                Approve & Co-Sign
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
```

---

## Phase 3: Days 61-90 — "Enterprise Pilot Kit"

### Week 9-10: MDM Deployment Packages

**Goal**: IT can deploy to 500 endpoints silently

**Jamf Package Structure**:

```
Evidify-Enterprise.pkg/
├── Distribution           # Installer distribution XML
├── Evidify.app/           # Signed application bundle
├── Scripts/
│   ├── preinstall         # Pre-install checks
│   ├── postinstall        # Post-install configuration
│   └── uninstall          # Clean removal
├── Resources/
│   └── default-config.json  # Organization default settings
└── Policies/
    └── enterprise-policy.json  # Signed policy bundle
```

**postinstall Script**:

```bash
#!/bin/bash

# Evidify Enterprise Post-Install Script

EVIDIFY_APP="/Applications/Evidify.app"
CONFIG_DIR="$HOME/Library/Application Support/com.evidify.app"
DEFAULT_CONFIG="/tmp/evidify-install/default-config.json"
POLICY_BUNDLE="/tmp/evidify-install/enterprise-policy.json"

# Create config directory
mkdir -p "$CONFIG_DIR"

# Copy default configuration
if [ -f "$DEFAULT_CONFIG" ]; then
    cp "$DEFAULT_CONFIG" "$CONFIG_DIR/config.json"
fi

# Copy enterprise policy bundle
if [ -f "$POLICY_BUNDLE" ]; then
    cp "$POLICY_BUNDLE" "$CONFIG_DIR/policy.json"
fi

# Set permissions
chown -R "$USER" "$CONFIG_DIR"
chmod -R 700 "$CONFIG_DIR"

# Register with MDM (optional)
# This creates a receipt that IT can query
defaults write com.evidify.app MDMDeployed -bool true
defaults write com.evidify.app DeploymentDate -string "$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Verify installation
if [ -x "$EVIDIFY_APP/Contents/MacOS/Evidify" ]; then
    echo "Evidify installation successful"
    exit 0
else
    echo "Evidify installation failed"
    exit 1
fi
```

**Windows Intune Package** (MSI + MSIX):

```xml
<!-- Evidify.wxs (WiX Installer) -->
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product Id="*" 
           Name="Evidify Enterprise" 
           Version="5.0.0"
           Manufacturer="Evidify Inc"
           UpgradeCode="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX">
    
    <Package InstallerVersion="500" 
             Compressed="yes" 
             InstallScope="perUser" />
    
    <MajorUpgrade DowngradeErrorMessage="Newer version installed" />
    
    <Feature Id="ProductFeature" Title="Evidify" Level="1">
      <ComponentGroupRef Id="ProductComponents" />
      <ComponentGroupRef Id="PolicyComponents" />
    </Feature>
    
    <!-- Custom Actions for Post-Install -->
    <CustomAction Id="ConfigurePolicy" 
                  Directory="INSTALLFOLDER" 
                  ExeCommand="[INSTALLFOLDER]evidify.exe --import-policy [INSTALLFOLDER]policy.json"
                  Return="check" />
    
    <InstallExecuteSequence>
      <Custom Action="ConfigurePolicy" After="InstallFiles" />
    </InstallExecuteSequence>
  </Product>
</Wix>
```

### Week 10-11: Policy-as-Code

**Goal**: Admin-defined policies enforced even offline

**Policy Schema**:

```rust
#[derive(Serialize, Deserialize, Clone)]
pub struct OrganizationPolicy {
    pub id: String,
    pub version: String,
    pub effective_date: DateTime<Utc>,
    pub signed_by: String,
    pub signature: String,
    
    pub export_policy: ExportPolicy,
    pub attestation_policy: AttestationPolicy,
    pub recording_policy: RecordingPolicy,
    pub supervision_policy: SupervisionPolicy,
    pub retention_policy: RetentionPolicy,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ExportPolicy {
    /// What to do with cloud-sync destinations
    pub cloud_sync: ExportAction,
    /// What to do with network shares
    pub network_share: ExportAction,
    /// What to do with removable media
    pub removable_media: ExportAction,
    /// Require audit pack for bulk exports
    pub audit_pack_required_above: u32,
}

#[derive(Serialize, Deserialize, Clone)]
pub enum ExportAction {
    Allow,
    Warn,
    Block,
    RequireApproval { approver_role: String },
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AttestationPolicy {
    /// P0 items that MUST be attested before signing
    pub required_attestations: Vec<String>,
    /// P1 items that should be attested (warning only)
    pub recommended_attestations: Vec<String>,
    /// Supervisor review required for certain risk levels
    pub supervisor_review_required: Option<RiskLevel>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct RecordingPolicy {
    /// Consent required before recording
    pub consent_required: bool,
    /// Auto-delete audio after note signing
    pub auto_delete_audio: bool,
    /// Maximum retention for audio (days)
    pub max_audio_retention_days: Option<u32>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SupervisionPolicy {
    /// Co-signature required for these credential levels
    pub cosign_required_for: Vec<CredentialLevel>,
    /// Maximum time before review (hours)
    pub max_review_delay_hours: u32,
}

#[derive(Serialize, Deserialize, Clone)]
pub enum CredentialLevel {
    Intern,
    Trainee,
    Postdoc,
    Provisionally Licensed,
    Licensed,
}
```

**Policy Enforcement**:

```rust
pub struct PolicyEngine {
    policy: OrganizationPolicy,
}

impl PolicyEngine {
    pub fn load_from_disk() -> Result<Self, PolicyError> {
        let policy_path = get_policy_path()?;
        let policy_json = std::fs::read_to_string(&policy_path)?;
        let policy: OrganizationPolicy = serde_json::from_str(&policy_json)?;
        
        // Verify signature
        if !verify_policy_signature(&policy) {
            return Err(PolicyError::InvalidSignature);
        }
        
        Ok(Self { policy })
    }
    
    pub fn check_export(&self, destination: &ExportDestination) -> PolicyDecision {
        let action = match destination {
            ExportDestination::CloudSync { .. } => &self.policy.export_policy.cloud_sync,
            ExportDestination::NetworkShare { .. } => &self.policy.export_policy.network_share,
            ExportDestination::Removable { .. } => &self.policy.export_policy.removable_media,
            _ => &ExportAction::Allow,
        };
        
        match action {
            ExportAction::Allow => PolicyDecision::Allow,
            ExportAction::Warn => PolicyDecision::Warn {
                message: "Export destination may not be secure".to_string(),
            },
            ExportAction::Block => PolicyDecision::Block {
                reason: "Organization policy prohibits this export destination".to_string(),
            },
            ExportAction::RequireApproval { approver_role } => PolicyDecision::RequireApproval {
                approver_role: approver_role.clone(),
            },
        }
    }
    
    pub fn check_attestation(
        &self, 
        detections: &[Detection]
    ) -> Vec<RequiredAttestation> {
        let mut required = vec![];
        
        for detection in detections {
            if self.policy.attestation_policy.required_attestations
                .contains(&detection.pattern_id) {
                required.push(RequiredAttestation {
                    detection_id: detection.id.clone(),
                    blocking: true,
                });
            } else if self.policy.attestation_policy.recommended_attestations
                .contains(&detection.pattern_id) {
                required.push(RequiredAttestation {
                    detection_id: detection.id.clone(),
                    blocking: false,
                });
            }
        }
        
        required
    }
}
```

### Week 11-12: SIEM Integration & Proof Artifacts

**Goal**: Enterprise security can monitor without PHI

**PHI-Minimal Log Schema** (for SIEM):

```json
{
  "schema_version": "1.0",
  "event": {
    "id": "uuid",
    "timestamp": "2026-01-15T14:30:00Z",
    "type": "note.created",
    "outcome": "success",
    "device_id": "hashed-device-id",
    "user_id": "hashed-user-id",
    "resource": {
      "type": "note",
      "id": "note-uuid"
    },
    "context": {
      "client_count": 1,
      "detection_count": 0,
      "attestation_count": 0
    }
  }
}
```

**Event Types** (all PHI-impossible):

```
Authentication:
  - session.started
  - session.ended
  - vault.unlocked
  - vault.locked

Documentation:
  - note.created
  - note.updated
  - note.signed
  - note.amended
  - note.deleted

Safety:
  - detection.triggered
  - detection.resolved
  - attestation.created

Export:
  - export.attempted
  - export.blocked
  - export.completed
  - audit_pack.generated

Policy:
  - policy.synced
  - policy.enforced
  - policy.overridden

System:
  - app.started
  - app.crashed
  - update.installed
```

**SIEM Export Command**:

```rust
#[tauri::command]
pub fn export_siem_logs(
    state: State<AppState>,
    format: SIEMFormat,
    date_range: (DateTime<Utc>, DateTime<Utc>),
) -> Result<String, String> {
    let vault = state.vault.lock().unwrap();
    let vault = vault.as_ref().ok_or("Vault not initialized")?;
    
    // Get audit events in range
    let events = vault.get_audit_events_in_range(date_range)?;
    
    // Format for SIEM
    let formatted = match format {
        SIEMFormat::Splunk => format_for_splunk(&events),
        SIEMFormat::Sentinel => format_for_sentinel(&events),
        SIEMFormat::Generic => format_for_generic(&events),
    };
    
    Ok(formatted)
}
```

---

# Part 3: Market Domination Strategy (6 Months)

## Competitive Moat: "Provably Private" Category

### Position 1: The Only AI You Can Verify

**Messaging**: "Unplug the router. If it still works, it's really private."

**Proof Artifacts**:
1. Network independence demonstration (video + live demo)
2. Third-party security audit report
3. Architecture whitepaper (published)
4. Open-source cryptographic components

### Position 2: Audit-Proof by Construction

**Messaging**: "Notes that defend themselves in court."

**Proof Artifacts**:
1. Sample audit pack with chain-of-custody
2. Legal defensibility case studies
3. Attestation workflow demo
4. Export certificate examples

### Position 3: Enterprise-Ready Without Enterprise Risk

**Messaging**: "No PHI in our cloud because there is no cloud."

**Proof Artifacts**:
1. SOC 2 Type II report (when complete)
2. HIPAA mapping document
3. Pre-filled security questionnaires (SIG, CAIQ)
4. MDM deployment success stories

## Flywheel Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADOPTION FLYWHEEL                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│      ┌──────────────────┐                                       │
│      │  Voice Scribe    │  ← Adoption wedge                     │
│      │  (Time Savings)  │                                       │
│      └────────┬─────────┘                                       │
│               │                                                  │
│               ▼                                                  │
│      ┌──────────────────┐                                       │
│      │  Ethics Engine   │  ← Stickiness driver                  │
│      │  (Safety Net)    │     (clinicians trust it)             │
│      └────────┬─────────┘                                       │
│               │                                                  │
│               ▼                                                  │
│      ┌──────────────────┐                                       │
│      │  Audit Pack      │  ← Enterprise closer                  │
│      │  (Proof Artifacts)│    (procurement approved)            │
│      └────────┬─────────┘                                       │
│               │                                                  │
│               ▼                                                  │
│      ┌──────────────────┐                                       │
│      │  Word of Mouth   │  ← Growth engine                      │
│      │  + Case Studies  │     (organic expansion)               │
│      └────────┬─────────┘                                       │
│               │                                                  │
│               └───────────────────────► More Users               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 6-Month Revenue Milestones

| Month | Target | Key Metric |
|-------|--------|------------|
| 1 | 50 beta testers | Feedback quality |
| 2 | 100 solo users | Activation rate |
| 3 | 500 solo users + 5 group practices | Retention |
| 4 | 1,000 users + 10 practices | NPS |
| 5 | First enterprise pilot (50+ seats) | Procurement pass |
| 6 | 2,500 users + 3 enterprise accounts | Revenue |

## Competitive Defense

### vs. Cloud AI Scribes (Nuance DAX, Abridge, Nabla)

| Objection | Response |
|-----------|----------|
| "They have more AI features" | "Our features don't require trusting third parties with your patients' most sensitive conversations" |
| "They integrate with EHRs" | "We export to any EHR; we don't lock you in" |
| "They're established vendors" | "They're established *cloud* vendors. We're the only *local* option." |

### vs. Note Apps (SimplePractice, TherapyNotes, Jane)

| Objection | Response |
|-----------|----------|
| "They have full practice management" | "We focus on the documentation pain point; we export to them" |
| "They're cheaper" | "Factor in audit risk, PHI breach insurance, patient trust" |
| "They're simpler" | "We're simpler *for documentation* with AI that actually respects privacy" |

### vs. DIY/Manual

| Objection | Response |
|-----------|----------|
| "I'm used to my workflow" | "Spend 60% less time on notes. Try it free for 30 days." |
| "I don't trust AI" | "That's exactly why we built AI that runs entirely on your laptop" |
| "I can't afford it" | "$49/month = ~$1.60/workday. How much is 2 hours of your time worth?" |

---

# Implementation Checklist

## Beta → v4.2.0 (2-3 weeks)

- [ ] Code signing (macOS notarization)
- [ ] Code signing (Windows Authenticode)
- [ ] SBOM generation in CI
- [ ] Dependency scanning in CI
- [ ] Vulnerability management policy document
- [ ] Clipboard auto-clear feature
- [ ] whisper.cpp integration (basic)
- [ ] Ethics detection pattern tuning
- [ ] Training materials (user manual, admin guide)
- [ ] Bug fixes from beta feedback

## v4.2.0 → v5.0.0 Production (60-90 days)

- [ ] Voice Scribe full pipeline (ASR → Structure → Draft)
- [ ] Semantic search (local embeddings)
- [ ] Treatment progress dashboard
- [ ] Supervision workflow (queue, co-sign, feedback)
- [ ] Amendment workflow polish
- [ ] Audit Pack Generator
- [ ] MDM packages (Jamf, Intune)
- [ ] Policy-as-code engine
- [ ] SIEM log export
- [ ] On-device evaluation harness
- [ ] SOC 2 readiness assessment
- [ ] Penetration test
- [ ] Full documentation suite

## v5.0.0 → Market Domination (6 months)

- [ ] First 50 paying customers
- [ ] First enterprise pilot
- [ ] SOC 2 Type II certification
- [ ] Published security whitepaper
- [ ] 3 case studies
- [ ] Conference presentations
- [ ] Partnership with 1-2 EHRs
- [ ] iOS/Android companion apps (view-only)

---

# Summary: The Three Things That Win

1. **Voice Scribe** — The adoption wedge. "90 seconds of speaking → complete note." This is why someone tries Evidify this week.

2. **Ethics Engine + Attestation** — The trust builder. "AI that catches what you might miss and proves you followed standard of care." This is why clinicians stay.

3. **Audit Pack Generator** — The enterprise closer. "One click produces everything a payer, lawyer, or licensing board needs." This is why procurement says yes.

Build these three perfectly. Everything else is secondary.

---

*"We're not building a notes app with AI. We're building the only clinical AI that patients can verify never betrays them."*

---

**Document Control**  
Prepared: January 2026  
For: Evidify Strategic Planning  
Next Review: February 2026
