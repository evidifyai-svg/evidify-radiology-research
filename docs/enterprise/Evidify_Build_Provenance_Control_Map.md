# Evidify Build Provenance & Control-to-Code Map
## Verifiable Security Implementation Evidence

**Version:** 4.2.6-beta  
**Commit SHA:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0` (placeholder - replace with actual)  
**Build Date:** January 9, 2026  
**Build System:** GitHub Actions  

---

## Executive Summary

This document provides the **verifiable mapping** between security controls claimed in Evidify's documentation and their actual implementation in source code. Enterprise buyers can use this to audit security claims against concrete code paths.

---

## 1. Build Provenance

### 1.1 Release Artifact Identification

```yaml
Release: v4.2.6-beta
Commit: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
Tag: v4.2.6-beta
Branch: main
Build ID: gh-actions-run-12345678

Artifacts:
  - Evidify-4.2.6-beta-darwin-arm64.dmg
    SHA256: [ACTUAL HASH]
    Signature: [Ed25519 SIGNATURE]
    
  - Evidify-4.2.6-beta-darwin-x64.dmg
    SHA256: [ACTUAL HASH]
    Signature: [Ed25519 SIGNATURE]
    
  - Evidify-4.2.6-beta-win32-x64.exe
    SHA256: [ACTUAL HASH]
    Signature: [Ed25519 SIGNATURE]
    Authenticode: [THUMBPRINT]

SBOM: sbom-v4.2.6-beta.json
SBOM SHA256: [ACTUAL HASH]
```

### 1.2 Build Environment

```yaml
Build Environment:
  OS: ubuntu-22.04
  Rust: 1.75.0
  Node: 18.19.0
  Tauri CLI: 1.5.9
  
Build Commands:
  - npm ci                           # Install frontend deps
  - npm run build                    # Build React frontend
  - cd src-tauri && cargo build --release  # Build Rust backend
  - npm run tauri build              # Package application

Reproducibility:
  Status: Best-effort (not hermetic)
  Constraints: See BUILD_CONSTRAINTS.md
```

### 1.3 Signing Process

```yaml
Code Signing:
  macOS:
    Identity: "Developer ID Application: Evidify Inc (XXXXXXXXXX)"
    Notarization: Apple Notary Service
    Timestamp: Apple Timestamp Server
    
  Windows:
    Certificate: "Evidify Inc" (EV Code Signing)
    Issuer: DigiCert
    Timestamp: DigiCert Timestamp Server
    
Update Signing:
  Algorithm: Ed25519
  Key Storage: AWS CloudHSM (FIPS 140-2 Level 3)
  Key ID: evidify-update-signing-2026
  Public Key (hex): [ACTUAL PUBLIC KEY - 64 hex chars]
```

### 1.4 Verification Commands

```bash
# Verify macOS code signature
codesign --verify --deep --strict /Applications/Evidify.app
spctl --assess --type execute /Applications/Evidify.app

# Verify Windows Authenticode signature
signtool verify /pa "C:\Program Files\Evidify\Evidify.exe"

# Verify update signature (using evidify-verify CLI)
evidify-verify --manifest manifest.json --signature manifest.sig --pubkey update-pubkey.pem

# Verify SBOM hash
shasum -a 256 sbom-v4.2.6-beta.json
# Compare against published hash
```

---

## 2. Control-to-Code Map

### 2.1 Database Encryption (SQLCipher)

**Claim:** "All data encrypted at rest using AES-256"

| Control | File | Function/Code | Line(s) |
|---------|------|---------------|---------|
| SQLCipher initialization | `src-tauri/src/vault.rs` | `Vault::open()` | 45-67 |
| PRAGMA key setting | `src-tauri/src/vault.rs` | `set_encryption_key()` | 72-89 |
| Cipher configuration | `src-tauri/src/vault.rs` | `configure_cipher()` | 91-105 |

**Code Snippet:**
```rust
// src-tauri/src/vault.rs:72-89
fn set_encryption_key(&self, key: &[u8; 32]) -> Result<()> {
    let hex_key = hex::encode(key);
    self.conn.execute_batch(&format!(
        "PRAGMA key = \"x'{}'\";
         PRAGMA cipher_page_size = 4096;
         PRAGMA kdf_iter = 256000;
         PRAGMA cipher_hmac_algorithm = HMAC_SHA256;
         PRAGMA cipher_kdf_algorithm = PBKDF2_HMAC_SHA256;",
        hex_key
    ))?;
    Ok(())
}
```

**Verification:**
```bash
# Runtime: Open vault.db with sqlite3 (should fail)
sqlite3 vault.db ".tables"
# Expected: "Error: file is not a database"

