# Evidify v4 - Product Specification

**Version:** 4.0.0  
**Date:** January 7, 2026  
**Status:** Procurement-Ready (Contradictions Resolved)

---

## Document Purpose

This is the **single source of truth** for Evidify's security architecture, compliance posture, and technical claims. Every claim in this document has:
- A test procedure
- A proving artifact
- Configuration conditions that invalidate it

---

## 1. Executive Summary

Evidify is a local-first clinical documentation platform. All PHI processing occurs on-device. 

**Core Security Properties:**
| Property | Implementation | How to Verify |
|----------|----------------|---------------|
| No PHI network egress | CSP + Rust allowlist | Network capture shows no PHI destinations |
| Encrypted at rest | SQLCipher AES-256 | Database file unreadable without passphrase |
| Passphrase per session | Wrapped key model | Close app → reopen → passphrase prompt |
| Tamper-evident audit | Hash-chained logs | Verification tool confirms chain |

---

## 2. Network Architecture

### 2.1 Network-Capable Components Matrix

| Component | Technology | Allowed Destinations | Contains PHI? | Test Procedure |
|-----------|------------|---------------------|---------------|----------------|
| WebView (React UI) | Tauri WebView | **None** (connect-src 'self') | Renders PHI | Attempt fetch() to any URL → blocked |
| Rust Backend - AI | reqwest HTTP | localhost:11434 only | Yes (prompts) | Attempt non-localhost → blocked |
| Rust Backend - Updates | reqwest HTTP | updates.evidify.com only | No | Verify TLS to only this domain |
| Ollama Service | External process | **User responsibility** | Yes (receives prompts) | Not controlled by Evidify |

### 2.2 Network Modes

**Enterprise Mode (Fully Offline):**
```
All external connections disabled.
- Update checks: DISABLED
- WebView: connect-src 'self' (no external)
- Rust allowlist: ["localhost:11434"] only
- Verification: `lsof -i -P | grep evidify` shows ONLY localhost
```

**Default Mode (Updates Enabled):**
```
Limited non-PHI egress for updates only.
- Update checks: ENABLED to updates.evidify.com
- Payload: version string only, no device ID, no PHI
- WebView: still connect-src 'self' (no external)
- Rust allowlist: ["localhost:11434", "updates.evidify.com:443"]
- Verification: `lsof -i -P | grep evidify` shows localhost + updates domain
```

### 2.3 Network Verification Test Cases

**Test Case 1: Enterprise Mode**
```bash
# 1. Enable Enterprise Mode (MDM or config)
# 2. Launch app, perform typical operations
# 3. Monitor network:
sudo lsof -i -P | grep -i evidify
# Expected: ONLY localhost:11434 connections (or none if Ollama not running)
# Fail condition: ANY external IP or domain
```

**Test Case 2: Default Mode with Updates**
```bash
# 1. Use default config (updates enabled)
# 2. Launch app, trigger update check
# 3. Monitor network:
sudo tcpdump -i any host updates.evidify.com -w update_capture.pcap
# 4. Inspect payload:
tshark -r update_capture.pcap -T fields -e http.request.uri
# Expected: GET /version or similar, no query params with identifiers
# Fail condition: Any PHI, device ID, or user identifier in payload
```

**Test Case 3: WebView Isolation**
```javascript
// In browser dev tools (if accessible):
fetch('https://example.com').then(r => console.log(r)).catch(e => console.log('BLOCKED:', e));
// Expected: Network error (blocked by CSP)
// Fail condition: Successful response
```

