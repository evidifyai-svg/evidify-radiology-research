# Evidify Forensic Beta Tester Onboarding

**Version:** 1.1  
**Date:** 2026-01-12

---

## Welcome, Beta Tester!

Thank you for helping test Evidify Forensic. Your feedback directly shapes a tool that will help forensic psychologists write court-defensible reports.

This guide covers everything you need to get started.

---

## 1. System Requirements

### Minimum
- **macOS:** 12.0+ (Monterey) or **Windows:** 10 21H2+
- **RAM:** 8GB
- **Storage:** 2GB free
- **Display:** 1280x720

### Recommended
- **macOS:** 14.0+ (Sonoma) or **Windows:** 11
- **RAM:** 16GB
- **Storage:** 10GB free (for large cases)
- **Display:** 1920x1080

---

## 2. Installation

### Step 1: Install Ollama (Required for AI features)

Evidify uses local AI models via Ollama. This keeps all data on your machine.

**macOS:**
```bash
brew install ollama
```

Or download from: https://ollama.ai/download

**Windows:**
Download installer from: https://ollama.ai/download

### Step 2: Pull the Required Model

```bash
ollama pull llama3.2:8b
```

**Important:** Use exactly this model version for consistent results across testers.

### Step 3: Start Ollama

```bash
ollama serve
```

Leave this running in the background. Evidify will connect automatically.

### Step 4: Install Evidify

**macOS:**
1. Open `Evidify-Forensic-1.1.0-beta.dmg`
2. Drag Evidify to Applications
3. Right-click → Open (first time only, to bypass Gatekeeper)

**Windows:**
1. Run `Evidify-Forensic-1.1.0-beta-setup.exe`
2. Follow installer prompts
3. Launch from Start Menu

---

## 3. First Run Checklist

Before testing, verify your setup:

- [ ] Ollama is running (`ollama serve`)
- [ ] Model is available (`ollama list` shows `llama3.2:8b`)
- [ ] Evidify launches without errors
- [ ] You can see the "New Case" button

**Troubleshooting:**
- If Evidify shows "AI Unavailable": Check Ollama is running
- If model downloads fail: Check internet connection, try `ollama pull` again
- If app won't open on macOS: System Preferences → Security → Allow

---

## 4. Test Packs

We've prepared test cases for you. Find them in the beta kit:

| Pack | Purpose | Expected Outcome |
|------|---------|------------------|
| CC-001 | Standard competency case | PASS or FAIL (you choose) |
| BIG-001 | Scale test (32 evidence items) | Performance measurement |

### Importing a Test Pack

1. Launch Evidify
2. Click "Import Case"
3. Select `packs/CC-001/evidence/CC-001.zip`
4. Wait for import to complete

---

## 5. What Success Looks Like

### For a PASS Workflow

1. **Import:** All evidence items appear in sidebar
2. **Annotate:** You can highlight text, create annotations
3. **Promote:** Annotations become claims
4. **Opinions:** Create opinions with supporting claims
5. **AI:** Generate summaries, all get human review
6. **Gates:** All 7 gates show green checkmarks
7. **Export:** "Export + Verify" produces PASS

### For a FAIL Workflow (Testing Gates)

1. Intentionally skip steps (e.g., opinion without supporting claims)
2. Gates should show red X marks
3. Export shows FAIL with specific violations
4. Verifier confirms the gate report is valid (even though status is FAIL)

---

## 6. Key Workflows to Test

### Workflow A: Happy Path (15-20 min)
1. Import CC-001
2. Complete all workflow steps
3. Achieve all-PASS gates
4. Export + Verify
5. **Capture:** Screenshot of PASS result

### Workflow B: Intentional Failures (10-15 min)
1. Import CC-001
2. Create opinion WITHOUT supporting claims
3. Skip AI review
4. Leave limitation unaddressed
5. Check gates → should show failures
6. Export + Verify
7. **Capture:** Screenshot of failures + violation list

### Workflow C: Scale Test (20-30 min)
1. Import BIG-001 (or create case with 20+ evidence items)
2. Measure: How long does import take?
3. Measure: How responsive is search?
4. Measure: How long does export take?
5. **Capture:** Timing notes

### Workflow D: Edge Cases (varies)
- What happens if you close app mid-workflow?
- What happens with very long document names?
- What happens if Ollama disconnects during AI generation?

---

## 7. What to Report

### Always Include

1. **Bug description:** What happened vs. what you expected
2. **Steps to reproduce:** Numbered list
3. **Export bundle:** Attach the exported folder (zip it)
4. **Screenshots:** Before/after if applicable
5. **System info:** OS version, Evidify version, Ollama status

### Use This Template

```markdown
## Bug Report

**Summary:** [One sentence]

**Severity:** Blocker / High / Medium / Low

**Category:** Defensibility / Export / Verifier / UX / Performance

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected:** 

**Actual:** 

**Attachments:**
- [ ] Export bundle (.zip)
- [ ] Screenshots
- [ ] App logs (Help → Export Logs)

**Environment:**
- OS: 
- Evidify Version: 
- Ollama Version: 
- Model: llama3.2:8b
```

---

## 8. Where to File Issues

**Primary:** [GitHub Issues / Linear / Jira - TBD]

**Required for all issues:**
- Title: `[Category] Brief description`
- Body: Use template above
- Attachments: Export bundle + screenshots

**Response time:**
- Blocker: Same day acknowledgment
- High: 24 hour acknowledgment
- Medium/Low: Within beta cycle

---

## 9. Known Limitations (Don't Report These)

See `KNOWN_LIMITATIONS.md` for the full list. Key items:

- Large PDFs (100+ pages) may take 30+ seconds to render
- OCR is best-effort on handwritten documents
- AI summaries require Ollama to be running
- Export folder must be on local drive (not network/cloud)

---

## 10. Communication Channels

- **Slack:** #evidify-beta (for quick questions)
- **Email:** beta@evidify.ai (for sensitive issues)
- **Weekly Sync:** Thursdays 2pm ET (optional)

---

## 11. Confidentiality

- Do NOT share beta builds outside approved testers
- Do NOT post screenshots publicly
- Do NOT use real patient data (use test packs only)
- Feedback may be quoted anonymously in development discussions

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│  EVIDIFY BETA QUICK REFERENCE                       │
├─────────────────────────────────────────────────────┤
│  Start Ollama:     ollama serve                     │
│  Check model:      ollama list                      │
│  Import case:      File → Import Case               │
│  Export + Verify:  File → Export → Export + Verify  │
│  View gates:       Sidebar → Gates Panel            │
│  Get logs:         Help → Export Logs               │
├─────────────────────────────────────────────────────┤
│  File issues:      [GitHub/Linear URL]              │
│  Slack:            #evidify-beta                    │
│  Email:            beta@evidify.ai                  │
└─────────────────────────────────────────────────────┘
```

---

*Thank you for being a beta tester. Your feedback matters!*
