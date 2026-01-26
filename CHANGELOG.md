# Evidify Changelog

## [4.3.0-beta] - 2026-01-13

### ⚖️ FORENSIC MODE INTEGRATION

#### P0: Court-Defensibility Components
- **7-Gate Framework**: FinalizeGates.tsx - Prevents export if defensibility issues exist
  - GATE-001: Opinion-Claim Support (every opinion anchored to claims)
  - GATE-002: Citation Integrity (every claim cites evidence)
  - GATE-003: Contradiction Resolution (no unresolved conflicts)
  - GATE-004: Evidence Inventory (complete chain of custody)
  - GATE-005: AI Review (human verification for all AI content)
  - GATE-006: Limitation Disclosure (acknowledged constraints)
  - GATE-007: Methodology Documentation (traceable methods)
- **Reader Pack Export**: Court-grade Daubert Pack with:
  - Evidence inventory with SHA-256 hashes
  - Claim ledger with citation chain
  - Contradiction matrix with resolutions
  - Hash-chained audit log
  - Sentinel-based canonical verification
- **Evidence Viewer**: Full-text evidence display with annotation highlighting
- **Claim Ledger**: Opinion→Claim→Citation traceability view
- **Contradiction Intelligence**: Automatic detection and resolution tracking

#### P1: Defensibility Enhancement
- **Cross-Exam Readiness Meter**: Visual defensibility scoring
- **Testimony Mode**: Simulated cross-examination practice
- **Language Discipline**: Confidence calibration presets
- **Methodology Appendix Generator**: Auto-generated methods section
- **Collateral Reliability Scoring**: Source weighting framework
- **Timeline Builder**: Chronological evidence organization
- **Discoverability Panel**: PHI classification for discovery prep
- **OCR Verification**: Scanned document quality checks

#### Verification Infrastructure
- **verify-v1.1.cjs**: Independent verification tool
- **gate-engine-v1.1.cjs**: Gate evaluation with deterministic hashing
- **Test Packs**: CC-001 (competency), BIG-001 (scale test)
- **Negative Fixtures**: Tamper detection test cases
- **10/10 Acceptance Tests**: Full CI validation suite

### 🧭 Navigation
- **Forensic Mode Button**: Dashboard header access to forensic workspace
- **Case Management**: Forensic case list with status tracking
- **Sidebar Navigation**: Evidence → Claims → Opinions → Gates → Export flow

### 📦 Components Added
- ForensicWorkspace.tsx (unified interface)
- FinalizeGates.tsx
- ReaderPackExport.tsx
- ReaderPackPreview.tsx
- EvidenceViewer.tsx
- ClaimLedgerView.tsx
- ClaimDrawer.tsx
- OpinionChainExplainer.tsx
- ContradictionIntelligence.tsx
- CrossExamReadinessMeter.tsx
- TestimonyMode.tsx
- LanguageDiscipline.tsx
- ConfidenceLanguagePresets.tsx
- ResponseStyleDashboard.tsx
- MethodologyAppendixGenerator.tsx
- ReferralQuestionTracker.tsx
- CollateralReliabilityScoring.tsx
- TimelineBuilder.tsx
- DiscoverabilityPanel.tsx
- RedactionPreview.tsx
- OCRVerification.tsx
- BackupManager.tsx
- ExhibitBuilder.tsx

---

## [4.2.8-beta] - 2026-01-10

### 🎯 Beta Feature Showcase
- **Interactive Feature Tour**: Beautiful modal showcasing all Evidify capabilities
  - Privacy & Security tab: Local storage, encryption, air-gap, audit trail
  - AI Features tab: Local AI, note structuring, voice, RAG search, progress analysis
  - Clinical Tools tab: MSE builder, risk assessment, note types, consultations
  - Productivity tab: Time tracking, metrics, search, formatted export
- **Auto-show on First Launch**: New beta testers see the showcase immediately
- **"What's New" Button**: Sparkles button in header to re-open showcase anytime
- **Interactive Demos**: Expandable demo sections for key features
- **Key Stats Display**: Time savings, local data, HIPAA compliance badges

### 🔧 Technical
- Added 14 new Lucide icons for showcase UI
- Showcase uses localStorage to track if user has seen it
- Smooth fade-in animation on modal open
- Responsive grid layout for feature cards

## [4.2.7-beta] - 2026-01-09

