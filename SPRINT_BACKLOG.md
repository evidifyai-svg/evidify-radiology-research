# Evidify 90-Day Sprint Backlog

**Version:** 4.0.0  
**Sprint Start:** Week 1  
**Target:** Production-Ready v1.0

---

## Related Backlogs (UI + Stability)

- UI stability + module unification backlog: `docs/EVIDIFY_UI_STABILITY_BACKLOG_v4.3.1.md`
- Smoke test scaffold (fast sanity checks): `verification/run-smoke-tests.cjs`

**Note:** UI/UX work must respect the defensibility-critical "Do Not Touch" boundaries documented in the UI stability backlog.


## Sprint Overview

| Sprint | Days | Theme | Key Deliverables |
|--------|------|-------|------------------|
| 1 | 0-14 | Foundation | Voice + RAG integration, attestation UI |
| 2 | 15-30 | Security Hardening | Pen test, SBOM, signed builds |
| 3 | 31-45 | AI Refinement | EvidifyGPT v0.1, model optimization |
| 4 | 46-60 | Enterprise | SSO POC, MDM testing, policy engine |
| 5 | 61-75 | Pilot Alpha | Real clinic deployment, feedback |
| 6 | 76-90 | Polish & Launch | Bug fixes, docs, v1.0 release |

---

## Sprint 1: Foundation (Days 0-14)

### EVID-001: Whisper Integration
**Priority:** P0  
**Estimate:** 5 days  
**Owner:** TBD

**Description:**  
Integrate whisper-rs for real-time local speech-to-text.

**Acceptance Criteria:**
- [ ] `whisper-rs = "0.11"` added to Cargo.toml
- [ ] Model download script for ggml-base.en.bin (~150MB)
- [ ] Transcription latency <2s for 30s audio on M1 Mac
- [ ] Medical term accuracy >95% on test corpus
- [ ] Real-time streaming (partial results every 500ms)
- [ ] Risk phrase detection during transcription

**Technical Notes:**
```rust
// Replace stub in voice.rs with:
let ctx = whisper_rs::WhisperContext::new(&model_path)?;
let mut state = ctx.create_state()?;
state.full(params, audio)?;
```

**Test Cases:**
1. Transcribe "patient reports suicidal ideation" → detect risk
2. Transcribe medical jargon (SSRI, CBT, GAD-7) → correct terms
3. Transcribe with background noise → graceful degradation

---

### EVID-002: ONNX Embedding Integration
**Priority:** P0  
**Estimate:** 3 days  
**Owner:** TBD

**Description:**  
Replace pseudo-embeddings with real ONNX model inference.

**Acceptance Criteria:**
- [ ] `ort = "2.0"` added to Cargo.toml
- [ ] Bundle `all-MiniLM-L6-v2.onnx` (~90MB)
- [ ] Embedding generation <50ms per chunk
- [ ] Cosine similarity correlates with semantic meaning
- [ ] Batch embedding support for indexing

**Technical Notes:**
```rust
// Replace stub in rag.rs with:
let session = Session::builder()?.with_model_from_file("model.onnx")?;
let outputs = session.run(inputs)?;
```

**Test Cases:**
1. "patient feels anxious" similar to "client reports anxiety"
2. "medication compliance" dissimilar to "family history"
3. Index 100 notes in <10 seconds

---

### EVID-003: Web Audio Capture
**Priority:** P0  
**Estimate:** 3 days  
**Owner:** TBD

**Description:**  
Implement browser audio capture for voice scribe.

**Acceptance Criteria:**
- [ ] Request microphone permission gracefully
- [ ] Capture at 16kHz mono (or resample)
- [ ] Stream audio chunks to backend via Tauri events
- [ ] Handle permission denied gracefully
- [ ] Visual feedback (waveform or level meter)
- [ ] Auto-stop after 5 minutes of silence

**Technical Notes:**
```typescript
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const context = new AudioContext({ sampleRate: 16000 });
// Process and send to backend
```

---

### EVID-004: Attestation UI Component
**Priority:** P0  
**Estimate:** 4 days  
**Owner:** TBD

**Description:**  
Build attestation workflow UI with quick-picks and batch processing.

**Acceptance Criteria:**
- [ ] Detection groups displayed by category/severity
- [ ] Quick-pick buttons with single-click attestation
- [ ] Batch attestation for grouped items
- [ ] Note input for responses requiring explanation
- [ ] Progress indicator (3/5 attested)
- [ ] Cannot proceed until all critical items attested
- [ ] Undo last attestation button

