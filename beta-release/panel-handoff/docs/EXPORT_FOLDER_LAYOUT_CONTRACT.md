# Evidify Forensic Export Folder Layout Contract

**Version:** 1.1  
**Status:** NORMATIVE  
**Date:** 2026-01-12

---

## Overview

This document specifies the exact folder structure, file naming conventions, and content classification for Evidify Forensic export packages. Compliance with this contract is required for court-defensible exports.

---

## 1. Root Folder Structure

```
{case_id}-{export_type}-{timestamp}/
├── manifest.json                    # REQUIRED - Pack metadata
├── canonical/                       # REQUIRED - Case data (PHI-CONTAINING)
│   └── canonical.json
├── audit/                          # REQUIRED - Event chain (PHI-CONTAINING)
│   ├── audit.log                   # NDJSON event stream
│   └── audit_digest.json           # Chain summary + final hash
├── verification/                   # REQUIRED - Gate results (PHI-SAFE)
│   ├── gate_report.canon.json      # Canonical (deterministic)
│   └── gate_report.meta.json       # Metadata (timestamps, versions)
├── evidence/                       # OPTIONAL - Source documents (PHI-CONTAINING)
│   ├── {evidence_id}_{filename}
│   └── ...
├── attachments/                    # OPTIONAL - Generated content (PHI-CONTAINING)
│   ├── report_draft.pdf
│   └── ...
└── logs/                           # OPTIONAL - Debug info (PHI-SAFE if redacted)
    ├── app.log
    └── verifier.log
```

---

## 2. File Specifications

### 2.1 manifest.json (REQUIRED)

**Location:** Root  
**Deterministic:** YES (except `created_at`)  
**PHI Status:** SAFE (contains only IDs and metadata)

```json
{
  "schema_version": "evidify.manifest.v1",
  "pack_id": "CC-001-reader-20260112T143022Z",
  "case_id": "CC-001",
  "export_type": "reader_pack",
  "created_at": "2026-01-12T14:30:22.000Z",
  "app_version": "1.1.0",
  "files": [
    {
      "path": "canonical/canonical.json",
      "sha256": "abc123...",
      "phi_status": "CONTAINS_PHI"
    },
    {
      "path": "verification/gate_report.canon.json",
      "sha256": "def456...",
      "phi_status": "PHI_SAFE"
    }
  ],
  "phi_summary": {
    "contains_phi": true,
    "phi_files_count": 3,
    "safe_files_count": 4
  }
}
```

### 2.2 canonical/canonical.json (REQUIRED)

**Location:** `canonical/`  
**Deterministic:** YES  
**PHI Status:** CONTAINS PHI

Contains complete case data including:
- Opinions with full text
- Claims with evidence text
- Evidence inventory with filenames
- Limitations and contradictions
- Report metadata

**Discovery Note:** This file WILL be produced in discovery. Ensure all content is accurate and defensible.

### 2.3 audit/audit.log (REQUIRED)

**Location:** `audit/`  
**Deterministic:** YES  
**PHI Status:** CONTAINS PHI (event details may reference case content)

NDJSON format, one event per line:
```json
{"seq":0,"timestamp":"...","action":"CASE_CREATED","details":{...},"prev_hash":"000...","chain_hash":"abc..."}
{"seq":1,"timestamp":"...","action":"EVIDENCE_INGESTED","details":{...},"prev_hash":"abc...","chain_hash":"def..."}
```

**Chain Integrity:** Each event's `chain_hash` = SHA-256(JSON.stringify({seq, timestamp, action, details, prev_hash}))

### 2.4 audit/audit_digest.json (REQUIRED)

**Location:** `audit/`  
**Deterministic:** YES  
**PHI Status:** SAFE

```json
{
  "event_count": 42,
  "first_event_timestamp": "2026-01-12T10:00:00.000Z",
  "last_event_timestamp": "2026-01-12T14:30:00.000Z",
  "final_chain_hash": "b4f7942e...",
  "action_summary": {
    "CASE_CREATED": 1,
    "EVIDENCE_INGESTED": 5,
    "ANNOTATION_CREATED": 12,
    "CLAIM_PROMOTED": 8,
    "OPINION_DRAFTED": 3,
    "AI_GENERATION": 6,
    "HUMAN_REVIEW": 6,
    "GATE_EVALUATED": 1
  }
}
```

### 2.5 verification/gate_report.canon.json (REQUIRED)

**Location:** `verification/`  
**Deterministic:** YES (no timestamps, no paths, no volatile data)  
**PHI Status:** SAFE

See `INTEGRATION_REQUIREMENTS_v1.1.md` for full schema.

**Key Properties:**
- Contains only structural identifiers (OPN-001, CLM-002, etc.)
- No free-text content that could contain PHI
- Canonical hash is self-verifiable via sentinel preimage

### 2.6 verification/gate_report.meta.json (REQUIRED)

**Location:** `verification/`  
**Deterministic:** NO (contains timestamps)  
**PHI Status:** SAFE

```json
{
  "generated_at": "2026-01-12T14:30:22.000Z",
  "gate_version": "1.1",
  "engine_version": "1.1.0",
  "app_version": "1.1.0",
  "hash_algorithm": "sentinel-based-preimage-v1.1",
  "verification_status": "PASS"
}
```

### 2.7 evidence/ (OPTIONAL)

**Location:** `evidence/`  
**Deterministic:** YES (file contents unchanged from import)  
**PHI Status:** CONTAINS PHI

Naming convention: `{evidence_id}_{original_filename}`

Example:
```
evidence/
├── EV-001_referral_letter.pdf
├── EV-002_medical_records.pdf
└── EV-003_school_report.pdf
```

