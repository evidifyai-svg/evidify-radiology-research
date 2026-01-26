# Codebase Update Plan vs. `1evidify-beta-bundle.zip`
This plan assumes the beta bundle is a Vite+React codebase with existing steps:
- `src/features/notes/steps/PrepareStep.tsx`
- `src/features/notes/steps/CaptureStep.tsx`
- `src/features/notes/steps/DefendStep.tsx`
and AI runtime plumbing under:
- `src/services/ai/runtime/providers/ollama.ts`
- `src/services/ai/localLLM.ts` (WebLLM)

## 1) Recording & Consent — where to integrate
### UI integration
- **PrepareStep**: Add “Recording Mode” card:
  - Toggle: Recording OFF/ON
  - Dropdown: Audio-only (default)
  - Consent status selector
  - Patient state capture field
  - Privacy/third-party field + “All parties consented” checkbox
  - Show policy decision (ALLOW/WARN/BLOCK)

- **CaptureStep**: Recording indicator + Pause/Stop controls.

### New modules
Create:
- `src/services/recording/`
  - `policyEngine.ts` (reads `recording_policy.json`)
  - `recorder.ts` (WebAudio capture + chunk encryption)
  - `storage.ts` (encrypted blob storage + quarantine)
  - `destruction.ts` (key shred + verification)
- `src/types/recording.ts`
- `src/db/recordingTables.ts` (Dexie tables) OR equivalent storage layer

### Audit integration
Extend existing audit log mechanism to include:
- recording started/stopped (no content)
- policy decision snapshot
- destruction certificate created

## 2) Deep Analysis (structured-only) — where to integrate
### Data layer
Create a patient-level feature store:
- `src/services/analysis/featureStore.ts`
- `src/services/analysis/detectors/*.ts`
- `src/services/analysis/hypotheses/*.ts`
- `src/services/analysis/types.ts`

### UI layer
- Add a “Considerations” panel in Draft or Defend step that shows:
  - Missing documentation items
  - Inconsistencies
  - Longitudinal patterns
  - Alternative hypotheses (screening suggestions)
Each item must include: `Evidence` (structured fields) + `Rationale` + `Suggested next action`.

### Optional LLM usage
LLM is only for **phrasing** and must take JSON-only structured evidence.
Enforce via schema validation and a hard “no raw text” contract.

## 3) Known P0/P1 fixes to preserve (already discussed in chat)
- No fabricated SI content; only trigger safety sections when explicit “Safety” extraction exists.
- Checklist gating only when safety is detected.
- Intervention taxonomy mapping expanded and consistent.
- Integrity detectors (“don’t write this down,” “keep it vague,” etc.).

## 4) Deliverables for developers
- A working feature-flagged MVP:
  - `recordingEnabled` off by default
  - `structuredDeepAnalysisEnabled` on in beta mode
- Unit tests:
  - policy engine decisions
  - destruction certificate generation
  - “no transcript is persisted” assertions