### 2.4 CSP Configuration

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
connect-src 'self';
img-src 'self' data:;
font-src 'self';
frame-src 'none';
object-src 'none';
```

**Regarding `style-src 'unsafe-inline'`:**

This is required for Tailwind CSS runtime and React component styling. We acknowledge this is not ideal.

**Compensating Controls:**
1. `script-src 'self'` - No remote scripts, no eval()
2. `connect-src 'self'` - No external network from WebView
3. `frame-src 'none'` - No iframes
4. No user-controlled HTML/CSS injection - all content is application-generated
5. No dynamic style generation from user input

**Engineering Backlog Item:** Remove `unsafe-inline` via CSS extraction and nonce-based loading (tracked as SECURITY-101).

---

## 3. Ollama Security Boundary

### 3.1 Trust Model (DEFINITIVE - No Contradictions)

**Ollama is treated as same-trust-zone.**

We do NOT authenticate the Ollama service. There is no `/api/verify` endpoint, no mutual auth token, no custom handshake. The security boundary is the host operating system.

**What this means:**
- Any process on localhost:11434 could impersonate Ollama
- A malicious local process could intercept prompts containing PHI
- We trust the OS to isolate processes appropriately

**Why this is acceptable:**
- If an attacker has local code execution, they have many other attack vectors
- Ollama is user-installed and user-controlled
- Adding fake auth would be security theater

### 3.2 Hardening Recommendations (Customer Responsibility)

| Hardening | How | Who Implements |
|-----------|-----|----------------|
| Network isolation | `docker run --network=none ollama/ollama` | Customer IT |
| Firewall block | Block Ollama from external network | Customer IT |
| Process isolation | Run Ollama in sandbox/container | Customer IT |
| Model verification | We verify model hashes in allowlist | Evidify (product) |

### 3.3 PHI-in-LLM Containment

Since Ollama receives PHI in prompts, we enforce:

| Requirement | Implementation | Verification |
|-------------|----------------|--------------|
| No prompt logging | Prompts not written to any file/DB | Grep all storage for test PHI phrases |
| No response logging | Responses not written to any file/DB | Same |
| No Ollama telemetry | User must configure `OLLAMA_NOPRUNE=1` etc. | Documentation only (user responsibility) |
| Model allowlist | Only known-hash models execute | Attempt unknown model → rejected |

**Code enforcement (ai.rs):**
```rust
// We log ONLY: model name, request ID, token count, timestamp
// We NEVER log: prompt content, response content
log::info!("AI request: model={}, tokens={}", model, token_count);
// PROHIBITED: log::info!("Prompt: {}", prompt);
```

---

## 4. Encryption & Key Management

### 4.1 Key Hierarchy

```
User Passphrase
      │
      ▼ Argon2id (m=64MB, t=3, p=4)
      │
      ▼
    KEK (Key Encryption Key) ──── [In memory only, cleared on lock]
      │
      │ Decrypt
      ▼
┌─────────────────────────────────────┐
│ Wrapped Vault Key                   │
│ (Stored in OS Keychain)             │
│ = AES-256-GCM(KEK, VaultKey)       │
└─────────────────────────────────────┘
      │
      │ Unwrap (requires KEK)
      ▼
    Vault Key ──── [In memory only, cleared on lock]
      │
      ▼
    SQLCipher Database (AES-256)