**Inclusion Rules:**
- Reader Pack: Evidence included by default
- Verification-Only Pack: Evidence excluded
- User can toggle inclusion at export time

### 2.8 attachments/ (OPTIONAL)

**Location:** `attachments/`  
**Deterministic:** NO (generated content may vary)  
**PHI Status:** CONTAINS PHI

Contains:
- Generated report drafts
- Exported citations
- User-added attachments

### 2.9 logs/ (OPTIONAL, DEV ONLY)

**Location:** `logs/`  
**Deterministic:** NO  
**PHI Status:** SAFE (must be redacted before inclusion)

**CRITICAL:** Logs must NOT contain:
- Patient/client names
- Case-identifying information
- File paths that reveal user identity
- Any content from evidence documents

Redaction is automatic; logs contain only:
- Timestamps
- Action types
- Object IDs (OPN-001, not "John Doe's competency opinion")
- Error codes and stack traces (paths redacted)

---

## 3. Export Types

### 3.1 Reader Pack (Full)

**Purpose:** Complete case package for opposing counsel, court, or archive  
**Naming:** `{case_id}-reader-{timestamp}/`

Includes:
- ✅ manifest.json
- ✅ canonical/
- ✅ audit/
- ✅ verification/
- ✅ evidence/ (all source documents)
- ✅ attachments/ (report drafts)
- ❌ logs/ (never in reader pack)

### 3.2 Verification Pack (Minimal)

**Purpose:** Defensibility verification without source documents  
**Naming:** `{case_id}-verify-{timestamp}/`

Includes:
- ✅ manifest.json
- ✅ canonical/
- ✅ audit/
- ✅ verification/
- ❌ evidence/
- ❌ attachments/
- ❌ logs/

### 3.3 Debug Bundle (Internal)

**Purpose:** Bug reporting and engineering diagnostics  
**Naming:** `{case_id}-debug-{timestamp}/`

Includes:
- ✅ manifest.json
- ✅ canonical/ (PHI redacted if possible)
- ✅ audit/
- ✅ verification/
- ❌ evidence/
- ❌ attachments/
- ✅ logs/ (redacted)

---

## 4. Naming Conventions

### 4.1 Folder Names

Pattern: `{case_id}-{export_type}-{timestamp}`

- `case_id`: User-defined case identifier (alphanumeric + hyphens)
- `export_type`: One of `reader`, `verify`, `debug`
- `timestamp`: ISO 8601 compact format `YYYYMMDDTHHmmssZ`

Examples:
```
CC-001-reader-20260112T143022Z
SMITH-2024-verify-20260112T150000Z
BIG-001-debug-20260112T160000Z
```

### 4.2 File Names

| File | Naming Rule |
|------|-------------|
| manifest.json | Fixed name |
| canonical.json | Fixed name |
| audit.log | Fixed name |
| audit_digest.json | Fixed name |
| gate_report.canon.json | Fixed name |
| gate_report.meta.json | Fixed name |
| Evidence files | `{evidence_id}_{original_filename}` |
| Attachments | `{attachment_type}_{timestamp}.{ext}` |
| Logs | `{log_type}.log` |

---

## 5. PHI Classification

### 5.1 PHI-CONTAINING Files

These files contain Protected Health Information and must be handled according to HIPAA/privacy requirements:

| File | PHI Type |
|------|----------|
| canonical.json | Case content, opinions, claims |
| audit.log | Event details may reference case content |
| evidence/* | Source documents |
| attachments/* | Generated reports |

### 5.2 PHI-SAFE Files

These files contain only structural/technical data and can be shared more freely:

| File | Content |
|------|---------|
| manifest.json | IDs and hashes only |
| audit_digest.json | Counts and hashes only |
| gate_report.canon.json | IDs, codes, no free text |
| gate_report.meta.json | Timestamps and versions |
| logs/* | Redacted technical logs |

### 5.3 Discovery Implications

**Producible without review:**
- verification/gate_report.canon.json
- verification/gate_report.meta.json
- audit/audit_digest.json

**Requires privilege review:**
- canonical/canonical.json
- audit/audit.log
- evidence/*
- attachments/*

---

## 6. Verification Requirements

### 6.1 Export-Time Checks

Before writing export to disk:

1. ✅ Schema validation passes for gate_report.canon.json
2. ✅ Canonical hash is computed and embedded
3. ✅ Audit chain integrity verified (all chain_hash values correct)
4. ✅ All finding IDs are unique
5. ✅ Evidence file hashes match manifest

### 6.2 Post-Export Verification

After export completes, run verifier:

```bash
node verify-v1.1.cjs {export_folder}/ \
  --schema evidify.forensic.gate_report.v1.schema.json
```

Expected output for valid export:
```
✅ Required files
✅ Audit chain
✅ Canonical hash verification
✅ ID uniqueness
✅ Schema validation
✅ Gate evaluation: PASS

VERIFICATION: PASS
```

---

## 7. Compatibility

### 7.1 Version Compatibility

| Export Version | Verifier Version | Compatible |
|----------------|------------------|------------|
| v1.0 | v1.0 | ✅ |
| v1.0 | v1.1 | ✅ (backward compatible) |
| v1.1 | v1.0 | ❌ (hash algorithm changed) |
| v1.1 | v1.1 | ✅ |

### 7.2 Migration

v1.0 exports can be migrated to v1.1 by:
1. Re-running gate evaluation with v1.1 engine
2. Regenerating canonical hash with sentinel preimage
3. Updating schema_version to v1.1

---

*Export Folder Layout Contract v1.1 — Normative specification for court-defensible exports*