**UI Mockup:**
```
┌─────────────────────────────────────────┐
│ ⚠️ Suicidal Ideation (2 items)    CRITICAL │
│ ─────────────────────────────────────── │
│ "...mentioned dark thoughts..."         │
│ "...doesn't want to live..."           │
│                                         │
│ [Safety Plan ✓] [Addressed] [Supervisor]│
│                                         │
│ 📝 Note: ___________________________    │
└─────────────────────────────────────────┘
```

---

### EVID-005: Keyboard Shortcuts
**Priority:** P2  
**Estimate:** 1 day  
**Owner:** TBD

**Description:**  
Add keyboard shortcuts for power users.

**Acceptance Criteria:**
- [ ] `Cmd+Enter` to submit/generate
- [ ] `Cmd+S` to sign note
- [ ] `Cmd+Shift+V` to toggle voice
- [ ] `Cmd+K` to open search
- [ ] `Escape` to cancel/close modals
- [ ] Shortcuts visible in UI tooltips

---

## Sprint 2: Security Hardening (Days 15-30)

### EVID-006: Code Signing Setup
**Priority:** P0  
**Estimate:** 3 days  
**Owner:** TBD

**Description:**  
Configure Apple notarization and Windows Authenticode.

**Acceptance Criteria:**
- [ ] Apple Developer ID certificate obtained
- [ ] `tauri.conf.json` configured for notarization
- [ ] Windows EV code signing certificate obtained
- [ ] CI/CD pipeline signs all release builds
- [ ] `codesign -v` passes on macOS
- [ ] `signtool verify` passes on Windows

**Technical Notes:**
```json
// tauri.conf.json
"macOS": {
  "signingIdentity": "Developer ID Application: Evidify Inc",
  "entitlements": "./entitlements.plist"
}
```

---

### EVID-007: SBOM Generation
**Priority:** P0  
**Estimate:** 2 days  
**Owner:** TBD

**Description:**  
Generate Software Bill of Materials for each release.

**Acceptance Criteria:**
- [ ] SPDX 2.3 format SBOM
- [ ] Includes all Rust crates with versions
- [ ] Includes all npm packages with versions
- [ ] Includes bundled AI models with hashes
- [ ] CI generates SBOM on each release
- [ ] SBOM accessible via `--sbom` flag

**Technical Notes:**
```bash
cargo sbom --format spdx > sbom.spdx.json
npm sbom --format spdx >> sbom.spdx.json
```

---

### EVID-008: Penetration Test Prep
**Priority:** P0  
**Estimate:** 5 days  
**Owner:** TBD

**Description:**  
Prepare for third-party penetration test.

**Acceptance Criteria:**
- [ ] Threat model document complete
- [ ] Attack surface inventory
- [ ] Test environment provisioned
- [ ] Scope document for pen test firm
- [ ] Pre-test self-assessment with OWASP checklist
- [ ] Remediation sprint planned post-test

**Deliverables:**
1. `THREAT_MODEL.md` - Attack vectors and mitigations
2. `ATTACK_SURFACE.md` - All entry points
3. Test credentials and environment access

---

### EVID-009: Network Egress Tests
**Priority:** P0  
**Estimate:** 2 days  
**Owner:** TBD

**Description:**  
Automated tests verifying network claims.

**Acceptance Criteria:**
- [ ] CI test: no DNS queries in Enterprise Mode
- [ ] CI test: only updates.evidify.com in Default Mode
- [ ] CI test: WebView cannot fetch external URLs
- [ ] CI test: Ollama calls only to localhost
- [ ] Network capture artifacts saved for audit

**Technical Notes:**
```bash
# Test script
tcpdump -w capture.pcap &
./evidify --enterprise-mode &
# Perform operations
# Analyze capture for violations
```

---

### EVID-010: Audit Log Export
**Priority:** P1  
**Estimate:** 2 days  
**Owner:** TBD

**Description:**  
Export audit logs for compliance review.

**Acceptance Criteria:**
- [ ] Export to JSON format
- [ ] Export to CSV format
- [ ] Filter by date range
- [ ] Filter by event type
- [ ] Include verification hashes
- [ ] CLI command: `evidify --export-audit`

---

## Sprint 3: AI Refinement (Days 31-45)

### EVID-011: EvidifyGPT v0.1 Training
**Priority:** P1  
**Estimate:** 10 days  
**Owner:** TBD

