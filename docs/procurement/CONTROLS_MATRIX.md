# Evidify Security Controls Matrix

**Version:** 4.1.2-hotfix2-hotfix2  
**Date:** January 8, 2026  
**Framework Reference:** HIPAA Security Rule / SOC 2 Trust Services Criteria

---

## Overview

This matrix maps Evidify's security controls to common compliance frameworks. It is intended for procurement teams evaluating the platform's security posture.

**Note:** Evidify's local-first architecture means many traditional cloud security controls are not applicable. Instead, security is achieved through architectural constraints (PHI never leaves device) rather than operational controls (monitoring, access management).

---

## Control Categories

### 1. Access Controls (HIPAA § 164.312(a)(1))

| Control | Implementation | Evidence |
|---------|----------------|----------|
| **Unique User Identification** | Single-user device deployment; passphrase per vault | Vault creation requires passphrase |
| **Emergency Access** | Not applicable (local data, user controls) | N/A |
| **Automatic Logoff** | Vault locks on app close; configurable timeout (future) | vault.lock() on window close |
| **Encryption/Decryption** | AES-256 via SQLCipher; Argon2id key derivation | Cargo.toml dependencies; vault.rs |

### 2. Audit Controls (HIPAA § 164.312(b))

| Control | Implementation | Evidence |
|---------|----------------|----------|
| **Audit Logging** | Hash-chained audit log for all operations | audit.rs; verify_audit_chain command |
| **Log Protection** | Logs encrypted within SQLCipher vault | Part of vault.db (encrypted) |
| **Log Retention** | Indefinite within vault; user controls deletion | No automatic purge |
| **Tamper Detection** | SHA-256 hash chain; broken chain = tamper detected | verify_audit_chain returns false on tamper |

### 3. Integrity Controls (HIPAA § 164.312(c)(1))

| Control | Implementation | Evidence |
|---------|----------------|----------|
| **PHI Integrity** | SQLCipher per-page HMAC | SQLCipher configuration |
| **Note Signing** | Cryptographic signature on finalized notes | sign_note command; attestation workflow |
| **Transmission Integrity** | N/A (no transmission) | Local-only architecture |

### 4. Transmission Security (HIPAA § 164.312(e)(1))

| Control | Implementation | Evidence |
|---------|----------------|----------|
| **Encryption in Transit** | N/A - PHI never transmitted | Network monitoring shows no PHI egress |
| **Loopback Enforcement** | AI calls restricted to 127.0.0.1 | validate_loopback_url() in ai.rs |
| **Network Isolation** | App functions offline | Offline operation test |

### 5. Physical Safeguards (HIPAA § 164.310)

| Control | Implementation | Evidence |
|---------|----------------|----------|
| **Workstation Security** | User responsibility (device encryption, screen lock) | Out of scope for app |
| **Device Controls** | Key zeroization on lock; encrypted vault | Key material zeroed in Drop impl |

---

## SOC 2 Trust Services Criteria Mapping

### CC1: Control Environment

| Criteria | Evidify Implementation |
|----------|------------------------|
| CC1.1 Integrity & Ethics | Security-first design principles in PRODUCT_DOCUMENT |
| CC1.2 Board Oversight | N/A (product control, not org control) |
| CC1.3 Management Philosophy | Local-first architecture documented |
| CC1.4 Structure & Authority | Single-clinician deployment model |
| CC1.5 HR Policies | N/A (product control) |

### CC2: Communication & Information

| Criteria | Evidify Implementation |
|----------|------------------------|
| CC2.1 Internal Communication | Not applicable |
| CC2.2 External Communication | Security claims documented in CLAIMS_LEDGER |
| CC2.3 Policies & Procedures | INSTALL.md, SECURITY_FIXES.md |

### CC5: Control Activities

| Criteria | Evidify Implementation |
|----------|------------------------|
| CC5.1 Control Selection | Export policy engine, CSP enforcement |
| CC5.2 Logical Access | Passphrase-derived encryption keys |
| CC5.3 Physical Access | User responsibility |

### CC6: Logical & Physical Access

| Criteria | Evidify Implementation |
|----------|------------------------|
| CC6.1 Infrastructure Protection | Restricted filesystem scope, CSP |
| CC6.2 Authentication | Argon2id passphrase verification |
| CC6.3 Authorization | Single-user model; all or nothing access |
| CC6.6 Boundary Protection | Loopback enforcement for AI; no external connections |
| CC6.7 Input Validation | Rust type system; command boundary validation |

### CC7: System Operations

| Criteria | Evidify Implementation |
|----------|------------------------|
| CC7.1 System Changes | Version manifests, signed builds (future) |
| CC7.2 Monitoring | Audit logging within vault |
| CC7.3 Incident Detection | Hash chain verification |
| CC7.4 Incident Response | Documented in procurement pack |

---

## Control Verification Procedures

### Automated Checks (CI)

| Check | Script | Runs |
|-------|--------|------|
| CSP compliance | check_csp_release.sh | Every build |
| Version consistency | verify_release.sh | Pre-release |
| Dependency audit | cargo audit (future) | Weekly |

### Manual Checks (Pre-Release)

| Check | Procedure | Frequency |
|-------|-----------|-----------|
| Offline operation | Disconnect network, verify functionality | Each release |
| Keychain loss recovery | Delete keychain, verify recovery UX | Each release |
| Export blocking | Test cloud paths, verify warnings | Each release |
| Audit chain integrity | Create entries, verify chain | Each release |

### Periodic Reviews

| Review | Scope | Frequency |
|--------|-------|-----------|
| Dependency vulnerabilities | Cargo.lock, package-lock.json | Monthly |
| Architecture alignment | Code vs. claims | Quarterly |
| Threat model update | New attack vectors | Annually |

---

## Compensating Controls

For controls typically implemented in cloud environments but not applicable to local-first:

| Traditional Control | Why Not Applicable | Compensating Control |
|---------------------|-------------------|---------------------|
| Network firewall | No network transmission | Loopback enforcement |
| IDS/IPS | No network to monitor | Audit logging |
| Access logs (server) | No server | Local audit chain |
| Key management service | Keys never leave device | OS keychain integration |
| Encryption in transit | No transit | Encryption at rest only |
| Multi-factor auth | Single-user device | Passphrase + device possession |

---

## Residual Risks

| Risk | Mitigation | Residual Level |
|------|------------|----------------|
| Device theft | Encryption at rest, key zeroization | Medium (user physical security) |
| Passphrase compromise | Argon2id (expensive to brute force) | Low |
| Memory dump | Key zeroization on lock | Low |
| Ollama misconfiguration | Loopback validation | Low |
| Clipboard exposure | Logging + timeout (future) | Medium |

---

## Compliance Statement

Evidify's security architecture is designed to support HIPAA compliance for covered entities using the platform. The local-first design eliminates many cloud-based risks but shifts responsibility for physical security, device management, and backup to the clinician.

Key assertions:
- PHI never leaves the clinician's device under normal operation
- Encryption meets or exceeds HIPAA requirements (AES-256)
- Audit logging provides accountability without PHI exposure
- Export controls prevent accidental PHI leakage to cloud services

---

*Document version: 4.1.2-hotfix2 | Last updated: January 8, 2026*
