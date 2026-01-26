# Evidify: Research Infrastructure for AI Disclosure Studies

**Josh Henderson, Ph.D.**  
Clinical Psychologist | Adjunct Faculty, Fordham University  
Expertise: AI-enhanced clinical assessment infrastructure  
evidify.ai

---

## The Problem Your Research Quantified

Brown's mock jury research found radiologists face **73% plaintiff win rate** when AI detects an abnormality they miss, versus 56% without AI involved. This "AI penalty" creates a new liability landscape where:

- **Rubber-stamping AI** → Negligence for failure to exercise independent judgment  
- **Ignoring correct AI** → Negligence for failing to use available tools  
- **No documentation** → No defense in either scenario

Current systems don't help radiologists prove they exercised independent judgment.

---

## Evidify: Operational Answer to the Liability Problem

### The Impression Ledger (Core Architecture)

Three immutable, hash-chained entries that prove independent judgment:

| Entry | What It Records | Legal Value |
|-------|-----------------|-------------|
| **HUMAN_FIRST_IMPRESSION** | Assessment before AI exposure | Proves counterfactual exists |
| **AI_OUTPUT_EXPOSURE** | What AI showed, when, acknowledgements | Proves AI was reviewed |
| **RECONCILIATION** | Final assessment + deviation rationale | Proves deliberate decision-making |

Each entry is SHA-256 hashed with link to previous entry. Tamper-evident by design.

### Deviation Builder (Override Documentation)

When radiologist disagrees with AI, structured capture of:
- Acknowledgement that AI finding was reviewed (timestamped)
- Clinical rationale codes (normal variant, stable on prior, etc.)
- Supporting evidence (free text)
- Recommended follow-up

*Follows defense attorney framework: "document that the clinician in his or her professional judgment disagrees with the AI analysis due to X, Y, and Z reasons"*

### Rubber-Stamp Detection

Automatic flags for high-liability patterns:
- Pre-AI time < 15 seconds
- Instant AI agreement with minimal review
- Undocumented deviation when disagreeing
- AI findings not explicitly acknowledged

### Error Rate Disclosure as Study Factor

FDR/FOR disclosure is configurable as an independent variable:
- Format: numeric, sentence, natural frequency, table, icon
- Framing: emphasize error rates vs. PPV/NPV
- Tracked: exposure logged with timestamps

*Your research suggests disclosure format affects juror perception—this enables systematic study.*

---

## What Makes This Research-Ready

| Capability | Why It Matters |
|------------|----------------|
| **Study Protocol Config** | Define factors, levels, randomization, counterbalancing |
| **Reproducible Seeds** | Same seed = same assignment for replication |
| **One-Click Export** | trial_manifest.json, events.jsonl, derived_metrics.csv |
| **Deterministic Replay** | Recreate exact UI state from event stream |
| **iMRMC Format** | Direct FDA-standard export |

---

## Alignment with BRPLL Research Agenda

| Your Focus | Evidify Capability |
|------------|-------------------|
| Human factors in radiology AI | Configurable workflow paradigms (pre-AI, concurrent, second-reader) |
| Reader performance studies | Locked baselines, reliance classification |
| Statistical methods (MRMC) | Native iMRMC export |
| Psychology & Law | Expert witness packet, rubber-stamp detection |
| Juror perception of AI errors | Disclosure format as manipulable factor |

---

## Discussion Questions

1. Your mock jury study showed the 73% vs 56% finding—have you looked at what documentation would change juror perception?

2. Would cryptographic proof of independent assessment affect mock jury outcomes?

3. Is there appetite to study whether structured override documentation improves defensibility?

4. Would a tool like this be useful for any upcoming studies on AI liability?

---

**Current Status:** Working prototype with mammography cases, modular architecture  
**Seeking:** Research collaborators to validate design and methodology  
**Not:** Selling a product

---

*Prepared for Dr. Grayson Baird | January 2026 | evidify.ai*
