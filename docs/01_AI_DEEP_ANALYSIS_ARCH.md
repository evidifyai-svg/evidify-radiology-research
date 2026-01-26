# AI Deep Analysis (Structured-Only) — Architecture & Model Options
**Goal:** Make clinicians meaningfully “smarter” while keeping Evidify’s safety posture: the AI must reason over **structured extractions only** (symptoms, interventions, risk flags, diagnoses, plans, context tags), not raw free-text transcripts.

---

## 1) What “deep analysis” means in Evidify (structured-only)
### A. Differential / Alternative hypotheses (assistive, not diagnostic)
- Generate **ranked alternative explanations** given longitudinal structured patterns.
- Always present as: “Consider evaluating …” + **why**, with explicit evidence fields.
- Require clinician acknowledgement: **Accept / Reject / Defer** and (optional) rationale.

Examples of triggers:
- Persistent sleep disturbance + irritability + increased goal-directed activity → “Consider bipolar spectrum screening.”
- “Boundary strain” + “abandonment fear” tags + frequent between-session contact requests → “Consider attachment-related formulation / BPD features screening (if clinically appropriate).”
- High hypervigilance + avoidance + trauma reminders + somatic arousal → “Consider PTSD vs GAD differential.”

### B. Inconsistency detection
Flag contradictions between encounters (structured-to-structured):
- Dx changed without documentation of rationale.
- Risk level present one visit, absent next visit while safety tag remains present.
- Intervention type “CBT” marked repeatedly but no homework/skills progression recorded.
- Patient location/jurisdiction is missing for telehealth sessions.

### C. Longitudinal patterns (trajectory and response)
- Symptom severity trends (e.g., PHQ-9, GAD-7, insomnia severity proxy, panic frequency).
- Treatment response trends (interventions used → symptom trajectory).
- Missed follow-ups / escalating risk flags over time.

---

## 2) Core pipeline (event-driven, live note entry compatible)
### Inputs (structured-only)
- `ParsedNote`: extracted entities + interventions taxonomy + safety tags + consent/recording attestations + telehealth compliance fields.
- `PatientTimeline`: rolling per-patient feature store.

### Processing stages
1. **Extractor** (existing + strengthened): produces stable structured schema + evidence pointers.
2. **Feature Store Update**: append encounter features; update rolling windows (last 4 sessions, last 90 days, etc.).
3. **Detectors** (fast, deterministic):
   - Safety/compliance gates
   - Contradiction rules
   - Missing documentation requirements (context-aware)
4. **Hypothesis Engine** (hybrid):
   - Rules/graph-based heuristics for clinical patterns
   - Optional small local LLM to generate clinician-facing explanation text from structured evidence (never invent facts)
5. **UI Presenter**:
   - “Considerations” panel with: **Evidence → Interpretation → Suggested next step**
   - Always includes: confidence (low/med/high) + scope disclaimer.

### Latency targets (live typing)
- Extract + detectors: **<150ms** per update (debounced).
- Hypothesis re-rank: **<300ms** (incremental).
- LLM narrative generation: **async** (non-blocking), update panel when ready.

---

## 3) Model options for Apple Silicon (offline)
### A. LLM (optional, for explanation text only)
Use **small local instruct models** (3B–8B) in one of two modes:

1) **Ollama provider** (local daemon; strong dev ergonomics)
- Recommended tiers:
  - *Fast:* 3B class model for quick reasoning text
  - *Balanced:* 7B class model for better synthesis (still local)
- Strengths: stable streaming, model registry, easy switching.
- Risks: requires separate install/service; must hard-block non-localhost egress.

2) **WebLLM provider** (browser WebGPU; “true offline” with in-app model download)
- Strengths: no external daemon; distribution is app-contained.
- Risks: large model downloads; WebGPU compatibility; memory constraints on smaller Macs.

**Important constraint:** The LLM must never be asked to “read the transcript.” It only converts *structured evidence* into a coherent clinician-facing rationale.

### B. Deterministic + lightweight ML (recommended baseline)
For structured-only inference, you can achieve most value without LLMs:
- Rule engine + scoring functions (weights, recency, severity).
- Optional simple ML:
  - Logistic regression / calibrated linear model for differential likelihood ranking.
  - Gradient boosting for pattern classification (offline training, on-device inference).

### C. Embeddings (for “similar prior cases” retrieval)
You already referenced **all-MiniLM-L6-v2 (384d)**.
- Keep it for similarity search on *structured summaries* (not raw notes).
- Store vectors in local DB (SQLite extension / local vector index).

---

## 4) Guardrails (non-negotiable)
- Every output must be explainable via:
  - `evidence_fields[]` (structured inputs), and
  - `rule_ids[]` or `model_features[]`.
- “No fabricated quotes” policy: only cite verbatim patient statements if explicitly captured into a structured “Quote” field.
- Always classify outputs as:
  - **Documentation** (missing elements)
  - **Compliance** (jurisdiction/recording/consent)
  - **Clinical Consideration** (hypothesis / screening suggestion)
  - **Safety** (risk escalation)
- Provide clinician controls: mute rules, set sensitivity, mark false positives.
