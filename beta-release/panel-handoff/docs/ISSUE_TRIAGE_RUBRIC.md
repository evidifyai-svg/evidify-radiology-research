# Evidify Forensic Issue Triage Rubric

**Version:** 1.1  
**Date:** 2026-01-12

---

## Overview

This rubric defines how to classify and prioritize issues found during beta testing. Consistent classification ensures engineering focuses on what matters most for a forensic tool.

---

## 1. Severity Levels

### P0: Blocker 🔴

**Definition:** Cannot proceed with core workflow. Data loss or corruption possible.

**Response:** Stop testing, fix immediately. All other work paused.

**Examples:**
- App crashes on launch
- Data corruption after save
- Export produces invalid/unverifiable output
- Gate passes when it should fail (false negative)
- Audit chain broken silently

**SLA:** Fix deployed within 24 hours

---

### P1: High 🟠

**Definition:** Major feature broken or defensibility compromised, but workaround exists.

**Response:** Fix before next beta build. May gate release.

**Examples:**
- Gate fails when it should pass (false positive)
- Verification fails on valid export
- AI generation fails consistently
- Evidence import fails for common file types
- Export missing required files

**SLA:** Fix deployed within 72 hours

---

### P2: Medium 🟡

**Definition:** Feature impaired but usable. User experience degraded.

**Response:** Fix before beta end. May ship with known issue if minor.

**Examples:**
- Wrong error message displayed
- UI element misaligned or hidden
- Performance slower than target (but functional)
- Minor data display issues
- Keyboard shortcuts not working

**SLA:** Fix deployed within 1 week

---

### P3: Low 🟢

**Definition:** Cosmetic or minor inconvenience. Polish issue.

**Response:** Fix if time permits. May defer to post-beta.

**Examples:**
- Typo in label
- Icon doesn't match style guide
- Animation jank
- Tooltip missing or incorrect
- Minor inconsistencies in UI

**SLA:** Backlog for future sprint

---

## 2. Issue Categories

### Category A: Defensibility Failures

**Definition:** Issues that could compromise court-defensibility of the report.

**Always P0 or P1.**

| Issue Type | Severity |
|------------|----------|
| Gate false negative (passes when should fail) | P0 |
| Audit chain tampered/broken | P0 |
| Canonical hash mismatch | P0 |
| Export produces invalid JSON | P0 |
| Gate false positive (fails when should pass) | P1 |
| Finding ID collision | P1 |
| Missing required export file | P1 |
| Schema validation fails on valid data | P1 |

**Required attachments:**
- Export bundle (complete folder, zipped)
- Verifier output log
- Steps to reproduce

**Triage question:** "Would an attorney be able to challenge the report based on this issue?"

---

### Category B: Export/Verifier Failures

**Definition:** Issues with the export or verification process that don't directly affect defensibility.

**Usually P1 or P2.**

| Issue Type | Severity |
|------------|----------|
| Export hangs indefinitely | P1 |
| Verifier crashes | P1 |
| Export takes >60s for small case | P2 |
| Verifier error message unclear | P2 |
| Export folder in wrong location | P2 |
| Verifier doesn't detect known-bad fixture | P1 |

**Required attachments:**
- Export bundle (if available)
- App logs
- Steps to reproduce

**Triage question:** "Can the user complete the export workflow and verify the result?"

---

### Category C: UX/Workflow Issues

**Definition:** Issues affecting usability but not correctness.

**Usually P2 or P3.**

| Issue Type | Severity |
|------------|----------|
| User can't find key feature | P2 |
| Workflow requires too many clicks | P2 |
| Error message doesn't explain fix | P2 |
| Confusing terminology | P2 |
| Visual inconsistency | P3 |
| Minor layout issue | P3 |

**Required attachments:**
- Screenshot
- Description of confusion/friction
- Suggested improvement (optional)

**Triage question:** "Does this slow down or confuse users significantly?"

---

### Category D: Performance Issues

**Definition:** Issues affecting speed or responsiveness.

**Severity depends on impact to workflow.**

| Issue Type | Severity |
|------------|----------|
| App unresponsive for >30s | P1 |
| Memory leak causing crash | P1 |
| Import takes >2x target time | P2 |
| UI jank during scrolling | P3 |
| Slow startup (<10s) | P3 |

**Required attachments:**
- Timing measurements
- System specs
- Case size (evidence count, page count)

**Triage question:** "Does this prevent completion or just slow it down?"

---

### Category E: AI/Model Issues

**Definition:** Issues with AI generation or Ollama integration.

**Usually P1 or P2.**