# Runtime: Check file header
xxd vault.db | head -1
# Expected: NOT "53514c69" (SQLite magic)
```

---

### 2.2 Key Derivation (Argon2id)

**Claim:** "Argon2id with 64MB memory, 3 iterations"

| Control | File | Function/Code | Line(s) |
|---------|------|---------------|---------|
| Argon2id params | `src-tauri/src/crypto.rs` | `derive_key()` | 23-45 |
| Salt generation | `src-tauri/src/crypto.rs` | `generate_salt()` | 12-18 |
| Key output | `src-tauri/src/crypto.rs` | `derive_key()` | 47-52 |

**Code Snippet:**
```rust
// src-tauri/src/crypto.rs:23-45
pub fn derive_key(passphrase: &str, salt: &[u8; 16]) -> Result<[u8; 32]> {
    let params = Params::new(
        65536,   // m_cost: 64 MB
        3,       // t_cost: 3 iterations
        1,       // p_cost: 1 lane
        Some(32) // output length
    ).map_err(|e| CryptoError::ParamError(e.to_string()))?;
    
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    
    let mut key = [0u8; 32];
    argon2.hash_password_into(passphrase.as_bytes(), salt, &mut key)
        .map_err(|e| CryptoError::HashError(e.to_string()))?;
    
    Ok(key)
}
```

**Verification:**
```bash
# Runtime: Time an unlock attempt (should be ~0.3-0.5s on modern hardware)
time ./evidify-cli unlock-vault --passphrase "test"
# Expected: real 0m0.4s (approximately)

# Code: Verify algorithm selection
grep -n "Argon2id" src-tauri/src/crypto.rs
# Expected: Line ~35: Algorithm::Argon2id
```

---

### 2.3 Keychain Storage

**Claim:** "Keys stored in OS keychain (macOS Keychain / Windows Credential Manager)"

| Control | File | Function/Code | Line(s) |
|---------|------|---------------|---------|
| Keychain write | `src-tauri/src/keychain.rs` | `store_key()` | 34-56 |
| Keychain read | `src-tauri/src/keychain.rs` | `retrieve_key()` | 58-78 |
| Keychain delete | `src-tauri/src/keychain.rs` | `delete_key()` | 80-95 |

**Code Snippet:**
```rust
// src-tauri/src/keychain.rs:34-56
pub fn store_key(service: &str, account: &str, data: &[u8]) -> Result<()> {
    let entry = Entry::new(service, account)
        .map_err(|e| KeychainError::EntryError(e.to_string()))?;
    
    let encoded = base64::encode(data);
    entry.set_password(&encoded)
        .map_err(|e| KeychainError::StoreError(e.to_string()))?;
    
    log::info!(
        target: "evidify::keychain",
        "Stored keychain entry: service={}, account={}",
        service, account
    );
    
    Ok(())
}
```

**Verification:**
```bash
# macOS: List keychain entries
security find-generic-password -l "evidify-vault" 2>&1 | head -5
# Expected: Shows keychain entry metadata

# Windows: List credentials
cmdkey /list | findstr Evidify
# Expected: Shows Evidify credentials
```

---

### 2.4 Audit Hash Chain

**Claim:** "Tamper-evident audit log with SHA-256 hash chain"

| Control | File | Function/Code | Line(s) |
|---------|------|---------------|---------|
| Hash calculation | `src-tauri/src/audit.rs` | `calculate_entry_hash()` | 67-89 |
| Chain verification | `src-tauri/src/audit.rs` | `verify_chain_integrity()` | 145-178 |
| Entry insertion | `src-tauri/src/audit.rs` | `log_event()` | 91-120 |

**Code Snippet:**
```rust
// src-tauri/src/audit.rs:67-89
fn calculate_entry_hash(
    id: i64,
    timestamp: &str,
    event_type: &str,
    details: &str,
    previous_hash: &str,
) -> String {
    let mut hasher = Sha256::new();
    hasher.update(id.to_le_bytes());
    hasher.update(timestamp.as_bytes());
    hasher.update(event_type.as_bytes());
    hasher.update(details.as_bytes());
    hasher.update(previous_hash.as_bytes());
    
    hex::encode(hasher.finalize())
}
```

**Verification:**
```bash
# Runtime: Export audit log and verify chain
./evidify-cli verify-audit --vault vault.db
# Expected: "Audit chain integrity: VERIFIED (N entries)"

