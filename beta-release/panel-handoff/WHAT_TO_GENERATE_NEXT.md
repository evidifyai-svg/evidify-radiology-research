# What you still need to generate in your environment (v1.2 checklist)

This checklist is deliberately operational: exact filenames, minimum contents, and the quickest way to capture each artifact PHI-free.

## A) Build artifacts (packaging + trust posture)

Drop into: `builds/`

1. **macOS installer**
   - Preferred: `Evidify-Forensic-<version>-mac.dmg`
   - Acceptable: `Evidify-Forensic.app` (zipped) if you are not at DMG yet
   - If you can: notarized + stapled (note status in `build_manifest.json`)

2. **Windows installer**
   - Preferred: `Evidify-Forensic-<version>-win.msi`
   - Acceptable: `Evidify-Forensic-<version>-win.exe`

3. **Build manifest**
   - File: `builds/build_manifest.json`
   - Use the provided template: `builds/build_manifest.template.json`

Minimum fields (required):
- app_name, app_version, build_timestamp_utc
- git_commit (full SHA) + repo_dirty (true/false)
- os_targets (mac/windows), arch, build_toolchain versions (rust/node optional)
- feature_flags (pdf_viewer, ocr, network_silence, export_verify_ui, etc.)
- signing (mac_signing, notarization, win_signing)

## B) UI-produced Export+Verify bundles (determinism in practice)

Drop into: `exports/`

Run each scenario entirely via the **UI**, then use the **in-app** `Export+Verify` action (not the CLI).

Required zips (exact naming convention):
- `CC-001-PASS-<YYYYMMDD-HHMMSS>.zip`
- `CC-001-FAIL-<YYYYMMDD-HHMMSS>.zip`
- `BIG-001-FAIL-<YYYYMMDD-HHMMSS>.zip`
Optional (nice to have):
- `BIG-001-PASS-<YYYYMMDD-HHMMSS>.zip`

Each zip must include (at minimum):
- `gate_report.canon.json`
- `gate_report.meta.json`
- whatever “court pack / daubert pack” artifacts the UI creates
- export manifest / file hashes if available

**Sanity check:** The verifier output (inside UI or as a separate artifact) should show the **same canonical hash** for the same scenario across multiple runs on the same build.

## C) Logs (repro anchors for engineering)

Drop into: `logs/`

For each scenario (PASS/FAIL), create a folder:
- `logs/CC-001-PASS/`
- `logs/CC-001-FAIL/`
- `logs/BIG-001-FAIL/`

Each folder should contain:
- `app.log` (UI runtime log from launch → export complete)
- `verifier.log` (the exact verifier output invoked by UI)
- `crash.log` (only if a crash occurred; otherwise omit)

Minimum expectations for logs:
- timestamp (UTC) on each line
- build_version + git_commit present near startup
- scenario identifier (CC-001 / BIG-001) and run id
- export path + produced zip filename
- any gate failures with gate IDs and error codes
See: `logs/LOGGING_EXPECTATIONS.md`

## D) Screen recordings (2–5 minutes each)

Drop into: `recordings/`

- `CC-001-PASS-workflow.mp4`
- `BIG-001-FAIL-workflow.mp4`

Record with audio narration if possible (PHI-free). Capture:
- the “trust strip” / gates view
- your navigation and any friction points
- the exact Export+Verify action + result screen
See: `recordings/RECORDING_GUIDE.md`

## E) Environment snapshot (PHI-free)

Drop into: `environment/`

Required:
- `environment/system_info.md`
- `environment/ollama_info.txt`

Quick capture scripts included:
- macOS: `environment/capture_system_info_mac.sh`
- Windows: `environment/capture_system_info_win.ps1`
- Ollama: `environment/capture_ollama_info.sh`

If you do not use Ollama, still include `ollama_info.txt` and write “Not installed / Not used”.

## F) Test kit

Drop into: `test-kit/`

- `EVIDIFY_FORENSIC_TEST_KIT_v1.1.zip` (or newer)

If the test kit lives elsewhere, include the exact version and commit it corresponds to in `build_manifest.json`.

---

## Definition of “ready for integrated panel teardown”

You are ready to upload the updated ZIP into a new chat when:
- At least 1 macOS build + 1 Windows build are present (even if unsigned, but signing status is documented)
- CC-001 PASS/FAIL + BIG-001 FAIL exports exist and were produced through the UI
- Corresponding logs exist per scenario
- Two workflow recordings exist
- Environment snapshot exists

At that point, the panel can produce a **repro-anchored P0/P1 backlog** tied to your real UI behavior, not just the CI harness.