### 🧠 Structured Clinical Input (Items 13-16)
- **Enhanced AI Structuring**: Improved text-to-structured note prompts with proper MSE and Risk Assessment sections
- **MSE Input Component**: Collapsible panel with dropdowns for all 9 MSE domains (Appearance, Behavior, Speech, Mood, Affect, Thought Process, Thought Content, Cognition, Insight/Judgment)
- **Risk Assessment Input**: Visual risk capture with SI/HI/Self-Harm buttons, Safety Plan, Protective Factors, and Risk Level summary
- **Treatment Progress Panel**: Theme analysis across sessions with status tracking and note excerpt linking

### 📊 Productivity Features (Items 17-20)
- **Session Time Tracking**: Live timer during note capture with metrics recording for ProvenNote
- **Clinician Profile Settings**: Name, credentials, license, practice name, and note footer configuration
- **Note Search & Filters**: Text search, note type filter, and status filter in client notes list
- **Formatted Clipboard Export**: "Export" button generates EHR-ready formatted output with headers and signature

### 🔧 Technical Improvements
- Added useEffect timer for session duration tracking
- Profile data persists in localStorage
- Fixed TypeScript type errors (DocumentationMethod, note properties)
- Frontend build: 312.94 kB (gzip: 81.57 kB)

## [4.2.6-beta] - 2026-01-09

### 🔒 Enterprise Security & Procurement Readiness
- **SBOM Generation**: CycloneDX Software Bill of Materials for all dependencies
- **BAA Stance Letter**: Legal clarity document for HIPAA Business Associate status
- **Build Provenance**: Control-to-code mapping with verification commands
- **Enterprise Proof Pack**: Per-release bundle of auditable security evidence

### 🏥 Clinical Safety Guardrails (NIST AI RMF Aligned)
- **Safety Keyword Detection**: SI/HI/abuse triggers required assessments
- **Mandatory Review Checkpoints**: Pre-export attestation workflow
- **Copy-Forward Detection**: Warns when reusing stale clinical content
- **AI Involvement Tracking**: Metadata showing what AI generated vs. clinician authored
- **Denial Statement Verification**: Prompts clinician to confirm "patient denied X" statements

### 📦 Enterprise Deployment
- **Offline Model Provisioning**: No Hugging Face dependency for air-gapped environments
- **MDM Integration**: Complete Jamf Pro and Microsoft Intune packages
- **Restore Drill Procedure**: Documented DR validation with RTO/RPO targets

### 🔧 Technical Improvements
- Fixed TypeScript component exports
- Added getPolicyVersion API binding
- Relaxed unused variable checks for beta builds
- Version consistency across all configs (4.2.6-beta)

### 📚 Documentation
- Enterprise Proof Pack Specification
- Clinical Safety Guardrails Specification
- Offline Model Provisioning Guide
- Restore Drill Procedure with report template
- Build Provenance and Control-to-Code Map

## [4.2.1-beta] - 2026-01-09

### 🎛️ Policy Configuration UI (Sprint 2)
- **PolicySettings.tsx**: Complete policy management interface
  - Export controls (cloud sync, network share, removable media)
  - Attestation requirements configuration
  - Recording/consent policy settings
  - Supervision policy (co-signature requirements)
  - Retention policy management
  - Import/export policy JSON files
  - Collapsible sections with visual feedback
  - Real-time validation

### 📦 MDM Deployment Packages (Sprint 3)
- **Jamf Pro (macOS)**:
  - `evidify-config.mobileconfig` - Complete configuration profile
  - `postinstall.sh` - Automated setup script
  - TCC/PPPC privacy permissions (Microphone, Accessibility)
  - Policy deployment via managed preferences
  
- **Microsoft Intune (Windows)**:
  - `Install-Evidify.ps1` - Full installation script
  - Win32 app packaging support (.intunewin)
  - Defender exclusions automation
  - Firewall rules for local Ollama
  - Policy JSON deployment

- **MDM Documentation**:
  - Complete deployment guide for both platforms
  - Policy configuration reference
  - Troubleshooting guide

### 🎓 Beta User Onboarding (Sprint 4)
- **BetaOnboarding.tsx**: 6-step onboarding wizard
  - Welcome with feature highlights
  - System requirements check (Ollama, Whisper, storage, keychain)
  - Profile setup (name, credentials, license state)
  - Privacy & security explanation
  - Feature tour (Voice Scribe, Ethics Detection, Time Metrics)
  - Ready-to-start confirmation
  - Progress indicator with step navigation
  - Beta terms consent collection

### ⚡ Performance Optimization (Sprint 4)
- **performance.rs** (Backend):
  - TTL-based query cache with LRU eviction
  - Background task processor for indexing/optimization
  - Batch processing utilities
  - Memory monitoring (macOS, Windows, Linux)
  - Pagination helpers for large datasets
  - SQL optimization utilities