# Manual: Check chain continuity in database
sqlcipher vault.db "PRAGMA key='...'; SELECT id, previous_hash, entry_hash FROM audit_log LIMIT 5;"
# Expected: Each previous_hash matches prior entry's entry_hash
```

---

### 2.5 HMAC Per Audit Row

**Claim:** "HMAC-SHA256 per audit row for additional integrity"

| Control | File | Function/Code | Line(s) |
|---------|------|---------------|---------|
| HMAC calculation | `src-tauri/src/audit.rs` | `calculate_row_hmac()` | 122-140 |
| HMAC verification | `src-tauri/src/audit.rs` | `verify_row_hmac()` | 180-198 |
| HMAC key storage | `src-tauri/src/keychain.rs` | `get_hmac_key()` | 100-115 |

**Code Snippet:**
```rust
// src-tauri/src/audit.rs:122-140
fn calculate_row_hmac(row_data: &[u8], hmac_key: &[u8; 32]) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(hmac_key)
        .expect("HMAC can take key of any size");
    mac.update(row_data);
    
    hex::encode(mac.finalize().into_bytes())
}
```

**Verification:**
```bash
# Runtime: Verify all HMACs
./evidify-cli verify-hmacs --vault vault.db
# Expected: "HMAC verification: PASSED (N rows)"
```

---

### 2.6 No PHI in Logs

**Claim:** "Logs never contain PHI"

| Control | File | Function/Code | Line(s) |
|---------|------|---------------|---------|
| Log field restrictions | `src-tauri/src/logging.rs` | `SafeLogFields` struct | 15-35 |
| PHI filter | `src-tauri/src/logging.rs` | `filter_phi()` | 40-65 |
| Note creation logging | `src-tauri/src/note.rs` | `create_note()` log statement | 89 |

**Code Snippet:**
```rust
// src-tauri/src/note.rs:85-95
pub fn create_note(&self, title: &str, content: &str) -> Result<NoteId> {
    let note_id = Uuid::new_v4();
    
    // Log note creation WITHOUT PHI
    log::info!(
        target: "evidify::note",
        note_id = %note_id,
        title_length = title.len(),      // Length, not content
        content_length = content.len(),  // Length, not content
        "Note created"
    );
    
    // ... actual note creation
}
```

**Verification:**
```bash
# Runtime: Search logs for PHI patterns after creating note with test data
grep -iE "john smith|patient|diagnosis" ~/Library/Logs/evidify/evidify.log
# Expected: No matches

# CI: PHI lint test
cargo test test_logs_contain_no_phi
# Expected: PASSED
```

---

### 2.7 Temporary Audio Encryption

**Claim:** "Temporary audio files encrypted with AES-256-GCM"

| Control | File | Function/Code | Line(s) |
|---------|------|---------------|---------|
| Encryption | `src-tauri/src/audio.rs` | `encrypt_temp_audio()` | 45-78 |
| Decryption | `src-tauri/src/audio.rs` | `decrypt_temp_audio()` | 80-110 |
| Cleanup | `src-tauri/src/audio.rs` | `cleanup_temp_files()` | 112-130 |

**Code Snippet:**
```rust
// src-tauri/src/audio.rs:45-78
pub fn encrypt_temp_audio(audio_data: &[u8], session_key: &[u8; 32]) -> Result<Vec<u8>> {
    let nonce = generate_nonce(); // 12 random bytes
    
    let cipher = Aes256Gcm::new_from_slice(session_key)
        .map_err(|e| AudioError::CipherError(e.to_string()))?;
    
    let ciphertext = cipher.encrypt(&nonce.into(), audio_data)
        .map_err(|e| AudioError::EncryptError(e.to_string()))?;
    
    // Format: MAGIC (4) + NONCE (12) + CIPHERTEXT (N) + TAG (included in ciphertext)
    let mut output = Vec::with_capacity(4 + 12 + ciphertext.len());
    output.extend_from_slice(b"EVAU");  // Magic bytes
    output.extend_from_slice(&nonce);
    output.extend_from_slice(&ciphertext);
    
    Ok(output)
}
```

**Verification:**
```bash
# Runtime: During recording, find temp file and check format
find /tmp -name "*.enc" -newer /tmp/start_marker 2>/dev/null | head -1 | xargs xxd | head -1
# Expected: 4556 4155 (EVAU magic bytes)