| Issue Type | Severity |
|------------|----------|
| AI generates harmful/inappropriate content | P0 |
| AI generation fails silently | P1 |
| AI output not captured in audit log | P1 |
| AI generation very slow (>60s) | P2 |
| AI output quality poor | P2 |
| Ollama connection error unclear | P2 |

**Required attachments:**
- Prompt (if visible)
- Output (if any)
- Ollama logs
- Model version

**Triage question:** "Is the AI output trackable and reviewable?"

---

## 3. Triage Workflow

### Step 1: Classify Category

Ask: "Which category does this issue primarily affect?"

- Defensibility → Category A
- Export/Verify → Category B
- Usability → Category C
- Speed → Category D
- AI → Category E

### Step 2: Assess Severity

Within the category, use the tables above to assign P0-P3.

**When in doubt:**
- If defensibility could be questioned → P0 or P1
- If workflow is blocked → P1
- If workaround exists → P2
- If purely cosmetic → P3

### Step 3: Verify Attachments

Check that all required attachments are present:

| Category | Required |
|----------|----------|
| A (Defensibility) | Export bundle, verifier log, repro steps |
| B (Export/Verify) | Export bundle or error, app logs, repro steps |
| C (UX) | Screenshot, description |
| D (Performance) | Timing, system specs, case size |
| E (AI) | Output, Ollama logs, model version |

**If attachments missing:** Request before triaging.

### Step 4: Assign and Notify

- P0: Immediately notify engineering lead + product
- P1: Add to current sprint, notify engineering
- P2: Add to backlog, review in next planning
- P3: Add to icebox, review if time permits

---

## 4. Escalation Rules

### Automatic P0 Escalation

These issues are **always P0** regardless of other factors:

1. Any data loss or corruption
2. Any audit chain integrity failure
3. Any gate false negative (passes when should fail)
4. Any crash during export
5. Any security vulnerability

### Escalation Path

```
P0 Blocker:
  Reporter → Engineering Lead → Product → Founder
  Response: <1 hour

P1 High:
  Reporter → Engineering Lead
  Response: <4 hours

P2/P3:
  Reporter → Triage in daily standup
  Response: <24 hours
```

---

## 5. Issue Lifecycle

```
NEW → TRIAGED → IN PROGRESS → IN REVIEW → VERIFIED → CLOSED
        ↓
     NEEDS INFO (waiting on reporter)
        ↓
     WON'T FIX (with justification)
```

### Status Definitions

| Status | Meaning |
|--------|---------|
| NEW | Just filed, not yet reviewed |
| TRIAGED | Severity/category assigned, in backlog |
| IN PROGRESS | Developer actively working |
| IN REVIEW | Fix ready, awaiting code review |
| VERIFIED | Fix deployed, awaiting tester verification |
| CLOSED | Verified fixed or won't fix |
| NEEDS INFO | Blocked on reporter providing details |
| WON'T FIX | Intentional behavior or out of scope |

---

## 6. Examples

### Example 1: P0 Defensibility

**Title:** Gate PASS when opinion has no supporting claims

**Category:** A (Defensibility)  
**Severity:** P0 (Blocker)

**Justification:** This is a gate false negative. An opinion without supporting claims should fail GATE-001, but it passed. This directly compromises court-defensibility.

**Action:** Stop all other work. Fix and deploy hotfix.

---

### Example 2: P1 Export

**Title:** Export missing audit.log file

**Category:** B (Export/Verify)  
**Severity:** P1 (High)

**Justification:** audit.log is required per export contract. Missing file means incomplete export. Workaround: manually copy from app data folder.

**Action:** Fix in current sprint.

---

### Example 3: P2 UX

**Title:** "Promote to Claim" button hard to find

**Category:** C (UX)  
**Severity:** P2 (Medium)

**Justification:** Users report taking 2+ minutes to find this feature. Workflow completion is possible but frustrating.

**Action:** Add to backlog, consider for next sprint.

---

### Example 4: P3 Cosmetic

**Title:** Export success dialog has typo "Sucess"

**Category:** C (UX)  
**Severity:** P3 (Low)

**Justification:** Purely cosmetic. Doesn't affect functionality.

**Action:** Add to icebox.

---

## 7. Metrics

Track these during beta:

| Metric | Target |
|--------|--------|
| P0 issues total | 0 at launch |
| P1 issues total | <5 at launch |
| P0 time-to-fix | <24 hours |
| P1 time-to-fix | <72 hours |
| Issues with complete attachments | >90% |
| Duplicate issues | <10% |

---

*Issue Triage Rubric v1.1 — Consistent classification for engineering-grade fixes*
