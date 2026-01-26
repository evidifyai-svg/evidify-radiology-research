# Artifacts Needed From Actual App Build

**Date:** 2026-01-12

---

## What I've Provided (Documentation & Infrastructure)

✅ **Complete Test Kit v1.1**
- CLI for headless testing (deterministic)
- Verifier with all checks
- CC-001 and BIG-001 packs with goldens
- Negative and adversarial fixtures
- 10/10 acceptance tests passing

✅ **Beta Ops Documentation**
- Export Folder Layout Contract
- Beta Tester Onboarding Guide
- Issue Triage Rubric
- Marketing Positioning & Disclosures
- STRIDE-Lite Threat Model

✅ **App Integration Module**
- `evidify-export-harness.ts` (TypeScript integration)
- All algorithms implemented (sentinel hash, UUIDv5, sorting)

---

## What You Need to Provide From Your Build

### 1. Real Build Artifact

**Needed:**
- macOS `.dmg` or `.app` (zipped)
- Windows installer (optional but valuable)

**Why:** Validates packaging, code signing, first-run experience

**How to get:** Your build pipeline should produce these

---

### 2. Three UI-Produced Bug Bundles

**Needed (zipped folders from in-app Export+Verify):**

| Bundle | How to Create |
|--------|---------------|
| CC-001 PASS | Import CC-001 → Complete workflow → All gates pass → Export+Verify |
| CC-001 FAIL | Import CC-001 → Skip steps → Some gates fail → Export+Verify |
| BIG-001 FAIL | Import BIG-001 → Incomplete workflow → Export+Verify |

**Why:** 
- Reveals UI-driven variability (paths, order, state leaks)
- Shows real folder structure from app (not CLI simulation)
- Engineering needs these for debugging

**Export should contain:**
```
{case_id}-{type}-{timestamp}/
├── manifest.json
├── canonical/canonical.json
├── audit/audit.log
├── audit/audit_digest.json
├── verification/gate_report.canon.json
└── verification/gate_report.meta.json
```

---

### 3. App Logs + Verifier Logs

**Needed for each of the three runs:**

| Log | Location | Content |
|-----|----------|---------|
| App runtime log | Help → Export Logs | Import → workflow → export events |
| Verifier stdout | Terminal output | All check results |
| Verifier stderr | Terminal output | Any errors |

**Format:**
```
CC-001-PASS-logs/
├── app.log
├── verifier-stdout.txt
└── verifier-stderr.txt
```

**Why:** Separates defensibility failures from plumbing failures

---

### 4. Screen Recordings (2-5 min each)

**Needed:**

| Recording | Content |
|-----------|---------|
| CC-001 PASS | Full workflow: import → annotate → claims → opinions → gates → export |
| BIG-001 FAIL | Scale workflow with intentional failures |

**Format:** MP4 or MOV, 720p minimum

**Why:** 
- UX teardown based on real friction
- See where users hesitate, mis-click, misunderstand
- Validate UI matches spec

**Recording tips:**
- Show whole screen including sidebar
- Narrate what you're doing
- Don't edit out mistakes (that's useful data)

---

### 5. Current Export Verification

**Needed:** Run verifier on your app exports

```bash
# For each export:
node verify-v1.1.cjs path/to/export/ \
  --schema evidify.forensic.gate_report.v1.schema.json

# Save output:
node verify-v1.1.cjs path/to/export/ > verifier-output.txt 2>&1
```

**Expected for valid export:**
```
✅ Required files
✅ Audit chain
✅ Canonical hash verification
✅ ID uniqueness
✅ Schema validation
✅ Gate evaluation: PASS (or FAIL)

VERIFICATION: PASS
```

---

## Integration Checklist

Before producing the artifacts above, verify integration:

- [ ] App exports to correct folder structure
- [ ] `gate_report.canon.json` matches schema
- [ ] Canonical hash is verifiable (run verifier)
- [ ] Audit chain is verifiable (run verifier)
- [ ] Finding IDs use structural-only inputs (v1.1)
- [ ] Arrays are sorted before export
- [ ] Meta file has timestamps, canon file does not

---

## Optional High-Value Artifacts

If you have these, include them:

| Artifact | Value |
|----------|-------|
| Tamper detection UI screenshots | Shows user-facing security feedback |
| Key management notes | How are any local secrets stored? |
| Code signing certificate info | Is the beta build signed? |
| Update mechanism docs | How will users get updates? |

---

## Delivery

**Recommended structure:**

```
evidify-panel-artifacts/
├── builds/
│   ├── Evidify-Forensic-1.1.0-beta.dmg
│   └── Evidify-Forensic-1.1.0-beta-setup.exe (optional)
├── exports/
│   ├── CC-001-PASS-20260112/
│   ├── CC-001-FAIL-20260112/
│   └── BIG-001-FAIL-20260112/
├── logs/
│   ├── CC-001-PASS-logs/
│   ├── CC-001-FAIL-logs/
│   └── BIG-001-FAIL-logs/
├── recordings/
│   ├── CC-001-PASS-workflow.mp4
│   └── BIG-001-FAIL-workflow.mp4
└── optional/
    ├── tamper-ui-screenshots/
    └── key-management-notes.md
```

**Zip and share via:**
- Google Drive (if large)
- Direct upload (if <100MB)

---

## What Happens Next

Once I have these artifacts:

1. **Panel teardown** on integrated product
2. **P0/P1 backlog** with concrete repro artifacts
3. **UX friction analysis** from recordings
4. **Defensibility audit** of real exports
5. **Final beta go/no-go** recommendation

---

*The test kit passes. Now we need the real thing.*