```

**Critical Property:** Passphrase is REQUIRED every session. The OS keychain stores only the wrapped (encrypted) vault key, which is useless without the passphrase-derived KEK.

### 4.2 Verification

```bash
# Test: Close app completely, reopen
# Expected: Passphrase prompt appears
# Fail condition: App opens without passphrase
```

---

## 5. Audit Logging

### 5.1 Canonical Audit Schema (Single Source of Truth)

```sql
CREATE TABLE audit_log (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    sequence INTEGER NOT NULL,
    event_type TEXT NOT NULL,        -- Enum value, not arbitrary string
    resource_type TEXT NOT NULL,     -- Enum value
    resource_id TEXT NOT NULL,       -- UUID only, never content
    outcome TEXT NOT NULL,           -- success/failure/blocked
    
    -- For ethics detections: IDs only
    detection_ids TEXT,              -- JSON array of detection IDs
    
    -- For exports: classification + hash, never full path
    path_class TEXT,                 -- safe/cloud_sync/network_share/removable/unknown
    path_hash TEXT,                  -- SHA-256(salt || canonical_path)
    
    -- Hash chain
    previous_hash TEXT NOT NULL,
    entry_hash TEXT NOT NULL
);
```

### 5.2 What Is Logged vs Not Logged

| Data Type | Logged? | Format |
|-----------|---------|--------|
| Event type | ✓ Yes | Enum value |
| Resource ID | ✓ Yes | UUID only |
| Timestamp | ✓ Yes | Unix milliseconds |
| Detection IDs | ✓ Yes | Array of pattern IDs |
| Export path class | ✓ Yes | Enum (safe/cloud/network/removable) |
| Export path hash | ✓ Yes | SHA-256 with per-vault salt |
| **Note content** | ✗ No | Never |
| **Client names** | ✗ No | Never |
| **Full file paths** | ✗ No | PHI risk (e.g., "/Patients/Jane_Doe/") |
| **Detection evidence** | ✗ No | Reconstructed on demand |
| **Ollama prompts** | ✗ No | Never |
| **Ollama responses** | ✗ No | Never |
| **Search queries** | ✗ No | Never |

### 5.3 Path Hashing Strategy

Full file paths are PHI risk (e.g., `/Users/drsmith/Patients/Jane_Doe_DOB_1985/session_notes.pdf`).

Instead, we store:
```rust
// Generate per-vault salt on vault creation
let path_salt: [u8; 16] = random();  // Stored in vault settings

// When logging an export:
let canonical = fs::canonicalize(path)?;  // Resolve symlinks
let path_hash = sha256(path_salt || canonical.as_bytes());
let path_class = classify_path(&canonical);  // safe/cloud/network/removable

// Log entry contains:
// - path_class: "cloud_sync"
// - path_hash: "a1b2c3d4..." (not reversible without salt + brute force)
```

---

## 6. Crash & Diagnostic Hygiene

### 6.1 Product-Controlled Defaults

| Control | Default | Configurable? |
|---------|---------|---------------|
| Automatic crash upload | **Disabled** | No (hardcoded off) |
| Memory dumps in support bundles | **Never included** | No |
| PHI in panic messages | **Sanitized** | No |
| Error messages to user | **Generic** (no PHI) | No |

### 6.2 Customer/MDM-Controlled Settings

| Control | Recommendation | Implementation |
|---------|----------------|----------------|
| OS crash reporter | Disable for Evidify process | MDM profile / GPO |
| Core dumps | Disable or encrypt | OS configuration |
| Diagnostic data collection | Opt-out | OS settings |

**macOS MDM Profile (Customer Deploys):**
```xml
<dict>
    <key>com.apple.CrashReporter</key>
    <dict>
        <key>DialogType</key>
        <string>none</string>
    </dict>
