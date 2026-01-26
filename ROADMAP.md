# Evidify Version Tiers & Roadmap

## Reference Documents

- **SPEC-v4.md** - Single source of truth for all security claims
- **README.md** - Build instructions

All security claims, network postures, and compliance statements are canonicalized in SPEC-v4.md. Do not create separate security documents.


## Engineering Backlogs & Test Scaffolds

- UI stability + module unification backlog: `docs/EVIDIFY_UI_STABILITY_BACKLOG_v4.3.1.md`
- Smoke test scaffold (fast sanity checks): `verification/run-smoke-tests.cjs`

These items are intended to improve **demo stability** and **cross-module UX** without modifying
defensibility-critical export/canonicalization code paths.

---

## v4 New Features

### Voice Scribe (voice.rs)
Real-time speech-to-text using local Whisper model:
- Offline transcription via whisper-rs (Whisper.cpp)
- Audio capture at 16kHz mono
- Real-time risk phrase detection during transcription
- Voice-to-structured-note pipeline (transcript → LLM → SOAP)
- No audio data leaves device

**Status:** Module complete, requires whisper-rs integration for production

### RAG / Semantic Search (rag.rs)
Local vector search for cross-note queries:
- Local embeddings via all-MiniLM-L6-v2 ONNX model
- Vector storage in SQLCipher vault
- Cosine similarity search
- RAG prompts with citation requirements
- Search across all notes or filter by client

**Status:** Module complete, using deterministic pseudo-embeddings until ONNX integration

