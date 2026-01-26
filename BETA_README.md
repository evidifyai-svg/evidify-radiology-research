# Evidify Beta v4.0.0

**Release Date:** January 7, 2026  
**Status:** Beta Testing

---

## Quick Start

### Prerequisites

1. **Ollama** (Required for AI features)
   ```bash
   # macOS
   brew install ollama
   
   # Windows - download from https://ollama.ai
   ```

2. **Pull a model**
   ```bash
   ollama pull qwen2.5:7b-instruct
   # Or for lower memory: ollama pull llama3.2:3b
   ```

3. **Start Ollama**
   ```bash
   ollama serve
   # Runs on localhost:11434
   ```

### Installation

#### Option A: Run from Source (Recommended for Beta)

```bash
# 1. Extract the zip
unzip evidify-v9.zip
cd evidify-v9

# 2. Install frontend dependencies
cd frontend
npm install

# 3. Run in development mode
npm run tauri dev
```

#### Option B: Build Release Binary

```bash
cd evidify-v9

# Install frontend deps
cd frontend && npm install && cd ..

# Build release
cd src-tauri
cargo tauri build

# Binary location:
# macOS: target/release/bundle/dmg/Evidify_4.0.0_aarch64.dmg
# Windows: target/release/bundle/msi/Evidify_4.0.0_x64.msi
```

---

## First Run Walkthrough

### 1. Create Your Vault

When you first launch Evidify, you'll be prompted to create a secure vault:

- Enter a strong passphrase (12+ characters recommended)
- This passphrase encrypts ALL your data
- **There is no recovery** - if you forget it, data is lost
- You'll enter this passphrase each time you open the app

### 2. Add a Test Client

From the Dashboard:
1. Click "Add Client"
2. Enter a pseudonym (e.g., "Test Client 1")
3. Click "Add"

### 3. Create Your First Note

1. Click the client name or "New Note"
2. Enter sample session notes, for example:

```
pt seems more anxious today, talked about work stress. not sleeping 
well. mentioned having some dark thoughts last week but says she's 
fine now. did cbt work on catastrophizing, assigned breathing 
exercises. f/u 2 weeks.
```

3. Click "Generate"

### 4. Review Detections

If risk content is detected:
1. You'll see grouped detections by severity
2. Critical items (red) must be attested
3. Use quick-pick buttons or add notes
4. Complete all attestations to enable signing

### 5. Sign & Complete

1. Once all items are attested, click "Sign & Complete"
2. Note is encrypted and stored
3. View metrics on the Dashboard

---

## Feature Testing Checklist

### ✅ Core Features

| Feature | How to Test | Expected Result |
|---------|-------------|-----------------|
| **Vault Creation** | First launch | Passphrase prompt, vault created |
| **Vault Lock/Unlock** | Click Lock in header, reopen | Must enter passphrase again |
| **Client Management** | Add/view clients | Clients persist across sessions |
| **Note Creation** | Enter text, click Generate | Note saved with hash |
| **AI Structuring** | Enter notes, Generate with Ollama running | SOAP format output |

### ✅ AI Features (Requires Ollama)

| Feature | How to Test | Expected Result |
|---------|-------------|-----------------|
| **Ollama Check** | Dashboard shows "AI: [model]" | Green status if connected |
| **Note Structuring** | Enter raw notes, Generate | Structured SOAP output |
| **RAG Search** | Dashboard → Search box → "anxiety" | Related notes found |
| **Ask Question** | Toggle to "Ask", enter question | Answer with citations |

### ✅ Safety Features

| Feature | How to Test | Expected Result |
|---------|-------------|-----------------|
| **SI Detection** | Enter "patient mentioned wanting to die" | Critical detection shown |
| **HI Detection** | Enter "wants to hurt his brother" | Critical detection shown |
| **Attestation Required** | Try to sign with unattested critical | Button disabled |
| **Quick-Pick** | Click attestation buttons | Response recorded |

### ✅ Voice Scribe (UI Only in Beta)

| Feature | How to Test | Expected Result |
|---------|-------------|-----------------|
| **Toggle Voice** | Click "Voice Scribe" in Capture | Panel appears |
| **Record Button** | Click mic button | Shows recording state |

*Note: Actual transcription requires Whisper integration (Sprint 1)*

### ✅ Metrics Dashboard

| Feature | How to Test | Expected Result |
|---------|-------------|-----------------|
| **View Metrics** | Complete some notes, view Dashboard | Stats display |
| **Period Selection** | Change dropdown (7/30/90 days) | Data updates |

---

## Known Limitations (Beta)

| Limitation | Status | ETA |
|------------|--------|-----|
| Voice transcription is placeholder | Stub | Sprint 1 |
| Embeddings are pseudo-random | Stub | Sprint 1 |
| No code signing | Planned | Sprint 2 |
| No auto-updates | Planned | Sprint 2 |

---

## Test Data Samples

### Sample 1: Progress Note with Risk

```
Client presents today reporting increased anxiety over the past week. 
States she has been having difficulty sleeping and concentrating at work. 
Mentioned "sometimes I wonder if things would be easier if I wasn't here" 
but denies active suicidal ideation or plan. Discussed safety planning 
and coping strategies. Client agreed to reach out if thoughts worsen. 
Continue current medication regimen. Follow up in one week.
```

**Expected:** Critical SI detection, requires attestation

### Sample 2: Progress Note (Low Risk)

```
Follow-up session. Patient reports medication is helping with sleep. 
Mood improved from last session. Continuing to practice mindfulness 
exercises we discussed. No safety concerns. Will continue current 
treatment plan. Next session in two weeks.
```

**Expected:** No critical detections, can sign directly

### Sample 3: Intake Note

```
New patient intake. 34yo female presenting with symptoms of generalized 
anxiety disorder. Reports excessive worry about work and family for 
past 6 months. Difficulty sleeping 3-4 nights per week. Denies substance 
use. No prior psychiatric history. GAD-7 score: 14 (moderate). PHQ-9 
score: 8 (mild). Recommended weekly CBT sessions and psychiatric consult 
for medication evaluation.
```

**Expected:** May flag clinical risk items, coaching suggestions

---

## Reporting Issues

During beta testing, please note:

1. **What you were doing** when the issue occurred
2. **What you expected** to happen
3. **What actually happened**
4. **Any error messages** (screenshot if possible)

---

## File Locations

| Item | Location |
|------|----------|
| Vault database | `~/Library/Application Support/com.evidify.app/` (macOS) |
| Logs | `~/Library/Logs/com.evidify.app/` (macOS) |
| Config | In vault (encrypted) |

---

## Troubleshooting

### "AI: Limited" shown on Dashboard

1. Check Ollama is running: `ollama list`
2. Ensure model is pulled: `ollama pull qwen2.5:7b-instruct`
3. Check port: `curl http://localhost:11434/api/tags`

### App won't start

1. Check Node.js installed: `node --version` (need 18+)
2. Check Rust installed: `rustc --version` (need 1.70+)
3. Run `npm install` in frontend directory

### Forgot passphrase

**There is no recovery.** The vault must be deleted and recreated.

```bash
# macOS - DELETE ALL DATA
rm -rf ~/Library/Application\ Support/com.evidify.app/
```

---

## Support

Beta support: [your support channel]

---

*Thank you for testing Evidify!*
