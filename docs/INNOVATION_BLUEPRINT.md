# Evidify Innovation Blueprint
## Local-First AI Clinical Documentation: Creating the Category

**Version:** 1.0  
**Date:** January 2026  
**Classification:** Strategic Planning Document

---

# Context Summary

**Product:** Evidify — Local-first clinical documentation platform for behavioral health  
**Target Users:** Solo clinicians, group practices, training clinics, health systems  
**Primary Workflows:** Session notes, intake assessments, risk assessment, treatment planning, supervision/QA  
**Deployment Model:** Tauri desktop (macOS/Windows), local-only with optional encrypted cloud backup  
**Data Types:** Text notes, audio (voice scribe), PDFs, templates, clinical measures  
**Current Differentiators:** Encrypted vault, hash-chained audit, Defend Note attestation, local AI (Ollama), ethics detection  
**Current Stage:** Beta (v4.1.2)  
**Revenue Hypothesis:** Per-seat SaaS ($49-199/mo solo, enterprise licensing)  
**Competitive Substitutes:** EHR templates, ambient scribes (Nuance DAX, Abridge), note apps, dictation tools

---

# 1. The "Holy Shit" Product Vision

## The Category We're Creating

**Evidify is not a "notes app with AI."**

We are creating **Provably Private Clinical AI** — a new category where AI-powered efficiency and mathematical privacy guarantees are not trade-offs but architectural foundations.

The behavioral health documentation market is bifurcated:
- **Cloud AI scribes** offer 50-70% time savings but require transmitting intimate psychotherapy conversations to third-party servers, creating HIPAA liability and eroding therapeutic trust
- **Manual documentation** preserves privacy but costs clinicians 2-3 hours daily in administrative burden

Evidify eliminates this false choice. Our architecture makes PHI egress *impossible*, not just *policy-prohibited*. A clinician can unplug their ethernet cable, turn off WiFi, and verify the application works identically — because no PHI ever needs to leave their device.

This isn't a feature. It's a category-defining constraint that unlocks a new value proposition: **"AI that your patients can trust because it literally cannot betray them."**

## Five Signature Moments (Offline Superpowers)

### 1. "The Fifteen-Second SOAP Note"
Clinician finishes a 50-minute session. They speak naturally for 90 seconds into Voice Scribe: "Client presented with increased anxiety, discussed cognitive restructuring around catastrophic thinking, assigned breathing exercises, follow-up in two weeks, no safety concerns." They click once. A fully structured SOAP note appears — properly formatted, with MSE populated from speech patterns, risk section auto-flagged for review, and ICD-10 codes suggested. All processing happened on their laptop. No audio left the room.

### 2. "The Safety Net That Catches You"
A clinician types "pt mentioned having a really hard time last week, some dark thoughts." Before they can save, Evidify's ethics engine flags "dark thoughts" as potential SI language. A non-intrusive prompt appears: "Safety language detected. Did you assess: frequency? intensity? plan? means? protective factors?" The clinician clicks through a quick attestation checklist. The note now includes documentation that the standard of care was met — and the attestation itself is cryptographically signed and timestamped. If this note is ever subpoenaed, it demonstrates clinical diligence, not liability.

### 3. "The Instant Longitudinal Insight"
Reviewing a complex case, the clinician asks: "Show me all mentions of sleep across this client's treatment." Within 2 seconds — entirely offline — Evidify surfaces every session where sleep was discussed, with context snippets and a trend visualization showing PHQ-9 sleep items over time. The clinician spots a pattern: sleep deterioration correlates with work stress mentions. This took 10 seconds. In a traditional EHR, this would require reading through 40 session notes manually.

### 4. "The Audit-Proof Export"
A malpractice attorney requests records. The clinician clicks "Generate Audit Pack." Evidify produces: (1) all notes for the relevant period, (2) a chain-of-custody report showing no tampering, (3) all attestations with timestamps, (4) a redacted version suitable for legal review. The export is automatically blocked from being saved to iCloud, OneDrive, or any cloud-synced folder. The clinician knows exactly what left their machine and where it went.

### 5. "The De-Identified Consult"
Stuck on a complex diagnostic formulation, the clinician clicks "Request Peer Input." Evidify automatically de-identifies the case (removing names, dates, locations, unique identifiers) and presents a preview: "This is what your colleagues will see." The clinician approves. The case goes to a network of peer consultants who provide diagnostic impressions and treatment suggestions — all without ever learning who the patient is. The clinician gets expert input; the patient gets privacy.

## The Primary Wedge: Why Adopt This Quarter

**The wedge is not "better notes" — it's "defensible notes."**

Three converging pressures make Q1 2026 the adoption moment:

1. **Insurance Audit Intensification**: Payers are deploying AI to audit behavioral health documentation at scale. Notes that lack proper structure, risk documentation, or medical necessity language are being denied retroactively. Clinicians need notes that are audit-defensible by construction, not hope.

2. **AI Trust Collapse**: High-profile breaches at cloud AI vendors and increasing patient awareness of data practices are making "we use AI" a liability rather than a selling point. Clinicians need AI they can truthfully tell patients doesn't send data anywhere.

3. **Burnout Crisis**: Behavioral health has a 50% turnover rate, largely driven by administrative burden. Practices that can offer clinicians efficient documentation tools have a hiring advantage. But those tools must not create new compliance risks.

**The pitch**: "Cut documentation time by 60% with AI that your patients can verify never sees their data, and notes that are pre-structured for audit defense."

---

# 2. Fifty Innovation Candidates

## Bucket A: In-Session Capture (8 ideas)

### A1. Ambient Listening Mode
**Description**: Continuous low-power voice capture that auto-segments into "session" when clinician speech patterns indicate clinical content  
**Primary User**: Clinician  
**Why Better**: Eliminates the friction of starting/stopping recording; captures natural conversation flow  
**Offline Feasibility**: Yes — local VAD (voice activity detection) and lightweight trigger model  
**Risk/Ethics Note**: Requires explicit patient consent and clear visual indicator when active

### A2. Dual-Track Transcription
**Description**: Separate speaker diarization tracks for clinician vs. patient, enabling patient-quoted material to be clearly distinguished  
**Primary User**: Clinician  
**Why Better**: Supports proper documentation standards (patient quotes vs. clinician observations)  
**Offline Feasibility**: Yes — speaker diarization runs in Whisper  
**Risk/Ethics Note**: Must never auto-quote patient without clinician review

### A3. Session Timestamp Markers
**Description**: One-tap markers during session ("important", "safety", "action item") that link to transcription timeline  
**Primary User**: Clinician  
**Why Better**: Enables rapid post-session review of key moments without scrubbing audio  
**Offline Feasibility**: Yes — simple timestamp storage  
**Risk/Ethics Note**: Markers should not auto-categorize without clinician confirmation

### A4. Keyboard-Free Quick Notes
**Description**: Voice-activated micro-notes during session ("Note: patient tearful discussing mother")  
**Primary User**: Clinician  
**Why Better**: Captures in-session observations without breaking eye contact or therapeutic presence  
**Offline Feasibility**: Yes — local wake word + short transcription  
**Risk/Ethics Note**: Audio cue must be subtle; patient should be informed

### A5. Smart Session Timer
**Description**: Automatic session timing with gentle alerts at clinical intervals (45 min warning, 5 min warning)  
**Primary User**: Clinician  
**Why Better**: Eliminates clock-watching; supports proper session pacing  
**Offline Feasibility**: Yes — simple timer logic  
**Risk/Ethics Note**: Alerts should be silent/vibration to avoid interrupting patient

### A6. Crisis Protocol Trigger
**Description**: Voice command ("Evidify: crisis protocol") that immediately opens structured safety assessment with audio recording  
**Primary User**: Clinician  
**Why Better**: Reduces fumbling during high-stress moments; ensures proper documentation of safety assessments  
**Offline Feasibility**: Yes — local wake word  
**Risk/Ethics Note**: Must not create false sense of security; supplements, not replaces, clinical judgment

### A7. Session Template Auto-Select
**Description**: Based on initial spoken context ("This is an intake for..." vs "Following up on..."), pre-selects appropriate note template  
**Primary User**: Clinician  
**Why Better**: Eliminates template selection step; adapts to clinical context  
**Offline Feasibility**: Yes — simple keyword classification  
**Risk/Ethics Note**: Clinician must confirm template selection before finalizing

### A8. Multi-Modal Input Fusion
**Description**: Combine voice + typed + pasted content into unified note draft  
**Primary User**: Clinician  
**Why Better**: Supports natural documentation workflow where some content is dictated, some typed, some imported  
**Offline Feasibility**: Yes — local text processing  
**Risk/Ethics Note**: Source attribution should be preserved for audit purposes

