# Evidify Sprint Backlog: Beta → Production
## Prioritized Implementation Tasks

**Version:** 4.2.0 Target  
**Sprint Duration:** 2 weeks each  
**Start Date:** January 2026

---

## Related Backlogs (UI + Stability)

- UI stability + module unification backlog: `docs/EVIDIFY_UI_STABILITY_BACKLOG_v4.3.1.md`
- Smoke test scaffold (fast sanity checks): `verification/run-smoke-tests.cjs`

**Note:** UI/UX work must respect the defensibility-critical "Do Not Touch" boundaries documented in the UI stability backlog.


# Sprint 1: Enterprise Blockers (Days 1-14)

## Critical Path: W10 Supply Chain (Enterprise STOP)

### 1.1 macOS Code Signing & Notarization
**Priority:** P0 — Blocks all enterprise deals  
**Effort:** 3-5 days  
**Owner:** ENG

**Prerequisites:**
- [ ] Apple Developer ID ($99/year) - https://developer.apple.com
- [ ] Create App-specific password for notarytool
- [ ] Set up CI secrets for signing credentials

**Implementation:**

```toml
# src-tauri/tauri.conf.json - Update signing config
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Evidify Inc (XXXXXXXXXX)",
      "providerShortName": "XXXXXXXXXX",
      "entitlements": "Entitlements.plist",
      "notarize": {
        "teamId": "XXXXXXXXXX"
      }
    }
  }
}
```

```bash
# scripts/sign-and-notarize.sh
#!/bin/bash
set -e

APP_PATH="$1"
TEAM_ID="YOUR_TEAM_ID"
APPLE_ID="developer@evidify.ai"
APP_PASSWORD="@keychain:AC_PASSWORD"

echo "Signing application..."
codesign --force --deep --options runtime \
  --sign "Developer ID Application: Evidify Inc ($TEAM_ID)" \
  "$APP_PATH"

echo "Creating DMG..."
create-dmg --volname "Evidify" \
  --window-pos 200 120 \
  --window-size 800 400 \
  --icon-size 100 \
  --app-drop-link 600 185 \
  "Evidify.dmg" "$APP_PATH"

echo "Signing DMG..."
codesign --force --sign "Developer ID Application: Evidify Inc ($TEAM_ID)" \
  "Evidify.dmg"

echo "Submitting for notarization..."
xcrun notarytool submit "Evidify.dmg" \
  --apple-id "$APPLE_ID" \
  --team-id "$TEAM_ID" \
  --password "$APP_PASSWORD" \
  --wait

echo "Stapling notarization..."
xcrun stapler staple "Evidify.dmg"

echo "Verifying..."
spctl --assess --verbose "Evidify.dmg"

echo "✅ Notarization complete!"
```

**Acceptance Test:**
```bash
# On a clean Mac:
spctl --assess --verbose /Applications/Evidify.app
# Should output: "accepted" with "Developer ID"

# Gatekeeper should NOT prompt on first launch
```

**Deliverables:**
- [ ] Signed .dmg with notarization
- [ ] CI workflow for automated signing
- [ ] Verification procedure documented

---

### 1.2 Windows Code Signing
**Priority:** P0  
**Effort:** 3-5 days  
**Owner:** ENG

**Prerequisites:**
- [ ] EV Code Signing Certificate (~$400-500/year from DigiCert, Sectigo, etc.)
- [ ] Hardware token (usually included with EV cert)
- [ ] Azure Key Vault setup (optional, for cloud signing)

**Implementation:**

```powershell
# scripts/sign-windows.ps1
param(
    [string]$FilePath,
    [string]$CertThumbprint
)

# Sign with SHA-256
signtool sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 `
    /sha1 $CertThumbprint $FilePath

# Verify
signtool verify /pa /v $FilePath
```

```yaml
# .github/workflows/build-windows.yml
- name: Sign Windows Binary
  run: |
    signtool sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 \
      /f "${{ secrets.WINDOWS_CERT_PATH }}" \
      /p "${{ secrets.WINDOWS_CERT_PASSWORD }}" \
      target/release/bundle/msi/Evidify_*.msi
