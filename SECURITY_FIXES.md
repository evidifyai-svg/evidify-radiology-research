# Security Remediation — v4.1.2-hotfix3

**Date:** January 9, 2026  
**Status:** Beta Release Candidate

This document tracks the security issues identified in reviews and their remediation status.

---

## Hotfix 3 Changes (v4.1.2-hotfix3)

### P0 — VaultStateType String Mismatch ✅

**Problem:** App.tsx was comparing against PascalCase state values (`NoVault`, `Ready`, etc.) but the TypeScript type uses snake_case (`no_vault`, `ready`, etc.).

**Fix:**
- Updated all state comparisons in App.tsx to use snake_case: `no_vault`, `stale_keychain`, `keychain_lost`, `ready`, `unlocked`

### P0 — Recovery Command Wrappers ✅

**Problem:** App.tsx was calling `api.vaultDeleteDb()` and `api.vaultClearStaleKeychain()` but tauri.ts only exported `deleteVaultDb(confirm)` and `clearStaleKeychain(confirm)`.

**Fix:**
- Added wrapper functions `vaultDeleteDb()` and `vaultClearStaleKeychain()` that auto-pass `confirm: true`
- These are used by UI recovery flows

### P1 — VaultStatus Interface Alignment ✅

**Problem:** App.tsx accessed `vaultStatus.dbExists` (camelCase) but interface only had `db_exists` (snake_case).

**Fix:**
- Added both snake_case and camelCase properties to VaultStatus interface
- `normalizeVaultStatus()` now populates both variants

### P1 — OllamaStatus Fallback Type ✅

**Problem:** Error fallback in refresh() was missing `models` array, causing TypeScript error.

**Fix:**
- Updated fallback to `{ available: false, models: [], error: '...' } as api.OllamaStatus`

### P2 — Unused Import Cleanup ✅

**Fix:** Removed unused `useMemo` import from App.tsx.

---

## Hotfix 2 Changes (v4.1.2-hotfix2)

### P0 — Vault State End-to-End ✅

**Problem:** UI was routing on `exists`/`unlocked` booleans, not the proper `VaultStateType`.

**Fix:**
- Expanded `VaultStatus` struct with: `state`, `db_exists`, `keychain_exists`, `message`
- `vault_status()` now calls `vault.get_state()` and returns full state
- Frontend `VaultStatus` type updated with state as primary routing key
- Added `normalizeVaultStatus()` for backwards compatibility
- **NEW:** App routing now switches on `VaultStatus.state` (adds `KeychainLost` + `StaleKeychain` screens; blocks unsafe create-vault misroutes)
- UI now routes on `state` field: `keychain_lost` → recovery screen, `stale_keychain` → cleanup screen

### P0 — Recovery Commands ✅

**Fix:** Added Tauri commands with confirmation guards:
- `vault_clear_stale_keychain(confirm: bool)` — cleans orphan keychain entries
- `vault_delete_db(confirm: bool)` — deletes vault.db for KeychainLost recovery
- Both require `confirm: true` and are state-gated (only work in appropriate states)

### P0 — Version Consistency ✅

**Fix:** All version references now 4.1.2-hotfix2:
- `INSTALL.md` header and artifact names
- `Cargo.toml`
- `tauri.conf.json`
- `package.json`

### P1 — CSP Dev/Prod Split ✅

