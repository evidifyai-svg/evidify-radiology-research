# Evidify Offline Model Provisioning Guide
## Enterprise Air-Gapped Deployment

**Version:** 1.0  
**Date:** January 9, 2026  
**Audience:** Enterprise IT, Security Teams, MDM Administrators

---

## Executive Summary

This guide enables **fully air-gapped Evidify deployments** where no external network access is permitted. It addresses the enterprise requirement that AI models must not be downloaded from public sources (Hugging Face) during operation.

### Key Capabilities

- ✅ **Zero runtime internet dependency** for AI features
- ✅ **Enterprise-controlled model distribution** via MDM or file share
- ✅ **Cryptographic integrity verification** for all models
- ✅ **Model allowlist enforcement** via policy
- ✅ **Audit trail** for model provenance

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MODEL PROVISIONING ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  OPTION A: Online (Default - Consumer/SMB)                             │
│  ───────────────────────────────────────────                           │
│  Evidify → Hugging Face → Download → Verify SHA-256 → Install          │
│                                                                         │
│  OPTION B: Offline (Enterprise)                                        │
│  ──────────────────────────────────                                    │
│  IT Admin → Download models → Verify → Stage on MDM/Share              │
│                    ↓                                                    │
│  MDM/Manual → Deploy to endpoint → Evidify verifies → Ready            │
│                                                                         │
│  OPTION C: Enterprise Mirror (Large Organizations)                     │
│  ─────────────────────────────────────────────────                     │
│  IT Admin → Host internal mirror → Configure Evidify → Auto-fetch      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Model Manifest (Approved Models)

The following models are officially supported and verified:

```json
{
  "manifest_version": 2,
  "generated": "2026-01-09T00:00:00Z",
  "models": {
    "whisper-tiny": {
      "filename": "ggml-tiny.bin",
      "size_bytes": 77704715,
      "sha256": "be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21",
      "source_url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
      "description": "Smallest/fastest, English optimized",
      "vram_mb": 390,
      "languages": ["en"],
      "recommended_for": "Real-time transcription, low-spec hardware"
    },
    "whisper-base-en": {
      "filename": "ggml-base.en.bin",
      "size_bytes": 147964211,
      "sha256": "60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe",
      "source_url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin",
      "description": "Good balance of speed/accuracy, English only",
      "vram_mb": 500,
      "languages": ["en"],
      "recommended_for": "Standard clinical use (RECOMMENDED)"
    },
    "whisper-small-en": {
      "filename": "ggml-small.en.bin",
      "size_bytes": 487601967,
      "sha256": "db8a495a91d927739e50b3fc1f29e89fd29e1e4f2a2736f3a963d1c3748ca3c4",
      "source_url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin",
      "description": "Higher accuracy, English only",
      "vram_mb": 1000,
      "languages": ["en"],
      "recommended_for": "High-accuracy requirements"
    },
    "whisper-medium-en": {
      "filename": "ggml-medium.en.bin",
      "size_bytes": 1533774781,
      "sha256": "6c14d5adee5f86394037b4e4e8b59f1673b6cee10e3cf0b11bbdbee79c156208",
      "source_url": "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en.bin",
      "description": "Best English accuracy, requires good hardware",
      "vram_mb": 2600,
      "languages": ["en"],
      "recommended_for": "Maximum accuracy, powerful workstations"
    }
  },
  "manifest_signature": "<Ed25519 signature of manifest>"
}
```

---

## Option A: Manual Offline Installation (Simplest)

### Step 1: Download Models (IT Admin Workstation)

On an internet-connected admin machine:

```bash
# Create staging directory
mkdir -p ~/evidify-models-staging
cd ~/evidify-models-staging

# Download recommended model
curl -L -o ggml-base.en.bin \
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin"

# Download manifest
curl -L -o model-manifest.json \
  "https://releases.evidify.ai/models/manifest.json"
```

### Step 2: Verify Integrity (Critical)

```bash
# Verify SHA-256 hash
echo "60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe  ggml-base.en.bin" | shasum -a 256 -c -
# Expected: ggml-base.en.bin: OK

# If verification fails, DO NOT deploy - file may be corrupted or tampered
```

### Step 3: Transfer to Air-Gapped Environment

Transfer verified models via approved method:
- Encrypted USB drive
- Secure file transfer
- Internal file share

### Step 4: Install on Target Machines

```bash
# macOS
mkdir -p ~/Library/Application\ Support/evidify/models/
cp ggml-base.en.bin ~/Library/Application\ Support/evidify/models/

# Windows (PowerShell)
New-Item -ItemType Directory -Force -Path "$env:APPDATA\evidify\models"
Copy-Item ggml-base.en.bin "$env:APPDATA\evidify\models\"

# Linux
mkdir -p ~/.local/share/evidify/models/
cp ggml-base.en.bin ~/.local/share/evidify/models/
```

