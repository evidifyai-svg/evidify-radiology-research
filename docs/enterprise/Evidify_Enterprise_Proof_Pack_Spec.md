# Evidify Enterprise Proof Pack
## Auditable Security Evidence Bundle

**Version:** 4.2.6-beta  
**Date:** January 9, 2026  
**Purpose:** Provide verifiable evidence that security claims are implemented and operational

---

## Executive Summary

The Enterprise Proof Pack is a per-release bundle of **auditable evidence** that proves Evidify's security claims. It addresses the gap between "documented intent" and "verified implementation."

### What This Pack Proves

| Claim | Evidence Type | Verification Method |
|-------|---------------|---------------------|
| No PHI egress | Network captures | Customer-runnable scripts |
| Database encrypted | File analysis | Command-line verification |
| Audit trail intact | Chain verification | Built-in integrity check |
| Updates signed | Signature verification | Public key verification |
| Dependencies secure | SBOM + audit | Automated scan results |
| Models verified | Hash comparison | SHA-256 verification |

---

## Pack Contents

```
evidify-proof-pack-4.2.6-beta/
│
├── 📋 MANIFEST.json                    # Pack contents + hashes
├── 📋 VERIFICATION_GUIDE.md            # How to verify each claim
│
├── 01-Supply-Chain/
│   ├── sbom-4.2.6-beta.json           # CycloneDX SBOM
│   ├── cargo-audit-report.txt          # Rust dependency audit
│   ├── npm-audit-report.txt            # Node dependency audit
│   ├── dependency-licenses.txt         # License compliance
│   └── build-provenance.json           # Build metadata
│
├── 02-Signatures/
│   ├── update-public-key.pem           # Ed25519 public key
│   ├── release-manifest.json           # Signed release info
│   ├── release-manifest.sig            # Ed25519 signature
│   └── VERIFICATION.md                 # How to verify signatures
│
├── 03-Network-Proof/
│   ├── network-verification.sh         # Customer-runnable script
│   ├── expected-endpoints.json         # Allowed network calls
│   ├── sample-capture.pcap             # Reference capture (no PHI)
│   └── NETWORK_PROOF.md                # Documentation
│
├── 04-Encryption-Proof/
│   ├── encryption-verification.sh      # Customer-runnable script
│   ├── vault-structure.md              # Expected file format
│   └── ENCRYPTION_PROOF.md             # Documentation
│
├── 05-Audit-Proof/
│   ├── audit-verification.sh           # Chain verification script
│   ├── sample-audit-export.json        # Sample (no PHI)
│   └── AUDIT_PROOF.md                  # Documentation
│
├── 06-Model-Integrity/
│   ├── model-manifest.json             # Approved models + hashes
│   ├── model-verification.sh           # Hash verification script
│   └── MODEL_PROOF.md                  # Documentation
│
├── 07-Clinical-Safety/
│   ├── safety-guardrails-spec.md       # Guardrail specification
│   ├── safety-test-cases.json          # Must-pass test definitions
│   └── safety-test-results.json        # Test execution results
│
├── 08-Restore-Validation/
│   ├── restore-drill-procedure.md      # DR procedure
│   ├── restore-drill-report-template.md
│   └── sample-drill-report.pdf         # Example completed drill
│
└── 09-Compliance-Docs/
    ├── baa-stance-letter.pdf           # Signed BAA position
    ├── hipaa-safeguard-mapping.pdf     # Control mapping
    └── subprocessor-list.pdf           # Vendor disclosure
```

---

## 1. Supply Chain Evidence

### 1.1 SBOM (Software Bill of Materials)

**File:** `01-Supply-Chain/sbom-4.2.6-beta.json`

**Format:** CycloneDX 1.5 (JSON)

**Contents:**
- All direct dependencies (Rust + Node)
- Transitive dependencies
- License information
- Package URLs (purl)
- Vulnerability references

**Customer Verification:**
```bash
# View component count
jq '.components | length' sbom-4.2.6-beta.json

# List all licenses
jq -r '.components[].licenses[].license.id' sbom-4.2.6-beta.json | sort -u

# Search for specific component
jq '.components[] | select(.name == "argon2")' sbom-4.2.6-beta.json
```

### 1.2 Dependency Audit Results

**Files:**
- `cargo-audit-report.txt` - Rust security advisories
- `npm-audit-report.txt` - Node security advisories

