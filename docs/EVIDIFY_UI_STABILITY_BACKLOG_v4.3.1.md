# Evidify v4.3.1 — UI Stability + Module Unification Backlog (P0/P1/P2)

This document is an **engineering-executable** backlog derived from user testing feedback across the **Clinical**, **Forensic**, and **EDU** modules. It is structured as **PR-sized tickets** with clear owners, acceptance criteria, and tests.

## Non-Negotiables: “Do Not Touch” Boundaries (Defensibility-Critical)

The following paths/components are considered **defensibility-critical** for Forensic and MUST NOT be modified as part of UI/UX work unless explicitly scoped as a defensibility change with re-baselining:

1. `verification/` (entire directory)
   - Gate engine, verifier, CLI, acceptance tests, fixtures, test vectors, packs.
2. Canonicalization implementations and vectors
   - `verification/canonicalization/**`
3. Schemas
   - `verification/schemas/**`
4. Export writer + manifest/hashes logic in Rust (Forensic export determinism)
   - `src-tauri/src/export.rs`
   - `src-tauri/src/legal_export.rs`
   - `src-tauri/src/audit_pack.rs`
   - `src-tauri/src/audit.rs`
   - `src-tauri/src/crypto.rs`
5. Gate logic and results structure generation (Rust + JS verifier)
   - `src-tauri/src/analysis.rs` (if gate outcomes are computed here)
   - `verification/verifier/**`
6. Golden fixtures (byte-for-byte baselines)
   - `verification/packs/**/golden/**`
   - `verification/fixtures/**`

**UI refactors MUST be limited to**:
- routing, layout, components, styling, demo seed data, error boundaries, and read-only rendering of gate outputs.
- Adding new UI features must not alter the canonical artifacts the verifier consumes, unless explicitly planned and re-baselined.

## Ticketing Conventions

- **PR-sized**: A ticket should be completable in a single PR in <= 1 day by the assigned owner.
- **Owners**:
  - **FE** = Frontend (React/Vite/TS)
  - **TAURI** = Rust/Tauri commands and integration glue
  - **UX** = Layout + copy + product tour + visual polish (may be same engineer, but separate accountability)
  - **QA** = Harness/tests and release validation
- **Required artifacts** per ticket:
  - PR description includes: scope, screenshots (if UI), and test output logs.
  - If ticket touches Tauri commands: include `invoke` contract snippet and Rust signature.

---

# P0 — Blocking Reliability / Demo-Stopper Fixes

## P0-01 — Fix Forensic create annotation invoke payload (“req” wrapper)
**Owner:** FE + TAURI  
**Problem:** Runtime error: `invalid args 'req' ... missing required key req` when creating an annotation in Forensic.

**Scope (PR):**
1. Update the invoke payload shape in `frontend/src/components/EvidenceViewer.tsx` to match Rust signature:
   - `invoke('forensic_create_annotation', { req: { ... }})`
2. Confirm field naming matches Rust struct (prefer snake_case if Rust derives expect that).
3. Add defensive runtime validation + user-facing error message for malformed selection payloads (no panic).

**Acceptance criteria:**
- Creating an annotation succeeds with no error modal/toast.
- Annotation is visible immediately in the UI list for the evidence item.
- No console errors in dev tools during the action.

**Tests:**
- Manual: run app, create annotation from a selection; verify visible.
- Harness: add a smoke test that invokes the command with a minimal valid `req` payload and expects success.

**Do-not-touch:** `verification/` outputs/fixtures must not change for this fix.

---

## P0-02 — Timeline Builder: “Add Event” button non-responsive
**Owner:** FE  
**Problem:** “Add Event” does nothing; blocks basic workflow.

**Scope (PR):**
1. Ensure click handler is wired and not prevented by overlay.
2. Add minimal local-state insertion to prove UI responsiveness (persist later).
3. Add visual feedback (row appears, focus moved to first input).

**Acceptance criteria:**
- Each click adds a new event row.
- New row is editable immediately.
- No React warnings/errors.

**Tests:**
- FE unit test (if setup exists) OR lightweight Playwright/Cypress E2E later.
- Manual: click Add Event 3x → see 3 rows.

