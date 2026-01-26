# Evidify Beta Installation Guide

**Version:** 4.2.1-beta  
**Last Updated:** January 2026

---

## Prerequisites

Before installing Evidify, you need **Ollama** for AI features.

### Install Ollama

#### macOS
```bash
# Open Terminal and run:
curl -fsSL https://ollama.ai/install.sh | sh

# Then download the AI model:
ollama pull llama3.2
```

#### Windows
1. Download from: https://ollama.ai/download
2. Run the installer
3. Open Command Prompt and run:
   ```
   ollama pull llama3.2
   ```

#### Verify Installation
```bash
ollama list
# Should show: llama3.2:latest
```

---

## macOS Installation

### Step 1: Download

Download `Evidify-4.2.1-beta.dmg` from the link provided in your welcome email.

### Step 2: Mount the DMG

Double-click the downloaded `.dmg` file. A window will open showing the Evidify app.

### Step 3: Copy to Applications

Drag the **Evidify** icon to the **Applications** folder shortcut in the window.

### Step 4: Remove Quarantine (Important!)

Because this is unsigned beta software, macOS will block it. Open **Terminal** and run:

```bash
xattr -cr /Applications/Evidify.app
```

This removes the quarantine flag that macOS places on downloaded apps.

### Step 5: First Launch

1. Open **Finder** → **Applications**
2. **Right-click** (or Control-click) on **Evidify**
3. Select **Open** from the menu
4. Click **Open** in the security dialog

⚠️ If you still see "Evidify can't be opened":
1. Go to **System Settings** → **Privacy & Security**
2. Scroll down to find the Evidify message
3. Click **Open Anyway**
4. Enter your password if prompted

### Step 6: Grant Permissions

Evidify needs:
- **Microphone** access (for Voice Scribe)

When prompted, click **Allow**. You can also grant this in:
System Settings → Privacy & Security → Microphone → Enable Evidify

### Troubleshooting macOS

**"Evidify is damaged and can't be opened"**
```bash
xattr -cr /Applications/Evidify.app
```

**"Evidify cannot be opened because the developer cannot be verified"**
- Right-click → Open (instead of double-clicking)
- Or: System Settings → Privacy & Security → Open Anyway

**Microphone not working**
- System Settings → Privacy & Security → Microphone
- Ensure Evidify is checked

---

## Windows Installation

### Step 1: Download

Download `Evidify-4.2.1-beta-setup.exe` from the link provided in your welcome email.

### Step 2: Run Installer

Double-click the downloaded `.exe` file.

### Step 3: Handle SmartScreen Warning

Windows SmartScreen will show a warning because the app isn't signed:

1. Click **More info** (small text link)
2. Click **Run anyway**

![SmartScreen Warning](smartscreen.png)

This is expected for unsigned software and safe to proceed.

### Step 4: Complete Installation

1. Choose installation location (default is fine)
2. Click **Install**
3. Wait for installation to complete
4. Click **Finish**

### Step 5: Windows Defender (If Prompted)

If Windows Defender flags Evidify:

1. Open **Windows Security**
2. Go to **Virus & threat protection**
3. Click **Protection history**
4. Find the Evidify entry
5. Select **Allow on device**

Or add an exclusion:
1. **Virus & threat protection** → **Manage settings**
2. Scroll to **Exclusions** → **Add or remove exclusions**
3. Click **Add an exclusion** → **Folder**
4. Select: `C:\Users\[YourName]\AppData\Local\Evidify`

### Step 6: Grant Permissions

When Evidify first requests microphone access, click **Yes/Allow**.

### Troubleshooting Windows

**"Windows protected your PC" (SmartScreen)**
- Click "More info" → "Run anyway"

**App blocked by antivirus**
- Add exclusion for Evidify folder (see Step 5)

**"This app can't run on your PC"**
- Ensure you downloaded the correct version (x64 for most PCs)

**Microphone not detected**
- Settings → Privacy → Microphone
- Ensure "Allow apps to access your microphone" is ON
- Ensure Evidify is listed and enabled

---

## Post-Installation Setup

### 1. Launch Evidify

Open Evidify from your Applications folder (macOS) or Start Menu (Windows).

### 2. Complete Onboarding

The onboarding wizard will:
- Verify system requirements
- Collect your profile information
- Explain privacy features
- Tour key features

### 3. Create Your Vault

You'll be prompted to create a secure vault:
- **Choose a strong passphrase** you can remember
- This encrypts all your clinical data
- ⚠️ **There is no password recovery** - if you forget it, data is unrecoverable

### 4. Verify Ollama Connection

In Evidify, check the connection status indicator:
- 🟢 Green = Ollama connected
- 🔴 Red = Ollama not detected

If red:
1. Open Terminal/Command Prompt
2. Run: `ollama serve`
3. Keep it running in the background

### 5. Test Voice Scribe

1. Create a test client (use fake data)
2. Create a new note
3. Click the microphone icon
4. Speak for 30-60 seconds about a hypothetical session
5. Watch it transform into a structured note

---

## System Requirements

### Minimum
- **macOS:** 12.0 (Monterey) or later
- **Windows:** 10 (version 1903) or later
- **RAM:** 8 GB
- **Storage:** 2 GB free space
- **CPU:** Intel i5 / Apple M1 or equivalent

### Recommended
- **RAM:** 16 GB (for faster AI processing)
- **Storage:** 10 GB free space (for AI models)
- **CPU:** Intel i7 / Apple M2 or better

### For Voice Scribe
- Working microphone
- Quiet environment for best results

---

## Getting Help

### Before Contacting Support

1. Check this guide's troubleshooting sections
2. Restart Evidify
3. Restart Ollama (`ollama serve`)
4. Restart your computer

### Contact Support

**Email:** [SUPPORT_EMAIL]  
**Subject:** "Beta Install Issue - [macOS/Windows] - [Brief Description]"

**Include:**
- Your operating system and version
- The exact error message (screenshot if possible)
- What you tried already

---

## Uninstallation

### macOS
1. Quit Evidify
2. Drag Evidify from Applications to Trash
3. To remove data: Delete `~/Library/Application Support/ai.evidify`

### Windows
1. Close Evidify
2. Settings → Apps → Evidify → Uninstall
3. To remove data: Delete `%APPDATA%\ai.evidify`

---

## Quick Reference

| Task | macOS | Windows |
|------|-------|---------|
| Open Evidify | Applications → Evidify | Start Menu → Evidify |
| Start Ollama | `ollama serve` in Terminal | `ollama serve` in CMD |
| App Data Location | `~/Library/Application Support/ai.evidify` | `%APPDATA%\ai.evidify` |
| Logs Location | `~/Library/Logs/ai.evidify` | `%LOCALAPPDATA%\ai.evidify\logs` |

---

**You're ready!** 🚀

If everything is working, proceed to create your first real note. Remember: don't rely solely on Evidify during beta - keep your backup documentation method active.
