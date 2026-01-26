# Evidify Developer Bundle (Consent Recording + Deep Analysis + Update Plan)
**Date:** 2026-01-08  
**Scope:** Local-first mental health documentation platform (Evidify) — add **consent-forward on-device session recording**, **structured-data deep analysis**, and a **developer-ready update plan** against the beta code bundle (`1evidify-beta-bundle.zip`).

## What this bundle contains
1. **AI Deep Analysis Architecture (structured-only)**: differential hypotheses, inconsistency detection, longitudinal patterning — designed for **Apple Silicon (M‑series)**, offline-first.
2. **Consent + Recording Pack v1**: patient-facing consent form, patient FAQ, clinician script, and in-app workflow gates.
3. **Jurisdiction/Consent Engine**: policy-driven gating logic with conservative defaults.
4. **Destruction Certificate**: data model + UX + failure handling.
5. **Codebase Update Plan**: where and how to implement in the current bundle, with ticket-style work breakdown.
6. **Local dev / “won’t load” troubleshooting**: practical fixes based on the bundle’s structure (Vite+React) and common failure points (Node version, Ollama, WebGPU, local server).

## Guiding principles
- **Consent-forward**: recording is optional, revocable, and never a condition of care.
- **Local-first**: no PHI network egress. Recording and analysis happen on device.
- **Defensible outputs**: every alert/recommendation must be traceable to *explicit extracted fields* or *explicit clinician attestations*.
- **PHI-minimal auditability**: store process proofs (timestamps, policy decisions, destruction certificates) without storing narrative content.