### Step 5: Verify in Evidify

Launch Evidify → Settings → Voice → Model should show "ggml-base.en (Installed)"

---

## Option B: MDM Deployment (Recommended for Enterprise)

### Jamf Pro (macOS)

**1. Create Package**

```bash
# Create installer package
pkgbuild --root ./models \
         --install-location "/Library/Application Support/evidify/models" \
         --identifier com.evidify.models \
         --version 1.0 \
         Evidify-Models-1.0.pkg
```

**2. Upload to Jamf**
- Jamf Pro → Settings → Packages → New
- Upload `Evidify-Models-1.0.pkg`

**3. Create Policy**
```xml
<!-- Policy Settings -->
<policy>
  <general>
    <name>Deploy Evidify Whisper Models</name>
    <enabled>true</enabled>
    <trigger>recurring check-in</trigger>
    <frequency>Once per computer</frequency>
  </general>
  <package_configuration>
    <packages>
      <package>
        <name>Evidify-Models-1.0.pkg</name>
        <action>Install</action>
      </package>
    </packages>
  </package_configuration>
  <scope>
    <computer_groups>
      <computer_group>
        <name>Evidify Users</name>
      </computer_group>
    </computer_groups>
  </scope>
</policy>
```

### Microsoft Intune (Windows)

**1. Create Win32 App Package**

```powershell
# Install-EvidifyModels.ps1
$modelDir = "$env:ProgramData\evidify\models"
New-Item -ItemType Directory -Force -Path $modelDir

# Copy models from package
Copy-Item ".\ggml-base.en.bin" -Destination $modelDir

# Verify integrity
$hash = Get-FileHash "$modelDir\ggml-base.en.bin" -Algorithm SHA256
if ($hash.Hash -ne "60ED5BC3DD14EEA856493D334349B405782DDCAF0028D4B5DF4088345FBA2EFE") {
    Write-Error "Model integrity check failed!"
    exit 1
}

Write-Host "Evidify models installed successfully"
exit 0
```

**2. Detection Script**

```powershell
# Detect-EvidifyModels.ps1
$modelPath = "$env:ProgramData\evidify\models\ggml-base.en.bin"
if (Test-Path $modelPath) {
    $hash = Get-FileHash $modelPath -Algorithm SHA256
    if ($hash.Hash -eq "60ED5BC3DD14EEA856493D334349B405782DDCAF0028D4B5DF4088345FBA2EFE") {
        Write-Host "Model installed and verified"
        exit 0
    }
}
exit 1
```

**3. Intune Configuration**
- Apps → Windows → Add → Windows app (Win32)
- Upload .intunewin package
- Install command: `powershell -ExecutionPolicy Bypass -File Install-EvidifyModels.ps1`
- Detection: Custom script detection

---

## Option C: Enterprise Model Mirror

For organizations with many endpoints, host an internal mirror.

### Mirror Server Setup

**1. Create Internal Mirror**

```bash
# On internal web server (nginx example)
mkdir -p /var/www/evidify-models/

# Copy verified models
cp ggml-*.bin /var/www/evidify-models/
cp model-manifest.json /var/www/evidify-models/

# Generate checksums
cd /var/www/evidify-models/
sha256sum *.bin > SHA256SUMS
```

**2. Nginx Configuration**

```nginx
server {
    listen 443 ssl;
    server_name models.internal.yourcompany.com;
    
    ssl_certificate /etc/ssl/certs/internal.crt;
    ssl_certificate_key /etc/ssl/private/internal.key;
    
    root /var/www/evidify-models;
    
    location / {
        autoindex off;
        add_header X-Content-Type-Options nosniff;
        add_header Cache-Control "public, max-age=86400";
    }
    
    # Only allow specific files
    location ~* \.(bin|json)$ {
        allow all;
    }
    
    location / {
        deny all;
    }
}
```

### Configure Evidify to Use Mirror

**Via Policy File:**

```json
{
  "policy_version": "1.0",
  "model_provisioning": {
    "source": "enterprise_mirror",
    "mirror_url": "https://models.internal.yourcompany.com",
    "verify_ssl": true,
    "allowed_models": [
      "whisper-base-en",
      "whisper-small-en"
    ],
    "block_public_downloads": true
  }
}
```

**Via Registry (Windows):**

```reg
[HKEY_LOCAL_MACHINE\SOFTWARE\Evidify\ModelProvisioning]
"Source"="enterprise_mirror"
"MirrorURL"="https://models.internal.yourcompany.com"
"VerifySSL"=dword:00000001
"BlockPublicDownloads"=dword:00000001
```

**Via MDM Profile (macOS):**

