# Logging expectations (minimum viable for reproduction)

## app.log (UI runtime)
Include enough detail for engineering to reproduce a gate failure or non-determinism.

Minimum fields/events:
- App start: timestamp, app_version, git_commit, platform, feature flags
- Scenario open/import: scenario id, file path (redact if needed), derived run_id
- Gate evaluation: gate_id, pass/fail, error_code, message
- Export+Verify start: export destination, filenames
- Verifier invocation: command/args OR internal function name + config
- Verifier result: PASS/FAIL, canonical hash, any diff summary
- Export complete: zip filename + hash if you compute one

## verifier.log
Must capture the exact verifier output used by the UI:
- schema validation output
- canonical hash verification output
- deep compare/golden diff output (if used)
- explicit error codes (e.g., CONTENT_TAMPERED, CHAIN_BROKEN)

## Crash logs
If present, include:
- stack trace
- OS crash report id or file
- last 200 lines of app.log leading up to crash
