# Evidify Master PRD — Consent-Forward Recording + Structured Deep Analysis (Local-First)
**Date:** 2026-01-08  
**Audience:** Engineering, Product, Security, Clinical Governance, QA  
**Status:** Implementation-ready (v1)

---

## 0) Executive Summary
Evidify is a **local-first clinical documentation platform**. This PRD defines two major capability expansions:

1) **Consent-forward, on-device session audio capture** (not cloud), designed to reduce clinician documentation burden while preserving patient trust. Default behavior is **auto-destruction** of session audio immediately after note generation, with PHI-minimal proof via a **Destruction Certificate**.

2) **Structured-only “Deep Analysis”** that improves clinician reasoning and defensibility using only **structured extractions** from notes over time (symptoms, interventions, risk/compliance tags, plan items). It must:
- Suggest **alternative diagnostic / assessment considerations** (assistive, not diagnostic).
- Detect **inconsistencies** across sessions.
- Surface **symptom and treatment trajectories**.

Both features must preserve Evidify’s core differentiator: **no PHI network egress** and **audit-defensible outputs**.

---

## 1) Problem Statement
### 1.1 Clinician pain
- Clinicians spend substantial time documenting; pressure leads to incomplete notes, copy-forward behavior, and compliance risk.
- “Ambient AI scribes” are viewed as high-risk because they often involve cloud capture and unclear retention.

### 1.2 Enterprise pain
- Buyers demand defensibility: “Can you prove what happened, when, and that you followed policy?”
- Recording introduces legal/ethical risk unless consent and retention are handled rigorously.

### 1.3 Evidify’s opportunity
Evidify can offer a **high-trust alternative**: optional on-device capture + immediate destruction + defensible certificates, plus structured-only longitudinal intelligence.

---

## 2) Goals and Non-Goals
### 2.1 Goals
**Recording**
- Offer optional, consented **audio-only** recording to device.
- Ensure recording is **never uploaded** and is encrypted at rest.
- Default to **auto-destroy after note generation**.
- Provide clinician-visible, PHI-minimal **Destruction Certificate**.
- Provide conservative, offline **Jurisdiction/Consent Engine** that gates recording.

**Deep Analysis (structured-only)**
- Live, low-latency analysis during note entry (debounced).
- Provide longitudinal insights (patient timeline).
- Show “evidence trail” for every output (which structured fields triggered it).
- Provide clinician controls: accept/reject/defer, sensitivity settings, mute rule.

### 2.2 Non-Goals (v1)
- Cloud storage, cloud inference, or remote transcription.
- Full natural-language interpretation of free-text transcripts as the primary reasoning input.
- Provider-side population analytics across clinicians/devices (multi-tenant cloud).
- “Diagnose the patient” behavior; outputs must be framed as *considerations*.

---

## 3) Personas and Stakeholders
- **Primary clinicians:** psychologists, psychiatrists, therapists, neuropsychologists, LCSWs/LMHCs, APRNs.
- **Supervisors/QA:** documentation review, risk management.
- **Patients:** consent, trust, privacy expectations.
- **IT/Security:** endpoint posture, audit logs, no-egress proof.
- **Revenue cycle/auditors:** medical necessity, documentation integrity.

---

## 4) Success Metrics
### Recording
- Consent completion rate (opt-in) by setting.
- Time-to-note reduction (clinician self-report; later objective).
- Zero incidents of recording retained unintentionally (measured by quarantine count and resolution time).
- “Trust score” from patients (short survey).

### Deep Analysis
- Clinician adoption: % notes where Considerations panel viewed.
- False positive rate (clinician marks as not relevant).
- Detection lift: missing elements reduced (pre/post).
- Retrospective QA: fewer denials/adverse documentation findings (later).

---

## 5) Functional Requirements — Recording

### 5.1 Recording modes
- Default mode: **Audio-only**
- States: OFF / ON
- Controls during session: Start / Pause / Resume / Stop

### 5.2 Consent requirements
A recording session MUST NOT start unless:
- Patient state/location captured (for recorded session)
- Consent form status: Signed today OR signed on file
- Verbal reconfirmation checkbox is checked (org configurable as WARN vs BLOCK)
- Third-party audible risk is addressed:
  - No / Yes / Unknown
  - If Yes or Unknown, require “All parties consented” checkbox or block per policy

### 5.3 Jurisdiction/Consent Engine
**Engine output:** ALLOW / WARN / BLOCK + reason codes  
**Policy file:** local JSON `recording_policy.json` (counsel-configurable)

**Conservative defaults:**
- BLOCK if patient state unknown
- BLOCK if consent missing
- WARN if third-party unknown
- BLOCK if third-party yes and not consented

**Audit:** record decision snapshot (no PHI).

### 5.4 Storage requirements
- Recording audio stored encrypted on device.
- Store as encrypted chunks (streaming safe).
- Never write plaintext audio to disk.
- Provide quarantine location (encrypted) for failure cases.

### 5.5 Destruction (default behavior)
- Trigger: `NoteFinalized` event (or explicit “Generate Note” completion)
- Method: **Key shredding** (per-asset CEK deletion) + optional blob delete
- Must produce Destruction Certificate.

### 5.6 Failure handling (critical)
If destruction fails:
- Move asset to encrypted quarantine
- Block new recordings until resolved (org configurable)
- Show “Action Required” banner:
  - Retry destroy
  - Destroy now
  - View details (no PHI)

---

## 6) Functional Requirements — Deep Analysis (Structured-only)