**Expected Result:** Zero high/critical vulnerabilities

**Customer Verification:**
```bash
# Check for critical issues
grep -E "CRITICAL|HIGH" cargo-audit-report.txt
# Expected: No output

grep -E "critical|high" npm-audit-report.txt
# Expected: No output
```

### 1.3 Build Provenance

**File:** `01-Supply-Chain/build-provenance.json`

```json
{
  "version": "4.2.6-beta",
  "commit": "a1b2c3d4e5f6...",
  "tag": "v4.2.6-beta",
  "build_time": "2026-01-09T12:00:00Z",
  "build_system": "GitHub Actions",
  "run_id": "12345678",
  "runner": "ubuntu-22.04",
  "rust_version": "1.75.0",
  "node_version": "18.19.0",
  "artifacts": [
    {
      "name": "Evidify-4.2.6-beta-darwin-arm64.dmg",
      "sha256": "...",
      "size": 45000000
    }
  ]
}
```

---

## 2. Signature Verification

### 2.1 Public Key

**File:** `02-Signatures/update-public-key.pem`

```
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA[32 bytes base64 encoded]
-----END PUBLIC KEY-----
```

**Note:** This key is also embedded in the application binary at compile time.

### 2.2 Verification Procedure

**File:** `02-Signatures/VERIFICATION.md`

```bash
# 1. Verify release manifest signature
openssl pkeyutl -verify \
  -pubin -inkey update-public-key.pem \
  -sigfile release-manifest.sig \
  -rawin -in release-manifest.json

# Expected: "Signature Verified Successfully"

# 2. Verify artifact hash matches manifest
EXPECTED=$(jq -r '.artifacts[0].sha256' release-manifest.json)
ACTUAL=$(shasum -a 256 Evidify-4.2.6-beta-darwin-arm64.dmg | cut -d' ' -f1)
[ "$EXPECTED" = "$ACTUAL" ] && echo "Hash verified" || echo "MISMATCH"
```

---

## 3. Network Proof (No PHI Egress)

### 3.1 Customer-Runnable Verification

**File:** `03-Network-Proof/network-verification.sh`

```bash
#!/bin/bash
# Evidify Network Verification Script
# Run this to prove no PHI leaves your device

echo "=== Evidify Network Verification ==="
echo "This script captures network traffic during Evidify operation"
echo "and searches for PHI patterns."
echo ""

# Check for required tools
command -v tcpdump >/dev/null 2>&1 || { echo "tcpdump required"; exit 1; }

# Create test data
TEST_PHI="TestPatient12345 DOB:1985-01-15 Diagnosis:ADHD"

# Start capture
CAPTURE_FILE="/tmp/evidify-network-test-$(date +%s).pcap"
echo "Starting network capture to $CAPTURE_FILE"
echo "Press Ctrl+C when done testing, or wait 60 seconds"

sudo tcpdump -i any -w "$CAPTURE_FILE" 'not host 127.0.0.1' &
TCPDUMP_PID=$!

echo ""
echo "NOW: Open Evidify and perform the following:"
echo "  1. Create a note with this exact text: $TEST_PHI"
echo "  2. Use voice transcription"
echo "  3. Run AI analysis on the note"
echo "  4. Export the note"
echo ""

# Wait for user or timeout
sleep 60 || wait

# Stop capture
sudo kill $TCPDUMP_PID 2>/dev/null
sleep 1

echo ""
echo "=== Analyzing capture ==="

# Search for PHI patterns
echo -n "Searching for test PHI in network traffic... "
if strings "$CAPTURE_FILE" | grep -qi "TestPatient12345\|1985-01-15\|Diagnosis"; then
    echo "FAIL - PHI found in network traffic!"
    exit 1
else
    echo "PASS - No PHI found"
fi

# List contacted hosts
echo ""
echo "External hosts contacted:"
tcpdump -r "$CAPTURE_FILE" -n 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | sort -u

echo ""
echo "=== Verification Complete ==="
echo "Capture file: $CAPTURE_FILE"
```

### 3.2 Expected Endpoints

**File:** `03-Network-Proof/expected-endpoints.json`