# Runtime: Verify no plaintext WAV files
find /tmp -name "*.wav" -newer /tmp/start_marker 2>/dev/null
# Expected: No files found
```

---

### 2.8 Export Path Validation

**Claim:** "Exports blocked to cloud sync folders"

| Control | File | Function/Code | Line(s) |
|---------|------|---------------|---------|
| Path validation | `src-tauri/src/export.rs` | `validate_export_path()` | 23-67 |
| Cloud detection | `src-tauri/src/export.rs` | `is_cloud_sync_path()` | 69-95 |
| Policy enforcement | `src-tauri/src/export.rs` | `check_export_policy()` | 97-120 |

**Code Snippet:**
```rust
// src-tauri/src/export.rs:69-95
fn is_cloud_sync_path(path: &Path) -> bool {
    let path_str = path.to_string_lossy().to_lowercase();
    
    const BLOCKED_PATTERNS: &[&str] = &[
        "/dropbox/",
        "/google drive/",
        "/onedrive/",
        "/icloud drive/",
        "/box sync/",
        "\\dropbox\\",
        "\\google drive\\",
        "\\onedrive\\",
    ];
    
    for pattern in BLOCKED_PATTERNS {
        if path_str.contains(pattern) {
            log::warn!(
                target: "evidify::export",
                path_hash = %hash_path(path),
                "Export blocked: cloud sync path detected"
            );
            return true;
        }
    }
    
    false
}
```

**Verification:**
```bash
# Runtime: Attempt export to Dropbox (should fail)
./evidify-cli export-note --id test123 --path ~/Dropbox/test.pdf
# Expected: "Error: Export to cloud sync folders is not permitted"

# Unit test
cargo test test_export_blocks_cloud_paths
# Expected: PASSED
```

---

### 2.9 Model Integrity Verification

**Claim:** "AI models verified via SHA-256 before loading"

| Control | File | Function/Code | Line(s) |
|---------|------|---------------|---------|
| Hash verification | `src-tauri/src/model.rs` | `verify_model_integrity()` | 34-56 |
| Manifest checking | `src-tauri/src/model.rs` | `check_manifest()` | 58-78 |
| Model loading | `src-tauri/src/model.rs` | `load_model()` | 80-110 |

**Code Snippet:**
```rust
// src-tauri/src/model.rs:34-56
pub fn verify_model_integrity(model_path: &Path, expected_hash: &str) -> Result<()> {
    let mut file = File::open(model_path)?;
    let mut hasher = Sha256::new();
    
    let mut buffer = [0u8; 8192];
    loop {
        let n = file.read(&mut buffer)?;
        if n == 0 { break; }
        hasher.update(&buffer[..n]);
    }
    
    let computed = hex::encode(hasher.finalize());
    
    if computed.to_lowercase() != expected_hash.to_lowercase() {
        log::error!(
            target: "evidify::model",
            "Model integrity check FAILED: expected {}, got {}",
            expected_hash, computed
        );
        return Err(ModelError::IntegrityCheckFailed);
    }
    
    log::info!(target: "evidify::model", "Model integrity verified");
    Ok(())
}
```

**Verification:**
```bash
# Runtime: Tamper with model and attempt load
echo "tampered" >> ~/.local/share/evidify/models/ggml-base.en.bin
./evidify-cli transcribe --audio test.wav
# Expected: "Error: Model integrity check failed"

# Restore model and verify success
./evidify-cli verify-model --path ~/.local/share/evidify/models/ggml-base.en.bin
# Expected: "Model verified: ggml-base.en.bin"
```

---

### 2.10 Update Signature Verification

**Claim:** "Updates verified via Ed25519 signatures"

| Control | File | Function/Code | Line(s) |
|---------|------|---------------|---------|
| Signature verification | `src-tauri/src/update.rs` | `verify_update_signature()` | 45-78 |
| Public key (embedded) | `src-tauri/src/update_keys.rs` | `UPDATE_PUBLIC_KEY` | 5-8 |
| Manifest verification | `src-tauri/src/update.rs` | `verify_manifest()` | 80-110 |

**Code Snippet:**
```rust
// src-tauri/src/update.rs:45-78
pub fn verify_update_signature(
    manifest: &UpdateManifest,
    signature: &[u8; 64],
) -> Result<()> {
    use ed25519_dalek::{PublicKey, Signature, Verifier};
    
    let public_key = PublicKey::from_bytes(&UPDATE_PUBLIC_KEY)
        .map_err(|e| UpdateError::KeyError(e.to_string()))?;
    
    let signature = Signature::from_bytes(signature)
        .map_err(|e| UpdateError::SignatureError(e.to_string()))?;
    
    let manifest_bytes = manifest.to_canonical_bytes();
    
    public_key.verify(&manifest_bytes, &signature)
        .map_err(|_| UpdateError::SignatureVerificationFailed)?;
    
    log::info!(target: "evidify::update", "Update signature verified");
    Ok(())
}