### 6.1 Inputs
Only structured extractions and metadata:
- Symptoms (with severity, temporal qualifiers if available)
- Interventions (taxonomy)
- Risk/compliance flags (SI/HI presence, mandated reporting considerations, telehealth privacy)
- Plan items and follow-up
- Measures (PHQ-9/GAD-7 etc. if used)
- Consent/recording attestations
- Session modality/location tags

### 6.2 Core capabilities
#### A) Alternative considerations (differential support)
- Output format: “Consider evaluating X” + “Why” + “Suggested next step”
- Must cite evidence fields and time window (“in last 4 sessions…”).
- Must include confidence level (low/med/high) and disclaimer.

#### B) Inconsistency detection
Examples:
- Risk tags present but risk level missing
- Telehealth modality but patient state missing
- Dx changed without documented rationale tag
- Interventions claimed but no related plan/homework progression tags

#### C) Trajectory summaries
- Symptom trends: stable/improving/worsening by domain
- Treatment response: which interventions correlate with change
- Adherence: missed sessions, no follow-up plan, etc.

### 6.3 Clinician interaction model
Each item supports:
- Accept / Reject / Defer
- “Add to note” (optional)
- “Mute rule” (with duration)
- “Explain why” (optional feedback)

### 6.4 Latency and UX
- Debounce extraction and detectors to avoid UI jitter.
- Detectors <150ms target.
- Hypothesis ranking <300ms target.
- Optional LLM phrasing runs async and must not block typing.

### 6.5 Optional LLM usage (strict contract)
If used:
- LLM receives JSON-only evidence schema.
- No raw transcript or free text.
- Output must be short rationale text, never new facts.
- Schema validation hard-fails if raw text appears.

---

## 7) Security and Privacy Requirements (Applies to both)
- No network egress of PHI.
- Support bundles must be **PHI-impossible**.
- Audit artifacts must be PHI-minimal (timestamps, decisions, hashes, counts).
- On-device encryption at rest for vault and any recording assets.
- Clear separation: clinical content vs process proofs.

---

## 8) UX Requirements (Screens)
### 8.1 Prepare Step (Pre-session)
**New card: “On-Device Recording”**
- Toggle OFF/ON
- Patient state field
- Consent status selector
- Verbal reconfirm checkbox
- Third-party audible risk selector + “All parties consented”
- Engine decision display (ALLOW/WARN/BLOCK)
- “Learn more” opens patient-friendly summary

### 8.2 Capture Step (In-session)
- Prominent indicator: “Recording to device”
- Pause/Stop button visible at all times
- One-click “Pause phrase” helper (optional): suggests clinician script

### 8.3 Draft/Defend Step (Post-session)
- Button: Generate Note
- After generation: show destruction status
- Considerations panel (deep analysis): collapsible, grouped by category

### 8.4 Certificates / Logs
- “Destruction Certificate” view (no PHI)
- “Recording Compliance Log” view (policy decisions, outcomes)

---

## 9) Data Model / Storage
### 9.1 Tables / Collections
- `recording_assets` (encrypted blob refs only)
- `recording_sessions` (attestations + policy decision snapshot)
- `destruction_certificates` (PHI-minimal proof)
- `patient_feature_store` (structured timeline features)
- `analysis_findings` (items + evidence pointers + clinician actions)

### 9.2 Evidence pointers
Every analysis output includes:
- `evidence_fields[]`
- `source_session_ids[]`
- `rule_ids[]` or `model_feature_ids[]`

No narrative content stored solely for explanation.

---

## 10) Implementation Plan (Milestones)
### M0 — Stability hardening (1–2 weeks)
- Preserve existing P0 fixes (no fabricated SI; strict gating).
- Unit tests for safety gating and intervention taxonomy mapping.
- Finish INSTALL/Quick Start (no ellipses; provider readiness panel).

### M1 — Recording MVP (2–4 weeks)
- PrepareStep gate + policy engine
- Recorder + encrypted chunk storage
- Destruction certificate + quarantine mode
- Audit log updates
- Feature flags: `recordingEnabled`

### M2 — Structured Deep Analysis v1 (3–6 weeks)
- Feature store + inconsistency detectors + missing doc checks
- Considerations panel UI
- Accept/reject feedback capture
- Feature flag: `structuredDeepAnalysisEnabled`

### M3 — Deep Analysis v2 + optional LLM phrasing (4–8 weeks)
- Optional on-device model for explanation text
- Similarity retrieval via embeddings over structured summaries
- Sensitivity controls and per-rule tuning UI

### M4 — Compliance expansion (ongoing)
- Organization-specific policy packs
- Supervisor mode consent enhancements
- Export-proofing for recording artifacts

---

## 11) QA and Acceptance Testing
### Recording
- Cannot record without signed consent + state captured.
- Decision outputs ALLOW/WARN/BLOCK match policy cases.
- No plaintext audio on disk (assert via tests).
- Destruction certificate produced on success.
- Failure causes quarantine + visible banner.

### Deep Analysis
- All findings include evidence pointers.
- No output references nonexistent fields.
- Clinician accept/reject actions persist.
- Performance: typing remains responsive.

### Security
- Support bundle contains no PHI.
- Offline operation validated (router unplug test).
- Egress attempts blocked/absent in runtime.

---

## 12) Open Questions (for counsel/clinical governance)
- Recording consent requirements by jurisdiction for your target markets.
- Whether retained audio is ever part of the record under your policies.
- Standard retention schedules and legal hold behavior.
- Patient access request implications for recordings (if retained).

---

## 13) Appendix — Developer Backlog Import
See bundle file: `08_DEV_TICKETS.csv`
