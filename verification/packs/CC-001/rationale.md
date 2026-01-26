# CC-001: Competency Case Test Pack

**Case Type:** Competency to Stand Trial (Criminal)  
**Purpose:** Golden reference for gate evaluation testing  
**Version:** 1.0

---

## Case Summary

This synthetic test case represents a criminal competency evaluation with:
- Multiple collateral sources
- Conflicting information requiring resolution
- AI-assisted report drafting
- Complete workflow from intake to export

---

## Evidence Inventory

| ID | Document | Purpose |
|----|----------|---------|
| EV-001 | Referral letter from court | Establishes referral question |
| EV-002 | Prior psychiatric records | Historical mental health |
| EV-003 | Police report | Circumstances of arrest |
| EV-004 | Jail medical records | Current treatment |
| EV-005 | Interview transcript | Clinical data |

---

## Expected Workflow

### Stage 1: Evidence Intake
- All 5 evidence files ingested
- OCR verified for scanned documents
- Hashes computed and stored

### Stage 2: Annotation
- Key passages highlighted
- Claims extracted from:
  - EV-002: History of schizophrenia diagnosis
  - EV-004: Current medication regimen
  - EV-005: Mental status examination findings

### Stage 3: Claim Promotion
- At least 3 claims promoted per opinion
- Evidence references linked

### Stage 4: Contradiction Detection
- One contradiction detected:
  - CLM-003: "Patient denies hallucinations" (EV-005)
  - CLM-004: "Auditory hallucinations reported" (EV-002)
- Resolution: Temporal difference (past vs. current)

### Stage 5: AI Drafting
- Summary of records generated
- Mental status section drafted
- All generations require human review

### Stage 6: Human Review
- All AI content approved with edits
- Ultimate issue opinion written by human

### Stage 7: Gates
- All 7 gates should PASS
- No blocking violations
- Warnings acceptable

### Stage 8: Export
- Reader Pack generated
- Canonical hash recorded

---

## Golden Expected Result

### Gate Status: PASS

```json
{
  "summary": {
    "status": "PASS",
    "block_count": 0,
    "warn_count": 0,
    "info_count": 0
  },
  "gate_outcomes": {
    "GATE-001": "PASS",
    "GATE-002": "PASS",
    "GATE-003": "PASS",
    "GATE-004": "PASS",
    "GATE-005": "PASS",
    "GATE-006": "PASS",
    "GATE-007": "PASS"
  }
}
```

---

## Testing Instructions

### Happy Path Test

1. Import `evidence/CC-001.zip`
2. Complete all workflow stages
3. Export Reader Pack
4. Run verifier with `--golden golden/gate_report.canon.json`
5. Expected: PASS

### Failure Injection Tests

**Test A: Skip AI Review**
1. Import CC-001
2. Generate AI content but don't review
3. Attempt export
4. Expected: GATE-003 blocks with `AI_RELIANCE_NO_APPROVAL`

**Test B: Leave Contradiction Unresolved**
1. Import CC-001
2. Don't resolve the detected contradiction
3. Attempt export
4. Expected: GATE-004 blocks with `CONTRADICTION_UNRESOLVED`

**Test C: Opinion Without Claims**
1. Import CC-001
2. Create opinion without linking to claims
3. Attempt export
4. Expected: GATE-001 blocks with `OPINION_NO_BASIS`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-12 | Initial creation |

---

*CC-001 is a synthetic test case with no real PHI.*