---

## Bucket B: Post-Session Synthesis (8 ideas)

### B1. Intelligent MSE Extraction
**Description**: Auto-populate Mental Status Exam fields from session transcription (appearance, mood, affect, thought process, etc.)  
**Primary User**: Clinician  
**Why Better**: MSE documentation is tedious but required; automation with review saves 5-10 min/note  
**Offline Feasibility**: Yes — structured extraction via local LLM  
**Risk/Ethics Note**: All MSE fields require clinician attestation; AI suggestions clearly marked

### B2. Risk Stratification Summary
**Description**: Automatic compilation of risk factors, protective factors, and risk level suggestion based on session content  
**Primary User**: Clinician  
**Why Better**: Ensures risk documentation completeness; reduces missed safety signals  
**Offline Feasibility**: Yes — keyword extraction + structured summary  
**Risk/Ethics Note**: Never auto-assigns risk level; presents factors for clinician determination

### B3. Treatment Progress Tracker
**Description**: Longitudinal visualization of symptom measures, treatment goals, and intervention frequency across sessions  
**Primary User**: Clinician, Supervisor  
**Why Better**: Enables measurement-based care; surfaces treatment drift or stagnation  
**Offline Feasibility**: Yes — local database aggregation  
**Risk/Ethics Note**: Visualizations should not imply causal relationships without clinical interpretation

### B4. Homework/Action Item Extractor
**Description**: Auto-identifies assigned homework, behavioral experiments, and follow-up items from session content  
**Primary User**: Clinician  
**Why Better**: Ensures continuity; supports accountability in treatment  
**Offline Feasibility**: Yes — structured extraction  
**Risk/Ethics Note**: Extracted items require clinician confirmation before persistence

### B5. Differential Diagnosis Assistant
**Description**: Given presenting symptoms and history, surfaces relevant differential diagnoses with DSM-5 criteria comparison  
**Primary User**: Clinician  
**Why Better**: Reduces diagnostic anchoring; ensures systematic consideration of alternatives  
**Offline Feasibility**: Yes — local DSM-5 knowledge base + LLM reasoning  
**Risk/Ethics Note**: Explicit disclaimer that this is decision support, not diagnosis; clinician attestation required

### B6. Medical Necessity Statement Generator
**Description**: Auto-generates medical necessity language based on diagnosis, symptoms, and treatment plan for insurance documentation  
**Primary User**: Clinician, Billing Staff  
**Why Better**: Reduces claim denials; ensures proper justification language  
**Offline Feasibility**: Yes — templated generation with session context  
**Risk/Ethics Note**: Generated statements require clinical review; must accurately reflect clinical picture

### B7. Cross-Session Theme Analysis
**Description**: Identifies recurring themes, patterns, and topics across client's treatment history  
**Primary User**: Clinician, Supervisor  
**Why Better**: Supports case conceptualization; surfaces patterns not obvious in individual sessions  
**Offline Feasibility**: Yes — local embedding similarity + clustering  
**Risk/Ethics Note**: Patterns are suggestions for clinical interpretation, not conclusions

### B8. Session Comparison View
**Description**: Side-by-side comparison of current session with previous sessions highlighting changes in presentation  
**Primary User**: Clinician  
**Why Better**: Rapid identification of clinical change; supports progress documentation  
**Offline Feasibility**: Yes — diff-style comparison of structured content  
**Risk/Ethics Note**: Comparison is informational; clinical significance requires interpretation

---

## Bucket C: Defensibility (8 ideas)

### C1. Attestation Checklist Engine
**Description**: Configurable attestation requirements tied to note content (e.g., SI mention triggers safety assessment attestation)  
**Primary User**: Clinician, Compliance Officer  
**Why Better**: Ensures standard of care documentation without manual checklist management  
**Offline Feasibility**: Yes — rule-based triggering  
**Risk/Ethics Note**: Attestations are legal documents; language must be reviewed by legal

### C2. Amendment Audit Trail
**Description**: Track all changes to finalized notes with timestamped, signed amendment records  
**Primary User**: Clinician, HIM, Legal  
**Why Better**: Supports proper medical record amendment procedures; defensible change history  
**Offline Feasibility**: Yes — append-only log with signatures  
**Risk/Ethics Note**: Amendments must clearly indicate what changed and why

### C3. Audit Pack Generator
**Description**: One-click generation of defensibility package: notes, attestations, chain-of-custody, export log  
**Primary User**: Clinician, Legal, HIM  
**Why Better**: Reduces time to respond to audits/subpoenas from hours to minutes  
**Offline Feasibility**: Yes — local aggregation and formatting  
**Risk/Ethics Note**: Generated packs should be reviewed before transmission

### C4. Co-Signature Workflow
**Description**: Structured workflow for supervisee notes requiring supervisor attestation  
**Primary User**: Supervisor, Trainee  
**Why Better**: Meets training documentation requirements; creates defensible supervision record  
**Offline Feasibility**: Yes — local multi-party attestation (same device or via encrypted export)  
**Risk/Ethics Note**: Supervisor must actually review, not just sign; workflow should require attestation of review

### C5. Export Destination Control
**Description**: Classify and optionally block exports to cloud-synced folders, network shares, or removable media  
**Primary User**: Clinician, IT, Security  
**Why Better**: Prevents accidental PHI leakage to cloud services; enterprise-enforceable policy  
**Offline Feasibility**: Yes — local path analysis  
**Risk/Ethics Note**: Must balance security with clinician workflow; overly restrictive policies cause workarounds

### C6. Session Recording Consent Engine
**Description**: Structured consent capture and management for voice recording with jurisdiction-specific templates  
**Primary User**: Clinician, Compliance Officer  
**Why Better**: Ensures proper consent documentation; adapts to varying state requirements  
**Offline Feasibility**: Yes — local consent storage with jurisdiction rules  
**Risk/Ethics Note**: Consent requirements vary significantly; legal review required for templates

### C7. Tamper-Evident Hash Chain
**Description**: Every audit entry is cryptographically chained to previous entries, enabling detection of any tampering  
**Primary User**: Auditor, Legal, Security  
**Why Better**: Mathematical proof that records haven't been altered; exceeds HIPAA requirements  
**Offline Feasibility**: Yes — SHA-256 chaining  
**Risk/Ethics Note**: Chain verification should be easy for non-technical auditors to understand

### C8. Real-Time Documentation Gap Alerting
**Description**: Before finalizing, alerts clinician to missing required elements (risk assessment, treatment plan, etc.)  
**Primary User**: Clinician  
**Why Better**: Catches incomplete documentation before it becomes a liability; supports training  
**Offline Feasibility**: Yes — rule-based validation  
**Risk/Ethics Note**: Alerts should guide, not dictate; clinical judgment determines what's required

---

## Bucket D: Clinical Intelligence (7 ideas)

### D1. Outcome Trajectory Visualization
**Description**: Graph treatment outcomes (PHQ-9, GAD-7, custom measures) over time with trend analysis  
**Primary User**: Clinician, Supervisor  
**Why Better**: Enables measurement-based care; surfaces treatment non-response early  
**Offline Feasibility**: Yes — local charting with stored measures  
**Risk/Ethics Note**: Trajectories inform, not replace, clinical judgment about treatment effectiveness

### D2. Similar Case Retrieval
**Description**: Given current client presentation, surface anonymized similar cases from clinician's own practice  
**Primary User**: Clinician  
**Why Better**: Leverages clinician's own experience; supports pattern recognition  
**Offline Feasibility**: Yes — local embedding similarity search  
**Risk/Ethics Note**: Must never surface identifiable information about other clients

### D3. Treatment Response Prediction
**Description**: Based on client characteristics and treatment type, estimate likelihood of response  
**Primary User**: Clinician  
**Why Better**: Supports treatment selection; manages expectations  
**Offline Feasibility**: Partially — requires pre-trained model; personalization limited  
**Risk/Ethics Note**: Predictions are probabilistic estimates, not guarantees; must not create self-fulfilling prophecies

### D4. Medication Interaction Checker
**Description**: Flag potential interactions between documented medications  
**Primary User**: Clinician  
**Why Better**: Catches interactions that may affect treatment or safety  
**Offline Feasibility**: Yes — local drug interaction database  
**Risk/Ethics Note**: Not a substitute for pharmacist/prescriber review; behavioral health clinicians often don't prescribe

