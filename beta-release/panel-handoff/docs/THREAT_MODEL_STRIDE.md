# Evidify Forensic Threat Model (STRIDE-Lite)

**Version:** 1.0  
**Date:** 2026-01-12  
**Classification:** Internal

---

## 1. System Overview

### Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER WORKSTATION                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Evidify   │────▶│   SQLite    │     │   Ollama    │       │
│  │   App       │     │   (Local)   │     │   (Local)   │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │  Evidence   │     │   Audit     │     │   Model     │       │
│  │  Files      │     │   Log       │     │   Files     │       │
│  │  (Local)    │     │   (Local)   │     │   (Local)   │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Export Package                            ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       ││
│  │  │canonical/│ │  audit/  │ │ verify/  │ │evidence/ │       ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  External Party  │
                    │  (Court/Counsel) │
                    └─────────────────┘
```

### Trust Boundaries

1. **TB1:** User workstation boundary (local machine)
2. **TB2:** Export package boundary (leaves machine)
3. **TB3:** Ollama process boundary (separate process)

### Data Classification

| Data | Classification | Location |
|------|----------------|----------|
| Evidence files | PHI / Confidential | Local only |
| Case database | PHI / Confidential | Local only |
| Audit log | PHI-Adjacent | Local + Export |
| Gate report (canon) | PHI-Safe | Export |
| Gate report (meta) | Non-sensitive | Export |
| Ollama model | Public | Local |

---

## 2. STRIDE Analysis

### S - Spoofing

| Threat ID | Threat | Component | Risk | Mitigation | Status |
|-----------|--------|-----------|------|------------|--------|
| S1 | Attacker impersonates user | App login | Medium | OS-level auth (macOS Keychain, Windows Credential Manager) | Planned |
| S2 | Attacker spoofs Ollama | Local API | Low | Localhost-only binding, no remote access | Implemented |
| S3 | Forged export appears legitimate | Export package | High | Canonical hash verification, audit chain | Implemented |
| S4 | Attacker modifies export in transit | Export transfer | Medium | Hash verification at recipient | Implemented |

**Key controls:**
- Canonical hash allows recipient to verify export integrity
- Audit chain provides tamper-evident event history
- No network authentication needed (local-first)

---

### T - Tampering

| Threat ID | Threat | Component | Risk | Mitigation | Status |
|-----------|--------|-----------|------|------------|--------|
| T1 | Modify case data on disk | SQLite DB | High | File system permissions, optional encryption | Partial |
| T2 | Modify audit log | audit.log | Critical | Chain hash verification | Implemented |
| T3 | Modify export after creation | Export folder | High | Canonical hash, recipient verification | Implemented |
| T4 | Modify evidence files | Evidence store | Medium | SHA-256 hashes in manifest | Implemented |
| T5 | Modify app binary | Application | High | Code signing (macOS/Windows) | Planned |
| T6 | Modify gate rules | Gate engine | Critical | Embedded in signed binary | Planned |

**Key controls:**
- Audit chain: Each event's hash depends on previous, creating tamper-evident chain
- Canonical hash: Self-verifiable via sentinel preimage
- Evidence hashes: Stored at import, verified at export
- Negative fixtures: Test suite includes tamper detection tests

**Gaps:**
- Database encryption not yet implemented (relies on file permissions)
- Code signing planned but not yet in beta builds

---

### R - Repudiation

| Threat ID | Threat | Component | Risk | Mitigation | Status |
|-----------|--------|-----------|------|------------|--------|
| R1 | User denies creating opinion | Audit log | High | Timestamped OPINION_DRAFTED event | Implemented |
| R2 | User denies approving AI content | Audit log | Critical | HUMAN_REVIEW event with action | Implemented |
| R3 | User claims export was modified | Export package | High | Canonical hash + audit chain | Implemented |
| R4 | Claim evidence was different at evaluation | Evidence store | Medium | Evidence hash at import | Implemented |

**Key controls:**
- Comprehensive audit logging of all user actions
- Chain hash provides non-repudiation of event sequence
- Evidence hashes at import time

**Forensic use case:**
When questioned about methodology, evaluator can produce:
1. Audit log showing each step taken
2. Evidence hashes proving documents used
3. AI review attestations proving human oversight
4. Gate report proving defensibility checks passed

---

### I - Information Disclosure

| Threat ID | Threat | Component | Risk | Mitigation | Status |
|-----------|--------|-----------|------|------------|--------|
| I1 | Unauthorized access to case data | SQLite DB | High | OS file permissions, optional encryption | Partial |
| I2 | Data leaked via AI model | Ollama | Critical | Local model only, no cloud API | Implemented |
| I3 | Export contains unintended data | Export package | Medium | Explicit file inclusion, PHI classification | Implemented |
| I4 | Logs contain PHI | Log files | Medium | Log redaction before export | Implemented |
| I5 | Network exfiltration | App network | Critical | Network isolation (Ollama localhost only) | Implemented |
| I6 | Crash dumps contain PHI | Error reports | Medium | No automatic crash reporting | Implemented |

**Key controls:**
- **Local-first:** All data stays on user's machine
- **No cloud:** Ollama runs locally, no external AI API calls
- **Network isolation:** App only connects to localhost:11434 (Ollama)
- **PHI classification:** Export manifest marks PHI-containing files
- **Log redaction:** Technical logs stripped of case content

**"Network Silence" Verification:**
Users can verify no network egress by:
1. Running with network disabled (after Ollama model downloaded)
2. Using network monitor (Little Snitch, Wireshark)
3. Checking app doesn't request network permissions

---

### D - Denial of Service

| Threat ID | Threat | Component | Risk | Mitigation | Status |
|-----------|--------|-----------|------|------------|--------|
| D1 | Large file exhausts memory | Evidence import | Medium | Streaming import, size limits | Partial |
| D2 | Malformed PDF crashes app | PDF parser | Medium | Sandboxed parsing, error handling | Implemented |
| D3 | Ollama unavailable | AI features | Low | Graceful degradation, manual workflow | Implemented |
| D4 | Disk full during export | Export | Medium | Pre-flight check, atomic writes | Planned |
| D5 | Database corruption | SQLite | High | WAL mode, periodic backup | Partial |

**Key controls:**
- AI features are optional; core workflow works without Ollama
- PDF parsing uses robust library with error handling
- SQLite in WAL mode for crash recovery

**Gaps:**
- Large file handling needs stress testing (BIG-001 pack helps)
- Automatic backup not yet implemented

---

### E - Elevation of Privilege

| Threat ID | Threat | Component | Risk | Mitigation | Status |
|-----------|--------|-----------|------|------------|--------|
| E1 | App runs with elevated privileges | Application | Low | Runs as user, no admin required | Implemented |
| E2 | Malicious plugin executes code | Plugin system | N/A | No plugin system | N/A |
| E3 | Ollama prompt injection | AI | Medium | Output validation, human review required | Implemented |
| E4 | Malicious evidence file exploits parser | PDF/image libs | Medium | Sandboxed parsing, updated libs | Partial |

**Key controls:**
- No plugin system (reduces attack surface)
- No admin privileges required
- Human review required for all AI output
- Dependencies kept updated

---

## 3. Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                           EVIDIFY APP                                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐                                                     │
│  │   USER      │                                                     │
│  │   INPUT     │                                                     │
│  └──────┬──────┘                                                     │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐           │
│  │  Evidence   │────▶│  Annotation │────▶│   Claim     │           │
│  │  Import     │     │   Engine    │     │   Store     │           │
│  └─────────────┘     └─────────────┘     └──────┬──────┘           │
│         │                                        │                   │
│         ▼                                        ▼                   │
│  ┌─────────────┐                         ┌─────────────┐           │
│  │  Evidence   │                         │   Opinion   │           │
│  │  Store      │◀────────────────────────│   Engine    │           │
│  │  (SHA-256)  │                         │             │           │
│  └─────────────┘                         └──────┬──────┘           │
│                                                  │                   │
│                    ┌─────────────────────────────┘                   │
│                    │                                                 │
│                    ▼                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Ollama    │◀─│     AI      │──│   Human     │                 │
│  │   (Local)   │  │  Generation │  │   Review    │                 │
│  └─────────────┘  └─────────────┘  └──────┬──────┘                 │
│                                            │                         │
│                    ┌───────────────────────┘                         │
│                    │                                                 │
│                    ▼                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Audit     │◀─│    Gate     │──│   Export    │                 │
│  │   Logger    │  │   Engine    │  │   Handler   │                 │
│  └──────┬──────┘  └─────────────┘  └──────┬──────┘                 │
│         │                                  │                         │
│         ▼                                  ▼                         │
│  ┌─────────────┐                   ┌─────────────┐                 │
│  │  audit.log  │                   │   Export    │                 │
│  │  (chained)  │                   │   Package   │                 │
│  └─────────────┘                   └─────────────┘                 │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                              ┌─────────────┐
                              │  Verifier   │
                              │  (External) │
                              └─────────────┘
                                      │
                                      ▼
                              ┌─────────────┐
                              │   Court/    │
                              │   Counsel   │
                              └─────────────┘
```