```

---

### 1.3 SBOM Generation
**Priority:** P0  
**Effort:** 1-2 days  
**Owner:** APPSEC

**Implementation:**

```bash
# Install SBOM tools
cargo install cargo-sbom
npm install -g @cyclonedx/cyclonedx-npm

# Generate Rust SBOM
cd src-tauri
cargo sbom --output-format cyclonedx-json > ../sbom-rust.json

# Generate Node SBOM
cd ../frontend
cyclonedx-npm --output-format json > ../sbom-node.json

# Merge SBOMs (create merge script)
```

```python
# scripts/merge-sboms.py
import json
import sys
from datetime import datetime

def merge_sboms(rust_path, node_path, output_path, version):
    with open(rust_path) as f:
        rust_sbom = json.load(f)
    with open(node_path) as f:
        node_sbom = json.load(f)
    
    merged = {
        "bomFormat": "CycloneDX",
        "specVersion": "1.4",
        "version": 1,
        "metadata": {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "component": {
                "name": "Evidify",
                "version": version,
                "type": "application"
            }
        },
        "components": rust_sbom.get("components", []) + node_sbom.get("components", [])
    }
    
    with open(output_path, 'w') as f:
        json.dump(merged, f, indent=2)
    
    print(f"Merged SBOM: {len(merged['components'])} components")