### D5. Cultural Formulation Support
**Description**: Prompts and resources for culturally-informed assessment and documentation  
**Primary User**: Clinician  
**Why Better**: Supports competent care for diverse populations; documents cultural considerations  
**Offline Feasibility**: Yes — structured prompts with cultural resources  
**Risk/Ethics Note**: Cultural guidance must be evidence-based and avoid stereotyping

### D6. Diagnostic Criteria Matcher
**Description**: Compare documented symptoms against DSM-5/ICD-10 criteria with visual checklist  
**Primary User**: Clinician, Trainee  
**Why Better**: Ensures diagnostic accuracy; supports training and audit defense  
**Offline Feasibility**: Yes — local criteria database  
**Risk/Ethics Note**: Tool supports, not replaces, clinical diagnostic judgment

### D7. Risk Factor Correlation Analysis
**Description**: Identify correlations between client factors and risk events across treatment history  
**Primary User**: Clinician, Supervisor  
**Why Better**: Personalizes risk assessment based on individual patterns  
**Offline Feasibility**: Yes — local statistical analysis  
**Risk/Ethics Note**: Correlations are not predictions; must not create false confidence in risk assessment

---

## Bucket E: Supervision & Training (6 ideas)

### E1. Supervisee Dashboard
**Description**: Supervisor view of all supervisee notes pending review, flagged items, and competency metrics  
**Primary User**: Supervisor  
**Why Better**: Centralizes supervision workflow; ensures timely review  
**Offline Feasibility**: Yes — local aggregation across supervisee exports  
**Risk/Ethics Note**: Must maintain confidentiality boundaries; supervisees aware of what's tracked

### E2. Competency Tracking
**Description**: Track supervisee progress on defined competencies with documentation examples  
**Primary User**: Supervisor, Trainee  
**Why Better**: Supports systematic training; provides defensible competency evidence  
**Offline Feasibility**: Yes — structured competency framework with linked notes  
**Risk/Ethics Note**: Competency assessment requires clinical judgment, not just metrics

### E3. Feedback Annotation System
**Description**: Supervisor can annotate supervisee notes with feedback that persists with the note  
**Primary User**: Supervisor, Trainee  
**Why Better**: Creates learning record; feedback tied to specific documentation examples  
**Offline Feasibility**: Yes — annotation layer on notes  
**Risk/Ethics Note**: Feedback should be constructive; visible only to supervisor/supervisee

### E4. Didactic Resource Linking
**Description**: Link educational resources (articles, videos, guidelines) to specific clinical scenarios  
**Primary User**: Supervisor, Trainee  
**Why Better**: Just-in-time learning tied to real cases  
**Offline Feasibility**: Partially — resources must be downloaded locally  
**Risk/Ethics Note**: Resources should be evidence-based and professionally vetted

### E5. Supervision Session Logger
**Description**: Structured documentation of supervision sessions with goals, content, and action items  
**Primary User**: Supervisor  
**Why Better**: Creates defensible supervision record; supports training compliance  
**Offline Feasibility**: Yes — structured supervision note template  
**Risk/Ethics Note**: Supervision notes may be discoverable; appropriate confidentiality boundaries

### E6. Peer Review Workflow
**Description**: Blinded peer review of notes for quality improvement without client identification  
**Primary User**: Clinician, QA Team  
**Why Better**: Enables quality improvement; catches documentation issues before they become problems  
**Offline Feasibility**: Yes — local de-identification before review  
**Risk/Ethics Note**: De-identification must be thorough; reviewers must not attempt re-identification

---

## Bucket F: Enterprise Adoption (6 ideas)

### F1. Centralized Policy Management
**Description**: Admin console to define and enforce documentation policies across all clinicians  
**Primary User**: Admin, Compliance Officer  
**Why Better**: Ensures consistent policy enforcement; reduces compliance burden  
**Offline Feasibility**: Yes — policy sync on periodic connection; local enforcement  
**Risk/Ethics Note**: Policies should support, not override, clinical judgment

### F2. MDM/EMM Integration
**Description**: Device management integration for enterprise deployment (Jamf, Intune)  
**Primary User**: IT Admin  
**Why Better**: Enables enterprise deployment workflows; supports device compliance  
**Offline Feasibility**: Yes — standard MDM protocols  
**Risk/Ethics Note**: MDM should not enable remote PHI access or extraction

### F3. SIEM Log Forwarding
**Description**: Structured audit log export to enterprise security monitoring (Splunk, etc.)  
**Primary User**: Security Team  
**Why Better**: Enables security monitoring without PHI egress; supports SOC 2/HIPAA compliance  
**Offline Feasibility**: Partially — requires periodic network connection for export  
**Risk/Ethics Note**: Forwarded logs must be PHI-minimal; only event types, not content

### F4. Bulk Deployment Package
**Description**: Pre-configured installer with organization settings and policies  
**Primary User**: IT Admin  
**Why Better**: Reduces deployment friction; ensures consistent configuration  
**Offline Feasibility**: Yes — bundled configuration  
**Risk/Ethics Note**: Default configurations should be secure; customization requires documentation

### F5. Usage Analytics Dashboard
**Description**: Aggregate usage metrics (notes created, time saved, attestation rates) without PHI  
**Primary User**: Admin, QA Team  
**Why Better**: Supports ROI justification; identifies training needs  
**Offline Feasibility**: Partially — requires periodic sync of anonymized metrics  
**Risk/Ethics Note**: Metrics must not enable individual identification or performance punishment

### F6. Multi-Site Data Isolation
**Description**: Ensure data from different sites/practices remains logically separated even on shared infrastructure  
**Primary User**: IT Admin, Security  
**Why Better**: Supports multi-tenant deployment; reduces cross-contamination risk  
**Offline Feasibility**: Yes — local vault separation with site tagging  
**Risk/Ethics Note**: Isolation must be cryptographic, not just logical

---

## Bucket G: Moat / Uncopiable Assets (4 ideas)

### G1. Clinician Documentation Fingerprint
**Description**: Learn individual clinician's documentation style to personalize AI suggestions  
**Primary User**: Clinician  
**Why Better**: Suggestions feel natural; reduces editing time; improves over time with use  
**Offline Feasibility**: Yes — local fine-tuning or prompt optimization  
**Risk/Ethics Note**: Personalization must not reinforce documentation errors; periodic calibration needed

### G2. Longitudinal Clinical Knowledge Graph
**Description**: Build structured knowledge graph of client symptoms, treatments, and outcomes over time  
**Primary User**: Clinician, System  
**Why Better**: Enables sophisticated clinical intelligence; grows more valuable with use  
**Offline Feasibility**: Yes — local graph database  
**Risk/Ethics Note**: Knowledge graph is PHI; same protections as raw notes

### G3. Attestation Pattern Analysis
**Description**: Aggregate (anonymized) attestation patterns to identify common documentation gaps and training needs  
**Primary User**: Admin, QA Team  
**Why Better**: Creates feedback loop for policy and training improvement  
**Offline Feasibility**: Partially — requires anonymized aggregation  
**Risk/Ethics Note**: Patterns must not enable identification of individual clinicians or clients

### G4. Cryptographic Practice Lineage
**Description**: Verifiable chain of note provenance from creation through all modifications and exports  
**Primary User**: Auditor, Legal  
**Why Better**: Mathematical proof of document integrity that competitors cannot easily replicate  
**Offline Feasibility**: Yes — local cryptographic operations  
**Risk/Ethics Note**: Lineage verification must be accessible to non-technical auditors

---

## Bucket H: Delight UX (3 ideas)

### H1. Gesture-Based Navigation
**Description**: Swipe gestures for common actions (next client, previous note, mark complete)  
**Primary User**: Clinician  
**Why Better**: Reduces clicks; supports efficient workflow  
**Offline Feasibility**: Yes — local gesture handling  
**Risk/Ethics Note**: Gestures should not enable accidental actions on sensitive operations

### H2. Adaptive Interface Density
**Description**: Automatically adjust UI density based on screen size and user preference  
**Primary User**: Clinician  
**Why Better**: Optimal use of screen space; supports various working contexts  
**Offline Feasibility**: Yes — responsive design  
**Risk/Ethics Note**: Critical information must remain visible regardless of density setting

### H3. Contextual Keyboard Shortcuts
**Description**: Context-aware keyboard shortcuts that adapt to current workflow step  
**Primary User**: Power User Clinician  
**Why Better**: Reduces mouse use; supports efficient documentation  
**Offline Feasibility**: Yes — local shortcut handling  
**Risk/Ethics Note**: Shortcuts should not enable bypassing safety checks

---

# 3. Top 10 Feature Selection (Portfolio Strategy)

## Selection Rationale

