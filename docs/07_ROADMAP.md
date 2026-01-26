# Roadmap (Developer-Ready)
## Milestone 0 — Hardening (1–2 weeks)
- Ensure all prior P0 fixes remain (strict safety gating; no fabricated quotes).
- Add unit tests around parser → checklist gating.
- Replace any placeholder “SI/HI boilerplate” patterns with strict extracted-field logic.

## Milestone 1 — Consent + Recording MVP (2–4 weeks)
**Scope:** audio-only, on-device; no transcript retention; auto-destroy by default.
- UI: PrepareStep consent gate + status
- Policy engine: ALLOW/WARN/BLOCK
- Recorder: WebAudio capture + encrypted chunk storage
- Generate note from recording: **future** (for now, enable recording capture and destruction proof end-to-end)
- Destruction certificate + quarantine failure mode
- Audit log entries (PHI-minimal)

## Milestone 2 — Structured Deep Analysis v1 (3–6 weeks)
- Patient feature store + detectors:
  - inconsistencies
  - trajectory summaries
  - missing documentation items
- Hypothesis engine v1:
  - rule-based suggestions with evidence pointers
- UI: Considerations panel, accept/reject/defer

## Milestone 3 — Structured Deep Analysis v2 + Optional LLM phrasing (4–8 weeks)
- Add small local model (Ollama/WebLLM) strictly for explanation text
- Add similarity retrieval: embeddings over structured summaries
- Add clinician “sensitivity” controls + false-positive feedback loops

## Milestone 4 — Compliance expansion (ongoing)
- State policy packs (reviewed with counsel)
- Supervisor mode consent flows (separate opt-in)
- Export-proofing: prevent exporting recordings; allow note export only
