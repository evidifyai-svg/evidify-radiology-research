# Evidify User Manual
## Complete Documentation for Clinicians

**Version:** 4.2.0  
**Last Updated:** January 2026

---

# Table of Contents

1. [Getting Started](#1-getting-started)
2. [Core Workflows](#2-core-workflows)
3. [Voice Scribe](#3-voice-scribe)
4. [AI Structuring](#4-ai-structuring)
5. [Ethics Detection & Attestation](#5-ethics-detection--attestation)
6. [Client Management](#6-client-management)
7. [Exporting & Sharing](#7-exporting--sharing)
8. [Supervision Features](#8-supervision-features)
9. [Security & Privacy](#9-security--privacy)
10. [Troubleshooting](#10-troubleshooting)
11. [Keyboard Shortcuts](#11-keyboard-shortcuts)
12. [Glossary](#12-glossary)

---

# 1. Getting Started

## 1.1 Installation

### macOS

1. **Download** Evidify from the provided link
2. **Drag** Evidify.app to your Applications folder
3. **First launch**: Right-click → Open (bypasses Gatekeeper for unsigned dev builds)
4. **Install AI prerequisites**:
   ```bash
   # Install Ollama for AI features
   brew install ollama
   ollama serve  # Run in background
   ollama pull qwen2.5:7b-instruct
   
   # Optional: Voice Scribe
   brew install whisper-cpp
   mkdir -p ~/whisper-models
   curl -L -o ~/whisper-models/ggml-base.en.bin \
     'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin'
   ```

### Windows

1. **Download** the Evidify installer (.msi)
2. **Run** the installer with administrator privileges
3. **Install prerequisites** (Ollama, whisper.cpp) from their websites

## 1.2 Creating Your Vault

Your vault is the encrypted container for all clinical data.

1. **Launch Evidify** — you'll see the vault creation screen
2. **Create a passphrase** — at least 12 characters, mix of letters/numbers/symbols
3. **Confirm passphrase** — enter it again to verify
4. Click **Create Vault**

⚠️ **Critical**: There is no passphrase recovery. If you forget your passphrase, your data cannot be retrieved. This is by design for security.

💡 **Tip**: Store your passphrase in a password manager or write it down and keep it in a secure physical location.

## 1.3 Unlocking Your Vault

1. **Launch Evidify**
2. **Enter your passphrase**
3. Click **Unlock**

The vault automatically locks after 15 minutes of inactivity (configurable).

## 1.4 First-Time Setup Checklist

- [ ] Vault created successfully
- [ ] Ollama running and connected (check AI status indicator)
- [ ] Voice Scribe configured (optional)
- [ ] Added first test client
- [ ] Created first test note
- [ ] Reviewed security settings

---

# 2. Core Workflows

## 2.1 Creating a Session Note

### Quick Path (< 2 minutes)

1. **Select client** from sidebar or Quick Capture
2. **Choose note type** (SOAP, DAP, Progress, Intake)
3. **Enter content**:
   - Type your clinical observations
   - OR use Voice Scribe for dictation
4. Click **Generate Structure** (AI organizes into template)
5. **Review** AI suggestions (MSE, risk factors, plan)
6. **Attest** to any flagged safety items
7. Click **Sign Note** to finalize

### Detailed Workflow

#### Step 1: Select Client
- Click client name in sidebar
- OR use Quick Capture (⌘+N): Start typing client name

#### Step 2: Choose Note Type
| Type | When to Use |
|------|-------------|
| SOAP | Standard session notes |
| DAP | Brief therapy notes |
| Progress | Ongoing treatment documentation |
| Intake | Initial evaluation |
| Crisis | Safety-focused documentation |

#### Step 3: Enter Content
Write your clinical observations naturally. You don't need to follow a specific format — the AI will structure it.

**Good input examples**:
- "Client presented with increased anxiety this week. Reports difficulty sleeping, racing thoughts, and avoidance of social situations. Discussed cognitive restructuring techniques. Assigned thought record homework. Follow-up in 2 weeks."

#### Step 4: Generate Structure
Click the **Generate** button. The AI will:
- Organize content into the selected template
- Extract MSE observations from your text
- Identify risk-related content
- Suggest ICD-10 codes (if applicable)

#### Step 5: Review & Edit
All AI output is marked as "Suggested" and requires your review:
- Verify MSE fields match your observations
- Confirm or modify diagnosis codes
- Adjust treatment plan as needed

#### Step 6: Address Detections
If the Ethics Engine flags content:
1. Review each detection
2. Select appropriate attestation:
   - **Addressed in session** — You discussed/assessed this
   - **Will address next session** — Planned follow-up
   - **Not clinically relevant** — Requires explanation
   - **Consulted supervisor** — For trainees

#### Step 7: Sign Note
Click **Sign Note** to finalize. This:
- Timestamps the note
- Creates cryptographic signature
- Locks note from further editing (amendments only)

---

# 3. Voice Scribe

## 3.1 Overview

Voice Scribe transcribes your spoken notes using local AI (whisper.cpp). **No audio leaves your device.**

## 3.2 Quick Debrief Mode (90 seconds)

For post-session documentation:

1. **Select client** 
2. Click **Voice Scribe** button (🎙️)
3. **Speak naturally** about the session (60-90 seconds typical)
4. Click **Stop & Transcribe**
5. Review and edit transcription
6. Click **Generate Structure** for AI formatting

**Example debrief**:
> "Session with John, follow-up for depression. He reported improved mood this week, PHQ-9 down to 12 from 16 last session. Continued CBT focus on behavioral activation. He's been walking daily and noticed energy improvement. No safety concerns today. Plan to continue current approach, follow up in two weeks."

## 3.3 Full Session Recording (Optional)

For longer recordings:

1. Ensure **client consent** is documented
2. Click **Record Session** before starting
3. Conduct session normally
4. Click **End Recording**
5. Processing may take 2-5 minutes for 50-minute session

## 3.4 Audio Handling

| Setting | Default | Description |
|---------|---------|-------------|
| Auto-delete after signing | Yes | Audio is permanently deleted when note is signed |
| Max retention | 24 hours | Audio auto-deletes if note not signed |
| Consent required | Yes | Must document consent before recording |

## 3.5 Troubleshooting Voice Scribe

**"whisper-cpp not found"**
```bash
brew install whisper-cpp
```

**"No models available"**
```bash
mkdir -p ~/whisper-models
curl -L -o ~/whisper-models/ggml-base.en.bin \
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin'
```

**Slow transcription**
- Use smaller model (tiny.en instead of base.en)
- Close other CPU-intensive applications
- Consider upgrading hardware

---

# 4. AI Structuring

## 4.1 How It Works

The AI assistant runs locally via Ollama. It:
- Structures your free-form input into clinical templates
- Extracts MSE observations from narrative text
- Identifies themes and patterns
- Suggests relevant codes

**The AI does NOT**:
- Diagnose patients
- Make risk determinations
- Generate content you didn't provide
- Send any data over the network

## 4.2 AI Indicators

All AI-generated content is clearly marked:

| Indicator | Meaning |
|-----------|---------|
| 💡 Suggested | AI-generated, requires your review |
| ✏️ User edited | You modified the AI suggestion |
| ✓ Confirmed | You approved this content |

## 4.3 MSE Extraction

The AI attempts to extract Mental Status Exam observations from your narrative:

| Field | What AI looks for |
|-------|-------------------|
| Appearance | Descriptions of dress, grooming, hygiene |
| Behavior | Motor activity, eye contact, cooperation |
| Mood | Reported emotional state |
| Affect | Observed emotional expression |
| Thought process | Organization, coherence, tangentiality |
| Thought content | Themes, preoccupations, delusions |
| Cognition | Orientation, attention, memory |
| Insight/Judgment | Awareness of condition, decision-making |

**Important**: Always verify AI-extracted MSE observations match your clinical assessment.

## 4.4 Confidence Indicators

Low-confidence extractions are marked "⚠️ Review Required":
- The AI wasn't certain about the extraction
- Your source text was ambiguous
- Critical fields should never be left unchecked

---

# 5. Ethics Detection & Attestation

## 5.1 How Detection Works

The Ethics Engine uses **rule-based pattern matching** (not AI) to identify potentially significant clinical content. This makes detection:
- **Deterministic** — Same input always produces same flags
- **Auditable** — Every flag traceable to specific rule
- **Reliable** — No hallucination risk

## 5.2 Severity Levels

| Level | Icon | Meaning | Required Action |
|-------|------|---------|-----------------|
| **Critical** | 🔴 | Safety or mandatory reporting | Must attest before signing |
| **High** | 🟠 | Significant clinical concern | Must attest before signing |
| **Medium** | 🟡 | Documentation consideration | Review recommended |
| **Low** | 🔵 | Style/completeness suggestion | Optional review |

## 5.3 Detection Categories

### Safety (Critical)
- Suicidal ideation (direct, euphemistic, rehearsal imagery)
- Homicidal ideation
- Means access
- Driving impairment
- Substance + risk combinations

### Mandatory Reporting (Critical)
- Child abuse/neglect indicators
- Elder abuse/neglect indicators
- Vulnerable adult concerns

### Duty to Warn (Critical)
- Threats to identifiable third parties
- Escalating violence patterns

### Telehealth (Critical)
- Location changes
- Privacy concerns
- Jurisdiction issues

### Documentation (Medium)
- Risk-intervention mismatch
- Capacity concerns
- Diagnosis deferred without rationale

### Boundary (Low)
- Contact requests
- Gift mentions
- Dependency language

## 5.4 Attestation Process

When detections are flagged:

1. **Review** the detection and evidence snippet
2. **Select response**:
   - **Addressed in session** — Documented the assessment/intervention
   - **Will address next session** — Planned follow-up (enter date)
   - **Not clinically relevant** — Explain why (required)
   - **Consulted supervisor** — Name supervisor (for trainees)
3. **Submit** attestation

All attestations are:
- Timestamped
- Cryptographically signed
- Permanently linked to the note
- Part of the audit trail

## 5.5 Why This Matters

Attestations demonstrate standard of care:
- **Malpractice defense**: Shows you considered flagged content
- **Audit preparation**: Pre-documented clinical decisions
- **Training**: Supervisors can review attestation patterns

---

# 6. Client Management

## 6.1 Adding Clients

1. Click **+ New Client** in sidebar
2. Enter display name (can be pseudonym)
3. Add optional details:
   - Pronouns
   - Primary diagnosis
   - Insurance info
   - Emergency contact

## 6.2 Client Views

| View | Content |
|------|---------|
| **Overview** | Active alerts, recent sessions, measures |
| **Notes** | All session notes with search/filter |
| **Progress** | Outcome measures over time |
| **Treatment Plan** | Goals, objectives, interventions |
| **Timeline** | Knowledge graph of themes |

## 6.3 Archiving Clients

When treatment ends:
1. Open client profile
2. Click **Archive Client**
3. Notes remain in vault for retention compliance
4. Client hidden from active sidebar

---

# 7. Exporting & Sharing

## 7.1 Export Formats

| Format | Use Case |
|--------|----------|
| PDF | Sharing with clients, attorneys, agencies |
| DOCX | Editable reports, letters |
| JSON | Backup, migration |
| Audit Pack | Legal/compliance response |

## 7.2 Export Controls

Evidify prevents accidental PHI leakage by classifying export destinations:

| Destination | Classification | Action |
|-------------|---------------|--------|
| Local folder (non-synced) | ✅ Safe | Allowed |
| iCloud, OneDrive, Dropbox, Google Drive | ⚠️ Cloud-Sync | Warning or Block |
| Network share | ⚠️ Network | Warning |
| USB/External drive | ⚠️ Removable | Warning + Audit |

## 7.3 Generating an Audit Pack

For records requests (payer audits, subpoenas, licensing boards):

1. Go to **Tools → Generate Audit Pack**
2. Select date range
3. Select clients (or all)
4. Choose pack type:
   - **Full** — All notes + attestations + audit log
   - **Summary** — Note summaries only
   - **Legal** — Chain-of-custody focused
5. Click **Generate**
6. Export to secure location

The pack includes:
- All notes in date range
- Amendment history
- Attestation records
- Chain-of-custody verification
- Export certificate

---

# 8. Supervision Features

## 8.1 Supervisor Dashboard

Supervisors see:
- **Review Queue** — Notes pending co-signature
- **Flagged Items** — High-severity detections
- **Activity** — Supervisee documentation metrics
- **Competencies** — Progress tracking

## 8.2 Co-Signature Workflow

1. Supervisee creates and signs note
2. Note appears in supervisor's queue
3. Supervisor reviews:
   - Note content
   - Attestations
   - Detections
4. Supervisor adds feedback annotations (optional)
5. Supervisor clicks **Co-Sign**

## 8.3 Feedback Annotations

Supervisors can annotate specific note sections:

| Category | Use |
|----------|-----|
| 💪 Strength | Highlight good documentation |
| 📈 Improvement | Suggest enhancement |
| ⚠️ Critical | Flag serious concern |
| ❓ Question | Request clarification |
| 📚 Teaching | Link to learning resource |

Annotations are visible only to supervisor and supervisee.

---

# 9. Security & Privacy

## 9.1 Privacy Architecture

- **All PHI encrypted** with AES-256 (SQLCipher)
- **Keys in OS Keychain** — Protected by system security
- **No network required** — Core features work offline
- **Local AI only** — Ollama runs on localhost
- **No telemetry** — No usage data collected

## 9.2 Verifying Privacy

To verify Evidify works offline:
1. Disable WiFi / unplug ethernet
2. Use Evidify normally
3. Confirm all features work

## 9.3 Vault Security

| Feature | Implementation |
|---------|----------------|
| Encryption | AES-256-CBC via SQLCipher |
| Key derivation | Argon2id (memory-hard) |
| Key storage | macOS Keychain / Windows DPAPI |
| Auto-lock | 15 minutes inactivity (configurable) |
| Tamper detection | SHA-256 hash chain |

## 9.4 Clipboard Security

When you copy clinical content:
- Clipboard auto-clears after 30 seconds
- Event is logged (no content logged)
- Configurable in Settings

## 9.5 What About Backups?

Your vault file (`vault.db`) can be backed up:
- The file remains encrypted
- Requires your passphrase to open
- Recommendation: Back up to encrypted external drive

---

# 10. Troubleshooting

## 10.1 Common Issues

### Ollama not connecting

**Symptoms**: AI features unavailable, "Cannot connect to Ollama" message

**Solutions**:
```bash
# Check if Ollama is running
pgrep -x ollama

# If not running, start it
ollama serve

# Check model is installed
ollama list
# Should show qwen2.5:7b-instruct

# If model missing
ollama pull qwen2.5:7b-instruct
```

### Vault won't unlock

**Symptoms**: Passphrase rejected

**Solutions**:
- Verify caps lock is off
- Try typing passphrase in a text editor first
- Check for special characters that may vary by keyboard

**If you've forgotten your passphrase**: Unfortunately, there is no recovery. This is by design for security. You'll need to create a new vault.

### App won't start

**Symptoms**: App crashes on launch or shows error

**Solutions**:
1. Check Console.app for crash logs
2. Try launching from Terminal:
   ```bash
   /Applications/Evidify.app/Contents/MacOS/Evidify
   ```
3. Check for permissions issues (Keychain access)

### Export blocked

**Symptoms**: Can't export to desired location

**Cause**: Destination is a cloud-synced folder

**Solutions**:
- Export to Downloads or Desktop first
- Move file manually after export
- Or disable cloud sync for that folder

## 10.2 Getting Help

1. **In-app feedback**: Click thumbs-down on any response
2. **Support**: support@evidify.ai
3. **Documentation**: docs.evidify.ai

When contacting support:
- Include app version (Help → About)
- Describe steps to reproduce
- Do NOT include PHI in support requests

---

# 11. Keyboard Shortcuts

## Global

| Shortcut | Action |
|----------|--------|
| ⌘ + N | New note (Quick Capture) |
| ⌘ + / | Command palette |
| ⌘ + L | Lock vault |
| ⌘ + , | Settings |
| ⌘ + F | Search |

## Note Editor

| Shortcut | Action |
|----------|--------|
| ⌘ + Enter | Generate structure |
| ⌘ + Shift + S | Sign note |
| ⌘ + E | Export |
| ⌘ + A | Select all |
| Tab | Next field |
| Shift + Tab | Previous field |

## Voice Scribe

| Shortcut | Action |
|----------|--------|
| ⌘ + R | Start/stop recording |
| Space | Pause/resume (when recording) |

---

# 12. Glossary

| Term | Definition |
|------|------------|
| **Attestation** | Clinician acknowledgment of flagged content with documented response |
| **Audit Pack** | Complete documentation package for legal/compliance response |
| **Chain of Custody** | Cryptographic proof that records haven't been altered |
| **DAP** | Data, Assessment, Plan — therapy note format |
| **Detection** | Flagged content identified by Ethics Engine |
| **Ethics Engine** | Rule-based system identifying clinically significant content |
| **MSE** | Mental Status Examination |
| **Ollama** | Local AI runtime for language models |
| **PHI** | Protected Health Information (HIPAA term) |
| **SOAP** | Subjective, Objective, Assessment, Plan — note format |
| **SQLCipher** | Encrypted SQLite database |
| **Vault** | Encrypted container for all clinical data |
| **Voice Scribe** | Local speech-to-text transcription feature |
| **Whisper** | OpenAI's speech recognition model (runs locally) |

---

# Appendix A: AI Scope & Limitations

## What AI Does

- Organizes your input into clinical templates
- Extracts observations from narrative text
- Identifies themes and patterns
- Suggests relevant codes for your review

## What AI Does NOT Do

- Make diagnoses
- Determine risk levels
- Generate clinical content not in your input
- Provide treatment recommendations
- Replace your clinical judgment

## Your Responsibilities

- Verify all AI suggestions before signing
- Make independent clinical assessments
- Document your own observations and judgments
- Use AI output as starting point, not final product

---

# Appendix B: Compliance Notes

## HIPAA Applicability

Evidify's local-first architecture means:
- **No Business Associate Agreement typically required** — PHI doesn't leave your device
- **You remain the Covered Entity** — Standard HIPAA obligations apply to you
- **Documentation of security measures** — Keep this for your records

## State Licensing

When using telehealth features:
- Verify your license covers client's location
- Document location verification each session
- Follow PSYPACT or state-specific requirements

## Medical Records Requirements

- Maintain records per your state requirements (typically 7+ years)
- Evidify supports but doesn't enforce retention
- Back up your vault according to your policy

---

*This manual is part of the Evidify training curriculum. For questions, contact support@evidify.ai*
