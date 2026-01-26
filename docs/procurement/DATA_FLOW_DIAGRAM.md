# Evidify Data Flow Diagram

**Version:** 4.1.2-hotfix2-hotfix2  
**Date:** January 8, 2026

---

## Overview

This document maps where Protected Health Information (PHI) can and cannot exist within the Evidify system, providing clear boundaries for security auditors and procurement teams.

---

## System Boundary Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLINICIAN'S DEVICE                                 │
│                        (PHI Boundary - All PHI Here)                         │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         EVIDIFY APPLICATION                             │ │
│  │                                                                         │ │
│  │  ┌─────────────┐      ┌──────────────┐      ┌────────────────────────┐ │ │
│  │  │  Frontend   │      │    Tauri     │      │     Rust Backend       │ │ │
│  │  │  (React)    │◄────►│    IPC       │◄────►│                        │ │ │
│  │  │             │      │   Bridge     │      │  ┌──────────────────┐  │ │ │
│  │  │  • UI       │      │              │      │  │   PHI Handlers   │  │ │ │
│  │  │  • Display  │      │  [In-Memory] │      │  │                  │  │ │ │
│  │  │  • Input    │      │              │      │  │  • Notes         │  │ │ │
│  │  │             │      │              │      │  │  • Clients       │  │ │ │
│  │  └─────────────┘      └──────────────┘      │  │  • Detections    │  │ │ │
│  │                                             │  └────────┬─────────┘  │ │ │
│  │                                             │           │            │ │ │
│  │                                             │           ▼            │ │ │
│  │                                             │  ┌──────────────────┐  │ │ │
│  │                                             │  │  Encrypted Vault │  │ │ │
│  │                                             │  │   (SQLCipher)    │  │ │ │
│  │                                             │  │                  │  │ │ │
│  │                                             │  │  AES-256-CBC     │  │ │ │
│  │                                             │  │  Per-page HMAC   │  │ │ │
│  │                                             │  └────────┬─────────┘  │ │ │
│  │                                             │           │            │ │ │
│  │                                             └───────────┼────────────┘ │ │
│  │                                                         │              │ │
│  │  ┌──────────────────────────────────────────────────────┼────────────┐ │ │
│  │  │                    FILE SYSTEM                       │            │ │ │
│  │  │                                                      ▼            │ │ │
│  │  │  ~/Library/Application Support/com.evidify.app/                   │ │ │
│  │  │    └── vault.db  ◄──── [ENCRYPTED PHI]                            │ │ │
│  │  │                                                                   │ │ │
│  │  └───────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                         │ │
│  │  ┌───────────────────────────────────────────────────────────────────┐ │ │
│  │  │                    NON-PHI COMPONENTS                              │ │ │
│  │  │                                                                    │ │ │
│  │  │  Audit Log ──────► [Event types, timestamps, hashes - NO PHI]     │ │ │
│  │  │  Metrics ────────► [Counts, durations, categories - NO PHI]       │ │ │
│  │  │  Support Bundle ─► [Config, versions, error codes - NO PHI]       │ │ │
│  │  │                                                                    │ │ │
│  │  └───────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                           OS KEYCHAIN                                    │ │
│  │                                                                          │ │
│  │  macOS: Keychain Access                                                  │ │
│  │  Windows: Credential Manager                                             │ │
│  │                                                                          │ │
│  │  Stores:                                                                 │ │
│  │    • Wrapped Vault Key (encrypted, not plaintext)                        │ │
│  │    • KDF Salt                                                            │ │
│  │                                                                          │ │
│  │  Does NOT store:                                                         │ │
│  │    • Passphrase                                                          │ │
│  │    • Unwrapped keys                                                      │ │
│  │    • PHI                                                                 │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        OLLAMA (LOCAL AI)                                 │ │
│  │                                                                          │ │
│  │  Address: 127.0.0.1:11434 (loopback only)                               │ │
│  │                                                                          │ │
│  │  Receives:                                                               │ │
│  │    • Clinical text for structuring (PHI in transit, local only)         │ │
│  │                                                                          │ │
│  │  Returns:                                                                │ │
│  │    • Structured note content                                             │ │
│  │                                                                          │ │
│  │  ⚠️  PHI transits to Ollama but ONLY on loopback                         │ │
│  │      Ollama model files are local, no cloud connection                   │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ NETWORK BOUNDARY
                                    │ (No PHI crosses this line)
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL NETWORK                                 │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                    EVIDIFY CLOUD (Future)                            │    │
│   │                                                                      │    │
│   │   Receives ONLY:                                                     │    │
│   │     • De-identified case material (peer consultation)                │    │
│   │     • Anonymous usage metrics (if opted in)                          │    │
│   │     • Support bundles (PHI-impossible by construction)               │    │
│   │                                                                      │    │
│   │   NEVER receives:                                                    │    │
│   │     • Raw clinical notes                                             │    │
│   │     • Patient identifiers                                            │    │
│   │     • Vault encryption keys                                          │    │
│   │     • Passphrase or derived keys                                     │    │
│   │                                                                      │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Classification