</dict>
```

**Windows GPO (Customer Deploys):**
```
Computer Configuration > Administrative Templates > Windows Components > 
Windows Error Reporting > Disable Windows Error Reporting
```

**Important:** Evidify does NOT modify system-wide crash settings. These are customer-controlled hardening recommendations.

### 6.3 Support Bundle Contents (PHI-Impossible)

```json
{
  "bundle_version": "1.0",
  "app_version": "4.0.0",
  "os": "macOS 14.2",
  "error_type": "VaultError",
  "error_message": "Failed to open database",  // Sanitized, no paths/PHI
  "vault_stats": {
    "client_count": 47,      // Counts only
    "note_count": 312
  },
  "recent_events": [         // Event types only
    "VaultUnlocked",
    "NoteCreated",
    "AiAnalysisRun"
  ],
  "config_hash": "abc123"    // Hash of config, not config content
}
```

**What is NEVER in support bundles:**
- Note content
- Client names
- File paths
- Ollama prompts/responses
- Memory dumps
- Stack traces with variable values

---

## 7. Compliance & Assurance

### 7.1 Assurance Pack (What We Actually Provide)

| Artifact | Status | Description |
|----------|--------|-------------|
| SBOM | ✓ Provided | SPDX 2.3 for each release |
| Code signing | ✓ Provided | Apple notarization, Microsoft Authenticode |
| Vulnerability process | ✓ Provided | Disclosure policy, patch SLAs |
| Penetration test | ✓ Annual | Third-party assessment |
| Control mapping | ✓ Provided | SOC 2 / HIPAA alignment document |

### 7.2 What We Do NOT Claim

| Claim | Status | Explanation |
|-------|--------|-------------|
| SOC 2 Type II certified | **No** | No server infrastructure to audit |
| HIPAA certified | **No** | No such certification exists |
| "HIPAA compliant" | **No** | We say "designed for HIPAA workflows" |
| FedRAMP | **No** | No cloud service |

### 7.3 BAA Posture

- Evidify servers never receive PHI
- BAA offered for enterprise customers who require it contractually
- BAA scope: support interactions, update distribution (neither involves PHI)
- Legal determination: BAA may not be legally required, but offered for compliance programs

---

## 8. Claims Ledger

Every external claim must have: (a) test procedure, (b) proving artifact, (c) invalidating configuration.

| Claim | Test Procedure | Proving Artifact | Invalidated By |
|-------|----------------|------------------|----------------|
| "No PHI network egress" | Network capture during use | tcpdump/Wireshark showing only allowed destinations | Enabling custom integrations that transmit PHI |
| "Passphrase required each session" | Close app, reopen | UI screenshot showing passphrase prompt | N/A (hardcoded behavior) |
| "Audit chain integrity" | Run `evidify --verify-audit` | Verification tool output | Manual database tampering (detected) |
| "Export blocks cloud sync" | Attempt save to Dropbox in Enterprise Mode | Error dialog screenshot | Disabling Enterprise Mode |
| "Signed binary" | `codesign -v` (macOS) / signtool (Windows) | Signature verification output | Using unsigned dev build |
| "No full paths in audit" | Export audit log, grep for path separators | Audit export showing only hashes | N/A (hardcoded behavior) |
| "Ollama prompts not logged" | grep all storage for test PHI phrase | No matches found | N/A (hardcoded behavior) |

---

## 9. Enterprise Deployment

### 9.1 MDM Configuration Keys

```xml
<!-- macOS Configuration Profile -->
<dict>
    <key>com.evidify.app</key>
    <dict>
        <key>EnterpriseMode</key>
        <true/>                          <!-- Disables all external network -->
        <key>SessionTimeoutMinutes</key>
        <integer>30</integer>
        <key>MinPassphraseLength</key>
        <integer>12</integer>
        <key>ExportPolicy</key>
        <string>BlockUnsafe</string>     <!-- Block cloud/network/removable -->
        <key>AllowClipboard</key>
        <true/>
    </dict>
</dict>
```

### 9.2 Policy Enforcement

| Policy | Solo Mode | Enterprise Mode |
|--------|-----------|-----------------|
| Export to cloud sync | Warn | **Block** |
| Export to network share | Warn | **Block** |
| Export to removable | Allow | **Block** |
| Session timeout | 30 min (configurable) | Admin-enforced |
| Passphrase complexity | User choice | Admin-enforced minimum |
| Update checks | Enabled | **Disabled** |

---

## 10. Appendix: Security Questionnaire Responses

| Question | Response |
|----------|----------|
| Where is PHI stored? | Locally on user device in SQLCipher encrypted database |
| Is PHI transmitted? | No. All processing local. |
| Encryption at rest? | AES-256 via SQLCipher |
| Encryption in transit? | N/A - no PHI transit |
| Key management? | Argon2id derivation, wrapped keys in OS keychain |
| Access controls? | Passphrase required each session |
| Audit logging? | Hash-chained, PHI-impossible logs |
| Vulnerability management? | Documented process with patch SLAs |
| Incident response? | Documented IR plan |
| Penetration testing? | Annual third-party assessment |
| SOC 2? | SOC 2-aligned controls provided; **not certified** (no servers) |
| HIPAA? | Designed for HIPAA workflows; BAA available |

---

*Specification v4 - Single Source of Truth*  
*All contradictions from v3 resolved*  
*Last updated: January 7, 2026*
