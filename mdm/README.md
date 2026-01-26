# Evidify MDM Deployment Guide

## Overview

This guide covers deploying Evidify to managed devices using:
- **macOS**: Jamf Pro, Mosyle, Kandji
- **Windows**: Microsoft Intune, SCCM

Evidify's local-first architecture means **no PHI is transmitted during deployment**. MDM is used only for:
- App distribution
- Policy configuration
- Feature flags
- Update management

---

## Jamf Pro (macOS)

### Prerequisites

1. Jamf Pro account with admin access
2. Signed Evidify.app (notarized .dmg or .pkg)
3. Apple Developer certificate for profile signing (optional)

### Step 1: Upload Evidify Package

1. Go to **Settings > Computer Management > Packages**
2. Click **New**
3. Upload `Evidify-4.2.0.pkg` or `.dmg`
4. Set category: "Clinical Applications"

### Step 2: Deploy Configuration Profile

1. Go to **Computers > Configuration Profiles**
2. Click **New**
3. Upload `evidify-config.mobileconfig`
4. **Or** create manually:
   - Add "Custom Settings" payload
   - Preference Domain: `ai.evidify`
   - Upload the plist content

### Step 3: Create Policy

1. Go to **Computers > Policies**
2. Create new policy:
   - **General**: Name = "Install Evidify"
   - **Packages**: Add Evidify package
   - **Scripts**: Add `postinstall.sh`
   - **Scope**: Target computers or groups

### Step 4: Privacy Permissions (PPPC)

The configuration profile includes TCC payloads for:
- **Microphone**: Voice Scribe requires mic access
- **Accessibility**: Clipboard monitoring (optional)

If using a separate PPPC profile:

```xml
<key>Microphone</key>
<array>
    <dict>
        <key>Identifier</key>
        <string>ai.evidify</string>
        <key>IdentifierType</key>
        <string>bundleID</string>
        <key>Allowed</key>
        <true/>
    </dict>
</array>
```

### Step 5: Verify Deployment

```bash
# Check installation
ls -la /Applications/Evidify.app

# Check policy
cat ~/Library/Application\ Support/ai.evidify/policy.json

# Check logs
tail -f /var/log/evidify-install.log
```

---

## Microsoft Intune (Windows)

### Prerequisites

1. Intune admin access
2. Signed Evidify installer (.msi, .exe, or .msix)
3. Microsoft Win32 Content Prep Tool (for .intunewin)

### Step 1: Prepare Package

#### Option A: Win32 App (.intunewin)

```powershell
# Download Microsoft Win32 Content Prep Tool
# https://github.com/microsoft/Microsoft-Win32-Content-Prep-Tool

# Create package structure
mkdir EvidifyPackage
copy Evidify-4.2.0.exe EvidifyPackage\
copy Install-Evidify.ps1 EvidifyPackage\
copy policy.json EvidifyPackage\

# Create .intunewin
IntuneWinAppUtil.exe -c .\EvidifyPackage -s Evidify-4.2.0.exe -o .\Output
```

#### Option B: PowerShell Script

Deploy `Install-Evidify.ps1` directly via Intune Scripts.

### Step 2: Create Win32 App

1. Go to **Apps > Windows > Add > Windows app (Win32)**
2. Upload the `.intunewin` file
3. Configure:

| Setting | Value |
|---------|-------|
| Name | Evidify |
| Publisher | Evidify Inc |
| Install command | `powershell.exe -ExecutionPolicy Bypass -File Install-Evidify.ps1` |
| Uninstall command | `powershell.exe -ExecutionPolicy Bypass -File Install-Evidify.ps1 -Uninstall` |
| Install behavior | User |
| Device restart | No |

4. Detection rules:
   - **Rule type**: File
   - **Path**: `%LOCALAPPDATA%\Evidify`
   - **File**: `Evidify.exe`
   - **Detection method**: File or folder exists

5. Assignments:
   - Target user groups or devices

### Step 3: Deploy Policy

For organization-wide settings, create a PowerShell script to deploy `policy.json`:

