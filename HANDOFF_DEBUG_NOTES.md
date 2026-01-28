# Handoff: evidify-radiology-research build fixes (Jan 27, 2026)

## Goal
Get `npm run build` passing. Current failures concentrated in:
- frontend/src/components/ResearchDemoFlow.tsx
- frontend/src/components/SimpleDemoFlow_Hardened.tsx
- frontend/src/lib/ExportPackZip.ts (type drift & duplicate exports)
- frontend/src/lib/ExportPack.ts (canonical types)

## What changed / known issues
1) PacketViewer MetricItem union issue fixed by typing metric item union (but avoid duplicate MetricItem definitions).
2) MammogramDualViewSimple WL_PRESETS typing: `as const` caused literal types -> setState mismatch. Need WindowLevel preset typing to `Record<WLPresetName, WindowLevel>` (or remove `as const`).
3) event_logger.ts: logFirstImpressionLocked signature is (birads:number, confidence:number). ResearchDemoFlow had been passing an object payload; we started switching to:
   - `logFirstImpressionLocked(state.initialBirads ?? 0, state.initialConfidence ?? 0)`
   - plus `addEvent('FIRST_IMPRESSION_CONTEXT', {...})` for richer context
4) ExportPackZip.ts: canonical types should be re-exported ONCE from ExportPack.ts; duplicate re-export lines cause errors.
5) ExportPackZip.ts currently references `metrics.caseId` in addCaseMetrics but canonical DerivedMetrics (from ExportPack.ts) may not include caseId. Either:
   - add `caseId` to canonical DerivedMetrics OR
   - change ExportPackZip to store per-case metrics separately (preferred: include caseId).

## Current error snapshot (last seen)
- ResearchDemoFlow.tsx: syntax issues from duplicated block paste; needs cleanup around ExportPackZip constructor.
- SimpleDemoFlow_Hardened.tsx: imports EventType that does not exist; createEvent missing `seq`; also passing TrialEvent[] where PacketViewer expects CanonicalEvent[] (payload typing mismatch).
- ExportPackZip.ts: type/interface drift and re-export duplication.

## Next steps
- Fix ResearchDemoFlow.tsx constructor block to be single, well-formed object.
- Decide canonical event type strategy: use ExportPack.ts TrialEvent everywhere (payload Record<string,unknown>) or adjust PacketViewer prop types.
- Fix SimpleDemoFlow_Hardened.tsx by:
  - removing EventType import (use string union or just `type: string`)
  - add seq in createEvent
  - align packet viewer event type expectations
