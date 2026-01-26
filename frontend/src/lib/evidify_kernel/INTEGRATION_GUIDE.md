# Evidify Kernel Integration Guide

## How AGI Team Spec Maps to Current Codebase

This document shows how to integrate the formalized kernel specifications with the existing Evidify Radiology Research Module.

---

## 1. Event Schema Integration

### Current State
```typescript
// Current: lib/event_logger.ts
eventLogger.addEvent('FIRST_IMPRESSION_LOCKED', { selectedBirads, confidence });
```

### Upgraded State
```typescript
// New: Use canonical event structure
import { createEvent, EvidifyEvent, ScorePrelimPayload } from './evidify_kernel/event_schema';

const event = createEvent<ScorePrelimPayload>(
  sessionId,
  seq++,
  'SCORE_PRELIM_COMMITTED', // Kernel-standard name
  {
    instrument_id: 'birads_assessment_v1',
    value: selectedBirads,
    confidence,
    pre_trust: preTrust,
    time_to_prelim_ms: Date.now() - caseStartTime,
  },
  {
    protocol_id: 'BRPLL-MAMMO-v1.0',
    condition_id: condition.condition,
    case_id: currentCase.caseId,
    phase_id: 'READ_PHASE',
  }
);
```

### Migration Path
1. Add `event_schema.ts` to `frontend/src/lib/evidify_kernel/`
2. Update `EventLogger` to accept `EvidifyEvent` objects
3. Map existing event types to kernel-standard names:

| Current Event | Kernel Event |
|--------------|--------------|
| `FIRST_IMPRESSION_LOCKED` | `SCORE_PRELIM_COMMITTED` |
| `AI_SUGGESTION_REVEALED` | `AI_EXPOSED` |
| `FINAL_ASSESSMENT` | `SCORE_FINAL_SUBMITTED` |
| `DEVIATION_SUBMITTED` | `DISAGREEMENT_RECORDED` |

---

## 2. Gate Engine Integration

### Current State
```typescript
// Current: Hardcoded in ResearchDemoFlow.tsx
if (state.initialBirads === null) {
  // Can't proceed to AI
}
```

### Upgraded State
```typescript
// New: Use Gate Engine
import { GateEngine, BRPLL_STANDARD_GATES, GateContext } from './evidify_kernel/gate_engine';

const gateEngine = new GateEngine((event) => {
  eventLogger.addEvent(event.event_type, event);
});

// Register standard gates
BRPLL_STANDARD_GATES.forEach(gate => gateEngine.registerGate(gate));

// Before showing AI
const decision = gateEngine.evaluate('GATE_HUMAN_FIRST_LOCK', {
  action: 'AI_TOGGLE_ON',
  caseId: currentCase.caseId,
  currentSeq: eventSeq,
  timeOnCaseMs: Date.now() - caseStartTime,
  priorEvents: exportPack.getEvents(),
  currentState: {
    prelimCommitted: state.initialBirads !== null,
    prelimScore: state.initialBirads,
  },
});

if (decision === 'BLOCK') {
  // Show "Lock your impression first" message
  return;
}
```

### Benefits
- Gates are configurable per protocol
- Gate events are automatically logged
- Gate compliance is verifiable in exports
- Forensic module can reuse same engine with different gates

---

## 3. MRMC Export Integration

### Current State
```typescript
// Current: DerivedMetrics in ExportPackZip
interface DerivedMetrics {
  caseId: string;
  initialBirads: number;
  finalBirads: number;
  // ... partial fields
}
```

### Upgraded State
```typescript
// New: Full MRMC-compatible export
import { 
  derivedMetricsToMRMCRow, 
  generateReadsCSV, 
  generateDesignJSON 
} from './evidify_kernel/mrmc_export';

// In ExportPackZip.generateZip():
const mrmcRows = caseResults.map(metrics => 
  derivedMetricsToMRMCRow(metrics, sessionId, studyId, conditionId)
);

const readsCSV = generateReadsCSV(mrmcRows);
const designJSON = generateDesignJSON(
  studyId,
  protocolHash,
  conditions,
  1, // reader count (single session)
  caseResults.length
);

// Add to ZIP
zip.file('DATA/reads.csv', readsCSV);
zip.file('DATA/design.json', JSON.stringify(designJSON, null, 2));
```

### New Columns Added
- `truth_label`, `truth_reference_type`, `truth_reference_id`
- `ai_exposure_count`, `ai_time_visible_ms`
- `disagree_reason_code`
- `n_tool_events`, `n_measurements`
- `catch_trial_flag`, `catch_trial_pass`
- `gate_violation_count`, `qc_flags`

---

## 4. Verifier Enhancement

### Current State
```typescript
// Current: Basic hash verification
const hash = computeChainHash();
if (hash !== expectedHash) return 'FAIL';
```

### Upgraded State
```typescript
// New: Comprehensive verifier with detailed report
import { Verifier, formatVerifierReport } from './evidify_kernel/verifier';

const verifier = new Verifier(
  async (data) => 'sha256:' + await sha256Hex(data),
  async (data, sig, pubKey) => verifyEd25519(data, sig, pubKey)
);

const report = await verifier.verify(exportDirectory);

// For UI display
console.log(formatVerifierReport(report));

// For programmatic use
if (report.result === 'FAIL') {
  console.error('Verification failed:', report.reason_codes);
}
```

### New Checks Added
- `SESSION_PROPERLY_CLOSED` - SESSION_END event present
- `TIMESTAMPS_MONOTONIC` - No time regressions
- `NO_TRUNCATION_DETECTED` - First and final hash match expected
- Detailed chain break locations
- Asset-by-asset hash verification

---

## 5. Implementation Priority

### P0: Before Friday Demo
- [ ] Add `event_schema.ts` to codebase (reference only, don't refactor events yet)
- [ ] Add `gate_engine.ts` (can demo as "here's our policy engine")
- [ ] Update Study Design panel to show gate configurations

### P1: Next Week
- [ ] Refactor `EventLogger` to use canonical event format
- [ ] Integrate `GateEngine` into ResearchDemoFlow
- [ ] Generate `reads.csv` and `design.json` in exports
- [ ] Update `ExportPackZip` to produce full MRMC artifacts

### P2: Pre-Publication
- [ ] Full verifier CLI tool
- [ ] Determinism fixtures (10 golden sessions)
- [ ] CI pipeline for determinism tests
- [ ] Ed25519 signing of sessions

---

## 6. File Locations

```
evidify-v9/
├── frontend/src/
│   ├── lib/
│   │   ├── evidify_kernel/        # NEW: Kernel modules
│   │   │   ├── event_schema.ts
│   │   │   ├── gate_engine.ts
│   │   │   ├── mrmc_export.ts
│   │   │   └── verifier.ts
│   │   ├── event_logger.ts        # Existing (upgrade to use kernel)
│   │   ├── ExportPackZip.ts       # Existing (add MRMC exports)
│   │   └── condition_matrix.ts    # Existing
│   └── components/
│       └── ResearchDemoFlow.tsx   # Existing (integrate gates)
└── verifier/                       # NEW: Standalone CLI
    └── cli.ts
```

---

## 7. Demo Script Addition

When showing Brown the kernel specs:

1. "We've formalized our event schema - every event has `mono_ms` for replay and `wall_utc` for audit"
2. "Our Gate Engine enforces human-first lock as Policy-as-Code - not just UI logic"
3. "Exports include `reads.csv` and `design.json` that plug directly into iMRMC"
4. "The same kernel will power our forensic psychology module with different gates"

This positions Evidify as **platform infrastructure**, not just a reader study tool.
