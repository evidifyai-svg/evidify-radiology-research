# Evidify Beta Quick Start

**Version:** 4.1.2-hotfix15  
**Platform:** macOS (Apple Silicon & Intel)  
**Time to Setup:** ~15-20 minutes

---

## 🚀 One-Page Setup

### Step 1: Install Prerequisites (5-10 min)

Open Terminal and run these commands:

```bash
# Install Homebrew (if you don't have it)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js 20
brew install node@20

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install Ollama (AI engine)
brew install ollama
```

### Step 2: Setup AI Model (2-5 min)

```bash
# Start Ollama (keep this terminal open)
ollama serve
```

**In a new terminal:**
```bash
# Download the AI model (~5GB)
ollama pull qwen2.5:7b-instruct

# Verify it's installed
ollama list
```

### Step 3: Setup Voice Transcription (Optional, 2-5 min)

```bash
# Install whisper.cpp
brew install whisper-cpp

# Create a folder for models
mkdir -p ~/whisper-models

# Download a model (base.en is ~150MB, good balance of speed/quality)
curl -L -o ~/whisper-models/ggml-base.en.bin \
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin'

# For better quality (but slower), use medium instead (~1.5GB):
# curl -L -o ~/whisper-models/ggml-medium.en.bin \
#   'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en.bin'
```

**Note:** Voice transcription in Evidify is still in development. The model path will need to be configured in the app.

### Step 4: Run Evidify (2-3 min)

```bash
# Extract and enter the app folder
cd ~/Downloads
unzip evidify-beta-v4.1.2-hotfix15.zip
cd evidify-v9

# Install dependencies (first time only)
cd frontend && npm ci && cd ..

# Launch the app
cargo tauri dev
```

**First build takes 2-5 minutes.** Subsequent launches are fast.

---

## ⚠️ Expected Prompts

### Keychain Access (Normal for Dev Builds)

You'll see **multiple password prompts** asking to access your keychain. This is expected behavior for unsigned development builds:

1. **"Evidify wants to use your confidential information stored in..."**
   - Enter your **Mac login password**
   - You may need to click "Always Allow" or allow multiple times

This happens because:
- The app stores your vault encryption key in macOS Keychain
- Unsigned dev builds trigger extra security checks
- Each keychain operation may prompt separately

**This won't happen in signed production builds.**

### Gatekeeper Warning

If macOS says the app is from an unidentified developer:
1. Go to **System Preferences → Privacy & Security**
2. Click **"Open Anyway"**

---

## 🔐 First Launch

1. **Create Your Vault**
   - Enter a strong passphrase (12+ characters)
   - ⚠️ **No recovery if forgotten** - write it down securely
   - You'll enter this every time you open the app

2. **Verify AI Connection**
   - Dashboard should show: **"AI: qwen2.5:7b-instruct"** (green)
   - If it shows "AI: Limited" (yellow), Ollama isn't running

3. **Add a Test Client**
   - Click "Add Client"
   - Enter a name (can be pseudonym)

4. **Create a Test Note**
   - Select client from Quick Capture dropdown
   - Enter some session notes
   - Click "AI Structure" then "Generate"

---

## 🔧 Troubleshooting

### "AI: Limited" - Ollama Not Connected

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not running, start it:
ollama serve

# If model not found:
ollama pull qwen2.5:7b-instruct
```

### App Won't Start

```bash
# Check versions
node --version   # Need 18+
rustc --version  # Need 1.70+

# Clean reinstall
cd frontend
rm -rf node_modules
npm ci
cd ..
cargo tauri dev
```

### Rust Compilation Errors

```bash
# Update Rust
rustup update stable

# Clear build cache
cd src-tauri && cargo clean && cd ..
cargo tauri dev
```

### Voice Scribe Says "Whisper model not loaded"

Voice transcription requires whisper.cpp and a model:

```bash
# Install whisper.cpp
brew install whisper-cpp

# Download a model
mkdir -p ~/whisper-models
curl -L -o ~/whisper-models/ggml-base.en.bin \
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin'
```

**Note:** Voice Scribe integration is still in development. The UI shows the recording interface, but full transcription requires additional configuration.

---

## 📋 System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| macOS | 12.0+ (Monterey) | 14.0+ (Sonoma) |
| RAM | 8 GB | 16 GB |
| Storage | 10 GB free | SSD with 15 GB free |
| Processor | Intel or Apple Silicon | Apple Silicon |

---

## 🗂️ File Locations

| Data | Location |
|------|----------|
| Vault (encrypted) | `~/Library/Application Support/com.evidify.app/` |
| Logs | `~/Library/Logs/com.evidify.app/` |
| Ollama models | `~/.ollama/models/` |

---

## ❓ Common Questions

**Q: Can I use a different AI model?**  
A: Yes! Try `ollama pull llama3.2:3b` for lower memory usage. The app auto-detects available models.

**Q: Is my data sent anywhere?**  
A: No. Everything stays local. Ollama runs on localhost only. No network connections except to your own machine.

**Q: What if I forget my passphrase?**  
A: Data cannot be recovered. You must delete the vault and start fresh:
```bash
rm -rf ~/Library/Application\ Support/com.evidify.app/
```

**Q: Why so many keychain prompts?**  
A: Unsigned development builds trigger macOS security checks. Production signed builds won't have this issue.

---

## 🧪 Test the Ethics Detection

Try this note content to test the safety detection system:

```
Patient reports "I'm not suicidal," but describes rehearsals: 
"I imagine the bridge on my commute." Mentions "I cleaned the 
gun last night" then: "It's locked away; I don't have access."
```

**Expected:** Multiple safety detections requiring attestation before signing.

---

## 📞 Support

Having issues? Note:
1. What you were trying to do
2. What happened (error messages, screenshots)
3. Your macOS version and whether you're on Intel or Apple Silicon

---

*Thank you for beta testing Evidify!*
