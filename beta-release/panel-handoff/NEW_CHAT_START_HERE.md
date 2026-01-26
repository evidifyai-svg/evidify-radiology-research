# Evidify Forensic — Panel Handoff Starter (v1.2)
**Generated:** 2026-01-12

This bundle is designed to be uploaded into a new chat so the review can resume immediately with zero re-explaining.

## What is already “done” (frozen)
- Canonical export contract: `gate_report.canon.json` + `gate_report.meta.json`
- Strict JSON Schema: Draft 2020-12
- Stable UUIDv5 IDs (structural-only inputs)
- Sentinel-based canonical hash preimage rule
- Verifier: schema validate + hash verify + uniqueness + deep compare against golden
- Headless runner (CLI) + CI-ready acceptance tests
- Packs: CC-001 + BIG-001 (PASS/FAIL) with golden outputs
- Negative + adversarial fixtures (tamper, malformed, ID collision, array order)

## What is *not* yet reviewable without your local build artifacts
The panel cannot credibly evaluate:
- first-run UX, packaging, signing, permissions prompts
- UI-driven variability (what the app exports from the UI)
- performance on your actual hardware / OCR stack
- true “defensibility” flows end-to-end (Export+Verify inside the app)
…until the artifacts listed below are generated from your environment and included here.

## Required artifacts to add (minimum viable for final teardown)
### 1) Real app build (signed / installable)
Place in: `builds/`
- macOS: `.dmg` and/or `.app` (prefer signed/notarized if possible)
- Windows: `.msi` or `.exe` installer

Include a `build_manifest.json` with:
- app version
- git commit / tag
- build timestamp
- platform target
- whether it’s a clean build

### 2) UI-produced exports (from in-app Export+Verify)
Place each export folder (zipped) in: `exports/`
- `CC-001-PASS-<timestamp>.zip`
- `CC-001-FAIL-<timestamp>.zip`
- `BIG-001-FAIL-<timestamp>.zip`
(Optional but helpful: `BIG-001-PASS-<timestamp>.zip`)

Each export must include:
- `gate_report.canon.json`
- `gate_report.meta.json`
- any “court pack / daubert pack” artifacts produced
- export manifest (file hashes if available)

### 3) Logs for each run
Place in: `logs/`
Per run (CC-001 PASS, CC-001 FAIL, BIG-001 FAIL), include:
- app runtime log
- verifier output log
- any crash dump / stack trace (if applicable)

### 4) Short screen recordings
Place in: `recordings/`
- `CC-001-PASS-workflow.mp4` (2–5 min)
- `BIG-001-FAIL-workflow.mp4` (2–5 min)
Capture: navigation, trust strip/gates, export+verify flow, and any friction points.

### 5) Environment snapshot (PHI-free)
Place in: `environment/`
- OS version, CPU/RAM, disk type
- Ollama version + model name(s) used
- whether network was enabled/disabled
- any optional OCR dependencies installed

## Optional but high-value adds
- A “beta tester anonymized session log” (time-on-task, errors encountered)
- A “performance trace” (ingest/index/search/export timings)
- One real-ish PDF rendering sample when viewer is implemented

## Where the panel will pick up
Once the above artifacts are present, the panel will deliver:
- buyer-grade teardown by persona (forensic, legal, security, ML, UX, QA)
- P0/P1 engineering backlog with reproduction anchors tied to exports/logs
- beta readiness: go/no-go criteria + weekly test cadence
- updated test matrix prioritization for external beta testers


## New in v1.2
- Added build manifest template: `builds/build_manifest.template.json`
- Added capture scripts for environment snapshot (macOS + Windows + Ollama)
- Added logging and recording guides to standardize repro evidence