---

## P0-03 — Gates controls “Summary Only” and “Verifier Tool” non-responsive
**Owner:** FE + UX  
**Problem:** Buttons do nothing; undermines defensibility story.

**Scope (PR):**
1. Implement `Summary Only` toggle (compact vs expanded list).
2. Implement `Verifier Tool` modal that:
   - explains what the verifier is
   - shows local commands to verify an export pack
   - references verifier location in repo (text-only is fine)
3. If verifier is not wired to UI yet, clearly label as “Local verifier (CLI)”.

**Acceptance criteria:**
- Clicking both controls produces visible UI changes every time.
- Modal copy is accurate and references the verifier path.

**Tests:**
- Manual: toggle summary; open/close verifier modal.
- Optional: snapshot test on gates panel render states.

---

## P0-04 — Export preview panes render blank
**Owner:** FE + UX  
**Problem:** Export preview sections appear empty, causing user confusion.

**Scope (PR):**
Choose one (A is fastest):
- **A (Immediate):** Replace blank states with explicit placeholders that explain prerequisites (freeze/export required).
- **B (Better):** Generate a minimal in-memory preview artifact after export and render it.

**Acceptance criteria:**
- No blank panels; each has either content or a clear explanation of why it is empty.

**Tests:**
- Manual: navigate to export preview; confirm non-empty UI.

---

## P0-05 — Build toolchain: Tauri CLI + Rust toolchain alignment
**Owner:** TAURI + QA  
**Problem:** `cargo tauri` fails depending on pinned toolchain; cargo cannot build deps requiring newer cargo features.

**Scope (PR):**
1. Update `rust-toolchain.toml` to a modern toolchain that can compile current dependencies (recommend: `1.92.0`).
2. Ensure README/BUILD instructions use `cargo install tauri-cli --version 1.5.14` (or pinned compatible version).
3. Add `scripts/doctor.sh` to validate:
   - rustc/cargo version
   - tauri-cli presence
   - node version
   - npm deps installed
4. Ensure the build path is unambiguous:
   - `cd frontend && npm install && npm run build`
   - run `cargo tauri dev` from `src-tauri` (or introduce a workspace `Cargo.toml` at repo root).

**Acceptance criteria:**
- A clean Mac can run `scripts/doctor.sh` and get “PASS” on prerequisites.
- `cargo tauri dev` runs without `edition2024` errors.

**Tests:**
- CI: add a “toolchain sanity” job running `rustc --version`, `cargo --version`, and `cargo tauri --version`.
- Manual: clean-machine walkthrough once per release.

---

# P1 — Usability + Cohesive App Shell (without altering determinism)

## P1-01 — Make “Choose Your Module” the default landing screen
**Owner:** FE + UX  
**Problem:** App opens on Clinical; user wants a module picker that markets the 3-module suite.

**Scope (PR):**
1. Create `ModuleHome` route as default.
2. Add 3 cards: Clinical / Forensic / EDU with:
   - “Start module”
   - “60-second guided tour”
   - 2–3 bullet value props (offline AI, privacy, defensible exports)
3. Update existing nav to keep module switching consistent.

**Acceptance criteria:**
- App opens to ModuleHome.
- One click enters any module.
- No changes to verification/canonicalization/export logic.

**Tests:**
- Manual: fresh start → ModuleHome.
- FE route test (if exists): default route renders ModuleHome.

---

## P1-02 — Gate rows clickable → Gate Detail Drawer with deep links
**Owner:** FE + UX  
**Problem:** When blockers exist, user cannot click to see details and how to fix.

**Scope (PR):**
1. Make each gate row clickable.
2. Drawer shows:
   - what the gate checks (human language)
   - why it matters (Daubert/Frye-style defensibility messaging)
   - “what failed” with pointers to relevant UI sections
   - “how to fix” steps
   - “override with attestation” CTA if allowed (records decision; does not bypass export determinism)
3. Deep link to the relevant tab/section.

**Acceptance criteria:**
- Clicking a gate opens drawer.
- Drawer includes actionable remediation and navigation.

**Tests:**
- Manual: click each gate state; drawer opens and links navigate.

---