- **performance.ts** (Frontend):
  - In-memory cache with TTL
  - Debounce and throttle utilities
  - Lazy loading with IntersectionObserver
  - Virtual list calculations
  - Request batching for API calls
  - Memoization helpers
  - Performance measurement tools

### 📦 New Tauri Commands
- `get_performance_stats` - Cache and memory statistics
- `clear_caches` - Clear query cache
- `optimize_database` - Trigger VACUUM/ANALYZE
- `get_notes_paginated` - Paginated note queries

### 🔧 Infrastructure
- Updated component index exports
- Performance state management in Tauri
- MDM directory structure

## [4.2.0-beta] - 2026-01-09

### 🎤 Voice Scribe UX Polish (Sprint 1 - Hero Feature)
- **VoiceScribe.tsx**: Complete rewrite with polished UX
  - 3-2-1 countdown before recording
  - Real-time audio level visualization
  - Progress bar with duration tracking
  - Step-by-step processing indicators
  - Privacy reassurance messaging
  - Structured note review with inline editing
  - Risk flag alerts before signing
  - Error handling with retry options
- **VoiceScribe.css**: Professional styling with dark mode support

### 📡 Offline Mode Indicator (Sprint 1)
- **ConnectionStatus.tsx**: Visual proof Evidify works offline
  - Compact status indicator with tooltip
  - Expanded panel view with connection details
  - Real-time online/offline event handling
  - Ollama connection monitoring
  - "Working Offline" banner with privacy message
- Demonstrates core value prop: "Works identically with internet off"

### ⏱️ Time Tracking Metrics (Sprint 1)
- **TimeMetrics.tsx**: Show users their time savings
  - Widget, banner, and full dashboard variants
  - Comparison to industry benchmark (16 min/encounter)
  - Weekly trend visualization
  - Method breakdown (Voice vs. Typed)
  - Efficiency score calculation
  - "Hours recovered" motivation messaging
- **time_tracking.rs**: Backend metrics recording
  - Session timing with method tracking
  - Cumulative statistics calculation
  - Weekly breakdown aggregation
- **TimeMetrics.css**: Comprehensive styling

### 🏥 One-Click EHR Export (Sprint 3)
- **ehr_export.rs**: Export to common EHR systems
  - SimplePractice (CSV import)
  - TherapyNotes (structured text)
  - Jane App (HTML import)
  - Practice Fusion / Epic (CCDA XML)
  - PDF / DOCX (universal)
- System-specific import instructions
- Batch export support for CSV formats
- "Add-on, not replacement" positioning

### ⚖️ Legal Audit Export (Sprint 3)
- **legal_export.rs**: Attorney-ready audit reports
  - Full audit trail report
  - Client timeline
  - Documentation timing certificate
  - Chain of custody report
  - Date range extracts
- Report formats: HTML/PDF, CSV, JSON
- Chain verification with gap detection
- Certification statement with signature
- "Prove you documented on time" messaging

### 👥 Supervisor Dashboard (Sprint 3-4)
- **SupervisorDashboard.tsx**: Training program wedge market
  - Review queue with priority sorting
  - Overdue alerts with visual indicators
  - Risk flag highlighting
  - Supervisee management panel
  - APA-aligned competency tracking (12 areas)
  - Feedback annotations (Strength, Growth, Question)
  - Co-signature workflow
  - Report generation
- Integrated inline styles for zero-dependency deployment

### 🔧 Backend Integration
- **main.rs**: Added module declarations and state management
  - time_tracking, ehr_export, legal_export modules
  - TimeTrackerState management
  - 8 new Tauri commands registered
- **commands.rs**: New voice commands
  - get_voice_status: Check whisper installation
  - transcribe_audio_base64: Transcribe from browser audio
  - structure_voice_note: AI-powered note structuring

### 📦 TypeScript Bindings
- **tauri.ts**: ~300 lines of new type definitions
  - VoiceStatus, StructuredVoiceNote
  - TimeMetricsData, SessionMetrics, WeeklyStats
  - EhrTargetInfo, ExportableNote, EhrExportResult
  - LegalReport, LegalAuditEntry, ChainVerification
  - Supervisee types
  - 15+ new API functions

### 📝 Documentation
- Component index file for clean imports
- CSS files with dark mode support
- Inline documentation for all new features

## v4.2.0-beta (January 2026)

### 🚀 Major Features

#### Enterprise Supply Chain Security (P0)
- **macOS Code Signing & Notarization**: Full script for Developer ID signing, notarization via notarytool, and stapling
- **Windows Code Signing**: PowerShell script for EV certificate signing with SignTool
- **SBOM Generation**: CycloneDX format bill of materials for Rust + Node.js dependencies
- **Security Scanning CI**: GitHub Actions workflow for daily cargo audit, npm audit, and license compliance
- **Vulnerability Management Policy**: Complete policy document with SLA tiers (24h/7d/30d/90d)