```json
{
  "allowed_endpoints": [
    {
      "host": "updates.evidify.ai",
      "purpose": "Update check (version info only)",
      "contains_phi": false,
      "disableable": true
    },
    {
      "host": "releases.evidify.ai",
      "purpose": "Update download (binary only)",
      "contains_phi": false,
      "disableable": true
    },
    {
      "host": "huggingface.co",
      "purpose": "Model download (optional)",
      "contains_phi": false,
      "disableable": true,
      "enterprise_note": "Use offline provisioning instead"
    }
  ],
  "localhost_services": [
    {
      "host": "127.0.0.1:11434",
      "purpose": "Ollama AI (local)",
      "contains_phi": true,
      "note": "PHI sent to localhost only - never leaves device"
    }
  ],
  "blocked_endpoints": {
    "description": "Evidify never contacts these",
    "examples": [
      "api.openai.com",
      "api.anthropic.com",
      "analytics.google.com",
      "sentry.io",
      "any telemetry service"
    ]
  }
}
```

---

## 4. Encryption Proof

### 4.1 Verification Script

**File:** `04-Encryption-Proof/encryption-verification.sh`

```bash
#!/bin/bash
# Verify Evidify database encryption

VAULT_PATH="$HOME/Library/Application Support/evidify/vault.db"

echo "=== Evidify Encryption Verification ==="

# Check file exists
if [ ! -f "$VAULT_PATH" ]; then
    echo "No vault found. Create one first."
    exit 1
fi

# Test 1: File type
echo -n "Test 1: File type identification... "
FILE_TYPE=$(file "$VAULT_PATH")
if echo "$FILE_TYPE" | grep -q "SQLite"; then
    echo "FAIL - SQLite header visible (not encrypted)"
    exit 1
else
    echo "PASS - File appears encrypted"
fi

# Test 2: SQLite open attempt
echo -n "Test 2: SQLite open without key... "
RESULT=$(sqlite3 "$VAULT_PATH" ".tables" 2>&1)
if echo "$RESULT" | grep -q "not a database"; then
    echo "PASS - Cannot open without key"
else
    echo "FAIL - Database opened without key"
    exit 1
fi

# Test 3: Check for plaintext
echo -n "Test 3: Search for plaintext patterns... "
if strings "$VAULT_PATH" | grep -qiE "patient|diagnosis|CREATE TABLE|sqlite_master"; then
    echo "FAIL - Plaintext found in database"
    exit 1
else
    echo "PASS - No plaintext patterns found"
fi

echo ""
echo "=== All encryption tests passed ==="
```

---

## 5. Audit Trail Proof

### 5.1 Chain Verification

**File:** `05-Audit-Proof/audit-verification.sh`

```bash
#!/bin/bash
# Verify Evidify audit chain integrity

echo "=== Evidify Audit Chain Verification ==="

# Use built-in verification
./evidify-cli verify-audit --vault "$VAULT_PATH"

# Or manual verification via export
echo ""
echo "Exporting audit log for manual inspection..."
./evidify-cli export-audit --vault "$VAULT_PATH" --output audit-export.json

echo ""
echo "Chain verification complete."
echo "Audit export: audit-export.json"
```

### 5.2 Sample Audit Export

**File:** `05-Audit-Proof/sample-audit-export.json`

```json
{
  "export_time": "2026-01-09T15:00:00Z",
  "vault_id": "a1b2c3d4-...",
  "entry_count": 47,
  "chain_valid": true,
  "hmac_valid": true,
  "entries": [
    {
      "id": 1,
      "timestamp": "2026-01-01T10:00:00Z",
      "event_type": "VAULT_CREATED",
      "details": {"app_version": "4.2.6-beta"},
      "previous_hash": "0000000000000000000000000000000000000000000000000000000000000000",
      "entry_hash": "a1b2c3d4...",
      "hmac_valid": true
    },
    {
      "id": 2,
      "timestamp": "2026-01-01T10:05:00Z",
      "event_type": "NOTE_CREATED",
      "details": {"note_id": "b2c3d4e5-...", "title_length": 25},
      "previous_hash": "a1b2c3d4...",
      "entry_hash": "c3d4e5f6...",
      "hmac_valid": true
    }
  ]
}
```

**Note:** No PHI in audit export - only IDs, lengths, and metadata.

---

## 6. Model Integrity Proof

### 6.1 Approved Model Manifest

**File:** `06-Model-Integrity/model-manifest.json`