if __name__ == "__main__":
    merge_sboms(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
```

```yaml
# Add to CI
- name: Generate SBOM
  run: |
    cargo sbom --output-format cyclonedx-json > sbom-rust.json
    cd frontend && npx @cyclonedx/cyclonedx-npm --output-format json > ../sbom-node.json
    python scripts/merge-sboms.py sbom-rust.json sbom-node.json evidify-sbom.json ${{ env.VERSION }}
    
- name: Upload SBOM
  uses: actions/upload-artifact@v3
  with:
    name: sbom
    path: evidify-sbom.json
```

---

### 1.4 Dependency Scanning
**Priority:** P0  
**Effort:** 1 day  
**Owner:** ENG

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 0 * * *'  # Daily

jobs:
  rust-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install cargo-audit
        run: cargo install cargo-audit
      - name: Run audit
        run: |
          cd src-tauri
          cargo audit --json > audit-report.json
          cargo audit
          
  npm-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run npm audit
        run: |
          cd frontend
          npm audit --json > npm-audit-report.json
          npm audit --audit-level moderate
```

---

### 1.5 Vulnerability Management Policy
**Priority:** P0  
**Effort:** 1-2 days  
**Owner:** SEC

Create `docs/VULNERABILITY_MANAGEMENT.md`:

```markdown
# Evidify Vulnerability Management Policy

## 1. Scope
This policy covers all vulnerabilities in Evidify application code, 
dependencies, and infrastructure.

## 2. Intake
- Automated: Daily dependency scans (cargo audit, npm audit)
- Manual: security@evidify.ai for responsible disclosure
- Bug bounty: [Future program details]

## 3. Classification
| Severity | CVSS | Response SLA |
|----------|------|--------------|
| Critical | 9.0+ | 24 hours |
| High | 7.0-8.9 | 7 days |
| Medium | 4.0-6.9 | 30 days |
| Low | 0.1-3.9 | 90 days |

## 4. Triage Process
1. Automated scan detects vulnerability
2. Security team reviews for applicability
3. If applicable: assign severity and owner
4. If not applicable: document rationale and close

## 5. Remediation
- Update dependency (preferred)
- Apply workaround
- Accept risk (requires Security Officer approval)

## 6. Disclosure
- CVE assignment for Evidify-specific vulnerabilities
- Coordinated disclosure with upstream maintainers
- Customer notification for Critical/High

## 7. Metrics
- Mean time to remediate (MTTR) by severity
- Vulnerability backlog age
- Scan coverage percentage
```

---

## Priority 2: PHI Sprawl Mitigation

### 1.6 Clipboard Auto-Clear
**Priority:** P1  
**Effort:** 2-3 days  
**Owner:** ENG

**Backend Implementation:**

```rust
// src-tauri/src/clipboard.rs
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::oneshot;
use tauri::ClipboardManager;

pub struct ClipboardGuard {
    clear_scheduled: Arc<AtomicBool>,
    cancel_tx: Option<oneshot::Sender<()>>,
}

impl ClipboardGuard {
    pub fn new() -> Self {
        Self {
            clear_scheduled: Arc::new(AtomicBool::new(false)),
            cancel_tx: None,
        }
    }
    
    pub async fn copy_with_ttl(
        &mut self,
        clipboard: &ClipboardManager,
        content: String,
        ttl_seconds: u32,
    ) -> Result<(), String> {
        // Cancel any pending clear
        if let Some(tx) = self.cancel_tx.take() {
            let _ = tx.send(());
        }
        
        // Write to clipboard
        clipboard.write_text(content)
            .map_err(|e| e.to_string())?;
        
        // Schedule clear
        if ttl_seconds > 0 {
            let (cancel_tx, cancel_rx) = oneshot::channel();
            self.cancel_tx = Some(cancel_tx);
            
            let clipboard = clipboard.clone();
            let clear_scheduled = self.clear_scheduled.clone();
            clear_scheduled.store(true, Ordering::SeqCst);
            
            tokio::spawn(async move {
                tokio::select! {
                    _ = tokio::time::sleep(Duration::from_secs(ttl_seconds as u64)) => {
                        // Clear clipboard
                        let _ = clipboard.write_text(String::new());
                        clear_scheduled.store(false, Ordering::SeqCst);
                    }
                    _ = cancel_rx => {
                        // Cancelled, don't clear
                    }
                }
            });
        }
        
        Ok(())
    }
}

// Tauri command
#[tauri::command]
pub async fn copy_to_clipboard_secure(
    state: State<'_, AppState>,
    content: String,
    ttl_seconds: Option<u32>,
) -> Result<(), String> {
    let ttl = ttl_seconds.unwrap_or(30); // Default 30 seconds
    
    let mut guard = state.clipboard_guard.lock().await;
    guard.copy_with_ttl(&state.clipboard, content, ttl).await?;
    
    // Log event (no PHI)
    if let Some(vault) = state.vault.lock().unwrap().as_ref() {
        let _ = crate::audit::log_event(
            vault.connection(),
            crate::models::AuditEventType::ClipboardCopy,
            crate::models::AuditResourceType::Note,
            "clipboard",
            crate::models::AuditOutcome::Success,
            None,
        );
    }
    
    Ok(())
}
```

**Add to models.rs:**
```rust
// In AuditEventType enum, add:
ClipboardCopy,
```

**Frontend Integration:**

```typescript
// frontend/src/lib/clipboard.ts
import { invoke } from '@tauri-apps/api/tauri';

export async function copySecure(
  content: string, 
  ttlSeconds: number = 30
): Promise<void> {
  await invoke('copy_to_clipboard_secure', { 
    content, 
    ttlSeconds 
  });
}

// Usage in components:
async function handleCopyNote() {
  await copySecure(noteContent, 30);
  showToast('Copied! Will clear in 30 seconds.');
}
```

---

## Priority 3: Voice Scribe Foundation

### 1.7 Whisper Integration
**Priority:** P1  
**Effort:** 5-7 days  
**Owner:** ML/ENG

**Backend Implementation:**

```rust
// src-tauri/src/voice.rs
use std::path::{Path, PathBuf};
use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhisperConfig {
    pub model_path: PathBuf,
    pub language: String,
    pub threads: u32,
    pub translate: bool,
}

impl Default for WhisperConfig {
    fn default() -> Self {
        Self {
            model_path: dirs::home_dir()
                .unwrap_or_default()
                .join("whisper-models")
                .join("ggml-base.en.bin"),
            language: "en".to_string(),
            threads: 4,
            translate: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptSegment {
    pub start_ms: u64,
    pub end_ms: u64,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub text: String,
    pub segments: Vec<TranscriptSegment>,
    pub language: String,
    pub processing_time_ms: u64,
}

#[derive(Debug, thiserror::Error)]
pub enum VoiceError {
    #[error("Whisper model not found at {0}")]
    ModelNotFound(PathBuf),
    #[error("whisper-cpp not installed")]
    WhisperNotInstalled,
    #[error("Audio conversion failed: {0}")]
    ConversionFailed(String),
    #[error("Transcription failed: {0}")]
    TranscriptionFailed(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Check if whisper-cpp is available
pub fn check_whisper_available() -> Result<String, VoiceError> {
    let output = Command::new("whisper-cpp")
        .arg("--version")
        .output();
    
    match output {
        Ok(o) if o.status.success() => {
            Ok(String::from_utf8_lossy(&o.stdout).trim().to_string())
        }
        _ => Err(VoiceError::WhisperNotInstalled),
    }
}

/// Check available models
pub fn list_available_models() -> Vec<PathBuf> {
    let model_dir = dirs::home_dir()
        .unwrap_or_default()
        .join("whisper-models");
    
    if !model_dir.exists() {
        return vec![];
    }
    
    std::fs::read_dir(&model_dir)
        .ok()
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .map(|e| e.path())
                .filter(|p| p.extension().map(|e| e == "bin").unwrap_or(false))
                .collect()
        })
        .unwrap_or_default()
}

/// Convert audio to 16kHz WAV (required by Whisper)
fn convert_to_wav(input: &Path) -> Result<PathBuf, VoiceError> {
    let output = input.with_extension("converted.wav");
    
    let status = Command::new("ffmpeg")
        .args([
            "-y",
            "-i", input.to_str().unwrap(),
            "-ar", "16000",
            "-ac", "1",
            "-f", "wav",
            output.to_str().unwrap(),
        ])
        .status()?;
    
    if !status.success() {
        return Err(VoiceError::ConversionFailed(
            "ffmpeg conversion failed".to_string()
        ));
    }
    
    Ok(output)
}

/// Transcribe audio using whisper-cpp
pub fn transcribe(
    audio_path: &Path,
    config: &WhisperConfig,
) -> Result<TranscriptionResult, VoiceError> {
    let start = std::time::Instant::now();
    
    // Check model exists
    if !config.model_path.exists() {
        return Err(VoiceError::ModelNotFound(config.model_path.clone()));
    }
    
    // Convert to WAV
    let wav_path = convert_to_wav(audio_path)?;
    
    // Run whisper-cpp
    let output = Command::new("whisper-cpp")
        .args([
            "-m", config.model_path.to_str().unwrap(),
            "-f", wav_path.to_str().unwrap(),
            "-l", &config.language,
            "-t", &config.threads.to_string(),
            "-oj",  // Output JSON
            "--no-timestamps",  // Cleaner text output
        ])
        .output()?;
    
    if !output.status.success() {
        return Err(VoiceError::TranscriptionFailed(
            String::from_utf8_lossy(&output.stderr).to_string()
        ));
    }
    
    // Parse JSON output
    let json_path = wav_path.with_extension("wav.json");
    let json_content = std::fs::read_to_string(&json_path)?;
    
    let parsed: serde_json::Value = serde_json::from_str(&json_content)
        .map_err(|e| VoiceError::TranscriptionFailed(e.to_string()))?;
    
    // Extract text and segments
    let text = parsed["transcription"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|s| s["text"].as_str())
                .collect::<Vec<_>>()
                .join(" ")
        })
        .unwrap_or_default()
        .trim()
        .to_string();
    
    let segments = parsed["transcription"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|s| {
                    Some(TranscriptSegment {
                        start_ms: (s["offsets"]["from"].as_f64()? * 1000.0) as u64,
                        end_ms: (s["offsets"]["to"].as_f64()? * 1000.0) as u64,
                        text: s["text"].as_str()?.trim().to_string(),
                    })
                })
                .collect()
        })
        .unwrap_or_default();
    
    // Clean up temp files
    let _ = std::fs::remove_file(&wav_path);
    let _ = std::fs::remove_file(&json_path);
    
    Ok(TranscriptionResult {
        text,
        segments,
        language: config.language.clone(),
        processing_time_ms: start.elapsed().as_millis() as u64,
    })
}

// Tauri commands
#[tauri::command]
pub fn check_voice_available() -> Result<VoiceStatus, String> {
    let whisper_version = check_whisper_available().ok();
    let models = list_available_models();
    
    Ok(VoiceStatus {
        whisper_installed: whisper_version.is_some(),
        whisper_version,
        models_available: models.iter()
            .map(|p| p.file_name().unwrap().to_string_lossy().to_string())
            .collect(),
        recommended_model: "ggml-base.en.bin".to_string(),
    })
}

#[derive(Serialize)]
pub struct VoiceStatus {
    pub whisper_installed: bool,
    pub whisper_version: Option<String>,
    pub models_available: Vec<String>,
    pub recommended_model: String,
}

#[tauri::command]
pub async fn transcribe_audio(
    audio_path: String,
    model_name: Option<String>,
) -> Result<TranscriptionResult, String> {
    let config = WhisperConfig {
        model_path: dirs::home_dir()
            .unwrap_or_default()
            .join("whisper-models")
            .join(model_name.unwrap_or_else(|| "ggml-base.en.bin".to_string())),
        ..Default::default()
    };
    
    transcribe(Path::new(&audio_path), &config)
        .map_err(|e| e.to_string())
}
```

**Register commands in main.rs:**
```rust
// In main.rs, add to .invoke_handler():
voice::check_voice_available,
voice::transcribe_audio,
```

---

# Sprint 2: Core Features (Days 15-28)

## Voice Scribe UI & Workflow

### 2.1 Voice Capture UI
**Priority:** P0  
**Effort:** 3-4 days  
**Owner:** Frontend

```typescript
// frontend/src/components/VoiceCapture.tsx
import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { appDataDir } from '@tauri-apps/api/path';

interface VoiceCaptureProps {
  onTranscript: (text: string) => void;
  onError: (error: string) => void;
}

export function VoiceCapture({ onTranscript, onError }: VoiceCaptureProps) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'ready' | 'recording' | 'processing'>('idle');
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkVoiceCapability();
  }, []);

  async function checkVoiceCapability() {
    setStatus('checking');
    try {
      const status = await invoke<VoiceStatus>('check_voice_available');
      setVoiceStatus(status);
      setStatus(status.whisper_installed && status.models_available.length > 0 ? 'ready' : 'idle');
    } catch (e) {
      setStatus('idle');
      onError('Could not check voice capability');
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await processRecording();
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      
      setStatus('recording');
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
      
    } catch (e) {
      onError('Microphone access denied');
    }
  }

  async function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setStatus('processing');
  }

  async function processRecording() {
    try {
      // Convert to WAV file
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Save to temp file
      const dataDir = await appDataDir();
      const tempPath = `${dataDir}/temp_recording_${Date.now()}.webm`;
      
      // Write file (via Tauri)
      await invoke('write_temp_audio', { 
        path: tempPath, 
        data: Array.from(new Uint8Array(arrayBuffer)) 
      });
      
      // Transcribe
      const result = await invoke<TranscriptionResult>('transcribe_audio', {
        audioPath: tempPath
      });
      
      // Clean up temp file
      await invoke('delete_temp_file', { path: tempPath });
      
      onTranscript(result.text);
      setStatus('ready');
      
    } catch (e) {
      onError(`Transcription failed: ${e}`);
      setStatus('ready');
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Not available state
  if (!voiceStatus?.whisper_installed) {
    return (
      <div className="voice-capture voice-unavailable">
        <div className="warning-icon">⚠️</div>
        <p>Voice Scribe requires whisper.cpp</p>
        <code>brew install whisper-cpp</code>
        <button onClick={checkVoiceCapability}>Check Again</button>
      </div>
    );
  }

  if (voiceStatus.models_available.length === 0) {
    return (
      <div className="voice-capture voice-unavailable">
        <div className="warning-icon">⚠️</div>
        <p>No Whisper models found</p>
        <code>mkdir -p ~/whisper-models && curl -L -o ~/whisper-models/ggml-base.en.bin 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin'</code>
        <button onClick={checkVoiceCapability}>Check Again</button>
      </div>
    );
  }

  return (
    <div className={`voice-capture voice-${status}`}>
      {status === 'ready' && (
        <button 
          onClick={startRecording}
          className="record-button"
        >
          <span className="mic-icon">🎙️</span>
          Start Recording
        </button>
      )}
      
      {status === 'recording' && (
        <div className="recording-active">
          <div className="recording-indicator">
            <span className="pulse"></span>
            Recording...
          </div>
          <div className="recording-time">{formatTime(recordingTime)}</div>
          <button 
            onClick={stopRecording}
            className="stop-button"
          >
            Stop & Transcribe
          </button>
        </div>
      )}
      
      {status === 'processing' && (
        <div className="processing">
          <div className="spinner"></div>
          <p>Transcribing... ({recordingTime}s of audio)</p>
        </div>
      )}
    </div>
  );
}
```

### 2.2 Ethics Detection Tuning
**Priority:** P1  
**Effort:** 3-4 days  
**Owner:** Clinical/ENG

**Add "Dismiss Similar" Feature:**

```rust
// In ethics.rs, add dismissal tracking:

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectionDismissal {
    pub pattern_id: String,
    pub context_hash: String,  // Hash of surrounding text
    pub dismissed_at: DateTime<Utc>,
    pub reason: DismissalReason,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DismissalReason {
    FalsePositive,
    HistoricalReference,
    QuotingOthers,
    ClinicalContext,
}

impl EthicsEngine {
    /// Check if a detection should be suppressed based on prior dismissals
    pub fn should_suppress(&self, detection: &Detection, dismissals: &[DetectionDismissal]) -> bool {
        let context_hash = self.hash_context(&detection.evidence);
        
        dismissals.iter().any(|d| {
            d.pattern_id == detection.pattern_id && 
            d.context_hash == context_hash
        })
    }
    
    /// Dismiss detection and similar future occurrences
    pub fn dismiss_similar(
        &self,
        detection: &Detection,
        reason: DismissalReason,
    ) -> DetectionDismissal {
        DetectionDismissal {
            pattern_id: detection.pattern_id.clone(),
            context_hash: self.hash_context(&detection.evidence),
            dismissed_at: Utc::now(),
            reason,
        }
    }
}
```

**Add More Patterns (Abuse/Neglect, Duty to Warn):**

```rust
// Add to DETECTION_PATTERNS in ethics.rs:

// Abuse/Neglect (Mandatory Reporting)
DetectionPattern {
    id: "safety-abuse-child",
    category: DetectionCategory::Safety,
    severity: DetectionSeverity::Critical,
    patterns: vec![
        r"(?i)\b(child|minor|kid).{0,30}(abuse|neglect|hit|beat|harm)",
        r"(?i)(parent|caregiver|guardian).{0,30}(hit|beat|hurt|harm).{0,30}(child|kid)",
        r"(?i)bruise|mark|injury.{0,30}(explained|unexplained|suspicious)",
    ],
    exclusions: vec![
        r"(?i)(denied|no evidence|no indication|reported to)",
    ],
    title: "Potential Child Abuse/Neglect",
    description: "Content suggests possible child abuse or neglect - mandatory reporting may apply",
    suggestion: "Review mandatory reporting requirements. Document: specific concerns, source of information, actions taken.",
    policy_ref: "Mandatory Reporting Laws (varies by jurisdiction)",
},

DetectionPattern {
    id: "safety-abuse-elder",
    category: DetectionCategory::Safety,
    severity: DetectionSeverity::Critical,
    patterns: vec![
        r"(?i)\b(elder|elderly|senior|older adult).{0,30}(abuse|neglect|exploit)",
        r"(?i)(caregiver|family).{0,30}(taking money|financial|exploit)",
        r"(?i)(nursing home|facility).{0,30}(neglect|mistreat)",
    ],
    exclusions: vec![
        r"(?i)(denied|no evidence|reported to|APS notified)",
    ],
    title: "Potential Elder Abuse/Neglect",
    description: "Content suggests possible elder abuse, neglect, or exploitation",
    suggestion: "Review Adult Protective Services reporting requirements. Document concerns and actions.",
    policy_ref: "Elder Abuse Reporting Requirements",
},

// Duty to Warn (Tarasoff)
DetectionPattern {
    id: "safety-duty-warn",
    category: DetectionCategory::Safety,
    severity: DetectionSeverity::Critical,
    patterns: vec![
        r"(?i)(want|plan|going) to (kill|hurt|harm).{0,20}(specific|named|identified)",
        r"(?i)threat.{0,30}(identified victim|specific person|named)",
        r"(?i)(will|gonna|going to).{0,20}(shoot|stab|attack).{0,20}(him|her|them|name)",
    ],
    exclusions: vec![
        r"(?i)(denied|no plan|no identified|general|non-specific)",
    ],
    title: "Potential Duty to Warn",
    description: "Content suggests potential threat to identifiable third party - Tarasoff duty may apply",
    suggestion: "Assess: Is threat credible? Is victim identifiable? Consult supervisor/legal if uncertain. Document assessment and actions.",
    policy_ref: "Tarasoff v. Regents (duty to protect)",
},

// Capacity/Guardianship
DetectionPattern {
    id: "doc-capacity-concern",
    category: DetectionCategory::Documentation,
    severity: DetectionSeverity::Flag,
    patterns: vec![
        r"(?i)(lacks|lacking|impaired).{0,20}(capacity|judgment|decision)",
        r"(?i)(guardian|conservator|surrogate).{0,20}(needed|required|consider)",
        r"(?i)(cannot|unable).{0,20}(manage|care for|make decisions)",
    ],
    exclusions: vec![
        r"(?i)(has capacity|demonstrates capacity|decisional capacity intact)",
    ],
    title: "Capacity Concern Noted",
    description: "Content suggests concerns about decision-making capacity",
    suggestion: "Consider formal capacity evaluation if not yet completed. Document specific functional deficits observed.",
    policy_ref: "Capacity Assessment Standards",
},
```

---

# Sprint 3: Enterprise Features (Days 29-42)

## MDM & Policy Engine

### 3.1 Deployment Packages
See detailed implementation in Part 2: Phase 3 of BETA_TO_PRODUCTION_ROADMAP.md

### 3.2 Policy-as-Code Engine
See detailed implementation in Part 2: Phase 3 of BETA_TO_PRODUCTION_ROADMAP.md

### 3.3 Audit Pack Generator
See detailed implementation in Part 2: Phase 2 of BETA_TO_PRODUCTION_ROADMAP.md

---

# Definition of Done Checklist

## For Each Feature:
- [ ] Code implemented and compiles
- [ ] Unit tests pass (>80% coverage for new code)
- [ ] Integration tests pass
- [ ] Manual QA completed
- [ ] Documentation updated
- [ ] CHANGELOG entry added
- [ ] No new security vulnerabilities introduced
- [ ] Performance within acceptable bounds
- [ ] Accessibility checked (keyboard navigation, screen reader)

## For Each Release:
- [ ] All DoD items complete for included features
- [ ] SBOM generated
- [ ] Dependency scan clean (no Critical/High)
- [ ] Code signed and notarized
- [ ] Release notes written
- [ ] Upgrade path tested
- [ ] Rollback procedure documented

---

# Version Milestones

| Version | Target Date | Key Features |
|---------|-------------|--------------|
| **4.2.0** | +2 weeks | Code signing, SBOM, clipboard control, voice foundation |
| **4.3.0** | +4 weeks | Full voice pipeline, ethics tuning, training docs |
| **4.4.0** | +6 weeks | Search, progress dashboard, supervision |
| **5.0.0** | +10 weeks | MDM, policy engine, SIEM, audit pack |
| **5.1.0** | +14 weeks | Enterprise polish, SOC 2 readiness |

---

*Sprint backlog updated: January 2026*
