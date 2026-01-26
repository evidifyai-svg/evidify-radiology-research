# Running Evidify v4.2.1-beta Locally

## Your Current Setup

The complete codebase is at:
```
/home/claude/evidify/evidify-v9/
```

**New v4.2.1 features to test:**
- Policy Configuration UI (`PolicySettings.tsx`)
- Beta Onboarding Wizard (`BetaOnboarding.tsx`)
- Test Harness (`TestHarness.tsx`)
- Performance optimizations (`performance.rs`, `performance.ts`)
- MDM packages (Jamf, Intune)

---

## Prerequisites

### 1. Install Rust (if not installed)
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify
rustc --version  # Need 1.70+
```

### 2. Install Node.js (if not installed)
```bash
# macOS with Homebrew
brew install node@20

# Or use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Verify
node --version  # Need 18+
```

### 3. Install Tauri CLI
```bash
cargo install tauri-cli
```

### 4. Install & Start Ollama
```bash
# macOS
brew install ollama

# Or download from https://ollama.ai/download

# Start Ollama (keep running in separate terminal)
ollama serve

# In another terminal, pull a model
ollama pull llama3.2
# Or for better quality: ollama pull qwen2.5:7b-instruct

# Verify
ollama list
```

---

## Run the App

### Option A: Full App (Tauri + React)

```bash
# Navigate to project
cd /path/to/evidify-v9

# Install frontend dependencies (first time only)
cd frontend && npm install && cd ..

# Run in development mode
cargo tauri dev
```

**First build takes 3-5 minutes** (compiling Rust + SQLCipher).  
Subsequent runs start in ~10 seconds.

### Option B: Frontend Only (for UI testing)

```bash
cd /path/to/evidify-v9/frontend

# Install dependencies
npm install

# Run Vite dev server
npm run dev
```

Open http://localhost:5173 in browser.

**Note:** API calls will fail without Tauri backend, but you can test:
- UI layouts and styling
- Component rendering
- Form interactions (without submission)

---

## Testing the New Features

### Quick Test with TestHarness

The easiest way to test all new features is the TestHarness component.

**Modify `App.tsx` temporarily:**

```tsx
// At the top of App.tsx, add:
import { TestHarness } from './components/TestHarness';

// Replace the return statement in the App component:
export default function App() {
  // ... existing state code ...

  // TEMPORARY: Return test harness instead of main app
  return <TestHarness />;

  // Original return commented out:
  // return (
  //   <div className="app">
  //     {renderScreen()}
  //   </div>
  // );
}
```

This gives you a dashboard with buttons to test:
- Policy Settings modal
- Beta Onboarding wizard
- Backend performance stats
- Frontend utilities (cache, debounce, memoize)

### Test Policy Settings Standalone

```tsx
import { PolicySettings } from './components/PolicySettings';

// Render anywhere:
<PolicySettings 
  onClose={() => console.log('closed')} 
  readOnly={false}
/>
```

### Test Beta Onboarding Standalone

```tsx
import { BetaOnboarding } from './components/BetaOnboarding';

// Render as modal overlay:
<BetaOnboarding 
  onComplete={() => console.log('done')}
  onSkip={() => console.log('skipped')}
/>
```

---

## Expected Behaviors

### On First Launch (No Vault)

1. App shows "Create Vault" screen
2. Enter a passphrase
3. Vault is created with encryption key in OS keychain
4. Dashboard loads

### With Ollama Running

- Status indicator: 🟢 green
- "AI Structure" button enabled on notes
- Voice Scribe transcription works

### Without Ollama

- Status indicator: 🔴 red  
- AI features disabled but app still works
- Manual note entry still functions

### Keychain Prompts (macOS)

Development builds will prompt for keychain access multiple times. This is normal for unsigned builds.

---

## Testing Checklist

### Core Functionality
- [ ] Vault creation works
- [ ] Unlock with correct passphrase
- [ ] Lock vault works
- [ ] Create client
- [ ] Create note
- [ ] Edit note
- [ ] Sign note with attestations

### Voice Scribe
- [ ] Recording starts/stops
- [ ] Countdown timer shows
- [ ] Visualization works
- [ ] Transcription generates (with Ollama)

### New v4.2.1 Features

**Policy Settings:**
- [ ] Opens without errors
- [ ] All 5 sections expand/collapse
- [ ] Export controls change
- [ ] Attestation settings change
- [ ] Recording policy toggles work
- [ ] Supervision checkboxes work
- [ ] Export to JSON works
- [ ] Import from JSON works

**Beta Onboarding:**
- [ ] All 6 steps navigate correctly
- [ ] System checks run automatically
- [ ] Profile fields accept input
- [ ] Consent checkboxes work
- [ ] Complete fires onComplete callback
- [ ] Skip fires onSkip callback

**Performance:**
- [ ] `getPerformanceStats()` returns data
- [ ] `clearCaches()` completes
- [ ] Frontend cache works
- [ ] Debounce/throttle work

---

## File Locations During Development

| Item | Location |
|------|----------|
| Vault database | `~/Library/Application Support/ai.evidify/` |
| Dev logs | Terminal output |
| Frontend code | `frontend/src/` |
| Backend code | `src-tauri/src/` |
| Test harness | `frontend/src/components/TestHarness.tsx` |

---

## Common Issues

### "failed to run custom build command for `rusqlite`"

SQLCipher needs C compiler:
```bash
# macOS
xcode-select --install

# Or install full Xcode from App Store
```

### "Ollama connection refused"

```bash
# Check if running
curl http://127.0.0.1:11434/api/tags

# If not, start it
ollama serve
```

### "Cannot find module '@tauri-apps/api'"

```bash
cd frontend
rm -rf node_modules
npm install
```

### TypeScript errors on new components

```bash
cd frontend
npx tsc --noEmit  # Check for type errors
```

### Keychain constantly prompting

This is expected for unsigned dev builds. Each keychain operation prompts.
In production builds with code signing, this won't happen.

---

## Building for Distribution

### Development Build (what you're running)
```bash
cargo tauri dev
```

### Release Build (optimized, for distribution)
```bash
cargo tauri build
```

Output locations:
- macOS: `src-tauri/target/release/bundle/dmg/Evidify_x.x.x_aarch64.dmg`
- Windows: `src-tauri/target/release/bundle/msi/Evidify_x.x.x_x64_en-US.msi`

**Note:** Without code signing, these builds will trigger Gatekeeper (macOS) or SmartScreen (Windows) warnings. See the beta installation guide for bypass instructions.

---

## Reset Everything (Fresh Start)

```bash
# Delete vault and all data
rm -rf ~/Library/Application\ Support/ai.evidify/

# Delete keychain entries (macOS)
security delete-generic-password -s "ai.evidify.vault" 2>/dev/null

# Clean build artifacts
cd src-tauri && cargo clean && cd ..
cd frontend && rm -rf node_modules && npm install && cd ..

# Restart
cargo tauri dev
```

---

## Quick Commands Reference

```bash
# Run app
cargo tauri dev

# Run frontend only
cd frontend && npm run dev

# Build release
cargo tauri build

# Check Rust compilation
cd src-tauri && cargo check

# Check TypeScript
cd frontend && npx tsc --noEmit

# Update dependencies
cd frontend && npm update
cd src-tauri && cargo update

# Start Ollama
ollama serve

# Pull AI model
ollama pull llama3.2
```

---

**Ready to test!** Run `cargo tauri dev` and verify the new features work before sending to beta testers.
