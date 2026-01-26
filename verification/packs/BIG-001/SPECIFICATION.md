# BIG-001: Scale Test Pack

**Purpose:** Performance and scale testing under realistic forensic load  
**Target:** 200-500 pages, 30+ evidence items

---

## Pack Specification

### Evidence Inventory (32 items)

| ID | Filename | Pages | Size | Type | Notes |
|----|----------|-------|------|------|-------|
| EV-001 | medical_records_comprehensive.pdf | 120 | 15MB | Medical | Multi-provider records |
| EV-002 | school_records_k12.pdf | 85 | 8MB | Educational | Full K-12 history |
| EV-003 | therapy_notes_3years.pdf | 45 | 4MB | Mental Health | Weekly sessions |
| EV-004 | psychiatric_evaluation.pdf | 22 | 2MB | Psychiatric | Initial + follow-ups |
| EV-005 | neuropsychological_report.pdf | 35 | 3MB | Neuropsych | Full battery |
| EV-006 | employment_records.pdf | 18 | 1.5MB | Employment | 5 employers |
| EV-007 | police_reports.pdf | 12 | 1MB | Legal | Multiple incidents |
| EV-008 | court_documents.pdf | 45 | 4MB | Legal | Prior proceedings |
| EV-009 | deposition_transcript_plaintiff.pdf | 180 | 12MB | Legal | Full transcript |
| EV-010 | deposition_transcript_defendant.pdf | 165 | 11MB | Legal | Full transcript |
| EV-011 | expert_report_opposing.pdf | 28 | 2.5MB | Expert | Opposing expert |
| EV-012 | financial_records.pdf | 35 | 3MB | Financial | Tax + bank |
| EV-013 | insurance_claims.pdf | 22 | 2MB | Insurance | Medical claims |
| EV-014 | social_media_exhibits.pdf | 15 | 8MB | Digital | Screenshots |
| EV-015 | text_message_logs.pdf | 40 | 3MB | Digital | Extracted messages |
| EV-016 | email_correspondence.pdf | 55 | 4MB | Digital | Key emails |
| EV-017 | photographs_exhibits.pdf | 25 | 12MB | Visual | Injury photos |
| EV-018 | video_transcript_depo.pdf | 30 | 2MB | Visual | Video depo transcript |
| EV-019 | military_records.pdf | 18 | 1.5MB | Military | Service records |
| EV-020 | va_medical_records.pdf | 65 | 6MB | Medical | VA treatment |
| EV-021 | disability_application.pdf | 12 | 1MB | Administrative | SSA application |
| EV-022 | vocational_assessment.pdf | 18 | 1.5MB | Vocational | Work capacity |
| EV-023 | life_care_plan.pdf | 25 | 2MB | Medical | Future care |
| EV-024 | economic_analysis.pdf | 15 | 1MB | Financial | Lost earnings |
| EV-025 | scanned_handwritten_notes.pdf | 20 | 5MB | Handwritten | OCR required |
| EV-026 | lab_results_compilation.pdf | 30 | 2.5MB | Medical | Lab values |
| EV-027 | imaging_reports.pdf | 15 | 1MB | Medical | Radiology |
| EV-028 | pharmacy_records.pdf | 8 | 0.5MB | Medical | Rx history |
| EV-029 | collateral_interviews.pdf | 35 | 3MB | Interviews | Family/friends |
| EV-030 | prior_evaluations.pdf | 45 | 4MB | Psychological | Other evals |
| EV-031 | attorney_correspondence.pdf | 25 | 2MB | Legal | Case comms |
| EV-032 | supplemental_records.pdf | 20 | 1.5MB | Mixed | Late additions |

**Total:** ~1,400 pages, ~120MB

---

## Test Scenarios

### Scenario: SCALE-PASS

Full workflow completion with realistic data volume.

**Expected performance targets:**

| Metric | Target | Acceptable |
|--------|--------|------------|
| Evidence ingest | < 60s | < 120s |
| Full-text indexing | < 45s | < 90s |
| Search query latency | < 500ms | < 1s |
| Gate evaluation | < 3s | < 5s |
| Export generation | < 10s | < 20s |
| Verification | < 5s | < 10s |

**Workflow steps:**
1. Import all 32 evidence items
2. Create 50 annotations across documents
3. Promote 30 claims
4. Create 8 opinions with full support chains
5. Register 5 limitations (all addressed)
6. Run all AI generations (15 total)
7. Approve all AI content
8. Export and verify