## P1-03 — Expand seeded demo data in Forensic (more opinions, better story)
**Owner:** FE + UX  
**Problem:** Opinion selector feels thin; gates cannot be experienced meaningfully.

**Scope (PR):**
1. Create a richer PHI-free seeded Forensic case:
   - 4–7 opinions
   - each opinion backed by 2–4 claims/citations
   - 1 contradiction unresolved + resolution workflow
   - referral question(s) populated
2. Ensure seed is UI-only and does not affect verifier/golden packs.

**Acceptance criteria:**
- Opinion selector shows multiple plausible options.
- Selecting an opinion shows non-empty basis chain.

**Tests:**
- Manual: verify counts and selection behavior.

---

## P1-04 — Fix unreadable Methodology advanced options (white-on-white)
**Owner:** FE + UX

**Scope (PR):**
1. Ensure dark mode tokens apply to advanced options text and controls.
2. Add a quick visual regression checklist entry.

**Acceptance criteria:**
- All methodology content is readable in both light/dark.

**Tests:**
- Manual: check in dark mode.

---

## P1-05 — Add recovery controls for freezes/errors (Reload module / Return Home)
**Owner:** FE

**Scope (PR):**
1. Add a top-right “Reload Module” action in AppShell.
2. Add React error boundary per module route that shows:
   - error summary
   - buttons: Reload Module / Return Home / Export Logs
3. Provide a simple “export logs” action (open local log path or show instructions).

**Acceptance criteria:**
- UI never dead-ends; user can recover without relaunching.

**Tests:**
- Manual: force an error (throw in dev) → boundary appears and recovery works.

---

# P2 — “Wow in 30 seconds” + Cross-Module Showcase

## P2-01 — Guided Tour: “Follow me and be WOWed” per module
**Owner:** UX + FE

**Scope (PR):**
1. Add a lightweight in-app guided tour overlay component.
2. Add 3 tours:
   - Clinical: create note → voice scribe → structured output → ask question
   - Forensic: evidence → claim → contradiction → gates → export/verify story
   - EDU: referral → sources → report builder → gates → freeze/export roadmap
3. Tours must degrade gracefully if a target element is missing.

**Acceptance criteria:**
- “Guided Tour” exists on ModuleHome and within each module.
- Tour completes without errors and drives users through key screens.

**Tests:**
- Manual: complete each tour once.

---

## P2-02 — Explain the AI model badge and “Lock” posture in UI
**Owner:** UX + FE

**Scope (PR):**
1. Make model badge clickable/hoverable with:
   - model name
   - what it’s used for (local-only inference)
   - performance and privacy tradeoffs
2. Make “Lock” tooltip explain:
   - offline posture / no PHI egress by default
   - how to verify/attest

**Acceptance criteria:**
- Users can understand AI + privacy posture within 10 seconds.

**Tests:**
- Manual: hover/click tooltips.

---

## P2-03 — Voice Scribe setup wizard (Clinical first, then share)
**Owner:** FE + UX (+ TAURI as needed)

**Scope (PR):**
1. Replace “Whisper Not Found” banner with a wizard:
   - check dependencies (ffmpeg/whisper)
   - install instructions with copy button
   - model download UI with progress
   - test recording + transcript preview
2. Keep all processing local; no network required unless downloading model.

**Acceptance criteria:**
- Non-technical user can complete setup.
- Clear “what is installed” vs “what is missing”.

**Tests:**
- Manual: wizard flow.

---

# QA Release Checklist (P0 required for each beta tag)

1. `npm run build` succeeds in `frontend/`.
2. `cargo tauri dev` launches and modules load.
3. Forensic:
   - create annotation works
   - claim ledger loads
   - gates controls respond
4. EDU:
   - no blank panels; nav works
5. Clinical:
   - voice scribe messaging is guided (if not installed)
6. **No diffs** in `verification/**` golden outputs for UI-only PRs.

## Notes on Defensibility Testing

If a ticket requires touching export writer logic or gate engine output:
- It must include:
  - a re-baseline plan
  - updated golden fixtures
  - a justification document for why determinism is unchanged or intentionally updated.

Otherwise, all UI-only tickets must keep verifier outputs stable.
