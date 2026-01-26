# Evidify Administrator Guide
## Enterprise Deployment & Management

**Version:** 4.2.0  
**Last Updated:** January 2026  
**Audience:** IT Administrators, Security Officers, Compliance Teams

---

# Table of Contents

1. [Deployment Overview](#1-deployment-overview)
2. [System Requirements](#2-system-requirements)
3. [Installation Methods](#3-installation-methods)
4. [Configuration Management](#4-configuration-management)
5. [Policy Management](#5-policy-management)
6. [User Management](#6-user-management)
7. [Security Controls](#7-security-controls)
8. [Monitoring & Audit](#8-monitoring--audit)
9. [Backup & Recovery](#9-backup--recovery)
10. [Troubleshooting](#10-troubleshooting)
11. [Compliance Documentation](#11-compliance-documentation)

---

# 1. Deployment Overview

## 1.1 Architecture

Evidify is a **local-first desktop application**. There is no central server.

```
┌─────────────────────────────────────────────────────────────┐
│                    CLINICIAN WORKSTATION                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Evidify   │  │   Ollama    │  │   whisper.cpp       │ │
│  │   Desktop   │  │ (localhost) │  │   (optional)        │ │
│  │   App       │  │   :11434    │  │                     │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘ │
│         │                │                                   │
│         └────────────────┴───────────────┐                  │
│                                          ▼                  │
│  ┌────────────────────────────────────────────────────────┐│
│  │              Encrypted Vault (SQLCipher)               ││
│  │              ~/Library/Application Support/            ││
│  │              com.evidify.app/vault.db                  ││
│  └────────────────────────────────────────────────────────┘│
│                                          │                  │
│                                          ▼                  │
│  ┌────────────────────────────────────────────────────────┐│
│  │              OS Keychain (KEK Storage)                 ││
│  │              macOS Keychain / Windows DPAPI            ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 1.2 Data Flow

**All data stays local**:
- PHI never transmitted over network
- AI processing via localhost Ollama
- No cloud dependencies for core functionality

**Optional network features** (enterprise tier):
- Policy sync (PHI-minimal)
- SIEM log forwarding (PHI-impossible)
- License verification

## 1.3 Deployment Models

| Model | Description | Use Case |
|-------|-------------|----------|
| **Standalone** | Individual installation, no central management | Solo practitioners |
| **Managed** | MDM-deployed with policy bundles | Group practices |
| **Enterprise** | Full MDM + SIEM + centralized policies | Health systems |

---

# 2. System Requirements

## 2.1 Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores, x64 | 8+ cores, Apple Silicon or x64 |
| RAM | 8 GB | 16 GB (32 GB for large models) |
| Storage | 10 GB available | 50 GB SSD |
| Display | 1280x720 | 1920x1080+ |

## 2.2 Operating System

| OS | Minimum Version | Notes |
|----|-----------------|-------|
| macOS | 12.0 (Monterey) | Apple Silicon native |
| Windows | 10 (21H2) | x64 only |

## 2.3 Prerequisites

| Component | Required | Purpose |
|-----------|----------|---------|
| Ollama | Yes (for AI features) | Local LLM runtime |
| whisper.cpp | Optional | Voice transcription |
| ffmpeg | Optional | Audio format conversion |

### Installation Commands (macOS)

```bash
# Homebrew (package manager)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Ollama
brew install ollama
ollama serve &
ollama pull qwen2.5:7b-instruct

# Voice Scribe (optional)
brew install whisper-cpp ffmpeg
mkdir -p ~/whisper-models
curl -L -o ~/whisper-models/ggml-base.en.bin \
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin'
```

### Installation Commands (Windows)

```powershell
# Ollama - download from https://ollama.ai/download/windows
# Run installer, then:
ollama serve
ollama pull qwen2.5:7b-instruct

# whisper.cpp - build from source or use pre-built binaries
# ffmpeg - download from https://ffmpeg.org/download.html
```

---

# 3. Installation Methods

## 3.1 Manual Installation

### macOS

1. Download `Evidify.dmg` from distribution channel
2. Mount DMG, drag to Applications
3. First launch: Right-click → Open (for unsigned builds)

### Windows

1. Download `Evidify-Setup.msi`
2. Run installer with admin privileges
3. Follow installation wizard

## 3.2 MDM Deployment (Enterprise)

### Jamf Pro (macOS)

1. **Upload Package**
   - Upload `Evidify-Enterprise.pkg` to Jamf Admin
   - Package includes app + default config + policy bundle

2. **Create Policy**
   ```
   General: "Deploy Evidify"
   Trigger: Enrollment Complete, Recurring Check-in
   Frequency: Once per computer
   
   Packages: Evidify-Enterprise.pkg
   
   Scripts: 
   - Priority: After
   - Script: evidify-postinstall.sh
   ```

3. **Configuration Profile** (optional)
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" ...>
   <plist version="1.0">
   <dict>
       <key>PayloadContent</key>
       <array>
           <dict>
               <key>PayloadType</key>
               <string>com.evidify.app</string>
               <key>AutoLockMinutes</key>
               <integer>15</integer>
               <key>ClipboardClearSeconds</key>
               <integer>30</integer>
               <key>ExportCloudSyncAction</key>
               <string>Block</string>
           </dict>
       </array>
   </dict>
   </plist>
   ```

### Microsoft Intune (Windows)

1. **Package Application**
   - Convert MSI to .intunewin using IntuneWinAppUtil
   - Upload to Intune

2. **App Configuration**
   ```
   Name: Evidify
   Type: Windows app (Win32)
   Package file: Evidify.intunewin
   
   Install command: msiexec /i "Evidify.msi" /qn
   Uninstall command: msiexec /x {PRODUCT-GUID} /qn
   
   Detection rule: File exists
   Path: %ProgramFiles%\Evidify\Evidify.exe
   ```

3. **Deploy Policy Bundle**
   - Copy `policy.json` to `%APPDATA%\com.evidify.app\`

## 3.3 Silent Installation

### macOS
```bash
# Install package silently
sudo installer -pkg Evidify-Enterprise.pkg -target /

# Copy configuration
cp policy.json ~/Library/Application\ Support/com.evidify.app/

# Copy default config
cp config.json ~/Library/Application\ Support/com.evidify.app/
```

### Windows
```powershell
# Install MSI silently
msiexec /i Evidify.msi /qn /norestart

# Copy configuration
Copy-Item policy.json "$env:APPDATA\com.evidify.app\"
Copy-Item config.json "$env:APPDATA\com.evidify.app\"
```

---

# 4. Configuration Management

## 4.1 Configuration File Location

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/com.evidify.app/config.json` |
| Windows | `%APPDATA%\com.evidify.app\config.json` |

## 4.2 Configuration Schema

```json
{
  "version": "1.0",
  "app": {
    "auto_lock_minutes": 15,
    "theme": "system",
    "language": "en"
  },
  "clipboard": {
    "auto_clear_seconds": 30,
    "audit_clipboard_events": true
  },
  "ai": {
    "ollama_endpoint": "http://127.0.0.1:11434",
    "default_model": "qwen2.5:7b-instruct",
    "timeout_seconds": 120
  },
  "voice": {
    "models_directory": "~/whisper-models",
    "default_model": "ggml-base.en.bin",
    "auto_delete_audio": true
  },
  "export": {
    "default_format": "pdf",
    "warn_cloud_sync": true,
    "block_cloud_sync": false
  },
  "audit": {
    "retention_days": 3650,
    "siem_forwarding": false,
    "siem_endpoint": null
  }
}
```

## 4.3 Configuration Precedence

1. **Policy bundle** (highest priority)
2. **User configuration**
3. **Default values** (lowest priority)

Policies cannot be overridden by user configuration.

---

# 5. Policy Management

## 5.1 Policy File Location

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/com.evidify.app/policy.json` |
| Windows | `%APPDATA%\com.evidify.app\policy.json` |

## 5.2 Policy Schema

```json
{
  "id": "org-policy-001",
  "version": "1.0.0",
  "organization": "Example Health System",
  "effective_date": "2026-01-01T00:00:00Z",
  "expires_at": "2027-01-01T00:00:00Z",
  "signed_by": "admin@example.org",
  "signature": "base64-signature-here",
  
  "export_policy": {
    "cloud_sync": "Block",
    "network_share": "Warn",
    "removable_media": "Warn",
    "unknown_destination": "Warn",
    "audit_pack_required_above": 10,
    "allowed_formats": ["pdf", "docx"],
    "blocked_paths": []
  },
  
  "attestation_policy": {
    "required_attestations": [
      "safety-si-direct",
      "safety-hi-threat",
      "safety-abuse-child",
      "safety-duty-warn"
    ],
    "supervisor_review_required": "high",
    "allow_not_relevant": true,
    "require_explanation_for_not_relevant": true
  },
  
  "recording_policy": {
    "consent_required": true,
    "auto_delete_audio_after_signing": true,
    "max_audio_retention_days": 1
  },
  
  "supervision_policy": {
    "cosign_required_for": ["Intern", "Trainee", "Postdoc"],
    "max_review_delay_hours": 72,
    "review_high_risk_notes": true
  },
  
  "retention_policy": {
    "minimum_retention_days": 2555,
    "audit_log_retention_days": 3650
  }
}
```

## 5.3 Policy Enforcement

Policies are enforced locally even when offline:
- Export destination checks
- Attestation requirements
- Recording consent
- Supervision co-signature

## 5.4 Policy Distribution

### Option 1: MDM Pre-configuration
Include `policy.json` in deployment package.

### Option 2: Policy Sync (Enterprise)
Enable policy sync for over-the-air updates:
```json
{
  "policy_sync": {
    "enabled": true,
    "endpoint": "https://policy.example.org/evidify",
    "check_interval_hours": 24
  }
}
```

---

# 6. User Management

## 6.1 Single-User Model

Evidify uses a single-vault-per-installation model:
- Each workstation has one vault
- One clinician per vault
- Multi-user requires separate OS accounts

## 6.2 Shared Workstation Deployment

For shared workstations (clinic computers):

1. **Separate OS accounts** for each clinician
2. Each account has its own vault
3. Vaults are isolated (different encryption keys)

```bash
# Vault locations per user
/Users/clinician1/Library/Application Support/com.evidify.app/vault.db
/Users/clinician2/Library/Application Support/com.evidify.app/vault.db
```

## 6.3 Role-Based Access (Within Vault)

| Role | Permissions |
|------|-------------|
| Clinician | Full access to own notes |
| Supervisor | Review queue, co-sign, annotations |
| Admin | Policy configuration, audit review |

---

# 7. Security Controls

## 7.1 Encryption

| Layer | Implementation |
|-------|----------------|
| Vault database | SQLCipher (AES-256-CBC) |
| Key derivation | Argon2id (memory-hard) |
| Key storage | OS Keychain (DPAPI on Windows) |
| Network (optional features) | TLS 1.3 |

## 7.2 Authentication

- Passphrase-based vault unlock
- No central authentication
- Auto-lock on inactivity (configurable)

## 7.3 Export Controls

Configure via policy:
```json
{
  "export_policy": {
    "cloud_sync": "Block",      // Block export to iCloud/OneDrive/Dropbox
    "network_share": "Warn",    // Warn on network shares
    "removable_media": "Warn"   // Warn on USB drives
  }
}
```

## 7.4 Network Security

**Default behavior**: No network egress for PHI

**Localhost only**:
- Ollama: `127.0.0.1:11434`
- No external API calls

**Verify with network monitor**:
```bash
# macOS: Monitor Evidify network activity
sudo tcpdump -i any -n 'host not 127.0.0.1' and proc = Evidify
# Should show no traffic
```

## 7.5 Audit Logging

All security-relevant events logged:
- Vault unlock/lock
- Note create/update/sign
- Export attempts
- Attestations
- Policy changes

Logs are:
- Hash-chained (tamper-evident)
- PHI-free (event types only)
- Exportable to SIEM (enterprise)

---

# 8. Monitoring & Audit

## 8.1 Local Audit Log

Access via CLI:
```bash
evidify --verify-audit
# Output:
# Audit Chain Verification
# ========================
# Entries: 1,234
# First: 2026-01-01T00:00:00Z
# Last: 2026-01-15T14:30:00Z
# Status: VERIFIED
# No gaps detected
```

## 8.2 SIEM Integration (Enterprise)

Configure log forwarding:
```json
{
  "audit": {
    "siem_forwarding": true,
    "siem_endpoint": "https://splunk.example.org:8088/services/collector",
    "siem_token": "HEC-token-here",
    "siem_format": "splunk"
  }
}
```

**Supported SIEM formats**:
- Splunk HEC
- Azure Sentinel
- Generic JSON

**Log schema** (PHI-impossible):
```json
{
  "timestamp": "2026-01-15T14:30:00Z",
  "event_type": "note.signed",
  "outcome": "success",
  "device_id": "sha256-hash",
  "user_id": "sha256-hash",
  "resource_type": "note",
  "resource_id": "uuid"
}
```

## 8.3 Compliance Dashboard

Enterprise tier includes compliance dashboard:
- Policy compliance rate
- Attestation completion
- Co-signature timeliness
- Export audit trail

---

# 9. Backup & Recovery

## 9.1 Backup Strategy

**What to back up**:
```
~/Library/Application Support/com.evidify.app/
├── vault.db          # Encrypted database (CRITICAL)
├── config.json       # User configuration
└── policy.json       # Policy bundle
```

**Backup frequency**: Daily recommended

**Backup destinations**:
- Encrypted external drive
- Enterprise backup system
- NOT: Cloud sync folders (use encrypted container)

## 9.2 Backup Script

```bash
#!/bin/bash
# evidify-backup.sh

EVIDIFY_DIR="$HOME/Library/Application Support/com.evidify.app"
BACKUP_DIR="/Volumes/BackupDrive/evidify-backups"
DATE=$(date +%Y%m%d)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Copy vault (already encrypted)
cp "$EVIDIFY_DIR/vault.db" "$BACKUP_DIR/vault-$DATE.db"

# Copy config
cp "$EVIDIFY_DIR/config.json" "$BACKUP_DIR/config-$DATE.json"

# Verify
if [ -f "$BACKUP_DIR/vault-$DATE.db" ]; then
    echo "Backup successful: vault-$DATE.db"
else
    echo "Backup FAILED"
    exit 1
fi
```

## 9.3 Recovery Procedure

1. **Install Evidify** on new/restored device
2. **Copy vault.db** to app data directory
3. **Launch Evidify** and unlock with original passphrase

```bash
# Recovery commands
EVIDIFY_DIR="$HOME/Library/Application Support/com.evidify.app"
mkdir -p "$EVIDIFY_DIR"
cp /path/to/backup/vault.db "$EVIDIFY_DIR/"
# Launch Evidify and enter passphrase
```

## 9.4 Disaster Recovery

**Scenario**: Device lost/stolen

1. Vault remains encrypted (AES-256)
2. Without passphrase, data is inaccessible
3. Restore from backup to new device
4. Consider: Remote wipe via MDM if available

**Scenario**: Passphrase forgotten

- **No recovery possible** by design
- Must create new vault
- Previous data inaccessible

## 9.5 Offboarding Procedure

When clinician leaves organization:

1. **Export** required notes per retention policy
2. **Verify** export completeness
3. **Delete** vault file
4. **Remove** Keychain entry
5. **Document** destruction

```bash
# Offboarding script
EVIDIFY_DIR="$HOME/Library/Application Support/com.evidify.app"

# 1. Export notes first (manual step)

# 2. Delete vault
rm -f "$EVIDIFY_DIR/vault.db"

# 3. Remove keychain entry
security delete-generic-password -s "com.evidify.vault" 2>/dev/null

# 4. Remove config
rm -rf "$EVIDIFY_DIR"

# 5. Uninstall app
rm -rf /Applications/Evidify.app

echo "Offboarding complete"
```

---

# 10. Troubleshooting

## 10.1 Installation Issues

### macOS Gatekeeper Blocks App

**Cause**: App not notarized (development builds)

**Solution**:
```bash
# Remove quarantine attribute
xattr -d com.apple.quarantine /Applications/Evidify.app
```

### Windows SmartScreen Warning

**Cause**: App not code-signed with EV certificate

**Solution**: Click "More info" → "Run anyway"

## 10.2 Ollama Connection Issues

**Symptoms**: "Cannot connect to Ollama" error

**Diagnostic**:
```bash
# Check if Ollama is running
curl http://127.0.0.1:11434/api/version

# Check if model is available
ollama list | grep qwen2.5
```

**Solutions**:
1. Start Ollama: `ollama serve`
2. Pull model: `ollama pull qwen2.5:7b-instruct`
3. Check firewall isn't blocking localhost

## 10.3 Vault Issues

### Vault Won't Unlock

**Diagnostic**:
1. Check passphrase (caps lock, keyboard layout)
2. Check vault file exists and isn't corrupted

**If vault corrupted**:
```bash
# Check file integrity
file "$HOME/Library/Application Support/com.evidify.app/vault.db"
# Should show: SQLite 3.x database

# If corrupted, restore from backup
```

### Keychain Access Issues

**macOS**:
```bash
# Check keychain entry
security find-generic-password -s "com.evidify.vault"

# Reset if problematic
security delete-generic-password -s "com.evidify.vault"
# Will require re-entering passphrase
```

## 10.4 Performance Issues

### Slow AI Responses

**Causes**:
- Model too large for available RAM
- CPU thermal throttling
- Other processes competing

**Solutions**:
1. Use smaller model (7B instead of 13B)
2. Close other applications
3. Check Activity Monitor for CPU/memory usage

### Large Vault Slowdown

**Cause**: Many clients/notes (thousands)

**Solutions**:
1. Archive inactive clients
2. Ensure SSD storage (not HDD)
3. Consider archiving old data

---

# 11. Compliance Documentation

## 11.1 HIPAA Mapping

| HIPAA Requirement | Evidify Implementation |
|-------------------|------------------------|
| Access Control (164.312(a)(1)) | Passphrase + Argon2id |
| Audit Controls (164.312(b)) | Hash-chained audit log |
| Integrity (164.312(c)(1)) | Tamper-evident storage |
| Transmission Security (164.312(e)(1)) | No PHI transmission |
| Encryption (164.312(a)(2)(iv)) | AES-256 via SQLCipher |

## 11.2 Security Questionnaire Responses

**Q: Where is data stored?**
A: Locally on clinician's device only. No cloud storage.

**Q: Is data encrypted?**
A: Yes, AES-256-CBC via SQLCipher. Keys derived using Argon2id.

**Q: What data is transmitted?**
A: By default, none. Optional policy sync uses PHI-minimal data only.

**Q: Who has access to PHI?**
A: Only the clinician with the vault passphrase. No vendor access.

**Q: Is there a BAA requirement?**
A: Typically not required since PHI doesn't leave the device. Consult legal.

## 11.3 Audit Evidence Package

For compliance audits, Evidify can generate:

1. **Architecture diagram** (local-only data flow)
2. **Encryption documentation** (algorithms, key management)
3. **Audit log export** (tamper-evident, PHI-free)
4. **Policy configuration** (current settings)
5. **SBOM** (software bill of materials)

Generate via: **Tools → Generate Compliance Package**

---

# Appendix A: CLI Reference

```bash
# Verify audit chain
evidify --verify-audit

# Export audit log (PHI-free)
evidify --export-audit --format json --output audit.json

# Check voice status
evidify --voice-status

# Generate diagnostic bundle (PHI-impossible)
evidify --diagnostic-bundle --output diag.json
```

---

# Appendix B: File Locations

| File | macOS | Windows |
|------|-------|---------|
| Vault | `~/Library/Application Support/com.evidify.app/vault.db` | `%APPDATA%\com.evidify.app\vault.db` |
| Config | `~/Library/Application Support/com.evidify.app/config.json` | `%APPDATA%\com.evidify.app\config.json` |
| Policy | `~/Library/Application Support/com.evidify.app/policy.json` | `%APPDATA%\com.evidify.app\policy.json` |
| Logs | `~/Library/Logs/com.evidify.app/` | `%LOCALAPPDATA%\com.evidify.app\logs\` |

---

*This guide is part of the Evidify Enterprise Documentation. For questions, contact enterprise@evidify.ai*