The selected features form a coherent strategy:
- **Core workflow accelerators** (3): Direct time savings that drive adoption
- **Defensibility accelerators** (3): Risk reduction that enables enterprise sales
- **Enterprise adoption accelerators** (2): Deployment capabilities that unblock procurement
- **Moat builders** (2): Long-term competitive differentiation

---

## Core Workflow Accelerators

### Feature 1: Voice Scribe with Intelligent MSE Extraction (A1 + B1)

**Job-to-be-done**: "Help me document this session in under 2 minutes without missing required elements"

**UX Flow**:
1. Clinician taps "Start Session" — visible recording indicator appears
2. Session proceeds normally; clinician may tap markers for key moments
3. Clinician taps "End Session" — audio processing begins
4. Within 15-30 seconds, structured note appears with:
   - Transcribed content organized by SOAP sections
   - MSE fields auto-populated from observed speech patterns
   - Risk factors highlighted for review
   - Suggested ICD-10 codes
5. Clinician reviews, edits as needed, clicks "Finalize"
6. Audio is destroyed (per policy) after note approval

**Data Model Objects**:
- `Session`: id, client_id, started_at, ended_at, markers[]
- `Transcription`: id, session_id, segments[], speakers[]
- `MSEExtraction`: id, note_id, appearance, mood, affect, thought_process, insight, judgment, confidence_scores[]
- `Note`: id, client_id, session_id, raw_content, structured_content, status

**Local AI Approach**:
- Whisper (base.en or medium.en) for transcription
- Qwen 2.5 7B for structured extraction and MSE population
- Confidence scoring for each MSE field (high/medium/low)
- Guardrail: MSE fields below 0.7 confidence marked "Review Required"

**Failure Modes & Safe Defaults**:
- Transcription failure → Audio preserved; manual transcription fallback
- MSE extraction failure → Fields left blank with "Could not determine"
- Model overload → Queued processing with ETA display
- Audio corruption → Session markers + typed notes preserved

**Acceptance Criteria**:
- [ ] Transcription WER < 15% on clinical speech corpus
- [ ] MSE extraction accuracy > 80% on labeled test set
- [ ] End-to-end processing < 30 seconds for 50-minute session
- [ ] Audio destruction verified (file gone, not just unlinked)
- [ ] Works fully offline

**Metrics**:
- Documentation time per session (target: 80% reduction)
- MSE completion rate (target: 95% vs baseline 70%)
- Clinician edit rate on AI-generated content (target: < 30%)

**Build Effort**: Large (8-12 weeks)  
**Dependencies**: Whisper integration, model fine-tuning, audio handling infrastructure

---

### Feature 2: Treatment Progress Dashboard (B3)

**Job-to-be-done**: "Show me how this client is doing over time without reading 40 notes"

**UX Flow**:
1. From client view, clinician clicks "Treatment Progress"
2. Dashboard displays:
   - Outcome measures over time (PHQ-9, GAD-7, etc.) as interactive charts
   - Session frequency timeline
   - Theme tracking (sleep, anxiety, relationships, etc.) with trend indicators
   - Risk trajectory (improving/stable/concerning)
   - Treatment goals with progress indicators
3. Clinician can click any data point to jump to source session
4. Export to PDF for treatment summaries or case conferences

**Data Model Objects**:
- `Measure`: id, client_id, measure_type, score, subscores[], administered_at
- `ThemeTrack`: id, client_id, theme_name, mentions[], trend
- `TreatmentGoal`: id, client_id, description, target, current, sessions_worked[]
- `ProgressSummary`: id, client_id, generated_at, metrics{}, narrative

**Local AI Approach**:
- Keyword-based theme extraction (no LLM needed for basic version)
- Simple trend calculation (first half vs second half comparison)
- LLM for narrative summary generation (optional enhancement)

**Failure Modes & Safe Defaults**:
- Insufficient data → "Need X more sessions for meaningful trends"
- Theme detection miss → Manual theme tagging available
- Measure data gaps → Visual indication of missing data points

**Acceptance Criteria**:
- [ ] Chart renders < 500ms for 50+ sessions
- [ ] Theme detection precision > 85%
- [ ] Trend direction matches clinical judgment in 90% of test cases
- [ ] Export produces clean, printable PDF

**Metrics**:
- Time to assess treatment progress (target: 90% reduction)
- Case conference preparation time (target: 70% reduction)
- Clinician trust in AI-generated trends (survey: > 4/5)

**Build Effort**: Medium (4-6 weeks)  
**Dependencies**: Note content parsing, charting library, PDF export

---

### Feature 3: Cross-Client Search with Semantic Retrieval (D2)

**Job-to-be-done**: "Find all my clients where I used exposure therapy for social anxiety"

**UX Flow**:
1. From dashboard, clinician enters search query
2. Two search modes:
   - **Profile Search**: Find clients by demographics, diagnosis, insurance
   - **Content Search**: Semantic search across all session notes
3. Results show:
   - Client name/pseudonym
   - Matched context snippet
   - Relevance score
   - Date range of matches
4. Click result to navigate to client or specific note
5. Advanced filters: date range, note type, risk level

**Data Model Objects**:
- `SearchIndex`: client_id, note_id, embedding[], keywords[]
- `SearchResult`: client_id, note_id, snippet, score, matched_fields[]
- `SearchHistory`: query, timestamp, result_count (for search improvement)

**Local AI Approach**:
- Local embedding model (e5-small or similar, ~100MB)
- Vector similarity search using local database
- Keyword fallback for exact match requirements
- Hybrid scoring: semantic + keyword relevance

**Failure Modes & Safe Defaults**:
- Embedding model unavailable → Keyword-only search
- Index corruption → Automatic rebuild from source notes
- No results → Suggest alternative queries

**Acceptance Criteria**:
- [ ] Search returns results < 2 seconds for 1000+ notes
- [ ] Semantic search finds relevant results not matching keywords
- [ ] Index size < 10% of source data size
- [ ] Incremental indexing for new notes