#### Clipboard PHI Protection (P1)
- **Auto-clear TTL**: Clipboard automatically clears after 30 seconds (configurable)
- **Content classification**: Different handling for clinical notes vs. non-sensitive content  
- **Audit logging**: All clipboard operations logged (no PHI in logs)
- **Policy controls**: Organization can configure or disable clipboard features

#### Policy-as-Code Engine (P1)
- **OrganizationPolicy schema**: Comprehensive policy bundle format
- **Export controls**: Block/Warn/Allow rules per destination type
- **Attestation requirements**: Policy-defined required vs. optional attestations
- **Recording consent rules**: Configurable consent and retention requirements
- **Supervision rules**: Co-signature requirements by credential level
- **Offline enforcement**: Policies enforced locally even without network

#### Enhanced Ethics Detection (P1)
12 new detection patterns:
- **Mandatory Reporting**: Child abuse/neglect, elder abuse, vulnerable adult concerns
- **Duty to Warn**: Threats to identifiable third parties, escalating violence patterns
- **Capacity Concerns**: Decision-making impairment, guardianship considerations
- **Telehealth Safety**: Location verification, unsafe environments, jurisdiction
- **Security**: Injection detection, egress surface references, audit manipulation
- **Documentation**: Risk-intervention mismatch, consent issues

#### Voice Scribe Enhancement (P1)
- **whisper.cpp CLI integration**: Full command-line integration with whisper-cpp
- **Audio conversion**: Automatic ffmpeg conversion to 16kHz WAV
- **Model management**: List, detect, and recommend Whisper models
- **JSON output parsing**: Full segment extraction with timing
- **Voice status API**: Check whisper installation, models, ffmpeg availability

#### Supervision Workflow (P1)
- **Supervisor-supervisee relationships**: Credential-based assignments
- **Review queue**: Prioritized by urgency, age, and risk flags
- **Feedback annotations**: Strengths, improvements, critical concerns, questions
- **Co-signature workflow**: Full attestation and signing chain
- **Competency tracking**: Rating history with evidence

#### Audit Pack Generator (P2)
- **Multiple pack types**: Full, Summary, Legal, Payer, Custom
- **Complete documentation**: Notes, amendments, attestations, audit log
- **Chain verification**: Cryptographic proof of integrity
- **Export certificates**: Tamper-evident proof of export
- **Destination controls**: Block cloud-synced destinations

#### SIEM Integration (P2)
- **PHI-impossible events**: Only event types and hashed identifiers
- **Multiple formats**: Splunk HEC, Azure Sentinel, Generic JSON, CEF Syslog
- **Batching**: Configurable batch size and flush intervals
- **Retry logic**: Automatic retry for failed sends
- **Event builders**: Pre-built helpers for common event types

### 📚 Documentation

- **USER_MANUAL.md**: 50+ page comprehensive clinician guide
- **ADMINISTRATOR_GUIDE.md**: Enterprise deployment and management guide
- **VULNERABILITY_MANAGEMENT_POLICY.md**: Security incident response policy
- **BETA_TO_PRODUCTION_ROADMAP.md**: Complete 90-day launch plan
- **SPRINT_BACKLOG_v2.md**: Detailed implementation tasks with code samples

### 🔧 Technical Improvements

- New Rust modules: `clipboard.rs`, `policy.rs`, `supervision.rs`, `siem.rs`, `audit_pack.rs`
- Extended TypeScript API bindings (~400 new lines in tauri.ts)
- CI/CD: Security scanning workflow for GitHub Actions
- Build scripts: macOS/Windows signing automation

### 📦 New Dependencies

- `dirs = "5.0"` for cross-platform directory detection

### 🔒 Security

- All new features follow PHI-minimal/PHI-impossible design
- No PHI in clipboard audit logs
- No PHI in SIEM events
- Audit pack export blocked for cloud-synced destinations
- Policy enforcement works offline

---

## v4.1.2-hotfix15 (January 2026)

Previous release with ethics detection, amendments, and installer improvements.

---

## Migration Notes

### From v4.1.x to v4.2.0

1. **No breaking changes** - existing vaults work without modification
2. **New features opt-in** - SIEM, supervision require configuration
3. **Policy optional** - solo practitioners can use defaults

### Enterprise Deployment

1. Generate policy bundle with organization settings
2. Include in MDM deployment package
3. Configure SIEM endpoint if using
4. Review and customize ethics patterns

---

*For questions or issues, contact support@evidify.ai*
