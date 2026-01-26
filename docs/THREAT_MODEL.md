# THREAT_MODEL.md

## Evidify Research Instrumentation: Assumptions & Claims Boundary

**Version:** 1.1.0  
**Date:** January 2026  
**Classification:** Research Infrastructure Documentation

---

## Executive Summary

This document defines what Evidify's integrity system **does and does not** claim to provide. It is intended for research collaborators, IRB reviewers, and technical auditors.

Evidify is **research instrumentation**, not a medical device or legal compliance tool.

---

## 1. What We Claim

### 1.1 Post-Hoc Tampering Detection

**Claim:** The hash chain ledger detects modifications to exported data after the fact.

**Mechanism:**
- Every event is assigned a sequence number (`seq`) and UUID (`eventId`)
- Content is serialized to Canonical JSON (RFC 8785 compliant)
- Hash chain input uses fixed-length structured encoding (no delimiter ambiguity)
- Chain hash: `SHA-256(seq | prevHash | eventId | timestamp | contentHash)`
- Any modification to any field in any event breaks the chain

**Verification:**
- Independent verifier can reconstruct chain from events + ledger
- Mismatch produces specific error: `CONTENT_TAMPERED` or `CHAIN_BROKEN`
- Verifier code is open source and reproducible

### 1.2 Behavioral Measurement

**Claim:** The event stream captures the sequence and timing of user interactions.

**What we measure:**
- Assessment values at lock points
- Time intervals between events
- Whether assessments changed after AI reveal
- Whether deviation documentation was provided

**What this enables:**
- ADDA (Automation-Induced Decision Adjustment) calculation
- Decision latency analysis
- Documentation compliance tracking

### 1.3 Reproducible Export

**Claim:** The export package is self-contained and version-locked.

**Components:**
- `trial_manifest.json` - Session metadata and integrity checksums
- `events.jsonl` - Append-only event stream
- `ledger.json` - Hash chain entries
- `verifier_output.json` - Automated integrity check results
- `derived_metrics.csv` - Pre-computed analysis variables
- `codebook.md` - Field definitions and operational definitions

---

## 2. What We Do NOT Claim

### 2.1 Prevention of Tampering

**Not claimed:** We cannot prevent a privileged attacker on the same machine from tampering.

**Why:** 
- Client-side application runs in browser
- User has full control over local storage, memory, network
- A sophisticated attacker could intercept events before logging

**Mitigation (partial):**
- Tampering is detectable if attempted after export
- For higher assurance, server-side logging would be required

### 2.2 Trusted Timestamps

**Not claimed:** Timestamps are forensically reliable.

**Why:**
- Client clock is user-controlled
- Browser reports `Date.now()` which user can manipulate
- No external timestamp authority in current implementation

**What we do:**
- Record timestamps as instrumentation (behavioral timing)
- Log in relative sequence (event ordering is preserved)
- Flag in manifest: `timestamp_trust_model: "client_clock_untrusted"`

**For forensic-grade timing:**
- Integrate RFC 3161 Timestamp Authority
- Use server-side receipt service
- These are P2 enhancements, not current capability

### 2.3 Legal Compliance or Advice

**Not claimed:** Evidify does not provide legal advice or guarantee legal defensibility.

**We provide:**
- Research measurement of decision-making workflows
- Documentation patterns that research suggests may be relevant
- Explicit operational definitions for analysis

**We do NOT determine:**
- What constitutes legally adequate documentation
- Whether a specific workflow meets standard of care
- Liability or malpractice outcomes

**UI Language Policy:**
- Research condition framing, not clinical instruction
- "Higher-risk documentation pattern" instead of "plaintiff attorney"
- Legal framing only as explicit experimental condition (IV)

### 2.4 Medical Device Classification

**Not claimed:** Evidify is not a medical device and does not make clinical recommendations.

**Classification:**
- Research instrumentation software
- Not intended for diagnosis or treatment
- Not submitted to FDA or other regulatory bodies

**User responsibility:**
- Clinical decisions remain with the clinician
- Evidify records decisions; it does not make them

---

## 3. Threat Model

