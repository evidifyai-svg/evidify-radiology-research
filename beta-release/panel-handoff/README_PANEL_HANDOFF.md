# Panel Handoff Kit (Integrated into Evidify Forensic v4.3.0-beta)

This folder contains the **panel-ready evidence bundle scaffold** used to collect build artifacts, UI-generated Export+Verify packs, logs, recordings, and a PHI-free environment snapshot.

## Where this came from
- Integrated per `docs/INTEGRATION_SUMMARY_v4.3.0.md`.
- The forensic UI workspace + verification infrastructure lives in `./verification/` and `./frontend/src/components/`.

## What you do next
1) **Build signed installers** (macOS + Windows) and place them into:
   - `./builds/`
   - Include `build_manifest.json` (template provided)

2) **Run the UI workflow** (Dashboard → Forensic → demo case or real case → Gates → Export+Verify) and place resulting zips into:
   - `./exports/` (CC-001 PASS/FAIL + BIG-001 FAIL)

3) **Collect logs** per run into:
   - `./logs/<scenario>/app.log`
   - `./logs/<scenario>/verifier.log`

4) **Record two short videos** into:
   - `./recordings/CC-001-PASS-workflow.mp4`
   - `./recordings/BIG-001-FAIL-workflow.mp4`

5) **Capture environment snapshot (PHI-free)** into:
   - `./environment/system_info.md`
   - `./environment/ollama_info.txt`

## Notes
- The verifier and gate engine used by acceptance tests are in `../../verification/`.
- If you want to hand the verifier to external reviewers, zip `../../verification/` separately and drop it into `./test-kit/`.