### PHI (Protected Health Information)

| Data Type | Location | Encryption | Access Control |
|-----------|----------|------------|----------------|
| Client names | vault.db | AES-256 | Passphrase unlock |
| Session notes | vault.db | AES-256 | Passphrase unlock |
| Structured content | vault.db | AES-256 | Passphrase unlock |
| Risk detections | vault.db | AES-256 | Passphrase unlock |
| Attestations | vault.db | AES-256 | Passphrase unlock |

### Non-PHI (Safe for Transmission)

| Data Type | Location | Contains |
|-----------|----------|----------|
| Audit log | vault.db (encrypted) | Event types, timestamps, resource IDs (not names) |
| Metrics | Memory/vault | Counts, durations, categories |
| Support bundle | Generated on demand | App version, error codes, config (no free text) |
| De-identified cases | Generated on demand | Scrubbed clinical content (future) |

---

## Egress Points

### Blocked/Warned

| Egress Point | Classification | Policy |
|--------------|----------------|--------|
| Export to ~/Dropbox | CloudSync | Warn (Solo) / Block (Enterprise) |
| Export to ~/OneDrive | CloudSync | Warn (Solo) / Block (Enterprise) |
| Export to /Volumes/USB | Removable | Warn |
| Export to \\\\server\\share | Network | Warn (Solo) / Block (Enterprise) |
| Copy PHI to clipboard | Clipboard | Logged, optional timeout clear |

### Allowed

| Egress Point | Classification | Policy |
|--------------|----------------|--------|
| Export to local folder | Safe | Allowed |
| Print (future) | Print | Allowed with audit |
| Ollama (loopback) | LocalAI | Allowed (loopback enforced) |

---

## Key Material Flow

```
User Passphrase (memory, not stored)
        │
        ▼ Argon2id (64MB, 3 iter)
        │
    ┌───┴───┐
    │  KEK  │  Key Encryption Key (memory only)
    └───┬───┘
        │
        ▼ AES-256-GCM unwrap
        │
    ┌───┴───────────────┐
    │ Wrapped Vault Key │  From OS Keychain
    └───────────────────┘
        │
        ▼ Unwrap
        │
    ┌───┴───┐
    │ Vault │  Used for SQLCipher (memory only)
    │  Key  │  Zeroized on lock
    └───────┘
```

---

## Verification Steps

### PHI Never Leaves Device

1. Disconnect from network
2. Launch Evidify
3. Create vault, add client, create note
4. All operations succeed → PHI is local

### Encrypted at Rest

1. Close Evidify
2. `sqlite3 vault.db ".tables"` → "file is not a database"
3. `strings vault.db | grep <client_name>` → No matches

### Loopback Enforcement

1. Configure Ollama URL to external IP (if possible)
2. Attempt AI operation → Error "Must be loopback address"

---

*Document version: 4.1.2-hotfix2 | Last updated: January 8, 2026*
