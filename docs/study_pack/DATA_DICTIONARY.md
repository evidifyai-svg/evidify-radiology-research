# Evidify Data Dictionary / Codebook
## Version 2.0.0

---

## Overview

This codebook describes all variables exported by the Evidify research platform. Data is exported in a ZIP package containing multiple files as described below.

---

## Export Package Contents

| File | Format | Description |
|------|--------|-------------|
| `trial_manifest.json` | JSON | Session metadata, configuration, and integrity checksums |
| `events.jsonl` | JSON Lines | All timestamped events with payloads |
| `ledger.json` | JSON | Cryptographic hash chain for tamper detection |
| `verifier_output.json` | JSON | Automated verification results |
| `derived_metrics.csv` | CSV | Computed outcome variables per case |
| `codebook.md` | Markdown | This file |

---

## Manifest Variables (`trial_manifest.json`)

### Session Identification

| Variable | Type | Description |
|----------|------|-------------|
| `sessionId` | string | Unique session identifier (format: `SES-{timestamp}-{random}`) |
| `participantId` | string | De-identified participant identifier |
| `siteId` | string | Research site identifier |
| `studyId` | string | Study protocol identifier |
| `protocolVersion` | string | Version of study protocol (semver format) |

### Condition Assignment

| Variable | Type | Values | Description |
|----------|------|--------|-------------|
| `condition.revealTiming` | string | `HUMAN_FIRST`, `AI_FIRST`, `CONCURRENT` | When AI suggestion is shown relative to initial assessment |
| `condition.disclosureFormat` | string | `FDR_FOR`, `NATURAL_FREQUENCY`, `NONE` | How AI error rates are communicated |
| `condition.seed` | string | hex string | Randomization seed for reproducibility |
| `condition.assignmentMethod` | string | `SEEDED_RANDOM`, `SEQUENTIAL`, `MANUAL` | How condition was assigned |

### Timing

| Variable | Type | Description |
|----------|------|-------------|
| `timing.sessionStartTime` | ISO8601 | Session start timestamp |
| `timing.sessionEndTime` | ISO8601 | Session end timestamp |
| `timing.totalDurationMs` | integer | Total session duration in milliseconds |

### Integrity

| Variable | Type | Description |
|----------|------|-------------|
| `integrity.eventCount` | integer | Total number of events logged |
| `integrity.firstEventHash` | string | SHA-256 hash of first event |
| `integrity.finalChainHash` | string | Final chain hash (for verification) |
| `integrity.chainValid` | boolean | Whether hash chain verified successfully |

---

## Event Types (`events.jsonl`)

### Session Events

| Event Type | Description | Key Payload Fields |
|------------|-------------|-------------------|
| `SESSION_STARTED` | Study session initialized | `participantId`, `browserInfo` |
| `RANDOMIZATION_ASSIGNED` | Condition randomly assigned | `seed`, `condition`, `disclosureFormat` |
| `SESSION_ENDED` | Session completed | `totalCases`, `completedAt` |
| `EXPORT_GENERATED` | Export package created | `timestamp`, `totalEvents` |

### Case Events

| Event Type | Description | Key Payload Fields |
|------------|-------------|-------------------|
| `CASE_LOADED` | Case presented to reader | `caseId`, `caseIndex`, `totalCases`, `isCalibration` |
| `IMAGE_VIEWED` | Reader viewed image | `viewKey`, `viewportState`, `dwellTimeMs` |
| `VIEWPORT_CHANGED` | Reader changed view settings | `changeType`, `previousState`, `newState` |
| `FIRST_IMPRESSION_LOCKED` | Initial assessment submitted | `birads`, `confidence`, `timeToLockMs` |
| `AI_REVEALED` | AI suggestion shown | `suggestedBirads`, `aiConfidence`, `finding` |
| `DISCLOSURE_PRESENTED` | Error rate info shown | `format`, `fdrValue`, `forValue` |
| `DISCLOSURE_COMPREHENSION_RESPONSE` | Reader answered check | `isCorrect`, `responseTimeMs` |
| `DEVIATION_STARTED` | Reader began changing assessment | `previousBirads` |
| `DEVIATION_SUBMITTED` | Reader documented change | `rationale`, `rationaleWordCount` |
| `DEVIATION_SKIPPED` | Reader skipped documentation | `attestation` |
| `FINAL_ASSESSMENT` | Final assessment submitted | `birads`, `confidence`, `changeDirection` |
| `CASE_COMPLETED` | Case processing finished | `totalTimeMs`, `metrics` |

### Attention & Calibration Events

| Event Type | Description | Key Payload Fields |
|------------|-------------|-------------------|
| `CALIBRATION_STARTED` | Training case begun | `caseId` |
| `CALIBRATION_FEEDBACK_SHOWN` | Feedback provided | `userBirads`, `correctBirads`, `isCorrect` |
| `ATTENTION_CHECK_RESPONSE` | Catch trial response | `passed`, `expectedResponse`, `actualResponse` |

### Cognitive Load Events

