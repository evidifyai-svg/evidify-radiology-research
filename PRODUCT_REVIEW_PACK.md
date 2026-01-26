# Evidify Product Review Pack

**Version:** 4.0.0  
**Date:** January 7, 2026  
**Classification:** Confidential - For Expert Review  
**Prepared for:** Technical & Clinical Advisory Panel

---

## Executive Summary

Evidify is a **local-first clinical documentation platform** designed for mental health professionals. All PHI processing occurs on-device with zero cloud transmission, addressing the core tension between AI-powered efficiency and HIPAA compliance.

### Core Value Proposition

| Problem | Evidify Solution |
|---------|------------------|
| AI scribes require cloud → HIPAA risk | 100% local LLM processing (Ollama) |
| Documentation takes 15+ min/note | Voice capture + AI structuring → 5-7 min |
| Risk items missed → liability exposure | Real-time detection + mandatory attestation |
| Enterprise IT blocks cloud AI tools | Offline-first, MDM-deployable, no egress |

### Key Differentiators

1. **Only AI scribe infosec can approve day one** - No PHI network egress, verifiable claims
2. **Defensibility built-in** - Attestation workflow, audit trails, not bolted-on
3. **Real clinical value from AI** - PHI in prompts (locally), not sanitized summaries

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Security Model](#2-security-model)
3. [Feature Specifications](#3-feature-specifications)
4. [AI/ML Components](#4-aiml-components)
5. [Clinical Workflow](#5-clinical-workflow)
6. [Compliance Posture](#6-compliance-posture)
7. [Technical Stack](#7-technical-stack)
8. [Data Model](#8-data-model)
9. [API Reference](#9-api-reference)
10. [Deployment Model](#10-deployment-model)
11. [Roadmap](#11-roadmap)
12. [Open Questions for Review](#12-open-questions-for-review)

---

## 1. Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLINICIAN'S DEVICE                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Evidify Application                       │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │   │
│  │  │   React     │    │    Rust     │    │   SQLCipher     │  │   │
│  │  │  Frontend   │◄──►│   Backend   │◄──►│   Vault (AES)   │  │   │
│  │  │  (WebView)  │    │   (Tauri)   │    │   [Encrypted]   │  │   │
│  │  └─────────────┘    └──────┬──────┘    └─────────────────┘  │   │
│  │         │                  │                                 │   │
│  │         │ CSP: connect-src │ localhost:11434 ONLY            │   │
│  │         │ 'self' (no ext)  │                                 │   │
│  │         ▼                  ▼                                 │   │
│  │  ┌─────────────┐    ┌─────────────┐                         │   │
│  │  │   No Net    │    │   Ollama    │ ◄── Local LLM           │   │
│  │  │   Access    │    │  (7B-13B)   │     (User installs)     │   │
│  │  └─────────────┘    └─────────────┘                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    OS Keychain                               │   │
│  │         [Wrapped Vault Key] [Salt] [Settings]                │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

                              │
              ════════════════╪════════════════  NETWORK BOUNDARY
                              │
                              ▼
              ┌───────────────────────────────┐
              │   updates.evidify.com         │  ← Optional, non-PHI
              │   (version check only)        │    (disable-able)
              └───────────────────────────────┘
```

### Trust Boundaries

| Boundary | What Crosses | Controls |
|----------|--------------|----------|
| WebView → Rust | Commands, note content | Tauri IPC, typed commands |
| Rust → SQLCipher | All vault data | AES-256 encryption |
| Rust → Ollama | Prompts with PHI | localhost only, model allowlist |
| Rust → Network | Version string only | Domain allowlist, enterprise can disable |
| App → OS Keychain | Wrapped keys, salt | OS-native secure storage |

---

## 2. Security Model

### 2.1 Encryption Architecture

```
User Passphrase
      │
      ▼ Argon2id (m=64MB, t=3, p=4)
      │
      ▼
    KEK (Key Encryption Key) ──── [Memory only, cleared on lock]
      │
      │ Decrypt
      ▼
┌─────────────────────────────────────┐
│ Wrapped Vault Key                   │
│ (Stored in OS Keychain)             │
│ = AES-256-GCM(KEK, VaultKey)        │
└─────────────────────────────────────┘
      │
      │ Unwrap
      ▼
    Vault Key ──── [Memory only, cleared on lock]
      │
      ▼
    SQLCipher Database (AES-256-CBC)
```

**Critical Property:** Passphrase required every session. OS keychain stores only the wrapped (encrypted) vault key.

### 2.2 Network Posture

| Mode | External Network | Use Case |
|------|------------------|----------|
| **Enterprise Mode** | NONE (localhost only) | Hospital/enterprise deployment |
| **Default Mode** | updates.evidify.com only | Solo/small practice |

**Verification:**
```bash
# Enterprise Mode test
lsof -i -P | grep evidify
# Expected: ONLY localhost:11434 (Ollama)

# Default Mode test  
tcpdump -i any host updates.evidify.com
# Expected: GET /version, no identifiers, no PHI
```

### 2.3 PHI Data Flow

| Location | PHI Present? | Protection |
|----------|--------------|------------|
| SQLCipher vault | Yes | AES-256, passphrase-derived key |
| Ollama prompts | Yes | localhost only, not logged |
| Ollama responses | Yes | localhost only, not logged |
| Audit logs | **No** | Detection IDs only, no content |
| Support bundles | **No** | Counts only, no paths |
| Network | **No** | Zero PHI egress |

### 2.4 Ollama Security Boundary

**Trust Model:** Same-trust-zone (no authentication)

We explicitly do NOT authenticate Ollama because:
1. No standard auth protocol exists for local Ollama
2. If attacker has local code execution, they have many other vectors
3. Adding fake auth would be security theater

**Hardening (Customer Responsibility):**
- Run Ollama in `--network=none` container
- Firewall rules blocking Ollama external access
- Model hash verification (product-enforced)

### 2.5 Audit Log Design

**PHI-Impossible by Design:**

```sql
CREATE TABLE audit_log (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    sequence INTEGER NOT NULL,
    event_type TEXT NOT NULL,       -- Enum, not arbitrary
    resource_type TEXT NOT NULL,    -- Enum, not arbitrary
    resource_id TEXT NOT NULL,      -- UUID only
    outcome TEXT NOT NULL,          -- success/failure/blocked
    detection_ids TEXT,             -- Pattern IDs, not evidence
    path_class TEXT,                -- safe/cloud/network/removable
    path_hash TEXT,                 -- SHA-256(salt||path), not reversible
    previous_hash TEXT NOT NULL,    -- Hash chain
    entry_hash TEXT NOT NULL
);
```

**What is NEVER logged:**
- Note content
- Client names
- Full file paths (PHI risk: `/Patients/Jane_Doe/`)
- Ollama prompts/responses
- Detection evidence text

---

## 3. Feature Specifications

### 3.1 Voice Scribe

**Purpose:** Hands-free note capture during or after sessions

| Specification | Value |
|---------------|-------|
| Speech-to-text engine | Whisper.cpp (local) |
| Model size | base.en (~150MB) or small.en (~500MB) |
| Latency | <2s for 30s audio |
| Accuracy target | >95% medical term recognition |
| Languages | English (multilingual models available) |

**Workflow:**
1. Clinician taps mic → recording starts
2. Audio processed locally in 500ms chunks
3. Transcript appears in real-time
4. Risk phrases trigger immediate alert (vibrate/banner)
5. "Structure Note" sends transcript to LLM
6. Structured SOAP/format appears for review

**Risk Detection During Transcription:**
- Lightweight classifier runs on each segment
- Phrases like "don't want to live" trigger alert
- Clinician can address immediately, not after session

### 3.2 AI Note Structuring

**Purpose:** Convert raw clinical notes to structured format

| Input | Output |
|-------|--------|
| Free-form session notes | SOAP, Intake, Crisis, etc. format |
| Voice transcript | Structured clinical documentation |
| Multiple notes | 4Ps formulation, clinical summary |

**Prompt Design Principles:**
1. Preserve clinician's original language
2. Only extract explicitly stated information
3. Mark inferred content with [Inferred] tag
4. "Not documented" for missing sections
5. No added interpretations

**Example Transform:**
```
Input: "pt seems more anxious today, talked about work stress. 
        not sleeping well. mentioned having some dark thoughts 
        last week but says she's fine now."

Output:
SUBJECTIVE:
- Patient reports increased anxiety
- Work-related stress identified as stressor
- Sleep disturbance reported
- ⚠️ Passive suicidal ideation reported ("dark thoughts") - 
  patient reports resolution [Requires Attestation]

OBJECTIVE:
- Not documented

ASSESSMENT:
- [Inferred] Anxiety exacerbation with work stressor
- Sleep disturbance
- Suicidal ideation - passive, reportedly resolved

PLAN:
- Not documented
```

### 3.3 Ethics Detection Engine

**Purpose:** Surface risk content requiring clinical attention

| Category | Severity | Example Patterns |
|----------|----------|------------------|
| Suicidal Ideation | Critical | "want to die", "no reason to live" |
| Homicidal Ideation | Critical | "want to hurt", "kill them" |
| Self-Harm | High | "cutting", "burning myself" |
| Child Abuse | Critical | "hitting the child", "inappropriate touching" |
| Elder Abuse | Critical | "taking their money", "leaving them alone" |
| Substance Use | Medium | "using again", "relapsed" |
| Clinical Risk | Varies | Medication issues, non-compliance |

**Detection Approach:**
- Offset-based matching (start/end positions)
- Evidence reconstructed on-demand from source text
- No evidence stored in database (PHI risk)
- Pattern library extensible

### 3.4 Attestation Workflow

**Purpose:** Ensure clinical acknowledgment of flagged content

**Quick-Pick Options:**
| Response | Requires Note | Available For |
|----------|---------------|---------------|
| Addressed in Note | No | All |
| Safety Plan Completed | No | SI/SH only |
| Duty to Warn Assessed | Yes | HI only |
| Mandated Report Filed | Yes | Abuse only |
| Not Clinically Relevant | Yes | Non-critical only |
| Will Address Next Session | No | All |
| Consulted Supervisor | Yes | All |

**Workflow:**
1. Detections grouped by category/severity
2. Critical items displayed first with red border
3. Quick-pick buttons for common responses
4. Batch attestation for multiple similar items
5. Cannot sign note until all critical items attested
6. Attestation summary included in signed note

### 3.5 Semantic Search (RAG)

**Purpose:** Find and query across historical notes

| Feature | Description |
|---------|-------------|
| **Find Similar** | Vector search for related content |
| **Ask Question** | RAG query with source citations |
| **Filter by Client** | Scope search to specific client |
| **Citation Required** | Every answer cites [Session YYYY-MM-DD] |

**Embedding Model:** all-MiniLM-L6-v2 (384 dimensions, ~90MB)

**RAG Prompt Design:**
- Only use context from retrieved chunks
- Cite specific session dates
- Use hedged language ("Notes indicate...")
- Say "Not found" if no relevant context

### 3.6 Metrics Dashboard

**Purpose:** Track time savings, efficiency, defensibility (ProvenNote data)

| Metric | Calculation | Target |
|--------|-------------|--------|
| Time Saved | Baseline (15 min) - Actual | >50% |
| AI Acceptance Rate | 1 - (edits / AI output) | >80% |
| Voice Capture Rate | Voice notes / Total notes | >30% |
| Attestation Compliance | Attested / Required | 100% |
| Critical Items Addressed | Critical attested / Critical detected | 100% |

**Report Generation:**
- Headline numbers for sales/demos
- Time analysis breakdown
- AI adoption metrics
- Defensibility score
- Trend charts (daily over period)

---

## 4. AI/ML Components

### 4.1 Model Stack

| Component | Model | Size | Purpose |
|-----------|-------|------|---------|
| Note Structuring | Qwen2.5-7B / Mistral-7B | 4-8GB | Transform notes to format |
| Embeddings | all-MiniLM-L6-v2 | 90MB | Vector search |
| Speech-to-Text | Whisper base.en | 150MB | Voice transcription |
| Risk Detection | Regex + small classifier | <1MB | Real-time alerts |

### 4.2 Model Allowlist

Only pre-approved models can execute:

```rust
const ALLOWED_MODELS: &[&str] = &[
    "qwen2.5:7b-instruct",
    "qwen2.5:7b",
    "gemma2:9b-it",
    "llama3.2:3b",
    "mistral:7b",
    "mistral:7b-instruct",
];
```

Model hashes verified before inference.

### 4.3 EvidifyGPT (Planned)

**Purpose:** Fine-tuned model for clinical documentation

| Aspect | Specification |
|--------|---------------|
| Base Model | Mistral-7B or Llama-2-7B |
| Training Method | QLoRA (efficient fine-tuning) |
| Training Data | 10K+ synthetic clinical notes |
| Format | GGUF (4-bit quantized) |
| Target | 20% error reduction vs base |

**Training Data Sources:**
1. Synthetic notes from GPT-4 (expert-reviewed)
2. Public clinical vignettes
3. De-identified beta tester examples (with consent)

---

## 5. Clinical Workflow

### 5.1 Session Documentation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CAPTURE   │────►│   REVIEW    │────►│    SIGN     │
│             │     │             │     │             │
│ • Voice     │     │ • Detections│     │ • Attest    │
│ • Type      │     │ • Edit note │     │ • Signature │
│ • AI assist │     │ • Structure │     │ • Export    │
└─────────────┘     └─────────────┘     └─────────────┘
     │                    │                    │
     ▼                    ▼                    ▼
  2-3 min             1-2 min              30 sec
```

**Total Target:** 5-7 minutes vs 15+ minute industry baseline

### 5.2 Risk Handling Flow

```
Detection Triggered
        │
        ▼
┌───────────────────┐
│ Severity Check    │
└───────┬───────────┘
        │
   ┌────┴────┐
   │         │
Critical   Other
   │         │
   ▼         ▼
┌─────────┐ ┌─────────┐
│ MUST    │ │ SHOULD  │
│ Attest  │ │ Review  │
└────┬────┘ └────┬────┘
     │           │
     ▼           ▼
┌─────────────────────┐
│ Quick-Pick Response │
│ + Optional Note     │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│ Audit Log Entry     │
│ (Detection ID only) │
└─────────────────────┘
```

### 5.3 Formulation Generation

For treatment planning and case conceptualization:

| Type | Output | Use Case |
|------|--------|----------|
| 4Ps | Predisposing, Precipitating, Perpetuating, Protective factors | Case formulation |
| Summary | Course of treatment, current status | Transfer of care |
| Risk Narrative | Risk/protective factors over time | Risk documentation |

All citations include `[Session YYYY-MM-DD]` format.

---

## 6. Compliance Posture

### 6.1 HIPAA Alignment

| Safeguard | Implementation |
|-----------|----------------|
| **Access Control** | Passphrase required each session |
| **Audit Controls** | Hash-chained, tamper-evident logs |
| **Integrity Controls** | Content hashing, version tracking |
| **Transmission Security** | N/A - no PHI transmission |
| **Encryption** | AES-256 at rest (SQLCipher) |

### 6.2 What We Provide vs. Claim

| Artifact | Status | Notes |
|----------|--------|-------|
| HIPAA control mapping | ✓ Provided | Documented alignment |
| SOC 2 Type II certification | **No** | No servers to audit |
| SOC 2-aligned control pack | ✓ Provided | Evidence documentation |
| Penetration test | ✓ Annual | Third-party assessment |
| SBOM | ✓ Each release | SPDX 2.3 format |
| Code signing | ✓ Provided | Apple + Microsoft |
| BAA | ✓ Available | For enterprise contracts |

### 6.3 Claims Ledger

Every external claim has verification:

| Claim | Test Procedure | Invalidated By |
|-------|----------------|----------------|
| No PHI network egress | Network capture during use | Custom integrations |
| Passphrase required each session | Close app → reopen | N/A (hardcoded) |
| Audit chain integrity | `evidify --verify-audit` | Manual tampering (detected) |
| No full paths in audit | Export, grep for "/" | N/A (hardcoded) |
| Ollama prompts not logged | grep storage for test PHI | N/A (hardcoded) |

---

## 7. Technical Stack

### 7.1 Core Technologies

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Tauri 1.5 | Secure, small footprint, Rust backend |
| Backend | Rust | Memory safety, no GC pauses |
| Frontend | React + TypeScript | Type safety, modern UI |
| Database | SQLCipher | SQLite + AES-256 encryption |
| LLM Runtime | Ollama | Local-first, model flexibility |
| Styling | Tailwind CSS | Rapid development |

### 7.2 Dependencies (Key)

**Rust Backend:**
```toml
tauri = "1.5"
rusqlite = { features = ["bundled-sqlcipher"] }
argon2 = "0.5"
aes-gcm = "0.10"
reqwest = { features = ["json"] }
tokio = { features = ["full"] }
```

**Frontend:**
```json
"@tauri-apps/api": "^1.5.0",
"react": "^18.2.0",
"lucide-react": "^0.263.1"
```

### 7.3 System Requirements

| Platform | Minimum | Recommended |
|----------|---------|-------------|
| macOS | 12.0+ (Intel/Apple Silicon) | 14.0+ with M1/M2 |
| Windows | 10 (64-bit) | 11 with 16GB RAM |
| RAM | 8GB | 16GB (for larger models) |
| Storage | 2GB + models | SSD recommended |
| Ollama | Required | 7B model minimum |

---

## 8. Data Model

### 8.1 Core Entities

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Client    │───┐   │    Note     │───┐   │  Detection  │
│             │   │   │             │   │   │  (Runtime)  │
│ id          │   │   │ id          │   │   │             │
│ display_name│   └──►│ client_id   │   │   │ id          │
│ status      │       │ session_date│   └──►│ pattern_id  │
│ session_cnt │       │ note_type   │       │ category    │
└─────────────┘       │ raw_input   │       │ severity    │
                      │ structured  │       │ offsets     │
                      │ content_hash│       └─────────────┘
                      │ attestations│
                      │ signed_at   │       ┌─────────────┐
                      └─────────────┘       │ Attestation │
                                            │             │
                                            │ detection_id│
                                            │ response    │
                                            │ note        │
                                            │ timestamp   │
                                            └─────────────┘
```

### 8.2 Storage

| Table | Purpose | Encrypted |
|-------|---------|-----------|
| clients | Client pseudonyms | ✓ (SQLCipher) |
| notes | Session documentation | ✓ (SQLCipher) |
| embeddings | Vector search index | ✓ (SQLCipher) |
| audit_log | Tamper-evident trail | ✓ (SQLCipher) |
| session_metrics | Usage analytics | ✓ (SQLCipher) |
| settings | App configuration | ✓ (SQLCipher) |

---

## 9. API Reference

### 9.1 Command Categories

| Category | Commands | Count |
|----------|----------|-------|
| Vault | create, unlock, lock, status | 4 |
| Client | create, list, get, update | 4 |
| Note | create, get, list, update, sign, export | 6 |
| Ethics | analyze, resolve | 2 |
| AI | check_ollama, structure_note, embed, search | 4 |
| Voice | list_models, transcribe, voice_to_note | 4 |
| RAG | index, search_semantic, rag_query, stats, reindex | 5 |
| Attestation | quick_picks, consolidate, validate, check, stats | 5 |
| Metrics | record, dashboard, report | 3 |
| Audit | get_log, verify_chain | 2 |
| Export | classify_path | 1 |

**Total: 40 API endpoints**

### 9.2 Example: Note Creation Flow

```typescript
// 1. Create note
const note = await createNote(clientId, date, 'progress', content);

// 2. Analyze for ethics issues
const analysis = await analyzeEthics(content);

// 3. If detections, get quick picks
if (analysis.attest_count > 0) {
  const picks = await getQuickPicks(detection.category, detection.severity);
}

// 4. Process attestations
await validateAttestation(detection, response, note);

// 5. Check completion
const result = await checkAttestationCompleteness(detections, attestations);

// 6. Sign note
if (result.can_sign) {
  await signNote(noteId, JSON.stringify(attestations));
}

// 7. Record metrics
await recordSessionMetrics(sessionMetrics);
```

---

## 10. Deployment Model

### 10.1 Edition Matrix

| Feature | Solo | Group | Enterprise |
|---------|------|-------|------------|
| AI structuring | ✓ | ✓ | ✓ |
| Voice scribe | ✓ | ✓ | ✓ |
| RAG search | ✓ | ✓ | ✓ |
| Attestation workflow | ✓ | ✓ | ✓ |
| Metrics dashboard | ✓ | ✓ | ✓ |
| Admin console | — | ✓ | ✓ |
| MDM deployment | — | — | ✓ |
| SSO integration | — | — | ✓ |
| SIEM export | — | — | ✓ |
| Custom policies | — | — | ✓ |

### 10.2 Enterprise Policy Controls

```json
{
  "export": {
    "allow_cloud": false,
    "allow_network": false,
    "allow_removable": false
  },
  "security": {
    "session_timeout_minutes": 30,
    "min_passphrase_length": 12,
    "enterprise_mode": true
  },
  "ai": {
    "model_allowlist": ["qwen2.5:7b-instruct"],
    "require_attestation": true
  }
}
```

### 10.3 MDM Deployment

Tested with:
- Jamf Pro (macOS)
- Microsoft Intune (Windows)
- Mosyle (macOS)

Configuration profiles push settings, silent install, managed updates.

---

## 11. Roadmap

### 11.1 Current State (v4.0)

| Component | Status |
|-----------|--------|
| Core vault + encryption | ✅ Production |
| Ethics detection | ✅ Production |
| AI structuring | ✅ Production |
| Voice scribe | ⚡ Module ready, needs Whisper integration |
| RAG search | ⚡ Module ready, needs ONNX integration |
| Attestation UI | ✅ Production |
| Metrics dashboard | ✅ Production |

### 11.2 90-Day Plan

| Sprint | Days | Focus |
|--------|------|-------|
| 1 | 0-14 | Whisper + ONNX production integration |
| 2 | 15-30 | Code signing, SBOM, pen test prep |
| 3 | 31-45 | EvidifyGPT v0.1 fine-tuning |
| 4 | 46-60 | SSO POC, MDM testing |
| 5 | 61-75 | Pilot deployments (5-10 users) |
| 6 | 76-90 | v1.0 release prep |

### 11.3 Future Roadmap

| Quarter | Features |
|---------|----------|
| Q2 2026 | FHIR export, multi-language, supervisor mode |
| Q3 2026 | HSM integration, mobile companion app |
| Q4 2026 | Collaboration features, custom model marketplace |

---

## 12. Open Questions for Review

### Technical Review Needed

1. **Ollama Trust Model:** Is same-trust-zone acceptable, or should we embed inference directly?

2. **CSP unsafe-inline:** We use `style-src 'unsafe-inline'` for Tailwind. Acceptable with documented compensating controls?

3. **Embedding Model:** all-MiniLM-L6-v2 vs clinical-specific embedding model (if exists)?

4. **Whisper Model Size:** base.en (150MB, faster) vs small.en (500MB, more accurate)?

### Clinical Review Needed

5. **Detection Patterns:** Are the current risk categories comprehensive? Missing any?

6. **Attestation Options:** Are quick-pick responses clinically appropriate? Missing any?

7. **AI Output Trust:** What validation should clinicians do on AI-structured notes?

8. **Formulation Quality:** Is LLM-generated 4Ps/summary acceptable for clinical use?

### Business Review Needed

9. **Pricing Model:** Solo/Group/Enterprise tiers appropriate?

10. **Pilot Strategy:** Start with individual practitioners or group practices?

11. **BAA Positioning:** Required or optional for local-only processing?

---

## Appendices

### A. File Manifest

```
evidify-v9/
├── SPEC-v4.md              # Security specification (single source of truth)
├── SPRINT_BACKLOG.md       # 90-day development plan
├── ROADMAP.md              # Feature roadmap
├── README.md               # Build instructions
├── src-tauri/
│   └── src/
│       ├── ai.rs           # LLM integration
│       ├── attestation.rs  # Attestation workflow
│       ├── audit.rs        # Hash-chained logging
│       ├── commands.rs     # API handlers
│       ├── crypto.rs       # Encryption
│       ├── ethics.rs       # Detection engine
│       ├── export.rs       # Path classification
│       ├── main.rs         # Entry point
│       ├── metrics.rs      # Usage analytics
│       ├── models.rs       # Data structures
│       ├── rag.rs          # Vector search
│       ├── vault.rs        # Encrypted storage
│       └── voice.rs        # Speech-to-text
└── frontend/
    └── src/
        ├── App.tsx         # UI components
        └── lib/tauri.ts    # API bindings
```

### B. Security Questionnaire (Common Questions)

| Question | Answer |
|----------|--------|
| Where is PHI stored? | Locally on user device in SQLCipher encrypted database |
| Is PHI transmitted? | No. All processing local. |
| Encryption at rest? | AES-256 via SQLCipher |
| Encryption in transit? | N/A - no PHI transit |
| Key management? | Argon2id derivation, wrapped keys in OS keychain |
| Access controls? | Passphrase required each session |
| Audit logging? | Hash-chained, PHI-impossible logs |
| Vulnerability management? | Documented process with patch SLAs |
| Penetration testing? | Annual third-party assessment |
| SOC 2? | SOC 2-aligned controls provided; not certified (no servers) |

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 4.0.0 | 2026-01-07 | Evidify Team | Initial expert review pack |

---

*This document is confidential and intended for expert panel review only.*