### 3.1 Adversary Capabilities

| Adversary Type | Capability | Can Defeat? |
|---------------|------------|-------------|
| Post-hoc tamperer (export files) | Edit JSON/CSV after export | ❌ No - detected by verifier |
| Sophisticated local attacker | Intercept before logging | ⚠️ Partially - requires real-time attack |
| Clock manipulator | Alter system time | ⚠️ Partially - timestamps untrusted |
| Cross-environment attacker | Different JSON serialization | ❌ No - canonical JSON ensures determinism |

### 3.2 Attack Scenarios

**Scenario A: Edit export to hide assessment change**
- Attacker modifies `initial_birads` in derived_metrics.csv
- Result: `CONTENT_TAMPERED` - verifier detects via ledger mismatch

**Scenario B: Delete an event**
- Attacker removes AI_REVEALED event from events.jsonl
- Result: `EVENT_COUNT_MISMATCH` + `CHAIN_BROKEN` at subsequent event

**Scenario C: Reorder events**
- Attacker swaps FIRST_IMPRESSION_LOCKED and FINAL_ASSESSMENT
- Result: `CHAIN_BROKEN` - prevHash won't match

**Scenario D: Change timestamp to appear faster**
- Attacker edits timestamp in event
- Result: `CONTENT_TAMPERED` - timestamp is part of chain input

**Scenario E: Sophisticated real-time attack**
- Attacker intercepts events before logging, modifies in memory
- Result: ⚠️ Not detected by current system
- Mitigation: Server-side logging (P2)

### 3.3 Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    UNTRUSTED ZONE                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Browser Environment                                 │   │
│  │  - User can modify DOM                               │   │
│  │  - User can intercept JS                            │   │
│  │  - User controls system clock                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Export (ZIP)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    INTEGRITY ZONE                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Exported Package                                    │   │
│  │  - Hash chain locks all content                      │   │
│  │  - Independent verifier can detect tampering         │   │
│  │  - Canonical serialization ensures cross-platform    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Operational Definitions

### 4.1 ADDA (Automation-Induced Decision Adjustment)

**Definition:** Reader changed their assessment TOWARD the AI's assessment after AI reveal.

**Calculation:**
```
ADDA = TRUE when ALL of:
  1. AI was present (ai_birads ≠ null)
  2. Initial DIFFERED from AI (initial_birads ≠ ai_birads) — denominator
  3. Assessment changed (initial_birads ≠ final_birads)
  4. Final MATCHES AI (final_birads = ai_birads)

ADDA = FALSE when:
  - In denominator (initial ≠ AI) but did not change toward AI

ADDA = NULL (not in denominator) when:
  - Initial already matched AI (initial_birads = ai_birads)
```

**Export field:** `adda` (bool | null), `adda_denominator` (bool)

### 4.2 Documentation Risk Categories

**NOT legal categories.** Research-defined patterns for analysis:

| Pattern | Definition | Export Flag |
|---------|------------|-------------|
| Documented | Deviation text provided (≥10 chars) | `deviation_documented: true` |
| Skipped with attestation | User acknowledged skip | `deviation_skipped: true` |
| Not required | No change occurred | `deviation_required: false` |

### 4.3 FDR/FOR Disclosure

**FDR (False Discovery Rate):** Of cases AI calls "positive," how many are false alarms?
**FOR (False Omission Rate):** Of cases AI calls "negative," how many have missed cancer?

**Provenance requirement:** Export must specify source:
```json
{
  "disclosure_provenance": {
    "fdr_value": 4,
    "for_value": 12,
    "source": "simulated_demo | dataset_v1.2.3 | threshold_file_hash",
    "threshold_hash": "abc123..."
  }
}
```

---

## 5. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-15 | Initial threat model |
| 1.1.0 | 2026-01-24 | Added canonical JSON spec, structured encoding, FDR/FOR provenance |

---

## 6. Contact

For questions about this threat model or Evidify's research instrumentation:
- **Research inquiries:** [Research contact]
- **Technical documentation:** [Documentation link]

---

*This document is for research and technical audiences. It does not constitute legal advice.*
