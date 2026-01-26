# Jurisdiction + Consent Engine (Recording Gate)
## Objective
A local policy engine decides whether session recording is **ALLOW / WARN / BLOCK** based on structured attestations. Conservative defaults prevent recording unless key conditions are met.

## Inputs
- Patient physical location (state)
- Consent status (signed today / on file / not signed)
- Verbal reconfirmation (Y/N)
- Third-party audible risk (No / Yes / Unknown)
- Recording mode (audio-only default)
- Organization policy profile (default clinical / training clinic / hospital)

## Outputs
- Decision: ALLOW | WARN | BLOCK
- Reason codes (array)
- Required next steps (UI prompts)

## Conservative default logic
- BLOCK if patient state unknown
- BLOCK if consent not signed
- WARN (or BLOCK by org policy) if verbal reconfirmation missing
- WARN if third-party status unknown
- If third-party possible, require “All parties consented” checkbox; otherwise BLOCK

## Policy file
Ship as local JSON (counsel can override):
- `recording_policy.json` (example included)

## Audit artifacts (PHI-minimal)
Store only:
- timestamps, decision, reason codes, clinician attestations, policy version.
No audio. No transcript.
