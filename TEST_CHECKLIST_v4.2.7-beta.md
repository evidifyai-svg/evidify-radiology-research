# Evidify v4.2.7-beta Testing Checklist

**Build Date:** January 9, 2026  
**Version:** 4.2.7-beta  
**Tester:** ________________  
**Date Tested:** ________________

---

## Build Instructions

```bash
cd /path/to/evidify-v9
cd frontend && npm run build
cd ../src-tauri
cargo tauri build --release
```

The DMG will be in `src-tauri/target/release/bundle/dmg/`

---

## Items 13-16: Structured Note Improvements

### ✅ #13: AI Structuring with MSE/Risk Templates

**Test Steps:**
1. Create new Progress note
2. Enter text: "pt anxious today, trouble sleeping, mentioned some passive SI but denies plan. did CBT work on thought records. f/u 2 weeks"
3. Click "AI Structure" button
4. Verify output includes:
   - [ ] **MENTAL STATUS EXAM** section with 9 domains
   - [ ] **RISK ASSESSMENT** section with SI/HI/Self-Harm
   - [ ] Proper formatting with headers

**Test for other note types:**
- [ ] Intake note generates proper intake format
- [ ] Crisis note generates crisis-specific sections

---

### ✅ #14: MSE Input Component

**Test Steps:**
1. In CaptureScreen, click "Mental Status Exam" expandable panel
2. Verify it shows 9 domains:
   - [ ] Appearance
   - [ ] Behavior
   - [ ] Speech
   - [ ] Mood (reported)
   - [ ] Affect (observed)
   - [ ] Thought Process
   - [ ] Thought Content
   - [ ] Cognition
   - [ ] Insight/Judgment
3. [ ] Select values from dropdowns
4. [ ] Verify completion counter updates (e.g., "5/9 assessed")
5. [ ] Generate note and verify MSE data appears in final content

---

### ✅ #15: Risk Assessment Input Component

**Test Steps:**
1. Click "Risk Assessment" expandable panel
2. Test Suicidal Ideation buttons:
   - [ ] Denied (green)
   - [ ] Passive (amber)
   - [ ] Active (no plan) (orange)
   - [ ] Active with plan (red) - should show detail textbox
3. [ ] Test Homicidal Ideation buttons
4. [ ] Test Self-Harm buttons
5. [ ] Test Safety Plan options
6. [ ] Test Protective Factors multi-select chips
7. [ ] Test Overall Risk Level buttons
8. [ ] Verify "Risk Identified" badge appears when risk > denied
9. [ ] Generate note and verify risk data in final content

---

### ✅ #16: Treatment Progress Panel with Theme Linking

**Test Steps:**
1. Go to client with 3+ session notes
2. Scroll to "Treatment Progress" panel
3. Click to expand
4. Click "Analyze Themes"
5. Verify:
   - [ ] Loading indicator appears
   - [ ] Themes are identified (3-5 themes expected)
   - [ ] Each theme shows status (improving/stable/declining/new/resolved)
   - [ ] Click theme to expand and see excerpts
   - [ ] Click excerpt to navigate to source note
6. [ ] Test "Refresh Analysis" button

---

## Items 17-20: Make It Useful Features

### ✅ #17: Session Time Tracking

**Test Steps:**
1. Start new note (CaptureScreen)
2. Verify timer appears in header:
   - [ ] Shows elapsed time (MM:SS format)
   - [ ] Updates every second
3. Write some content
4. Click "Generate" to complete note
5. Verify:
   - [ ] Time was recorded (check MetricsDashboard later)
   - [ ] If voice was used, mic icon appears next to timer

**Metrics Verification:**
1. Go to Dashboard → Performance Metrics
2. Verify time data appears in stats

---

### ✅ #18: Profile Editing (Settings)

**Test Steps:**
1. Click Settings (gear icon)
2. Find "Clinician Profile" section
3. Enter:
   - [ ] Full Name
   - [ ] Credentials
   - [ ] License Number
   - [ ] Practice Name
   - [ ] Default Note Footer
4. Click "Save Profile"
5. Verify "✓ Saved" confirmation
6. Close and reopen Settings
7. [ ] Verify data persisted

---

### ✅ #19: Note Search Enhancements

**Test Steps:**
1. Go to client with multiple notes
2. In "Session Notes" section, verify:
   - [ ] Search box appears
   - [ ] Type filter dropdown (All Types / Progress / Intake / etc.)
   - [ ] Status filter dropdown (All Status / Draft / Reviewed / Signed)
3. Test text search:
   - [ ] Type keyword from a note
   - [ ] Verify notes filter correctly
   - [ ] Verify count updates (e.g., "3 of 10")
4. Test type filter:
   - [ ] Select "Progress" - only progress notes show
5. Test status filter:
   - [ ] Select "Signed" - only signed notes show
6. Test combined filters:
   - [ ] Search + type + status together
7. [ ] Click "Clear" to reset filters

---

### ✅ #20: Clipboard Export (Formatted)

**Test Steps:**
1. Go to client with existing note
2. Expand a note
3. Find TWO copy buttons:
   - [ ] "Copy" (plain text)
   - [ ] "Export" (formatted, blue)
4. Click "Export" button
5. Paste into text editor
6. Verify formatted output includes:
   - [ ] Practice name header (if set in profile)
   - [ ] Divider lines (─────)
   - [ ] CLIENT: name
   - [ ] DATE: session date
   - [ ] TYPE: note type
   - [ ] STATUS: note status
   - [ ] Note content
   - [ ] Clinician signature line (if set in profile)
   - [ ] License number (if set)
   - [ ] Footer text (if set)
   - [ ] Generated timestamp

---

## Regression Testing

### Core Functionality
- [ ] Create new client
- [ ] Create new note (typed)
- [ ] Create new note (voice - if Whisper available)
- [ ] Sign/attest note
- [ ] Export note to file

### AI Features
- [ ] AI Structure button works
- [ ] RAG search returns results
- [ ] Formulation generation works

### Security
- [ ] Vault lock/unlock
- [ ] Export path validation
- [ ] Audit log entries recorded

---

## Known Issues

_Document any issues found during testing here:_

| Issue | Severity | Steps to Reproduce | Notes |
|-------|----------|-------------------|-------|
|       |          |                   |       |

---

## Sign-Off

**Testing Complete:** ☐ Yes ☐ No  
**Ready for Production:** ☐ Yes ☐ No  
**Blockers:** ________________

**Notes:**