// src-tauri/src/update_keys.rs:5-8
pub const UPDATE_PUBLIC_KEY: [u8; 32] = [
    // Actual public key bytes (replace with real key)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
];
```

**Verification:**
```bash
# Verify public key is embedded (not fetched)
strings Evidify.app/Contents/MacOS/Evidify | grep -c "ed25519"
# Expected: Non-zero (key/library references present)

# Test with tampered manifest (should fail)
./evidify-verify --manifest tampered-manifest.json --pubkey update-pubkey.pem
# Expected: "Signature verification FAILED"
```

---

## 3. Network Call Implementation

### 3.1 Update Check

| Control | File | Function/Code | Line(s) |
|---------|------|---------------|---------|
| Check trigger | `src-tauri/src/update.rs` | `check_for_updates()` | 120-145 |
| Disable via policy | `src-tauri/src/update.rs` | `is_update_check_enabled()` | 147-160 |
| Request construction | `src-tauri/src/update.rs` | `build_update_request()` | 162-180 |

**Code Snippet:**
```rust
// src-tauri/src/update.rs:162-180
fn build_update_request() -> Request {
    Request::get("https://updates.evidify.ai/v1/check")
        .header("X-App-Version", env!("CARGO_PKG_VERSION"))
        .header("X-Platform", std::env::consts::OS)
        .header("X-Arch", std::env::consts::ARCH)
        // NOTE: No user ID, no vault ID, no PHI
        .build()
}
```

**Verification:**
```bash
# Network capture during update check
tcpdump -i any -w /tmp/update.pcap host updates.evidify.ai &
./evidify-cli check-update
kill %1
strings /tmp/update.pcap | grep -v "evidify.ai" | grep -iE "patient|vault"
# Expected: No matches (no PHI in request)
```

---

## 4. CI/CD Security Gates

### 4.1 Automated Security Checks

```yaml
# .github/workflows/security.yml
name: Security Checks

on: [push, pull_request]

jobs:
  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Rust dependency audit
        run: cargo audit
      - name: Node dependency audit
        run: npm audit --production
        
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Clippy security lints
        run: cargo clippy -- -D warnings
      - name: Semgrep scan
        uses: semgrep/semgrep-action@v1
        with:
          config: p/rust-security
          
  phi-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: PHI pattern check in logs
        run: cargo test test_logs_contain_no_phi
        
  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: GitLeaks scan
        uses: gitleaks/gitleaks-action@v2
```

### 4.2 Release Gates

```yaml
# Release checklist (enforced by CI)
release_gates:
  - cargo_audit_clean: true
  - npm_audit_clean: true
  - all_tests_pass: true
  - phi_lint_pass: true
  - secrets_scan_clean: true
  - code_signed: true
  - sbom_generated: true
  - update_signed: true
```

---

## 5. Verification Checklist for Auditors

### Pre-Deployment Verification

```bash
# 1. Verify code signature
codesign --verify --deep --strict /Applications/Evidify.app

# 2. Verify SBOM matches build
shasum -a 256 sbom-v4.2.6-beta.json

# 3. Verify update signature capability
./evidify-verify --manifest sample-manifest.json --pubkey update-pubkey.pem

# 4. Run security test suite
cargo test --features security-tests

# 5. Verify no PHI in logs
./create-test-vault-with-phi.sh
grep -riE "test patient|john smith|diagnosis" ~/Library/Logs/evidify/
# Expected: No matches

# 6. Verify database encryption
sqlite3 ~/Library/Application\ Support/evidify/vault.db ".tables"
# Expected: "Error: file is not a database"

# 7. Verify network calls (packet capture)
sudo tcpdump -i any -c 100 'host updates.evidify.ai or host huggingface.co'
# Verify only expected calls
```

---

## Appendix: File Path Reference

| Component | Path |
|-----------|------|
| Main binary | `src-tauri/src/main.rs` |
| Vault/encryption | `src-tauri/src/vault.rs` |
| Cryptography | `src-tauri/src/crypto.rs` |
| Audit logging | `src-tauri/src/audit.rs` |
| Keychain | `src-tauri/src/keychain.rs` |
| Export | `src-tauri/src/export.rs` |
| Audio processing | `src-tauri/src/audio.rs` |
| Model handling | `src-tauri/src/model.rs` |
| Update system | `src-tauri/src/update.rs` |
| Logging | `src-tauri/src/logging.rs` |
| Note management | `src-tauri/src/note.rs` |
| Security module | `src-tauri/src/security.rs` |

---

*This document maps security claims to verifiable code implementations for enterprise audit purposes.*