**Description:**  
Fine-tune base model on clinical documentation.

**Acceptance Criteria:**
- [ ] Training dataset: 10K+ synthetic clinical notes
- [ ] Base model: Mistral-7B or Llama-2-7B
- [ ] QLoRA fine-tuning for efficiency
- [ ] Quantized to GGUF format (4-bit)
- [ ] 20% error reduction vs base model
- [ ] Model hash in allowlist

**Training Data Sources:**
1. Synthetic notes from GPT-4 (with clinical expert review)
2. Publicly available clinical vignettes
3. De-identified examples from beta testers (with consent)

**Evaluation Metrics:**
- SOAP formatting accuracy
- Medical term recognition
- Factual consistency with input
- Hallucination rate

---

### EVID-012: Model Performance Optimization
**Priority:** P1  
**Estimate:** 5 days  
**Owner:** TBD

**Description:**  
Optimize inference speed for production.

**Acceptance Criteria:**
- [ ] First token latency <500ms on M1 Mac
- [ ] Generation speed >20 tokens/sec
- [ ] Memory usage <4GB for 7B model
- [ ] CPU fallback works (slower but functional)
- [ ] Batch inference for formulations

**Optimizations:**
1. Flash attention if available
2. KV cache optimization
3. Speculative decoding exploration
4. Model quantization comparison (Q4 vs Q5)

---

### EVID-013: Prompt Template Library
**Priority:** P1  
**Estimate:** 3 days  
**Owner:** TBD

**Description:**  
Curated prompt templates for different note types.

**Acceptance Criteria:**
- [ ] SOAP progress note template
- [ ] Intake assessment template
- [ ] Crisis note template
- [ ] Termination summary template
- [ ] 4Ps formulation template
- [ ] Risk assessment template
- [ ] Templates stored in vault settings

**Template Structure:**
```
{
  "id": "soap-progress",
  "name": "SOAP Progress Note",
  "system_prompt": "...",
  "user_template": "...",
  "output_format": "..."
}
```

---

## Sprint 4: Enterprise (Days 46-60)

### EVID-014: SSO Integration POC
**Priority:** P1  
**Estimate:** 8 days  
**Owner:** TBD

**Description:**  
Proof of concept for Active Directory SSO.

**Acceptance Criteria:**
- [ ] Kerberos authentication on Windows domain
- [ ] LDAP group membership retrieval
- [ ] Offline credential caching (24hr)
- [ ] Graceful fallback to passphrase
- [ ] Session timeout based on AD policy
- [ ] Demo with test AD environment

**Technical Notes:**
```rust
// Windows: use negotiate crate for Kerberos
// macOS: use security-framework for Kerberos
// Fallback: OAuth2 with local token storage
```

---

### EVID-015: MDM Deployment Testing
**Priority:** P1  
**Estimate:** 5 days  
**Owner:** TBD

**Description:**  
Test deployment via major MDM platforms.

**Acceptance Criteria:**
- [ ] Jamf Pro deployment tested (macOS)
- [ ] Microsoft Intune deployment tested (Windows)
- [ ] Configuration profile applied correctly
- [ ] Silent installation works
- [ ] Update mechanism works via MDM
- [ ] Documentation for IT admins

**Test Matrix:**
| Platform | MDM | Config | Update |
|----------|-----|--------|--------|
| macOS 14 | Jamf | ✓ | ✓ |
| Windows 11 | Intune | ✓ | ✓ |
| macOS 14 | Mosyle | ✓ | ✓ |

---

### EVID-016: Policy Engine Enhancement
**Priority:** P1  
**Estimate:** 5 days  
**Owner:** TBD

**Description:**  
Expand enterprise policy controls.

**Acceptance Criteria:**
- [ ] Export destination whitelist
- [ ] Clipboard policy (allow/warn/block)
- [ ] Session timeout (configurable)
- [ ] Passphrase complexity requirements
- [ ] Model allowlist enforcement
- [ ] Policy violation logging

**Policy Schema:**
```json
{
  "export": {
    "allow_cloud": false,
    "allow_network": false,
    "allow_removable": false,
    "whitelist_paths": ["/approved/export/path"]
  },
  "security": {
    "session_timeout_minutes": 30,
    "min_passphrase_length": 12,
    "require_uppercase": true
  }
}
```

---

## Sprint 5: Pilot Alpha (Days 61-75)

### EVID-017: Pilot Site 1 Deployment
**Priority:** P0  
**Estimate:** 5 days  
**Owner:** TBD