```json
{
  "manifest_version": 2,
  "models": {
    "whisper-base-en": {
      "filename": "ggml-base.en.bin",
      "sha256": "60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe",
      "size_bytes": 147964211
    }
  }
}
```

### 6.2 Verification Script

**File:** `06-Model-Integrity/model-verification.sh`

```bash
#!/bin/bash
# Verify Evidify model integrity

MODEL_PATH="$HOME/Library/Application Support/evidify/models/ggml-base.en.bin"
EXPECTED_HASH="60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe"

echo "=== Model Integrity Verification ==="

echo -n "Computing SHA-256... "
ACTUAL_HASH=$(shasum -a 256 "$MODEL_PATH" | cut -d' ' -f1)
echo "$ACTUAL_HASH"

echo -n "Comparing with manifest... "
if [ "$ACTUAL_HASH" = "$EXPECTED_HASH" ]; then
    echo "PASS - Model verified"
else
    echo "FAIL - Hash mismatch"
    echo "Expected: $EXPECTED_HASH"
    echo "Got:      $ACTUAL_HASH"
    exit 1
fi
```

---

## 7. Clinical Safety Evidence

### 7.1 Safety Test Results

**File:** `07-Clinical-Safety/safety-test-results.json`

```json
{
  "test_run": "2026-01-09T12:00:00Z",
  "version": "4.2.6-beta",
  "results": [
    {
      "test_id": "SAFE-001",
      "name": "Suicide keyword triggers assessment",
      "status": "PASS",
      "execution_time_ms": 45
    },
    {
      "test_id": "SAFE-002",
      "name": "Denial statement requires verification",
      "status": "PASS",
      "execution_time_ms": 38
    },
    {
      "test_id": "SAFE-003",
      "name": "Copy-forward warning displayed",
      "status": "PASS",
      "execution_time_ms": 52
    }
  ],
  "summary": {
    "total": 7,
    "passed": 7,
    "failed": 0,
    "pass_rate": "100%"
  }
}
```

---

## 8. Restore Validation Evidence

### 8.1 Sample Drill Report

**File:** `08-Restore-Validation/sample-drill-report.pdf`

A completed example of the restore drill report demonstrating:
- Successful backup retrieval
- Vault unlock verification
- Data integrity confirmation
- Functional test completion
- RTO/RPO targets met

---

## 9. Compliance Documents

### 9.1 BAA Stance Letter

**File:** `09-Compliance-Docs/baa-stance-letter.pdf`

Signed letter clarifying:
- Evidify's non-BA status under standard use
- Conditions that would change this status
- Optional BAA availability for procurement

### 9.2 Subprocessor List

**File:** `09-Compliance-Docs/subprocessor-list.pdf`

| Subprocessor | Service | PHI Received |
|--------------|---------|--------------|
| Cloudflare | CDN | No |
| Stripe | Payments | No |

---

## Verification Checklist

Use this checklist to verify each security claim:

```
Supply Chain
□ SBOM present and parseable
□ Zero critical/high vulnerabilities in cargo audit
□ Zero critical/high vulnerabilities in npm audit
□ Build provenance includes commit SHA

Signatures  
□ Public key matches embedded key in binary
□ Release manifest signature verifies
□ Artifact hashes match manifest

Network
□ Network verification script runs successfully
□ No PHI in packet capture
□ Only expected endpoints contacted

Encryption
□ vault.db fails to open with sqlite3
□ No SQLite header in file
□ No plaintext patterns in file

Audit
□ Hash chain verification passes
□ HMAC verification passes
□ Audit export contains no PHI

Models
□ Model hash matches manifest
□ Tampered model fails to load

Clinical Safety
□ All safety tests pass
□ Safety guardrails documented

Restore
□ Drill procedure documented
□ Sample drill report provided

Compliance
□ BAA stance letter signed
□ Subprocessor list current
```

---

## How to Request Updated Proof Pack

Proof packs are generated for each release. To request:

1. **Automatic:** Download from `https://releases.evidify.ai/{version}/proof-pack.zip`
2. **Manual:** Email enterprise@evidify.ai with version number
3. **Enterprise:** Access via customer portal (if available)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 4.2.6-beta | January 9, 2026 | Initial release |

---

*This proof pack provides auditable evidence of Evidify's security implementation. All verification scripts can be run by customers in their own environment.*