```powershell
# Deploy-EvidifyPolicy.ps1
$policyContent = @'
{
  "id": "your-org-policy",
  "version": "1.0.0",
  "organization": "Your Organization",
  ...
}
'@

$appDataDir = "$env:APPDATA\ai.evidify"
New-Item -ItemType Directory -Path $appDataDir -Force
$policyContent | Set-Content -Path "$appDataDir\policy.json" -Encoding UTF8
```

### Step 4: Configure Defender Exclusions

Create a Device Configuration profile:

1. **Devices > Configuration profiles > Create profile**
2. Platform: Windows 10 and later
3. Profile type: Templates > Endpoint protection
4. Add exclusions:
   - `%LOCALAPPDATA%\Evidify`
   - `%APPDATA%\ai.evidify`
   - `%LOCALAPPDATA%\Ollama` (for AI)

### Step 5: Verify Deployment

```powershell
# Check installation
Test-Path "$env:LOCALAPPDATA\Evidify\Evidify.exe"

# Check policy
Get-Content "$env:APPDATA\ai.evidify\policy.json"

# Check logs
Get-Content "$env:TEMP\evidify-install.log"
```

---

## Policy Configuration Reference

### Export Policy

| Setting | Options | Default |
|---------|---------|---------|
| cloud_sync | Allow, Warn, Block, RequireApproval | Warn |
| network_share | Allow, Warn, Block, RequireApproval | Warn |
| removable_media | Allow, Warn, Block, RequireApproval | Warn |
| unknown_destination | Allow, Warn, Block, RequireApproval | Warn |
| audit_pack_required_above | Number (0 = never) | 10 |
| allowed_formats | Array of strings | ["pdf", "docx", "json"] |

### Recording Policy

| Setting | Type | Default |
|---------|------|---------|
| consent_required | Boolean | true |
| auto_delete_audio_after_signing | Boolean | true |
| max_audio_retention_days | Number (0 = unlimited) | 0 |
| reconsent_each_session | Boolean | false |

### Supervision Policy

| Setting | Type | Default |
|---------|------|---------|
| cosign_required_for | Array of credential levels | [] |
| max_review_delay_hours | Number | 72 |
| review_high_risk_notes | Boolean | false |
| competency_tracking_enabled | Boolean | false |

### Retention Policy

| Setting | Type | Default |
|---------|------|---------|
| note_retention_days | Number (0 = indefinite) | 0 |
| audit_log_retention_days | Number | 2555 (7 years) |
| auto_archive_after_days | Number (0 = never) | 0 |
| require_destruction_certificate | Boolean | false |

---

## Troubleshooting

### macOS

**App won't open (damaged)**
```bash
xattr -cr /Applications/Evidify.app
```

**Ollama not detected**
```bash
# Check if running
pgrep -l ollama

# Start manually
open -a Ollama
```

**Voice Scribe fails**
```bash
# Check microphone permission
tccutil reset Microphone ai.evidify
# Then re-grant in System Preferences
```

### Windows

**Installation fails**
```powershell
# Check logs
Get-Content "$env:TEMP\evidify-install.log" -Tail 50
```

**Defender blocking**
```powershell
# Check exclusions
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
```

**Policy not applied**
```powershell
# Verify file exists
Test-Path "$env:APPDATA\ai.evidify\policy.json"

# Check content
Get-Content "$env:APPDATA\ai.evidify\policy.json" | ConvertFrom-Json
```

---

## Security Considerations

1. **No PHI in MDM**: Evidify policies contain no patient data. Only configuration settings are transmitted.

2. **Signed Packages**: Always use code-signed installers for production deployment.

3. **Policy Signing**: For high-security environments, enable policy signature verification in Evidify.

4. **Audit Trail**: MDM deployment is logged in Evidify's audit trail with MDM source identifier.

5. **Offline Enforcement**: Policies are cached locally and enforced even when offline.

---

## Files in This Directory

| File | Purpose |
|------|---------|
| `jamf/evidify-config.mobileconfig` | Jamf configuration profile |
| `jamf/postinstall.sh` | Jamf post-install script |
| `intune/Install-Evidify.ps1` | Intune installation script |
| `README.md` | This documentation |

---

*Last updated: January 2026*
*Evidify version: 4.2.0-beta*