### Scenario: SCALE-COMPLEX

High finding count stress test.

**Target outputs:**
- 25 violations (various gates)
- 40 warnings
- Full audit log (500+ events)

---

## Canonical Data

### canonical.json Structure

```json
{
  "case_id": "BIG-001",
  "report_id": "RPT-BIG-001-SCALE",
  "report_metadata": {
    "evaluator_role": "Forensic Psychologist",
    "referral_question": "Evaluate psychological damages claimed",
    "scope_of_evaluation": "Comprehensive psychological evaluation per court order"
  },
  "opinions": [
    // 8 opinions with full support chains
  ],
  "claims": [
    // 30 claims linked to evidence
  ],
  "evidence_inventory": [
    // 32 evidence items with hashes
  ],
  "limitations": [
    // 5 limitations, all addressed
  ],
  "contradictions": [
    // 3 detected, all resolved
  ]
}
```

---

## Performance Measurement Script

```bash
#!/bin/bash
# measure-performance.sh

PACK_DIR="packs/BIG-001"
OUTPUT_DIR="/tmp/big-001-perf-test"
RESULTS_FILE="perf-results.json"

echo "{"
echo '  "pack": "BIG-001",'
echo '  "timestamp": "'$(date -Iseconds)'",'

# Ingest test
echo '  "ingest": {'
START=$(date +%s.%N)
# node evidify-cli.cjs import $PACK_DIR
END=$(date +%s.%N)
DURATION=$(echo "$END - $START" | bc)
echo "    \"duration_seconds\": $DURATION,"
echo '    "evidence_count": 32'
echo '  },'

# Index test
echo '  "index": {'
START=$(date +%s.%N)
# Index operation
END=$(date +%s.%N)
DURATION=$(echo "$END - $START" | bc)
echo "    \"duration_seconds\": $DURATION"
echo '  },'

# Export test
echo '  "export": {'
START=$(date +%s.%N)
node tools/cli/evidify-cli.cjs run-pack BIG-001 --scenario PASS --export $OUTPUT_DIR
END=$(date +%s.%N)
DURATION=$(echo "$END - $START" | bc)
echo "    \"duration_seconds\": $DURATION"
echo '  },'

# Verify test
echo '  "verify": {'
START=$(date +%s.%N)
node tools/verifier/verify-v1.1.cjs $OUTPUT_DIR
END=$(date +%s.%N)
DURATION=$(echo "$END - $START" | bc)
echo "    \"duration_seconds\": $DURATION"
echo '  }'

echo "}"
```

---

## Evidence Generation Notes

For beta testing, generate synthetic PDFs:

```python
# generate_evidence.py
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import random

def generate_medical_record(filename, pages):
    c = canvas.Canvas(filename, pagesize=letter)
    for page in range(pages):
        c.drawString(100, 750, f"MEDICAL RECORD - Page {page + 1}")
        c.drawString(100, 700, f"Patient: [REDACTED]")
        c.drawString(100, 650, f"Date: 2024-{random.randint(1,12):02d}-{random.randint(1,28):02d}")
        # Add realistic medical content...
        c.showPage()
    c.save()

# Generate all evidence items
generate_medical_record("EV-001_medical_records.pdf", 120)
# ... etc
```

---

## OCR Test Cases

Evidence items requiring OCR:

| ID | Type | Challenge |
|----|------|-----------|
| EV-025 | Handwritten notes | Cursive, variable quality |
| EV-014 | Social media screenshots | Mixed fonts, emojis |
| EV-017 | Photographs | Text in images |

**OCR performance target:** < 2s per page average

---

## Memory Profile Targets

| Stage | Peak Memory | Acceptable |
|-------|-------------|------------|
| Idle | < 200MB | < 300MB |
| Ingest | < 500MB | < 800MB |
| Indexing | < 1GB | < 1.5GB |
| Search | < 400MB | < 600MB |
| Export | < 300MB | < 500MB |

---

## Integration with Test Matrix

BIG-001 covers test matrix sections:

- **C. Scale/Performance Tests:** PT-001 through PT-005
- **A. Golden-Path:** Extended workflow with realistic volume

---

*BIG-001 Scale Test Pack Specification v1.0*
