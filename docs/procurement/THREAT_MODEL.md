# Evidify Threat Model Summary

**Version:** 4.1.2-hotfix2-hotfix2  
**Date:** January 8, 2026  
**Methodology:** STRIDE + Attack Trees

---

## Executive Summary

Evidify's local-first architecture eliminates entire categories of threats common to cloud-based healthcare applications (network interception, server compromise, multi-tenant data exposure). The primary threat surface is the clinician's device itself, with the most significant risks being device theft and malware.

**Key architectural security properties:**
1. PHI never traverses networks (local-only)
2. Encryption at rest with passphrase-derived keys
3. No persistent key storage (keys derived each session)
4. Restricted filesystem and network access

---

## Threat Categories (STRIDE)

### S - Spoofing

| Threat | Attack Vector | Mitigation | Residual Risk |
|--------|---------------|------------|---------------|
| Fake Evidify app | Trojanized download | Code signing (future), official distribution | Medium |
| Passphrase phishing | Social engineering | User education; no remote auth | Low |
| Impersonate Ollama | Malicious local service | Loopback-only + port validation | Low |

### T - Tampering

| Threat | Attack Vector | Mitigation | Residual Risk |
|--------|---------------|------------|---------------|
| Modify vault.db | Direct file access | SQLCipher encryption + HMAC | Low (requires passphrase) |
| Alter audit log | Remove evidence | Hash chain verification | Low (tampering detectable) |
| Modify app binary | Replace executable | Code signing (future) | Medium |
| In-memory modification | Debugging/injection | OS protections; no remote access | Low |

### R - Repudiation

| Threat | Attack Vector | Mitigation | Residual Risk |
|--------|---------------|------------|---------------|
| Deny note creation | "I didn't write that" | Hash-chained audit log | Low |
| Deny attestation | "I didn't attest" | Cryptographic signatures | Low |
| Audit log deletion | Remove evidence | Log encrypted in vault | Low |

### I - Information Disclosure

| Threat | Attack Vector | Mitigation | Residual Risk |
|--------|---------------|------------|---------------|
| **Device theft** | Physical access | AES-256 encryption, key zeroization | **Medium** |
| Memory dump | Malware/forensics | Keys zeroized on lock | Low |
| Network interception | MITM | No network PHI transmission | Eliminated |
| Cloud sync exposure | Accidental sync | Export path classification + blocking | Low |
| Clipboard exposure | Copy-paste | Logging (future: timeout clear) | Medium |
| Screenshot | OS-level capture | Cannot prevent; out of scope | Accepted |

### D - Denial of Service

| Threat | Attack Vector | Mitigation | Residual Risk |
|--------|---------------|------------|---------------|
| Vault corruption | Malware/bug | SQLCipher integrity checks | Low |
| Keychain deletion | Malicious app | KeychainLost recovery UX | Low |
| Resource exhaustion | Large notes/AI load | Local resources; user manages | Low |

### E - Elevation of Privilege

| Threat | Attack Vector | Mitigation | Residual Risk |
|--------|---------------|------------|---------------|
| Access other user's data | Multi-user device | Single-vault design; OS user isolation | Low |
| Break out of sandbox | Exploit Tauri/webview | Restricted allowlist, CSP | Low |
| Bypass export controls | Direct file access | Rust-enforced policy | Low |

---

## Top 10 Threats (Prioritized)

### 1. Device Theft (HIGH)

**Attack:** Attacker steals laptop containing vault.db

**Mitigations:**
- AES-256 encryption with Argon2id (64MB, 3 iter)
- No plaintext keys on disk
- Vault key zeroized when app closes/locks

**Residual:** Medium - Strong passphrase required; hardware encryption recommended

**Recommendations for Users:**
- Enable FileVault (macOS) / BitLocker (Windows)
- Use strong passphrase
- Enable screen lock

### 2. Malware/Keylogger (HIGH)

**Attack:** Malware captures passphrase during entry

**Mitigations:**
- Single passphrase entry point
- No remote authentication surface
- Minimal attack surface (local-only)

**Residual:** Medium - User must maintain device security

**Recommendations:**
- Keep OS updated
- Use reputable antivirus
- Avoid untrusted software

### 3. Cloud Sync Leakage (MEDIUM)

**Attack:** Vault.db or exported notes sync to cloud storage

**Mitigations:**
- Export path classification (CloudSync detection)
- Block/warn on cloud-synced destinations
- Vault stored in app-specific directory

**Residual:** Low - Controls in place

### 4. Memory Forensics (MEDIUM)

**Attack:** Memory dump while vault unlocked extracts keys

**Mitigations:**
- Keys zeroized on lock/close
- Minimal key lifetime
- No persistent key storage