**Metrics**:
- Search success rate (target: > 90% find what they're looking for)
- Time to find specific client/content (target: 80% reduction)
- Search usage frequency (adoption indicator)

**Build Effort**: Medium (4-6 weeks)  
**Dependencies**: Embedding model integration, vector storage, index management

---

## Defensibility Accelerators

### Feature 4: Comprehensive Ethics Detection Engine (C1 enhanced)

**Job-to-be-done**: "Ensure I never miss documenting safety assessments or clinical risk"

**UX Flow**:
1. As clinician types/dictates, real-time detection highlights concerning content
2. On "Generate" click, full ethics analysis runs:
   - **P0 - Clinical Safety**: SI rehearsal imagery, means access, HI indicators, driving impairment, documentation coercion
   - **P0 - Telehealth Compliance**: Location verification, jurisdiction, privacy environment
   - **P0 - Security/Integrity**: Prompt injection attempts, egress references, audit manipulation
   - **P1 - Documentation Completeness**: Risk-intervention matching, diagnosis documentation
3. Detections display in severity-grouped panels with evidence snippets
4. Each detection requires attestation: "Addressed" / "Will address next session" / "Not clinically relevant" / "Consulted supervisor"
5. Cannot finalize note until all P0 items attested
6. Attestations cryptographically signed with timestamp

**Data Model Objects**:
- `Detection`: id, note_id, category, severity, pattern_id, evidence_snippet, match_offsets
- `Attestation`: detection_id, response_type, response_note, attested_at, signature
- `DetectionPattern`: id, category, patterns[], exclusions[], title, description, suggestion, policy_ref

**Local AI Approach**:
- Rule-based pattern matching for detection (fast, deterministic)
- LLM for context-aware false positive reduction (optional)
- No AI for attestation decisions — clinician judgment only

**Failure Modes & Safe Defaults**:
- Pattern match overload → Batch processing with progress indicator
- False positive flood → Severity calibration; "bulk dismiss similar" option
- Detection engine crash → Note saves as draft; detection runs on reopen

**Acceptance Criteria**:
- [ ] Detects 95%+ of labeled safety content in test corpus
- [ ] False positive rate < 20% (acceptable noise level)
- [ ] Processing < 500ms for typical note
- [ ] Attestation UI completes in < 30 seconds for 5 detections
- [ ] All attestations include cryptographic timestamp

**Metrics**:
- Safety documentation completeness (target: 100% of flagged items attested)
- Time to attestation (target: < 60 seconds average)
- Post-implementation audit findings (target: 50% reduction)

**Build Effort**: Large (6-8 weeks for comprehensive patterns)  
**Dependencies**: Pattern library development, attestation workflow, signature infrastructure

---

### Feature 5: Amendment Workflow with Audit Trail (C2)

**Job-to-be-done**: "Correct an error in a finalized note while maintaining legal defensibility"

**UX Flow**:
1. From signed note view, clinician clicks "Add Amendment"
2. Amendment form requires:
   - Reason for amendment (dropdown + free text)
   - Amendment content
   - Confirmation that original is preserved
3. On save:
   - Original note remains intact
   - Amendment appended with clear visual separation
   - Timestamp and signature added
   - Status changes to "Amended"
4. Note view shows:
   - Original content
   - Amendment section with datetime and reason
   - "View history" option showing all versions

**Data Model Objects**:
- `Amendment`: id, note_id, reason_category, reason_text, content, amended_at, signature
- `NoteVersion`: note_id, version, content_hash, created_at, amendment_id (null for original)
- `AuditEntry`: event_type=NoteAmended, resource_id, amendment_id, previous_hash

**Local AI Approach**:
- None required — this is a workflow feature
- Optional: AI-suggested amendment language based on reason category

**Failure Modes & Safe Defaults**:
- Amendment save failure → Draft preserved; retry available
- Signature failure → Cannot complete amendment; error displayed
- Hash chain break → Alert admin; note marked for review

**Acceptance Criteria**:
- [ ] Original note content never modified (append-only)
- [ ] Amendment includes cryptographic signature
- [ ] Audit trail captures amendment event
- [ ] Visual distinction between original and amendments
- [ ] Export includes amendment history

**Metrics**:
- Amendment completion rate (target: 100% of started amendments complete)
- Audit defensibility score (external review)
- Compliance with medical record amendment regulations

**Build Effort**: Small-Medium (2-4 weeks)  
**Dependencies**: Signature infrastructure, audit logging, UI updates

---

### Feature 6: Audit Pack Generator (C3)

**Job-to-be-done**: "Respond to a records request in 15 minutes, not 4 hours"

**UX Flow**:
1. Admin/Clinician clicks "Generate Audit Pack"
2. Configuration wizard:
   - Date range selection
   - Client selection (single, multiple, all)
   - Pack type: Full / Summary / Legal Response / Payer Audit
   - Redaction options (if applicable)
3. Generation produces:
   - **Index**: List of included documents
   - **Notes**: Formatted clinical notes with attestations
   - **Attestation Summary**: All attestations with status
   - **Chain of Custody**: Cryptographic verification that notes haven't been altered
   - **Audit Log Extract**: Relevant audit events (PHI-minimal)
   - **Export Certificate**: Signed document confirming what was exported, when, by whom
4. Export destination verification (blocks cloud-sync folders)
5. Audit log entry created for the export itself

**Data Model Objects**:
- `AuditPack`: id, type, date_range, client_ids[], generated_at, generated_by, contents[], export_path_hash
- `ChainOfCustody`: pack_id, entries[], verification_status, verification_timestamp
- `ExportCertificate`: pack_id, content_hash, exported_at, exported_by, destination_class

**Local AI Approach**:
- None required — aggregation and formatting
- Optional: AI-generated executive summary for large packs

**Failure Modes & Safe Defaults**:
- Large pack timeout → Background processing with notification
- Chain verification failure → Pack marked "Verification Issue"; investigation triggered
- Export to risky destination → Blocked with explanation; safe destination required

**Acceptance Criteria**:
- [ ] Pack generation < 2 minutes for 100 notes
- [ ] Chain of custody verifiable by external auditor
- [ ] Export certificate legally sufficient
- [ ] Cloud-sync destination detection works for major providers
- [ ] Pack format acceptable to common payer auditors

**Metrics**:
- Records request response time (target: 80% reduction)
- Audit finding rate post-implementation (target: 50% reduction)
- Clinician confidence in audit preparedness (survey)

**Build Effort**: Medium (4-6 weeks)  
**Dependencies**: Export infrastructure, chain verification, PDF generation

---

## Enterprise Adoption Accelerators

### Feature 7: Centralized Policy Management (F1)

**Job-to-be-done**: "Ensure all our clinicians follow the same documentation standards"

**UX Flow**:
1. Admin accesses Policy Console (separate admin interface)
2. Define policies:
   - **Required Attestations**: Which detections require which responses
   - **Note Templates**: Approved templates by note type
   - **Export Controls**: Allowed/blocked destinations
   - **Session Recording**: Consent requirements by jurisdiction
   - **Supervision**: Co-signature requirements by credential level
3. Policies saved as signed configuration
4. Clinician devices sync policies on next connection
5. Local enforcement: policies enforced even offline
6. Policy compliance dashboard: aggregate adherence metrics

**Data Model Objects**:
- `Policy`: id, type, version, rules{}, effective_date, signed_by
- `PolicySync`: device_id, policy_id, synced_at, acknowledged_at
- `PolicyCompliance`: device_id, policy_id, period, compliant_actions, total_actions
- `PolicyOverride`: device_id, policy_id, override_reason, approved_by, expires_at

**Local AI Approach**:
- None — rule-based policy enforcement

**Failure Modes & Safe Defaults**:
- Policy sync failure → Last known policy remains active; retry scheduled
- Policy conflict → Most restrictive policy wins
- Override expiration → Automatic reversion to base policy

**Acceptance Criteria**:
- [ ] Policy changes propagate to all devices within 24 hours (when connected)
- [ ] Offline enforcement identical to online
- [ ] Admin can view compliance metrics across organization
- [ ] Emergency policy updates supported

**Metrics**:
- Policy compliance rate (target: > 98%)
- Time to policy propagation (target: < 24 hours)
- Policy-related support tickets (target: < 1% of users)

**Build Effort**: Large (8-12 weeks)  
**Dependencies**: Admin console, sync infrastructure, policy engine

---

### Feature 8: Supervisee Dashboard (E1)

**Job-to-be-done**: "See all my supervisees' notes pending review in one place"

**UX Flow**:
1. Supervisor logs in with supervisor role
2. Dashboard shows:
   - **Pending Review**: Notes awaiting co-signature
   - **Flagged Items**: Notes with unresolved high-severity detections
   - **Recent Activity**: Supervisee documentation activity
   - **Competency Summary**: Progress on tracked competencies
3. Click note to review:
   - Full note content
   - Supervisee's attestations
   - Detection history
   - Option to add feedback annotation
   - Co-signature button
4. Feedback persists with note (visible to supervisee)
5. Supervision metrics exportable for training documentation

**Data Model Objects**:
- `SupervisionRelationship`: supervisor_id, supervisee_id, started_at, ended_at, scope
- `ReviewQueue`: supervisor_id, note_id, added_at, priority, status
- `FeedbackAnnotation`: id, note_id, supervisor_id, content, created_at, category
- `CompetencyAssessment`: supervisee_id, competency_id, rating, evidence_note_ids[], assessed_at

**Local AI Approach**:
- None for core workflow
- Optional: AI-suggested feedback based on common documentation issues

**Failure Modes & Safe Defaults**:
- Supervisee data unavailable → Queue shows "Sync required"
- Co-signature failure → Note remains pending; supervisor alerted
- Feedback save failure → Draft preserved locally

**Acceptance Criteria**:
- [ ] Supervisor can view all supervisee notes within relationship scope
- [ ] Co-signature creates audit trail entry
- [ ] Feedback visible to supervisee after save
- [ ] Export includes supervision documentation

**Metrics**:
- Time from note creation to co-signature (target: < 48 hours)
- Feedback frequency per supervisee (target: > 1 per week)
- Supervisee satisfaction with feedback (survey)

**Build Effort**: Medium (4-6 weeks)  
**Dependencies**: Role-based access, note sharing infrastructure, feedback system

---

## Moat Builders

### Feature 9: Clinician Documentation Fingerprint (G1)

**Job-to-be-done**: "Have AI suggestions match my writing style so I edit less"

**UX Flow**:
1. After 20+ notes, system prompts: "Learn your style?"
2. Clinician consents; local style analysis runs
3. Style model captures:
   - Preferred terminology (e.g., "pt" vs "patient" vs "client")
   - Sentence structure patterns
   - Section organization preferences
   - Common phrases and idioms
4. Subsequent AI suggestions adapt to learned style
5. Periodic recalibration option
6. Style profile exportable (for new device setup)

**Data Model Objects**:
- `StyleProfile`: clinician_id, terminology_prefs{}, structure_patterns[], phrase_bank[], version
- `StyleTraining`: clinician_id, note_ids_used[], trained_at, metrics{}
- `StyleAdaptation`: note_id, original_suggestion, adapted_suggestion, clinician_edits

**Local AI Approach**:
- Style extraction via local LLM analysis of existing notes
- Style application via prompt engineering with style context
- No fine-tuning required — few-shot learning with examples

**Failure Modes & Safe Defaults**:
- Insufficient training data → Use generic style
- Style extraction failure → Continue with default suggestions
- Style produces inappropriate content → Always require clinician review

**Acceptance Criteria**:
- [ ] Style learning completes in < 5 minutes
- [ ] 30%+ reduction in clinician edits after style learning
- [ ] Style does not produce clinically inappropriate suggestions
- [ ] Style profile < 1MB for portability

**Metrics**:
- Clinician edit rate pre/post style learning (target: 30% reduction)
- Clinician satisfaction with suggestions (survey)
- Style profile adoption rate (target: > 70% of eligible users)

**Build Effort**: Medium (4-6 weeks)  
**Dependencies**: Sufficient note volume, LLM style extraction capability

---

### Feature 10: Longitudinal Clinical Knowledge Graph (G2)

**Job-to-be-done**: "Build a structured understanding of each client that grows over time"

**UX Flow**:
1. System automatically extracts entities and relationships from each note:
   - Symptoms and their trajectory
   - Treatments and responses
   - Life events and impacts
   - Relationships and social factors
2. Knowledge graph visualization available from client view
3. Graph supports queries:
   - "When did sleep problems start?"
   - "What treatments have been tried for anxiety?"
   - "What life events correlate with symptom changes?"
4. Graph powers other features:
   - Similar case retrieval
   - Treatment progress visualization
   - Risk factor correlation

**Data Model Objects**:
- `Entity`: id, type, name, first_seen, last_seen, note_ids[]
- `Relationship`: source_entity, target_entity, type, strength, note_ids[]
- `EventTimeline`: client_id, events[{date, type, entity_ids, note_id}]
- `GraphQuery`: query, entities_returned[], relationships_returned[]

**Local AI Approach**:
- Entity extraction via local LLM
- Relationship inference via pattern matching + LLM
- Graph storage in local database (SQLite or embedded graph DB)

**Failure Modes & Safe Defaults**:
- Entity extraction errors → Manual correction available
- Graph corruption → Rebuild from source notes
- Query performance degradation → Index optimization; background processing

**Acceptance Criteria**:
- [ ] Entity extraction precision > 85%
- [ ] Relationship inference accuracy > 75%
- [ ] Graph query response < 1 second
- [ ] Visualization renders < 2 seconds for 50+ session clients

**Metrics**:
- Clinician usage of graph features (adoption)
- Time to answer clinical questions (target: 70% reduction)
- Graph-powered feature utilization (cascade effect)

**Build Effort**: Large (10-14 weeks)  
**Dependencies**: Entity extraction pipeline, graph database, visualization library

---

# 4. The "Offline Intelligence Stack"

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EVIDIFY DESKTOP APPLICATION                      │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │   React UI      │  │   Tauri Bridge  │  │   Rust Backend  │         │
│  │   (Frontend)    │◄─┤   (Commands)    │◄─┤   (Core Logic)  │         │
│  └─────────────────┘  └─────────────────┘  └────────┬────────┘         │
│                                                       │                  │
├───────────────────────────────────────────────────────┼──────────────────┤
│                    INTELLIGENCE LAYER                 │                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────▼────────┐         │
│  │  Voice Pipeline │  │  Text Pipeline  │  │  Ethics Engine  │         │
│  │  (Whisper)      │  │  (Ollama LLM)   │  │  (Rule-based)   │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│           │                     │                    │                  │
│  ┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐         │
│  │  Transcription  │  │  Structuring    │  │  Detection      │         │
│  │  Diarization    │  │  Extraction     │  │  Attestation    │         │
│  │  Timestamps     │  │  Summarization  │  │  Verification   │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│           │                     │                    │                  │
├───────────┼─────────────────────┼────────────────────┼──────────────────┤
│           │        RETRIEVAL LAYER                   │                  │
│  ┌────────▼─────────────────────▼────────────────────▼────────┐        │
│  │                    Embedding Index                          │        │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │        │
│  │  │ e5-small     │  │ Vector Store │  │ Keyword Index│      │        │
│  │  │ (~100MB)     │  │ (SQLite)     │  │ (FTS5)       │      │        │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │        │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                         DATA LAYER                                      │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │                    SQLCipher Vault                           │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │       │
│  │  │ Clients  │ │  Notes   │ │ Detections│ │Audit Log │       │       │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │       │
│  │  │Embeddings│ │Attestations│ │Knowledge│ │  Style   │       │       │
│  │  │          │ │           │ │  Graph   │ │ Profiles │       │       │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

                    EXTERNAL (LOCAL ONLY)
    ┌─────────────────┐        ┌─────────────────┐
    │  Ollama Server  │        │   Whisper.cpp   │
    │  (localhost)    │        │   (embedded)    │
    │  Port 11434     │        │                 │
    └─────────────────┘        └─────────────────┘
```

## Component Details

### Voice Pipeline (Whisper)

**Strategy**: Embedded whisper.cpp for zero-dependency transcription

- **Model Options**:
  - `base.en` (150MB): Fast, good for clear speech, English only
  - `medium.en` (1.5GB): Better accuracy, still reasonable speed
  - `large-v3` (3GB): Best accuracy, requires capable hardware
  
- **Processing Flow**:
  1. Audio captured via OS APIs (CoreAudio/WASAPI)
  2. Converted to 16kHz mono WAV
  3. Whisper processes in chunks (30-second segments)
  4. Diarization post-processing for speaker separation
  5. Transcript assembled with timestamps

- **Latency Targets**:
  - Real-time factor < 0.3 (50-minute session processes in < 15 minutes)
  - End-to-end completion < 60 seconds after session end (for typical session)

### Text Pipeline (Ollama)

**Strategy**: Local LLM via Ollama for all text processing

- **Model Selection**:
  - Primary: Qwen 2.5 7B Instruct (best balance of quality/speed)
  - Fallback: Llama 3.2 3B (lower memory requirement)
  - Advanced: Mistral 7B or Gemma 2 9B (if hardware supports)

- **Operations**:
  - Note structuring (SOAP, DAP, etc.)
  - MSE extraction
  - Theme identification
  - Summary generation
  - Entity extraction (for knowledge graph)
  - Style adaptation

- **Latency Targets**:
  - Structuring: < 30 seconds
  - Extraction operations: < 10 seconds
  - Summary: < 15 seconds

### Ethics Engine (Rule-Based)

**Strategy**: Deterministic rule-based detection for reliability and explainability

- **No LLM for Safety Decisions**: Critical safety detection uses regex patterns, not AI
- **Pattern Categories**:
  - Safety (SI, HI, abuse, neglect)
  - Telehealth compliance
  - Security/integrity
  - Documentation completeness
  
- **Why Rule-Based**:
  - Auditable: Every detection traceable to specific rule
  - Consistent: Same input always produces same output
  - Fast: < 100ms for typical note
  - Explainable: Evidence snippet shows exactly what triggered

### Retrieval Layer

**Strategy**: Hybrid search combining semantic and keyword approaches

- **Embedding Model**: e5-small-v2 (~100MB) for semantic similarity
- **Vector Storage**: SQLite with vector extension (or simple JSON storage)
- **Keyword Index**: SQLite FTS5 for exact matching

- **Query Flow**:
  1. Query embedded using same model
  2. Vector similarity search returns top-50 candidates
  3. Keyword search returns exact matches
  4. Results merged and re-ranked
  5. Top-10 returned with snippets

### Clinical Reasoning Approach

**CRITICAL**: Avoiding confident wrongness

1. **Never Diagnose**: AI suggests differentials, never assigns diagnoses
2. **Always Cite**: Every AI statement must reference source content
3. **Express Uncertainty**: Confidence indicators on all extractions
4. **Require Confirmation**: Clinical decisions require clinician attestation
5. **Scope Control**: AI refuses requests outside its capability

**Guardrails**:
- Medical/legal advice requests → Redirect to appropriate professional
- Diagnostic certainty requests → "This is decision support, not diagnosis"
- Treatment recommendations → "Consider these options; clinician determines"
- Risk predictions → "Factors to consider; clinical judgment determines risk level"

### On-Device Evaluation Harness

**Purpose**: Detect model drift and maintain quality without network

- **Gold Sets**: 50+ labeled notes for each key operation
- **Regression Tests**: Run on model update; flag degradation
- **Metrics Tracking**:
  - Transcription: WER on held-out audio samples
  - Structuring: Field extraction accuracy
  - Ethics: Detection precision/recall
  - Retrieval: MRR on known-answer queries

- **Drift Detection**:
  - Weekly automated evaluation against gold sets
  - Alert if metrics degrade > 5% from baseline
  - Block model updates that fail regression tests

## API Boundaries

### PHI-Touching Operations
These operations access PHI and run entirely locally:
- Note creation/editing
- Transcription
- Structuring
- Ethics detection
- Search/retrieval
- Export generation

### PHI-Minimal Operations
These operations may transmit data but only after de-identification:
- Anonymized metrics sync
- Peer consultation submissions
- Crash reports (allowlist only)
- Policy sync (configuration only)

### Never-PHI Operations
These operations never touch PHI:
- License validation
- Update checks
- Usage analytics (event types only)

## Latency Budget

| Operation | Target | Maximum | Notes |
|-----------|--------|---------|-------|
| Vault unlock | 500ms | 1s | Argon2 key derivation |
| Note load | 100ms | 200ms | Database query |
| Ethics detection | 200ms | 500ms | Pattern matching |
| AI structuring | 15s | 30s | LLM inference |
| Voice transcription | 0.3x real-time | 0.5x | Whisper processing |
| Search query | 500ms | 2s | Embedding + retrieval |
| Export generation | 5s | 30s | Depends on note count |
| Audit verification | 500ms | 2s | Chain hash verification |

---

# 5. "Defensible by Design" Mechanisms

## Mechanism 1: Cryptographic Attestation Chain

**What It Does**: Every clinician attestation (safety acknowledgment, note finalization, amendment) is cryptographically signed and linked to previous attestations, creating an unbreakable chain of clinical decisions.

**Technical Implementation**:
```
Attestation {
  id: UUID
  detection_id: UUID (what was attested)
  response: enum (Addressed, WillAddress, NotRelevant, ConsultedSupervisor)
  response_note: string (optional elaboration)
  timestamp: ISO8601
  clinician_id: UUID
  previous_hash: SHA256 (links to previous attestation)
  attestation_hash: SHA256(serialize(this))
  signature: Ed25519(attestation_hash, clinician_key)
}
```

**Proof Artifact Generated**:
- Chain verification report showing unbroken attestation history
- Per-client attestation summary with timestamps
- Exportable attestation certificate for legal proceedings

**Enterprise Friction Reduced**:
- Malpractice defense: Mathematical proof of clinical diligence
- Licensing board inquiries: Demonstrable documentation of standard of care
- Audit response: Pre-generated defensibility package

## Mechanism 2: Tamper-Evident Audit Log

**What It Does**: Every action in the system is logged in a hash-chained audit log that makes tampering detectable.

**Technical Implementation**:
```
AuditEntry {
  id: UUID
  sequence: integer (monotonic)
  timestamp: ISO8601
  event_type: enum (NoteCreated, NoteModified, NoteSigned, etc.)
  resource_type: enum (Note, Client, Export, etc.)
  resource_id: UUID
  outcome: enum (Success, Failure, Blocked)
  previous_hash: SHA256
  entry_hash: SHA256(serialize(this))
}
```

**Key Property**: PHI-Minimal
- Log captures WHAT happened, not WHAT WAS SAID
- No note content in audit log
- No patient names or identifiers
- Only event types and resource IDs

**Proof Artifact Generated**:
- Chain verification certificate
- Event timeline (without PHI)
- Integrity attestation for legal proceedings

**Enterprise Friction Reduced**:
- SOC 2 audit: Demonstrable audit trail
- HIPAA compliance: Activity logging without PHI exposure
- Legal discovery: What happened when, provably

## Mechanism 3: Export Destination Intelligence

**What It Does**: Classifies and optionally blocks exports to risky destinations (cloud-sync folders, network shares, removable media).

**Technical Implementation**:
- Path analysis detects known cloud-sync folders (iCloud, OneDrive, Dropbox, Google Drive)
- Network share detection via path prefix analysis
- Removable media detection via mount point analysis
- Policy-configurable response: Warn, Block, Require Justification

**Classification Levels**:
- **Safe**: Local non-synced directory
- **Cloud-Sync**: Known cloud-synced folder → WARN/BLOCK
- **Network-Share**: Network mount point → WARN/BLOCK
- **Removable**: USB/external drive → WARN (with audit)
- **Unknown**: Unclassifiable path → WARN

**Proof Artifact Generated**:
- Export log with destination classification
- Policy compliance report
- Blocked export attempts (for security review)

**Enterprise Friction Reduced**:
- DLP compliance: Automated exfiltration prevention
- Security questionnaires: Demonstrable egress controls
- Incident response: Clear export history

## Mechanism 4: Supervisor QA Pipeline

**What It Does**: Structured workflow for supervision with measurable quality metrics.

**Technical Implementation**:
- Role-based access: Supervisor sees supervisee notes
- Review queue: Pending items prioritized by severity
- Feedback system: Annotations linked to specific notes
- Co-signature: Cryptographically signed supervisor approval
- Competency tracking: Progress on defined skills

**Quality Metrics Generated**:
- Time to review (supervisor responsiveness)
- Feedback frequency (supervision engagement)
- Competency progression (training effectiveness)
- Documentation quality scores (before/after supervision)

**Proof Artifact Generated**:
- Supervision documentation report
- Competency assessment records
- Training compliance evidence

**Enterprise Friction Reduced**:
- Accreditation: Demonstrable supervision program
- Training documentation: Evidence of skill development
- Liability reduction: Documented oversight

## Mechanism 5: Policy-as-Code Safety Rails

**What It Does**: Organization policies encoded as enforceable rules, not just documentation.

**Technical Implementation**:
```
Policy {
  id: UUID
  type: enum (ExportControl, AttestationRequirement, RecordingConsent, etc.)
  version: string
  effective_date: ISO8601
  rules: JSON (structured policy definition)
  signed_by: AdminID
  signature: Ed25519
}

PolicyEnforcement {
  policy_id: UUID
  action_attempted: string
  action_allowed: boolean
  override_reason: string (if override)
  override_approved_by: AdminID (if override)
}
```

**Example Policies**:
- "All SI detections require attestation before note finalization"
- "Exports to cloud-sync folders require admin override"
- "Supervisee notes require co-signature within 72 hours"
- "Voice recording requires documented consent per state law"

**Proof Artifact Generated**:
- Policy compliance dashboard
- Override audit trail
- Policy version history

**Enterprise Friction Reduced**:
- Compliance automation: Policies enforced, not hoped for
- Audit readiness: Demonstrable policy enforcement
- Risk reduction: Fewer human-error policy violations

---

# 6. Enterprise Packaging

## Tier 1: Solo / Small Group ($49-99/month per seat)

**Target**: Individual practitioners, 1-5 person practices

**Included Capabilities**:
- Full documentation workflow (capture, structure, finalize)
- Ethics detection and attestation
- Local AI structuring (requires Ollama)
- Voice Scribe (requires whisper.cpp)
- Encrypted vault with passphrase
- Export to PDF/DOCX
- Basic audit logging
- Treatment progress tracking

**Admin Controls**:
- Self-service license activation
- Local backup/restore
- Export destination warnings (not blocks)

**Procurement Objections & Answers**:

| Objection | Response |
|-----------|----------|
| "How do I know data is really local?" | Demonstration: unplug network, use app identically |
| "What if I forget my passphrase?" | No vendor recovery by design; backup guidance provided |
| "Is this HIPAA compliant?" | Local-only architecture minimizes BA relationship; compliance guidance included |
| "What about updates?" | Signed updates via standard channels; no network required for core function |

**Proof Pack Checklist**:
- [ ] Architecture diagram (one-pager)
- [ ] HIPAA applicability memo
- [ ] Data flow diagram (local-only)
- [ ] Basic security FAQ

---

## Tier 2: Group Practice / Supervisor ($149-199/month per seat)

**Target**: 5-50 person practices, training clinics

**Included Capabilities**:
Everything in Solo, plus:
- Supervision workflows (review queue, co-signature)
- Centralized policy management
- Cross-clinician search (de-identified)
- Competency tracking
- Usage analytics (aggregate, non-PHI)
- Priority support

**Admin Controls**:
- Org-wide policy definition
- User role management (Clinician, Supervisor, Admin)
- Export destination blocking
- Audit log review
- Compliance dashboard

**Procurement Objections & Answers**:

| Objection | Response |
|-----------|----------|
| "How do policies sync without cloud?" | Encrypted policy sync on periodic connection; enforcement is local |
| "Can supervisors see all notes?" | Only within defined supervision relationships; audit logged |
| "What about HIPAA for group practice?" | Local-first architecture; no central PHI repository |
| "How do we onboard/offboard?" | Encrypted vault export/import; device decommission guidance |

**Proof Pack Checklist**:
Everything in Solo, plus:
- [ ] Policy management documentation
- [ ] Role-based access matrix
- [ ] Supervision workflow guide
- [ ] Onboarding/offboarding procedures
- [ ] Business Associate Agreement (if optional cloud features used)

---

## Tier 3: Enterprise ($Custom pricing)

**Target**: Health systems, hospitals, academic medical centers, VA-type facilities

**Included Capabilities**:
Everything in Group Practice, plus:
- MDM/EMM integration (Jamf, Intune)
- SIEM log forwarding (PHI-minimal)
- Bulk deployment packages
- Custom policy templates
- Dedicated implementation support
- SLA-backed support
- Security review cooperation
- Custom model fine-tuning (on-premise)

**Admin Controls**:
- Centralized device management
- Fleet-wide policy enforcement
- Compliance reporting dashboards
- Multi-site data isolation
- Advanced audit analytics
- Emergency policy updates

**Procurement Objections & Answers**:

| Objection | Response |
|-----------|----------|
| "We need SOC 2 Type II" | Architecture review available; local-only reduces scope; SOC 2 roadmap shared |
| "How does this integrate with our EHR?" | FHIR export; copy/paste workflow; API roadmap for bidirectional |
| "What about our security questionnaire?" | Pre-filled SIG/CAIQ available; security team available for calls |
| "We need penetration testing" | Pen test report available; customer pen tests welcomed |
| "What's the total cost of ownership?" | ROI calculator provided; no cloud costs; reduced audit costs |
| "What if you go out of business?" | Data is local and exportable; no vendor lock-in for data |

**Proof Pack Checklist**:
Everything in Group Practice, plus:
- [ ] SOC 2 readiness assessment
- [ ] HIPAA Security Rule mapping
- [ ] NIST 800-53 control mapping
- [ ] Penetration test report
- [ ] SBOM (Software Bill of Materials)
- [ ] Vulnerability management policy
- [ ] Incident response plan
- [ ] Business continuity documentation
- [ ] Data classification guide
- [ ] Third-party risk assessment
- [ ] Security architecture review
- [ ] Reference customer contacts

---

# 7. 30/60/90 Day Build Plan

## Day 1-30: "Unfair Advantage MVP"

**Theme**: Daily-use core workflow that demonstrates immediate value

### Deliverables

| # | Deliverable | Owner | Definition of Done |
|---|-------------|-------|-------------------|
| 1 | Voice Scribe MVP | ML Eng | Whisper transcription working; < 30s for 50-min session |
| 2 | Enhanced Ethics Engine | Backend | 15+ detection patterns; P0/P1/P2 severity levels |
| 3 | Quick Capture client selector | Frontend | User can select client before note creation |
| 4 | Note amendment workflow | Backend + Frontend | Signed notes can be amended with audit trail |
| 5 | Streamlined onboarding | DevOps | One-command installer; < 20 min setup time |
| 6 | Documentation package | Product | QUICKSTART, INSTALL, troubleshooting complete |

### Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Whisper performance on older hardware | Medium | High | Tier model selection based on hardware detection |
| Ethics false positive flood | Medium | Medium | Severity tuning; "dismiss similar" option |
| Installer complexity | Low | Medium | Automated installer script |

### Demo Script (5 minutes)

1. **[0:00-1:00]** "Install takes 15 minutes total. One command handles dependencies."
2. **[1:00-2:00]** "Start a session, speak naturally for 90 seconds. Watch the transcription appear."
3. **[2:00-3:00]** "Click Generate. See SOAP note with MSE populated, risk factors highlighted."
4. **[3:00-4:00]** "This note has safety language. See the attestation flow - takes 30 seconds."
5. **[4:00-5:00]** "Note is now signed, cryptographically timestamped, and defensible. All offline."

---

## Day 31-60: "Defensible Workflows"

**Theme**: Features that reduce risk and build trust for enterprise conversations

### Deliverables

| # | Deliverable | Owner | Definition of Done |
|---|-------------|-------|-------------------|
| 1 | Audit Pack Generator | Backend + Frontend | One-click generation of defensibility package |
| 2 | Treatment Progress Dashboard | Frontend | Outcome visualization, theme tracking, risk trajectory |
| 3 | Semantic Search | ML Eng | Local embeddings; hybrid search working |
| 4 | Export destination controls | Backend | Cloud-sync detection; configurable policy |
| 5 | Supervision workflow MVP | Full stack | Supervisee notes visible; co-signature working |
| 6 | Enterprise documentation | Product | Security whitepaper, HIPAA memo, architecture docs |

### Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Embedding model size | Low | Medium | Quantized model; optional download |
| Export detection false positives | Medium | Medium | Conservative defaults; user override with audit |
| Supervision complexity | Medium | Medium | Start simple; iterate based on feedback |

### Demo Script (5 minutes)

1. **[0:00-1:00]** "Your malpractice attorney needs records. Click 'Generate Audit Pack.' Done."
2. **[1:00-2:00]** "See this client's treatment progress - PHQ-9 over time, themes, risk trajectory."
3. **[2:00-3:00]** "Search across all your clients: 'exposure therapy social anxiety.' Semantic search finds it."
4. **[3:00-4:00]** "Try to export to iCloud - blocked. Try Desktop - allowed, logged."
5. **[4:00-5:00]** "Supervisor view: pending reviews, flagged items, one-click co-signature."

---

## Day 61-90: "Enterprise Pilot Kit"

**Theme**: Everything needed to pass procurement and run a successful pilot

### Deliverables

| # | Deliverable | Owner | Definition of Done |
|---|-------------|-------|-------------------|
| 1 | Centralized Policy Management | Full stack | Admin can define; clinicians sync; offline enforcement |
| 2 | MDM Integration | DevOps | Jamf/Intune deployment packages |
| 3 | SIEM Log Forwarding | Backend | PHI-minimal logs to standard formats |
| 4 | Compliance Dashboard | Frontend | Policy compliance, usage metrics, audit readiness |
| 5 | Security Review Package | Security | Pen test, SBOM, vulnerability report, control mapping |
| 6 | Pilot Playbook | Product | Implementation guide, success criteria, escalation paths |

### Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Policy sync complexity | Medium | High | Start with simple policies; iterate |
| MDM variations | Medium | Medium | Focus on top 2 MDMs first |
| Enterprise customization requests | High | Medium | Clear scope; documented customization options |

### Demo Script (5 minutes)

1. **[0:00-1:00]** "IT deploys via Jamf. 500 clinicians, one configuration, offline-enforced policies."
2. **[1:00-2:00]** "Admin console: define policies, view compliance, see aggregate metrics."
3. **[2:00-3:00]** "Security team: PHI-minimal logs to Splunk. Event types only, no content."
4. **[3:00-4:00]** "Here's the security package: pen test report, SBOM, HIPAA mapping, SOC 2 readiness."
5. **[4:00-5:00]** "Pilot metrics dashboard: time saved, documentation completeness, user adoption."

---

# 8. If We Only Built 3 Things

If resources are severely constrained, these three moves maximize adoption velocity, defensibility, and moat:

## 1. Voice Scribe with Intelligent Extraction

**Why This**: The clearest value proposition. "Speak for 90 seconds, get a complete note." This is the adoption wedge - it's why someone downloads the app this week, not "someday."

**Impact**:
- **Adoption**: Immediate time savings (60%+ reduction in documentation time)
- **Defensibility**: Complete notes reduce documentation gaps
- **Moat**: Clinicians build habit and content history

## 2. Comprehensive Ethics Engine + Attestation

**Why This**: The defensibility differentiator. Not just AI efficiency - AI that makes you safer. This is why the compliance officer says yes.

**Impact**:
- **Adoption**: Reduces anxiety about missing safety documentation
- **Defensibility**: Cryptographic proof of clinical diligence
- **Moat**: Attestation history becomes valuable audit artifact

## 3. Audit Pack Generator

**Why This**: The enterprise closer. When the pilot champion needs to justify continued use, they click one button and have everything they need.

**Impact**:
- **Adoption**: Removes friction from audit response
- **Defensibility**: Pre-packaged proof artifacts
- **Moat**: Organizations that survive audits with Evidify won't switch

---

These three features create a flywheel:
1. Voice Scribe drives adoption (users try it for time savings)
2. Ethics Engine builds trust (users realize it catches things they might miss)
3. Audit Pack closes enterprises (procurement sees proof artifacts)

Each reinforces the others, and together they establish Evidify as the category leader in **Provably Private Clinical AI**.

---

*Document prepared by Evidify Strategic Planning Team, January 2026*