---

## 4. Key Security Controls Summary

| Control | Threat Addressed | Implementation |
|---------|------------------|----------------|
| Local-first architecture | I2, I5 | No cloud, localhost Ollama |
| Audit chain hashing | T2, R1, R2 | SHA-256 chain per event |
| Canonical hash | T3, S3, S4 | Sentinel-based preimage |
| Evidence hashing | T4, R4 | SHA-256 at import |
| Human review required | E3, R2 | All AI output requires action |
| PHI classification | I3 | Manifest marks sensitive files |
| Log redaction | I4 | Strip case content from logs |
| Gate framework | R3 | 7-gate defensibility checks |

---

## 5. Residual Risks

| Risk | Likelihood | Impact | Mitigation | Acceptance |
|------|------------|--------|------------|------------|
| Local machine compromised | Medium | Critical | OS security, user education | Accept (out of scope) |
| User shares credentials | Low | High | Single-user design | Accept |
| Zero-day in dependencies | Low | High | Dependency updates, sandboxing | Accept with monitoring |
| Physical theft of device | Medium | High | OS encryption (FileVault/BitLocker) | Accept (user responsibility) |

---

## 6. Recommendations

### Immediate (Before Beta)

1. ✅ Implement audit chain verification
2. ✅ Implement canonical hash verification
3. ⏳ Add database encryption option
4. ⏳ Implement code signing

### Near-term (Before GA)

1. Add automatic backup/recovery
2. Implement export encryption option
3. Add network isolation verification tool
4. Security audit by external firm

### Long-term

1. Hardware security module (HSM) support for high-security environments
2. Multi-user/team features with proper access control
3. Secure update mechanism with signature verification

---

*Threat Model v1.0 — STRIDE-Lite analysis for forensic documentation platform*
