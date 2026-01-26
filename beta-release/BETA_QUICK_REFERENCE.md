# Evidify Beta Quick Reference Card

*Print this or keep it handy*

---

## 🎤 Voice Scribe (The Hero Feature)

1. Select a client
2. Click **New Note**
3. Click the **🎤 microphone** icon
4. **Speak naturally** for 60-90 seconds about:
   - What happened in session
   - Client presentation/affect
   - Interventions used
   - Your clinical observations
   - Plan for next session
5. Click **Stop** when done
6. Review and edit the structured note
7. **Sign** when satisfied

**Tips:**
- Speak like you're debriefing with a supervisor
- Include observations, not just facts
- Don't worry about structure - AI handles it
- Quiet environment = better transcription

---

## 🔴 Status Indicators

| Icon | Meaning |
|------|---------|
| 🟢 | Ollama connected, AI ready |
| 🔴 | Ollama not detected |
| 📴 | Offline mode (still works!) |

**If 🔴:** Open Terminal/CMD and run `ollama serve`

---

## ⌨️ Keyboard Shortcuts

| Action | macOS | Windows |
|--------|-------|---------|
| New Note | ⌘ + N | Ctrl + N |
| Save | ⌘ + S | Ctrl + S |
| Search | ⌘ + K | Ctrl + K |
| Voice Scribe | ⌘ + R | Ctrl + R |
| Lock Vault | ⌘ + L | Ctrl + L |

---

## 🚨 When Something Goes Wrong

### App Won't Start
```bash
# macOS
xattr -cr /Applications/Evidify.app

# Then right-click → Open
```

### Voice Scribe Not Working
1. Check microphone permissions
2. Verify Ollama is running: `ollama serve`
3. Test mic in system settings

### AI Not Responding
1. Open Terminal/CMD
2. Run: `ollama serve`
3. Verify model: `ollama list`
4. If no model: `ollama pull llama3.2`

### Forgot Passphrase
⚠️ **No recovery possible** - this is by design for security.
Data is encrypted and unrecoverable without passphrase.

---

## 📝 Reporting Issues

### Crash or Data Loss (Critical)
Email immediately: [EMAIL]
Subject: "🔴 CRITICAL - [Brief description]"

### Bug (Non-Critical)
Use bug report form: [LINK]

### Feature Request
Email: [EMAIL]
Subject: "Feature Request - [Brief description]"

---

## 🛡️ Important Reminders

✅ **DO:**
- Maintain backup documentation method
- Review AI-generated content before signing
- Report bugs promptly
- Complete weekly check-ins

❌ **DON'T:**
- Rely solely on Evidify for records
- Include PHI in bug reports
- Share the app with others
- Discuss features publicly

---

## 📅 Weekly Check-In

**Every Friday** - complete the 5-minute survey

Link: [SURVEY_LINK]

Your feedback shapes what we build next!

---

## 🆘 Support

**Email:** [SUPPORT_EMAIL]

**Response Times:**
- Critical issues: < 24 hours
- Bugs: < 48 hours
- Questions: Within the week

**Subject Line Format:**
"Evidify Beta - [Category] - [Brief Description]"

---

## 🔗 Quick Links

| Resource | Link |
|----------|------|
| Installation Guide | [LINK] |
| Bug Report Form | [LINK] |
| Weekly Check-In | [LINK] |
| Feature Requests | [LINK] |

---

*Evidify v4.2.1-beta • Local-First Clinical Documentation*

**Your data never leaves your device.**
