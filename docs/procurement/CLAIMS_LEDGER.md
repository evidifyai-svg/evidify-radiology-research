# Evidify Security Claims Ledger

**Version:** 4.1.2-hotfix2-hotfix2  
**Date:** January 8, 2026  
**Status:** Pre-release verification

This document maps each security claim to exact verification steps that can be performed by auditors, security reviewers, or procurement teams.

---

## Claim 1: PHI Never Leaves Device

**Claim:** All Protected Health Information (PHI) is processed locally. No PHI is transmitted to external servers.

### Verification Steps

#### Network Traffic Analysis (macOS)
```bash
# 1. Launch Evidify
# 2. Create vault, add client, create note with test data
# 3. Monitor network activity:

sudo lsof -i -P | grep -i evidify
# Expected: Only localhost:11434 (Ollama)

# Or use nettop for real-time monitoring:
sudo nettop -p $(pgrep -f Evidify)
```

#### Network Traffic Analysis (Windows)
```powershell
# 1. Launch Evidify
# 2. Create vault, add client, create note

# View connections:
Get-NetTCPConnection -OwningProcess (Get-Process Evidify).Id

# Expected: Only 127.0.0.1:11434
```

#### Offline Operation Test
```bash
# 1. Disconnect from network (disable WiFi, unplug ethernet)
# 2. Ensure Ollama is running locally
# 3. Launch Evidify
# 4. Create vault → Add client → Create note → Generate structured output
# 5. All operations should succeed
```

### Expected Result
- ✅ App functions identically when offline
- ✅ Only loopback connections visible (127.0.0.1:11434)
- ✅ No DNS queries or external connections

---

## Claim 2: Encrypted at Rest (AES-256)

**Claim:** All clinical data is encrypted using AES-256 via SQLCipher.

### Verification Steps

#### Database Encryption Test
```bash
# 1. Create vault with test data
# 2. Close Evidify
# 3. Attempt to read vault directly:

sqlite3 ~/Library/Application\ Support/com.evidify.app/vault.db ".tables"
# Expected: "Error: file is not a database"

# Try with hexdump:
xxd ~/Library/Application\ Support/com.evidify.app/vault.db | head -20
# Expected: Encrypted binary data, no readable text
```

#### Key Material Test
```bash
# Practical beta verification (cross-platform):
# 1) Confirm the app never logs credentials (search logs for the known test passphrase)
# 2) Confirm the vault cannot be opened with an incorrect passphrase
# 3) Confirm the database file is unreadable without SQLCipher (attempt to open with a generic SQLite client)
#
# Note: OS memory-forensics-style verification is platform-specific and not part of routine release validation.
```

### Expected Result
- ✅ vault.db is unreadable without passphrase
- ✅ No plaintext credentials in logs/support bundles

---

## Claim 3: Vault State Recovery Handling

**Claim:** System properly handles keychain loss and stale keychain states without data loss confusion.

### Verification Steps

#### KeychainLost Test (macOS)
```bash
# 1. Create vault, add data
# 2. Close Evidify
# 3. Delete keychain entry:
security delete-generic-password -s "com.evidify.vault" -a "wrapped_vault_key"
security delete-generic-password -s "com.evidify.vault" -a "kdf_salt"

# 4. Launch Evidify
# Expected: Shows "KeychainLost" recovery screen, NOT "Create Vault"
```

#### KeychainLost Test (Windows)
```powershell
# 1. Create vault, add data
# 2. Close Evidify
# 3. Delete credential:
cmdkey /delete:com.evidify.vault

# 4. Launch Evidify
# Expected: Shows "KeychainLost" recovery screen
```

#### StaleKeychain Test
```bash
# 1. Create vault
# 2. Close Evidify
# 3. Delete vault.db but keep keychain:
rm ~/Library/Application\ Support/com.evidify.app/vault.db

# 4. Launch Evidify
# Expected: Shows "StaleKeychain" cleanup screen
```

### Expected Result
- ✅ KeychainLost shows recovery options, not create flow
- ✅ StaleKeychain offers cleanup option
- ✅ User is never silently misrouted

---

## Claim 4: Export Path Safety

**Claim:** Exports to cloud-synced folders are blocked or warned.

### Verification Steps

