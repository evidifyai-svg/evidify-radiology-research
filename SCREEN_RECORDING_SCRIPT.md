# Evidify v4.2.6-beta Screen Recording Script
## 5-7 Minute Demo Walkthrough

**Purpose:** Provide visual proof of application functionality for enterprise procurement

---

## Recording Setup

### Technical Setup
1. **Screen Recording:** QuickTime Player > File > New Screen Recording
2. **Resolution:** Record at 1920x1080 or higher
3. **Audio:** Use built-in mic for brief narration
4. **Window Size:** Resize Evidify to ~1200x800 for good visibility

### Before Recording
- [ ] Fresh vault (or delete existing for demo)
- [ ] Ollama running (`ollama serve`)
- [ ] Disconnect from internet (to show offline capability)
- [ ] Close other apps for clean desktop

---

## Script Outline (Target: 6 minutes)

### 0:00 - 0:30 | Introduction & Vault Creation
**Say:** "This is Evidify version 4.2.6-beta, a local-first clinical documentation platform."

**Show:**
- App icon and launch
- "Create New Vault" screen
- Enter passphrase (type deliberately)
- Vault created confirmation
- **Point out:** "Notice we're offline - see the indicator here"

---

### 0:30 - 1:30 | Create Client
**Say:** "Let me add a client to demonstrate the workflow."

**Show:**
- Click "New Client"
- Enter: "Demo Client - Adult ADHD Eval"
- Add basic details (DOB, phone - use fake data)
- Save client
- Client appears in list

---

### 1:30 - 3:00 | Create Clinical Note
**Say:** "Now I'll create a session note with clinical content."

**Show:**
- Select client
- Click "New Note"
- Select note type (e.g., "Progress Note" or "Intake")
- Type or paste sample content:

```
Chief Complaint: Patient presents for follow-up regarding ADHD management.

Subjective: Patient reports improved focus with current medication regimen. 
Sleep has normalized. Denies side effects. Work performance has improved 
per patient report. Denies suicidal or homicidal ideation.

Objective: Alert, oriented, good eye contact. Speech normal rate and rhythm.
Mood "good," affect euthymic and congruent. Thought process linear and 
goal-directed. No psychomotor abnormalities.

Assessment: ADHD, Combined Presentation - responding well to treatment.
No safety concerns at this time.

Plan: Continue current medication. Follow up in 4 weeks. Patient to 
contact office if concerns arise.
```

- Show note saves
- **Point out:** "All of this is encrypted locally - never leaves this device"

---

### 3:00 - 4:00 | AI Structuring
**Say:** "Now let's use the local AI to structure this note."

**Show:**
- Click "Structure with AI" or "Analyze"
- Show loading indicator
- **Point out:** "This is running on Ollama locally - same machine, no cloud"
- Show structured output (SOAP/DAP format)
- Show before/after comparison
- **Point out:** "The clinician reviews and approves all AI suggestions"

---

### 4:00 - 5:00 | Export to PDF
**Say:** "Let me export this note to PDF."

**Show:**
- Click "Export"
- Select PDF format
- Save dialog appears
- Choose Desktop
- **Point out:** "Notice it warns about cloud-synced folders"
- Open the exported PDF
- Show it renders correctly with all content

---

### 5:00 - 5:45 | Audit Trail
**Say:** "Every action is logged in a tamper-evident audit trail."

**Show:**
- Navigate to Settings > Audit or Audit Log
- Show list of entries
- **Point out:** "Each entry is hash-chained to the previous"
- Click "Verify Chain" if available
- Show verification passes
- **Point out:** "No PHI in audit logs - only event types and IDs"

---

### 5:45 - 6:15 | Lock & Security
**Say:** "The vault can be locked at any time."

**Show:**
- Click Lock or use menu
- Show locked state
- Enter passphrase to unlock
- Vault unlocks, data still present
- **Point out:** "All data encrypted with AES-256 via SQLCipher"

---

### 6:15 - 6:30 | Closing
**Say:** "That's Evidify - local-first clinical documentation with no PHI egress."

**Show:**
- Quick pan of main interface
- Close application
- End recording

---

## Key Points to Emphasize

Throughout the recording, reinforce these differentiators:

1. **"Working Offline"** - Show the offline indicator
2. **"Local AI"** - AI runs on your machine via Ollama
3. **"Encrypted"** - SQLCipher AES-256 encryption
4. **"No PHI Egress"** - Data never leaves the device
5. **"Audit Trail"** - Every action logged, hash-chained
6. **"Clinician Control"** - Human reviews all AI output

---

## Post-Recording

1. **Trim** any dead air or mistakes
2. **Export** as .mov or .mp4 (H.264)
3. **File name:** `Evidify_v4.2.6_Beta_Demo_[DATE].mov`
4. **Size:** Should be under 100MB for easy sharing

---

## Sample Narration (Optional)

If you want tighter narration, here's a condensed script:

> "This is Evidify, a local-first documentation platform for behavioral health. 
> All data is encrypted on-device - nothing goes to the cloud.
> 
> I'll create a vault with a passphrase... and now add a client.
> 
> For this progress note, I'll enter the clinical content... and now 
> use local AI to structure it. This runs on Ollama, on this machine - 
> no internet required.
> 
> I can export to PDF... and here's the audit trail showing every action,
> hash-chained for integrity.
> 
> That's Evidify - clinical documentation that stays where it belongs: 
> on the clinician's device."