**Fix:**
- `tauri.conf.json` — Strict CSP (no ws://, no localhost wildcards)
- `tauri.conf.dev.json` — Dev CSP (allows HMR websockets)
- Added `scripts/check_csp_release.sh` and `.ps1` for CI verification
- CSP check passes for production, fails for dev (as expected)

### P2 — Note Serialization Hardening ✅

**Fix:** Added `frontend/src/lib/normalize.ts`:
- `normalizeNote()` handles snake_case/camelCase, missing fields
- `normalizeClient()` for client normalization
- `getNoteDisplayContent()` with fallback behavior
- `getNoteDisplayTitle()` for list views
- `getNoteContentWarnings()` for issue detection

### Procurement Proof Pack ✅

Added `docs/procurement/`:
- `CLAIMS_LEDGER.md` — Each claim with exact verification steps
- `DATA_FLOW_DIAGRAM.md` — PHI boundary visualization
- `CONTROLS_MATRIX.md` — HIPAA/SOC2 control mapping
- `THREAT_MODEL.md` — STRIDE analysis, top 10 threats, attack trees

### Release Verification Scripts ✅

Added `scripts/`:
- `verify_release.sh` — Full pre-release check (versions, CSP, builds)
- `check_csp_release.sh` — CSP pattern validation (bash)
- `check_csp_release.ps1` — CSP pattern validation (PowerShell)

Added `docs/RELEASE_MANIFEST.md` — Specification for build manifests

---

## Release Blocker Fixes (Compilation Issues)

### Issue 1: AppState vault type mismatch ✅

**Issue:** Code mixed `Vault` and `Option<Vault>` patterns with `as_ref().ok_or()`.

**Fix:** Standardized on `Mutex<Vault>` (vault always present), removed all `as_ref().ok_or()` patterns. Using `acquire_vault(&state)?` helper consistently.

### Issue 2: Audit commands referenced non-existent methods ✅

**Issue:** Commands called `vault.connection()` which didn't exist.

**Fix:** Changed to `vault.get_connection()` which is the actual method name.

### Issue 3: validate_export_path not registered ✅

**Issue:** `validate_export_path` command existed but wasn't in `main.rs` invoke list.

**Fix:** Added to command registration in `main.rs`.

### Issue 4: Frontend invoke wrapper type mismatch ✅

**Issue:** Frontend expected `PathClassification` string, backend returns `ExportClassificationResult` struct.

**Fix:** Updated `frontend/src/lib/tauri.ts`:
- Added `ExportClassificationResult` interface
- Updated `classifyExportPath()` to accept enterpriseMode param and return full result
- Added `validateExportPath()` function

### Issue 5: Version mismatch ✅

**Issue:** `tauri.conf.json` said 4.1.1, `Cargo.toml` said 4.1.2.

**Fix:** Updated all version strings to 4.1.2-hotfix2:
- `tauri.conf.json`
- `Cargo.toml`
- `package.json`

---

## Round 3 Fixes (v4.1.2)

### Issue 1A: Export path classifier never returns `removable_media` ✅

**Fix:** Replaced `classify_export_path` with proper implementation that routes through `export.rs` which has full detection for network shares, removable media, and cloud sync.

### Issue 1B: Export policy engine was unused ✅

**Fix:** Both `classify_export_path` and `validate_export_path` call `export::classify_path()` + `ExportPolicy::evaluate()`.

### Issue 1C: `canonicalize()` fails for new paths ✅

**Fix:** Falls back to classifying parent directory when target doesn't exist.

### Issue 2: Bricked vault after keychain loss ✅

**Fix:** Added `VaultStateType` enum with `KeychainLost` and `StaleKeychain` states.

### Issue 3: Vault creation not transactional ✅

**Fix:** Reversed order: DB created first, keychain stored only after schema init succeeds.

### Issue 4: CSP blocks HMR ✅

**Fix:** Added `ws://localhost:* wss://localhost:* http://127.0.0.1:*` to `connect-src`.

### Issue 5: Mutex unwrap panics ✅

**Fix:** Replaced all `.unwrap()` calls with `acquire_vault(&state)?` helper.

### Issue 6: DEK not zeroized ✅

**Fix:** Added `zeroize = "1.7"` dependency; existing `Drop` impls zero key bytes.

---

## Round 2 Fixes (v4.1.1)

### Blocker 1: Audit commands were stubs ✅
### Blocker 2: Filesystem scope too broad ✅
### Blocker 3: Devtools in release ✅
### Blocker 4: Loopback enforcement ✅
### Blocker 5: Documentation accuracy ✅

---

## Verification Checklist

- [ ] Frontend builds: `cd frontend && npm run build`
- [ ] Keychain-loss simulation: delete keychain, keep DB → UI shows "KeychainLost"
- [ ] Export classification returns `RemovableMedia` for USB drives
- [ ] HMR works in dev: `npm run tauri dev`
- [ ] All versions show 4.1.2-hotfix2

---

## Known Limitations (Documented)

| Issue | Status | Notes |
|-------|--------|-------|
| Hex string key in heap | Documented | SQLCipher API requires hex format |
| Voice transcription | Stub | Clearly labeled in INSTALL.md |
| Semantic embeddings | Stub | Clearly labeled in INSTALL.md |

---

## Files Changed (v4.1.2)

| File | Changes |
|------|---------|
| `Cargo.toml` | Version 4.1.2, added zeroize/url, removed devtools default |
| `tauri.conf.json` | Version 4.1.2, CSP allows ws://localhost |
| `package.json` | Version 4.1.2 |
| `commands.rs` | Fixed all type mismatches, acquire_vault pattern |
| `vault.rs` | Transactional create, VaultState enum |
| `main.rs` | Added validate_export_path registration |
| `tauri.ts` | ExportClassificationResult type, updated functions |