### Attestation Workflow (attestation.rs)
Clinical defensibility with quick-pick responses:
- Detection consolidation (group similar items by category/severity)
- Quick-pick response templates with context-aware options
- Batch attestation for efficiency
- Validation rules (critical items can't be dismissed)
- Cryptographic signing with timestamp
- Statistics tracking for compliance reporting

**Status:** Module complete, integrated into ReviewScreen

### Metrics Dashboard (metrics.rs)
Usage analytics for time savings and efficiency tracking (ProvenNote metrics):
- Session metrics recording (timing, word counts, AI usage)
- Dashboard aggregation (time saved, AI adoption, compliance)
- Sales-ready report generation with headline numbers
- No PHI ever recorded - all aggregate/anonymized data

**Key Metrics:**
- Time saved per note vs industry baseline (15 min)
- AI acceptance rate (% of AI output kept)
- Voice capture adoption rate
- Attestation compliance rate
- Critical items addressed rate

**Status:** Module complete, integrated into Dashboard screen

### Frontend Components
- **VoiceScribe component**: Recording UI, real-time transcript display, risk alerts
- **RAGSearch component**: Semantic search + ask questions mode with source citations
- **MetricsDashboard component**: Time savings, AI adoption, defensibility metrics
- **ReviewScreen (enhanced)**: Quick-pick attestations, batch processing, progress tracking
- Integrated into Dashboard (RAG + Metrics) and Capture (Voice) screens

### Sprint Backlog
See `SPRINT_BACKLOG.md` for detailed 90-day plan with 22 tickets across 6 sprints.

---

## Tier 1: Beta Tester (Current Sprint)

**Goal:** Working application for clinical workflow validation  
**Audience:** 3-5 friendly clinicians  
**Security posture:** Honest about limitations, no overclaims

### What's In
- SQLCipher encrypted vault
- Wrapped key model (passphrase per session)
- Ethics detection with attestation workflow
- Local Ollama integration (same-trust-zone, no custom auth)
- Basic export with cloud-sync warnings
- Hash-chained audit logs (detection IDs only)

### What's NOT In (Documented as Known Limitations)
- No auto-updates (manual distribution)
- No code signing (dev builds)
- Ollama treated as same-trust-zone (honest about boundary)
- No enterprise policy enforcement
- No MDM support

### Honest Security Statement (Beta)
```
BETA LIMITATIONS:
- No code signing (development builds)
- Network: localhost:11434 (Ollama) only; no external connections
- Ollama is treated as same-trust-zone (local service)
- Export warnings only, no enforcement
- Not for production PHI without additional controls
```

---

## Tier 2: Production v1.0 (8-Week Target)

**Goal:** Procurement-ready for small/medium practices  
**Audience:** Solo practitioners, small group practices  
**Security posture:** Verifiable claims, honest boundaries

### Fixes from v3 Feedback

| Issue | Fix |
|-------|-----|
| Network inconsistency | Precise statement: "No PHI egress. Optional non-PHI update checks (disable-able)" |
| SOC 2 overclaim | Replace with "SOC 2-aligned control pack" - no claim of certification |
| Ollama auth vapor | Honest: "Same-trust-zone; security boundary is host OS" |
| Crash diagnostic invasive | Move to MDM guidance, not app-enforced |
| CSP unsafe-inline | Document compensating controls |
| Update check ambiguity | "Backend performs updates, not WebView" |
| Full paths in audit | Hash paths, log classification only |

### Corrected Network Statement
```
NETWORK POSTURE (Production v1.0):

PHI Egress: NONE
- No note content, client names, session dates transmitted
- No cloud speech-to-text
- No telemetry with PHI

Non-PHI Egress (Optional, Disable-able):
- Update checks: updates.evidify.com (version number only)
- License validation: license.evidify.com (license key only)

Local Only:
- Ollama: localhost:11434 (user-installed, same-trust-zone)

Enterprise Mode:
- All external connections can be disabled via MDM
- Operates fully offline
```

### Corrected Assurance Statement
```
ASSURANCE PACK (Production v1.0):

What We Provide:
✓ SBOM (SPDX 2.3) for each release
✓ Code-signed binaries (Apple/Microsoft)
✓ Vulnerability disclosure process + patch SLAs
✓ Third-party penetration test (annual)
✓ Secure build documentation
✓ SOC 2-aligned control mapping

What We Do NOT Claim:
✗ SOC 2 Type II certification (no servers to audit)
✗ HIPAA certification (no such thing exists)
✗ "HIPAA compliant" (we say "designed for HIPAA workflows")
```

### Corrected Ollama Boundary Statement
```
LOCAL AI BOUNDARY (Production v1.0):

Ollama is treated as same-trust-zone:
- We do not authenticate Ollama (no custom protocol exists)
- Security boundary is the host operating system
- A malicious process with localhost access could impersonate Ollama

Mitigations:
- Ollama prompts/responses are not logged
- Ollama has no network egress (user responsibility to verify)
- Model hashes verified against known-good list

Enterprise Hardening (Optional):
- Run Ollama in container with network=none
- Use firewall to block Ollama external access
- Deploy via MDM with locked configuration
```

### Corrected Audit Logging
```
AUDIT LOG FIELDS (Production v1.0):

Logged (PHI-impossible):
- Event type (enum)
- Resource type (enum)  
- Resource ID (UUID only)
- Timestamp
- Outcome
- Detection IDs (no evidence text)
- Path classification (safe/cloud/network/removable)
- Path hash (salted SHA-256, not reversible)

NOT Logged:
- Note content
- Client names
- Full file paths (PHI risk: "/Patients/Jane_Doe/...")
- Ollama prompts/responses
- Search queries
```

---

## Tier 3: Enterprise v2.0 (Future)

**Goal:** Pass enterprise procurement with minimal exceptions  
**Audience:** Health systems, large practices, compliance-heavy orgs

### Additional Requirements
- SSO/SAML integration (even for local app - identity verification)
- Role-based access (clinician/supervisor/admin)
- SIEM-compatible audit export
- MDM policy enforcement (not just guidance)
- Hardware key support (YubiKey for vault unlock)
- Formal third-party security assessment
- SOC 2 Type II for any cloud components (if added)

### Ollama Hardening Options (Pick One)
1. **Child process model**: Evidify launches Ollama as subprocess with private socket
2. **Evidify AI proxy**: Local proxy service we control that talks to Ollama
3. **Embedded inference**: Bundle llama.cpp directly (no external service)

---

## Immediate Actions (This Sprint)

### 1. Fix SECURITY.md Contradictions

**Current (Wrong):**
> "BLOCKED: All external network access"
> ...
> "updates.evidify.com: Version check"

**Fixed:**
> "No PHI network egress. Non-PHI update checks to updates.evidify.com (optional, disable-able in enterprise mode)."

### 2. Fix SOC 2 Overclaim

**Current (Wrong):**
> "Formal SOC 2 Type II available on request"

**Fixed:**
> "We provide a SOC 2-aligned control mapping and third-party security assessment. Formal SOC 2 certification is not applicable (no server infrastructure to audit)."

### 3. Fix Ollama Auth Claim

**Current (Wrong):**
> "Mutual authentication token" with custom /api/verify endpoint

**Fixed:**
> "Ollama is treated as same-trust-zone. Security boundary is the host OS. We verify model hashes but do not authenticate the Ollama service itself."

### 4. Remove Invasive Crash Handling

**Current (Wrong):**
> `defaults write com.apple.CrashReporter...` (modifies system settings)

**Fixed:**
> Move to "Enterprise Hardening Guide" as MDM recommendation, not app behavior.

### 5. Fix Audit Path Logging

**Current (Wrong):**
> "all exports logged with full path"

**Fixed:**
> "Exports logged with path classification + salted hash. Full paths not stored (PHI risk)."

---

## Beta Tester Checklist

### Before First Tester:
- [ ] Fix SECURITY.md network statement
- [ ] Fix SOC 2 language
- [ ] Fix Ollama boundary language  
- [ ] Remove system-modifying crash handling
- [ ] Implement path hashing in audit
- [ ] Add "BETA - Known Limitations" section to UI
- [ ] Create simple onboarding doc

### Beta Success Criteria:
- [ ] Can create vault, add client, write note, run ethics check, export
- [ ] Passphrase required on every app launch
- [ ] Cloud sync paths trigger warning
- [ ] Ollama integration works (when installed)
- [ ] App works fully offline (without Ollama = no AI features)

### Beta Feedback Focus:
1. Is the capture → structure → review → sign workflow usable?
2. Are ethics detections helpful or annoying?
3. Is attestation friction acceptable?
4. What's missing for your actual clinical workflow?
5. Any crashes or data issues?

---

## File Changes Required

| File | Change |
|------|--------|
| SECURITY.md | Fix network statement, SOC 2 claim, Ollama boundary |
| SPEC-v3.md | Update to match corrected claims |
| audit.rs | Implement path hashing instead of full paths |
| export.rs | Remove /api/verify fiction; document same-trust-zone |
| ai.rs | Remove OllamaSession::establish() custom auth |
| crypto.rs | Remove crash reporter system modifications |
| README.md | Add "Beta Limitations" section |