**Residual:** Low - Requires sophisticated attack during active session

### 5. Malicious Ollama Model (MEDIUM)

**Attack:** Compromised model exfiltrates data

**Mitigations:**
- Loopback-only enforcement
- User controls model selection
- Model runs locally (no cloud)

**Residual:** Low - Model would need network access to exfiltrate

### 6. Clipboard Exposure (MEDIUM)

**Attack:** Sensitive content copied, left in clipboard

**Mitigations:**
- Clipboard operations logged
- Future: Automatic clipboard timeout

**Residual:** Medium - User behavior dependent

### 7. Shoulder Surfing (MEDIUM)

**Attack:** Attacker observes screen during use

**Mitigations:**
- User responsibility
- Quick lock feature

**Residual:** Medium - Physical security user's responsibility

### 8. Backup Exposure (MEDIUM)

**Attack:** Vault.db in unencrypted backup

**Mitigations:**
- Vault encrypted regardless of backup encryption
- User education on backup security

**Residual:** Low - Vault remains encrypted

### 9. Trojanized App Distribution (LOW)

**Attack:** Fake Evidify download with malware

**Mitigations:**
- Official website only
- Code signing (future)
- Build manifests with git SHA

**Residual:** Low - Signing will address

### 10. Audit Log Tampering (LOW)

**Attack:** Attacker modifies audit log to hide activity

**Mitigations:**
- Hash chain verification
- Log inside encrypted vault
- Verification on every read

**Residual:** Very Low - Tampering is detectable

---

## Attack Trees

### Attack: Access PHI Without Authorization

```
Access PHI Without Authorization
├── Obtain Passphrase
│   ├── Keylogger → MITIGATED (user device security)
│   ├── Social engineering → MITIGATED (user education)
│   ├── Brute force → MITIGATED (Argon2id: 64MB × 3 iter)
│   └── Shoulder surfing → RESIDUAL (physical security)
│
├── Bypass Encryption
│   ├── Cryptographic break → INFEASIBLE (AES-256)
│   ├── Implementation flaw → MITIGATED (SQLCipher audited)
│   └── Side channel → RESIDUAL (sophisticated attack)
│
├── Memory Extraction
│   ├── While unlocked → RESIDUAL (sophisticated attack)
│   └── After lock → MITIGATED (keys zeroized)
│
└── Physical Access
    ├── Steal device → MITIGATED (encryption)
    └── Access unlocked device → RESIDUAL (physical security)
```

### Attack: Exfiltrate PHI

```
Exfiltrate PHI
├── Network Transmission
│   ├── Intercept app traffic → INFEASIBLE (no network PHI)
│   └── Compromise Ollama → MITIGATED (loopback only)
│
├── File Export
│   ├── Export to cloud folder → MITIGATED (path classification)
│   ├── Export to network share → MITIGATED (path classification)
│   └── Export to USB → LOGGED (removable detection)
│
├── Clipboard
│   ├── Copy and paste → LOGGED (audit)
│   └── Clipboard history → RESIDUAL (OS feature)
│
└── Screenshot
    └── Capture screen → OUT OF SCOPE (cannot prevent)
```

---

## Out of Scope Threats

These threats are explicitly not addressed by Evidify:

| Threat | Reason |
|--------|--------|
| Compromised operating system | If OS is compromised, no app-level protection is sufficient |
| Hardware keylogger | Physical attack beyond software mitigation |
| Legal/physical coercion | Social/legal attack, not technical |
| User intentional misuse | Cannot prevent authorized user from sharing data |
| Screenshots | OS-level capture cannot be blocked |

---

## Security Assumptions

For Evidify's security model to hold:

1. **User device is reasonably secure** - OS updated, no malware
2. **User chooses strong passphrase** - Not trivially guessable
3. **Ollama runs locally** - Not configured to proxy to cloud
4. **App is authentic** - Downloaded from official source
5. **User follows security guidance** - Locks device, manages backups

---

## Recommendations for High-Security Deployments

For environments requiring maximum security:

1. **Enable full-disk encryption** (FileVault/BitLocker)
2. **Use hardware security key** for device login
3. **Disable cloud sync** for app data directory
4. **Regular security updates** for OS and Ollama
5. **Physical security** for devices
6. **Backup encryption** if backing up vault
7. **Network monitoring** to verify no unexpected egress

---

## Annual Review Checklist

- [ ] Review new CVEs affecting dependencies
- [ ] Assess new attack techniques
- [ ] Update threat priorities based on incidents
- [ ] Verify mitigations still effective
- [ ] Update user security guidance

---

*Document version: 4.1.2-hotfix2 | Last updated: January 8, 2026*
