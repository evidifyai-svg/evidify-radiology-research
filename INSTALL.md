# Evidify Installation Guide

**Version:** 4.1.2-hotfix3  
**Last Updated:** January 8, 2026

---

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| macOS | 12.0+ (Monterey) | 14.0+ (Sonoma) |
| Windows | 10 (64-bit) | 11 |
| RAM | 8 GB | 16 GB |
| Storage | 4 GB free | SSD with 10 GB free |
| Node.js | 18.0+ | 20.x LTS |
| Rust | 1.70+ | Latest stable |

---

## Quick Start (Development Mode)

### Step 1: Install Prerequisites

**macOS:**
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@20

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify installations
node --version    # Should show v20.x.x
npm --version     # Should show 10.x.x
rustc --version   # Should show 1.7x.x
```

**Windows (PowerShell as Admin):**
```powershell
# Install Node.js - download from https://nodejs.org/
# Choose "LTS" version (20.x)

# Install Rust - download from https://rustup.rs/
# Run rustup-init.exe and follow prompts

# Verify installations (new terminal)
node --version
npm --version
rustc --version
```

### Step 2: Install AI Runtime (Ollama)

**macOS:**
```bash
# Option A: Homebrew
brew install ollama

# Option B: Direct download
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
1. Download from https://ollama.com/download
2. Run the installer
3. Ollama will start automatically

**Pull a model:**
```bash
# Start Ollama (if not running)
ollama serve

# In another terminal, pull a model
ollama pull qwen2.5:7b-instruct

# Verify
ollama list
```

Expected output:
```
NAME                      SIZE
qwen2.5:7b-instruct      4.7 GB
```

### Step 3: Clone and Install

```bash
# Extract the zip (if you have a zip file)
unzip evidify-beta-v4.1.2-hotfix3.zip
cd evidify-v9

# OR clone from repository (if applicable)
# git clone https://github.com/your-org/evidify.git
# cd evidify

# Install frontend dependencies
cd frontend
npm install

# Return to root
cd ..
```

### Step 4: Run Development Server

```bash
# From the evidify-v9 directory
cd frontend
npm run tauri dev
```

**Expected behavior:**
1. Terminal shows "Compiling..." messages
2. After 1-2 minutes, app window opens
3. Dashboard shows "AI: qwen2.5:7b-instruct" in green

**If you see a blank page:**
- Do NOT open `index.html` directly
- Use `npm run tauri dev` command
- Check that Ollama is running: `curl http://localhost:11434/api/tags`

---

## Production Build

```bash
cd frontend
npm install

cd ../src-tauri
cargo tauri build
```

**Output locations:**
- macOS: `target/release/bundle/dmg/Evidify_4.1.2_aarch64.dmg`
- Windows: `target/release/bundle/msi/Evidify_4.1.2_x64.msi`

---

## Development vs Production Configuration

Evidify uses separate configurations for development and production:

| Config | Purpose | CSP |
|--------|---------|-----|
| `tauri.conf.json` | **Production builds** | Strict (no localhost/ws) |
| `tauri.conf.dev.json` | **Development only** | Allows HMR websockets |

**For development:**
```bash
npm run tauri dev -- --config src-tauri/tauri.conf.dev.json
```

**For production builds:**
```bash
npm run tauri build
# Uses tauri.conf.json by default (strict CSP)
```

⚠️ **Never ship builds with dev CSP** - run `scripts/check_csp_release.sh` before release.

---

## Troubleshooting

### "Blank page" or app won't load

1. **Check Node version:**
   ```bash
   node --version
   # Must be 18.0 or higher
   ```

2. **Reinstall dependencies:**
   ```bash
   cd frontend
   rm -rf node_modules
   npm install
   ```

3. **Check Ollama is running:**
   ```bash
   curl http://localhost:11434/api/tags
   # Should return JSON with model list
   ```

4. **Try the web-only dev server first:**
   ```bash
   cd frontend
   npm run dev
   # Open http://localhost:5173 in browser
   ```

### "Cannot find module" errors

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Ollama connection issues

1. **Start Ollama:**
   ```bash
   ollama serve
   ```

2. **Check it's listening:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

3. **Ensure model is pulled:**
   ```bash
   ollama list
   # If empty, run:
   ollama pull qwen2.5:7b-instruct
   ```

### Rust compilation errors

1. **Update Rust:**
   ```bash
   rustup update stable
   ```

2. **Clear build cache:**
   ```bash
   cd src-tauri
   cargo clean
   ```

### macOS Gatekeeper warning

If macOS blocks the app:
1. Right-click the app
2. Select "Open"
3. Click "Open" in the dialog

Or in System Preferences → Security & Privacy → "Open Anyway"

---

## AI Provider Options

### Option A: Ollama (Recommended)

**Pros:** Easy setup, good performance, model flexibility  
**Cons:** Requires separate install/service

```bash
# Install
brew install ollama  # or download from ollama.com

# Start service
ollama serve

# Pull model
ollama pull qwen2.5:7b-instruct
```

### Option B: WebLLM (Experimental)

**Pros:** No external service, browser-contained  
**Cons:** Large download, WebGPU required, memory intensive

Requirements:
- Chrome 113+ or Edge 113+
- WebGPU enabled (check chrome://gpu)
- 8GB+ RAM

The app will show "WebLLM: downloading..." on first use.

---

## Verifying Installation

After launching Evidify:

1. **Dashboard shows AI status:**
   - ✅ "AI: qwen2.5:7b-instruct" (green)
   - ⚠️ "AI: Limited" (yellow) - Ollama not running

2. **Create a test note:**
   - Add a client
   - Enter test text
   - Click "Generate"
   - Should see structured output

3. **Check vault encryption:**
   - Create vault with passphrase
   - Close app completely
   - Reopen - should require passphrase again

---

## Offline Operation

After initial setup, Evidify works fully offline:

1. **Ollama models are cached locally**
2. **No network required for:**
   - Note creation
   - AI structuring
   - Ethics detection
   - Attestation

3. **Network connections:**
   - Ollama: loopback only (127.0.0.1:11434)
   - No external network egress
   - No version check or update mechanism (planned for future)

---

## Beta Limitations

**These features are stubs in the current beta:**

| Feature | Status | What Works |
|---------|--------|------------|
| Voice transcription | **Stub** | UI shows recording state, returns placeholder text |
| Semantic search | **Stub** | Uses deterministic pseudo-embeddings (not production quality) |
| Code signing | **Not implemented** | macOS Gatekeeper may warn on first launch |

**These features are fully functional:**
- Vault encryption (AES-256, passphrase-derived keys)
- Client/note management
- AI structuring via Ollama
- Risk detection and attestation
- Audit logging with chain verification
- Deep analysis (inconsistency detection, trajectory tracking)

---

## Security Verification

You can verify the local-only posture:

```bash
# 1. Disconnect from network
# (Turn off WiFi or unplug ethernet)

# 2. Launch Evidify - should work normally
# (Ollama must be running locally)

# 3. Verify no external connections
lsof -i -P | grep Evidify
# Expected: Only localhost:11434 (Ollama)
```

---

## Getting Help

- Check `06_TROUBLESHOOTING.md` in the dev bundle
- Review browser console (F12 → Console tab)
- Check terminal output for Rust errors

---

## Next Steps

1. **Create your vault** - Choose a strong passphrase
2. **Add a test client** - Use a pseudonym
3. **Try voice capture** - If microphone available
4. **Review the PRD** - `EVIDIFY_MASTER_PRD_JAN2026.md`

---

*Installation issues? The most common fix is: `rm -rf node_modules && npm install`*
