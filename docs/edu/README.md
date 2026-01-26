# Evidify EDU (504/IEP) — Module README

**Status:** v0.1 (UI shell integrated into the unified app)

Evidify EDU is designed as a **forensic‑grade documentation wrapper** for school psychological / special education workflows where **due process defensibility** and **FERPA‑aligned data minimization** matter.

This module is intentionally introduced as a **UI-first** integration so we can iterate on workflow and usability without destabilizing the existing Forensic verification pipeline.

## What is included in v0.1

* EDU entrypoint in the unified app (Dashboard button + workspace screen)
* Consistent navigation patterns (Home/Back, left-nav, card system) using the shared UI primitives
* Placeholder tabs that mirror the EDU panel review workflow:
  * Overview
  * Referral/Intake
  * Data Sources
  * Report Builder
  * Pre-flight Gates
  * Freeze & Export

## What is deliberately deferred to v0.2

* Gate engine implementation (blocking vs advisory)
* Deterministic export pack generation (manifest, canon gate report, audit chain)
* Golden CI fixtures (EDU packs, negative fixtures, verifier wiring)
* Storage/persistence model for EDU cases

## Guardrails

* v0.1 does **not** attempt to store real student data.
* v0.1 does **not** claim compliance; it establishes the UI/workflow contract only.

## Next sprint (v0.2) build targets

1. Define **EDU export contract** (folder layout + required artifacts)
2. Implement **EDU gate engine** (GATE-EDU-001..003 as a starting set)
3. Implement **Freeze Pocket** for EDU cases (immutable, hash-sealed)
4. Add **golden fixtures** and CI acceptance tests