**Description:**  
Deploy to first pilot site (5-10 clinicians).

**Acceptance Criteria:**
- [ ] Site identified and agreement signed
- [ ] Installation on pilot devices
- [ ] Training session conducted
- [ ] Support channel established (Slack/email)
- [ ] Feedback collection mechanism
- [ ] Daily check-ins for first week

**Success Metrics:**
- 80% of notes completed in app
- <5 critical bugs reported
- NPS score >30

---

### EVID-018: Metrics Dashboard
**Priority:** P1  
**Estimate:** 5 days  
**Owner:** TBD

**Description:**  
Internal dashboard for pilot monitoring.

**Acceptance Criteria:**
- [ ] Notes created per day (aggregate, no PHI)
- [ ] Average time-to-complete
- [ ] Attestation patterns
- [ ] Error rates
- [ ] Feature usage (voice, RAG, AI)
- [ ] No PHI in dashboard data

**Metrics Schema:**
```sql
-- Anonymized metrics table (separate DB)
CREATE TABLE metrics (
  id TEXT PRIMARY KEY,
  timestamp INTEGER,
  event_type TEXT,
  duration_ms INTEGER,
  success BOOLEAN
);
```

---

### EVID-019: Feedback Sprint
**Priority:** P0  
**Estimate:** 5 days  
**Owner:** TBD

**Description:**  
Rapid iteration based on pilot feedback.

**Acceptance Criteria:**
- [ ] All P0 bugs fixed within 48 hours
- [ ] Top 3 UX complaints addressed
- [ ] Performance issues resolved
- [ ] Updated build deployed to pilots
- [ ] Feedback summary document

---

## Sprint 6: Polish & Launch (Days 76-90)

### EVID-020: Documentation Complete
**Priority:** P0  
**Estimate:** 5 days  
**Owner:** TBD

**Description:**  
Complete all user and admin documentation.

**Acceptance Criteria:**
- [ ] User Guide (PDF, 20+ pages)
- [ ] Admin Guide (MDM, SSO, policies)
- [ ] Security Whitepaper
- [ ] API Reference (for integrations)
- [ ] Quick Start video (5 min)
- [ ] FAQ document

---

### EVID-021: v1.0 Release Prep
**Priority:** P0  
**Estimate:** 5 days  
**Owner:** TBD

**Description:**  
Finalize v1.0 release.

**Acceptance Criteria:**
- [ ] All P0/P1 bugs closed
- [ ] Performance benchmarks documented
- [ ] Release notes written
- [ ] Marketing website updated
- [ ] Press kit prepared
- [ ] Support team trained

**Release Checklist:**
- [ ] Code freeze
- [ ] Final QA pass
- [ ] Security review sign-off
- [ ] Legal review sign-off
- [ ] Build and sign release
- [ ] Upload to distribution channels
- [ ] Announce to waitlist

---

### EVID-022: Post-Launch Monitoring
**Priority:** P0  
**Estimate:** Ongoing  
**Owner:** TBD

**Description:**  
Monitor production after v1.0 launch.

**Acceptance Criteria:**
- [ ] Error tracking enabled
- [ ] Performance monitoring active
- [ ] Support ticket triage process
- [ ] Hotfix deployment process
- [ ] Weekly metrics review
- [ ] Monthly security review

---

## Backlog (Future Sprints)

### EVID-100: FHIR Export
EHR integration via FHIR JSON export.

### EVID-101: Multi-Language Support
Spanish dictation and note generation.

### EVID-102: Supervisor Mode
Review workflow for supervisees.

### EVID-103: HSM Integration
Hardware security module for key storage.

### EVID-104: Collaboration Features
Shared templates and note handoffs.

### EVID-105: Mobile Companion
Read-only mobile app for note review.

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Whisper accuracy insufficient | Medium | High | Test multiple models, fallback to typing |
| Pilot sites drop out | Low | High | Over-recruit, offer incentives |
| Security vuln discovered | Medium | Critical | Rapid response plan, bug bounty |
| LLM hallucination issues | Medium | High | Strict prompts, validation layer |
| App Store rejection | Low | Medium | Pre-review with Apple, comply early |

---

## Definition of Done

A ticket is "Done" when:
1. Code complete and reviewed
2. Unit tests passing
3. Integration tests passing
4. Documentation updated
5. Deployed to staging
6. QA verified
7. Product owner accepted

---

*Last Updated: January 7, 2026*