```xml
<dict>
  <key>ModelProvisioning</key>
  <dict>
    <key>Source</key>
    <string>enterprise_mirror</string>
    <key>MirrorURL</key>
    <string>https://models.internal.yourcompany.com</string>
    <key>VerifySSL</key>
    <true/>
    <key>BlockPublicDownloads</key>
    <true/>
  </dict>
</dict>
```

---

## Model Integrity Verification

### How Evidify Verifies Models

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MODEL VERIFICATION FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Model file present in models directory                             │
│                    ↓                                                    │
│  2. Compute SHA-256 hash of file                                       │
│                    ↓                                                    │
│  3. Compare against embedded manifest                                  │
│     (manifest is signed and bundled with app)                          │
│                    ↓                                                    │
│  4. Hash matches?                                                       │
│     ├─ YES → Model loaded, ready for use                               │
│     └─ NO  → Model rejected, error displayed                           │
│              "Model integrity check failed. Please reinstall."         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Verification Implementation

```rust
// Simplified verification logic
pub fn verify_model(model_path: &Path, expected_hash: &str) -> Result<(), ModelError> {
    let mut file = File::open(model_path)?;
    let mut hasher = Sha256::new();
    
    // Stream hash to handle large files
    let mut buffer = [0u8; 8192];
    loop {
        let bytes_read = file.read(&mut buffer)?;
        if bytes_read == 0 { break; }
        hasher.update(&buffer[..bytes_read]);
    }
    
    let computed_hash = hex::encode(hasher.finalize());
    
    if computed_hash.to_lowercase() != expected_hash.to_lowercase() {
        log::error!(
            "Model integrity check failed: expected {}, got {}",
            expected_hash,
            computed_hash
        );
        return Err(ModelError::IntegrityCheckFailed);
    }
    
    log::info!("Model verified: {}", model_path.display());
    Ok(())
}
```

---

## Blocking Public Downloads (Enterprise Policy)

To prevent users from downloading models from Hugging Face:

### Policy Configuration

```json
{
  "model_provisioning": {
    "block_public_downloads": true,
    "allowed_sources": ["local", "enterprise_mirror"],
    "show_download_button": false
  }
}
```

### User Experience

With this policy:
- Download button is hidden in UI
- Attempting to download via any method fails with: "Model downloads are disabled by your organization. Contact IT for model installation."
- Only pre-installed models are available

### Audit Logging

All model operations are logged:

```json
{
  "timestamp": "2026-01-09T15:30:00Z",
  "event_type": "MODEL_LOAD",
  "details": {
    "model_name": "ggml-base.en.bin",
    "source": "local",
    "hash_verified": true,
    "hash": "60ed5bc3..."
  }
}
```

---

## Troubleshooting

### Model Not Detected

```bash
# Verify file location (macOS)
ls -la ~/Library/Application\ Support/evidify/models/

# Verify hash
shasum -a 256 ~/Library/Application\ Support/evidify/models/ggml-base.en.bin

# Check Evidify logs
cat ~/Library/Logs/evidify/evidify.log | grep -i model
```

### Hash Mismatch

If hash verification fails:
1. Re-download model from official source
2. Verify download integrity before deployment
3. Check for file system corruption
4. Ensure no antivirus modified the file

### Model Too Large

If model doesn't load:
- Check available RAM (medium model requires 4GB+ free)
- Try smaller model (tiny or base)
- Check disk space

---

## Security Considerations

### Chain of Custody

For maximum security, maintain chain of custody:

1. **Download** from official source (Hugging Face via HTTPS)
2. **Verify** SHA-256 immediately after download
3. **Document** download date, source URL, verified hash
4. **Transfer** via encrypted channel only
5. **Re-verify** on target before deployment
6. **Audit** model usage in Evidify logs

### Model Allowlist

Restrict which models can be used:

```json
{
  "model_provisioning": {
    "allowed_models": ["whisper-base-en"],
    "allow_custom_models": false
  }
}
```

### Signature Verification (Advanced)

For organizations requiring signed models:

1. Evidify signs model manifest with Ed25519
2. Manifest signature verified at app startup
3. Only models in signed manifest are loadable
4. Custom models require IT to update signed manifest

---

## Summary: Enterprise Deployment Checklist

- [ ] Download models on internet-connected admin machine
- [ ] Verify SHA-256 hashes against official manifest
- [ ] Document chain of custody
- [ ] Transfer to air-gapped environment via approved method
- [ ] Deploy via MDM (Jamf/Intune) or manual installation
- [ ] Configure policy to block public downloads
- [ ] Verify models load in Evidify
- [ ] Test transcription functionality
- [ ] Document deployment in change management

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 9, 2026 | Initial release |

---

*For assistance with enterprise model provisioning, contact enterprise@evidify.ai*