| Event Type | Description | Key Payload Fields |
|------------|-------------|-------------------|
| `NASA_TLX_SUBMITTED` | Workload rating submitted | `mentalDemand`, `effort`, `frustration`, `rawTlxScore` |
| `CONFIDENCE_PRE_AI` | Pre-AI confidence rating | `confidence` |
| `CONFIDENCE_POST_AI` | Post-AI confidence rating | `confidence`, `shift` |

---

## Derived Metrics (`derived_metrics.csv`)

### Identification

| Variable | Type | Description |
|----------|------|-------------|
| `sessionId` | string | Session identifier |
| `caseId` | string | Case identifier |
| `condition` | string | Assigned condition |

### Assessment Variables

| Variable | Type | Range | Description |
|----------|------|-------|-------------|
| `initialBirads` | integer | 0-6 | BI-RADS category before AI |
| `finalBirads` | integer | 0-6 | BI-RADS category after AI |
| `aiBirads` | integer | 0-6 | AI-suggested BI-RADS |
| `aiConfidence` | integer | 0-100 | AI confidence score |

### Primary Outcome: ADDA

| Variable | Type | Description |
|----------|------|-------------|
| `changeOccurred` | boolean | TRUE if final ≠ initial |
| `aiConsistentChange` | boolean | TRUE if changed toward AI |
| `aiInconsistentChange` | boolean | TRUE if changed away from AI |
| `addaDenominator` | boolean | TRUE if initial ≠ AI (eligible for ADDA) |
| `adda` | boolean/null | Appropriate Deference to Decision Aid; TRUE if changed toward AI when disagreed; NULL if not in denominator |

**ADDA Calculation:**
```
IF initialBirads == aiBirads:
    adda = NULL (not in denominator)
ELSE IF finalBirads == aiBirads:
    adda = TRUE (appropriately deferred)
ELSE:
    adda = FALSE (did not defer or deferred incorrectly)
```

### Timing Variables

| Variable | Type | Unit | Description |
|----------|------|------|-------------|
| `timeToLockMs` | integer | ms | Time from case load to first impression lock |
| `lockToRevealMs` | integer | ms | Time from initial lock to AI reveal |
| `revealToFinalMs` | integer | ms | Time from AI reveal to final assessment |
| `preAiReadMs` | integer | ms | PRE_AI read episode duration |
| `postAiReadMs` | integer | ms | POST_AI read episode duration |
| `totalReadMs` | integer | ms | `preAiReadMs + postAiReadMs` (missing parts treated as 0) |
| `aiExposureMs` | integer | ms | Duration from AI reveal to final assessment (AI_FIRST/concurrent use reveal → final) |
| `totalTimeMs` | integer | ms | Total time on case: CASE_COMPLETED − CASE_LOADED (fallback: FINAL_ASSESSMENT − CASE_LOADED) |

### Documentation Variables

| Variable | Type | Description |
|----------|------|-------------|
| `deviationDocumented` | boolean | TRUE if rationale was provided |
| `deviationSkipped` | boolean | TRUE if documentation was skipped |
| `comprehensionCheckPassed` | boolean | TRUE if answered correctly |

### Quality Control

| Variable | Type | Description |
|----------|------|-------------|
| `attentionCheckCase` | boolean | TRUE if this was an attention check case |
| `attentionCheckPassed` | boolean/null | Result of attention check (NULL if not applicable) |

---

## Ledger Format (`ledger.json`)

Each entry in the ledger array contains:

| Field | Type | Description |
|-------|------|-------------|
| `seq` | integer | Sequence number (0-indexed) |
| `eventId` | string | UUID of the event |
| `eventType` | string | Event type |
| `timestamp` | ISO8601 | Event timestamp |
| `contentHash` | string | SHA-256 of event content |
| `previousHash` | string | Previous chain hash (zeros for first event) |
| `chainHash` | string | Current chain hash |

**Hash Chain Computation:**
```
contentHash = SHA256(canonicalJSON(type + payload + timestamp))
chainHash[n] = SHA256(previousHash + "|" + contentHash + "|" + timestamp)
```

---

## Verifier Output (`verifier_output.json`)

| Field | Type | Description |
|-------|------|-------------|
| `result` | string | `PASS` or `FAIL` |
| `timestamp` | ISO8601 | Verification timestamp |
| `verifierVersion` | string | Version of verifier used |
| `checks` | array | Individual check results |
| `chainIntegrity.totalEvents` | integer | Events checked |
| `chainIntegrity.validLinks` | integer | Valid chain links |
| `chainIntegrity.brokenAt` | integer/null | Index where chain broke (if any) |

---

## BI-RADS Reference

| Category | Description | Management |
|----------|-------------|------------|
| 0 | Incomplete | Additional imaging needed |
| 1 | Negative | Routine screening |
| 2 | Benign | Routine screening |
| 3 | Probably benign | Short-interval follow-up |
| 4 | Suspicious | Biopsy recommended |
| 5 | Highly suggestive of malignancy | Biopsy required |
| 6 | Known malignancy | Appropriate action |

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-01-24 | Added confidence calibration, NASA-TLX, attention checks |
| 1.0.0 | 2025-01-20 | Initial release |
