# Release Manifest Specification

**Version:** 1.0  
**Date:** January 8, 2026

---

## Overview

Every Evidify build includes a `release_manifest.json` file embedded in the application resources. This manifest provides verifiable build metadata for:

- Version verification
- Security auditing
- Support troubleshooting
- Procurement compliance

---

## Manifest Schema

```json
{
  "schema_version": 1,
  "app_version": "4.1.2-hotfix2",
  "git_sha": "abc123def456...",
  "git_branch": "main",
  "build_date": "2026-01-08T22:00:00Z",
  "build_number": 42,
  "os_target": "macos-aarch64",
  "csp_mode": "PROD",
  "feature_flags": {
    "voice_transcription": false,
    "semantic_search": false,
    "peer_consultation": false,
    "devtools": false
  },
  "dependencies": {
    "tauri": "1.5.x",
    "sqlcipher": "4.5.x",
    "ollama_min_version": "0.1.0"
  },
  "signatures": {
    "macos_notarized": true,
    "windows_signed": false
  }
}
```

---

## Field Definitions

### Core Fields

| Field | Type | Description |
|-------|------|-------------|
| `schema_version` | integer | Manifest format version (currently 1) |
| `app_version` | string | Semantic version matching Cargo.toml/package.json |
| `git_sha` | string | Full 40-character commit SHA |
| `git_branch` | string | Branch name at build time |
| `build_date` | string | ISO 8601 timestamp (UTC) |
| `build_number` | integer | Monotonic CI build number |
| `os_target` | string | Target triple (e.g., `macos-aarch64`, `windows-x86_64`) |
| `csp_mode` | string | `PROD` or `DEV` - must be `PROD` for releases |

### Feature Flags

| Flag | Description |
|------|-------------|
| `voice_transcription` | Whisper integration enabled |
| `semantic_search` | Local embedding model enabled |
| `peer_consultation` | Consultation network enabled |
| `devtools` | Tauri devtools included in build |

### Dependencies

Minimum versions of critical dependencies for compatibility verification.

### Signatures

| Field | Description |
|-------|-------------|
| `macos_notarized` | Apple notarization completed |
| `windows_signed` | Authenticode signature present |

---

## Build-Time Generation

### Rust Build Script (build.rs)

```rust
use std::process::Command;
use std::fs;

fn main() {
    // Get git info
    let git_sha = Command::new("git")
        .args(["rev-parse", "HEAD"])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "unknown".to_string());
    
    let git_branch = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "unknown".to_string());
    
    // Determine CSP mode
    let csp_mode = if cfg!(debug_assertions) { "DEV" } else { "PROD" };
    
    // Generate manifest
    let manifest = format!(r#"{{
  "schema_version": 1,
  "app_version": "{}",
  "git_sha": "{}",
  "git_branch": "{}",
  "build_date": "{}",
  "os_target": "{}",
  "csp_mode": "{}"
}}"#,
        env!("CARGO_PKG_VERSION"),
        git_sha,
        git_branch,
        chrono::Utc::now().to_rfc3339(),
        std::env::var("TARGET").unwrap_or_else(|_| "unknown".to_string()),
        csp_mode
    );
    
    // Write to resources
    let out_dir = std::env::var("OUT_DIR").unwrap();
    fs::write(format!("{}/release_manifest.json", out_dir), manifest).unwrap();
    
    // Embed as environment variable
    println!("cargo:rustc-env=RELEASE_MANIFEST={}", manifest);
}
```

### Frontend Access

The manifest should be exposed via a Tauri command:

```rust
#[tauri::command]
pub fn get_release_manifest() -> String {
    include_str!(concat!(env!("OUT_DIR"), "/release_manifest.json")).to_string()
}
```

---

## Runtime Verification

### In-App Display

The "About" or "Diagnostics" screen should display:

```
Evidify v4.1.2-hotfix2
Build: abc123d (main)
Date: 2026-01-08
CSP: PROD ✓
Signed: Yes (macOS) ✓
```

### Procurement Verification

Auditors can verify the manifest matches claims:

1. Open app → About/Diagnostics
2. Confirm `csp_mode` is `PROD`
3. Confirm `git_sha` matches expected release tag
4. Confirm `app_version` matches documentation

---

## CI Integration

### GitHub Actions Example

```yaml
- name: Generate manifest
  run: |
    echo '{
      "app_version": "${{ github.ref_name }}",
      "git_sha": "${{ github.sha }}",
      "build_date": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
      "csp_mode": "PROD"
    }' > src-tauri/resources/release_manifest.json

- name: Verify CSP mode
  run: |
    CSP_MODE=$(jq -r '.csp_mode' src-tauri/resources/release_manifest.json)
    if [ "$CSP_MODE" != "PROD" ]; then
      echo "ERROR: CSP mode is not PROD"
      exit 1
    fi
```

---

## Validation Checklist

Before release, verify:

- [ ] `app_version` matches Cargo.toml, package.json, tauri.conf.json
- [ ] `csp_mode` is `PROD`
- [ ] `git_sha` matches release tag
- [ ] `devtools` feature flag is `false`
- [ ] Signatures are present for target platform

---

*Specification version: 1.0 | Last updated: January 8, 2026*