#### Cloud Sync Detection (macOS)
```bash
# In Evidify:
# 1. Create a note
# 2. Try to export to:
#    - ~/Library/CloudStorage/Dropbox/... → Should warn/block
#    - ~/Library/Mobile Documents/... (iCloud) → Should warn/block
#    - ~/Documents/LocalFolder/ → Should allow
```

#### Cloud Sync Detection (Windows)
```powershell
# Try export to:
# - C:\Users\<you>\OneDrive\... → Should warn/block
# - C:\Users\<you>\Dropbox\... → Should warn/block
# - C:\Users\<you>\Documents\LocalOnly\ → Should allow
```

### Expected Result
- ✅ Cloud paths classified as `cloud_sync`
- ✅ User receives warning before export
- ✅ Local paths classified as `safe`

---

## Claim 5: Audit Trail Integrity

**Claim:** All actions are logged in a hash-chained audit trail that detects tampering.

### Verification Steps

#### Audit Chain Verification (via API)
```typescript
// In browser console or test code:
const result = await invoke('verify_audit_chain');
console.log(result);
// Expected: { valid: true, error: null, checked_at: <timestamp> }
```

#### Manual Tampering Test
```bash
# 1. Create vault, perform actions
# 2. Close Evidify
# 3. Attempt to modify audit_log table (will fail due to encryption)
# 4. Even if modified, chain verification should detect it
```

### Expected Result
- ✅ Fresh vault returns `valid: true`
- ✅ Any tampering returns `valid: false` with error details

---

## Claim 6: CSP Enforcement (Production)

**Claim:** Production builds have strict CSP with no dev allowances.

### Verification Steps

#### CSP Check Script
```bash
# From repo root:
./scripts/check_csp_release.sh src-tauri/tauri.conf.json
# Expected: "✅ CSP CHECK PASSED"

# Compare to dev config:
./scripts/check_csp_release.sh src-tauri/tauri.conf.dev.json
# Expected: "❌ CSP CHECK FAILED" (dev has ws:// allowances)
```

#### Runtime CSP Verification
```javascript
// In running app, open DevTools (if enabled) and check:
document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content
// Should NOT contain ws:// or localhost wildcards
```

### Expected Result
- ✅ Production config passes CSP check
- ✅ No websocket or localhost wildcards in release builds

---

## Claim 7: Loopback-Only AI Connections

**Claim:** AI model connections are restricted to loopback addresses only.

### Verification Steps

#### Code Inspection
```rust
// In src-tauri/src/ai.rs, verify:
fn validate_loopback_url(url: &str) -> Result<(), AIError> {
    // Must check host is localhost or 127.0.0.1
}
```

#### Runtime Test
```bash
# 1. Change Ollama URL to external address (if configurable)
# 2. Attempt AI operation
# Expected: Error "Must be loopback address"
```

### Expected Result
- ✅ Non-loopback URLs are rejected
- ✅ Only 127.0.0.1 or localhost accepted

---

## Verification Matrix

| Claim | Automated Check | Manual Test | Code Review |
|-------|-----------------|-------------|-------------|
| PHI local-only | ❌ | ✅ Network monitor | ✅ No network calls |
| AES-256 encryption | ❌ | ✅ sqlite3 test | ✅ SQLCipher usage |
| Vault state handling | ⚠️ Integration test | ✅ Keychain deletion | ✅ State machine |
| Export path safety | ⚠️ Unit tests | ✅ Path tests | ✅ Classifier code |
| Audit integrity | ✅ verify_audit_chain | ✅ Tamper test | ✅ Hash chain impl |
| CSP enforcement | ✅ check_csp_release.sh | ✅ DevTools | ✅ Config files |
| Loopback-only AI | ⚠️ Unit tests | ❌ | ✅ URL validation |

**Legend:**
- ✅ Available and recommended
- ⚠️ Partially available
- ❌ Not applicable or not available

---

## Procurement Checklist

For procurement teams evaluating Evidify:

- [ ] Run offline operation test
- [ ] Verify vault encryption with sqlite3
- [ ] Test keychain loss recovery flow
- [ ] Verify export path warnings
- [ ] Run CSP check script
- [ ] Review audit chain verification
- [ ] Inspect network traffic during operation

All tests should pass before procurement approval.

---

*Document version: 4.1.2-hotfix2 | Last updated: January 8, 2026*
